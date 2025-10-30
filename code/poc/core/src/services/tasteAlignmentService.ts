// code/poc/core/src/services/tasteAlignmentService.ts
// Trust Score 2.0: Taste alignment calculation service

import { Pool } from 'pg';
import { TasteAlignmentResult } from '../type/reputation';
import { MIN_TASTE_ALIGNMENT_DATAPOINTS } from '../type/common';

/**
 * Service for calculating taste similarity between users
 * Core component of Trust Score 2.0 (50% weight)
 */
export class TasteAlignmentService {
  private db: Pool;
  private readonly CACHE_DURATION_DAYS = 7; // Recalculate weekly
  private readonly ALGORITHM_VERSION = '2.0.0';

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Get or calculate taste alignment between two users
   * Returns cached result if recent, otherwise calculates and caches
   */
  public async getTasteAlignment(
    userId: string,
    comparedUserId: string,
    forceRecalculate: boolean = false
  ): Promise<TasteAlignmentResult | null> {
    // Don't calculate alignment with self
    if (userId === comparedUserId) {
      return null;
    }

    // Check cache unless force recalculate
    if (!forceRecalculate) {
      const cached = await this.getCachedAlignment(userId, comparedUserId);
      if (cached && this.isCacheValid(cached.last_calculated)) {
        return cached;
      }
    }

    // Calculate new alignment
    const alignment = await this.calculateTasteAlignment(userId, comparedUserId);
    
    // Cache result if valid
    if (alignment && alignment.confidence_level > 0) {
      await this.cacheAlignment(alignment);
    }

    return alignment;
  }

  /**
   * Calculate taste alignment from scratch
   */
  private async calculateTasteAlignment(
    userId: string,
    comparedUserId: string
  ): Promise<TasteAlignmentResult | null> {
    // 1. Get shared data points
    const sharedData = await this.getSharedDataPoints(userId, comparedUserId);
    
    // Check minimum data requirement
    if (sharedData.sharedRestaurants < MIN_TASTE_ALIGNMENT_DATAPOINTS) {
      return this.createLowConfidenceResult(userId, comparedUserId, sharedData);
    }

    // 2. Calculate correlations
    const cuisineCorrelation = await this.calculateCuisineCorrelation(userId, comparedUserId);
    const ratingCorrelation = await this.calculateRatingCorrelation(userId, comparedUserId, sharedData);
    const contextCorrelation = await this.calculateContextCorrelation(userId, comparedUserId, sharedData);

    // 3. Calculate overall similarity score
    const similarityScore = this.calculateOverallSimilarity(
      cuisineCorrelation,
      ratingCorrelation,
      contextCorrelation
    );

    // 4. Calculate confidence based on data quantity and quality
    const confidenceLevel = this.calculateConfidenceLevel(sharedData);

    // 5. Identify shared and divergent preferences
    const preferences = await this.identifyPreferences(userId, comparedUserId);

    return {
      user_id: userId,
      compared_user_id: comparedUserId,
      similarity_score: similarityScore,
      confidence_level: confidenceLevel,
      shared_preferences: preferences.shared,
      divergent_preferences: preferences.divergent,
      correlation_data: {
        cuisine_correlation: cuisineCorrelation,
        rating_correlation: ratingCorrelation,
        context_correlation: contextCorrelation
      },
      shared_restaurants: sharedData.sharedRestaurants,
      shared_cuisines: sharedData.sharedCuisines,
      last_calculated: new Date().toISOString(),
      calculation_version: this.ALGORITHM_VERSION
    };
  }

  /**
   * Get shared data points between two users
   */
  private async getSharedDataPoints(
    userId: string,
    comparedUserId: string
  ): Promise<{
    sharedRestaurants: number;
    sharedCuisines: string[];
    totalUserRecommendations: number;
    totalComparedRecommendations: number;
  }> {
    const query = `
      WITH user_recs AS (
        SELECT DISTINCT restaurant_id, cuisine_type
        FROM recommendations
        WHERE author_id = $1
      ),
      compared_recs AS (
        SELECT DISTINCT restaurant_id, cuisine_type
        FROM recommendations
        WHERE author_id = $2
      )
      SELECT 
        COUNT(DISTINCT CASE WHEN user_recs.restaurant_id = compared_recs.restaurant_id THEN user_recs.restaurant_id END) as shared_restaurants,
        ARRAY_AGG(DISTINCT user_recs.cuisine_type) FILTER (WHERE user_recs.cuisine_type = compared_recs.cuisine_type) as shared_cuisines,
        (SELECT COUNT(*) FROM user_recs) as total_user_recs,
        (SELECT COUNT(*) FROM compared_recs) as total_compared_recs
      FROM user_recs
      FULL OUTER JOIN compared_recs ON user_recs.restaurant_id = compared_recs.restaurant_id
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    const row = result.rows[0];

    return {
      sharedRestaurants: parseInt(row.shared_restaurants) || 0,
      sharedCuisines: row.shared_cuisines || [],
      totalUserRecommendations: parseInt(row.total_user_recs) || 0,
      totalComparedRecommendations: parseInt(row.total_compared_recs) || 0
    };
  }

  /**
   * Calculate cuisine preference correlation
   * Compares which cuisines each user prefers
   */
  private async calculateCuisineCorrelation(
    userId: string,
    comparedUserId: string
  ): Promise<number> {
    const query = `
      SELECT 
        up1.cuisine_preferences as user_prefs,
        up2.cuisine_preferences as compared_prefs
      FROM user_patterns up1
      CROSS JOIN user_patterns up2
      WHERE up1.user_id = $1 AND up2.user_id = $2
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    
    if (result.rows.length === 0) {
      return 0; // No pattern data available
    }

    const userPrefs = result.rows[0].user_prefs || {};
    const comparedPrefs = result.rows[0].compared_prefs || {};

    // Get all cuisines either user has rated
    const allCuisines = new Set([
      ...Object.keys(userPrefs),
      ...Object.keys(comparedPrefs)
    ]);

    if (allCuisines.size === 0) return 0;

    // Calculate correlation using cosine similarity
    let dotProduct = 0;
    let userMagnitude = 0;
    let comparedMagnitude = 0;

    for (const cuisine of allCuisines) {
      const userScore = userPrefs[cuisine] || 0;
      const comparedScore = comparedPrefs[cuisine] || 0;
      
      dotProduct += userScore * comparedScore;
      userMagnitude += userScore * userScore;
      comparedMagnitude += comparedScore * comparedScore;
    }

    if (userMagnitude === 0 || comparedMagnitude === 0) return 0;

    const cosineSimilarity = dotProduct / (Math.sqrt(userMagnitude) * Math.sqrt(comparedMagnitude));
    return Math.max(-1, Math.min(1, cosineSimilarity)); // Clamp to [-1, 1]
  }

  /**
   * Calculate rating correlation using Pearson coefficient
   * Compares how similarly users rate the same restaurants
   */
  private async calculateRatingCorrelation(
    userId: string,
    comparedUserId: string,
    sharedData: { sharedRestaurants: number }
  ): Promise<number> {
    if (sharedData.sharedRestaurants === 0) return 0;

    const query = `
      WITH shared_ratings AS (
        SELECT 
          r1.overall_rating as user_rating,
          r2.overall_rating as compared_rating
        FROM recommendations r1
        JOIN recommendations r2 ON r1.restaurant_id = r2.restaurant_id
        WHERE r1.author_id = $1 
          AND r2.author_id = $2
          AND r1.overall_rating IS NOT NULL
          AND r2.overall_rating IS NOT NULL
      )
      SELECT 
        AVG(user_rating) as user_mean,
        AVG(compared_rating) as compared_mean,
        ARRAY_AGG(user_rating) as user_ratings,
        ARRAY_AGG(compared_rating) as compared_ratings
      FROM shared_ratings
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    
    if (result.rows.length === 0 || !result.rows[0].user_ratings) {
      return 0;
    }

    const row = result.rows[0];
    const userMean = parseFloat(row.user_mean);
    const comparedMean = parseFloat(row.compared_mean);
    const userRatings = row.user_ratings.map((r: string) => parseFloat(r));
    const comparedRatings = row.compared_ratings.map((r: string) => parseFloat(r));

    // Calculate Pearson correlation coefficient
    let numerator = 0;
    let userSumSq = 0;
    let comparedSumSq = 0;

    for (let i = 0; i < userRatings.length; i++) {
      const userDiff = userRatings[i] - userMean;
      const comparedDiff = comparedRatings[i] - comparedMean;
      
      numerator += userDiff * comparedDiff;
      userSumSq += userDiff * userDiff;
      comparedSumSq += comparedDiff * comparedDiff;
    }

    if (userSumSq === 0 || comparedSumSq === 0) return 0;

    const pearson = numerator / Math.sqrt(userSumSq * comparedSumSq);
    return Math.max(-1, Math.min(1, pearson)); // Clamp to [-1, 1]
  }

  /**
   * Calculate context correlation
   * Compares whether users prefer similar contexts (occasions, party sizes, etc.)
   */
  private async calculateContextCorrelation(
    userId: string,
    comparedUserId: string,
    sharedData: { sharedRestaurants: number }
  ): Promise<number> {
    const query = `
      WITH user_contexts AS (
        SELECT 
          cf.occasion,
          cf.meal_type,
          cf.party_size,
          COUNT(*) as frequency
        FROM recommendations r
        JOIN contextual_factors cf ON r.id = cf.recommendation_id
        WHERE r.author_id = $1
        GROUP BY cf.occasion, cf.meal_type, cf.party_size
      ),
      compared_contexts AS (
        SELECT 
          cf.occasion,
          cf.meal_type,
          cf.party_size,
          COUNT(*) as frequency
        FROM recommendations r
        JOIN contextual_factors cf ON r.id = cf.recommendation_id
        WHERE r.author_id = $2
        GROUP BY cf.occasion, cf.meal_type, cf.party_size
      )
      SELECT 
        uc.occasion as user_occasion,
        uc.meal_type as user_meal,
        cc.occasion as compared_occasion,
        cc.meal_type as compared_meal,
        uc.frequency as user_freq,
        cc.frequency as compared_freq
      FROM user_contexts uc
      FULL OUTER JOIN compared_contexts cc 
        ON uc.occasion = cc.occasion AND uc.meal_type = cc.meal_type
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    
    if (result.rows.length === 0) return 0;

    // Simple overlap calculation
    let matchCount = 0;
    let totalCount = result.rows.length;

    for (const row of result.rows) {
      if (row.user_occasion === row.compared_occasion && 
          row.user_meal === row.compared_meal) {
        matchCount++;
      }
    }

    return totalCount > 0 ? matchCount / totalCount : 0;
  }

  /**
   * Calculate overall similarity score from correlations
   */
  private calculateOverallSimilarity(
    cuisineCorrelation: number,
    ratingCorrelation: number,
    contextCorrelation: number
  ): number {
    // Weight the correlations (cuisine is most important)
    const weightedScore = (
      cuisineCorrelation * 0.5 +    // 50% - what cuisines they like
      ratingCorrelation * 0.35 +    // 35% - how they rate things
      contextCorrelation * 0.15     // 15% - when/how they dine
    );

    // Convert from [-1, 1] to [0, 1]
    return (weightedScore + 1) / 2;
  }

  /**
   * Calculate confidence level based on data quantity
   */
  private calculateConfidenceLevel(sharedData: {
    sharedRestaurants: number;
    totalUserRecommendations: number;
    totalComparedRecommendations: number;
  }): number {
    const minRecs = Math.min(
      sharedData.totalUserRecommendations,
      sharedData.totalComparedRecommendations
    );

    // Confidence increases with more shared data points
    let confidence = 0;

    // Shared restaurants component (0-0.6)
    if (sharedData.sharedRestaurants >= 10) confidence += 0.6;
    else if (sharedData.sharedRestaurants >= 5) confidence += 0.4;
    else if (sharedData.sharedRestaurants >= 3) confidence += 0.2;

    // Total recommendations component (0-0.4)
    if (minRecs >= 20) confidence += 0.4;
    else if (minRecs >= 10) confidence += 0.3;
    else if (minRecs >= 5) confidence += 0.2;
    else confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Identify shared and divergent preferences
   */
  private async identifyPreferences(
    userId: string,
    comparedUserId: string
  ): Promise<{ shared: string[]; divergent: string[] }> {
    const query = `
      WITH user_cuisines AS (
        SELECT cuisine_type, AVG(overall_rating) as avg_rating
        FROM recommendations
        WHERE author_id = $1 AND cuisine_type IS NOT NULL
        GROUP BY cuisine_type
      ),
      compared_cuisines AS (
        SELECT cuisine_type, AVG(overall_rating) as avg_rating
        FROM recommendations
        WHERE author_id = $2 AND cuisine_type IS NOT NULL
        GROUP BY cuisine_type
      )
      SELECT 
        COALESCE(uc.cuisine_type, cc.cuisine_type) as cuisine,
        uc.avg_rating as user_rating,
        cc.avg_rating as compared_rating
      FROM user_cuisines uc
      FULL OUTER JOIN compared_cuisines cc ON uc.cuisine_type = cc.cuisine_type
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    
    const shared: string[] = [];
    const divergent: string[] = [];

    for (const row of result.rows) {
      const userRating = row.user_rating ? parseFloat(row.user_rating) : 0;
      const comparedRating = row.compared_rating ? parseFloat(row.compared_rating) : 0;

      // Both like it (rating >= 7)
      if (userRating >= 7 && comparedRating >= 7) {
        shared.push(row.cuisine);
      }
      // Divergent preferences (one likes, one doesn't)
      else if ((userRating >= 7 && comparedRating <= 5) || 
               (userRating <= 5 && comparedRating >= 7)) {
        divergent.push(row.cuisine);
      }
    }

    return { shared, divergent };
  }

  /**
   * Create low-confidence result when insufficient data
   */
  private createLowConfidenceResult(
    userId: string,
    comparedUserId: string,
    sharedData: any
  ): TasteAlignmentResult {
    return {
      user_id: userId,
      compared_user_id: comparedUserId,
      similarity_score: 0.5, // Neutral score
      confidence_level: 0.1,  // Very low confidence
      shared_preferences: [],
      divergent_preferences: [],
      correlation_data: {
        cuisine_correlation: 0,
        rating_correlation: 0,
        context_correlation: 0
      },
      shared_restaurants: sharedData.sharedRestaurants,
      shared_cuisines: sharedData.sharedCuisines || [],
      last_calculated: new Date().toISOString(),
      calculation_version: this.ALGORITHM_VERSION
    };
  }

  /**
   * Cache alignment result in database
   */
  private async cacheAlignment(alignment: TasteAlignmentResult): Promise<void> {
    const query = `
      INSERT INTO taste_alignments (
        user_id,
        compared_user_id,
        similarity_score,
        confidence_level,
        correlation_data,
        shared_restaurants,
        shared_cuisines,
        divergent_preferences,
        last_calculated,
        calculation_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, compared_user_id) 
      DO UPDATE SET
        similarity_score = EXCLUDED.similarity_score,
        confidence_level = EXCLUDED.confidence_level,
        correlation_data = EXCLUDED.correlation_data,
        shared_restaurants = EXCLUDED.shared_restaurants,
        shared_cuisines = EXCLUDED.shared_cuisines,
        divergent_preferences = EXCLUDED.divergent_preferences,
        last_calculated = EXCLUDED.last_calculated,
        calculation_version = EXCLUDED.calculation_version
    `;

    await this.db.query(query, [
      alignment.user_id,
      alignment.compared_user_id,
      alignment.similarity_score,
      alignment.confidence_level,
      JSON.stringify(alignment.correlation_data),
      alignment.shared_restaurants,
      alignment.shared_cuisines,
      alignment.divergent_preferences,
      alignment.last_calculated,
      alignment.calculation_version
    ]);
  }

  /**
   * Get cached alignment from database
   */
  private async getCachedAlignment(
    userId: string,
    comparedUserId: string
  ): Promise<TasteAlignmentResult | null> {
    const query = `
      SELECT 
        user_id,
        compared_user_id,
        similarity_score,
        confidence_level,
        correlation_data,
        shared_restaurants,
        shared_cuisines,
        divergent_preferences,
        last_calculated,
        calculation_version
      FROM taste_alignments
      WHERE user_id = $1 AND compared_user_id = $2
    `;

    const result = await this.db.query(query, [userId, comparedUserId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      user_id: row.user_id,
      compared_user_id: row.compared_user_id,
      similarity_score: parseFloat(row.similarity_score),
      confidence_level: parseFloat(row.confidence_level),
      shared_preferences: [], // Not stored in cache
      divergent_preferences: row.divergent_preferences || [],
      correlation_data: row.correlation_data,
      shared_restaurants: parseInt(row.shared_restaurants),
      shared_cuisines: row.shared_cuisines || [],
      last_calculated: row.last_calculated,
      calculation_version: row.calculation_version
    };
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(lastCalculated: string): boolean {
    const cacheDate = new Date(lastCalculated);
    const now = new Date();
    const daysSince = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < this.CACHE_DURATION_DAYS;
  }

  /**
   * Batch calculate alignments for a user with their network
   */
  public async batchCalculateAlignments(
    userId: string,
    userIds: string[]
  ): Promise<Map<string, TasteAlignmentResult>> {
    const results = new Map<string, TasteAlignmentResult>();

    for (const comparedUserId of userIds) {
      const alignment = await this.getTasteAlignment(userId, comparedUserId);
      if (alignment) {
        results.set(comparedUserId, alignment);
      }
    }

    return results;
  }

  /**
   * Invalidate cache for a user (call when they add new recommendations)
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    const query = `
      DELETE FROM taste_alignments
      WHERE user_id = $1 OR compared_user_id = $1
    `;
    await this.db.query(query, [userId]);
  }
}