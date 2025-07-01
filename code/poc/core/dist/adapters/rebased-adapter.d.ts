import { ChainAdapter, Transaction, TransactionResult, StateQuery, EventFilter, Event } from '../types/chain';
/**
 * Move Contract Function Mappings
 * Maps OmeoneChain operations to specific Move contract functions
 */
interface MoveContractMappings {
    token: {
        createUserWallet: 'omeone_token::create_user_wallet';
        stakeTokens: 'omeone_token::stake_tokens';
        claimRewards: 'omeone_token::claim_rewards';
        distributeReward: 'omeone_token::distribute_reward';
        updateTrustScore: 'omeone_token::update_trust_score';
        updateReputationScore: 'omeone_token::update_reputation_score';
        getCurrentRewardRate: 'omeone_token::get_current_reward_rate';
        getTotalRewardsDistributed: 'omeone_token::get_total_rewards_distributed';
        getBalance: 'omeone_token::get_balance';
        getTrustScore: 'omeone_token::get_trust_score';
        getReputationScore: 'omeone_token::get_reputation_score';
    };
    rewards: {
        submitActionForReward: 'reward_distribution::submit_action_for_reward';
        addSocialEndorsement: 'reward_distribution::add_social_endorsement';
        claimReward: 'reward_distribution::claim_reward';
        distributeOnboardingReward: 'reward_distribution::distribute_onboarding_reward';
        distributeLeaderboardReward: 'reward_distribution::distribute_leaderboard_reward';
        isEligibleForReward: 'reward_distribution::is_eligible_for_reward';
        getPendingRewardInfo: 'reward_distribution::get_pending_reward_info';
        claimDiscoveryBonus: 'discovery_incentives::claim_discovery_bonus';
        getActiveCampaigns: 'discovery_incentives::get_active_campaigns';
    };
    governance: {
        createProposal: 'governance::create_proposal';
        vote: 'governance::vote';
        executeProposal: 'governance::execute_proposal';
        getProposal: 'governance::get_proposal';
        getVotingPower: 'governance::get_voting_power';
    };
    reputation: {
        updateUserReputation: 'reputation::update_user_reputation';
        getSocialWeight: 'reputation::get_social_weight';
        calculateTrustScore: 'reputation::calculate_trust_score';
        submitCommunityVerification: 'reputation::submit_community_verification';
        addSocialConnection: 'reputation::add_social_connection';
        removeSocialConnection: 'reputation::remove_social_connection';
        getUserReputation: 'reputation::get_user_reputation';
    };
}
/**
 * Configuration interface for the RebasedAdapter
 */
export interface RebasedConfig {
    network: 'testnet' | 'mainnet' | 'local';
    nodeUrl: string;
    account: {
        address: string;
        privateKey: string;
    };
    sponsorWallet?: {
        address: string;
        privateKey: string;
    };
    contractAddresses: {
        recommendation: string;
        reputation: string;
        token: string;
        governance: string;
        service: string;
        rewards?: string;
    };
    packageId?: string;
    options?: {
        retryAttempts?: number;
        maxFeePerTransaction?: number;
        timeoutMs?: number;
        enableSponsorWallet?: boolean;
    };
}
/**
 * Move Contract Call Result
 */
interface MoveCallResult {
    success: boolean;
    result?: any;
    error?: string;
    gasUsed?: number;
    events?: any[];
}
/**
 * OmeoneChain specific transaction types
 */
interface OmeoneTransaction extends Transaction {
    payload: {
        type: 'recommendation' | 'reputation' | 'token' | 'governance' | 'service' | 'reward';
        action: string;
        data: any;
    };
}
/**
 * Enhanced RebasedAdapter with Move Contract Integration
 *
 * Builds on the existing solid foundation to add:
 * - Direct Move contract function calls
 * - OmeoneChain-specific transaction types
 * - Enhanced reward distribution integration
 * - Better error handling for contract calls
 * - Automatic sponsor wallet fee handling
 */
export declare class RebasedAdapter implements ChainAdapter {
    private nodeUrl;
    private apiKey;
    private wallet;
    private isConnected;
    private eventSubscribers;
    private lastCommitNumber;
    private config;
    private client;
    private currentChainId;
    private eventIterator;
    private moveContracts;
    private readonly DEFAULT_OPTIONS;
    constructor(configOrNodeUrl: RebasedConfig | string, apiKey?: string, seed?: string);
    /**
     * Call a Move contract function with automatic sponsor wallet handling
     *
     * @param contractType - Type of contract (token, governance, etc.)
     * @param functionName - Name of the function to call
     * @param args - Function arguments
     * @param options - Call options
     */
    callMoveFunction(contractType: keyof MoveContractMappings, functionName: string, args?: any[], options?: {
        useSponsorWallet?: boolean;
        maxGas?: number;
        sender?: string;
    }): Promise<MoveCallResult>;
    /**
     * Enhanced submitTx with Move contract integration
     */
    submitTx(tx: OmeoneTransaction): Promise<TransactionResult>;
    /**
     * Token Operations
     */
    createUserWallet(userAddress: string): Promise<MoveCallResult>;
    stakeTokens(userAddress: string, amount: number, stakeType: number, lockPeriodMonths: number): Promise<MoveCallResult>;
    claimUserRewards(userAddress: string): Promise<MoveCallResult>;
    getUserBalance(userAddress: string): Promise<{
        liquid: number;
        staked: number;
        pendingRewards: number;
        lifetimeRewards: number;
    }>;
    getUserTrustScore(userAddress: string): Promise<number>;
    getUserReputationScore(userAddress: string): Promise<number>;
    /**
     * Reward Distribution Operations
     */
    submitRecommendationForReward(userAddress: string, actionId: string, actionType?: number): Promise<MoveCallResult>;
    addSocialEndorsement(endorserAddress: string, actionId: string, socialDistance?: number): Promise<MoveCallResult>;
    claimRecommendationReward(userAddress: string, actionId: string): Promise<MoveCallResult>;
    checkRewardEligibility(actionId: string): Promise<{
        trustScore: number;
        endorsements: number;
        potentialReward: number;
        isEligible: boolean;
    }>;
    distributeOnboardingReward(userAddress: string, milestone: number): Promise<MoveCallResult>;
    distributeLeaderboardReward(userAddress: string, position: number): Promise<MoveCallResult>;
    /**
     * Update user reputation on blockchain (Phase 5B integration)
     */
    updateUserReputationOnChain(userId: string, reputationScore: number, verificationLevel: number, socialConnections?: Array<{
        targetId: string;
        trustWeight: number;
        connectionType: number;
    }>): Promise<MoveCallResult>;
    /**
     * Submit community verification (Phase 5B)
     */
    submitCommunityVerificationOnChain(verifierId: string, targetUserId: string, evidence: string, category: string, verificationHash: string): Promise<MoveCallResult>;
    /**
     * Add social connection to blockchain (Phase 5B)
     */
    addSocialConnectionOnChain(followerId: string, followedId: string, trustWeight: number, connectionType?: number): Promise<MoveCallResult>;
    /**
     * Remove social connection from blockchain (Phase 5B)
     */
    removeSocialConnectionOnChain(followerId: string, followedId: string): Promise<MoveCallResult>;
    /**
     * Claim discovery incentive bonus (Phase 5B)
     */
    claimDiscoveryBonusOnChain(userId: string, campaignId: string, recommendationIds: string[]): Promise<MoveCallResult>;
    /**
     * Get user's on-chain reputation data (Phase 5B)
     */
    getOnChainReputationData(userId: string): Promise<{
        reputationScore: number;
        verificationLevel: number;
        socialConnections: number;
        lastUpdated: string;
        verificationCount: number;
    }>;
    /**
     * Get active discovery campaigns from blockchain (Phase 5B)
     */
    getActiveDiscoveryCampaignsOnChain(region?: string, category?: string): Promise<Array<{
        campaignId: string;
        region: string;
        category: string;
        bonusMultiplier: number;
        targetRecommendations: number;
        expiresAt: string;
        minTrustScore: number;
        bonusPool: number;
        participantCount: number;
    }>>;
    /**
     * Calculate trust score between users on blockchain (Phase 5B)
     */
    calculateTrustScoreOnChain(sourceUserId: string, targetUserId: string, maxDepth?: number): Promise<{
        trustScore: number;
        directConnection: boolean;
        shortestPath: number;
        socialDistance: number;
    }>;
    /**
     * Sync reputation data between off-chain and on-chain (Phase 5B)
     */
    syncReputationWithBlockchain(userId: string, offChainData: {
        reputationScore: number;
        verificationLevel: string;
        socialConnections: number;
    }): Promise<{
        synced: boolean;
        discrepancies: string[];
        transactionId?: string;
    }>;
    /**
     * Governance Operations
     */
    createGovernanceProposal(proposerAddress: string, title: string, description: string, proposalType: string): Promise<MoveCallResult>;
    voteOnProposal(voterAddress: string, proposalId: string, support: boolean): Promise<MoveCallResult>;
    /**
     * System State Queries
     */
    getCurrentRewardRate(): Promise<number>;
    getTotalRewardsDistributed(): Promise<number>;
    getSystemStats(): Promise<{
        currentRewardRate: number;
        totalDistributed: number;
        activeUsers: number;
    }>;
    private routeToMoveContract;
    private handleTokenTransaction;
    private handleRewardTransaction;
    private handleGovernanceTransaction;
    private handleReputationTransaction;
    private getContractAddress;
    private buildFullFunctionName;
    private determineSender;
    private serializeArgsForMove;
    private stringToBytes;
    private getCurrentTimestamp;
    private initializeClient;
    getChainId(): Promise<string>;
    queryState<T>(query: StateQuery): Promise<{
        results: T[];
        total: number;
        pagination?: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    watchEvents(filter: EventFilter): AsyncIterator<Event>;
    getCurrentCommit(): Promise<number>;
    estimateFee(tx: Transaction): Promise<number>;
    connect(options?: Record<string, any>): Promise<void>;
    disconnect(): Promise<void>;
    private initializeWallet;
    submitTransaction(transaction: any): Promise<any>;
    private getContractTypeFromObjectType;
    private getContractTypeFromEventType;
    private formatQueryArgs;
    private getTxTypeFromPayload;
    private deserializeFromMoveVM;
    /**
    * Query objects from the chain
    */
    queryObjects(filter: any): Promise<any[]>;
    /**
     * Subscribe to chain events
     */
    subscribeToEvents(eventFilter: any, callback: (event: any) => void): Promise<string>;
    /**
     * Unsubscribe from chain events
     */
    unsubscribeFromEvents(subscriptionId: string): Promise<void>;
    /**
     * Check if connected to node
     */
    isConnectedToNode(): Promise<boolean>;
    /**
     * Get wallet address
     */
    getWalletAddress(): Promise<string>;
    /**
     * Health check for the adapter
     */
    healthCheck(): Promise<{
        success: boolean;
        message?: string;
    }>;
    /**
     * Get network information
     */
    getNetworkInfo(): Promise<any>;
}
export {};
