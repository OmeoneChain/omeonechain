// File path: /code/poc/frontend/src/services/TrustScoreService.ts

import { IOTAService } from './IOTAService';

export interface TrustWeight {
  userId: string;
  weight: number; // 0.75 for direct friends, 0.25 for friend-of-friends
  socialDistance: number; // 1 = direct, 2 = friend-of-friend
  trustScore: number;
}

export interface TrustScoreBreakdown {
  totalScore: number;
  baseScore: number;
  socialMultiplier: number;
  endorsements: {
    directFriends: number;
    friendsOfFriends: number;
    total: number;
  };
  provenance: string;
  weights: TrustWeight[];
}

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  };
  trustScore: number;
  contentHash: string;
  ipfsCid?: string;
  endorsements: number;
  saves: number;
  createdAt: string;
  socialProof: string;
  rewards: number;
}

export interface UserReputation {
  userId: string;
  trustScore: number;
  reputationScore: number;
  totalRecommendations: number;
  followers: number;
  following: number;
  stakingTier: 'Explorer' | 'Curator' | 'Passport' | 'Validator';
  stakedAmount: number;
  tokenBalance: number;
  votingPower: number;
  governanceParticipation: number;
}

class TrustScoreService {
  private iotaService: IOTAService;
  private apiBaseUrl: string;

  constructor() {
    this.iotaService = new IOTAService();
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
  }

  /**
   * Calculate Trust Score using OmeoneChain's social graph weighting
   * Formula: baseScore × socialMultiplier where socialMultiplier = Σ(trustWeight × endorsement)
   * Trust weights: 0.75 for direct friends (1-hop), 0.25 for friend-of-friends (2-hop)
   */
  async calculateTrustScore(
    recommendationId: string, 
    userAddress: string
  ): Promise<TrustScoreBreakdown> {
    try {
      // Get recommendation data from IOTA testnet
      const recommendation = await this.getRecommendation(recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Get social graph data for the requesting user
      const socialGraph = await this.getSocialGraph(userAddress);
      
      // Get endorsements with social context
      const endorsements = await this.getEndorsements(recommendationId);
      
      // Calculate trust weights based on social distance
      const weights = this.calculateTrustWeights(endorsements, socialGraph);
      
      // Calculate final trust score
      const baseScore = 5.0; // Base score when recommendation reaches threshold
      const socialMultiplier = Math.min(
        weights.reduce((sum, weight) => sum + weight.weight, 0),
        3.0 // Cap at 3x multiplier as per white paper
      );
      
      const totalScore = Math.min(baseScore * socialMultiplier, 10.0);
      
      // Generate human-readable provenance
      const directFriends = weights.filter(w => w.socialDistance === 1).length;
      const friendsOfFriends = weights.filter(w => w.socialDistance === 2).length;
      const provenance = `${endorsements.length} saves • ${directFriends} direct friends • ${friendsOfFriends} network`;

      return {
        totalScore: Number(totalScore.toFixed(1)),
        baseScore,
        socialMultiplier: Number(socialMultiplier.toFixed(2)),
        endorsements: {
          directFriends,
          friendsOfFriends,
          total: endorsements.length
        },
        provenance,
        weights
      };

    } catch (error) {
      console.error('Error calculating trust score:', error);
      throw new Error(`Failed to calculate trust score: ${error.message}`);
    }
  }

  /**
   * Calculate trust weights based on social distance and reputation
   */
  private calculateTrustWeights(
    endorsements: any[], 
    socialGraph: any
  ): TrustWeight[] {
    return endorsements.map(endorsement => {
      const socialDistance = this.getSocialDistance(
        endorsement.userId, 
        socialGraph
      );
      
      // Apply OmeoneChain's trust weighting formula
      let baseWeight = 0;
      if (socialDistance === 1) {
        baseWeight = 0.75; // Direct friends
      } else if (socialDistance === 2) {
        baseWeight = 0.25; // Friend-of-friends
      }
      // socialDistance > 2 gets 0 weight (not counted)

      // Factor in endorser's trust score (0-1 range)
      const trustScore = endorsement.userTrustScore || 0.5;
      const finalWeight = baseWeight * trustScore;

      return {
        userId: endorsement.userId,
        weight: Number(finalWeight.toFixed(3)),
        socialDistance,
        trustScore
      };
    });
  }

  /**
   * Get social distance between two users (1 = direct friend, 2 = friend-of-friend, etc.)
   */
  private getSocialDistance(targetUserId: string, socialGraph: any): number {
    // Mock implementation - in production, this would query your social graph contracts
    // For demo, randomly assign social distances
    const mockConnections = {
      'user_456': 1, // Direct friend
      'user_789': 2, // Friend-of-friend
      'user_321': 1, // Direct friend
      'user_654': 2, // Friend-of-friend
    };
    
    return mockConnections[targetUserId] || 999; // 999 = no connection
  }

  /**
   * Get user's reputation data from IOTA testnet
   */
  async getUserReputation(userAddress: string): Promise<UserReputation> {
    try {
      // First try to get from IOTA testnet
      const iotaData = await this.iotaService.getUserReputation(userAddress);
      
      if (iotaData) {
        return iotaData;
      }

      // Fallback to mock data for development
      return {
        userId: userAddress,
        trustScore: 8.6,
        reputationScore: 847,
        totalRecommendations: 23,
        followers: 156,
        following: 89,
        stakingTier: 'Curator',
        stakedAmount: 100,
        tokenBalance: 1250,
        votingPower: 2.3,
        governanceParticipation: 87
      };

    } catch (error) {
      console.error('Error getting user reputation:', error);
      throw error;
    }
  }

  /**
   * Get recommendations with live trust scores
   */
  async getRecommendations(
    userAddress: string,
    options: {
      category?: string;
      location?: string;
      limit?: number;
      sortBy?: 'trustScore' | 'recent' | 'popular';
    } = {}
  ): Promise<Recommendation[]> {
    try {
      // Get recommendations from IOTA testnet
      const recommendations = await this.iotaService.getRecommendations(options);
      
      // Calculate trust scores for each recommendation relative to user
      const enrichedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          const trustBreakdown = await this.calculateTrustScore(rec.id, userAddress);
          
          return {
            ...rec,
            trustScore: trustBreakdown.totalScore,
            socialProof: trustBreakdown.provenance,
            // Calculate rewards based on trust score and engagement
            rewards: Math.floor(trustBreakdown.totalScore * 2.3 + rec.endorsements * 0.5)
          };
        })
      );

      // Sort by trust score by default
      return enrichedRecommendations.sort((a, b) => b.trustScore - a.trustScore);

    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Return mock data for development
      return [
        {
          id: '1',
          title: 'Amazing pasta at Nonna\'s Kitchen',
          body: 'The handmade pasta here is incredible. Try the cacio e pepe!',
          author: 'user_456',
          category: 'Restaurant',
          location: {
            latitude: 40.7589,
            longitude: -73.9851,
            address: '123 Mulberry St',
            city: 'New York, NY'
          },
          trustScore: 9.2,
          contentHash: 'QmX7Y8Z...',
          endorsements: 8,
          saves: 12,
          createdAt: '2025-07-15T10:30:00Z',
          socialProof: '8 saves • 3 direct friends • 5 friends-of-friends',
          rewards: 15
        },
        {
          id: '2',
          title: 'Hidden gem coffee shop on 5th',
          body: 'Perfect for remote work with amazing single-origin beans.',
          author: 'user_789',
          category: 'Café',
          location: {
            latitude: 40.7505,
            longitude: -73.9934,
            address: '456 5th Ave',
            city: 'New York, NY'
          },
          trustScore: 8.7,
          contentHash: 'QmA1B2C...',
          endorsements: 12,
          saves: 18,
          createdAt: '2025-07-14T14:15:00Z',
          socialProof: '12 saves • 2 direct friends • 8 friends-of-friends',
          rewards: 22
        }
      ];
    }
  }

  /**
   * Create a new recommendation and store on IOTA testnet
   */
  async createRecommendation(
    recommendation: Omit<Recommendation, 'id' | 'trustScore' | 'endorsements' | 'saves' | 'createdAt' | 'socialProof' | 'rewards'>
  ): Promise<string> {
    try {
      // Generate unique ID
      const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store on IOTA testnet
      const transactionId = await this.iotaService.storeRecommendation({
        ...recommendation,
        id,
        trustScore: 0,
        endorsements: 0,
        saves: 0,
        createdAt: new Date().toISOString(),
        socialProof: '',
        rewards: 0
      });

      console.log('Recommendation stored on IOTA with transaction ID:', transactionId);
      return id;

    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw error;
    }
  }

  /**
   * Endorse a recommendation (upvote/save)
   */
  async endorseRecommendation(
    recommendationId: string,
    userAddress: string,
    endorsementType: 'save' | 'upvote' | 'share'
  ): Promise<void> {
    try {
      // Store endorsement on IOTA testnet
      await this.iotaService.storeEndorsement({
        recommendationId,
        userAddress,
        endorsementType,
        timestamp: new Date().toISOString()
      });

      // Trigger reward calculation for the recommendation author
      await this.calculateRewards(recommendationId, userAddress, endorsementType);

    } catch (error) {
      console.error('Error endorsing recommendation:', error);
      throw error;
    }
  }

  /**
   * Calculate and distribute token rewards based on trust score
   */
  private async calculateRewards(
    recommendationId: string,
    endorserAddress: string,
    endorsementType: string
  ): Promise<void> {
    try {
      // Get recommendation and calculate new trust score
      const trustBreakdown = await this.calculateTrustScore(recommendationId, endorserAddress);
      
      // Check if trust score meets reward threshold (≥0.25 as per white paper)
      if (trustBreakdown.totalScore >= 2.5) { // 0.25 on 0-1 scale = 2.5 on 0-10 scale
        
        // Calculate reward: 1 TOK × socialMultiplier (capped at 3×)
        const baseReward = 1.0;
        const rewardAmount = Math.min(baseReward * trustBreakdown.socialMultiplier, 3.0);
        
        console.log(`Reward calculated: ${rewardAmount} TOK for recommendation ${recommendationId}`);
        
        // In production, this would trigger token minting via smart contract
        // For now, we'll log the reward calculation
        await this.iotaService.recordReward({
          recommendationId,
          amount: rewardAmount,
          recipient: await this.getRecommendationAuthor(recommendationId),
          trigger: endorsementType,
          triggerUser: endorserAddress,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error calculating rewards:', error);
    }
  }

  // Helper methods
  private async getRecommendation(id: string): Promise<Recommendation | null> {
    return await this.iotaService.getRecommendation(id);
  }

  private async getSocialGraph(userAddress: string): Promise<any> {
    return await this.iotaService.getSocialGraph(userAddress);
  }

  private async getEndorsements(recommendationId: string): Promise<any[]> {
    return await this.iotaService.getEndorsements(recommendationId);
  }

  private async getRecommendationAuthor(recommendationId: string): Promise<string> {
    const rec = await this.getRecommendation(recommendationId);
    return rec?.author || '';
  }
}

export default TrustScoreService;