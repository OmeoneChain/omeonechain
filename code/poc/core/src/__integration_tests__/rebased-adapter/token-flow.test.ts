
import { setupTestEnvironment } from './setup';
import { testUsers } from '../test-utils/mock-data';
import { setupMockResponses } from '../test-utils/test-helpers';
import * as nock from 'nock';

// Increase test timeout for integration tests
jest.setTimeout(30000);

describe('Token Flow Integration Tests', () => {
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
  
  test('should transfer tokens between users', async () => {
    // Mock responses for token balance queries
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1/call')
      .reply(200, 100); // Initial balance of user1
    
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1/call')
      .reply(200, 0); // Initial balance of user2
    
    // Mock response for token transfer
    nock('http://localhost:8080')
      .post('/api/v1/transactions')
      .reply(200, {
        id: 'mock-tx-id-789',
        status: 'confirmed',
        objectId: 'token-tx-123',
        commitNumber: 12348,
        timestamp: new Date().toISOString()
      });
    
    // Mock responses for updated balances
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1/call')
      .reply(200, 50); // Updated balance of user1
    
    nock('http://localhost:8080')
      .post('/api/v1/contracts/0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1/call')
      .reply(200, 50); // Updated balance of user2
    
    // Get initial balances
    const initialUser1Balance = await testEnv.engines.token.getBalance(testUsers.user1.address);
    const initialUser2Balance = await testEnv.engines.token.getBalance(testUsers.user2.address);
    
    // Transfer tokens
    const amount = 50;
    const result = await testEnv.engines.token.transferTokens(
      testUsers.user1.address,
      testUsers.user2.address,
      amount
    );
    
    // Verify the transfer result
    expect(result).toBeDefined();
    expect(result.transactionId || result.id).toBeDefined();
    
    // Get updated balances
    const updatedUser1Balance = await testEnv.engines.token.getBalance(testUsers.user1.address);
    const updatedUser2Balance = await testEnv.engines.token.getBalance(testUsers.user2.address);
    
    // Verify balances changed correctly
    expect(updatedUser1Balance).toBe(initialUser1Balance - amount);
    expect(updatedUser2Balance).toBe(initialUser2Balance + amount);
  });
});
