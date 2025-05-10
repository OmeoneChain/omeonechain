// code/poc/core/src/adapters/__tests__/rebased-adapter.test.ts

import { RebasedAdapter } from '../rebased-adapter';
import axios from 'axios';
import { Transaction, TransactionResult, StateQuery, EventFilter, Event } from '../../types/chain';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  })),
  get: jest.fn(),
  post: jest.fn()
}));

// Mock crypto for deterministic UUID generation
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('0123456789abcdef')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mockhash123456')
  })),
  randomUUID: jest.fn(() => 'mock-uuid-1234')
}));

// Mock IotaWallet
jest.mock('@iota/wallet', () => ({
  IotaWallet: jest.fn().mockImplementation(() => ({
    createAccount: jest.fn().mockResolvedValue({
      alias: 'OmeoneChain',
      addresses: jest.fn().mockResolvedValue([{ address: 'mock-wallet-address' }])
    }),
    getAccount: jest.fn().mockResolvedValue({
      alias: 'OmeoneChain',
      addresses: jest.fn().mockResolvedValue([{ address: 'mock-wallet-address' }]),
      prepareTransaction: jest.fn().mockResolvedValue({ id: 'mock-tx-id' }),
      signAndSubmitTransaction: jest.fn().mockResolvedValue({
        transactionId: 'mock-tx-id',
        objectId: 'mock-object-id',
        commitNumber: 123
      })
    })
  }))
}));

// Mock Ed25519Seed
jest.mock('@iota/crypto.js', () => ({
  Ed25519Seed: {
    fromMnemonic: jest.fn().mockReturnValue('mock-seed-bytes')
  }
}));

describe('RebasedAdapter', () => {
  let adapter: RebasedAdapter;
  let mockApiGet;
  let mockApiPost;
  
  // Common test data
  const testConfig = {
    network: 'testnet' as const,
    nodeUrl: 'https://api.testnet.rebased.iota.org',
    account: {
      address: 'mock-address',
      privateKey: 'mock-private-key',
    },
    contractAddresses: {
      recommendation: '0xrecommendation',
      reputation: '0xreputation',
      token: '0xtoken',
      governance: '0xgovernance',
      service: '0xservice',
    },
    options: {
      retryAttempts: 1, // Use 1 for faster tests
      timeoutMs: 100
    }
  };
  
  const mockNodeInfo = {
    version: '1.0.0',
    network: 'rebased-testnet',
    latestCommitNumber: 12345
  };
  
  // Set up mocks and adapter before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up axios mocks
    mockApiGet = jest.fn();
    mockApiPost = jest.fn();
    
    (axios.create as jest.Mock).mockReturnValue({
      get: mockApiGet,
      post: mockApiPost
    });
    
    // Create the adapter instance
    adapter = new RebasedAdapter(testConfig);
    
    // Mock client initialization with necessary methods
    const mockClient = {
      api: {
        get: mockApiGet,
        post: mockApiPost
      },
      getNodeInfo: jest.fn().mockResolvedValue(mockNodeInfo),
      getAccount: jest.fn().mockResolvedValue({ balance: 1000 }),
      submitTransaction: jest.fn().mockResolvedValue({ 
        id: 'mock-tx-id', 
        status: 'confirmed',
        objectId: 'mock-object-id',
        commitNumber: 123,
        timestamp: new Date().toISOString()
      }),
      getTransactionStatus: jest.fn().mockResolvedValue({ status: 'confirmed' }),
      queryContract: jest.fn().mockResolvedValue([{ id: 'item1', value: 'test' }]),
      watchEvents: jest.fn().mockReturnValue(() => {})
    };
    
    // @ts-ignore - Set client directly for testing
    adapter.client = mockClient;
    
    // @ts-ignore - Set connected state
    adapter.isConnected = true;
  });
  
  describe('Constructor', () => {
    test('should initialize with config object', () => {
      const adapter = new RebasedAdapter(testConfig);
      expect(adapter).toBeDefined();
      expect(axios.create).toHaveBeenCalled();
    });
    
    test('should initialize with legacy constructor', () => {
      const adapter = new RebasedAdapter('https://api.testnet.rebased.iota.org', 'api-key', 'test-seed');
      expect(adapter).toBeDefined();
      expect(axios.create).toHaveBeenCalled();
    });
  });
  
  describe('Connection Methods', () => {
    test('connect() should establish connection and update connected state', async () => {
      // @ts-ignore - Reset connected state
      adapter.isConnected = false;
      
      // @ts-ignore - Mock client method
      adapter.client.getNodeInfo.mockResolvedValue(mockNodeInfo);
      
      await adapter.connect();
      
      // @ts-ignore - Check internal state
      expect(adapter.isConnected).toBe(true);
      expect(adapter.client.getNodeInfo).toHaveBeenCalled();
    });
    
    test('connect() should throw if connection fails', async () => {
      // @ts-ignore - Reset connected state
      adapter.isConnected = false;
      
      // @ts-ignore - Mock client method to fail
      adapter.client.getNodeInfo.mockRejectedValue(new Error('Connection failed'));
      
      await expect(adapter.connect()).rejects.toThrow('Connection failed');
      
      // @ts-ignore - Check internal state
      expect(adapter.isConnected).toBe(false);
    });
    
    test('disconnect() should update connected state', async () => {
      await adapter.disconnect();
      
      // @ts-ignore - Check internal state
      expect(adapter.isConnected).toBe(false);
    });
    
    test('isConnectedToNode() should return connection state', () => {
      // @ts-ignore - Set connected state
      adapter.isConnected = true;
      expect(adapter.isConnectedToNode()).toBe(true);
      
      // @ts-ignore - Set connected state
      adapter.isConnected = false;
      expect(adapter.isConnectedToNode()).toBe(false);
    });
    
    test('getChainId() should return the chain ID', async () => {
      const chainId = await adapter.getChainId();
      expect(chainId).toBe('rebased-testnet');
    });
  });
  
  describe('Transaction Methods', () => {
    test('submitTx() should submit transaction and return result', async () => {
      const tx: Transaction = {
        sender: 'test-sender',
        payload: {
          type: 'recommendation',
          data: {
            author: 'user1',
            serviceId: 'service1',
            category: 'restaurant',
            rating: 5,
            location: { latitude: 40.7128, longitude: -74.006 }
          }
        }
      };
      
      const result = await adapter.submitTx(tx);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-tx-id');
      expect(result.status).toBe('confirmed');
      
      // @ts-ignore - Check client method call
      expect(adapter.client.submitTransaction).toHaveBeenCalled();
    });
    
    test('submitTx() should handle transaction failure', async () => {
      const tx: Transaction = {
        sender: 'test-sender',
        payload: {
          type: 'recommendation',
          data: { /* empty data */ }
        }
      };
      
      // @ts-ignore - Mock client method to fail
      adapter.client.submitTransaction.mockRejectedValue(new Error('Transaction failed'));
      
      const result = await adapter.submitTx(tx);
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
    
    test('submitTransaction() legacy method should work', async () => {
      const tx = {
        type: 'recommendation',
        action: 'create',
        sender: 'test-sender',
        data: {
          author: 'user1',
          serviceId: 'service1',
          category: 'restaurant',
          rating: 5
        }
      };
      
      const result = await adapter.submitTransaction(tx);
      
      expect(result).toBeDefined();
      expect(result.transactionId).toBe('mock-tx-id');
      expect(result.objectId).toBe('mock-object-id');
      
      // @ts-ignore - Check client method call
      expect(adapter.client.submitTransaction).toHaveBeenCalled();
    });
    
    test('estimateFee() should return a fee estimate', async () => {
      const tx: Transaction = {
        sender: 'test-sender',
        payload: {
          type: 'recommendation',
          data: {
            author: 'user1',
            serviceId: 'service1',
            category: 'restaurant',
            rating: 5
          }
        }
      };
      
      const fee = await adapter.estimateFee(tx);
      
      expect(fee).toBeGreaterThan(0);
    });
  });
  
  describe('Query Methods', () => {
    test('queryState() should query and return results', async () => {
      const query: StateQuery = {
        objectType: 'recommendation',
        filter: { category: 'restaurant' }
      };
      
      // @ts-ignore - Mock client method
      adapter.client.queryContract.mockResolvedValue([
        { id: 'rec1', author: 'user1', rating: 5 },
        { id: 'rec2', author: 'user2', rating: 4 }
      ]);
      
      const result = await adapter.queryState(query);
      
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      
      // @ts-ignore - Check client method call
      expect(adapter.client.queryContract).toHaveBeenCalled();
    });
    
    test('queryState() should handle pagination', async () => {
      const query: StateQuery = {
        objectType: 'recommendation',
        pagination: { offset: 0, limit: 10 }
      };
      
      // @ts-ignore - Mock client method
      adapter.client.queryContract.mockResolvedValue([
        { id: 'rec1', author: 'user1', rating: 5 },
        { id: 'rec2', author: 'user2', rating: 4 }
      ]);
      
      const result = await adapter.queryState(query);
      
      expect(result.pagination).toBeDefined();
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
      
      // @ts-ignore - Check client method call
      expect(adapter.client.queryContract).toHaveBeenCalled();
    });
    
    test('queryObjectState() legacy method should work', async () => {
      // @ts-ignore - Mock client method
      adapter.client.queryContract.mockResolvedValue([
        { id: 'rec1', author: 'user1', rating: 5, tangle: { commitNumber: 123 }, timestamp: new Date().toISOString() }
      ]);
      
      const result = await adapter.queryObjectState('recommendation', 'rec1');
      
      expect(result).toBeDefined();
      expect(result.objectId).toBe('rec1');
      expect(result.objectType).toBe('recommendation');
      
      // @ts-ignore - Check client method call
      expect(adapter.client.queryContract).toHaveBeenCalled();
    });
    
    test('queryObjects() legacy method should work', async () => {
      // @ts-ignore - Mock client method
      adapter.client.queryContract.mockResolvedValue([
        { id: 'rec1', author: 'user1', rating: 5, tangle: { commitNumber: 123 }, timestamp: new Date().toISOString() },
        { id: 'rec2', author: 'user2', rating: 4, tangle: { commitNumber: 124 }, timestamp: new Date().toISOString() }
      ]);
      
      const result = await adapter.queryObjects('recommendation', { category: 'restaurant' }, { limit: 10, offset: 0 });
      
      expect(result).toHaveLength(2);
      expect(result[0].objectId).toBe('rec1');
      
      // @ts-ignore - Check client method call
      expect(adapter.client.queryContract).toHaveBeenCalled();
    });
    
    test('getCurrentCommit() should return current commit number', async () => {
      const commitNumber = await adapter.getCurrentCommit();
      expect(commitNumber).toBe(12345);
    });
  });
  
  describe('Event Methods', () => {
    test('watchEvents() should return an AsyncIterator', async () => {
      const filter: EventFilter = {
        eventTypes: ['recommendation_created']
      };
      
      const iterator = await adapter.watchEvents(filter);
      
      expect(iterator).toBeDefined();
      expect(typeof iterator.next).toBe('function');
      
      // Clean up
      await iterator.return?.();
    });
    
    test('subscribeToEvents() legacy method should work', () => {
      const callback = jest.fn();
      const subscriptionId = adapter.subscribeToEvents('recommendation_created', callback);
      
      expect(subscriptionId).toBe('mock-uuid-1234');
      
      // @ts-ignore - Simulate event emission
      adapter.emitEvent({
        eventType: 'recommendation_created',
        data: { id: 'rec1', author: 'user1' }
      });
      
      // Check if callback was called
      expect(callback).toHaveBeenCalled();
    });
  });
  
  describe('Helper Methods', () => {
    test('getWalletAddress() should return wallet address', async () => {
      // @ts-ignore - Mock wallet
      adapter.wallet = {
        getAccount: jest.fn().mockResolvedValue({
          addresses: jest.fn().mockResolvedValue([{ address: 'mock-wallet-address' }])
        })
      };
      
      const address = await adapter.getWalletAddress();
      
      expect(address).toBe('mock-wallet-address');
    });
    
    test('callContractFunction() should call contract function', async () => {
      // @ts-ignore - Mock client method
      adapter.client.queryContract.mockResolvedValue({ result: 'success' });
      
      const result = await adapter.callContractFunction('0xcontract', 'test_function', ['arg1', 'arg2']);
      
      expect(result).toBeDefined();
      
      // @ts-ignore - Check client method call
      expect(adapter.client.queryContract).toHaveBeenCalledWith('0xcontract', 'test_function', ['arg1', 'arg2']);
    });
  });
  
  describe('Error Handling', () => {
    test('should throw when methods are called before connect', async () => {
      // @ts-ignore - Reset connected state
      adapter.isConnected = false;
      
      // Mock connect to succeed
      jest.spyOn(adapter, 'connect').mockResolvedValue();
      
      // Should auto-connect and not throw
      await expect(adapter.submitTx({
        sender: 'test-sender',
        payload: { type: 'test' }
      })).resolves.not.toThrow();
      
      // Verify connect was called
      expect(adapter.connect).toHaveBeenCalled();
    });
    
    test('should handle network errors gracefully', async () => {
      // @ts-ignore - Mock client method to fail consistently
      adapter.client.submitTransaction.mockRejectedValue(new Error('Network error'));
      
      const tx: Transaction = {
        sender: 'test-sender',
        payload: { type: 'test' }
      };
      
      const result = await adapter.submitTx(tx);
      
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Network error');
    });
  });
});
