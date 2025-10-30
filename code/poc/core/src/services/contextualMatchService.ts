// code/poc/core/src/services/contextualMatchService.ts
// Trust Score 2.0: Contextual matching calculation service

import { Pool } from 'pg';
import { ContextualFactors, SearchContext } from '../type/recommendation';
import { ContextualMatch, UserTastePattern } from '../type/reputation';

/**
 * Service for calculating how well recommendations fit user's current context
 * Core component of Trust Score 2.0 (20% weight)
 */
export class ContextualMatchService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Calculate contextual match between user's needs and recommendation
   */
  public async calculateContextualMatch(
    userId: string,
    recommendationId: string,
    searchContext?: SearchContext
  ): Promise<ContextualMatch> {
    // Get user's behavioral patterns
    const userPattern = await this.getUserPattern(userId);
    
    // Get recommendation's contextual factors
    const contentContext = await this.getRecommendationContext(recommendationId);

    // Calculate match scores for each factor
    const occasionMatch = this.calculateOccasionMatch(
      userPattern,
      contentContext,
      searchContext
    );

    const temporalMatch = this.calculateTemporalMatch(
      userPattern,
      contentContext,
      searchContext
    );

    const partySizeMatch = this.calculatePartySizeMatch(
      userPattern,
      contentContext,
      searchContext
    );

    const priceMatch = this.calculatePriceMatch(
      userPattern,
      contentContext,
      searchContext
    );

    const locationMatch = this.calculateLocationMatch(
      userPattern,
      contentContext,
      searchContext
    );

    // Calculate overall match score (weighted average)
    const matchScore = this.calculateOverallMatch(
      occasionMatch,
      temporalMatch,
      partySizeMatch,
      priceMatch,
      locationMatch
    );

    // Generate explanation
    const explanation = this.generateExplanation(
      occasionMatch,
      temporalMatch,
      partySizeMatch,
      priceMatch,
      locationMatch,
      matchScore
    );

    return {
      user_id: userId,
      recommendation_id: recommendationId,
      match_score: matchScore,
      factors: {
        occasion_match: occasionMatch,
        temporal_match: temporalMatch,
        party_size_match: partySizeMatch,
        price_match: priceMatch,
        location_match: locationMatch
      },
      explanation
    };
  }

  /**
   * Get user's behavioral pattern from database
   */
  private async getUserPattern(userId: string): Promise<UserTastePattern | null> {
    const query = `
      SELECT 
        user_id,
        cuisine_preferences,
        occasion_patterns,
        price_sensitivity,
        adventurousness_score,
        temporal_patterns,
        favorite_dishes,
        dietary_restrictions,
        preferred_ambiance_level,
        typical_party_size,
        recommendation_count,
        last_updated
      FROM user_patterns
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      user_id: row.user_id,
      cuisine_preferences: row.cuisine_preferences || {},
      occasion_patterns: row.occasion_patterns || {},
      price_sensitivity: parseFloat(row.price_sensitivity) || 0.5,
      adventurousness_score: parseFloat(row.adventurousness_score) || 0.5,
      temporal_patterns: row.temporal_patterns || {},
      favorite_dishes: row.favorite_dishes || [],
      dietary_restrictions: row.dietary_restrictions || [],
      preferred_ambiance_level: row.preferred_ambiance_level,
      typical_party_size: row.typical_party_size,
      recommendation_count: parseInt(row.recommendation_count) || 0,
      last_updated: row.last_updated
    };
  }

  /**
   * Get recommendation's contextual factors from database
   */
  private async getRecommendationContext(
    recommendationId: string
  ): Promise<ContextualFactors | null> {
    const query = `
      SELECT 
        cf.occasion,
        cf.party_size,
        cf.time_of_visit,
        cf.day_of_week,
        cf.meal_type,
        cf.total_spent,
        cf.visit_duration_minutes,
        cf.weather_condition
      FROM contextual_factors cf
      WHERE cf.recommendation_id = $1
    `;

    const result = await this.db.query(query, [recommendationId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      occasion: row.occasion,
      party_size: row.party_size,
      time_of_visit: row.time_of_visit,
      day_of_week: row.day_of_week,
      meal_type: row.meal_type,
      total_spent: row.total_spent ? parseFloat(row.total_spent) : undefined,
      visit_duration_minutes: row.visit_duration_minutes,
      weather_condition: row.weather_condition
    };
  }

  /**
   * Calculate occasion matching score
   */
  private calculateOccasionMatch(
    userPattern: UserTastePattern | null,
    contentContext: ContextualFactors | null,
    searchContext?: SearchContext
  ): number {
    // Explicit search context takes priority
    if (searchContext?.occasion && contentContext?.occasion) {
      return searchContext.occasion === contentContext.occasion ? 1.0 : 0.3;
    }

    // Use learned user patterns
    if (userPattern?.occasion_patterns && contentContext?.occasion) {
      const userOccasionPreference = userPattern.occasion_patterns[contentContext.occasion];
      if (typeof userOccasionPreference === 'number') {
        return userOccasionPreference; // Already 0-1 score
      }
    }

    // No data available, return neutral
    return 0.5;
  }

  /**
   * Calculate temporal matching score (time of day, day of week)
   */
  private calculateTemporalMatch(
    userPattern: UserTastePattern | null,
    contentContext: ContextualFactors | null,
    searchContext?: SearchContext
  ): number {
    if (!contentContext?.time_of_visit) return 0.5; // Neutral if no data

    const visitDate = new Date(contentContext.time_of_visit);
    const hour = visitDate.getHours();
    const dayOfWeek = contentContext.day_of_week ?? visitDate.getDay();

    // Check explicit timing preference
    if (searchContext?.timing) {
      if (searchContext.timing === 'tonight' && hour >= 18) return 0.9;
      if (searchContext.timing === 'weekend' && (dayOfWeek === 0 || dayOfWeek === 6)) return 0.9;
      return 0.4; // Doesn't match timing preference
    }

    // Use learned temporal patterns
    if (userPattern?.temporal_patterns) {
      // Check day of week pattern
      const dayKey = `day_${dayOfWeek}`;
      if (userPattern.temporal_patterns[dayKey]) {
        return 0.8;
      }

      // Check time of day pattern
      let timeKey: string;
      if (hour < 11) timeKey = 'breakfast';
      else if (hour < 14) timeKey = 'lunch';
      else if (hour < 17) timeKey = 'afternoon';
      else if (hour < 21) timeKey = 'dinner';
      else timeKey = 'late_night';

      if (userPattern.temporal_patterns[timeKey]) {
        return 0.7;
      }
    }

    // Check meal type alignment
    if (contentContext.meal_type && searchContext?.meal_type) {
      return contentContext.meal_type === searchContext.meal_type ? 0.9 : 0.4;
    }

    return 0.5; // Neutral
  }

  /**
   * Calculate party size matching score
   */
  private calculatePartySizeMatch(
    userPattern: UserTastePattern | null,
    contentContext: ContextualFactors | null,
    searchContext?: SearchContext
  ): number {
    // Explicit search context
    if (searchContext?.party_size && contentContext?.party_size) {
      const sizeDiff = Math.abs(searchContext.party_size - contentContext.party_size);
      
      // Perfect match
      if (sizeDiff === 0) return 1.0;
      
      // Close match (±1)
      if (sizeDiff === 1) return 0.8;
      
      // Acceptable (±2)
      if (sizeDiff === 2) return 0.6;
      
      // Poor match
      return 0.3;
    }

    // Use user's typical party size
    if (userPattern?.typical_party_size && contentContext?.party_size) {
      const sizeDiff = Math.abs(userPattern.typical_party_size - contentContext.party_size);
      
      if (sizeDiff === 0) return 0.9;
      if (sizeDiff === 1) return 0.7;
      if (sizeDiff === 2) return 0.5;
      return 0.3;
    }

    return 0.5; // Neutral
  }

  /**
   * Calculate price matching score
   */
  private calculatePriceMatch(
    userPattern: UserTastePattern | null,
    contentContext: ContextualFactors | null,
    searchContext?: SearchContext
  ): number {
    if (!contentContext?.total_spent) return 0.5; // No price data

    const spentAmount = contentContext.total_spent;

    // Explicit price range filter
    if (searchContext?.price_range) {
      const [minPrice, maxPrice] = searchContext.price_range;
      
      if (spentAmount >= minPrice && spentAmount <= maxPrice) return 1.0;
      
      // Slightly outside range
      const belowMin = minPrice - spentAmount;
      const aboveMax = spentAmount - maxPrice;
      
      if (belowMin > 0 && belowMin <= 10) return 0.7;
      if (aboveMax > 0 && aboveMax <= 10) return 0.7;
      
      return 0.3; // Outside acceptable range
    }

    // Use price sensitivity
    if (userPattern?.price_sensitivity !== undefined) {
      // Higher sensitivity = prefer lower prices
      const priceLevel = this.normalizePriceLevel(spentAmount);
      const userPreference = 1 - userPattern.price_sensitivity; // Invert for comparison
      
      const difference = Math.abs(priceLevel - userPreference);
      return Math.max(0, 1 - difference);
    }

    return 0.5; // Neutral
  }

  /**
   * Normalize price to 0-1 scale
   */
  private normalizePriceLevel(amount: number): number {
    // Rough price brackets
    if (amount <= 15) return 0.2;  // $
    if (amount <= 30) return 0.4;  // $$
    if (amount <= 60) return 0.6;  // $$$
    if (amount <= 100) return 0.8; // $$$$
    return 1.0; // $$$$$
  }

  /**
   * Calculate location matching score
   */
  private calculateLocationMatch(
    userPattern: UserTastePattern | null,
    contentContext: ContextualFactors | null,
    searchContext?: SearchContext
  ): number {
    // This would require location data in contextual_factors
    // For now, return neutral since we don't have location preferences stored
    
    if (searchContext?.location) {
      // Future: Calculate distance-based matching
      // For now, if user specified location preference, slightly boost
      return 0.6;
    }

    return 0.5; // Neutral
  }

  /**
   * Calculate overall match score from individual factors
   */
  private calculateOverallMatch(
    occasionMatch: number,
    temporalMatch: number,
    partySizeMatch: number,
    priceMatch: number,
    locationMatch: number
  ): number {
    // Weighted average (occasion and temporal are most important)
    const weightedScore = (
      occasionMatch * 0.35 +      // 35% - occasion is very important
      temporalMatch * 0.25 +      // 25% - time matters
      partySizeMatch * 0.20 +     // 20% - party size is significant
      priceMatch * 0.15 +         // 15% - price matters but flexible
      locationMatch * 0.05        // 5% - location less critical (for now)
    );

    return Math.max(0, Math.min(1, weightedScore));
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    occasionMatch: number,
    temporalMatch: number,
    partySizeMatch: number,
    priceMatch: number,
    locationMatch: number,
    overallMatch: number
  ): string {
    const parts: string[] = [];

    // Identify strong matches
    if (occasionMatch >= 0.8) {
      parts.push('perfect for this occasion');
    }
    if (temporalMatch >= 0.8) {
      parts.push('great timing');
    }
    if (partySizeMatch >= 0.8) {
      parts.push('ideal party size');
    }
    if (priceMatch >= 0.8) {
      parts.push('matches your budget');
    }

    // Identify weak matches
    if (occasionMatch <= 0.3) {
      parts.push('may not fit occasion');
    }
    if (priceMatch <= 0.3) {
      parts.push('different price point');
    }

    if (parts.length === 0) {
      if (overallMatch >= 0.6) return 'Good contextual match';
      if (overallMatch >= 0.4) return 'Reasonable match';
      return 'Limited context match';
    }

    return parts.join(', ');
  }

  /**
   * Batch calculate contextual matches for multiple recommendations
   */
  public async batchCalculateMatches(
    userId: string,
    recommendationIds: string[],
    searchContext?: SearchContext
  ): Promise<Map<string, ContextualMatch>> {
    const results = new Map<string, ContextualMatch>();

    for (const recId of recommendationIds) {
      const match = await this.calculateContextualMatch(userId, recId, searchContext);
      results.set(recId, match);
    }

    return results;
  }

  /**
   * Get smart default context based on current time and user patterns
   */
  public async inferDefaultContext(userId: string): Promise<SearchContext> {
    const userPattern = await this.getUserPattern(userId);
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Infer meal type from time
    let meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night' | undefined;
    if (hour < 11) meal_type = 'breakfast';
    else if (hour < 14) meal_type = 'lunch';
    else if (hour < 21) meal_type = 'dinner';
    else meal_type = 'late_night';

    // Infer occasion from patterns (if available)
    let occasion: SearchContext['occasion'];
    if (userPattern?.occasion_patterns) {
      // Find most common occasion for this day/time
      const patterns = userPattern.occasion_patterns;
      let maxScore = 0;
      for (const [occ, score] of Object.entries(patterns)) {
        if (typeof score === 'number' && score > maxScore) {
          maxScore = score;
          occasion = occ as SearchContext['occasion'];
        }
      }
    }

    // Default timing
    const timing = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'tonight';

    return {
      occasion,
      meal_type,
      timing,
      party_size: userPattern?.typical_party_size,
      dietary_needs: userPattern?.dietary_restrictions
    };
  }
}