"use strict";
/**
 * Token Reward Engine
 *
 * Core business logic for token rewards, distribution, and token economics
 * Based on Technical Specifications A.3.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenEngine = void 0;
const token_adapters_1 = require("../adapters/types/token-adapters");
const token_1 = require("../types/token");
const uuid_1 = require("uuid");
/**
 * Default reward parameters
 */
const DEFAULT_REWARD_PARAMS = {
    baseRecommendationReward: 1,
    upvoteReward: {
        count: 10,
        amount: 1
    },
    maxUpvoteReward: 5,
    curationReward: 1,
    curatorRewardShare: 25,
    abuseReportReward: 1,
    reporterSlashShare: 10,
    currentHalvingEpoch: 0,
    halvingFactor: 0.5
};
/**
 * Default token engine options
 */
const DEFAULT_OPTIONS = {
    rewardParams: DEFAULT_REWARD_PARAMS,
    burnAddress: '0x000000000000000000000000000000000000dEaD',
    feeSplit: {
        burnPercentage: 75,
        treasuryPercentage: 25
    }
};
/**
 * Implementation of the Token Reward Engine
 * Handles token rewards, distribution, and token economics
 */
class TokenEngine {
    /**
     * Create a new TokenEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param options Engine options
     */
    constructor(adapter, options = {}) {
        this.chainId = null;
        this.adapter = adapter;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        // Merge reward parameters
        if (options.rewardParams) {
            this.options.rewardParams = {
                ...DEFAULT_REWARD_PARAMS,
                ...options.rewardParams
            };
        }
        // Validate fee split
        if (options.feeSplit) {
            const { burnPercentage, treasuryPercentage } = options.feeSplit;
            // Ensure percentages sum to 100
            if (burnPercentage + treasuryPercentage !== 100) {
                throw new Error('Fee split percentages must sum to 100');
            }
        }
    }
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    async initialize() {
        // Get chain ID from adapter or options
        this.chainId = this.options.chainId || await this.adapter.getWalletAddress();
    }
    /**
     * Get a user's token balance
     *
     * @param userId User's public key or identifier
     * @returns Token balance
     */
    async getTokenBalance(userId) {
        try {
            // Query the blockchain for the user's balance with updated interface
            const result = await this.adapter.queryState('token_balance', userId);
            return result.data;
        }
        catch (error) {
            // Return default balance if not found
            return {
                userId,
                available: 0,
                staked: 0,
                pendingRewards: 0
            };
        }
    }
    /**
     * Create a token transaction
     *
     * @param sender Sender's public key or identifier
     * @param recipient Recipient's public key or identifier
     * @param amount Amount of tokens
     * @param type Transaction type
     * @param actionReference Optional reference to related action
     * @returns Created transaction
     */
    async createTransaction(sender, recipient, amount, type, actionReference) {
        // Validate sender has sufficient balance for non-reward transactions
        if (type !== token_1.TransactionType.REWARD && sender !== this.options.reserveAddress) {
            const senderBalance = await this.getTokenBalance(sender);
            if (senderBalance.available < amount) {
                throw new Error(`Insufficient balance: ${senderBalance.available} < ${amount}`);
            }
        }
        // Create transaction data
        const transactionId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const transactionData = {
            transactionId,
            sender,
            recipient,
            amount,
            timestamp,
            type,
            actionReference
        };
        // Determine the action based on transaction type
        let action;
        switch (type) {
            case token_1.TransactionType.TRANSFER:
                action = token_adapters_1.TokenActionType.TRANSFER;
                break;
            case token_1.TransactionType.REWARD:
                action = token_adapters_1.TokenActionType.CLAIM_REWARD;
                break;
            case token_1.TransactionType.STAKE:
                action = token_adapters_1.TokenActionType.STAKE;
                break;
            case token_1.TransactionType.UNSTAKE:
                action = token_adapters_1.TokenActionType.UNSTAKE;
                break;
            case token_1.TransactionType.BURN:
                action = token_adapters_1.TokenActionType.BURN;
                break;
            default:
                action = token_adapters_1.TokenActionType.TRANSFER;
        }
        // Submit transaction with updated interface
        const txPayload = {
            type: 'token',
            action: token_adapters_1.tokenActionMap[action],
            requiresSignature: type !== token_1.TransactionType.REWARD, // Rewards don't require signature
            data: transactionData
        };
        const txResult = await this.adapter.submitTransaction(txPayload);
        // Update balances
        await this.updateBalances(sender, recipient, amount, type);
        // Return complete transaction with tangle reference
        return {
            ...transactionData,
            tangle: {
                objectId: txResult.objectId || txResult.transactionId,
                commitNumber: txResult.commitNumber || 0
            }
        };
    }
    /**
     * Calculate and issue reward for a recommendation
     *
     * @param recommendationId ID of the recommendation
     * @param authorId Author of the recommendation
     * @param trustScore Trust score of the recommendation
     * @param reputationFactor Author's reputation factor
     * @returns Reward calculation and transaction
     */
    async issueRecommendationReward(recommendationId, authorId, trustScore, reputationFactor = 1.0) {
        // Check if the recommendation meets the minimum trust threshold
        const minTrustThreshold = this.options.rewardParams?.minTrustThreshold || 0.25;
        if (trustScore < minTrustThreshold) {
            throw new Error(`Trust score below minimum threshold: ${trustScore} < ${minTrustThreshold}`);
        }
        // Calculate base reward
        const baseReward = this.options.rewardParams?.baseRecommendationReward || 1;
        // Calculate quality multiplier based on trust score
        // Cap at max trust multiplier (default: 3)
        const maxMultiplier = this.options.rewardParams?.maxTrustMultiplier || 3;
        const qualityMultiplier = Math.min(trustScore * 4, maxMultiplier);
        // Estimate base fee - updating to use new adapter interface
        const baseFeeInMicroIOTA = 0.05; // Default value as adapter doesn't have direct estimateFee
        // Calculate total reward
        const totalReward = baseReward * qualityMultiplier * reputationFactor - baseFeeInMicroIOTA;
        // Create reward calculation record
        const calculation = {
            recommendationId,
            authorId,
            baseReward,
            qualityMultiplier,
            reputationFactor,
            baseFeeInMicroIOTA,
            totalReward: Math.max(0, totalReward)
        };
        // Issue reward transaction
        const transaction = await this.createTransaction(this.options.reserveAddress || 'SYSTEM', authorId, calculation.totalReward, token_1.TransactionType.REWARD, recommendationId);
        return { calculation, transaction };
    }
    /**
     * Issue upvote reward to the author
     *
     * @param recommendationId ID of the recommendation
     * @param authorId Author of the recommendation
     * @param upvoteCount Number of upvotes
     * @returns Reward transaction if issued, null if not eligible
     */
    async issueUpvoteReward(recommendationId, authorId, upvoteCount) {
        // Check if the recommendation is eligible for upvote reward
        const upvoteRewardThreshold = this.options.rewardParams?.upvoteReward?.count || 10;
        const upvoteRewardAmount = this.options.rewardParams?.upvoteReward?.amount || 1;
        const maxUpvoteReward = this.options.rewardParams?.maxUpvoteReward || 5;
        if (upvoteCount < upvoteRewardThreshold) {
            return null; // Not enough upvotes yet
        }
        // Calculate how many new rewards to issue
        const rewardsAlreadyIssued = Math.floor(await this.getRewardsIssuedForAction(recommendationId, token_1.TransactionType.REWARD) / upvoteRewardAmount);
        const totalRewardsEligible = Math.min(Math.floor(upvoteCount / upvoteRewardThreshold), maxUpvoteReward / upvoteRewardAmount);
        const newRewardsToIssue = totalRewardsEligible - rewardsAlreadyIssued;
        if (newRewardsToIssue <= 0) {
            return null; // No new rewards to issue
        }
        // Issue reward transaction
        const rewardAmount = newRewardsToIssue * upvoteRewardAmount;
        return this.createTransaction(this.options.reserveAddress || 'SYSTEM', authorId, rewardAmount, token_1.TransactionType.REWARD, recommendationId);
    }
    /**
     * Issue curator reward for a list
     *
     * @param listId ID of the curated list
     * @param curatorId Curator's ID
     * @param trustScore Trust score of the list
     * @returns Reward transaction if eligible
     */
    async issueCuratorReward(listId, curatorId, trustScore) {
        // Check if the list meets criteria for curator reward
        const minTrustThreshold = this.options.rewardParams?.minTrustThreshold || 0.25;
        if (trustScore < minTrustThreshold) {
            return null; // Trust score too low
        }
        // Check if reward was already issued
        const existingRewards = await this.getRewardsIssuedForAction(listId, token_1.TransactionType.REWARD);
        if (existingRewards > 0) {
            return null; // Already rewarded
        }
        // Issue reward transaction
        const curationReward = this.options.rewardParams?.curationReward || 1;
        return this.createTransaction(this.options.reserveAddress || 'SYSTEM', curatorId, curationReward, token_1.TransactionType.REWARD, listId);
    }
    /**
     * Calculate curator's share of item rewards
     *
     * @param listId ID of the curated list
     * @param curatorId Curator's ID
     * @param itemId ID of the item in the list that earned rewards
     * @param originalReward Original reward amount
     * @returns Curator share transaction if eligible
     */
    async issueCuratorShare(listId, curatorId, itemId, originalReward) {
        // Calculate curator's share percentage
        const curatorSharePercentage = this.options.rewardParams?.curatorRewardShare || 25;
        // Calculate share amount
        const shareAmount = (originalReward * curatorSharePercentage) / 100;
        if (shareAmount <= 0) {
            return null; // Share too small
        }
        // Issue share transaction
        return this.createTransaction(this.options.reserveAddress || 'SYSTEM', curatorId, shareAmount, token_1.TransactionType.REWARD, `list:${listId}:item:${itemId}`);
    }
    /**
     * Process a service fee and apply the fee split
     *
     * @param amount Fee amount
     * @param reference Reference to the related action
     * @returns Transactions for burn and treasury
     */
    async processServiceFee(amount, reference) {
        // Calculate split amounts
        const burnPercentage = this.options.feeSplit?.burnPercentage || 75;
        const treasuryPercentage = this.options.feeSplit?.treasuryPercentage || 25;
        const burnAmount = (amount * burnPercentage) / 100;
        const treasuryAmount = (amount * treasuryPercentage) / 100;
        // Issue burn transaction
        const burnTx = await this.createTransaction(this.options.reserveAddress || 'SYSTEM', this.options.burnAddress || 'BURN', burnAmount, token_1.TransactionType.BURN, reference);
        // Issue treasury transaction
        const treasuryTx = await this.createTransaction(this.options.reserveAddress || 'SYSTEM', this.options.treasuryAddress || 'TREASURY', treasuryAmount, token_1.TransactionType.FEE, reference);
        return { burnTx, treasuryTx };
    }
    /**
     * Transfer tokens between users
     *
     * @param senderId Sender's ID
     * @param recipientId Recipient's ID
     * @param amount Amount to transfer
     * @param reference Optional reference
     * @returns Transfer transaction
     */
    async transferTokens(senderId, recipientId, amount, reference) {
        return this.createTransaction(senderId, recipientId, amount, token_1.TransactionType.TRANSFER, reference);
    }
    /**
     * Stake tokens
     *
     * @param userId User's ID
     * @param amount Amount to stake
     * @param duration Staking duration in days
     * @returns Stake transaction
     */
    async stakeTokens(userId, amount, duration) {
        // Validate user has sufficient balance
        const userBalance = await this.getTokenBalance(userId);
        if (userBalance.available < amount) {
            throw new Error(`Insufficient balance: ${userBalance.available} < ${amount}`);
        }
        // Calculate staking end time
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + duration);
        // Create stake transaction
        const transaction = await this.createTransaction(userId, userId, // Self-transaction for staking
        amount, token_1.TransactionType.STAKE, `stake:${duration}:${endTime.toISOString()}`);
        // Update user balance for staking
        await this.updateStakedBalance(userId, amount, true);
        return transaction;
    }
    /**
     * Unstake tokens
     *
     * @param userId User's ID
     * @param amount Amount to unstake
     * @param stakingId Reference to original staking transaction
     * @returns Unstake transaction
     */
    async unstakeTokens(userId, amount, stakingId) {
        // Validate user has sufficient staked balance
        const userBalance = await this.getTokenBalance(userId);
        if (userBalance.staked < amount) {
            throw new Error(`Insufficient staked balance: ${userBalance.staked} < ${amount}`);
        }
        // Validate staking period has ended
        const stakingTx = await this.getTransaction(stakingId);
        if (!stakingTx || stakingTx.type !== token_1.TransactionType.STAKE) {
            throw new Error(`Invalid staking transaction: ${stakingId}`);
        }
        // Parse staking end time from reference
        if (stakingTx.actionReference) {
            const endTimeMatch = stakingTx.actionReference.match(/stake:\d+:(.+)/);
            if (endTimeMatch && endTimeMatch[1]) {
                const endTime = new Date(endTimeMatch[1]);
                const now = new Date();
                if (now < endTime) {
                    throw new Error(`Staking period not ended yet. Ends at: ${endTime.toISOString()}`);
                }
            }
        }
        // Create unstake transaction
        const transaction = await this.createTransaction(userId, userId, // Self-transaction for unstaking
        amount, token_1.TransactionType.UNSTAKE, `unstake:${stakingId}`);
        // Update user balance for unstaking
        await this.updateStakedBalance(userId, amount, false);
        return transaction;
    }
    /**
     * Get transaction by ID
     *
     * @param transactionId Transaction ID
     * @returns Transaction if found, null otherwise
     */
    async getTransaction(transactionId) {
        try {
            // Query the blockchain for the transaction with updated interface
            const result = await this.adapter.queryState('token_transaction', transactionId);
            return result.data;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get all transactions for a user
     *
     * @param userId User's ID
     * @param type Optional transaction type filter
     * @param pagination Pagination options
     * @returns Transactions for the user
     */
    async getUserTransactions(userId, type, pagination = { offset: 0, limit: 20 }) {
        // Query the blockchain for the user's transactions with updated interface
        const filter = {
            $or: [
                { sender: userId },
                { recipient: userId }
            ]
        };
        if (type) {
            filter.type = type;
        }
        const result = await this.adapter.queryObjects('token_transaction', filter, pagination);
        // Transform results to expected format
        const transactions = result.map(state => state.data);
        const total = result.length;
        return {
            transactions,
            total,
            pagination: {
                offset: pagination.offset,
                limit: pagination.limit,
                hasMore: pagination.offset + transactions.length < total
            }
        };
    }
    /**
     * Get rewards issued for a specific action
     *
     * @private
     * @param actionReference Action reference
     * @param type Transaction type
     * @returns Total rewards issued
     */
    async getRewardsIssuedForAction(actionReference, type) {
        // Query the blockchain for the rewards issued with updated interface
        const result = await this.adapter.queryObjects('token_transaction', {
            actionReference,
            type
        });
        // Sum up all rewards
        return result.reduce((total, tx) => total + tx.data.amount, 0);
    }
    /**
     * Update user balances for a transaction
     *
     * @private
     * @param sender Sender's ID
     * @param recipient Recipient's ID
     * @param amount Transaction amount
     * @param type Transaction type
     */
    async updateBalances(sender, recipient, amount, type) {
        // Skip balance updates for certain transaction types
        if (type === token_1.TransactionType.STAKE ||
            type === token_1.TransactionType.UNSTAKE) {
            return; // Handled separately
        }
        // Update sender balance (except for rewards)
        if (sender !== 'SYSTEM' && sender !== this.options.reserveAddress) {
            const senderBalance = await this.getTokenBalance(sender);
            // Updated transaction submission
            const txPayload = {
                type: 'token',
                action: 'update_balance',
                requiresSignature: true,
                data: {
                    ...senderBalance,
                    available: Math.max(0, senderBalance.available - amount)
                }
            };
            await this.adapter.submitTransaction(txPayload);
        }
        // Update recipient balance (except for burn)
        if (recipient !== 'BURN' &&
            recipient !== this.options.burnAddress) {
            const recipientBalance = await this.getTokenBalance(recipient);
            // Updated transaction submission
            const txPayload = {
                type: 'token',
                action: 'update_balance',
                requiresSignature: false,
                data: {
                    ...recipientBalance,
                    available: recipientBalance.available + amount
                }
            };
            await this.adapter.submitTransaction(txPayload);
        }
    }
    /**
     * Update staked balance for a user
     *
     * @private
     * @param userId User's ID
     * @param amount Amount to stake/unstake
     * @param isStaking Whether staking (true) or unstaking (false)
     */
    async updateStakedBalance(userId, amount, isStaking) {
        const userBalance = await this.getTokenBalance(userId);
        if (isStaking) {
            // Staking: decrease available, increase staked
            const txPayload = {
                type: 'token',
                action: 'update_balance',
                requiresSignature: true,
                data: {
                    ...userBalance,
                    available: userBalance.available - amount,
                    staked: userBalance.staked + amount
                }
            };
            await this.adapter.submitTransaction(txPayload);
        }
        else {
            // Unstaking: increase available, decrease staked
            const txPayload = {
                type: 'token',
                action: 'update_balance',
                requiresSignature: true,
                data: {
                    ...userBalance,
                    available: userBalance.available + amount,
                    staked: userBalance.staked - amount
                }
            };
            await this.adapter.submitTransaction(txPayload);
        }
    }
}
exports.TokenEngine = TokenEngine;
//# sourceMappingURL=engine.js.map