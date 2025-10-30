// code/poc/core/src/reputation/trust-score-calculator.ts
// Updated for Trust Score 2.0: Multi-factor intelligent scoring

import { Decimal } from 'decimal.js';
import { 
  TrustScore2_0, 
  ContextualFactors, 
  SearchContext 
} from '../type/recommendation';
import { 
  TasteAlignmentResult, 
  UserTastePattern,
  ContextualMatch 
} from '../type/reputation';
import { 
  DEFAULT_TRUST_WEIGHTS,
  MIN_TRUST_SCORE_FOR_REWARDS,
  ConfidenceLevel,
  getConfidenceLevel
} from '../type/common';

// ============================================
// LEGACY INTERFACES (Preserved for compatibility)
// ============================================

export interface SocialConnection {
  fromUserId: string;
  toUserId: string;
  connectionType: 'follow' | 'trust' | 'verified';
  establishedAt: Date;
  trustWeight: number;
}

export interface UserInteraction {
  userId: string;
  contentId: string;
  interactionType: 'upvote' | 'save' | 'share' | 'downvote';
  timestamp: Date;
  socialDistance: number;
}

export interface ContentMetadata {
  contentId: string;
  authorId: string;
  createdAt: Date;
  category: string;
  tags: string[];
}

// ============================================
// TRUST SCORE 2.0 INTERFACES
// ============================================

export interface TrustScoreInput {
  targetContentId: string;
  evaluatingUserId: string;
  socialConnections: SocialConnection[];
  userInteractions: UserInteraction[];
  contentMetadata: ContentMetadata;
  
  // NEW Trust Score 2.0 inputs
  tasteAlignmentData?: TasteAlignmentResult;
  evaluatingUserPattern?: UserTastePattern;
  contentContext?: ContextualFactors;
  searchContext?: SearchContext;
}

export interface TrustScoreResult {
  finalScore: number;
  breakdown: {
    socialTrustWeight: number;
    tasteAlignmentWeight: number;     // NEW
    contextualMatchWeight: number;    // NEW
    qualitySignals: number;
    recencyFactor: number;
    diversityBonus: number;           // Incorporated into quality signals
  };
  socialPath: {
    userId: string;
    distance: number;
    contributionWeight: number;
  }[];
  confidence: number;
  confidenceLevel: ConfidenceLevel;  // NEW
  explanation: string;                // NEW
  
  // Trust Score 2.0 detailed breakdown
  trustScore2_0?: TrustScore2_0;
}

/**
 * Trust Score Calculator - Enhanced for Trust Score 2.0
 * 
 * Original: Social graph-weighted recommendation scoring
 * Trust Score 2.0: Multi-factor intelligent scoring (30% social, 50% taste, 20% context)
 */
export class TrustScoreCalculator {
  // ============================================
  // CONSTANTS
  // ============================================
  
  // Trust Score 2.0 weights (new paradigm)
  private static readonly SOCIAL_WEIGHT = DEFAULT_TRUST_WEIGHTS.social;           // 0.3
  private static readonly TASTE_WEIGHT = DEFAULT_TRUST_WEIGHTS.taste;             // 0.5
  private static readonly CONTEXTUAL_WEIGHT = DEFAULT_TRUST_WEIGHTS.contextual;   // 0.2
  
  // Legacy social distance weights (still used within social component)
  private static readonly DIRECT_FOLLOW_WEIGHT = 0.75;
  private static readonly SECOND_HOP_WEIGHT = 0.25;
  private static readonly MAX_SOCIAL_DISTANCE = 2;
  
  // Thresholds
  private static readonly MIN_TRUST_THRESHOLD = MIN_TRUST_SCORE_FOR_REWARDS;
  private static readonly MAX_TRUST_SCORE = 10.0;
  
  // Time decay factors
  private static readonly RECENCY_HALF_LIFE_DAYS = 30;
  private static readonly INTERACTION_WEIGHT_DECAY = 0.1;
  
  // Trust Score 2.0 minimum data requirements
  private static readonly MIN_TASTE_ALIGNMENT_CONFIDENCE = 0.3;
  private static readonly MIN_CONTEXTUAL_DATA_POINTS = 2;

  // ============================================
  // MAIN CALCULATION METHOD
  // ============================================

  /**
   * Calculate Trust Score 2.0 for content based on multi-factor intelligence
   */
  public calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
    // 1. Calculate Social Trust Component (30% weight)
    const socialTrustWeight = this.calculateSocialTrustWeight(
      input.evaluatingUserId,
      input.contentMetadata.authorId,
      input.socialConnections,
      input.userInteractions
    );

    // 2. Calculate Taste Alignment Component (50% weight) - NEW
    const tasteAlignmentWeight = this.calculateTasteAlignmentWeight(
      input.tasteAlignmentData,
      input.evaluatingUserPattern,
      input.contentMetadata
    );

    // 3. Calculate Contextual Match Component (20% weight) - NEW
    const contextualMatchWeight = this.calculateContextualMatchWeight(
      input.evaluatingUserPattern,
      input.contentContext,
      input.searchContext
    );

    // 4. Calculate Quality Signals (multiplier)
    const qualitySignals = this.calculateQualitySignals(
      input.targetContentId,
      input.userInteractions
    );

    // 5. Calculate Recency Factor (multiplier)
    const recencyFactor = this.calculateRecencyFactor(
      input.contentMetadata.createdAt,
      input.userInteractions
    );

    // 6. Calculate Diversity Bonus (now part of quality signals)
    const diversityBonus = this.calculateDiversityBonus(
      input.targetContentId,
      input.userInteractions,
      input.socialConnections
    );

    // Combine all factors using Trust Score 2.0 formula
    const rawScore = this.combineScoreFactorsTrustScore2_0(
      socialTrustWeight,
      tasteAlignmentWeight,
      contextualMatchWeight,
      qualitySignals,
      recencyFactor,
      diversityBonus
    );

    const finalScore = Math.min(rawScore, TrustScoreCalculator.MAX_TRUST_SCORE);
    
    const socialPath = this.buildSocialPath(
      input.evaluatingUserId,
      input.contentMetadata.authorId,
      input.socialConnections
    );

    const confidence = this.calculateConfidence(
      socialTrustWeight,
      tasteAlignmentWeight,
      contextualMatchWeight,
      input.userInteractions.length,
      socialPath.length,
      input.tasteAlignmentData?.confidence_level || 0
    );

    const confidenceLevel = getConfidenceLevel(confidence);
    const explanation = this.generateExplanation(
      socialTrustWeight,
      tasteAlignmentWeight,
      contextualMatchWeight,
      finalScore,
      confidenceLevel
    );

    // Build Trust Score 2.0 detailed breakdown
    const trustScore2_0: TrustScore2_0 = {
      social_weight: socialTrustWeight,
      taste_alignment: tasteAlignmentWeight,
      contextual_match: contextualMatchWeight,
      recency_factor: recencyFactor,
      quality_signals: qualitySignals + diversityBonus,
      overall_trust_score: finalScore / TrustScoreCalculator.MAX_TRUST_SCORE, // Normalize to 0-1
      explanation
    };

    return {
      finalScore: Number(new Decimal(finalScore).toFixed(2)),
      breakdown: {
        socialTrustWeight,
        tasteAlignmentWeight,
        contextualMatchWeight,
        qualitySignals,
        recencyFactor,
        diversityBonus
      },
      socialPath,
      confidence,
      confidenceLevel,
      explanation,
      trustScore2_0
    };
  }

  // ============================================
  // SOCIAL TRUST COMPONENT (30% weight)
  // ============================================

  /**
   * Calculate social trust weight based on social graph connections
   * This is the original Trust Score logic, now weighted at 30%
   */
  private calculateSocialTrustWeight(
    evaluatingUserId: string,
    contentAuthorId: string,
    socialConnections: SocialConnection[],
    userInteractions: UserInteraction[]
  ): number {
    if (evaluatingUserId === contentAuthorId) {
      return 1.0; // Perfect trust for own content
    }

    const socialGraph = this.buildSocialGraph(socialConnections);
    const socialDistance = this.findSocialDistance(
      evaluatingUserId,
      contentAuthorId,
      socialGraph
    );

    if (socialDistance > TrustScoreCalculator.MAX_SOCIAL_DISTANCE) {
      return 0; // Beyond trust network
    }

    let baseWeight = 0;
    if (socialDistance === 1) {
      baseWeight = TrustScoreCalculator.DIRECT_FOLLOW_WEIGHT;
    } else if (socialDistance === 2) {
      baseWeight = TrustScoreCalculator.SECOND_HOP_WEIGHT;
    }

    const interactionMultiplier = this.calculateInteractionReinforcement(
      contentAuthorId,
      userInteractions,
      socialDistance
    );

    return Math.min(baseWeight * interactionMultiplier, 1.0);
  }

  // ============================================
  // TASTE ALIGNMENT COMPONENT (50% weight) - NEW
  // ============================================

  /**
   * Calculate taste alignment weight based on preference correlation
   * This is the primary factor in Trust Score 2.0
   */
  private calculateTasteAlignmentWeight(
    tasteAlignmentData: TasteAlignmentResult | undefined,
    evaluatingUserPattern: UserTastePattern | undefined,
    contentMetadata: ContentMetadata
  ): number {
    // If no taste alignment data available, use fallback
    if (!tasteAlignmentData || !evaluatingUserPattern) {
      return this.fallbackTasteAlignment(evaluatingUserPattern, contentMetadata);
    }

    // Check confidence level
    if (tasteAlignmentData.confidence_level < TrustScoreCalculator.MIN_TASTE_ALIGNMENT_CONFIDENCE) {
      return this.fallbackTasteAlignment(evaluatingUserPattern, contentMetadata);
    }

    // Primary taste alignment score
    let tasteScore = tasteAlignmentData.similarity_score;

    // Boost for shared cuisines in this recommendation
    const cuisineBoost = this.calculateCuisineBoost(
      evaluatingUserPattern,
      contentMetadata.category
    );

    // Boost for high correlation in rating patterns
    const correlationBoost = this.calculateCorrelationBoost(
      tasteAlignmentData.correlation_data
    );

    // Combine with diminishing returns
    tasteScore = tasteScore * 0.7 + cuisineBoost * 0.2 + correlationBoost * 0.1;

    return Math.min(tasteScore, 1.0);
  }

  /**
   * Fallback taste alignment when insufficient data
   * Uses cuisine preferences and category matching
   */
  private fallbackTasteAlignment(
    userPattern: UserTastePattern | undefined,
    contentMetadata: ContentMetadata
  ): number {
    if (!userPattern || !userPattern.cuisine_preferences) {
      return 0.5; // Neutral score when no data
    }

    // Check if user has preferences for this category/cuisine
    const categoryPreference = userPattern.cuisine_preferences[contentMetadata.category] || 0;
    
    // Tag-based matching
    const tagMatches = contentMetadata.tags.filter(tag => 
      userPattern.cuisine_preferences[tag] !== undefined
    );
    
    const avgTagPreference = tagMatches.length > 0
      ? tagMatches.reduce((sum, tag) => sum + (userPattern.cuisine_preferences[tag] || 0), 0) / tagMatches.length
      : 0;

    // Combine category and tag preferences
    return Math.max(categoryPreference, avgTagPreference);
  }

  /**
   * Calculate boost based on cuisine preference alignment
   */
  private calculateCuisineBoost(
    userPattern: UserTastePattern,
    category: string
  ): number {
    if (!userPattern.cuisine_preferences) return 0;
    
    const preference = userPattern.cuisine_preferences[category];
    return preference !== undefined ? preference * 0.3 : 0; // Max 0.3 boost
  }

  /**
   * Calculate boost based on correlation strength
   */
  private calculateCorrelationBoost(
    correlationData: TasteAlignmentResult['correlation_data']
  ): number {
    if (!correlationData) return 0;

    const avgCorrelation = (
      correlationData.cuisine_correlation +
      correlationData.rating_correlation +
      correlationData.context_correlation
    ) / 3;

    return Math.max(0, avgCorrelation) * 0.2; // Max 0.2 boost
  }

  // ============================================
  // CONTEXTUAL MATCH COMPONENT (20% weight) - NEW
  // ============================================

  /**
   * Calculate contextual match weight based on situational relevance
   */
  private calculateContextualMatchWeight(
    evaluatingUserPattern: UserTastePattern | undefined,
    contentContext: ContextualFactors | undefined,
    searchContext: SearchContext | undefined
  ): number {
    // If no context data, return neutral score
    if (!contentContext && !searchContext) {
      return 0.5;
    }

    let contextScore = 0;
    let factorCount = 0;

    // Occasion matching
    if (contentContext?.occasion && searchContext?.occasion) {
      contextScore += contentContext.occasion === searchContext.occasion ? 1.0 : 0.3;
      factorCount++;
    } else if (contentContext?.occasion && evaluatingUserPattern?.occasion_patterns) {
      const occasionPreference = evaluatingUserPattern.occasion_patterns[contentContext.occasion] || 0;
      contextScore += occasionPreference;
      factorCount++;
    }

    // Party size matching
    if (contentContext?.party_size && searchContext?.party_size) {
      const sizeDiff = Math.abs(contentContext.party_size - searchContext.party_size);
      contextScore += Math.max(0, 1.0 - (sizeDiff * 0.2)); // Penalty for size differences
      factorCount++;
    }

    // Temporal matching (time of day, day of week)
    if (contentContext?.time_of_visit && evaluatingUserPattern?.temporal_patterns) {
      const temporalMatch = this.calculateTemporalMatch(
        contentContext,
        evaluatingUserPattern
      );
      contextScore += temporalMatch;
      factorCount++;
    }

    // Meal type matching
    if (contentContext?.meal_type && searchContext?.meal_type) {
      contextScore += contentContext.meal_type === searchContext.meal_type ? 1.0 : 0.4;
      factorCount++;
    }

    // Return average if we have factors, otherwise neutral
    return factorCount > 0 ? contextScore / factorCount : 0.5;
  }

  /**
   * Calculate temporal pattern matching
   */
  private calculateTemporalMatch(
    contentContext: ContextualFactors,
    userPattern: UserTastePattern
  ): number {
    if (!contentContext.time_of_visit || !userPattern.temporal_patterns) {
      return 0.5;
    }

    // Check day of week preference
    const dayOfWeek = contentContext.day_of_week;
    if (dayOfWeek !== undefined && userPattern.temporal_patterns[`day_${dayOfWeek}`]) {
      return 0.8; // Strong match
    }

    // Check meal type + day pattern
    if (contentContext.meal_type && userPattern.temporal_patterns[contentContext.meal_type]) {
      return 0.7; // Good match
    }

    return 0.5; // Neutral
  }

  // ============================================
  // QUALITY SIGNALS (Multiplier)
  // ============================================

  /**
   * Calculate quality signals from user interactions
   * (Unchanged from original implementation)
   */
  private calculateQualitySignals(
    contentId: string,
    userInteractions: UserInteraction[]
  ): number {
    const contentInteractions = userInteractions.filter(
      interaction => interaction.contentId === contentId
    );

    if (contentInteractions.length === 0) return 0.5; // Neutral when no interactions

    let qualityScore = 0;
    let totalWeight = 0;

    for (const interaction of contentInteractions) {
      const socialDistanceWeight = this.getSocialDistanceWeight(interaction.socialDistance);
      const interactionValue = this.getInteractionValue(interaction.interactionType);
      
      qualityScore += interactionValue * socialDistanceWeight;
      totalWeight += socialDistanceWeight;
    }

    const normalizedScore = totalWeight > 0 ? qualityScore / totalWeight : 0.5;
    return Math.max(0, Math.min(normalizedScore, 1.0));
  }

  // ============================================
  // RECENCY FACTOR (Multiplier)
  // ============================================

  /**
   * Calculate recency factor for time-based scoring
   * (Unchanged from original implementation)
   */
  private calculateRecencyFactor(
    contentCreatedAt: Date,
    userInteractions: UserInteraction[]
  ): number {
    const now = new Date();
    const contentAgeMs = now.getTime() - contentCreatedAt.getTime();
    const contentAgeDays = contentAgeMs / (1000 * 60 * 60 * 24);

    const contentRecency = Math.exp(
      -contentAgeDays * Math.LN2 / TrustScoreCalculator.RECENCY_HALF_LIFE_DAYS
    );

    const recentInteractions = userInteractions.filter(
      interaction => {
        const interactionAge = (now.getTime() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return interactionAge <= 7;
      }
    );

    const interactionBoost = Math.min(recentInteractions.length * 0.1, 0.5);
    return Math.min(contentRecency + interactionBoost, 1.0);
  }

  // ============================================
  // DIVERSITY BONUS (Incorporated into quality)
  // ============================================

  /**
   * Calculate diversity bonus for varied social signals
   * (Unchanged from original implementation)
   */
  private calculateDiversityBonus(
    contentId: string,
    userInteractions: UserInteraction[],
    socialConnections: SocialConnection[]
  ): number {
    const contentInteractions = userInteractions.filter(
      interaction => interaction.contentId === contentId
    );

    const uniqueUsers = new Set(contentInteractions.map(i => i.userId));
    const socialDistanceVariety = new Set(contentInteractions.map(i => i.socialDistance));
    const interactionTypeVariety = new Set(contentInteractions.map(i => i.interactionType));

    const userDiversityBonus = Math.min(uniqueUsers.size * 0.05, 0.3);
    const distanceDiversityBonus = Math.min(socialDistanceVariety.size * 0.1, 0.2);
    const typeDiversityBonus = Math.min(interactionTypeVariety.size * 0.05, 0.15);

    return userDiversityBonus + distanceDiversityBonus + typeDiversityBonus;
  }

  // ============================================
  // SCORE COMBINATION
  // ============================================

  /**
   * Combine all score factors using Trust Score 2.0 formula
   * NEW: 30% social, 50% taste, 20% context
   */
  private combineScoreFactorsTrustScore2_0(
    socialTrustWeight: number,
    tasteAlignmentWeight: number,
    contextualMatchWeight: number,
    qualitySignals: number,
    recencyFactor: number,
    diversityBonus: number
  ): number {
    // Trust Score 2.0 weighted combination
    const baseScore = (
      socialTrustWeight * TrustScoreCalculator.SOCIAL_WEIGHT +
      tasteAlignmentWeight * TrustScoreCalculator.TASTE_WEIGHT +
      contextualMatchWeight * TrustScoreCalculator.CONTEXTUAL_WEIGHT
    );

    // Apply multipliers
    const enhancedQuality = Math.max(0.5, qualitySignals + diversityBonus);
    const combinedScore = baseScore * enhancedQuality * recencyFactor;

    return combinedScore * TrustScoreCalculator.MAX_TRUST_SCORE;
  }

  // ============================================
  // CONFIDENCE CALCULATION
  // ============================================

  /**
   * Calculate confidence in the trust score
   * Enhanced for Trust Score 2.0 with taste and context factors
   */
  private calculateConfidence(
    socialTrustWeight: number,
    tasteAlignmentWeight: number,
    contextualMatchWeight: number,
    interactionCount: number,
    socialPathLength: number,
    tasteAlignmentConfidence: number
  ): number {
    // Social confidence (based on connection strength)
    const socialConfidence = socialTrustWeight * 0.3;
    
    // Taste alignment confidence (primary factor)
    const tasteConfidence = tasteAlignmentConfidence * 0.5;
    
    // Interaction confidence (diminishing returns)
    const interactionConfidence = Math.min(interactionCount * 0.1, 0.8) * 0.15;
    
    // Path confidence (inverse of distance)
    const pathConfidence = socialPathLength > 0 ? (1 / socialPathLength) * 0.05 : 0;

    const totalConfidence = socialConfidence + tasteConfidence + interactionConfidence + pathConfidence;
    return Math.min(Math.max(totalConfidence, 0.1), 1.0);
  }

  // ============================================
  // EXPLANATION GENERATION
  // ============================================

  /**
   * Generate human-readable explanation of Trust Score
   */
  private generateExplanation(
    socialWeight: number,
    tasteWeight: number,
    contextWeight: number,
    finalScore: number,
    confidenceLevel: ConfidenceLevel
  ): string {
    const parts: string[] = [];

    // Dominant factor
    const dominantFactor = Math.max(socialWeight, tasteWeight, contextWeight);
    if (dominantFactor === tasteWeight && tasteWeight > 0.6) {
      parts.push('Strong taste alignment with your preferences');
    } else if (dominantFactor === socialWeight && socialWeight > 0.6) {
      parts.push('From people you trust in your network');
    } else if (dominantFactor === contextWeight && contextWeight > 0.6) {
      parts.push('Perfect match for your current context');
    }

    // Secondary factors
    if (tasteWeight > 0.4 && dominantFactor !== tasteWeight) {
      parts.push('similar taste patterns');
    }
    if (socialWeight > 0.4 && dominantFactor !== socialWeight) {
      parts.push('trusted connections');
    }
    if (contextWeight > 0.4 && dominantFactor !== contextWeight) {
      parts.push('contextual match');
    }

    // Confidence qualifier
    const confidenceText = confidenceLevel === ConfidenceLevel.VERY_HIGH ? 'high confidence' :
                           confidenceLevel === ConfidenceLevel.HIGH ? 'good confidence' :
                           confidenceLevel === ConfidenceLevel.MEDIUM ? 'moderate confidence' :
                           'limited data';

    const explanation = parts.length > 0 
      ? `${parts.join(', ')} (${confidenceText})`
      : `Trust score ${finalScore.toFixed(1)}/10 (${confidenceText})`;

    return explanation;
  }

  // ============================================
  // HELPER METHODS (Unchanged from original)
  // ============================================

  private buildSocialGraph(connections: SocialConnection[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    for (const connection of connections) {
      if (!graph.has(connection.fromUserId)) {
        graph.set(connection.fromUserId, new Set());
      }
      graph.get(connection.fromUserId)!.add(connection.toUserId);
    }
    return graph;
  }

  private findSocialDistance(
    fromUserId: string,
    toUserId: string,
    socialGraph: Map<string, Set<string>>
  ): number {
    if (fromUserId === toUserId) return 0;

    const visited = new Set<string>();
    const queue: { userId: string; distance: number }[] = [{ userId: fromUserId, distance: 0 }];

    while (queue.length > 0) {
      const { userId, distance } = queue.shift()!;

      if (userId === toUserId) return distance;
      if (visited.has(userId) || distance >= TrustScoreCalculator.MAX_SOCIAL_DISTANCE) continue;

      visited.add(userId);
      const connections = socialGraph.get(userId) || new Set();

      for (const connectedUserId of connections) {
        if (!visited.has(connectedUserId)) {
          queue.push({ userId: connectedUserId, distance: distance + 1 });
        }
      }
    }

    return Infinity;
  }

  private calculateInteractionReinforcement(
    authorId: string,
    userInteractions: UserInteraction[],
    socialDistance: number
  ): number {
    const authorInteractions = userInteractions.filter(i => i.userId === authorId);
    if (authorInteractions.length === 0) return 1.0;

    const positiveInteractions = authorInteractions.filter(
      i => ['upvote', 'save', 'share'].includes(i.interactionType)
    ).length;

    const interactionRatio = positiveInteractions / authorInteractions.length;
    return 0.8 + (interactionRatio * 0.4);
  }

  private buildSocialPath(
    fromUserId: string,
    toUserId: string,
    socialConnections: SocialConnection[]
  ): { userId: string; distance: number; contributionWeight: number }[] {
    const socialGraph = this.buildSocialGraph(socialConnections);
    const path: { userId: string; distance: number; contributionWeight: number }[] = [];

    const visited = new Set<string>();
    const queue: { userId: string; distance: number; path: string[] }[] = [
      { userId: fromUserId, distance: 0, path: [fromUserId] }
    ];

    while (queue.length > 0) {
      const { userId, distance, path: currentPath } = queue.shift()!;

      if (userId === toUserId) {
        for (let i = 0; i < currentPath.length; i++) {
          path.push({
            userId: currentPath[i],
            distance: i,
            contributionWeight: this.getSocialDistanceWeight(i)
          });
        }
        break;
      }

      if (visited.has(userId) || distance >= TrustScoreCalculator.MAX_SOCIAL_DISTANCE) continue;

      visited.add(userId);
      const connections = socialGraph.get(userId) || new Set();

      for (const connectedUserId of connections) {
        if (!visited.has(connectedUserId)) {
          queue.push({
            userId: connectedUserId,
            distance: distance + 1,
            path: [...currentPath, connectedUserId]
          });
        }
      }
    }

    return path;
  }

  private getSocialDistanceWeight(distance: number): number {
    switch (distance) {
      case 0: return 1.0;
      case 1: return TrustScoreCalculator.DIRECT_FOLLOW_WEIGHT;
      case 2: return TrustScoreCalculator.SECOND_HOP_WEIGHT;
      default: return 0;
    }
  }

  private getInteractionValue(interactionType: string): number {
    switch (interactionType) {
      case 'upvote': return 1.0;
      case 'save': return 1.2;
      case 'share': return 1.5;
      case 'downvote': return -0.5;
      default: return 0;
    }
  }

  // ============================================
  // PUBLIC UTILITY METHODS
  // ============================================

  public meetsTrustThreshold(trustScore: number): boolean {
    return trustScore >= TrustScoreCalculator.MIN_TRUST_THRESHOLD;
  }

  public getTrustCategory(trustScore: number): string {
    if (trustScore >= 8.0) return 'Highly Trusted';
    if (trustScore >= 6.0) return 'Trusted';
    if (trustScore >= 4.0) return 'Moderately Trusted';
    if (trustScore >= 2.0) return 'Low Trust';
    return 'Untrusted';
  }

  /**
   * Get Trust Score 2.0 breakdown as percentage contributions
   */
  public getScoreBreakdownPercentages(result: TrustScoreResult): {
    social: number;
    taste: number;
    contextual: number;
  } {
    const total = result.breakdown.socialTrustWeight + 
                  result.breakdown.tasteAlignmentWeight + 
                  result.breakdown.contextualMatchWeight;
    
    if (total === 0) return { social: 0, taste: 0, contextual: 0 };

    return {
      social: (result.breakdown.socialTrustWeight / total) * 100,
      taste: (result.breakdown.tasteAlignmentWeight / total) * 100,
      contextual: (result.breakdown.contextualMatchWeight / total) * 100
    };
  }
}