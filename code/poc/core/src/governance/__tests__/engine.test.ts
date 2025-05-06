/**
 * Tests for the GovernanceEngine
 */

import { GovernanceEngine, ProposalStatus, ProposalType } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { UserReputation } from '../../types/reputation';
import { TokenBalance } from '../../types/token';

describe('GovernanceEngine', () => {
  let engine: GovernanceEngine;
  let adapter: MockAdapter;
  
  beforeEach(async () => {
    // Spy on updateProposalStatus method for auto-implementation when approvals met
    const updateSpy = jest.spyOn(engine, 'updateProposalStatus');
    updateSpy.mockResolvedValue({
      ...mockProposal,
      status: ProposalStatus.IMPLEMENTED
    });
    
    // Approve proposal with multisig signer
    const result = await engine.approveProposal(
      'proposal-1',
      'multisig-1'
    );
    
    // Verify results
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'multisig-1',
      payload: expect.objectContaining({
        objectType: 'governance_proposal',
        action: 'approve',
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          currentApprovals: 1,
          approvedBy: ['multisig-1']
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
    
    // When approvals reach threshold, should auto-implement
    const approvedProposal = {
      ...mockProposal,
      currentApprovals: 1,
      approvedBy: ['multisig-1']
    };
    
    getSpy.mockResolvedValue(approvedProposal);
    
    // Approve with second multisig
    const finalResult = await engine.approveProposal(
      'proposal-1',
      'multisig-2'
    );
    
    // Should trigger updateProposalStatus to IMPLEMENTED
    expect(updateSpy).toHaveBeenCalledWith(
      'proposal-1',
      ProposalStatus.IMPLEMENTED,
      'multisig-2'
    );
  });
  
  it('should throw error if non-multisig tries to approve', async () => {
    // Mock proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      status: ProposalStatus.ACCEPTED,
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Try to approve with non-multisig
    await expect(
      engine.approveProposal(
        'proposal-1',
        'regular-user'
      )
    ).rejects.toThrow('Signer is not authorized for multisig approvals');
  });
  
  it('should get recent governance activity', async () => {
    // Mock proposals and votes
    const mockProposals = [
      {
        proposalId: 'proposal-1',
        title: 'Proposal 1',
        updatedAt: '2025-01-02T00:00:00Z'
      },
      {
        proposalId: 'proposal-2',
        title: 'Proposal 2',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ];
    
    const mockVotes = [
      {
        proposalId: 'proposal-1',
        voterId: 'voter-1',
        voteFor: true,
        timestamp: '2025-01-02T00:00:00Z'
      },
      {
        proposalId: 'proposal-1',
        voterId: 'voter-2',
        voteFor: false,
        timestamp: '2025-01-01T00:00:00Z'
      }
    ];
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    
    // First call for proposals
    querySpy.mockResolvedValueOnce({
      results: mockProposals,
      total: 2
    });
    
    // Second call for votes
    querySpy.mockResolvedValueOnce({
      results: mockVotes,
      total: 2
    });
    
    // Get recent activity
    const result = await engine.getRecentActivity(5);
    
    // Verify results
    expect(result.proposals).toEqual(mockProposals);
    expect(result.votes).toEqual(mockVotes);
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'governance_proposal',
      sort: {
        field: 'updatedAt',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit: 5
      }
    });
    
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'proposal_vote',
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit: 5
      }
    });
  });
  
  it('should calculate vote weight using geometric mean', async () => {
    // Mock reputation and balance
    const mockReputation = {
      reputationScore: 0.8
    };
    
    const mockBalance = {
      staked: 100
    };
    
    // Spy on getAuthorReputation method
    const getReputationSpy = jest.spyOn(engine as any, 'getAuthorReputation');
    getReputationSpy.mockResolvedValue(mockReputation);
    
    // Spy on getAuthorBalance method
    const getBalanceSpy = jest.spyOn(engine as any, 'getAuthorBalance');
    getBalanceSpy.mockResolvedValue(mockBalance);
    
    // Calculate weight
    const weight = await (engine as any).calculateVoteWeight('test-user');
    
    // Verify geometric mean calculation
    // √(reputation * (staked + 1)) = √(0.8 * 101) = √80.8 ≈ 8.99
    const expectedWeight = Math.min(Math.sqrt(0.8 * 101), 3); // Capped at 3
    expect(weight).toBeCloseTo(expectedWeight, 2);
  });
  
  it('should validate status transitions', async () => {
    // Test the private validateStatusTransition method
    const validateMethod = (engine as any).validateStatusTransition;
    
    // Create test proposal
    const proposal = {
      authorId: 'test-user',
      requiredApprovals: 2,
      currentApprovals: 1,
      approvedBy: ['multisig-1']
    };
    
    // Valid transitions
    expect(() => validateMethod(
      ProposalStatus.DRAFT,
      ProposalStatus.ACTIVE,
      'test-user',
      proposal
    )).not.toThrow();
    
    expect(() => validateMethod(
      ProposalStatus.ACTIVE,
      ProposalStatus.VOTING,
      'multisig-1',
      proposal
    )).not.toThrow();
    
    // Invalid transitions
    expect(() => validateMethod(
      ProposalStatus.DRAFT,
      ProposalStatus.VOTING,
      'test-user',
      proposal
    )).toThrow('Invalid status transition: draft -> voting');
    
    expect(() => validateMethod(
      ProposalStatus.IMPLEMENTED,
      ProposalStatus.ACTIVE,
      'test-user',
      proposal
    )).toThrow('Invalid status transition: implemented -> active');
    
    // Permission issues
    expect(() => validateMethod(
      ProposalStatus.ACCEPTED,
      ProposalStatus.IMPLEMENTED,
      'test-user', // Not multisig
      proposal
    )).toThrow('Only multisig signers can implement a proposal');
    
    // Not enough approvals
    const proposalWithLowApprovals = {
      ...proposal,
      requiredApprovals: 3,
      currentApprovals: 1
    };
    
    expect(() => validateMethod(
      ProposalStatus.ACCEPTED,
      ProposalStatus.IMPLEMENTED,
      'multisig-1',
      proposalWithLowApprovals
    )).toThrow('Not enough approvals: 1 < 3');
  });
});
 Create dependencies
    adapter = new MockAdapter({
      inMemory: true,
      chainId: 'test-chain-001'
    });
    
    // Connect adapter
    await adapter.connect();
    
    // Create engine
    engine = new GovernanceEngine(adapter, {
      chainId: 'test-chain-001',
      multisigAddresses: ['multisig-1', 'multisig-2', 'multisig-3'],
      sponsorWallet: 'SPONSOR',
      minimumProposalStake: 100,
      minimumProposalReputation: 0.4,
      voteWeightMethod: 'geometric'
    });
    
    // Initialize engine
    await engine.initialize();
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('should create a proposal', async () => {
    // Mock user reputation
    const mockReputation: UserReputation = {
      chainID: 'test-chain-001',
      userId: 'test-user',
      totalRecommendations: 10,
      upvotesReceived: 20,
      downvotesReceived: 2,
      reputationScore: 0.75,
      verificationLevel: 'verified',
      specializations: ['restaurant'],
      activeSince: '2025-01-01T00:00:00Z',
      tokenRewardsEarned: 100,
      followers: 5,
      following: 10,
      ledger: {
        objectID: 'obj-1',
        commitNumber: 1
      }
    };
    
    // Mock token balance
    const mockBalance: TokenBalance = {
      userId: 'test-user',
      available: 500,
      staked: 0,
      pendingRewards: 0
    };
    
    // Spy on getAuthorReputation method
    const getReputationSpy = jest.spyOn(engine as any, 'getAuthorReputation');
    getReputationSpy.mockResolvedValue(mockReputation);
    
    // Spy on getAuthorBalance method
    const getBalanceSpy = jest.spyOn(engine as any, 'getAuthorBalance');
    getBalanceSpy.mockResolvedValue(mockBalance);
    
    // Spy on stakeProposalTokens method
    const stakeSpy = jest.spyOn(engine as any, 'stakeProposalTokens');
    stakeSpy.mockResolvedValue(undefined);
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Create proposal
    const proposal = await engine.createProposal(
      'test-user',
      'Test Proposal',
      ProposalType.PARAMETER_CHANGE,
      'This is a test proposal',
      'Implementation details',
      {
        tags: ['test', 'parameter'],
        parameterChanges: [
          {
            name: 'minReputationScore',
            currentValue: 0.4,
            proposedValue: 0.3
          }
        ],
        votingPeriod: 14,
        passThreshold: 70
      }
    );
    
    // Verify results
    expect(proposal).toMatchObject({
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      implementation: 'Implementation details',
      status: ProposalStatus.DRAFT,
      stakedAmount: 100,
      tags: ['test', 'parameter'],
      parameterChanges: [
        {
          name: 'minReputationScore',
          currentValue: 0.4,
          proposedValue: 0.3
        }
      ],
      passThreshold: 70,
      votesFor: 0,
      votesAgainst: 0,
      voterCount: 0,
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    });
    
    // Verify votingStartTime and votingEndTime
    expect(proposal.votingStartTime).toBeDefined();
    expect(proposal.votingEndTime).toBeDefined();
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'governance_proposal',
        action: 'create',
        data: expect.anything()
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
    
    // Verify token staking
    expect(stakeSpy).toHaveBeenCalledWith('test-user', proposal.proposalId, 100);
  });
  
  it('should throw error if reputation is too low', async () => {
    // Mock low reputation
    const mockReputation: UserReputation = {
      chainID: 'test-chain-001',
      userId: 'test-user',
      totalRecommendations: 1,
      upvotesReceived: 2,
      downvotesReceived: 1,
      reputationScore: 0.2, // Below minimum
      verificationLevel: 'basic',
      specializations: [],
      activeSince: '2025-01-01T00:00:00Z',
      tokenRewardsEarned: 10,
      followers: 1,
      following: 2,
      ledger: {
        objectID: 'obj-1',
        commitNumber: 1
      }
    };
    
    // Spy on getAuthorReputation method
    const getReputationSpy = jest.spyOn(engine as any, 'getAuthorReputation');
    getReputationSpy.mockResolvedValue(mockReputation);
    
    // Try to create proposal with low reputation
    await expect(
      engine.createProposal(
        'test-user',
        'Test Proposal',
        ProposalType.PARAMETER_CHANGE,
        'This is a test proposal'
      )
    ).rejects.toThrow('Insufficient reputation to create proposal: 0.2 < 0.4');
  });
  
  it('should throw error if token balance is too low', async () => {
    // Mock good reputation
    const mockReputation: UserReputation = {
      chainID: 'test-chain-001',
      userId: 'test-user',
      totalRecommendations: 10,
      upvotesReceived: 20,
      downvotesReceived: 2,
      reputationScore: 0.75,
      verificationLevel: 'verified',
      specializations: ['restaurant'],
      activeSince: '2025-01-01T00:00:00Z',
      tokenRewardsEarned: 100,
      followers: 5,
      following: 10,
      ledger: {
        objectID: 'obj-1',
        commitNumber: 1
      }
    };
    
    // Mock low balance
    const mockBalance: TokenBalance = {
      userId: 'test-user',
      available: 50, // Below minimum
      staked: 0,
      pendingRewards: 0
    };
    
    // Spy on getAuthorReputation method
    const getReputationSpy = jest.spyOn(engine as any, 'getAuthorReputation');
    getReputationSpy.mockResolvedValue(mockReputation);
    
    // Spy on getAuthorBalance method
    const getBalanceSpy = jest.spyOn(engine as any, 'getAuthorBalance');
    getBalanceSpy.mockResolvedValue(mockBalance);
    
    // Try to create proposal with low balance
    await expect(
      engine.createProposal(
        'test-user',
        'Test Proposal',
        ProposalType.PARAMETER_CHANGE,
        'This is a test proposal'
      )
    ).rejects.toThrow('Insufficient token balance to create proposal: 50 < 100');
  });
  
  it('should get a proposal by ID', async () => {
    // Mock proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.DRAFT,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votesFor: 0,
      votesAgainst: 0,
      voterCount: 0,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [mockProposal],
      total: 1
    });
    
    // Get proposal
    const proposal = await engine.getProposalById('proposal-1');
    
    // Verify results
    expect(proposal).toEqual(mockProposal);
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'governance_proposal',
      filter: {
        proposalId: 'proposal-1'
      }
    });
  });
  
  it('should throw error if proposal not found', async () => {
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [],
      total: 0
    });
    
    // Try to get non-existent proposal
    await expect(engine.getProposalById('non-existent')).rejects.toThrow(
      'Proposal not found: non-existent'
    );
  });
  
  it('should query proposals', async () => {
    // Mock proposals
    const mockProposals = [
      {
        proposalId: 'proposal-1',
        title: 'Proposal 1',
        authorId: 'user-1',
        type: ProposalType.PARAMETER_CHANGE,
        description: 'Description 1',
        status: ProposalStatus.VOTING,
        stakedAmount: 100,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
        votesFor: 10,
        votesAgainst: 5,
        voterCount: 15,
        passThreshold: 60,
        tags: ['test'],
        requiredApprovals: 2,
        currentApprovals: 0,
        approvedBy: []
      },
      {
        proposalId: 'proposal-2',
        title: 'Proposal 2',
        authorId: 'user-2',
        type: ProposalType.FEATURE_REQUEST,
        description: 'Description 2',
        status: ProposalStatus.DRAFT,
        stakedAmount: 150,
        createdAt: '2025-01-03T00:00:00Z',
        updatedAt: '2025-01-03T00:00:00Z',
        votesFor: 0,
        votesAgainst: 0,
        voterCount: 0,
        passThreshold: 60,
        tags: ['feature'],
        requiredApprovals: 2,
        currentApprovals: 0,
        approvedBy: []
      }
    ];
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: mockProposals,
      total: 2,
      pagination: {
        offset: 0,
        limit: 20,
        hasMore: false
      }
    });
    
    // Query proposals
    const result = await engine.queryProposals(
      {
        type: ProposalType.PARAMETER_CHANGE
      },
      { offset: 0, limit: 20 }
    );
    
    // Verify results
    expect(result.proposals).toEqual(mockProposals);
    expect(result.total).toBe(2);
    expect(result.pagination).toEqual({
      offset: 0,
      limit: 20,
      hasMore: false
    });
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'governance_proposal',
      filter: {
        type: ProposalType.PARAMETER_CHANGE
      },
      sort: {
        field: 'updatedAt',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit: 20
      }
    });
  });
  
  it('should update proposal status', async () => {
    // Mock proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.DRAFT,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votesFor: 0,
      votesAgainst: 0,
      voterCount: 0,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on validateStatusTransition method
    const validateSpy = jest.spyOn(engine as any, 'validateStatusTransition');
    validateSpy.mockImplementation(() => undefined);
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Update proposal status
    const result = await engine.updateProposalStatus(
      'proposal-1',
      ProposalStatus.ACTIVE,
      'test-user'
    );
    
    // Verify results
    expect(result).toMatchObject({
      ...mockProposal,
      status: ProposalStatus.ACTIVE,
      updatedAt: expect.any(String)
    });
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'governance_proposal',
        action: 'update',
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          status: ProposalStatus.ACTIVE
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should add implementation time when accepting proposal', async () => {
    // Mock proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.VOTING,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votesFor: 80,
      votesAgainst: 20,
      voterCount: 100,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on validateStatusTransition method
    const validateSpy = jest.spyOn(engine as any, 'validateStatusTransition');
    validateSpy.mockImplementation(() => undefined);
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Update proposal status to ACCEPTED
    const result = await engine.updateProposalStatus(
      'proposal-1',
      ProposalStatus.ACCEPTED,
      'multisig-1'
    );
    
    // Verify implementation time was added
    expect(result.implementationTime).toBeDefined();
    
    // Implementation time should be 3 days later
    const implementationDate = new Date(result.implementationTime!);
    const now = new Date();
    const daysDiff = Math.round((implementationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysDiff).toBe(3);
  });
  
  it('should vote on a proposal', async () => {
    // Mock voting proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.VOTING,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votingStartTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      votingEndTime: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      votesFor: 10,
      votesAgainst: 5,
      voterCount: 15,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on getUserVote method
    const getVoteSpy = jest.spyOn(engine, 'getUserVote');
    getVoteSpy.mockResolvedValue(null); // No existing vote
    
    // Spy on calculateVoteWeight method
    const weightSpy = jest.spyOn(engine as any, 'calculateVoteWeight');
    weightSpy.mockResolvedValue(2.5); // Vote weight
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Vote on proposal
    const result = await engine.voteOnProposal(
      'proposal-1',
      'voter-1',
      true, // Vote for
      'Great proposal!'
    );
    
    // Verify vote
    expect(result.vote).toMatchObject({
      proposalId: 'proposal-1',
      voterId: 'voter-1',
      voteFor: true,
      weight: 2.5,
      comment: 'Great proposal!'
    });
    
    // Verify updated proposal
    expect(result.proposal).toMatchObject({
      ...mockProposal,
      votesFor: 12.5, // 10 + 2.5
      votesAgainst: 5,
      voterCount: 16
    });
    
    // Verify vote submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'voter-1',
      payload: expect.objectContaining({
        objectType: 'proposal_vote',
        action: 'vote',
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          voterId: 'voter-1',
          voteFor: true
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
    
    // Verify proposal update
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'SPONSOR',
      payload: expect.objectContaining({
        objectType: 'governance_proposal',
        action: 'update',
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          votesFor: 12.5,
          voterCount: 16
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should throw error if voting has not started', async () => {
    // Mock proposal with future voting start
    const mockProposal = {
      proposalId: 'proposal-1',
      status: ProposalStatus.VOTING,
      votingStartTime: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      votingEndTime: new Date(Date.now() + 172800000).toISOString() // 2 days from now
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Try to vote before voting starts
    await expect(
      engine.voteOnProposal(
        'proposal-1',
        'voter-1',
        true
      )
    ).rejects.toThrow(`Voting has not started yet. Starts at: ${mockProposal.votingStartTime}`);
  });
  
  it('should throw error if voting has ended', async () => {
    // Mock proposal with past voting end
    const mockProposal = {
      proposalId: 'proposal-1',
      status: ProposalStatus.VOTING,
      votingStartTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      votingEndTime: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Try to vote after voting ends
    await expect(
      engine.voteOnProposal(
        'proposal-1',
        'voter-1',
        true
      )
    ).rejects.toThrow(`Voting has ended. Ended at: ${mockProposal.votingEndTime}`);
  });
  
  it('should check proposal voting results', async () => {
    // Mock proposal with ended voting
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.VOTING,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votingStartTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      votingEndTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      votesFor: 70,
      votesAgainst: 30,
      voterCount: 100,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on getTotalStake method
    const stakeSpy = jest.spyOn(engine as any, 'getTotalStake');
    stakeSpy.mockResolvedValue(1000); // Total stake
    
    // Spy on updateProposalStatus method
    const updateSpy = jest.spyOn(engine, 'updateProposalStatus');
    updateSpy.mockResolvedValue({
      ...mockProposal,
      status: ProposalStatus.ACCEPTED
    });
    
    // Check voting results
    const result = await engine.checkProposalVotingResults(
      'proposal-1',
      'checker-1'
    );
    
    // Verify status update call
    expect(updateSpy).toHaveBeenCalledWith(
      'proposal-1',
      ProposalStatus.ACCEPTED,
      'checker-1'
    );
    
    // Verify result
    expect(result.status).toBe(ProposalStatus.ACCEPTED);
  });
  
  it('should reject if quorum not met', async () => {
    // Mock proposal with low participation
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.VOTING,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      votingStartTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      votingEndTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      votesFor: 8,
      votesAgainst: 2,
      voterCount: 10,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on getTotalStake method
    const stakeSpy = jest.spyOn(engine as any, 'getTotalStake');
    stakeSpy.mockResolvedValue(1000); // Total stake = 1000
    // Participation = 10/1000 = 1% (below 10% quorum)
    
    // Spy on updateProposalStatus method
    const updateSpy = jest.spyOn(engine, 'updateProposalStatus');
    updateSpy.mockResolvedValue({
      ...mockProposal,
      status: ProposalStatus.REJECTED
    });
    
    // Check voting results
    const result = await engine.checkProposalVotingResults(
      'proposal-1',
      'checker-1'
    );
    
    // Verify status update call
    expect(updateSpy).toHaveBeenCalledWith(
      'proposal-1',
      ProposalStatus.REJECTED,
      'checker-1'
    );
    
    // Verify result
    expect(result.status).toBe(ProposalStatus.REJECTED);
  });
  
  it('should approve a proposal with multisig', async () => {
    // Mock accepted proposal
    const mockProposal = {
      proposalId: 'proposal-1',
      title: 'Test Proposal',
      authorId: 'test-user',
      type: ProposalType.PARAMETER_CHANGE,
      description: 'This is a test proposal',
      status: ProposalStatus.ACCEPTED,
      stakedAmount: 100,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      implementationTime: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      votesFor: 70,
      votesAgainst: 30,
      voterCount: 100,
      passThreshold: 60,
      tags: ['test'],
      requiredApprovals: 2,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Spy on getProposalById method
    const getSpy = jest.spyOn(engine, 'getProposalById');
    getSpy.mockResolvedValue(mockProposal);
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    //
