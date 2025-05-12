
import { setupTestEnvironment } from './setup';
import { testUsers, testRecommendations } from '../test-utils/mock-data';
import { setupMockResponses, waitForCondition } from '../test-utils/test-helpers';
import * as nock from 'nock';

// Increase test timeout for integration tests
jest.setTimeout(30000);

describe('Recommendation Flow Integration Tests', () => {
  let testEnv: any;
  
  beforeEach(async () => {
    // Set up mock responses if using mocks
    setupMockResponses();
    
    // Create test environment
    testEnv = await setupTestEnvironment(true); // true = use mocks
  });
  
  afterEach(async () => {
    // Clean up after tests
    await testEnv.cleanup();
    nock.cleanAll();
  });
  
  test('should create a recommendation and retrieve it', async () => {
    // Mock response for submitting a recommendation
    nock('http://localhost:8080')
      .post('/api/v1/transactions')
      .reply(200, {
        id: 'mock-tx-id-123',
        status: 'confirmed',
        objectId: 'rec-123',
        commitNumber: 12346,
        timestamp: new Date().toISOString()
      });
    
    // Mock response for querying recommendations
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb/call')
      .reply(200, [
        {
          ...testRecommendations.rec1,
          id: 'rec-123',
          tangle: { commitNumber: 12346 },
          timestamp: new Date().toISOString()
        }
      ]);
    
    // Create a recommendation using the recommendation engine
    const recommendation = { ...testRecommendations.rec1 };
    const result = await testEnv.engines.recommendation.createRecommendation(
      recommendation,
      testUsers.user1.address
    );
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.transactionId || result.id).toBeDefined();
    
    // Query recommendations for the service
    const recommendations = await testEnv.engines.recommendation.getRecommendationsByService(
      testRecommendations.rec1.serviceId
    );
    
    // Verify the query result
    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].serviceId).toBe(testRecommendations.rec1.serviceId);
  });
  
  test('should upvote a recommendation and update its score', async () => {
    // Mock responses...
    // Mock submission transaction
    nock('http://localhost:8080')
      .post('/api/v1/transactions')
      .reply(200, {
        id: 'mock-tx-id-456',
        status: 'confirmed',
        objectId: 'rec-123',
        commitNumber: 12347,
        timestamp: new Date().toISOString()
      });
    
    // Mock recommendation query before upvote
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb/call')
      .reply(200, {
        id: 'rec-123',
        ...testRecommendations.rec1,
        upvotes: 0,
        downvotes: 0,
        tangle: { commitNumber: 12346 },
        timestamp: new Date().toISOString()
      });
    
    // Mock recommendation query after upvote
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb/call')
      .reply(200, {
        id: 'rec-123',
        ...testRecommendations.rec1,
        upvotes: 1,
        downvotes: 0,
        tangle: { commitNumber: 12347 },
        timestamp: new Date().toISOString()
      });
    
    // Upvote the recommendation
    const result = await testEnv.engines.recommendation.upvoteRecommendation(
      'rec-123',
      testUsers.user2.address
    );
    
    // Verify the result
    expect(result).toBeDefined();
    
    // Get the updated recommendation
    const updatedRecommendation = await testEnv.engines.recommendation.getRecommendation('rec-123');
    
    // Verify the upvote was counted
    expect(updatedRecommendation).toBeDefined();
    expect(updatedRecommendation.upvotes).toBe(1);
  });
});
