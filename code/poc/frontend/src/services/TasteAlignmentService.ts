// File path: /code/poc/frontend/src/services/TasteAlignmentService.ts
// NEW: Taste Alignment Score for personalized recommendations
// This replaces "Trust Score 2.0" concept with clearer naming

import { IOTAService } from './IOTAService';
import TierService from './TierService';

export interface TasteAlignmentScore {
  recommendationId: string;
  viewerUserId: string;
  authorUserId: string;
  finalScore: number; // 0-10 scale
  breakdown: {
    socialAlignment: number;      // 0-3 points (based on social distance)
    tastePreferenceMatch: number; // 0-4 points (food preference correlation)
    contextualRelevance: number;  // 0-2 points (location, time, occasion)
    authorCredibility: number;    // 0-1 points (author's tier and validation rate)
  };
  socialProof: {
    directFriendsWhoLiked: string[];
    indirectFriendsWhoLiked: string[];
    totalSocialWeight: number;
  };
  tasteProfile: {
    categoryMatch: number;        // how well category aligns with viewer preferences
    cuisineMatch: number;         // cuisine type alignment
    priceRangeMatch: number;      // price preference alignment
    occasionMatch: number;        // occasion/context alignment
  };
  explanation: string; // Human-readable explanation of score
}

export interface UserTasteProfile {
  userId: string;
  preferences: {
    favoriteCategories: string[];
    favoriteCuisines: string[];
    priceRange: 'budget' | 'moderate' | 'upscale' | 'any';
    dietaryRestrictions: string[];
    preferredOccasions: string[];
  };
  history: {
    totalInteractions: number;
    categoryDistribution: { [category: string]: number };
    cuisineDistribution: { [cuisine: string]: number };
    avgPriceRange: number;
  };
  similarUsers: string[]; // users with similar taste
}

export interface SocialAlignment {
  viewerId: string;
  authorId: string;
  socialDistance: number; // 0 = same user, 1 = direct friend, 2 = friend-of-friend, 3+ = distant
  directConnections: string[];
  indirectConnections: string[];
  mutualConnections: string[];
  alignmentWeight: number; // 0-1 based on social distance
}

class TasteAlignmentService {
  private iotaService: IOTAService;
  private tierService: TierService;

  constructor() {
    this.iotaService = new IOTAService();
    this.tierService = new TierService();
  }

  /**
   * Calculate personalized taste alignment score for a recommendation
   * This is the main method that combines all signals
   */
  async calculateTasteAlignment(
    recommendationId: string,
    viewerUserId: string
  ): Promise<TasteAlignmentScore> {
    try {
      console.log(`🎯 Calculating taste alignment for rec ${recommendationId} (viewer: ${viewerUserId})`);

      // Get recommendation data
      const recommendation = await this.getRecommendation(recommendationId);
      
      // Get viewer's taste profile
      const viewerProfile = await this.getUserTasteProfile(viewerUserId);
      
      // Get author's credibility
      const authorTier = await this.tierService.getUserTierStatus(recommendation.authorId);
      
      // Calculate social alignment
      const socialAlignment = await this.calculateSocialAlignment(
        viewerUserId,
        recommendation.authorId
      );
      
      // Calculate taste preference match
      const tasteMatch = this.calculateTastePreferenceMatch(
        viewerProfile,
        recommendation
      );
      
      // Calculate contextual relevance
      const contextualRelevance = this.calculateContextualRelevance(
        viewerProfile,
        recommendation
      );
      
      // Calculate author credibility score
      const authorCredibility = this.calculateAuthorCredibility(authorTier);

      // Get social proof
      const socialProof = await this.getSocialProof(
        recommendationId,
        viewerUserId,
        socialAlignment
      );

      // Combine all scores (weighted sum, max 10)
      const breakdown = {
        socialAlignment: socialAlignment.alignmentWeight * 3,       // max 3 points
        tastePreferenceMatch: tasteMatch.totalScore * 4,           // max 4 points
        contextualRelevance: contextualRelevance.totalScore * 2,   // max 2 points
        authorCredibility: authorCredibility                        // max 1 point
      };

      const finalScore = Math.min(
        breakdown.socialAlignment +
        breakdown.tastePreferenceMatch +
        breakdown.contextualRelevance +
        breakdown.authorCredibility,
        10
      );

      // Generate human-readable explanation
      const explanation = this.generateExplanation(breakdown, socialProof, tasteMatch);

      return {
        recommendationId,
        viewerUserId,
        authorUserId: recommendation.authorId,
        finalScore: Number(finalScore.toFixed(1)),
        breakdown: {
          socialAlignment: Number(breakdown.socialAlignment.toFixed(2)),
          tastePreferenceMatch: Number(breakdown.tastePreferenceMatch.toFixed(2)),
          contextualRelevance: Number(breakdown.contextualRelevance.toFixed(2)),
          authorCredibility: Number(breakdown.authorCredibility.toFixed(2))
        },
        socialProof,
        tasteProfile: tasteMatch,
        explanation
      };
    } catch (error) {
      console.error('❌ Failed to calculate taste alignment:', error);
      throw error;
    }
  }

  /**
   * Get user's taste profile based on interaction history
   */
  async getUserTasteProfile(userId: string): Promise<UserTasteProfile> {
    try {
      // Get user's interaction history from recommendation contract
      const interactions = await this.getUserInteractionHistory(userId);
      
      // Analyze preferences from history
      const preferences = this.extractPreferences(interactions);
      const history = this.summarizeHistory(interactions);
      const similarUsers = await this.findSimilarUsers(userId, preferences);

      return {
        userId,
        preferences,
        history,
        similarUsers
      };
    } catch (error) {
      console.error('❌ Failed to get taste profile:', error);
      
      // Return default profile
      return {
        userId,
        preferences: {
          favoriteCategories: [],
          favoriteCuisines: [],
          priceRange: 'any',
          dietaryRestrictions: [],
          preferredOccasions: []
        },
        history: {
          totalInteractions: 0,
          categoryDistribution: {},
          cuisineDistribution: {},
          avgPriceRange: 2
        },
        similarUsers: []
      };
    }
  }

  /**
   * Calculate social alignment between viewer and author
   */
  async calculateSocialAlignment(
    viewerId: string,
    authorId: string
  ): Promise<SocialAlignment> {
    try {
      // Same user = perfect alignment
      if (viewerId === authorId) {
        return {
          viewerId,
          authorId,
          socialDistance: 0,
          directConnections: [],
          indirectConnections: [],
          mutualConnections: [],
          alignmentWeight: 1.0
        };
      }

      // Get viewer's social connections
      const viewerConnections = await this.tierService.getSocialConnections(viewerId);
      
      // Check if author is in viewer's network
      const isDirect = viewerConnections.directConnections.includes(authorId);
      const isIndirect = viewerConnections.indirectConnections.includes(authorId);

      let socialDistance = 3; // default: distant
      let alignmentWeight = 0.1; // default: low weight

      if (isDirect) {
        socialDistance = 1;
        alignmentWeight = 0.75; // strong alignment
      } else if (isIndirect) {
        socialDistance = 2;
        alignmentWeight = 0.25; // moderate alignment
      }

      // Find mutual connections
      const authorConnections = await this.tierService.getSocialConnections(authorId);
      const mutualConnections = this.findMutualConnections(
        viewerConnections.directConnections,
        authorConnections.directConnections
      );

      return {
        viewerId,
        authorId,
        socialDistance,
        directConnections: viewerConnections.directConnections,
        indirectConnections: viewerConnections.indirectConnections,
        mutualConnections,
        alignmentWeight
      };
    } catch (error) {
      console.error('❌ Failed to calculate social alignment:', error);
      
      // Return default (distant)
      return {
        viewerId,
        authorId,
        socialDistance: 3,
        directConnections: [],
        indirectConnections: [],
        mutualConnections: [],
        alignmentWeight: 0.1
      };
    }
  }

  /**
   * Get recommendations sorted by taste alignment
   */
  async getPersonalizedRecommendations(
    viewerUserId: string,
    options: {
      category?: string;
      limit?: number;
      minScore?: number;
    } = {}
  ): Promise<Array<{ 
    recommendation: any; 
    tasteAlignment: TasteAlignmentScore 
  }>> {
    try {
      // Get all recommendations (with optional category filter)
      const recommendations = await this.getRecommendations(options.category);
      
      // Calculate taste alignment for each
      const scored = await Promise.all(
        recommendations.map(async (rec) => {
          const alignment = await this.calculateTasteAlignment(rec.id, viewerUserId);
          return { recommendation: rec, tasteAlignment: alignment };
        })
      );

      // Filter by minimum score if specified
      const filtered = options.minScore 
        ? scored.filter(item => item.tasteAlignment.finalScore >= options.minScore!)
        : scored;

      // Sort by taste alignment score (descending)
      const sorted = filtered.sort((a, b) => 
        b.tasteAlignment.finalScore - a.tasteAlignment.finalScore
      );

      // Limit results
      return options.limit ? sorted.slice(0, options.limit) : sorted;
    } catch (error) {
      console.error('❌ Failed to get personalized recommendations:', error);
      return [];
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Calculate taste preference match between viewer and recommendation
   */
  private calculateTastePreferenceMatch(
    viewerProfile: UserTasteProfile,
    recommendation: any
  ): {
    categoryMatch: number;
    cuisineMatch: number;
    priceRangeMatch: number;
    occasionMatch: number;
    totalScore: number;
  } {
    // Category match (0-1)
    const categoryMatch = viewerProfile.preferences.favoriteCategories.includes(
      recommendation.category
    ) ? 1.0 : 0.3;

    // Cuisine match (0-1)
    const cuisineMatch = viewerProfile.preferences.favoriteCuisines.includes(
      recommendation.cuisine
    ) ? 1.0 : 0.3;

    // Price range match (0-1)
    const priceRangeMatch = this.calculatePriceRangeMatch(
      viewerProfile.preferences.priceRange,
      recommendation.priceRange
    );

    // Occasion match (0-1)
    const occasionMatch = viewerProfile.preferences.preferredOccasions.includes(
      recommendation.occasion
    ) ? 1.0 : 0.5;

    // Total score (0-1)
    const totalScore = (
      categoryMatch * 0.35 +
      cuisineMatch * 0.35 +
      priceRangeMatch * 0.15 +
      occasionMatch * 0.15
    );

    return {
      categoryMatch,
      cuisineMatch,
      priceRangeMatch,
      occasionMatch,
      totalScore
    };
  }

  /**
   * Calculate contextual relevance (location, time, occasion)
   */
  private calculateContextualRelevance(
    viewerProfile: UserTasteProfile,
    recommendation: any
  ): {
    locationRelevance: number;
    timeRelevance: number;
    occasionRelevance: number;
    totalScore: number;
  } {
    // TODO: Implement actual location/time/occasion logic
    // For now, return moderate scores
    
    return {
      locationRelevance: 0.7,
      timeRelevance: 0.6,
      occasionRelevance: 0.8,
      totalScore: 0.7 // 0-1 scale
    };
  }

  /**
   * Calculate author credibility based on tier and validation rate
   */
  private calculateAuthorCredibility(authorTier: any): number {
    const tierWeights = {
      new: 0.3,
      established: 0.6,
      trusted: 1.0
    };

    const tierWeight = tierWeights[authorTier.currentTier] || 0.5;
    
    // Factor in validation rate if available
    const validationBonus = authorTier.validatedRecommendations > 5 ? 0.1 : 0;

    return Math.min(tierWeight + validationBonus, 1.0);
  }

  /**
   * Get social proof (who in your network liked this)
   */
  private async getSocialProof(
    recommendationId: string,
    viewerId: string,
    socialAlignment: SocialAlignment
  ): Promise<{
    directFriendsWhoLiked: string[];
    indirectFriendsWhoLiked: string[];
    totalSocialWeight: number;
  }> {
    try {
      // Get users who liked/saved this recommendation
      const engagement = await this.getRecommendationEngagement(recommendationId);
      
      // Filter to viewer's network
      const directFriendsWhoLiked = engagement.likers.filter((userId: string) =>
        socialAlignment.directConnections.includes(userId)
      );
      
      const indirectFriendsWhoLiked = engagement.likers.filter((userId: string) =>
        socialAlignment.indirectConnections.includes(userId)
      );

      // Calculate total social weight
      const totalSocialWeight = 
        (directFriendsWhoLiked.length * 0.75) +
        (indirectFriendsWhoLiked.length * 0.25);

      return {
        directFriendsWhoLiked,
        indirectFriendsWhoLiked,
        totalSocialWeight
      };
    } catch (error) {
      console.error('⚠️ Failed to get social proof:', error);
      return {
        directFriendsWhoLiked: [],
        indirectFriendsWhoLiked: [],
        totalSocialWeight: 0
      };
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    breakdown: any,
    socialProof: any,
    tasteMatch: any
  ): string {
    const parts: string[] = [];

    // Social component
    if (socialProof.directFriendsWhoLiked.length > 0) {
      parts.push(`${socialProof.directFriendsWhoLiked.length} of your friends liked this`);
    } else if (socialProof.indirectFriendsWhoLiked.length > 0) {
      parts.push(`${socialProof.indirectFriendsWhoLiked.length} in your network liked this`);
    }

    // Taste component
    if (tasteMatch.categoryMatch > 0.8) {
      parts.push("matches your favorite categories");
    }
    if (tasteMatch.cuisineMatch > 0.8) {
      parts.push("matches your preferred cuisine");
    }

    // Default message
    if (parts.length === 0) {
      return "Personalized recommendation based on your taste profile";
    }

    return parts.join(" • ");
  }

  /**
   * Extract preferences from interaction history
   */
  private extractPreferences(interactions: any[]): any {
    // Analyze interactions to extract preferences
    const categories = new Map<string, number>();
    const cuisines = new Map<string, number>();

    interactions.forEach(interaction => {
      if (interaction.category) {
        categories.set(
          interaction.category, 
          (categories.get(interaction.category) || 0) + 1
        );
      }
      if (interaction.cuisine) {
        cuisines.set(
          interaction.cuisine,
          (cuisines.get(interaction.cuisine) || 0) + 1
        );
      }
    });

    // Get top categories and cuisines
    const favoriteCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    const favoriteCuisines = Array.from(cuisines.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine);

    return {
      favoriteCategories,
      favoriteCuisines,
      priceRange: 'any',
      dietaryRestrictions: [],
      preferredOccasions: []
    };
  }

  /**
   * Summarize interaction history
   */
  private summarizeHistory(interactions: any[]): any {
    const categoryDist: { [key: string]: number } = {};
    const cuisineDist: { [key: string]: number } = {};

    interactions.forEach(interaction => {
      if (interaction.category) {
        categoryDist[interaction.category] = 
          (categoryDist[interaction.category] || 0) + 1;
      }
      if (interaction.cuisine) {
        cuisineDist[interaction.cuisine] = 
          (cuisineDist[interaction.cuisine] || 0) + 1;
      }
    });

    return {
      totalInteractions: interactions.length,
      categoryDistribution: categoryDist,
      cuisineDistribution: cuisineDist,
      avgPriceRange: 2
    };
  }

  /**
   * Find users with similar taste
   */
  private async findSimilarUsers(userId: string, preferences: any): Promise<string[]> {
    // TODO: Implement collaborative filtering
    return [];
  }

  /**
   * Calculate price range match
   */
  private calculatePriceRangeMatch(
    userPref: string,
    recPriceRange: string
  ): number {
    if (userPref === 'any') return 1.0;
    return userPref === recPriceRange ? 1.0 : 0.3;
  }

  /**
   * Find mutual connections between two users
   */
  private findMutualConnections(connections1: string[], connections2: string[]): string[] {
    return connections1.filter(user => connections2.includes(user));
  }

  // Placeholder methods for contract interactions
  private async getRecommendation(id: string): Promise<any> {
    return this.iotaService.getRecommendation(id);
  }

  private async getUserInteractionHistory(userId: string): Promise<any[]> {
    // TODO: Implement actual contract call
    return [];
  }

  private async getRecommendations(category?: string): Promise<any[]> {
    return this.iotaService.getRecommendations({ category });
  }

  private async getRecommendationEngagement(id: string): Promise<any> {
    // TODO: Implement actual contract call
    return { likers: [], savers: [], commenters: [] };
  }
}

export default TasteAlignmentService;