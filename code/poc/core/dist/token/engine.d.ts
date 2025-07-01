/**
 * Token Reward Engine
 *
 * Core business logic for token rewards, distribution, and token economics
 * Based on Technical Specifications A.3.2
 */
import { ChainAdapter } from '../types/chain';
import { TokenTransaction, TransactionType, RewardCalculation, RewardSystemParams, TokenBalance } from '../types/token';
/**
 * Options for the token engine
 */
export interface TokenEngineOptions {
    /**
     * Chain ID
     */
    chainId?: string;
    /**
     * Reward system parameters
     */
    rewardParams?: RewardSystemParams;
    /**
     * Sponsor wallet for fee payments
     */
    sponsorWallet?: string;
    /**
     * Reserve address for token minting
     */
    reserveAddress?: string;
    /**
     * Burn address for token burning
     */
    burnAddress?: string;
    /**
     * Treasury address for protocol fees
     */
    treasuryAddress?: string;
    /**
     * Fee split parameters (in percentage)
     */
    feeSplit?: {
        /**
         * Percentage that goes to burn (default: 75%)
         */
        burnPercentage: number;
        /**
         * Percentage that goes to treasury (default: 25%)
         */
        treasuryPercentage: number;
    };
}
/**
 * Implementation of the Token Reward Engine
 * Handles token rewards, distribution, and token economics
 */
export declare class TokenEngine {
    private adapter;
    private options;
    private chainId;
    /**
     * Create a new TokenEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param options Engine options
     */
    constructor(adapter: ChainAdapter, options?: TokenEngineOptions);
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    initialize(): Promise<void>;
    /**
     * Get a user's token balance
     *
     * @param userId User's public key or identifier
     * @returns Token balance
     */
    getTokenBalance(userId: string): Promise<TokenBalance>;
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
    createTransaction(sender: string, recipient: string, amount: number, type: TransactionType, actionReference?: string): Promise<TokenTransaction>;
    /**
     * Calculate and issue reward for a recommendation
     *
     * @param recommendationId ID of the recommendation
     * @param authorId Author of the recommendation
     * @param trustScore Trust score of the recommendation
     * @param reputationFactor Author's reputation factor
     * @returns Reward calculation and transaction
     */
    issueRecommendationReward(recommendationId: string, authorId: string, trustScore: number, reputationFactor?: number): Promise<{
        calculation: RewardCalculation;
        transaction: TokenTransaction;
    }>;
    /**
     * Issue upvote reward to the author
     *
     * @param recommendationId ID of the recommendation
     * @param authorId Author of the recommendation
     * @param upvoteCount Number of upvotes
     * @returns Reward transaction if issued, null if not eligible
     */
    issueUpvoteReward(recommendationId: string, authorId: string, upvoteCount: number): Promise<TokenTransaction | null>;
    /**
     * Issue curator reward for a list
     *
     * @param listId ID of the curated list
     * @param curatorId Curator's ID
     * @param trustScore Trust score of the list
     * @returns Reward transaction if eligible
     */
    issueCuratorReward(listId: string, curatorId: string, trustScore: number): Promise<TokenTransaction | null>;
    /**
     * Calculate curator's share of item rewards
     *
     * @param listId ID of the curated list
     * @param curatorId Curator's ID
     * @param itemId ID of the item in the list that earned rewards
     * @param originalReward Original reward amount
     * @returns Curator share transaction if eligible
     */
    issueCuratorShare(listId: string, curatorId: string, itemId: string, originalReward: number): Promise<TokenTransaction | null>;
    /**
     * Process a service fee and apply the fee split
     *
     * @param amount Fee amount
     * @param reference Reference to the related action
     * @returns Transactions for burn and treasury
     */
    processServiceFee(amount: number, reference: string): Promise<{
        burnTx: TokenTransaction;
        treasuryTx: TokenTransaction;
    }>;
    /**
     * Transfer tokens between users
     *
     * @param senderId Sender's ID
     * @param recipientId Recipient's ID
     * @param amount Amount to transfer
     * @param reference Optional reference
     * @returns Transfer transaction
     */
    transferTokens(senderId: string, recipientId: string, amount: number, reference?: string): Promise<TokenTransaction>;
    /**
     * Stake tokens
     *
     * @param userId User's ID
     * @param amount Amount to stake
     * @param duration Staking duration in days
     * @returns Stake transaction
     */
    stakeTokens(userId: string, amount: number, duration: number): Promise<TokenTransaction>;
    /**
     * Unstake tokens
     *
     * @param userId User's ID
     * @param amount Amount to unstake
     * @param stakingId Reference to original staking transaction
     * @returns Unstake transaction
     */
    unstakeTokens(userId: string, amount: number, stakingId: string): Promise<TokenTransaction>;
    /**
     * Get transaction by ID
     *
     * @param transactionId Transaction ID
     * @returns Transaction if found, null otherwise
     */
    getTransaction(transactionId: string): Promise<TokenTransaction | null>;
    /**
     * Get all transactions for a user
     *
     * @param userId User's ID
     * @param type Optional transaction type filter
     * @param pagination Pagination options
     * @returns Transactions for the user
     */
    getUserTransactions(userId: string, type?: TransactionType, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        transactions: TokenTransaction[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Get rewards issued for a specific action
     *
     * @private
     * @param actionReference Action reference
     * @param type Transaction type
     * @returns Total rewards issued
     */
    private getRewardsIssuedForAction;
    /**
     * Update user balances for a transaction
     *
     * @private
     * @param sender Sender's ID
     * @param recipient Recipient's ID
     * @param amount Transaction amount
     * @param type Transaction type
     */
    private updateBalances;
    /**
     * Update staked balance for a user
     *
     * @private
     * @param userId User's ID
     * @param amount Amount to stake/unstake
     * @param isStaking Whether staking (true) or unstaking (false)
     */
    private updateStakedBalance;
}
