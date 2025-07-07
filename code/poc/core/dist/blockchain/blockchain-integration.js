"use strict";
// code/poc/core/src/blockchain/blockchain-integration.ts
// PHASE 2B.2: Updated to align with Phase 2B interface fixes
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainIntegrationService = void 0;
const rebased_adapter_1 = require("../adapters/rebased-adapter");
const adapter_factory_1 = require("../adapters/adapter-factory");
/**
 * Blockchain Integration Service
 * UPDATED: Aligned with Phase 2B interface fixes - blockchain-first approach
 * Coordinates between existing OmeoneChain engines and blockchain adapters
 */
class BlockchainIntegrationService {
    constructor(config, engines) {
        this.isInitialized = false;
        this.config = config;
        this.governanceEngine = engines.governance;
        this.tokenEngine = engines.token;
        this.reputationEngine = engines.reputation;
        this.recommendationEngine = engines.recommendation;
        // PHASE 2B: Initialize adapter using factory with blockchain-first approach
        const factory = new adapter_factory_1.AdapterFactory();
        if (config.mode === 'rebased' && config.rebased) {
            this.adapter = factory.createAdapter(adapter_factory_1.AdapterType.REBASED, config.rebased);
        }
        else {
            this.adapter = factory.createAdapter(adapter_factory_1.AdapterType.EVM);
        }
    }
    async initialize() {
        console.log(`🚀 Initializing blockchain integration (${this.config.mode} mode)...`);
        try {
            // PHASE 2B: Use aligned connect method
            await this.adapter.connect();
            // PHASE 2B: Use aligned connection check
            const isConnected = await this.adapter.isConnectedToNode();
            if (!isConnected) {
                throw new Error('Failed to connect to blockchain network');
            }
            // Initialize contracts if using Rebased
            if (this.adapter instanceof rebased_adapter_1.RebasedAdapter && 'initializeSystem' in this.adapter) {
                await this.adapter.initializeSystem();
            }
            // Set up auto-sync if enabled
            if (this.config.autoSync) {
                this.startAutoSync();
            }
            this.isInitialized = true;
            console.log('✅ Blockchain integration initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize blockchain integration:', error);
            throw error;
        }
    }
    async shutdown() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        await this.adapter.disconnect();
        this.isInitialized = false;
        console.log('🔌 Blockchain integration shut down');
    }
    // ========== User Management ==========
    async createUser(address) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Use aligned TokenEngine method for user creation
            const result = await this.tokenEngine.createUserAccount(address);
            if (!result.success) {
                throw new Error(`Failed to create user account: ${result.userId}`);
            }
            // PHASE 2B: Update reputation using aligned method
            await this.reputationEngine.updateUserReputation(address, {
                userId: address,
                reputationScore: 0,
                totalRecommendations: 0,
                upvotesReceived: 0,
                verificationLevel: 'basic',
                followers: 0,
                following: 0,
                socialConnections: [],
                tokensEarned: 0,
                stakingBalance: 0,
                stakingTier: 'explorer',
                ledger: {
                    objectId: '',
                    commitNumber: 0
                }
            });
            // Return user profile
            return await this.getUserProfile(address);
        }
        catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }
    async getUserProfile(address) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Use aligned method names
            const balance = await this.adapter.getBalance(address);
            const trustScore = await this.adapter.getUserTrustScore(address);
            const reputationScore = await this.adapter.getUserReputationScore(address);
            // Get stakes info if available
            let stakes = [];
            if ('getStakeInfo' in this.adapter) {
                stakes = await this.adapter.getStakeInfo(address);
            }
            return {
                address,
                liquidBalance: balance.confirmed,
                stakedBalance: balance.pending, // Using pending as staked for now
                pendingRewards: 0, // Would be calculated separately
                lifetimeRewards: 0, // Would be tracked separately
                trustScore,
                reputationScore: typeof reputationScore === 'object' ? reputationScore.reputationScore : reputationScore,
                stakes,
            };
        }
        catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }
    // ========== Token Operations ==========
    async stakeTokens(userAddress, amount, stakeType, lockPeriodMonths) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Use aligned TokenEngine method
            const result = await this.tokenEngine.lockTokens(userAddress, amount, lockPeriodMonths * 30 * 24 * 60 * 60 * 1000);
            if (result.success) {
                return {
                    success: true,
                    transactionHash: `stake_${Date.now()}_${userAddress}`
                };
            }
            else {
                return { success: false, error: 'Failed to stake tokens' };
            }
        }
        catch (error) {
            console.error('Failed to stake tokens:', error);
            return { success: false, error: error.message };
        }
    }
    async claimRewards(userAddress) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Use aligned method name
            const result = await this.adapter.claimUserRewards(userAddress);
            if (result.success) {
                // Sync with local engines
                await this.syncUserData(userAddress);
                return {
                    success: true,
                    transactionHash: result.data?.hash || result.data?.transactionHash,
                    amount: 0, // Would parse from result data
                };
            }
            else {
                return { success: false, error: 'Failed to claim rewards' };
            }
        }
        catch (error) {
            console.error('Failed to claim rewards:', error);
            return { success: false, error: error.message };
        }
    }
    // ========== Recommendation & Reward Operations ==========
    async submitRecommendation(userAddress, recommendationData) {
        this.ensureInitialized();
        try {
            // Create recommendation in existing engine
            const recommendation = await this.recommendationEngine.submitRecommendation(userAddress, {
                ...recommendationData,
                author: userAddress
            });
            const actionId = recommendation.id || `rec_${Date.now()}`;
            // PHASE 2B: Submit action for reward using aligned method
            const result = await this.adapter.submitActionForReward(userAddress, 'create_recommendation', { recommendationId: actionId });
            if (result.success) {
                return {
                    success: true,
                    actionId,
                    transactionHash: result.data?.hash || result.data?.transactionHash,
                };
            }
            else {
                return { success: false, error: 'Failed to submit action for reward' };
            }
        }
        catch (error) {
            console.error('Failed to submit recommendation:', error);
            return { success: false, error: error.message };
        }
    }
    async endorseRecommendation(endorserAddress, actionId, socialDistance = 1) {
        this.ensureInitialized();
        try {
            // Get reward info if available
            if ('getRewardInfo' in this.adapter) {
                await this.adapter.getRewardInfo(actionId);
            }
            // Add endorsement through reputation engine
            if ('addEndorsement' in this.reputationEngine) {
                await this.reputationEngine.addEndorsement(endorserAddress, actionId, 'positive');
            }
            return {
                success: true,
                transactionHash: `endorsement_${Date.now()}_${endorserAddress}`,
                newTrustScore: 0.3, // Would be calculated based on actual endorsement
            };
        }
        catch (error) {
            console.error('Failed to endorse recommendation:', error);
            return { success: false, error: error.message };
        }
    }
    async checkRewardEligibility(actionId) {
        this.ensureInitialized();
        try {
            if ('getRewardInfo' in this.adapter) {
                const rewardInfo = await this.adapter.getRewardInfo(actionId);
                return {
                    actionId,
                    trustScore: rewardInfo.current_trust_score / 100, // Convert from 0-100 to 0-1
                    endorsements: rewardInfo.endorsement_count,
                    potentialReward: rewardInfo.potential_reward / 1000000, // Convert from micro-tokens
                    isEligible: rewardInfo.is_eligible,
                    canClaim: rewardInfo.is_eligible,
                };
            }
            else {
                // Default response when adapter doesn't have getRewardInfo
                return {
                    actionId,
                    trustScore: 0.3,
                    endorsements: 2,
                    potentialReward: 1.5,
                    isEligible: true,
                    canClaim: true,
                };
            }
        }
        catch (error) {
            console.error('Failed to check reward eligibility:', error);
            return {
                actionId,
                trustScore: 0,
                endorsements: 0,
                potentialReward: 0,
                isEligible: false,
                canClaim: false,
            };
        }
    }
    async claimRecommendationReward(userAddress, actionId) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Use aligned method name
            const result = await this.adapter.claimUserRewards(userAddress);
            if (result.success) {
                // Sync user data after reward claim
                await this.syncUserData(userAddress);
                return {
                    success: true,
                    transactionHash: result.data?.hash || result.data?.transactionHash,
                    rewardAmount: 0, // Would parse from events/result data
                };
            }
            else {
                return { success: false, error: 'Failed to claim recommendation reward' };
            }
        }
        catch (error) {
            console.error('Failed to claim recommendation reward:', error);
            return { success: false, error: error.message };
        }
    }
    // ========== Governance Operations ==========
    async createProposal(proposerAddress, title, description, proposalType) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Create proposal through governance engine with proper signature
            const proposal = await this.governanceEngine.createProposal({
                title,
                description,
                type: proposalType,
                proposer: proposerAddress,
                createdAt: new Date(),
                status: 'active'
            });
            return {
                success: true,
                proposalId: proposal.id,
                transactionHash: proposal.transactionHash || `proposal_${Date.now()}_${proposerAddress}`,
            };
        }
        catch (error) {
            console.error('Failed to create proposal:', error);
            return { success: false, error: error.message };
        }
    }
    async vote(voterAddress, proposalId, support) {
        this.ensureInitialized();
        try {
            // PHASE 2B: Vote through governance engine with proper method signature
            await this.governanceEngine.submitVote(voterAddress, proposalId, support ? 'for' : 'against');
            return {
                success: true,
                transactionHash: `vote_${Date.now()}_${voterAddress}`,
                votingPower: 1, // Would calculate based on stake and reputation
            };
        }
        catch (error) {
            console.error('Failed to vote:', error);
            return { success: false, error: error.message };
        }
    }
    // ========== Synchronization ==========
    async syncUserData(userAddress) {
        try {
            // PHASE 2B: Sync using aligned method names
            const balance = await this.adapter.getBalance(userAddress);
            const trustScore = await this.adapter.getUserTrustScore(userAddress);
            const reputationScore = await this.adapter.getUserReputationScore(userAddress);
            // Update token data
            if ('updateUserBalance' in this.tokenEngine) {
                await this.tokenEngine.updateUserBalance(userAddress, {
                    balance: balance.confirmed,
                    staked: balance.pending,
                    pendingRewards: 0,
                    lifetimeEarned: 0,
                });
            }
            // Update reputation data
            await this.reputationEngine.updateUserReputation(userAddress, {
                userId: userAddress,
                reputationScore: typeof reputationScore === 'object' ? reputationScore.reputationScore : reputationScore,
                totalRecommendations: 0,
                upvotesReceived: 0,
                verificationLevel: 'basic',
                followers: 0,
                following: 0,
                socialConnections: [],
                tokensEarned: 0,
                stakingBalance: balance.pending,
                stakingTier: 'explorer',
                ledger: {
                    objectId: '',
                    commitNumber: 0
                }
            });
        }
        catch (error) {
            console.error('Failed to sync user data:', error);
        }
    }
    startAutoSync() {
        const interval = this.config.syncInterval || 30000; // Default 30 seconds
        this.syncInterval = setInterval(async () => {
            try {
                // Auto-sync logic would go here
                console.log('🔄 Running auto-sync...');
            }
            catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }, interval);
        return Promise.resolve();
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Blockchain integration not initialized');
        }
    }
    // ========== Health & Monitoring ==========
    async getSystemHealth() {
        try {
            // PHASE 2B: Use aligned connection method
            const connected = await this.adapter.isConnectedToNode();
            const networkInfo = await this.adapter.getNetworkInfo();
            return {
                adapter: this.config.mode,
                connected,
                latestBlock: networkInfo.blockHeight,
                syncStatus: this.isInitialized ? 'ready' : 'initializing',
            };
        }
        catch (error) {
            return {
                adapter: this.config.mode,
                connected: false,
                latestBlock: 0,
                syncStatus: 'error',
            };
        }
    }
    async getSystemStats() {
        try {
            if ('getCurrentRewardRate' in this.adapter && 'getHalvingInfo' in this.adapter) {
                const rewardRate = await this.adapter.getCurrentRewardRate();
                const halvingInfo = await this.adapter.getHalvingInfo();
                return {
                    currentRewardRate: rewardRate,
                    totalDistributed: halvingInfo.totalDistributed,
                    halvingPeriod: halvingInfo.currentPeriod,
                    activeUsers: 0, // Would track separately
                };
            }
            else {
                // Default stats when methods not available
                return {
                    currentRewardRate: 1000,
                    totalDistributed: 0,
                    halvingPeriod: 0,
                    activeUsers: 0,
                };
            }
        }
        catch (error) {
            console.error('Failed to get system stats:', error);
            return {
                currentRewardRate: 0,
                totalDistributed: 0,
                halvingPeriod: 0,
                activeUsers: 0,
            };
        }
    }
}
exports.BlockchainIntegrationService = BlockchainIntegrationService;
//# sourceMappingURL=blockchain-integration.js.map