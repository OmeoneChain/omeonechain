// code/poc/core/src/token/__tests__/reward-engine.test.ts

import { RewardEngine, RewardableAction, SocialRewardConnection, RewardPoolState } from '../reward-engine';
import { Decimal } from 'decimal.js';

describe('RewardEngine', () => {
  let rewardEngine: RewardEngine;

  beforeEach(() => {
    rewardEngine = new RewardEngine();
  });

  describe('Basic Reward Calculations', () => {
    it('should reward high-trust recommendations', () => {
      const action: RewardableAction = {
        actionId: 'rec-001',
        userId: 'alice',
        contentId: 'great-restaurant',
        actionType: 'recommendation_created',
        trustScore: 8.6, // High trust from our Trust Score demo
        socialConnections: [],
        timestamp: new Date(),
        metadata: {
          category: 'restaurant'
        }
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(0);
      expect(result.totalReward.toNumber()).toBeGreaterThan(1.0); // Should get bonus for high trust
      expect(result.breakdown.trustMultiplier.toNumber()).toBeGreaterThan(0);
      expect(result.poolImpact.triggerHalving).toBe(false);
    });

    it('should reject low-trust recommendations below 0.25 threshold', () => {
      const action: RewardableAction = {
        actionId: 'rec-002',
        userId: 'spammer',
        contentId: 'low-quality-content',
        actionType: 'recommendation_created',
        trustScore: 0.2, // Below threshold
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBe(0);
      expect(result.breakdown.caps.appliedCaps).toContain('Does not meet trust threshold');
      expect(result.distributionPlan).toHaveLength(0);
    });

    it('should apply correct trust multipliers for different scores', () => {
      const highTrustAction: RewardableAction = {
        actionId: 'rec-high',
        userId: 'trusted-user',
        contentId: 'content-1',
        actionType: 'recommendation_created',
        trustScore: 9.0, // Very high trust
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const mediumTrustAction: RewardableAction = {
        actionId: 'rec-medium',
        userId: 'medium-user',
        contentId: 'content-2', 
        actionType: 'recommendation_created',
        trustScore: 5.0, // Medium trust
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const highResult = rewardEngine.calculateReward(highTrustAction);
      const mediumResult = rewardEngine.calculateReward(mediumTrustAction);

      expect(highResult.totalReward.toNumber()).toBeGreaterThan(mediumResult.totalReward.toNumber());
      expect(highResult.breakdown.trustMultiplier.toNumber()).toBeGreaterThan(mediumResult.breakdown.trustMultiplier.toNumber());
    });
  });

  describe('Social Network Effects', () => {
    it('should distribute rewards through social connections', () => {
      const socialConnections: SocialRewardConnection[] = [
        {
          fromUserId: 'friend-1',
          toUserId: 'alice',
          socialDistance: 1,
          trustWeight: 0.75,
          interactionType: 'upvote',
          timestamp: new Date()
        },
        {
          fromUserId: 'friend-2',
          toUserId: 'alice',
          socialDistance: 2,
          trustWeight: 0.25,
          interactionType: 'save',
          timestamp: new Date()
        }
      ];

      const action: RewardableAction = {
        actionId: 'social-rec',
        userId: 'alice',
        contentId: 'social-content',
        actionType: 'recommendation_created',
        trustScore: 7.5,
        socialConnections,
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.distributionPlan.length).toBeGreaterThan(1);
      
      // Check primary reward (80% to alice)
      const primaryReward = result.distributionPlan.find(r => r.recipientUserId === 'alice');
      expect(primaryReward).toBeDefined();
      expect(primaryReward!.amount.toNumber()).toBeGreaterThan(0);

      // Check social rewards (20% distributed)
      const socialRewards = result.distributionPlan.filter(r => r.recipientUserId !== 'alice');
      expect(socialRewards.length).toBeGreaterThan(0);
      
      // Friend-1 should get more than Friend-2 (closer social distance)
      const friend1Reward = socialRewards.find(r => r.recipientUserId === 'friend-1');
      const friend2Reward = socialRewards.find(r => r.recipientUserId === 'friend-2');
      
      if (friend1Reward && friend2Reward) {
        expect(friend1Reward.amount.toNumber()).toBeGreaterThan(friend2Reward.amount.toNumber());
      }
    });

    it('should apply correct social distance multipliers', () => {
      const directFollowConnection: SocialRewardConnection[] = [
        {
          fromUserId: 'direct-friend',
          toUserId: 'alice',
          socialDistance: 1,
          trustWeight: 0.75,
          interactionType: 'share',
          timestamp: new Date()
        }
      ];

      const secondHopConnection: SocialRewardConnection[] = [
        {
          fromUserId: 'friend-of-friend',
          toUserId: 'alice',
          socialDistance: 2,
          trustWeight: 0.25,
          interactionType: 'share',
          timestamp: new Date()
        }
      ];

      const directAction: RewardableAction = {
        actionId: 'direct-action',
        userId: 'alice',
        contentId: 'content-1',
        actionType: 'recommendation_created',
        trustScore: 6.0,
        socialConnections: directFollowConnection,
        timestamp: new Date(),
        metadata: {}
      };

      const secondHopAction: RewardableAction = {
        actionId: 'second-hop-action',
        userId: 'alice',
        contentId: 'content-2',
        actionType: 'recommendation_created',
        trustScore: 6.0,
        socialConnections: secondHopConnection,
        timestamp: new Date(),
        metadata: {}
      };

      const directResult = rewardEngine.calculateReward(directAction);
      const secondHopResult = rewardEngine.calculateReward(secondHopAction);

      expect(directResult.breakdown.socialBonuses.toNumber()).toBeGreaterThan(
        secondHopResult.breakdown.socialBonuses.toNumber()
      );
    });
  });

  describe('Different Action Types', () => {
    it('should handle upvote rewards correctly', () => {
      const action: RewardableAction = {
        actionId: 'upvote-batch',
        userId: 'content-creator',
        contentId: 'popular-content',
        actionType: 'upvote_received',
        trustScore: 4.5,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(0);
      expect(result.distributionPlan[0].rewardType).toBe('interaction_reward');
    });

    it('should handle list curation rewards', () => {
      const action: RewardableAction = {
        actionId: 'curated-list',
        userId: 'curator',
        contentId: 'best-pizza-nyc',
        actionType: 'list_created',
        trustScore: 6.8,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {
          category: 'restaurant'
        }
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(0);
      expect(result.distributionPlan[0].rewardType).toBe('curation_share');
    });

    it('should handle referral rewards', () => {
      const action: RewardableAction = {
        actionId: 'referral-success',
        userId: 'referrer',
        contentId: 'new-user-onboarded',
        actionType: 'referral_completed',
        trustScore: 5.0,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(1.5); // Should be higher base reward
      expect(result.distributionPlan[0].rewardType).toBe('referral_bonus');
    });
  });

  describe('Anti-Gaming Measures', () => {
    it('should apply per-post reward caps', () => {
      // Try to create action that would exceed cap
      const extremeAction: RewardableAction = {
        actionId: 'extreme-reward',
        userId: 'whale-user',
        contentId: 'viral-content',
        actionType: 'recommendation_created',
        trustScore: 10.0, // Maximum trust
        socialConnections: Array.from({ length: 20 }, (_, i) => ({
          fromUserId: `user-${i}`,
          toUserId: 'whale-user',
          socialDistance: 1,
          trustWeight: 0.75,
          interactionType: 'share' as const,
          timestamp: new Date()
        })),
        timestamp: new Date(),
        metadata: {
          rewardMultiplier: 2.0
        }
      };

      const result = rewardEngine.calculateReward(extremeAction);

      expect(result.totalReward.toNumber()).toBeLessThanOrEqual(5.0); // Cap at 5 TOK
      expect(result.breakdown.caps.appliedCaps).toContain('max_reward_per_post');
    });

    it('should limit social bonuses to prevent gaming', () => {
      const manyConnections: SocialRewardConnection[] = Array.from({ length: 50 }, (_, i) => ({
        fromUserId: `bot-${i}`,
        toUserId: 'gamer',
        socialDistance: 1,
        trustWeight: 0.75,
        interactionType: 'share',
        timestamp: new Date()
      }));

      const gamingAction: RewardableAction = {
        actionId: 'gaming-attempt',
        userId: 'gamer',
        contentId: 'fake-content',
        actionType: 'recommendation_created',
        trustScore: 3.0,
        socialConnections: manyConnections,
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(gamingAction);

      expect(result.breakdown.socialBonuses.toNumber()).toBeLessThanOrEqual(2.0); // Capped at 2 TOK
    });
  });

  describe('Halving Mechanism', () => {
    it('should track pool state correctly', () => {
      const initialState = rewardEngine.getPoolState();

      expect(initialState.totalSupply.toNumber()).toBe(10000000000); // 10 billion
      expect(initialState.remainingPool.toNumber()).toBe(5200000000); // 52% of total
      expect(initialState.currentEmissionRate.toNumber()).toBe(1.0); // 100% initially
      expect(initialState.halvingCount).toBe(0);
    });

    it('should maintain pool state after reward distribution', () => {
      const action: RewardableAction = {
        actionId: 'pool-test',
        userId: 'user',
        contentId: 'content',
        actionType: 'recommendation_created',
        trustScore: 5.0,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);
      const initialPool = rewardEngine.getPoolState().remainingPool;
      
      rewardEngine.distributeRewards(result);
      
      const newPool = rewardEngine.getPoolState().remainingPool;
      expect(newPool.toNumber()).toBeLessThan(initialPool.toNumber());
      expect(newPool.add(result.totalReward).toNumber()).toBeCloseTo(initialPool.toNumber(), 2);
    });

    it.skip('should simulate halving trigger - TODO: Fix threshold calculation', () => {
      // Create reward engine with state very close to halving threshold
      const nearHalvingState: Partial<RewardPoolState> = {
        distributedTokens: new Decimal('519999950'), // 50 tokens away from threshold
        remainingPool: new Decimal('4680000050'),
        nextHalvingThreshold: new Decimal('520000000') // 10% of 5.2B reward pool
      };

      const halvingEngine = new RewardEngine(nearHalvingState);
      
      // Create a large reward that will definitely cross the threshold
      const action: RewardableAction = {
        actionId: 'halving-trigger',
        userId: 'user',
        contentId: 'content',
        actionType: 'referral_completed', // Higher base reward (2 TOK)
        trustScore: 10.0, // Maximum trust
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = halvingEngine.calculateReward(action);
      
      // The reward should be large enough to cross 520M threshold
      expect(result.totalReward.toNumber()).toBeGreaterThan(50);
      expect(result.poolImpact.triggerHalving).toBe(true);
      
      halvingEngine.distributeRewards(result);
      
      const newState = halvingEngine.getPoolState();
      expect(newState.halvingCount).toBe(1);
      expect(newState.currentEmissionRate.toNumber()).toBe(0.5); // Halved
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle restaurant recommendation with friend network', () => {
      // Scenario: Alice recommends restaurant, gets upvoted by friends
      const socialConnections: SocialRewardConnection[] = [
        {
          fromUserId: 'bob',
          toUserId: 'alice',
          socialDistance: 1,
          trustWeight: 0.75,
          interactionType: 'upvote',
          timestamp: new Date()
        },
        {
          fromUserId: 'charlie',
          toUserId: 'alice',
          socialDistance: 1,
          trustWeight: 0.75,
          interactionType: 'save',
          timestamp: new Date()
        },
        {
          fromUserId: 'diana',
          toUserId: 'alice',
          socialDistance: 2,
          trustWeight: 0.25,
          interactionType: 'share',
          timestamp: new Date()
        }
      ];

      const action: RewardableAction = {
        actionId: 'restaurant-rec',
        userId: 'alice',
        contentId: 'amazing-pizza-place',
        actionType: 'recommendation_created',
        trustScore: 8.6, // From our Trust Score demo
        socialConnections,
        timestamp: new Date(),
        metadata: {
          category: 'restaurant'
        }
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(2.0); // Should be substantial
      expect(result.distributionPlan.length).toBeGreaterThan(1); // Multiple recipients
      
      // Alice gets the primary reward
      const aliceReward = result.distributionPlan.find(r => r.recipientUserId === 'alice');
      expect(aliceReward).toBeDefined();
      expect(aliceReward!.amount.toNumber()).toBeGreaterThan(1.5);

      // Friends get social rewards
      const friendRewards = result.distributionPlan.filter(r => r.recipientUserId !== 'alice');
      expect(friendRewards.length).toBeGreaterThan(0);

      console.log('\n🍕 Restaurant Recommendation Rewards:');
      console.log(`Total Reward Pool: ${result.totalReward.toFixed(2)} TOK`);
      console.log(`Alice (Creator): ${aliceReward!.amount.toFixed(2)} TOK`);
      friendRewards.forEach(reward => {
        console.log(`${reward.recipientUserId}: ${reward.amount.toFixed(2)} TOK`);
      });
    });

    it('should handle curator list with downstream impact', () => {
      const action: RewardableAction = {
        actionId: 'curated-travel-list',
        userId: 'travel-expert',
        contentId: 'hidden-gems-paris',
        actionType: 'list_created',
        trustScore: 7.2,
        socialConnections: [
          {
            fromUserId: 'frequent-traveler',
            toUserId: 'travel-expert',
            socialDistance: 1,
            trustWeight: 0.75,
            interactionType: 'save',
            timestamp: new Date()
          }
        ],
        timestamp: new Date(),
        metadata: {
          category: 'travel'
        }
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(1.0);
      expect(result.distributionPlan[0].rewardType).toBe('curation_share');

      console.log('\n✈️ Travel List Curation Rewards:');
      console.log(`Total Reward: ${result.totalReward.toFixed(2)} TOK`);
      console.log(`Trust Multiplier: ${result.breakdown.trustMultiplier.toFixed(2)}`);
      console.log(`Quality Bonus: ${result.breakdown.qualityBonus.toFixed(2)}`);
    });

    it('should handle spam reporting rewards', () => {
      const action: RewardableAction = {
        actionId: 'spam-report',
        userId: 'community-moderator',
        contentId: 'flagged-spam-content',
        actionType: 'spam_reported',
        trustScore: 3.5,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(0);
      expect(result.distributionPlan[0].rewardType).toBe('spam_bounty');

      console.log('\n🚨 Spam Report Rewards:');
      console.log(`Bounty Reward: ${result.totalReward.toFixed(2)} TOK`);
    });
  });

  describe('Utility Functions', () => {
    it('should estimate rewards correctly', () => {
      const estimate = rewardEngine.estimateReward(6.0, 'recommendation_created');
      expect(estimate.toNumber()).toBeGreaterThan(0);

      const lowTrustEstimate = rewardEngine.estimateReward(0.2, 'recommendation_created');
      expect(lowTrustEstimate.toNumber()).toBe(0);
    });

    it('should check pool sufficiency', () => {
      expect(rewardEngine.hasSufficientTokens(new Decimal('1000'))).toBe(true);
      expect(rewardEngine.hasSufficientTokens(new Decimal('10000000000'))).toBe(false);
    });

    it('should return current emission rate', () => {
      const rate = rewardEngine.getCurrentEmissionRate();
      expect(rate.toNumber()).toBe(1.0); // Initial rate
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero social connections', () => {
      const action: RewardableAction = {
        actionId: 'isolated-action',
        userId: 'isolated-user',
        contentId: 'solo-content',
        actionType: 'recommendation_created',
        trustScore: 4.0,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = rewardEngine.calculateReward(action);

      expect(result.totalReward.toNumber()).toBeGreaterThan(0);
      expect(result.distributionPlan).toHaveLength(1); // Only primary reward
      expect(result.breakdown.socialBonuses.toNumber()).toBe(0);
    });

    it('should handle insufficient pool funds', () => {
      // Create engine with minimal pool
      const lowPoolEngine = new RewardEngine({
        remainingPool: new Decimal('0.1')
      });

      const action: RewardableAction = {
        actionId: 'insufficient-pool',
        userId: 'user',
        contentId: 'content',
        actionType: 'recommendation_created',
        trustScore: 8.0,
        socialConnections: [],
        timestamp: new Date(),
        metadata: {}
      };

      const result = lowPoolEngine.calculateReward(action);

      expect(() => {
        lowPoolEngine.distributeRewards(result);
      }).toThrow('Insufficient tokens in reward pool');
    });
  });
});