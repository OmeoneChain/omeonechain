"use strict";
/**
 * blockchain-reputation.ts - Blockchain Integration Service
 *
 * Location: code/poc/core/src/services/blockchain-reputation.ts
 *
 * Service layer connecting reputation engine to IOTA Rebased blockchain
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainReputationService = void 0;
/**
 * Service for blockchain reputation operations
 */
class BlockchainReputationService {
    constructor(adapter, reputationEngine, contractAddresses) {
        this.adapter = adapter;
        this.reputationEngine = reputationEngine;
        this.contractAddresses = contractAddresses;
    }
    /**
     * Update user reputation on blockchain
     */
    async updateUserReputationOnChain(userId, reputationData) {
        try {
            // Prepare transaction data
            const transactionData = {
                from: userId,
                to: this.contractAddresses.reputation,
                data: JSON.stringify({
                    function: 'update_user_reputation',
                    args: [
                        userId,
                        reputationData.reputationScore,
                        reputationData.socialConnections,
                        reputationData.verificationLevel,
                        reputationData.lastUpdated
                    ]
                }),
                value: '0',
                gasLimit: '100000'
            };
            // Execute transaction through adapter
            const result = await this.adapter.submitTransaction(transactionData, {});
            return {
                transactionId: result.transactionHash || result.hash || 'unknown',
                blockHeight: result.blockNumber || 0,
                timestamp: new Date().toISOString(),
                gasUsed: result.gasUsed || 0,
                success: result.status === 'success' || result.status === 'confirmed',
                events: result.events || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error updating reputation on chain:', error);
            throw new Error(`Blockchain reputation update failed: ${error.message}`);
        }
    }
    /**
     * Submit social connection on blockchain
     */
    async submitSocialConnection(followerId, followedId, trustWeight) {
        try {
            const transactionData = {
                from: followerId,
                to: this.contractAddresses.socialGraph,
                data: JSON.stringify({
                    function: 'add_connection',
                    args: [
                        followerId,
                        followedId,
                        Math.floor(trustWeight * 1000), // Convert to integer (0.75 -> 750)
                        1, // Direct connection type
                        Date.now().toString()
                    ]
                }),
                value: '0',
                gasLimit: '100000'
            };
            const result = await this.adapter.submitTransaction(transactionData, {});
            return {
                transactionId: result.transactionHash || result.hash || 'unknown',
                blockHeight: result.blockNumber || 0,
                timestamp: new Date().toISOString(),
                gasUsed: result.gasUsed || 0,
                success: result.status === 'success' || result.status === 'confirmed',
                events: result.events || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error submitting social connection:', error);
            throw new Error(`Blockchain social connection failed: ${error.message}`);
        }
    }
    /**
     * Remove social connection on blockchain
     */
    async removeSocialConnection(followerId, followedId) {
        try {
            const transactionData = {
                from: followerId,
                to: this.contractAddresses.socialGraph,
                data: JSON.stringify({
                    function: 'remove_connection',
                    args: [followerId, followedId]
                }),
                value: '0',
                gasLimit: '100000'
            };
            const result = await this.adapter.submitTransaction(transactionData, {});
            return {
                transactionId: result.transactionHash || result.hash || 'unknown',
                blockHeight: result.blockNumber || 0,
                timestamp: new Date().toISOString(),
                gasUsed: result.gasUsed || 0,
                success: result.status === 'success' || result.status === 'confirmed',
                events: result.events || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error removing social connection:', error);
            throw new Error(`Blockchain connection removal failed: ${error.message}`);
        }
    }
    /**
     * Submit community verification on blockchain
     */
    async submitCommunityVerification(verification) {
        try {
            const transactionData = {
                from: verification.verifierId,
                to: this.contractAddresses.reputation,
                data: JSON.stringify({
                    function: 'submit_community_verification',
                    args: [
                        verification.verifierId,
                        verification.targetUserId,
                        verification.evidence,
                        verification.category,
                        verification.timestamp,
                        verification.verificationHash
                    ]
                }),
                value: '0',
                gasLimit: '100000'
            };
            const result = await this.adapter.submitTransaction(transactionData, {});
            return {
                transactionId: result.transactionHash || result.hash || 'unknown',
                blockHeight: result.blockNumber || 0,
                timestamp: new Date().toISOString(),
                gasUsed: result.gasUsed || 0,
                success: result.status === 'success' || result.status === 'confirmed',
                events: result.events || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error submitting verification:', error);
            throw new Error(`Blockchain verification submission failed: ${error.message}`);
        }
    }
    /**
     * Claim discovery incentive bonus on blockchain
     */
    async claimDiscoveryBonus(userId, campaignId, recommendationIds) {
        try {
            const transactionData = {
                from: userId,
                to: this.contractAddresses.discoveryIncentives,
                data: JSON.stringify({
                    function: 'claim_discovery_bonus',
                    args: [
                        userId,
                        campaignId,
                        recommendationIds,
                        Date.now().toString()
                    ]
                }),
                value: '0',
                gasLimit: '150000'
            };
            const result = await this.adapter.submitTransaction(transactionData, {});
            return {
                transactionId: result.transactionHash || result.hash || 'unknown',
                blockHeight: result.blockNumber || 0,
                timestamp: new Date().toISOString(),
                gasUsed: result.gasUsed || 0,
                success: result.status === 'success' || result.status === 'confirmed',
                events: result.events || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error claiming discovery bonus:', error);
            throw new Error(`Blockchain bonus claim failed: ${error.message}`);
        }
    }
    /**
     * Get on-chain reputation data
     */
    async getOnChainReputation(userId) {
        try {
            // Query blockchain state using adapter's queryState method
            const result = await this.adapter.queryState({
                contract: this.contractAddresses.reputation, // Fixed: Use as any to avoid StateQuery property error
                method: 'getUserReputation',
                params: [userId]
            });
            if (!result.data) { // Fixed: Use as any for data property
                // Return default data if no on-chain reputation found
                return {
                    reputationScore: 0,
                    verificationLevel: 0,
                    socialConnections: 0,
                    lastUpdated: new Date().toISOString(),
                    onChainHistory: [],
                };
            }
            const content = result.data; // Fixed: Use as any for data property
            return {
                reputationScore: (content.reputation_score || 0) / 100, // Convert from integer
                verificationLevel: content.verification_level || 0,
                socialConnections: content.connection_count || 0,
                lastUpdated: content.last_updated || new Date().toISOString(),
                onChainHistory: content.history || [],
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error getting on-chain reputation:', error);
            // Return default data instead of throwing
            return {
                reputationScore: 0,
                verificationLevel: 0,
                socialConnections: 0,
                lastUpdated: new Date().toISOString(),
                onChainHistory: [],
            };
        }
    }
    /**
     * Get active discovery campaigns from blockchain
     */
    async getActiveDiscoveryCampaigns(region, category) {
        try {
            // Query active campaigns using adapter's queryState method
            const result = await this.adapter.queryState({
                contract: this.contractAddresses.discoveryIncentives, // Fixed: Use as any to avoid StateQuery property error
                method: 'getActiveCampaigns',
                params: [region || '', category || '']
            });
            const campaigns = [];
            if (result.data && Array.isArray(result.data)) { // Fixed: Use as any for data property
                for (const campaign of result.data) {
                    // Check if campaign is still active
                    const expiresAt = new Date(campaign.expires_at);
                    if (expiresAt < new Date())
                        continue;
                    campaigns.push({
                        campaignId: campaign.campaign_id,
                        region: campaign.region,
                        category: campaign.category,
                        bonusMultiplier: (campaign.bonus_multiplier || 100) / 100, // Convert from integer
                        targetRecommendations: campaign.target_recommendations || 1,
                        expiresAt: campaign.expires_at,
                        minTrustScore: (campaign.min_trust_score || 0) / 100,
                        bonusPool: BigInt(campaign.bonus_pool || 0),
                    });
                }
            }
            return campaigns;
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error getting discovery campaigns:', error);
            return []; // Return empty array instead of throwing
        }
    }
    /**
     * Sync off-chain reputation with on-chain data
     */
    async syncReputationData(userId) {
        try {
            // Get both off-chain and on-chain data
            const [offChainRep, onChainRep] = await Promise.all([
                this.reputationEngine.getUserReputation(userId),
                this.getOnChainReputation(userId)
            ]);
            const discrepancies = [];
            // Check for discrepancies
            const scoreDiff = Math.abs(offChainRep.reputationScore - onChainRep.reputationScore * 1000);
            if (scoreDiff > 10) { // Allow small rounding differences
                discrepancies.push(`Reputation score differs: off-chain ${offChainRep.reputationScore}, on-chain ${onChainRep.reputationScore * 1000}`);
            }
            const verificationLevelMap = { 'basic': 0, 'verified': 1, 'expert': 2 };
            const expectedLevel = verificationLevelMap[offChainRep.verificationLevel] || 0;
            if (expectedLevel !== onChainRep.verificationLevel) {
                discrepancies.push(`Verification level differs: off-chain ${offChainRep.verificationLevel}, on-chain ${onChainRep.verificationLevel}`);
            }
            // If there are discrepancies, update on-chain data
            let synced = discrepancies.length === 0;
            if (!synced) {
                console.log(`Syncing reputation for user ${userId}. Discrepancies:`, discrepancies);
                await this.updateUserReputationOnChain(userId, {
                    userId,
                    reputationScore: offChainRep.reputationScore,
                    socialConnections: [], // Would need to fetch actual connections
                    verificationLevel: expectedLevel,
                    lastUpdated: new Date().toISOString(),
                });
                synced = true;
            }
            return {
                synced,
                discrepancies,
                lastSync: new Date().toISOString(),
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error syncing reputation data:', error);
            return {
                synced: false,
                discrepancies: [`Sync failed: ${error.message}`],
                lastSync: new Date().toISOString(),
            };
        }
    }
    /**
     * Monitor blockchain events for reputation updates
     */
    async startEventMonitoring(onReputationUpdate, onSocialConnection, onVerificationSubmission) {
        try {
            // Use adapter's watchEvents method
            const eventIterator = this.adapter.watchEvents({
                addresses: [
                    this.contractAddresses.reputation,
                    this.contractAddresses.socialGraph
                ],
                topics: ['ReputationUpdated', 'ConnectionAdded', 'ConnectionRemoved', 'VerificationSubmitted']
            });
            // Start monitoring in background
            const processEvents = async () => {
                try {
                    for await (const event of eventIterator) {
                        const eventType = event.type || '';
                        if (eventType.includes('ReputationUpdated')) {
                            onReputationUpdate(event);
                        }
                        else if (eventType.includes('Connection')) {
                            onSocialConnection(event);
                        }
                        else if (eventType.includes('VerificationSubmitted')) {
                            onVerificationSubmission(event);
                        }
                    }
                }
                catch (error) { // Fixed: Type assertion for error
                    console.error('Event monitoring error:', error);
                }
            };
            // Start processing events
            processEvents();
            // Return cleanup function
            return () => {
                // Note: In a real implementation, you'd want to properly cleanup the iterator
                console.log('Stopping event monitoring');
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Error starting event monitoring:', error);
            // Return a no-op cleanup function
            return () => { };
        }
    }
    /**
     * Health check for blockchain connection
     */
    async healthCheck() {
        try {
            // Use adapter's getNetworkInfo method
            const networkInfo = await this.adapter.getNetworkInfo();
            // Check if contracts are deployed by querying one of them
            let contractsDeployed = false;
            try {
                await this.adapter.queryState({
                    contract: this.contractAddresses.reputation, // Fixed: Use as any to avoid StateQuery property error
                    method: 'getContractInfo',
                    params: []
                });
                contractsDeployed = true;
            }
            catch {
                contractsDeployed = false;
            }
            return {
                connected: true,
                blockHeight: networkInfo.blockHeight || 0,
                contractsDeployed,
                lastTransactionTime: new Date().toISOString(),
                networkInfo: {
                    chainId: networkInfo.chainId || 'unknown',
                    networkType: networkInfo.networkType || 'unknown',
                    nodeVersion: networkInfo.nodeVersion || 'unknown',
                },
            };
        }
        catch (error) { // Fixed: Type assertion for error
            console.error('Blockchain health check failed:', error);
            return {
                connected: false,
                blockHeight: 0,
                contractsDeployed: false,
                lastTransactionTime: 'unknown',
                networkInfo: {
                    chainId: 'unknown',
                    networkType: 'unknown',
                    nodeVersion: 'unknown',
                },
            };
        }
    }
}
exports.BlockchainReputationService = BlockchainReputationService;
exports.default = BlockchainReputationService;
//# sourceMappingURL=blockchain-reputation.js.map