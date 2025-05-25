// src/governance/__tests__/engine.test.ts

import { GovernanceEngine, StakingTier, ProposalType, ProposalStatus, VoteType } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { IPFSStorageProvider } from '../../storage/ipfs-storage';

// Mock engines for testing
const mockReputationEngine = {
  getTrustScore: jest.fn(),
  calculateTrustScore: jest.fn()
};

const mockTokenEngine = {
  getBalance: jest.fn(),
  lockTokens: jest.fn(),
  unlockTokens: jest.fn(),
  burnTokens: jest.fn()
};

describe('GovernanceEngine', () => {
  let governanceEngine: GovernanceEngine;
  let mockChainAdapter: MockAdapter;
  let mockStorageProvider: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default mock return values
    mockReputationEngine.getTrustScore.mockResolvedValue(0.75);
    mockTokenEngine.getBalance.mockResolvedValue(1000);
    mockTokenEngine.lockTokens.mockResolvedValue(true);
    mockTokenEngine.unlockTokens.mockResolvedValue(true);
    mockTokenEngine.burnTokens.mockResolvedValue(true);

    // Create fresh MockAdapter instance and connect it
    mockChainAdapter = new MockAdapter();
    await mockChainAdapter.connect(); // Make sure it's connected!
    
    mockStorageProvider = {
      store: jest.fn().mockResolvedValue('mock-ipfs-hash'),
      retrieve: jest.fn().mockResolvedValue({ content: 'mock content' })
    };

    // Create governance engine
    governanceEngine = new GovernanceEngine(
      mockChainAdapter,
      mockStorageProvider,
      mockReputationEngine,
      mockTokenEngine
    );
  });

  afterEach(async () => {
    // Clean up connections
    if (mockChainAdapter) {
      await mockChainAdapter.disconnect();
    }
    jest.clearAllTimers();
  });

  describe('Staking System', () => {
    test('should stake tokens successfully', async () => {
      const userId = 'user123';
      const amount = 500;
      const lockDuration = 180;

      const stake = await governanceEngine.stakeForGovernance(userId, amount, lockDuration);

      expect(stake.userId).toBe(userId);
      expect(stake.amount).toBe(amount);
      expect(stake.tier).toBe(StakingTier.PASSPORT);
      expect(stake.isActive).toBe(true);
      expect(mockTokenEngine.lockTokens).toHaveBeenCalledWith(userId, amount, lockDuration);
      
      // Verify transaction was submitted
      const transactions = mockChainAdapter.getChainTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('governance_stake');
    });

    test('should assign correct tiers', async () => {
      // Test Explorer tier (25 tokens, 30 days, trust 0.75 > 0.3)
      const explorerStake = await governanceEngine.stakeForGovernance('user1', 25, 30);
      expect(explorerStake.tier).toBe(StakingTier.EXPLORER);

      // Test Curator tier (100 tokens, 90 days, trust 0.75 > 0.4)
      const curatorStake = await governanceEngine.stakeForGovernance('user2', 100, 90);
      expect(curatorStake.tier).toBe(StakingTier.CURATOR);

      // Test Passport tier (500 tokens, 180 days, trust 0.75 > 0.5)
      const passportStake = await governanceEngine.stakeForGovernance('user3', 500, 180);
      expect(passportStake.tier).toBe(StakingTier.PASSPORT);

      // Test Validator tier (1000 tokens, 365 days, trust 0.75 > 0.6)
      const validatorStake = await governanceEngine.stakeForGovernance('user4', 1000, 365);
      expect(validatorStake.tier).toBe(StakingTier.VALIDATOR_DELEGATE);
    });

    test('should reject staking with insufficient trust score', async () => {
      // Set trust score below explorer minimum (0.3)
      mockReputationEngine.getTrustScore.mockResolvedValueOnce(0.2);

      await expect(
        governanceEngine.stakeForGovernance('lowTrustUser', 100, 90)
      ).rejects.toThrow('Trust score 0.2 insufficient for explorer tier');
    });

    test('should reject staking with insufficient balance', async () => {
      mockTokenEngine.getBalance.mockResolvedValueOnce(50);

      await expect(
        governanceEngine.stakeForGovernance('poorUser', 100, 90)
      ).rejects.toThrow('Insufficient token balance for staking');
    });
  });

  describe('Voting Power Calculation', () => {
    beforeEach(async () => {
      await governanceEngine.stakeForGovernance('voter123', 400, 180);
    });

    test('should calculate voting power correctly', async () => {
      mockReputationEngine.getTrustScore.mockResolvedValue(0.8);

      const votingPower = await governanceEngine.calculateVotingPower('voter123');

      expect(votingPower).toBeGreaterThan(0);
      expect(votingPower).toBeLessThan(10000); // Reasonable upper bound
    });

    test('should return 0 for users without stakes', async () => {
      const votingPower = await governanceEngine.calculateVotingPower('unstaked-user');
      expect(votingPower).toBe(0);
    });
  });

  describe('Proposal Management', () => {
    beforeEach(async () => {
      await governanceEngine.stakeForGovernance('proposer123', 200, 90);
    });

    test('should create proposal successfully', async () => {
      const proposalData = {
        title: 'Test Proposal',
        description: 'A test proposal',
        type: ProposalType.PARAMETER_CHANGE,
        author: 'proposer123',
        authorReputationAtCreation: 0.75,
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        executionDelay: 7,
        requiredQuorum: 0.2,
        requiredMajority: 0.6,
        stakingRequirements: {
          minStakeToPropose: 100,
          minTrustScore: 0.4,
          requiredTier: StakingTier.CURATOR
        },
        executionParameters: {
          timelock: 7,
          vetoWindow: 3,
          requiresMultisig: false,
          multisigThreshold: 3
        },
        impact: 'medium' as const,
        tags: ['test']
      };

      const proposalId = await governanceEngine.createProposal(proposalData);

      expect(proposalId).toBeDefined();
      expect(proposalId).toMatch(/^prop_/);

      const proposal = await governanceEngine.getProposal(proposalId);
      expect(proposal).toBeDefined();
      expect(proposal!.status).toBe(ProposalStatus.DRAFT);
      
      // Check transactions
      const transactions = mockChainAdapter.getTransactionsByType('governance_proposal');
      expect(transactions.length).toBeGreaterThan(0);
    });

    test('should reject proposal from unqualified user', async () => {
      const proposalData = {
        title: 'Invalid Proposal',
        description: 'Should be rejected',
        type: ProposalType.PARAMETER_CHANGE,
        author: 'unqualified-user',
        authorReputationAtCreation: 0.75,
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        executionDelay: 7,
        requiredQuorum: 0.2,
        requiredMajority: 0.6,
        stakingRequirements: {
          minStakeToPropose: 100,
          minTrustScore: 0.4,
          requiredTier: StakingTier.CURATOR
        },
        executionParameters: {
          timelock: 7,
          vetoWindow: 3,
          requiresMultisig: false,
          multisigThreshold: 3
        },
        impact: 'medium' as const,
        tags: ['test']
      };

      await expect(
        governanceEngine.createProposal(proposalData)
      ).rejects.toThrow('Must have active stake to create proposals');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await governanceEngine.stakeForGovernance('user1', 100, 90);
      await governanceEngine.stakeForGovernance('user2', 200, 120);
    });

    test('should return governance statistics', async () => {
      const stats = await governanceEngine.getGovernanceStats();

      expect(stats.totalStaked).toBe(300);
      expect(stats.uniqueStakers).toBe(2);
      expect(stats.totalVotingPower).toBeGreaterThan(0);
      expect(stats.milestonesAchieved).toBe(0);
    });
  });

  describe('Milestone Tracking', () => {
    test('should initialize milestones', async () => {
      const milestones = await governanceEngine.checkMilestones();

      expect(milestones).toHaveLength(3);
      expect(milestones[0].name).toBe('Economic Stake');
      expect(milestones[1].name).toBe('Network Scale');
      expect(milestones[2].name).toBe('Ecosystem Maturity');
      
      // Should not achieve any milestones with small test data
      expect(milestones.every(m => !m.achieved)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete staking workflow', async () => {
      const userId = 'integration-user';
      
      // Stake tokens
      const stake = await governanceEngine.stakeForGovernance(userId, 1000, 365);
      expect(stake.tier).toBe(StakingTier.VALIDATOR_DELEGATE);
      
      // Check voting power
      const votingPower = await governanceEngine.getUserVotingPower(userId);
      expect(votingPower).toBeGreaterThan(0);
      
      // Verify transactions were recorded
      const stakeTransactions = mockChainAdapter.getTransactionsByType('governance_stake');
      expect(stakeTransactions).toHaveLength(1);
      
      // Check governance statistics
      const stats = await governanceEngine.getGovernanceStats();
      expect(stats.totalStaked).toBe(1000);
      expect(stats.uniqueStakers).toBe(1);
    });

    test('should handle transaction recording properly', async () => {
      // Clear any existing transactions
      mockChainAdapter.clearChainTransactions();
      
      // Perform multiple operations
      await governanceEngine.stakeForGovernance('user1', 500, 180);
      await governanceEngine.stakeForGovernance('user2', 300, 90);
      
      // Check all transactions were recorded
      const allTransactions = mockChainAdapter.getChainTransactions();
      expect(allTransactions).toHaveLength(2);
      
      const stakeTransactions = mockChainAdapter.getTransactionsByType('governance_stake');
      expect(stakeTransactions).toHaveLength(2);
    });
  });
});
