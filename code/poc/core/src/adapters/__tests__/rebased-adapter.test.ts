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
// Add these test suites to your existing rebased-adapter.test.ts file
// Place them after your existing test suites

describe('Move Contract Integration (Enhanced Features)', () => {
  // Enhanced config for Move contract testing
  const enhancedConfig = {
    ...testConfig,
    contractAddresses: {
      ...testConfig.contractAddresses,
      rewards: '0xrewards', // Add rewards contract
    },
    packageId: '0xpackage123',
    options: {
      ...testConfig.options,
      enableSponsorWallet: true,
    },
    sponsorWallet: {
      address: 'mock-sponsor-address',
      privateKey: 'mock-sponsor-key',
    }
  };

  beforeEach(() => {
    // Create enhanced adapter with Move contract support
    adapter = new RebasedAdapter(enhancedConfig);
    
    // Mock the enhanced Move contract methods
    const enhancedMockClient = {
      ...mockClient,
      api: {
        ...mockClient.api,
        post: jest.fn().mockResolvedValue({
          data: {
            success: true,
            result: { transaction_id: 'move_tx_123' },
            gas_used: 25,
            events: [],
          }
        })
      }
    };
    
    // @ts-ignore
    adapter.client = enhancedMockClient;
    // @ts-ignore
    adapter.isConnected = true;
  });

  describe('Token Operations', () => {
    test('createUserWallet() should create user wallet via Move contract', async () => {
      // Mock the callMoveFunction method
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { wallet_id: 'wallet_123' },
        gasUsed: 20,
      });

      const result = await adapter.createUserWallet('0x123456789abcdef');
      
      expect(result.success).toBe(true);
      expect(result.result?.wallet_id).toBe('wallet_123');
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'token',
        'createUserWallet',
        ['0x123456789abcdef']
      );
    });

    test('stakeTokens() should stake tokens with correct parameters', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { stake_id: 'stake_123' },
        gasUsed: 30,
      });

      const result = await adapter.stakeTokens(
        '0x123456789abcdef',
        100, // amount
        2,   // stake type (Curator)
        3    // lock period (3 months)
      );
      
      expect(result.success).toBe(true);
      expect(result.gasUsed).toBe(30);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'token',
        'stakeTokens',
        expect.arrayContaining([
          '0x123456789abcdef',
          '100',
          '2',
          '3',
          expect.any(String) // timestamp
        ])
      );
    });

    test('getUserBalance() should return formatted balance data', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: {
          liquid: '1000000000',      // 1000 TOK
          staked: '100000000',       // 100 TOK
          pending_rewards: '5000000', // 5 TOK
          lifetime_rewards: '50000000', // 50 TOK
        },
      });

      const balance = await adapter.getUserBalance('0x123456789abcdef');
      
      expect(balance.liquid).toBe(1000000000);
      expect(balance.staked).toBe(100000000);
      expect(balance.pendingRewards).toBe(5000000);
      expect(balance.lifetimeRewards).toBe(50000000);
    });

    test('getUserTrustScore() should return normalized trust score', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: '75', // 0.75 trust score (75/100)
      });

      const trustScore = await adapter.getUserTrustScore('0x123456789abcdef');
      expect(trustScore).toBe(0.75);
    });

    test('getUserReputationScore() should return reputation score', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: '850',
      });

      const reputationScore = await adapter.getUserReputationScore('0x123456789abcdef');
      expect(reputationScore).toBe(850);
    });
  });

  describe('Reward Distribution Operations', () => {
    test('submitRecommendationForReward() should submit action for reward', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { action_submitted: true },
      });

      const result = await adapter.submitRecommendationForReward(
        '0x123456789abcdef',
        'recommendation_123',
        1 // recommendation type
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'rewards',
        'submitActionForReward',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.rewards,
          '0x123456789abcdef',
          expect.any(Array), // stringToBytes result
          '1',
          expect.any(String) // timestamp
        ])
      );
    });

    test('addSocialEndorsement() should add endorsement with social distance', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { new_trust_score: 35 },
      });

      const result = await adapter.addSocialEndorsement(
        '0x987654321fedcba', // endorser
        'recommendation_123',
        1 // social distance (1 hop)
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'rewards',
        'addSocialEndorsement',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.rewards,
          '0x987654321fedcba',
          expect.any(Array), // stringToBytes result
          '1',
          expect.any(String) // timestamp
        ])
      );
    });

    test('checkRewardEligibility() should return eligibility info', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: {
          current_trust_score: '30', // 0.30
          endorsement_count: '3',
          potential_reward: '1500000', // 1.5 TOK
          is_eligible: true,
        },
      });

      const eligibility = await adapter.checkRewardEligibility('recommendation_123');
      
      expect(eligibility.trustScore).toBe(0.30);
      expect(eligibility.endorsements).toBe(3);
      expect(eligibility.potentialReward).toBe(1.5);
      expect(eligibility.isEligible).toBe(true);
    });

    test('claimRecommendationReward() should claim reward when eligible', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { reward_claimed: true },
      });

      const result = await adapter.claimRecommendationReward(
        '0x123456789abcdef',
        'recommendation_123'
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'rewards',
        'claimReward',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.rewards,
          enhancedConfig.contractAddresses.token,
          '0x123456789abcdef',
          expect.any(Array), // stringToBytes result
          expect.any(String) // timestamp
        ])
      );
    });

    test('distributeOnboardingReward() should distribute milestone rewards', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { milestone_completed: 2 },
      });

      const result = await adapter.distributeOnboardingReward(
        '0x123456789abcdef',
        2 // milestone 2 (5 recommendations)
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'rewards',
        'distributeOnboardingReward',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.token,
          '0x123456789abcdef',
          '2',
          expect.any(String)
        ])
      );
    });

    test('distributeLeaderboardReward() should distribute weekly rewards', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { position: 1 },
      });

      const result = await adapter.distributeLeaderboardReward(
        '0x123456789abcdef',
        1 // 1st place
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'rewards',
        'distributeLeaderboardReward',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.token,
          '0x123456789abcdef',
          '1',
          expect.any(String)
        ])
      );
    });
  });

  describe('Governance Operations', () => {
    test('createGovernanceProposal() should create proposal', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { proposal_id: 'prop_123' },
      });

      const result = await adapter.createGovernanceProposal(
        '0x123456789abcdef',
        'Improve Reward System',
        'Proposal to enhance the token reward distribution mechanism',
        'parameter_change'
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'governance',
        'createProposal',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.governance,
          '0x123456789abcdef',
          expect.any(Array), // title as bytes
          expect.any(Array), // description as bytes
          expect.any(Array), // type as bytes
          expect.any(String) // timestamp
        ])
      );
    });

    test('voteOnProposal() should submit vote', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: { vote_recorded: true },
      });

      const result = await adapter.voteOnProposal(
        '0x123456789abcdef',
        'proposal_456',
        true // support
      );
      
      expect(result.success).toBe(true);
      expect(adapter.callMoveFunction).toHaveBeenCalledWith(
        'governance',
        'vote',
        expect.arrayContaining([
          enhancedConfig.contractAddresses.governance,
          '0x123456789abcdef',
          expect.any(Array), // proposal ID as bytes
          'true',
          expect.any(String) // timestamp
        ])
      );
    });
  });

  describe('Transaction Routing', () => {
    test('submitTx() should route token transactions correctly', async () => {
      jest.spyOn(adapter as any, 'routeToMoveContract').mockResolvedValue({
        success: true,
        result: { transaction_id: 'routed_tx_123' },
        gasUsed: 30,
      });

      const tokenTx = {
        sender: '0x123456789abcdef',
        payload: {
          type: 'token' as const,
          action: 'stake',
          data: {
            amount: 100,
            stakeType: 1,
            lockPeriod: 1,
          },
        },
      };

      const result = await adapter.submitTx(tokenTx);
      
      expect(result.status).toBe('confirmed');
      expect(result.id).toBe('routed_tx_123');
      expect(adapter.routeToMoveContract).toHaveBeenCalledWith(tokenTx);
    });

    test('submitTx() should route reward transactions correctly', async () => {
      jest.spyOn(adapter as any, 'routeToMoveContract').mockResolvedValue({
        success: true,
        result: { transaction_id: 'reward_tx_123' },
      });

      const rewardTx = {
        sender: '0x123456789abcdef',
        payload: {
          type: 'reward' as const,
          action: 'submit_recommendation',
          data: {
            actionId: 'rec_123',
            actionType: 1,
          },
        },
      };

      const result = await adapter.submitTx(rewardTx);
      
      expect(result.status).toBe('confirmed');
      expect(result.id).toBe('reward_tx_123');
    });

    test('submitTx() should handle unknown transaction types', async () => {
      const unknownTx = {
        sender: '0x123456789abcdef',
        payload: {
          type: 'unknown' as any,
          action: 'unknown_action',
          data: {},
        },
      };

      const result = await adapter.submitTx(unknownTx);
      
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Unknown transaction type');
    });
  });

  describe('Helper Methods', () => {
    test('stringToBytes() should convert string to byte array', () => {
      const result = (adapter as any).stringToBytes('hello');
      expect(result).toEqual([104, 101, 108, 108, 111]);
    });

    test('getCurrentTimestamp() should return valid timestamp', () => {
      const timestamp = (adapter as any).getCurrentTimestamp();
      expect(typeof timestamp).toBe('string');
      expect(parseInt(timestamp)).toBeGreaterThan(0);
    });

    test('serializeArgsForMove() should serialize arguments correctly', () => {
      const args = [
        'test_string',
        123,
        true,
        ['array', 'item'],
        { key: 'value' },
      ];

      const serialized = (adapter as any).serializeArgsForMove(args);

      expect(serialized).toEqual([
        'test_string',
        '123',
        'true',
        ['array', 'item'],
        '{"key":"value"}',
      ]);
    });

    test('buildFullFunctionName() should build correct function names', () => {
      const fullName = (adapter as any).buildFullFunctionName('token', 'createUserWallet');
      expect(fullName).toBe('0xpackage123::omeone_token::create_user_wallet');
    });

    test('determineSender() should choose correct sender', () => {
      // Test with explicit sender
      let sender = (adapter as any).determineSender({ sender: '0xexplicit' });
      expect(sender).toBe('0xexplicit');

      // Test with sponsor wallet enabled
      sender = (adapter as any).determineSender({ useSponsorWallet: true });
      expect(sender).toBe('mock-sponsor-address');

      // Test with sponsor wallet disabled
      sender = (adapter as any).determineSender({ useSponsorWallet: false });
      expect(sender).toBe('mock-address');
    });
  });

  describe('System State Queries', () => {
    test('getCurrentRewardRate() should return current rate', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: '500', // Current reward rate after halving
      });

      const rewardRate = await adapter.getCurrentRewardRate();
      expect(rewardRate).toBe(500);
    });

    test('getTotalRewardsDistributed() should return total distributed', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: true,
        result: '1000000000', // 1B tokens distributed
      });

      const totalDistributed = await adapter.getTotalRewardsDistributed();
      expect(totalDistributed).toBe(1000000000);
    });

    test('getSystemStats() should return aggregated stats', async () => {
      jest.spyOn(adapter, 'getCurrentRewardRate').mockResolvedValue(500);
      jest.spyOn(adapter, 'getTotalRewardsDistributed').mockResolvedValue(1000000000);

      const stats = await adapter.getSystemStats();
      
      expect(stats.currentRewardRate).toBe(500);
      expect(stats.totalDistributed).toBe(1000000000);
      expect(stats.activeUsers).toBe(0); // Default value
    });
  });

  describe('Error Handling', () => {
    test('should handle Move function call failures gracefully', async () => {
      jest.spyOn(adapter as any, 'callMoveFunction').mockResolvedValue({
        success: false,
        error: 'Insufficient balance for staking',
      });

      const result = await adapter.stakeTokens('0x123456789abcdef', 1000000000, 1, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });

    test('should retry failed Move contract calls', async () => {
      let callCount = 0;
      jest.spyOn(adapter as any, 'routeToMoveContract').mockImplementation(() => {
        callCount++;
        if (callCount < 2) { // Fail once, then succeed
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          success: true,
          result: { transaction_id: 'retry_success_123' },
        });
      });

      const tokenTx = {
        sender: '0x123456789abcdef',
        payload: {
          type: 'token' as const,
          action: 'create_wallet',
          data: {},
        },
      };

      const result = await adapter.submitTx(tokenTx);

      expect(callCount).toBe(2); // Should retry once
      expect(result.status).toBe('confirmed');
      expect(result.id).toBe('retry_success_123');
    });
  });

  describe('Sponsor Wallet Integration', () => {
    test('should use sponsor wallet when enabled', async () => {
      const determineSenderSpy = jest.spyOn(adapter as any, 'determineSender');
      determineSenderSpy.mockReturnValue('mock-sponsor-address');
      
      await adapter.callMoveFunction(
        'token',
        'createUserWallet',
        ['0x123456789abcdef'],
        { useSponsorWallet: true }
      );

      expect(determineSenderSpy).toHaveBeenCalledWith({ useSponsorWallet: true });
    });

    test('should use user wallet when sponsor wallet disabled', async () => {
      const determineSenderSpy = jest.spyOn(adapter as any, 'determineSender');
      determineSenderSpy.mockReturnValue('mock-address');
      
      await adapter.callMoveFunction(
        'token',
        'createUserWallet',
        ['0x123456789abcdef'],
        { useSponsorWallet: false }
      );

      expect(determineSenderSpy).toHaveBeenCalledWith({ useSponsorWallet: false });
    });
  });

  describe('Integration with Existing System', () => {
    test('should maintain compatibility with existing transaction format', async () => {
      // Test that enhanced adapter works with existing transaction structure
      const legacyTx = {
        sender: 'test-sender',
        type: 'recommendation',
        action: 'create',
        data: {
          author: 'user1',
          serviceId: 'service1',
          category: 'restaurant',
          rating: 5
        }
      };

      const result = await adapter.submitTransaction(legacyTx);
      
      expect(result).toBeDefined();
      expect(result.transactionId).toBeDefined();
    });

    test('should work with existing query structure', async () => {
      const result = await adapter.queryObjectState('recommendation', 'rec_123');
      
      expect(result).toBeDefined();
      expect(result.objectType).toBe('recommendation');
    });
  });
});