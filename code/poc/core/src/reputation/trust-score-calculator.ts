// code/poc/core/src/reputation/trust-score-calculator.ts

import { Decimal } from 'decimal.js';

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
  socialDistance: number; // How many hops from the content creator
}

export interface ContentMetadata {
  contentId: string;
  authorId: string;
  createdAt: Date;
  category: string;
  tags: string[];
}

export interface TrustScoreInput {
  targetContentId: string;
  evaluatingUserId: string;
  socialConnections: SocialConnection[];
  userInteractions: UserInteraction[];
  contentMetadata: ContentMetadata;
}

export interface TrustScoreResult {
  finalScore: number;
  breakdown: {
    socialTrustWeight: number;
    qualitySignals: number;
    recencyFactor: number;
    diversityBonus: number;
  };
  socialPath: {
    userId: string;
    distance: number;
    contributionWeight: number;
  }[];
  confidence: number;
}

/**
 * Core Trust Score Calculator
 * Implements the social graph-weighted recommendation scoring that differentiates OmeoneChain
 */
export class TrustScoreCalculator {
  // Constants from your whitepaper
  private static readonly DIRECT_FOLLOW_WEIGHT = 0.75;
  private static readonly SECOND_HOP_WEIGHT = 0.25;
  private static readonly MAX_SOCIAL_DISTANCE = 2;
  private static readonly MIN_TRUST_THRESHOLD = 0.25;
  private static readonly MAX_TRUST_SCORE = 10.0;
  
  // Time decay factors
  private static readonly RECENCY_HALF_LIFE_DAYS = 30;
  private static readonly INTERACTION_WEIGHT_DECAY = 0.1;

  /**
   * Calculate Trust Score for content based on social graph
   */
  public calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
    const socialTrustWeight = this.calculateSocialTrustWeight(
      input.evaluatingUserId,
      input.contentMetadata.authorId,
      input.socialConnections,
      input.userInteractions
    );

    const qualitySignals = this.calculateQualitySignals(
      input.targetContentId,
      input.userInteractions
    );

    const recencyFactor = this.calculateRecencyFactor(
      input.contentMetadata.createdAt,
      input.userInteractions
    );

    const diversityBonus = this.calculateDiversityBonus(
      input.targetContentId,
      input.userInteractions,
      input.socialConnections
    );

    // Combine all factors using weighted formula
    const rawScore = this.combineScoreFactors(
      socialTrustWeight,
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
      input.userInteractions.length,
      socialPath.length
    );

    return {
      finalScore: Number(new Decimal(finalScore).toFixed(2)),
      breakdown: {
        socialTrustWeight,
        qualitySignals,
        recencyFactor,
        diversityBonus
      },
      socialPath,
      confidence
    };
  }

  /**
   * Calculate social trust weight based on social graph connections
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

    // Build social graph
    const socialGraph = this.buildSocialGraph(socialConnections);
    
    // Find shortest path and calculate distance
    const socialDistance = this.findSocialDistance(
      evaluatingUserId,
      contentAuthorId,
      socialGraph
    );

    if (socialDistance > TrustScoreCalculator.MAX_SOCIAL_DISTANCE) {
      return 0; // Beyond trust network
    }

    // Calculate base weight by social distance
    let baseWeight = 0;
    if (socialDistance === 1) {
      baseWeight = TrustScoreCalculator.DIRECT_FOLLOW_WEIGHT;
    } else if (socialDistance === 2) {
      baseWeight = TrustScoreCalculator.SECOND_HOP_WEIGHT;
    }

    // Apply interaction reinforcement
    const interactionMultiplier = this.calculateInteractionReinforcement(
      contentAuthorId,
      userInteractions,
      socialDistance
    );

    return Math.min(baseWeight * interactionMultiplier, 1.0);
  }

  /**
   * Calculate quality signals from user interactions
   */
  private calculateQualitySignals(
    contentId: string,
    userInteractions: UserInteraction[]
  ): number {
    const contentInteractions = userInteractions.filter(
      interaction => interaction.contentId === contentId
    );

    if (contentInteractions.length === 0) return 0;

    let qualityScore = 0;
    let totalWeight = 0;

    for (const interaction of contentInteractions) {
      const socialDistanceWeight = this.getSocialDistanceWeight(interaction.socialDistance);
      const interactionValue = this.getInteractionValue(interaction.interactionType);
      
      qualityScore += interactionValue * socialDistanceWeight;
      totalWeight += socialDistanceWeight;
    }

    return totalWeight > 0 ? qualityScore / totalWeight : 0;
  }

  /**
   * Calculate recency factor for time-based scoring
   */
  private calculateRecencyFactor(
    contentCreatedAt: Date,
    userInteractions: UserInteraction[]
  ): number {
    const now = new Date();
    const contentAgeMs = now.getTime() - contentCreatedAt.getTime();
    const contentAgeDays = contentAgeMs / (1000 * 60 * 60 * 24);

    // Calculate content recency decay
    const contentRecency = Math.exp(
      -contentAgeDays * Math.LN2 / TrustScoreCalculator.RECENCY_HALF_LIFE_DAYS
    );

    // Calculate recent interaction boost
    const recentInteractions = userInteractions.filter(
      interaction => {
        const interactionAge = (now.getTime() - interaction.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return interactionAge <= 7; // Last 7 days
      }
    );

    const interactionBoost = Math.min(recentInteractions.length * 0.1, 0.5);

    return Math.min(contentRecency + interactionBoost, 1.0);
  }

  /**
   * Calculate diversity bonus for varied social signals
   */
  private calculateDiversityBonus(
    contentId: string,
    userInteractions: UserInteraction[],
    socialConnections: SocialConnection[]
  ): number {
    const contentInteractions = userInteractions.filter(
      interaction => interaction.contentId === contentId
    );

    // Count unique users at different social distances
    const uniqueUsers = new Set(contentInteractions.map(i => i.userId));
    const socialDistanceVariety = new Set(contentInteractions.map(i => i.socialDistance));
    const interactionTypeVariety = new Set(contentInteractions.map(i => i.interactionType));

    // Bonus for multiple unique endorsers
    const userDiversityBonus = Math.min(uniqueUsers.size * 0.05, 0.3);
    
    // Bonus for interactions across social distances
    const distanceDiversityBonus = Math.min(socialDistanceVariety.size * 0.1, 0.2);
    
    // Bonus for different types of interactions
    const typeDiversityBonus = Math.min(interactionTypeVariety.size * 0.05, 0.15);

    return userDiversityBonus + distanceDiversityBonus + typeDiversityBonus;
  }

  /**
   * Combine all score factors using weighted formula
   */
  private combineScoreFactors(
    socialTrustWeight: number,
    qualitySignals: number,
    recencyFactor: number,
    diversityBonus: number
  ): number {
    // Weighted combination based on your whitepaper priorities
    const socialTrustContribution = socialTrustWeight * 0.4; // 40% weight
    const qualityContribution = qualitySignals * 0.3; // 30% weight  
    const recencyContribution = recencyFactor * 0.2; // 20% weight
    const diversityContribution = diversityBonus * 0.1; // 10% weight

    const combinedScore = (
      socialTrustContribution +
      qualityContribution +
      recencyContribution +
      diversityContribution
    ) * TrustScoreCalculator.MAX_TRUST_SCORE;

    return combinedScore;
  }

  /**
   * Build social graph from connections
   */
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

  /**
   * Find social distance between two users using BFS
   */
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

      if (userId === toUserId) {
        return distance;
      }

      if (visited.has(userId) || distance >= TrustScoreCalculator.MAX_SOCIAL_DISTANCE) {
        continue;
      }

      visited.add(userId);
      const connections = socialGraph.get(userId) || new Set();

      for (const connectedUserId of connections) {
        if (!visited.has(connectedUserId)) {
          queue.push({ userId: connectedUserId, distance: distance + 1 });
        }
      }
    }

    return Infinity; // No path found within max distance
  }

  /**
   * Calculate interaction reinforcement based on past behavior
   */
  private calculateInteractionReinforcement(
    authorId: string,
    userInteractions: UserInteraction[],
    socialDistance: number
  ): number {
    const authorInteractions = userInteractions.filter(
      interaction => interaction.userId === authorId
    );

    if (authorInteractions.length === 0) return 1.0;

    // Calculate positive interaction ratio
    const positiveInteractions = authorInteractions.filter(
      interaction => ['upvote', 'save', 'share'].includes(interaction.interactionType)
    ).length;

    const interactionRatio = positiveInteractions / authorInteractions.length;
    const reinforcementMultiplier = 0.8 + (interactionRatio * 0.4); // Range: 0.8 to 1.2

    return reinforcementMultiplier;
  }

  /**
   * Build social path showing trust propagation
   */
  private buildSocialPath(
    fromUserId: string,
    toUserId: string,
    socialConnections: SocialConnection[]
  ): { userId: string; distance: number; contributionWeight: number }[] {
    const socialGraph = this.buildSocialGraph(socialConnections);
    const path: { userId: string; distance: number; contributionWeight: number }[] = [];

    // BFS to find path and build trust chain
    const visited = new Set<string>();
    const queue: { userId: string; distance: number; path: string[] }[] = [
      { userId: fromUserId, distance: 0, path: [fromUserId] }
    ];

    while (queue.length > 0) {
      const { userId, distance, path: currentPath } = queue.shift()!;

      if (userId === toUserId) {
        // Build path with weights
        for (let i = 0; i < currentPath.length; i++) {
          path.push({
            userId: currentPath[i],
            distance: i,
            contributionWeight: this.getSocialDistanceWeight(i)
          });
        }
        break;
      }

      if (visited.has(userId) || distance >= TrustScoreCalculator.MAX_SOCIAL_DISTANCE) {
        continue;
      }

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

  /**
   * Calculate confidence in the trust score
   */
  private calculateConfidence(
    socialTrustWeight: number,
    interactionCount: number,
    socialPathLength: number
  ): number {
    // Higher confidence with stronger social connections
    const socialConfidence = socialTrustWeight;
    
    // Higher confidence with more interactions (diminishing returns)
    const interactionConfidence = Math.min(interactionCount * 0.1, 0.8);
    
    // Lower confidence for longer social paths
    const pathConfidence = socialPathLength > 0 ? 1 / socialPathLength : 0;

    const averageConfidence = (socialConfidence + interactionConfidence + pathConfidence) / 3;
    
    return Math.min(Math.max(averageConfidence, 0.1), 1.0);
  }

  /**
   * Get weight based on social distance
   */
  private getSocialDistanceWeight(distance: number): number {
    switch (distance) {
      case 0: return 1.0;
      case 1: return TrustScoreCalculator.DIRECT_FOLLOW_WEIGHT;
      case 2: return TrustScoreCalculator.SECOND_HOP_WEIGHT;
      default: return 0;
    }
  }

  /**
   * Get value for different interaction types
   */
  private getInteractionValue(interactionType: string): number {
    switch (interactionType) {
      case 'upvote': return 1.0;
      case 'save': return 1.2;
      case 'share': return 1.5;
      case 'downvote': return -0.5;
      default: return 0;
    }
  }

  /**
   * Check if content meets minimum trust threshold
   */
  public meetsTrustThreshold(trustScore: number): boolean {
    return trustScore >= TrustScoreCalculator.MIN_TRUST_THRESHOLD;
  }

  /**
   * Get trust score category for UI display
   */
  public getTrustCategory(trustScore: number): string {
    if (trustScore >= 8.0) return 'Highly Trusted';
    if (trustScore >= 6.0) return 'Trusted';
    if (trustScore >= 4.0) return 'Moderately Trusted';
    if (trustScore >= 2.0) return 'Low Trust';
    return 'Untrusted';
  }
}