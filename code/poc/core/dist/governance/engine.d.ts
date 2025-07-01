import { ChainAdapter } from '../adapters/chain-adapter';
import { StorageProvider } from '../storage/storage-provider';
import { ReputationEngine } from '../reputation/engine';
import { TokenEngine } from '../token/engine';
export declare enum ProposalType {
    PARAMETER_CHANGE = "parameter_change",
    TREASURY_SPEND = "treasury_spend",
    PROTOCOL_UPGRADE = "protocol_upgrade",
    GOVERNANCE_CHANGE = "governance_change",
    EMERGENCY_ACTION = "emergency_action"
}
export declare enum ProposalStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    VOTING = "voting",
    PASSED = "passed",
    REJECTED = "rejected",
    EXECUTED = "executed",
    EXPIRED = "expired",
    VETOED = "vetoed"
}
export declare enum VoteType {
    YES = "yes",
    NO = "no",
    ABSTAIN = "abstain"
}
export declare enum StakingTier {
    EXPLORER = "explorer",// 25 TOK, 1 month
    CURATOR = "curator",// 100 TOK, 3 months  
    PASSPORT = "passport",// 500 TOK, 6 months
    VALIDATOR_DELEGATE = "validator_delegate"
}
export interface StakingRequirement {
    minTokens: number;
    minDuration: number;
    trustScoreMinimum: number;
    privileges: string[];
}
export interface GovernanceStake {
    userId: string;
    amount: number;
    tier: StakingTier;
    stakedAt: Date;
    lockDuration: number;
    isActive: boolean;
}
export interface BaseProposal {
    id: string;
    title: string;
    description: string;
    type: ProposalType;
    author: string;
    authorReputationAtCreation: number;
    createdAt: Date;
    votingStartTime: Date;
    votingEndTime: Date;
    executionDelay: number;
    status: ProposalStatus;
    requiredQuorum: number;
    requiredMajority: number;
    ipfsHash?: string;
}
export interface EnhancedProposal extends BaseProposal {
    stakingRequirements: {
        minStakeToPropose: number;
        minTrustScore: number;
        requiredTier: StakingTier;
    };
    executionParameters: {
        timelock: number;
        vetoWindow: number;
        requiresMultisig: boolean;
        multisigThreshold: number;
    };
    impact: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
}
export interface Vote {
    id: string;
    proposalId: string;
    voter: string;
    voteType: VoteType;
    votingPower: number;
    reputationAtVote: number;
    stakeAmount: number;
    stakingTier: StakingTier;
    timestamp: Date;
    reason?: string;
    ipfsHash?: string;
}
export interface VotingResult {
    proposalId: string;
    totalVotingPower: number;
    yesVotes: number;
    noVotes: number;
    abstainVotes: number;
    participationRate: number;
    quorumReached: boolean;
    majorityAchieved: boolean;
    passed: boolean;
    voterBreakdown: {
        byTier: Record<StakingTier, {
            count: number;
            power: number;
        }>;
        byReputation: {
            high: number;
            medium: number;
            low: number;
        };
    };
}
export interface GovernanceMilestone {
    name: string;
    description: string;
    requirements: {
        totalStaked?: number;
        uniqueVoters?: number;
        dailyActiveUsers?: number;
        exchangeLiquidity?: number;
        independentDApps?: number;
        securityAudits?: number;
    };
    unlocks: string[];
    achieved: boolean;
    achievedAt?: Date;
}
export declare class GovernanceEngine {
    private chainAdapter;
    private storageProvider;
    private reputationEngine;
    private tokenEngine;
    private proposals;
    private votes;
    private stakes;
    private milestones;
    private readonly STAKING_TIERS;
    constructor(chainAdapter: ChainAdapter, storageProvider: StorageProvider, reputationEngine: ReputationEngine, // Remove 'any'
    tokenEngine: TokenEngine);
    private initializeGovernanceMilestones;
    stakeForGovernance(userId: string, amount: number, lockDuration: number): Promise<GovernanceStake>;
    private determineTier;
    unstakeTokens(userId: string): Promise<void>;
    createProposal(proposal: Omit<EnhancedProposal, 'id' | 'createdAt' | 'status'>): Promise<string>;
    activateProposal(proposalId: string): Promise<void>;
    voteOnProposal(proposalId: string, userId: string, voteType: VoteType, reason?: string): Promise<void>;
    calculateVotingPower(userId: string): Promise<number>;
    private getTotalPossibleVotingPower;
    finalizeProposal(proposalId: string): Promise<VotingResult>;
    private calculateVotingResult;
    private executeProposal;
    private executeProposalByType;
    private executeParameterChange;
    private executeTreasurySpend;
    private executeProtocolUpgrade;
    private executeGovernanceChange;
    private executeEmergencyAction;
    checkMilestones(): Promise<GovernanceMilestone[]>;
    private evaluateMilestone;
    getProposal(proposalId: string): Promise<EnhancedProposal | null>;
    getProposalsByStatus(status: ProposalStatus): Promise<EnhancedProposal[]>;
    getActiveProposals(): Promise<EnhancedProposal[]>;
    getUserStake(userId: string): Promise<GovernanceStake | null>;
    getUserVotingPower(userId: string): Promise<number>;
    getProposalVotes(proposalId: string): Promise<Vote[]>;
    getGovernanceStats(): Promise<{
        totalProposals: number;
        activeProposals: number;
        totalStaked: number;
        uniqueStakers: number;
        totalVotingPower: number;
        milestonesAchieved: number;
    }>;
    private generateProposalId;
    private generateVoteId;
    private checkForVetoVotes;
}
