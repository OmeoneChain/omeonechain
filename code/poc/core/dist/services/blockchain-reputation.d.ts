/**
 * blockchain-reputation.ts - Blockchain Integration Service
 *
 * Location: code/core/src/services/blockchain-reputation.ts
 *
 * Service layer connecting reputation engine to IOTA Rebased blockchain
 */
import { RebasedAdapter } from '../adapters/rebased-adapter';
import { ReputationEngine } from '../reputation/engine';
export interface BlockchainReputationUpdate {
    userId: string;
    reputationScore: number;
    socialConnections: Array<{
        targetId: string;
        trustWeight: number;
        connectionType: number;
    }>;
    verificationLevel: number;
    lastUpdated: string;
}
export interface BlockchainDiscoveryIncentive {
    campaignId: string;
    region: string;
    category: string;
    bonusMultiplier: number;
    targetRecommendations: number;
    expiresAt: string;
    minTrustScore: number;
    bonusPool: bigint;
}
export interface BlockchainVerificationSubmission {
    verifierId: string;
    targetUserId: string;
    evidence: string;
    category: string;
    timestamp: string;
    verificationHash: string;
}
export interface BlockchainTransaction {
    transactionId: string;
    blockHeight: number;
    timestamp: string;
    gasUsed: number;
    success: boolean;
    events: Array<{
        type: string;
        data: any;
    }>;
}
/**
 * Service for blockchain reputation operations
 */
export declare class BlockchainReputationService {
    private adapter;
    private reputationEngine;
    private contractAddresses;
    constructor(adapter: RebasedAdapter, reputationEngine: ReputationEngine, contractAddresses: {
        reputation: string;
        socialGraph: string;
        discoveryIncentives: string;
    });
    /**
     * Update user reputation on blockchain
     */
    updateUserReputationOnChain(userId: string, reputationData: BlockchainReputationUpdate): Promise<BlockchainTransaction>;
    /**
     * Submit social connection on blockchain
     */
    submitSocialConnection(followerId: string, followedId: string, trustWeight: number): Promise<BlockchainTransaction>;
    /**
     * Remove social connection on blockchain
     */
    removeSocialConnection(followerId: string, followedId: string): Promise<BlockchainTransaction>;
    /**
     * Submit community verification on blockchain
     */
    submitCommunityVerification(verification: BlockchainVerificationSubmission): Promise<BlockchainTransaction>;
    /**
     * Claim discovery incentive bonus on blockchain
     */
    claimDiscoveryBonus(userId: string, campaignId: string, recommendationIds: string[]): Promise<BlockchainTransaction>;
    /**
     * Get on-chain reputation data
     */
    getOnChainReputation(userId: string): Promise<{
        reputationScore: number;
        verificationLevel: number;
        socialConnections: number;
        lastUpdated: string;
        onChainHistory: Array<{
            timestamp: string;
            score: number;
            transactionId: string;
        }>;
    }>;
    /**
     * Get active discovery campaigns from blockchain
     */
    getActiveDiscoveryCampaigns(region?: string, category?: string): Promise<BlockchainDiscoveryIncentive[]>;
    /**
     * Sync off-chain reputation with on-chain data
     */
    syncReputationData(userId: string): Promise<{
        synced: boolean;
        discrepancies: string[];
        lastSync: string;
    }>;
    /**
     * Monitor blockchain events for reputation updates
     */
    startEventMonitoring(onReputationUpdate: (event: any) => void, onSocialConnection: (event: any) => void, onVerificationSubmission: (event: any) => void): Promise<() => void>;
    /**
     * Health check for blockchain connection
     */
    healthCheck(): Promise<{
        connected: boolean;
        blockHeight: number;
        contractsDeployed: boolean;
        lastTransactionTime: string;
        networkInfo: {
            chainId: string;
            networkType: string;
            nodeVersion: string;
        };
    }>;
}
export default BlockchainReputationService;
