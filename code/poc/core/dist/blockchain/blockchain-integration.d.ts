import { RebasedConfig } from '../adapters/rebased-adapter';
import { GovernanceEngine } from '../governance/engine';
import { TokenEngine } from '../token/engine';
import { ReputationEngine } from '../reputation/engine';
import { RecommendationEngine } from '../recommendation/engine';
export interface BlockchainConfig {
    mode: 'mock' | 'rebased';
    rebased?: RebasedConfig;
    autoSync?: boolean;
    syncInterval?: number;
}
export interface UserProfile {
    address: string;
    liquidBalance: number;
    stakedBalance: number;
    pendingRewards: number;
    lifetimeRewards: number;
    trustScore: number;
    reputationScore: number;
    stakes: any[];
}
export interface RewardStatus {
    actionId: string;
    trustScore: number;
    endorsements: number;
    potentialReward: number;
    isEligible: boolean;
    canClaim: boolean;
}
/**
 * Blockchain Integration Service
 * Coordinates between existing OmeoneChain engines and blockchain adapters
 * Provides seamless migration from MockAdapter to RebasedAdapter
 */
export declare class BlockchainIntegrationService {
    private adapter;
    private config;
    private isInitialized;
    private syncInterval?;
    private governanceEngine;
    private tokenEngine;
    private reputationEngine;
    private recommendationEngine;
    constructor(config: BlockchainConfig, engines: {
        governance: GovernanceEngine;
        token: TokenEngine;
        reputation: ReputationEngine;
        recommendation: RecommendationEngine;
    });
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    createUser(address: string): Promise<UserProfile>;
    getUserProfile(address: string): Promise<UserProfile>;
    stakeTokens(userAddress: string, amount: number, stakeType: number, lockPeriodMonths: number): Promise<{
        success: boolean;
        transactionHash?: string;
        error?: string;
    }>;
    claimRewards(userAddress: string): Promise<{
        success: boolean;
        amount?: number;
        transactionHash?: string;
        error?: string;
    }>;
    submitRecommendation(userAddress: string, recommendationData: any): Promise<{
        success: boolean;
        actionId?: string;
        transactionHash?: string;
        error?: string;
    }>;
    endorseRecommendation(endorserAddress: string, actionId: string, socialDistance?: number): Promise<{
        success: boolean;
        transactionHash?: string;
        newTrustScore?: number;
        error?: string;
    }>;
    checkRewardEligibility(actionId: string): Promise<RewardStatus>;
    claimRecommendationReward(userAddress: string, actionId: string): Promise<{
        success: boolean;
        rewardAmount?: number;
        transactionHash?: string;
        error?: string;
    }>;
    createProposal(proposerAddress: string, title: string, description: string, proposalType: string): Promise<{
        success: boolean;
        proposalId?: string;
        transactionHash?: string;
        error?: string;
    }>;
    vote(voterAddress: string, proposalId: string, support: boolean): Promise<{
        success: boolean;
        transactionHash?: string;
        votingPower?: number;
        error?: string;
    }>;
    private syncUserData;
    private startAutoSync;
    private ensureInitialized;
    getSystemHealth(): Promise<{
        adapter: string;
        connected: boolean;
        latestBlock: number;
        syncStatus: string;
    }>;
    getSystemStats(): Promise<{
        currentRewardRate: number;
        totalDistributed: number;
        halvingPeriod: number;
        activeUsers: number;
    }>;
}
