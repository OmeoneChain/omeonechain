/**
 * Governance Engine
 * 
 * Core business logic for platform governance
 * Based on Technical Specifications A.8
 */

import { ChainAdapter, Transaction } from '../adapters/chain-adapter';
import { UserReputation } from '../types/reputation';
import { TokenBalance } from '../types/token';
import { v4 as uuidv4 } from 'uuid';

/**
 * Governance proposal status
 */
export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  VOTING = 'voting',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  CANCELLED = 'cancelled'
}

/**
 * Governance proposal type
 */
export enum ProposalType {
  PARAMETER_CHANGE = 'parameter_change',
  FEATURE_REQUEST = 'feature_request',
  PROTOCOL_UPGRADE = 'protocol_upgrade',
  TREASURY_SPEND = 'treasury_spend',
  COMMUNITY_FUND = 'community_fund',
  OTHER = 'other'
}

/**
 * Proposal vote
 */
export interface ProposalVote {
  /**
   * Proposal ID
   */
  proposalId: string;
  
  /**
   * Voter's user ID
   */
  voterId: string;
  
  /**
   * Vote direction (true = for, false = against)
   */
  voteFor: boolean;
  
  /**
   * Voting weight
   */
  weight: number;
  
  /**
   * ISO8601 timestamp
   */
  timestamp: string;
  
  /**
   * Optional comment
   */
  comment?: string;
}

/**
 * Governance proposal
 */
export interface Proposal {
  /**
   * Unique identifier
   */
  proposalId: string;
  
  /**
   * Title of the proposal
   */
  title: string;
  
  /**
   * Author's user ID
   */
  authorId: string;
  
  /**
   * Proposal type
   */
  type: ProposalType;
  
  /**
   * Detailed description
   */
  description: string;
  
  /**
   * Technical implementation details
   */
  implementation?: string;
  
  /**
   * Current status
   */
  status: ProposalStatus;
  
  /**
   * Tokens staked to create the proposal
   */
  stakedAmount: number;
  
  /**
   * Creation timestamp (ISO8601)
   */
  createdAt: string;
  
  /**
   * Last update timestamp (ISO8601)
   */
  updatedAt: string;
  
  /**
   * Voting start time (ISO8601)
   */
  votingStartTime?: string;
  
  /**
   * Voting end time (ISO8601)
   */
  votingEndTime?: string;
  
  /**
   * Implementation time (ISO8601)
   */
  implementationTime?: string;
  
  /**
   * Current votes for the proposal
   */
  votesFor: number;
  
  /**
   * Current votes against the proposal
   */
  votesAgainst: number;
  
  /**
   * Unique voters count
   */
  voterCount: number;
  
  /**
   * Threshold for proposal to pass (percent)
   */
  passThreshold: number;
  
  /**
   * Tags for categorization
   */
  tags: string[];
  
  /**
   * Parameter changes for PARAMETER_CHANGE type
   */
  parameterChanges?: {
    name: string;
    currentValue: any;
    proposedValue: any;
  }[];
  
  /**
   * Treasury spend amount for TREASURY_SPEND type
   */
  treasurySpendAmount?: number;
  
  /**
   * Treasury spend recipient for TREASURY_SPEND type
   */
  treasurySpendRecipient?: string;
  
  /**
   * Required multisig approvals
   */
  requiredApprovals: number;
  
  /**
   * Current multisig approvals
   */
  currentApprovals: number;
  
  /**
   * Multisig signers who approved
   */
  approvedBy: string[];
}

/**
 * Options for the governance engine
 */
export interface GovernanceEngineOptions {
  /**
   * Chain ID
   */
  chainId?: string;
  
  /**
   * Sponsor wallet for fee payments
   */
  sponsorWallet?: string;
  
  /**
   * Multisig addresses (core developers)
   */
  multisigAddresses?: string[];
  
  /**
   * Required multisig approvals for different proposal types
   */
  requiredApprovals?: Record<ProposalType, number>;
  
  /**
   * Vote weight calculation method
   */
  voteWeightMethod?: 'geometric' | 'linear' | 'quadratic';
  
  /**
   * Minimum stake required to create a proposal
   */
  minimumProposalStake?: number;
  
  /**
   * Minimum reputation required to create a proposal
   */
  minimumProposalReputation?: number;
  
  /**
   * Minimum voting period in days
   */
  minimumVotingPeriod?: number;
  
  /**
   * Default pass threshold percentage
   */
  defaultPassThreshold?: number;
  
  /**
   * Time delay before implementation in days
   */
  implementationTimeDelay?: number;
  
  /**
   * Quorum requirement (percentage of total stake)
   */
  quorumRequirement?: number;
  
  /**
   * Limited governance mode
   * If true, only certain proposal types allowed
   */
  limitedMode?: boolean;
  
  /**
   * Allowed proposal types in limited mode
   */
  allowedProposalTypes?: ProposalType[];
}

/**
 * Default governance engine options
 */
const DEFAULT_OPTIONS: GovernanceEngineOptions = {
  multisigAddresses: [],
  requiredApprovals: {
    [ProposalType.PARAMETER_CHANGE]: 2,
    [ProposalType.FEATURE_REQUEST]: 2,
    [ProposalType.PROTOCOL_UPGRADE]: 3,
    [ProposalType.TREASURY_SPEND]: 3,
    [ProposalType.COMMUNITY_FUND]: 2,
    [ProposalType.OTHER]: 2
  },
  voteWeightMethod: 'geometric',
  minimumProposalStake: 100,
  minimumProposalReputation: 0.4,
  minimumVotingPeriod: 7,
  defaultPassThreshold: 60,
  implementationTimeDelay: 3,
  quorumRequirement: 10,
  limitedMode: false,
  allowedProposalTypes: [
    ProposalType.PARAMETER_CHANGE,
    ProposalType.FEATURE_REQUEST,
    ProposalType.COMMUNITY_FUND
  ]
};

/**
 * Implementation of the Governance Engine
 * Handles proposals, voting, and governance execution
 */
export class GovernanceEngine {
  private adapter: ChainAdapter;
  private options: GovernanceEngineOptions;
  private chainId: string | null = null;
  
  /**
   * Create a new GovernanceEngine instance
   * 
   * @param adapter Chain adapter for blockchain interactions
   * @param options Engine options
   */
  constructor(
    adapter: ChainAdapter,
    options: GovernanceEngineOptions = {}
  ) {
    this.adapter = adapter;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Merge required approvals
    if (options.requiredApprovals) {
      this.options.requiredApprovals = {
        ...DEFAULT_OPTIONS.requiredApprovals,
        ...options.requiredApprovals
      };
    }
  }
  
  /**
   * Initialize the engine
   * 
   * @returns Promise resolving when initialized
   */
  async initialize(): Promise<void> {
    // Get chain ID from adapter or options
    this.chainId = this.options.chainId || await this.adapter.getChainId();
  }
  
  /**
   * Create a new governance proposal
   * 
   * @param authorId Author's user ID
   * @param title Proposal title
   * @param type Proposal type
   * @param description Detailed description
   * @param implementation Technical implementation details
   * @param options Additional proposal options
   * @returns Created proposal
   */
  async createProposal(
    authorId: string,
    title: string,
    type: ProposalType,
    description: string,
    implementation?: string,
    options?: {
      tags?: string[];
      parameterChanges?: {
        name: string;
        currentValue: any;
        proposedValue: any;
      }[];
      treasurySpendAmount?: number;
      treasurySpendRecipient?: string;
      votingPeriod?: number;
      passThreshold?: number;
    }
  ): Promise<Proposal> {
    // Check if governance is in limited mode
    if (
      this.options.limitedMode &&
      this.options.allowedProposalTypes &&
      !this.options.allowedProposalTypes.includes(type)
    ) {
      throw new Error(`Proposal type ${type} not allowed in limited governance mode`);
    }
    
    // Validate author has sufficient reputation
    const authorReputation = await this.getAuthorReputation(authorId);
    
    if (authorReputation.reputationScore < (this.options.minimumProposalReputation || 0.4)) {
      throw new Error(`Insufficient reputation to create proposal: ${authorReputation.reputationScore} < ${this.options.minimumProposalReputation}`);
    }
    
    // Validate author has sufficient stake
    const authorBalance = await this.getAuthorBalance(authorId);
    const minimumStake = this.options.minimumProposalStake || 100;
    
    if (authorBalance.available < minimumStake) {
      throw new Error(`Insufficient token balance to create proposal: ${authorBalance.available} < ${minimumStake}`);
    }
    
    // Set up proposal parameters
    const proposalId = uuidv4();
    const timestamp = new Date().toISOString();
    const minimumVotingPeriod = this.options.minimumVotingPeriod || 7;
    const votingPeriod = Math.max(options?.votingPeriod || minimumVotingPeriod, minimumVotingPeriod);
    
    // Calculate voting times
    const votingStartTime = new Date();
    votingStartTime.setDate(votingStartTime.getDate() + 1); // 1 day for discussion
    
    const votingEndTime = new Date(votingStartTime);
    votingEndTime.setDate(votingEndTime.getDate() + votingPeriod);
    
    // Determine required approvals
    const requiredApprovals = this.options.requiredApprovals?.[type] || 2;
    
    // Create proposal
    const proposal: Proposal = {
      proposalId,
      title,
      authorId,
      type,
      description,
      implementation,
      status: ProposalStatus.DRAFT,
      stakedAmount: minimumStake,
      createdAt: timestamp,
      updatedAt: timestamp,
      votingStartTime: votingStartTime.toISOString(),
      votingEndTime: votingEndTime.toISOString(),
      votesFor: 0,
      votesAgainst: 0,
      voterCount: 0,
      passThreshold: options?.passThreshold || (this.options.defaultPassThreshold || 60),
      tags: options?.tags || [],
      parameterChanges: options?.parameterChanges,
      treasurySpendAmount: options?.treasurySpendAmount,
      treasurySpendRecipient: options?.treasurySpendRecipient,
      requiredApprovals,
      currentApprovals: 0,
      approvedBy: []
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: authorId,
      payload: {
        objectType: 'governance_proposal',
        action: 'create',
        data: proposal
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Stake tokens
    await this.stakeProposalTokens(authorId, proposalId, minimumStake);
    
    return proposal;
  }
  
  /**
   * Get a proposal by ID
   * 
   * @param proposalId Proposal ID
   * @returns Proposal with the specified ID
   */
  async getProposalById(proposalId: string): Promise<Proposal> {
    // Query the blockchain for the proposal
    const result = await this.adapter.queryState<Proposal>({
      objectType: 'governance_proposal',
      filter: {
        proposalId
      }
    });
    
    if (result.results.length === 0) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    
    return result.results[0];
  }
  
  /**
   * Query proposals based on filters
   * 
   * @param filter Filter criteria
   * @param pagination Pagination options
   * @returns Proposals matching the filter
   */
  async queryProposals(
    filter: {
      status?: ProposalStatus;
      type?: ProposalType;
      authorId?: string;
      tags?: string[];
    } = {},
    pagination: { offset: number; limit: number } = { offset: 0, limit: 20 }
  ): Promise<{
    proposals: Proposal[];
    total: number;
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for proposals
    const result = await this.adapter.queryState<Proposal>({
      objectType: 'governance_proposal',
      filter: {
        ...(filter.status && { status: filter.status }),
        ...(filter.type && { type: filter.type }),
        ...(filter.authorId && { authorId: filter.authorId }),
        ...(filter.tags && { tags: filter.tags })
      },
      sort: {
        field: 'updatedAt',
        direction: 'desc'
      },
      pagination
    });
    
    return {
      proposals: result.results,
      total: result.total,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore: pagination.offset + result.results.length < result.total
      }
    };
  }
  
  /**
   * Update a proposal's status
   * 
   * @param proposalId Proposal ID
   * @param newStatus New status
   * @param updaterId User making the update
   * @returns Updated proposal
   */
  async updateProposalStatus(
    proposalId: string,
    newStatus: ProposalStatus,
    updaterId: string
  ): Promise<Proposal> {
    // Get existing proposal
    const proposal = await this.getProposalById(proposalId);
    
    // Validate status transition
    this.validateStatusTransition(proposal.status, newStatus, updaterId, proposal);
    
    // Update proposal
    const updatedProposal: Proposal = {
      ...proposal,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    
    // Add implementation time if moving to ACCEPTED
    if (newStatus === ProposalStatus.ACCEPTED) {
      const implementationDelay = this.options.implementationTimeDelay || 3;
      const implementationTime = new Date();
      implementationTime.setDate(implementationTime.getDate() + implementationDelay);
      updatedProposal.implementationTime = implementationTime.toISOString();
    }
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: updaterId,
      payload: {
        objectType: 'governance_proposal',
        action: 'update',
        data: updatedProposal
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return updatedProposal;
  }
  
  /**
   * Vote on a proposal
   * 
   * @param proposalId Proposal ID
   * @param voterId Voter's user ID
   * @param voteFor Whether to vote for (true) or against (false)
   * @param comment Optional comment
   * @returns Recorded vote and updated proposal
   */
  async voteOnProposal(
    proposalId: string,
    voterId: string,
    voteFor: boolean,
    comment?: string
  ): Promise<{ vote: ProposalVote; proposal: Proposal }> {
    // Get existing proposal
    const proposal = await this.getProposalById(proposalId);
    
    // Validate proposal is in voting state
    if (proposal.status !== ProposalStatus.VOTING) {
      throw new Error(`Cannot vote on proposal with status: ${proposal.status}`);
    }
    
    // Check if voting period is active
    const now = new Date();
    const votingStart = new Date(proposal.votingStartTime || now);
    const votingEnd = new Date(proposal.votingEndTime || now);
    
    if (now < votingStart) {
      throw new Error(`Voting has not started yet. Starts at: ${proposal.votingStartTime}`);
    }
    
    if (now > votingEnd) {
      throw new Error(`Voting has ended. Ended at: ${proposal.votingEndTime}`);
    }
    
    // Check if user has already voted
    const existingVote = await this.getUserVote(proposalId, voterId);
    if (existingVote) {
      throw new Error(`User has already voted on this proposal`);
    }
    
    // Calculate vote weight
    const voteWeight = await this.calculateVoteWeight(voterId);
    
    // Create vote
    const timestamp = new Date().toISOString();
    const vote: ProposalVote = {
      proposalId,
      voterId,
      voteFor,
      weight: voteWeight,
      timestamp,
      comment
    };
    
    // Submit vote transaction
    await this.adapter.submitTx({
      sender: voterId,
      payload: {
        objectType: 'proposal_vote',
        action: 'vote',
        data: vote
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Update proposal vote counts
    const updatedProposal: Proposal = {
      ...proposal,
      votesFor: voteFor ? proposal.votesFor + voteWeight : proposal.votesFor,
      votesAgainst: voteFor ? proposal.votesAgainst : proposal.votesAgainst + voteWeight,
      voterCount: proposal.voterCount + 1,
      updatedAt: timestamp
    };
    
    // Submit proposal update transaction
    await this.adapter.submitTx({
      sender: this.options.sponsorWallet || 'SYSTEM',
      payload: {
        objectType: 'governance_proposal',
        action: 'update',
        data: updatedProposal
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return { vote, proposal: updatedProposal };
  }
  
  /**
   * Get a user's vote on a proposal
   * 
   * @param proposalId Proposal ID
   * @param voterId Voter's user ID
   * @returns Vote if found, null otherwise
   */
  async getUserVote(
    proposalId: string,
    voterId: string
  ): Promise<ProposalVote | null> {
    // Query the blockchain for the vote
    const result = await this.adapter.queryState<ProposalVote>({
      objectType: 'proposal_vote',
      filter: {
        proposalId,
        voterId
      }
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  }
  
  /**
   * Get all votes for a proposal
   * 
   * @param proposalId Proposal ID
   * @param pagination Pagination options
   * @returns Votes for the proposal
   */
  async getProposalVotes(
    proposalId: string,
    pagination: { offset: number; limit: number } = { offset: 0, limit: 50 }
  ): Promise<{
    votes: ProposalVote[];
    total: number;
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for votes
    const result = await this.adapter.queryState<ProposalVote>({
      objectType: 'proposal_vote',
      filter: {
        proposalId
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination
    });
    
    return {
      votes: result.results,
      total: result.total,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore: pagination.offset + result.results.length < result.total
      }
    };
  }
  
  /**
   * Add a multisig approval to a proposal
   * 
   * @param proposalId Proposal ID
   * @param signerId Signer's user ID
   * @returns Updated proposal
   */
  async approveProposal(
    proposalId: string,
    signerId: string
  ): Promise<Proposal> {
    // Get existing proposal
    const proposal = await this.getProposalById(proposalId);
    
    // Validate signer is in multisig list
    if (!this.options.multisigAddresses?.includes(signerId)) {
      throw new Error(`Signer is not authorized for multisig approvals`);
    }
    
    // Check if signer has already approved
    if (proposal.approvedBy.includes(signerId)) {
      throw new Error(`Signer has already approved this proposal`);
    }
    
    // Update proposal
    const updatedProposal: Proposal = {
      ...proposal,
      currentApprovals: proposal.currentApprovals + 1,
      approvedBy: [...proposal.approvedBy, signerId],
      updatedAt: new Date().toISOString()
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: signerId,
      payload: {
        objectType: 'governance_proposal',
        action: 'approve',
        data: updatedProposal
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // If all required approvals met, move to implementation
    if (updatedProposal.currentApprovals >= updatedProposal.requiredApprovals &&
        updatedProposal.status === ProposalStatus.ACCEPTED) {
      return this.updateProposalStatus(proposalId, ProposalStatus.IMPLEMENTED, signerId);
    }
    
    return updatedProposal;
  }
  
  /**
   * Check if a proposal has passed voting and update status accordingly
   * 
   * @param proposalId Proposal ID
   * @param checkerId User ID triggering the check
   * @returns Updated proposal
   */
  async checkProposalVotingResults(
    proposalId: string,
    checkerId: string
  ): Promise<Proposal> {
    // Get existing proposal
    const proposal = await this.getProposalById(proposalId);
    
    // Validate proposal is in voting state
    if (proposal.status !== ProposalStatus.VOTING) {
      throw new Error(`Cannot check results for proposal with status: ${proposal.status}`);
    }
    
    // Check if voting period has ended
    const now = new Date();
    const votingEnd = new Date(proposal.votingEndTime || now);
    
    if (now < votingEnd) {
      throw new Error(`Voting is still in progress. Ends at: ${proposal.votingEndTime}`);
    }
    
    // Calculate result
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
    
    // Check quorum
    const totalStake = await this.getTotalStake();
    const quorumPercentage = totalVotes / totalStake * 100;
    const quorumMet = quorumPercentage >= (this.options.quorumRequirement || 10);
    
    // Determine new status
    let newStatus: ProposalStatus;
    if (!quorumMet) {
      newStatus = ProposalStatus.REJECTED;
    } else if (forPercentage >= proposal.passThreshold) {
      newStatus = ProposalStatus.ACCEPTED;
    } else {
      newStatus = ProposalStatus.REJECTED;
    }
    
    // Update proposal status
    return this.updateProposalStatus(proposalId, newStatus, checkerId);
  }
  
  /**
   * Get active proposal count by type
   * 
   * @param type Proposal type
   * @returns Number of active proposals
   */
  async getActiveProposalCount(type?: ProposalType): Promise<number> {
    // Query the blockchain for active proposals
    const result = await this.adapter.queryState<Proposal>({
      objectType: 'governance_proposal',
      filter: {
        status: ProposalStatus.ACTIVE,
        ...(type && { type })
      }
    });
    
    return result.total;
  }
  
  /**
   * Retrieve recent governance activity
   * 
   * @param limit Maximum number of activities to return
   * @returns Recent governance activities
   */
  async getRecentActivity(limit: number = 10): Promise<{
    proposals: Proposal[];
    votes: ProposalVote[];
  }> {
    // Query recent proposals
    const proposalsResult = await this.adapter.queryState<Proposal>({
      objectType: 'governance_proposal',
      sort: {
        field: 'updatedAt',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit
      }
    });
    
    // Query recent votes
    const votesResult = await this.adapter.queryState<ProposalVote>({
      objectType: 'proposal_vote',
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit
      }
    });
    
    return {
      proposals: proposalsResult.results,
      votes: votesResult.results
    };
  }
  
  /**
   * Calculate a user's voting weight
   * 
   * @private
   * @param userId User ID
   * @returns Calculated voting weight
   */
  private async calculateVoteWeight(userId: string): Promise<number> {
    // Get user's reputation and token balance
    const reputation = await this.getAuthorReputation(userId);
    const balance = await this.getAuthorBalance(userId);
    
    // Apply selected weight calculation method
    const weightMethod = this.options.voteWeightMethod || 'geometric';
    let weight: number;
    
    switch (weightMethod) {
      case 'geometric':
        // Geometric mean of reputation and stake
        weight = Math.sqrt(reputation.reputationScore * (balance.staked + 1));
        break;
      
      case 'linear':
        // Linear combination
        weight = (0.5 * reputation.reputationScore) + (0.5 * (balance.staked / 100));
        break;
      
      case 'quadratic':
        // Quadratic voting (square root of stake)
        weight = Math.sqrt(balance.staked) * reputation.reputationScore;
        break;
      
      default:
        weight = 1; // Default weight
    }
    
    // Apply a cap of 3% of total
    const maxWeight = 3;
    return Math.min(weight, maxWeight);
  }
  
  /**
   * Get author's reputation
   * 
   * @private
   * @param authorId Author's user ID
   * @returns User reputation
   */
  private async getAuthorReputation(authorId: string): Promise<UserReputation> {
    // Query the blockchain for the user's reputation
    const result = await this.adapter.queryState<UserReputation>({
      objectType: 'user_reputation',
      filter: {
        userId: authorId
      }
    });
    
    if (result.results.length === 0) {
      // Return default reputation if not found
      return {
        chainID: this.chainId || 'unknown',
        userId: authorId,
        totalRecommendations: 0,
        upvotesReceived: 0,
        downvotesReceived: 0,
        reputationScore: 0,
        verificationLevel: 'basic',
        specializations: [],
        activeSince: new Date().toISOString(),
        tokenRewardsEarned: 0,
        followers: 0,
        following: 0,
        ledger: {
          objectID: '',
          commitNumber: 0
        }
      };
    }
    
    return result.results[0];
  }
  
  /**
   * Get author's token balance
   * 
   * @private
   * @param authorId Author's user ID
   * @returns Token balance
   */
  private async getAuthorBalance(authorId: string): Promise<TokenBalance> {
    // Query the blockchain for the user's balance
    const result = await this.adapter.queryState<TokenBalance>({
      objectType: 'token_balance',
      filter: {
        userId: authorId
      }
    });
    
    if (result.results.length === 0) {
      // Return default balance if not found
      return {
        userId: authorId,
        available: 0,
        staked: 0,
        pendingRewards: 0
      };
    }
    
    return result.results[0];
  }
  
  /**
   * Get total staked tokens
   * 
   * @private
   * @returns Total staked tokens
   */
  private async getTotalStake(): Promise<number> {
    // Query the blockchain for all token balances
    const result = await this.adapter.queryState<TokenBalance>({
      objectType: 'token_balance'
    });
    
    // Sum all staked tokens
    return result.results.reduce((total, balance) => total + balance.staked, 0);
  }
  
  /**
   * Stake tokens for a proposal
   * 
   * @private
   * @param userId User ID
   * @param proposalId Proposal ID
   * @param amount Amount to stake
   */
  private async stakeProposalTokens(
    userId: string,
    proposalId: string,
    amount: number
  ): Promise<void> {
    // Create staking transaction
    await this.adapter.submitTx({
      sender: userId,
      payload: {
        objectType: 'token_transaction',
        action: 'stake',
        data: {
          sender: userId,
          recipient: userId,
          amount,
          type: 'stake',
          actionReference: `proposal:${proposalId}`,
          timestamp: new Date().toISOString()
        }
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Update user balance
    const balance = await this.getAuthorBalance(userId);
    
    await this.adapter.submitTx({
      sender: userId,
      payload: {
        objectType: 'token_balance',
        action: 'update',
        data: {
          ...balance,
          available: balance.available - amount,
          staked: balance.staked + amount
        }
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
  }
  
  /**
   * Validate a status transition
   * 
   * @private
   * @param currentStatus Current proposal status
   * @param newStatus New proposal status
   * @param updaterId User making the update
   * @param proposal Proposal being updated
   */
  private validateStatusTransition(
    currentStatus: ProposalStatus,
    newStatus: ProposalStatus,
    updaterId: string,
    proposal: Proposal
  ): void {
    // Define valid transitions
    const validTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      [ProposalStatus.DRAFT]: [ProposalStatus.ACTIVE, ProposalStatus.CANCELLED],
      [ProposalStatus.ACTIVE]: [ProposalStatus.VOTING, ProposalStatus.CANCELLED],
      [ProposalStatus.VOTING]: [ProposalStatus.ACCEPTED, ProposalStatus.REJECTED, ProposalStatus.CANCELLED],
      [ProposalStatus.ACCEPTED]: [ProposalStatus.IMPLEMENTED, ProposalStatus.CANCELLED],
      [ProposalStatus.REJECTED]: [ProposalStatus.CANCELLED],
      [ProposalStatus.IMPLEMENTED]: [],
      [ProposalStatus.CANCELLED]: []
    };
    
    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
    }
    
    // Validate permissions
    if (newStatus === ProposalStatus.CANCELLED) {
      // Only author or multisig can cancel
      if (
        updaterId !== proposal.authorId &&
        !this.options.multisigAddresses?.includes(updaterId)
      ) {
        throw new Error(`Only the author or multisig can cancel a proposal`);
      }
    } else if (newStatus === ProposalStatus.IMPLEMENTED) {
      // Only multisig can implement
      if (!this.options.multisigAddresses?.includes(updaterId)) {
        throw new Error(`Only multisig signers can implement a proposal`);
      }
      
      // Check if enough approvals
      if (proposal.currentApprovals < proposal.requiredApprovals) {
        throw new Error(`Not enough approvals: ${proposal.currentApprovals} < ${proposal.requiredApprovals}`);
      }
    }
  }
}
