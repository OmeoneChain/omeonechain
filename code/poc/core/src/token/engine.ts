/**
 * Token Reward Engine
 * 
 * Core business logic for token rewards, distribution, and token economics
 * Based on Technical Specifications A.3.2
 */

import { ChainAdapter, Transaction } from '../adapters/chain-adapter';
import { 
  TokenTransaction, 
  TransactionType, 
  RewardCalculation,
  RewardSystemParams,
  TokenBalance
} from '../types/token';
import { UserReputation } from '../types/reputation';
import { v4 as uuidv4 } from 'uuid';

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
 * Default reward parameters
 */
const DEFAULT_REWARD_PARAMS: RewardSystemParams = {
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
const DEFAULT_OPTIONS: TokenEngineOptions = {
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
export class TokenEngine {
  private adapter: ChainAdapter;
  private options: TokenEngineOptions;
  private chainId: string | null = null;
  
  /**
   * Create a new TokenEngine instance
   * 
   * @param adapter Chain adapter for blockchain interactions
   * @param options Engine options
   */
  constructor(
    adapter: ChainAdapter,
    options: TokenEngineOptions = {}
  ) {
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
  async initialize(): Promise<void> {
    // Get chain ID from adapter or options
    this.chainId = this.options.chainId || await this.adapter.getChainId();
  }
  
  /**
   * Get a user's token balance
   * 
   * @param userId User's public key or identifier
   * @returns Token balance
   */
  async getTokenBalance(userId: string): Promise<TokenBalance> {
    // Query the blockchain for the user's balance
    const result = await this.adapter.queryState<TokenBalance>({
      objectType: 'token_balance',
      filter: {
        userId
      }
    });
    
    if (result.results.length === 0) {
      // Return default balance if not found
      return {
        userId,
        available: 0,
        staked: 0,
        pendingRewards: 0
      };
    }
    
    return result.results[0];
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
  async createTransaction(
    sender: string,
    recipient: string,
    amount: number,
    type: TransactionType,
    actionReference?: string
  ): Promise<TokenTransaction> {
    // Validate sender has sufficient balance for non-reward transactions
    if (type !== TransactionType.REWARD && sender !== this.options.reserveAddress) {
      const senderBalance = await this.getTokenBalance(sender);
      
      if (senderBalance.available < amount) {
        throw new Error(`Insufficient balance: ${senderBalance.available} < ${amount}`);
      }
    }
    
    // Create transaction
    const transactionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const transaction: Omit<TokenTransaction, 'tangle'> = {
      transactionId,
      sender,
      recipient,
      amount,
      timestamp,
      type,
      actionReference
    };
    
    // Submit transaction
    const txResult = await this.adapter.submitTx({
      sender,
      payload: {
        objectType: 'token_transaction',
        action: 'transfer',
        data: transaction
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Update balances
    await this.updateBalances(sender, recipient, amount, type);
    
    // Return complete transaction with tangle reference
    return {
      ...transaction,
      tangle: {
        objectId: txResult.objectId || txResult.id,
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
  async issueRecommendationReward(
    recommendationId: string,
    authorId: string,
    trustScore: number,
    reputationFactor: number = 1.0
  ): Promise<{ calculation: RewardCalculation; transaction: TokenTransaction }> {
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
    
    // Estimate base fee
    const baseFeeInMicroIOTA = await this.adapter.estimateFee({
      sender: this.options.reserveAddress || 'SYSTEM',
      payload: { type: 'reward' }
    });
    
    // Calculate total reward
    const totalReward = baseReward * qualityMultiplier * reputationFactor - baseFeeInMicroIOTA;
    
    // Create reward calculation record
    const calculation: RewardCalculation = {
      recommendationId,
      authorId,
      baseReward,
      qualityMultiplier,
      reputationFactor,
      baseFeeInMicroIOTA,
      totalReward: Math.max(0, totalReward)
    };
    
    // Issue reward transaction
    const transaction = await this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      authorId,
      calculation.totalReward,
      TransactionType.REWARD,
      recommendationId
    );
    
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
  async issueUpvoteReward(
    recommendationId: string,
    authorId: string,
    upvoteCount: number
  ): Promise<TokenTransaction | null> {
    // Check if the recommendation is eligible for upvote reward
    const upvoteRewardThreshold = this.options.rewardParams?.upvoteReward?.count || 10;
    const upvoteRewardAmount = this.options.rewardParams?.upvoteReward?.amount || 1;
    const maxUpvoteReward = this.options.rewardParams?.maxUpvoteReward || 5;
    
    if (upvoteCount < upvoteRewardThreshold) {
      return null; // Not enough upvotes yet
    }
    
    // Calculate how many new rewards to issue
    const rewardsAlreadyIssued = Math.floor(await this.getRewardsIssuedForAction(recommendationId, TransactionType.REWARD) / upvoteRewardAmount);
    const totalRewardsEligible = Math.min(Math.floor(upvoteCount / upvoteRewardThreshold), maxUpvoteReward / upvoteRewardAmount);
    const newRewardsToIssue = totalRewardsEligible - rewardsAlreadyIssued;
    
    if (newRewardsToIssue <= 0) {
      return null; // No new rewards to issue
    }
    
    // Issue reward transaction
    const rewardAmount = newRewardsToIssue * upvoteRewardAmount;
    
    return this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      authorId,
      rewardAmount,
      TransactionType.REWARD,
      recommendationId
    );
  }
  
  /**
   * Issue curator reward for a list
   * 
   * @param listId ID of the curated list
   * @param curatorId Curator's ID
   * @param trustScore Trust score of the list
   * @returns Reward transaction if eligible
   */
  async issueCuratorReward(
    listId: string,
    curatorId: string,
    trustScore: number
  ): Promise<TokenTransaction | null> {
    // Check if the list meets criteria for curator reward
    const minTrustThreshold = this.options.rewardParams?.minTrustThreshold || 0.25;
    
    if (trustScore < minTrustThreshold) {
      return null; // Trust score too low
    }
    
    // Check if reward was already issued
    const existingRewards = await this.getRewardsIssuedForAction(listId, TransactionType.REWARD);
    if (existingRewards > 0) {
      return null; // Already rewarded
    }
    
    // Issue reward transaction
    const curationReward = this.options.rewardParams?.curationReward || 1;
    
    return this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      curatorId,
      curationReward,
      TransactionType.REWARD,
      listId
    );
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
  async issueCuratorShare(
    listId: string,
    curatorId: string,
    itemId: string,
    originalReward: number
  ): Promise<TokenTransaction | null> {
    // Calculate curator's share percentage
    const curatorSharePercentage = this.options.rewardParams?.curatorRewardShare || 25;
    
    // Calculate share amount
    const shareAmount = (originalReward * curatorSharePercentage) / 100;
    
    if (shareAmount <= 0) {
      return null; // Share too small
    }
    
    // Issue share transaction
    return this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      curatorId,
      shareAmount,
      TransactionType.REWARD,
      `list:${listId}:item:${itemId}`
    );
  }
  
  /**
   * Process a service fee and apply the fee split
   * 
   * @param amount Fee amount
   * @param reference Reference to the related action
   * @returns Transactions for burn and treasury
   */
  async processServiceFee(
    amount: number,
    reference: string
  ): Promise<{ burnTx: TokenTransaction; treasuryTx: TokenTransaction }> {
    // Calculate split amounts
    const burnPercentage = this.options.feeSplit?.burnPercentage || 75;
    const treasuryPercentage = this.options.feeSplit?.treasuryPercentage || 25;
    
    const burnAmount = (amount * burnPercentage) / 100;
    const treasuryAmount = (amount * treasuryPercentage) / 100;
    
    // Issue burn transaction
    const burnTx = await this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      this.options.burnAddress || 'BURN',
      burnAmount,
      TransactionType.BURN,
      reference
    );
    
    // Issue treasury transaction
    const treasuryTx = await this.createTransaction(
      this.options.reserveAddress || 'SYSTEM',
      this.options.treasuryAddress || 'TREASURY',
      treasuryAmount,
      TransactionType.FEE,
      reference
    );
    
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
  async transferTokens(
    senderId: string,
    recipientId: string,
    amount: number,
    reference?: string
  ): Promise<TokenTransaction> {
    return this.createTransaction(
      senderId,
      recipientId,
      amount,
      TransactionType.TRANSFER,
      reference
    );
  }
  
  /**
   * Stake tokens
   * 
   * @param userId User's ID
   * @param amount Amount to stake
   * @param duration Staking duration in days
   * @returns Stake transaction
   */
  async stakeTokens(
    userId: string,
    amount: number,
    duration: number
  ): Promise<TokenTransaction> {
    // Validate user has sufficient balance
    const userBalance = await this.getTokenBalance(userId);
    
    if (userBalance.available < amount) {
      throw new Error(`Insufficient balance: ${userBalance.available} < ${amount}`);
    }
    
    // Calculate staking end time
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + duration);
    
    // Create stake transaction
    const transaction = await this.createTransaction(
      userId,
      userId, // Self-transaction for staking
      amount,
      TransactionType.STAKE,
      `stake:${duration}:${endTime.toISOString()}`
    );
    
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
  async unstakeTokens(
    userId: string,
    amount: number,
    stakingId: string
  ): Promise<TokenTransaction> {
    // Validate user has sufficient staked balance
    const userBalance = await this.getTokenBalance(userId);
    
    if (userBalance.staked < amount) {
      throw new Error(`Insufficient staked balance: ${userBalance.staked} < ${amount}`);
    }
    
    // Validate staking period has ended
    const stakingTx = await this.getTransaction(stakingId);
    
    if (!stakingTx || stakingTx.type !== TransactionType.STAKE) {
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
    const transaction = await this.createTransaction(
      userId,
      userId, // Self-transaction for unstaking
      amount,
      TransactionType.UNSTAKE,
      `unstake:${stakingId}`
    );
    
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
  async getTransaction(transactionId: string): Promise<TokenTransaction | null> {
    // Query the blockchain for the transaction
    const result = await this.adapter.queryState<TokenTransaction>({
      objectType: 'token_transaction',
      filter: {
        transactionId
      }
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  }
  
  /**
   * Get all transactions for a user
   * 
   * @param userId User's ID
   * @param type Optional transaction type filter
   * @param pagination Pagination options
   * @returns Transactions for the user
   */
  async getUserTransactions(
    userId: string,
    type?: TransactionType,
    pagination: { offset: number; limit: number } = { offset: 0, limit: 20 }
  ): Promise<{
    transactions: TokenTransaction[];
    total: number;
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for the user's transactions
    const result = await this.adapter.queryState<TokenTransaction>({
      objectType: 'token_transaction',
      filter: {
        $or: [
          { sender: userId },
          { recipient: userId }
        ],
        ...(type && { type })
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination
    });
    
    return {
      transactions: result.results,
      total: result.total,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore: pagination.offset + result.results.length < result.total
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
  private async getRewardsIssuedForAction(
    actionReference: string,
    type: TransactionType
  ): Promise<number> {
    // Query the blockchain for the rewards issued
    const result = await this.adapter.queryState<TokenTransaction>({
      objectType: 'token_transaction',
      filter: {
        actionReference,
        type
      }
    });
    
    // Sum up all rewards
    return result.results.reduce((total, tx) => total + tx.amount, 0);
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
  private async updateBalances(
    sender: string,
    recipient: string,
    amount: number,
    type: TransactionType
  ): Promise<void> {
    // Skip balance updates for certain transaction types
    if (
      type === TransactionType.STAKE ||
      type === TransactionType.UNSTAKE
    ) {
      return; // Handled separately
    }
    
    // Update sender balance (except for rewards)
    if (sender !== 'SYSTEM' && sender !== this.options.reserveAddress) {
      const senderBalance = await this.getTokenBalance(sender);
      
      await this.adapter.submitTx({
        sender,
        payload: {
          objectType: 'token_balance',
          action: 'update',
          data: {
            ...senderBalance,
            available: Math.max(0, senderBalance.available - amount)
          }
        },
        feeOptions: {
          sponsorWallet: this.options.sponsorWallet
        }
      });
    }
    
    // Update recipient balance (except for burn)
    if (
      recipient !== 'BURN' &&
      recipient !== this.options.burnAddress
    ) {
      const recipientBalance = await this.getTokenBalance(recipient);
      
      await this.adapter.submitTx({
        sender: this.options.sponsorWallet || 'SYSTEM',
        payload: {
          objectType: 'token_balance',
          action: 'update',
          data: {
            ...recipientBalance,
            available: recipientBalance.available + amount
          }
        },
        feeOptions: {
          sponsorWallet: this.options.sponsorWallet
        }
      });
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
  private async updateStakedBalance(
    userId: string,
    amount: number,
    isStaking: boolean
  ): Promise<void> {
    const userBalance = await this.getTokenBalance(userId);
    
    if (isStaking) {
      // Staking: decrease available, increase staked
      await this.adapter.submitTx({
        sender: userId,
        payload: {
          objectType: 'token_balance',
          action: 'update',
          data: {
            ...userBalance,
            available: userBalance.available - amount,
            staked: userBalance.staked + amount
          }
        },
        feeOptions: {
          sponsorWallet: this.options.sponsorWallet
        }
      });
    } else {
      // Unstaking: increase available, decrease staked
      await this.adapter.submitTx({
        sender: userId,
        payload: {
          objectType: 'token_balance',
          action: 'update',
          data: {
            ...userBalance,
            available: userBalance.available + amount,
            staked: userBalance.staked - amount
          }
        },
        feeOptions: {
          sponsorWallet: this.options.sponsorWallet
        }
      });
    }
  }
}
