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

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default mock return values
    mockReputationEngine.getTrustScore.mockResolvedValue(0.75);
    mockTokenEngine.getBalance.mockResolvedValue(1000);
    mockTokenEngine.lockTokens.mockResolvedValue(true);
    mockTokenEngine.unlockTokens.mockResolvedValue(true);
    mockTokenEngine.burnTokens.mockResolvedValue(true);

    // Create mock adapters
    mockChainAdapter = new MockAdapter();
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

  afterEach(() => {
    // Clean up any async operations
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
    });

    test('should assign correct tiers', async () => {
      // Test Explorer tier
      const explorerStake = await governanceEngine.stakeForGovernance('user1', 25, 30);
      expect(explorerStake.tier).toBe(StakingTier.EXPLORER);

      // Test Curator tier
      const curatorStake = await governanceEngine.stakeForGovernance('user2', 100, 90);
      expect(curatorStake.tier).toBe(StakingTier.CURATOR);

      // Test Validator tier
      const validatorStake = await governanceEngine.stakeForGovernance('user3', 1000, 365);
      expect(validatorStake.tier).toBe(StakingTier.VALIDATOR_DELEGATE);
    });

      test('should reject staking with insufficient trust score for curator tier', async () => {
  mockReputationEngine.getTrustScore.mockResolvedValueOnce(0.35); // Between explorer (0.3) and curator (0.4)

  // This should fail because trust score 0.35 < curator requirement (0.4)
  await expect(
    governanceEngine.stakeForGovernance('mediumTrustUser', 100, 90)
  ).rejects.toThrow('Trust score 0.35 insufficient for curator tier');
});
// Add test to verify tier assignment logic
     test('should assign tiers based on combined token/duration/trust requirements', async () => {
  // High trust score should allow higher tiers
  mockReputationEngine.getTrustScore.mockResolvedValue(0.8);
  
  // Explorer tier: 25 tokens, 30 days, 0.3+ trust
  const explorerStake = await governanceEngine.stakeForGovernance('user1', 25, 30);
  expect(explorerStake.tier).toBe(StakingTier.EXPLORER);

  // Curator tier: 100 tokens, 90 days, 0.4+ trust  
  const curatorStake = await governanceEngine.stakeForGovernance('user2', 100, 90);
  expect(curatorStake.tier).toBe(StakingTier.CURATOR);

  // Passport tier: 500 tokens, 180 days, 0.5+ trust
  const passportStake = await governanceEngine.stakeForGovernance('user3', 500, 180);
  expect(passportStake.tier).toBe(StakingTier.PASSPORT);

  // Validator tier: 1000 tokens, 365 days, 0.6+ trust
  const validatorStake = await governanceEngine.stakeForGovernance('user4', 1000, 365);
  expect(validatorStake.tier).toBe(StakingTier.VALIDATOR_DELEGATE);
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
    });
  });
});
