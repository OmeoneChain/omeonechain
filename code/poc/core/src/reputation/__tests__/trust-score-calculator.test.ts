// code/poc/core/src/reputation/__tests__/trust-score-calculator.test.ts

import { TrustScoreCalculator, TrustScoreInput, SocialConnection, UserInteraction, ContentMetadata } from '../trust-score-calculator';

describe('TrustScoreCalculator', () => {
  let calculator: TrustScoreCalculator;

  beforeEach(() => {
    calculator = new TrustScoreCalculator();
  });

  describe('Basic Trust Score Calculation', () => {
    it('should give perfect score for own content', () => {
      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-author',
        socialConnections: [],
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian', 'downtown']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeGreaterThan(5.0);
      expect(result.breakdown.socialTrustWeight).toBe(1.0);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should apply direct follow weight (0.75) for 1-hop connections', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date('2024-01-01'),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        {
          userId: 'user-evaluator',
          contentId: 'content-1',
          interactionType: 'upvote',
          timestamp: new Date(),
          socialDistance: 1
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.breakdown.socialTrustWeight).toBeCloseTo(0.75, 2);
      expect(result.finalScore).toBeGreaterThan(4.0);
      expect(result.socialPath).toHaveLength(2);
      expect(result.socialPath[0].userId).toBe('user-evaluator');
      expect(result.socialPath[1].userId).toBe('user-author');
    });

    it('should apply second-hop weight (0.25) for 2-hop connections', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-intermediate',
          connectionType: 'follow',
          establishedAt: new Date('2024-01-01'),
          trustWeight: 1.0
        },
        {
          fromUserId: 'user-intermediate',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date('2024-01-01'),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        {
          userId: 'user-intermediate',
          contentId: 'content-1',
          interactionType: 'upvote',
          timestamp: new Date(),
          socialDistance: 2
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.breakdown.socialTrustWeight).toBeCloseTo(0.25, 2);
      expect(result.socialPath).toHaveLength(3);
      expect(result.socialPath[2].contributionWeight).toBeCloseTo(0.25, 2);
    });

    it('should return zero trust for users beyond 2-hop distance', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-hop1',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        },
        {
          fromUserId: 'user-hop1',
          toUserId: 'user-hop2',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        },
        {
          fromUserId: 'user-hop2',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.breakdown.socialTrustWeight).toBe(0);
      expect(result.finalScore).toBeLessThanOrEqual(2.0);
    });
  });

  describe('Quality Signals', () => {
    it('should weight different interaction types correctly', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        {
          userId: 'user1',
          contentId: 'content-1',
          interactionType: 'upvote',
          timestamp: new Date(),
          socialDistance: 1
        },
        {
          userId: 'user2',
          contentId: 'content-1',
          interactionType: 'save',
          timestamp: new Date(),
          socialDistance: 1
        },
        {
          userId: 'user3',
          contentId: 'content-1',
          interactionType: 'share',
          timestamp: new Date(),
          socialDistance: 1
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.breakdown.qualitySignals).toBeGreaterThan(0.8);
      expect(result.breakdown.diversityBonus).toBeGreaterThan(0.1);
    });

    it('should penalize downvotes', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        {
          userId: 'user1',
          contentId: 'content-1',
          interactionType: 'downvote',
          timestamp: new Date(),
          socialDistance: 1
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.breakdown.qualitySignals).toBeLessThan(0);
    });
  });

  describe('Recency Factor', () => {
    it('should give higher scores to recent content', () => {
      const recentContent = new Date();
      const oldContent = new Date();
      oldContent.setDate(oldContent.getDate() - 60); // 60 days ago

      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const inputRecent: TrustScoreInput = {
        targetContentId: 'content-recent',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-recent',
          authorId: 'user-author',
          createdAt: recentContent,
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const inputOld: TrustScoreInput = {
        targetContentId: 'content-old',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-old',
          authorId: 'user-author',
          createdAt: oldContent,
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const recentResult = calculator.calculateTrustScore(inputRecent);
      const oldResult = calculator.calculateTrustScore(inputOld);
      
      expect(recentResult.breakdown.recencyFactor).toBeGreaterThan(oldResult.breakdown.recencyFactor);
      expect(recentResult.finalScore).toBeGreaterThan(oldResult.finalScore);
    });
  });

  describe('Anti-Gaming Features', () => {
    it('should limit maximum trust score to 10.0', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'user-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      // Create many positive interactions to try to game the system
      const userInteractions: UserInteraction[] = [];
      for (let i = 0; i < 50; i++) {
        userInteractions.push({
          userId: `user-${i}`,
          contentId: 'content-1',
          interactionType: 'share',
          timestamp: new Date(),
          socialDistance: 1
        });
      }

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeLessThanOrEqual(10.0);
    });

    it('should require minimum threshold of 0.25 for rewards', () => {
      const lowTrustScore = 0.2;
      const mediumTrustScore = 0.3;
      
      expect(calculator.meetsTrustThreshold(lowTrustScore)).toBe(false);
      expect(calculator.meetsTrustThreshold(mediumTrustScore)).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle restaurant recommendation from friend', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'alice',
          toUserId: 'bob-chef',
          connectionType: 'follow',
          establishedAt: new Date('2024-01-01'),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        {
          userId: 'charlie',
          contentId: 'restaurant-xyz',
          interactionType: 'upvote',
          timestamp: new Date(),
          socialDistance: 1
        },
        {
          userId: 'diana',
          contentId: 'restaurant-xyz',
          interactionType: 'save',
          timestamp: new Date(),
          socialDistance: 1
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'restaurant-xyz',
        evaluatingUserId: 'alice',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'restaurant-xyz',
          authorId: 'bob-chef',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian', 'downtown', 'romantic']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeGreaterThan(3.0); // Should be trusted
      expect(calculator.getTrustCategory(result.finalScore)).toMatch(/(Trusted|Moderately Trusted)/);
      
      // Check social path shows connection
      expect(result.socialPath).toContainEqual(
        expect.objectContaining({
          userId: 'alice',
          distance: 0
        })
      );
    });

    it('should handle viral content with diverse endorsements', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-evaluator',
          toUserId: 'influencer',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        },
        {
          fromUserId: 'influencer',
          toUserId: 'content-author',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const userInteractions: UserInteraction[] = [
        // Direct followers
        {
          userId: 'fan1',
          contentId: 'viral-post',
          interactionType: 'share',
          timestamp: new Date(),
          socialDistance: 1
        },
        {
          userId: 'fan2',
          contentId: 'viral-post',
          interactionType: 'upvote',
          timestamp: new Date(),
          socialDistance: 1
        },
        // Second-hop endorsements
        {
          userId: 'friend-of-fan',
          contentId: 'viral-post',
          interactionType: 'save',
          timestamp: new Date(),
          socialDistance: 2
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'viral-post',
        evaluatingUserId: 'user-evaluator',
        socialConnections,
        userInteractions,
        contentMetadata: {
          contentId: 'viral-post',
          authorId: 'content-author',
          createdAt: new Date(),
          category: 'travel',
          tags: ['hidden-gem', 'budget-friendly']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeGreaterThan(2.0);
      expect(result.breakdown.diversityBonus).toBeGreaterThan(0.1);
      expect(result.confidence).toBeGreaterThan(0.25);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty social connections gracefully', () => {
      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-evaluator',
        socialConnections: [],
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'unknown-author',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.socialTrustWeight).toBe(0);
      expect(result.socialPath).toHaveLength(0);
    });

    it('should handle circular social connections', () => {
      const socialConnections: SocialConnection[] = [
        {
          fromUserId: 'user-a',
          toUserId: 'user-b',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        },
        {
          fromUserId: 'user-b',
          toUserId: 'user-c',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        },
        {
          fromUserId: 'user-c',
          toUserId: 'user-a',
          connectionType: 'follow',
          establishedAt: new Date(),
          trustWeight: 1.0
        }
      ];

      const input: TrustScoreInput = {
        targetContentId: 'content-1',
        evaluatingUserId: 'user-a',
        socialConnections,
        userInteractions: [],
        contentMetadata: {
          contentId: 'content-1',
          authorId: 'user-b',
          createdAt: new Date(),
          category: 'restaurant',
          tags: ['italian']
        }
      };

      const result = calculator.calculateTrustScore(input);
      
      expect(result.finalScore).toBeGreaterThan(0);
      expect(result.breakdown.socialTrustWeight).toBeCloseTo(0.75, 2);
    });
  });

  describe('Trust Categories', () => {
    it('should correctly categorize trust levels', () => {
      expect(calculator.getTrustCategory(9.0)).toBe('Highly Trusted');
      expect(calculator.getTrustCategory(7.0)).toBe('Trusted');
      expect(calculator.getTrustCategory(5.0)).toBe('Moderately Trusted');
      expect(calculator.getTrustCategory(3.0)).toBe('Low Trust');
      expect(calculator.getTrustCategory(1.0)).toBe('Untrusted');
    });
  });
});