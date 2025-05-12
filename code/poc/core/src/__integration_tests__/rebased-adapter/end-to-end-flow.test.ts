
import { setupTestEnvironment } from './setup';
import { testUsers, testRecommendations } from '../test-utils/mock-data';
import { setupMockResponses } from '../test-utils/test-helpers';
import * as nock from 'nock';

// Increase test timeout for end-to-end tests
jest.setTimeout(60000);

describe('End-to-End Flow Integration Tests', () => {
  let testEnv: any;
  
  beforeEach(async () => {
    // Set up mock responses
    setupMockResponses();
    
    // Create test environment
    testEnv = await setupTestEnvironment(true);
  });
  
  afterEach(async () => {
    await testEnv.cleanup();
    nock.cleanAll();
  });
  
  test('Complete recommendation and reward flow', async () => {
    // Set up necessary mock responses
    
    // Step 1: Create a recommendation
    const recommendationResult = await testEnv.engines.recommendation.createRecommendation(
      testRecommendations.rec1,
      testUsers.user1.address
    );
    
    const recId = recommendationResult.id || recommendationResult.objectId;
    
    // Step 2: User 2 upvotes the recommendation
    await testEnv.engines.recommendation.upvoteRecommendation(
      recId,
      testUsers.user2.address
    );
    
    // Step 3: Check that user 1 reputation increased
    const reputationAfterUpvote = await testEnv.engines.reputation.getUserReputation(
      testUsers.user1.id
    );
    
    // Step 4: Verify user 1 received token rewards
    const tokenBalanceAfterUpvote = await testEnv.engines.token.getBalance(
      testUsers.user1.address
    );
    
    // Assertions to verify the entire flow
    expect(recommendationResult).toBeDefined();
    expect(reputationAfterUpvote.reputationScore).toBeGreaterThan(0);
    expect(tokenBalanceAfterUpvote).toBeGreaterThan(0);
  });
});
