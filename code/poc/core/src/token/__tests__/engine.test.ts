/**
 * Tests for the TokenEngine
 */

import { TokenEngine } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { TransactionType, TokenBalance } from '../../types/token';

describe('TokenEngine', () => {
  let engine: TokenEngine;
  let adapter: MockAdapter;
  
  beforeEach(async () => {
    // Create dependencies
    adapter = new MockAdapter({
      inMemory: true,
      chainId: 'test-chain-001'
    });
    
    // Connect adapter
    await adapter.connect();
    
    // Create engine
    engine = new TokenEngine(adapter, {
      chainId: 'test-chain-001',
      reserveAddress: 'SYSTEM',
      burnAddress: 'BURN',
      treasuryAddress: 'TREASURY',
      sponsorWallet: 'SPONSOR',
      feeSplit: {
        burnPercentage: 75,
        treasuryPercentage: 25
      }
    });
    
    // Initialize engine
    await engine.initialize();
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('should get token balance', async () => {
    // Mock adapter queryState response
    const mockBalance: TokenBalance = {
      userId: 'test-user',
      available: 100,
      staked: 50,
      pendingRewards: 0
    };
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [mockBalance],
      total: 1
    });
    
    // Get balance
    const balance = await engine.getTokenBalance('test-user');
    
    // Verify results
    expect(balance).toEqual(mockBalance);
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'token_balance',
      filter: {
        userId: 'test-user'
      }
    });
  });
  
  it('should return default balance if not found', async () => {
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [],
      total: 0
    });
    
    // Get balance for non-existent user
    const balance = await engine.getTokenBalance('new-user');
    
    // Verify results
    expect(balance).toEqual({
      userId: 'new-user',
      available: 0,
      staked: 0,
      pendingRewards: 0
    });
  });
  
  it('should create a transaction', async () => {
    // Mock balance check
    const balanceSpy = jest.spyOn(engine, 'getTokenBalance');
    balanceSpy.mockResolvedValue({
      userId: 'test-user',
      available: 100,
      staked: 0,
      pendingRewards: 0
    });
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Create transaction
    const transaction = await engine.createTransaction(
      'test-user',
      'recipient-user',
      50,
      TransactionType.TRANSFER,
      'test-ref'
    );
    
    // Verify results
    expect(transaction).toMatchObject({
      sender: 'test-user',
      recipient: 'recipient-user',
      amount: 50,
      type: TransactionType.TRANSFER,
      actionReference: 'test-ref',
      tangle: {
        objectId: 'obj-1',
        commitNumber: 1
      }
    });
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'token_transaction',
        action: 'transfer',
        data: expect.objectContaining({
          sender: 'test-user',
          recipient: 'recipient-user',
          amount: 50
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should throw error for insufficient balance', async () => {
    // Mock balance check
    const balanceSpy = jest.spyOn(engine, 'getTokenBalance');
    balanceSpy.mockResolvedValue({
      userId: 'test-user',
      available: 30,
      staked: 0,
      pendingRewards: 0
    });
    
    // Try to create transaction with insufficient balance
    await expect(
      engine.createTransaction(
        'test-user',
        'recipient-user',
        50,
        TransactionType.TRANSFER
      )
    ).rejects.toThrow('Insufficient balance: 30 < 50');
  });
  
  it('should issue recommendation reward', async () => {
    // Spy on estimateFee method
    const feeSpy = jest.spyOn(adapter, 'estimateFee');
    feeSpy.mockResolvedValue(0.05);
    
    // Spy on createTransaction method
    const txSpy = jest.spyOn(engine, 'createTransaction');
    txSpy.mockResolvedValue({
      transactionId: 'tx-1',
      sender: 'SYSTEM',
      recipient: 'test-user',
      amount: 2.95,
      timestamp: '2025-01-01T00:00:00Z',
      type: TransactionType.REWARD,
      actionReference: 'rec-1',
      tangle: {
        objectId: 'obj-1',
        commitNumber: 1
      }
    });
    
    // Issue reward
    const result = await engine.issueRecommendationReward(
      'rec-1',
      'test-user',
      0.75,
      1.0
    );
    
    // Verify results
    expect(result.calculation).toMatchObject({
      recommendationId: 'rec-1',
      authorId: 'test-user',
      baseReward: 1,
      qualityMultiplier: 3,
      reputationFactor: 1.0,
      baseFeeInMicroIOTA: 0.05,
      totalReward: 2.95
    });
    
    expect(result.transaction).toBeDefined();
    
    // Verify transaction creation
    expect(txSpy).toHaveBeenCalledWith(
      'SYSTEM',
      'test-user',
      2.95,
      TransactionType.REWARD,
      'rec-1'
    );
  });
  
  it('should throw error if trust score is below threshold', async () => {
    // Try to issue reward with low trust score
    await expect(
      engine.issueRecommendationReward(
        'rec-1',
        'test-user',
        0.2,
        1.0
      )
    ).rejects.toThrow('Trust score below minimum threshold: 0.2 < 0.25');
  });
  
  it('should issue upvote reward', async () => {
    // Spy on getRewardsIssuedForAction method
    const rewardsSpy = jest.spyOn(engine as any, 'getRewardsIssuedForAction');
    rewardsSpy.mockResolvedValue(0);
    
    // Spy on createTransaction method
    const txSpy = jest.spyOn(engine, 'createTransaction');
    txSpy.mockResolvedValue({
      transactionId: 'tx-1',
      sender: 'SYSTEM',
      recipient: 'test-user',
      amount: 1,
      timestamp: '2025-01-01T00:00:00Z',
      type: TransactionType.REWARD,
      actionReference: 'rec-1',
      tangle: {
        objectId: 'obj-1',
        commitNumber: 1
      }
    });
    
    // Issue upvote reward
    const result = await engine.issueUpvoteReward(
      'rec-1',
      'test-user',
      10
    );
    
    // Verify results
    expect(result).toBeDefined();
    
    // Verify transaction creation
    expect(txSpy).toHaveBeenCalledWith(
      'SYSTEM',
      'test-user',
      1,
      TransactionType.REWARD,
      'rec-1'
    );
  });
  
  it('should not issue upvote reward if not enough upvotes', async () => {
    // Issue upvote reward with insufficient upvotes
    const result = await engine.issueUpvoteReward(
      'rec-1',
      'test-user',
      5
    );
    
    // Verify no reward was issued
    expect(result).toBeNull();
  });
  
  it('should process service fee with burn/treasury split', async () => {
    // Spy on createTransaction method
    const txSpy = jest.spyOn(engine, 'createTransaction');
    txSpy.mockImplementation(async (sender, recipient, amount, type, reference) => {
      return {
        transactionId: `tx-${Math.random().toString(36).substring(2, 15)}`,
        sender,
        recipient,
        amount,
        timestamp: '2025-01-01T00:00:00Z',
        type,
        actionReference: reference,
        tangle: {
          objectId: 'obj-1',
          commitNumber: 1
        }
      };
    });
    
    // Process service fee
    const result = await engine.processServiceFee(
      100,
      'service-1'
    );
    
    // Verify burn transaction
    expect(result.burnTx).toMatchObject({
      sender: 'SYSTEM',
      recipient: 'BURN',
      amount: 75,
      type: TransactionType.BURN,
      actionReference: 'service-1'
    });
    
    // Verify treasury transaction
    expect(result.treasuryTx).toMatchObject({
      sender: 'SYSTEM',
      recipient: 'TREASURY',
      amount: 25,
      type: TransactionType.FEE,
      actionReference: 'service-1'
    });
    
    // Verify transaction creation calls
    expect(txSpy).toHaveBeenCalledTimes(2);
  });
  
  it('should stake tokens', async () => {
    // Mock balance check
    const balanceSpy = jest.spyOn(engine, 'getTokenBalance');
    balanceSpy.mockResolvedValue({
      userId: 'test-user',
      available: 100,
      staked: 0,
      pendingRewards: 0
    });
    
    // Spy on createTransaction method
    const txSpy = jest.spyOn(engine, 'createTransaction');
    txSpy.mockResolvedValue({
      transactionId: 'tx-1',
      sender: 'test-user',
      recipient: 'test-user',
      amount: 50,
      timestamp: '2025-01-01T00:00:00Z',
      type: TransactionType.STAKE,
      actionReference: expect.stringMatching(/stake:\d+:.+/),
      tangle: {
        objectId: 'obj-1',
        commitNumber: 1
      }
    });
    
    // Spy on adapter submitTx method for balance update
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    
    // Stake tokens
    const result = await engine.stakeTokens(
      'test-user',
      50,
      30 // 30 days
    );
    
    // Verify result
    expect(result).toMatchObject({
      transactionId: 'tx-1',
      sender: 'test-user',
      recipient: 'test-user',
      amount: 50,
      type: TransactionType.STAKE
    });
    
    // Verify balance update transaction
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: 'test-user',
        payload: expect.objectContaining({
          objectType: 'token_balance',
          action: 'update',
          data: expect.objectContaining({
            userId: 'test-user',
            available: 50, // 100 - 50
            staked: 50     // 0 + 50
          })
        })
      })
    );
  });
  
  it('should throw error when staking with insufficient balance', async () => {
    // Mock balance check
    const balanceSpy = jest.spyOn(engine, 'getTokenBalance');
    balanceSpy.mockResolvedValue({
      userId: 'test-user',
      available: 30,
      staked: 0,
      pendingRewards: 0
    });
    
    // Try to stake more than available
    await expect(
      engine.stakeTokens(
        'test-user',
        50,
        30
      )
    ).rejects.toThrow('Insufficient balance: 30 < 50');
  });
  
  it('should get user transactions', async () => {
    // Mock transactions
    const mockTransactions = [
      {
        transactionId: 'tx-1',
        sender: 'test-user',
        recipient: 'other-user',
        amount: 50,
        timestamp: '2025-01-01T00:00:00Z',
        type: TransactionType.TRANSFER,
        tangle: {
          objectId: 'obj-1',
          commitNumber: 1
        }
      },
      {
        transactionId: 'tx-2',
        sender: 'SYSTEM',
        recipient: 'test-user',
        amount: 10,
        timestamp: '2025-01-02T00:00:00Z',
        type: TransactionType.REWARD,
        actionReference: 'rec-1',
        tangle: {
          objectId: 'obj-2',
          commitNumber: 2
        }
      }
    ];
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: mockTransactions,
      total: 2,
      pagination: {
        offset: 0,
        limit: 20,
        hasMore: false
      }
    });
    
    // Get user transactions
    const result = await engine.getUserTransactions('test-user');
    
    // Verify results
    expect(result.transactions).toEqual(mockTransactions);
    expect(result.total).toBe(2);
    expect(result.pagination).toEqual({
      offset: 0,
      limit: 20,
      hasMore: false
    });
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'token_transaction',
      filter: {
        $or: [
          { sender: 'test-user' },
          { recipient: 'test-user' }
        ]
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit: 20
      }
    });
  });
});
