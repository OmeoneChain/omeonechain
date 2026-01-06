/**
 * BocaBoca IOTA Client
 * ====================
 * 
 * Core blockchain communication layer for IOTA Rebased (Move VM)
 * Handles sponsor wallet transactions, Move calls, and query operations
 * 
 * Target location: code/poc/core/src/blockchain/iota-client.ts
 * 
 * @version 1.0.0
 * @network IOTA Rebased Testnet
 */

import {
  IotaClient,
  IotaTransactionBlockResponse,
  getFullnodeUrl,
} from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { decodeIotaPrivateKey } from '@iota/iota-sdk/cryptography';
import { fromB64 } from '@iota/iota-sdk/utils';

import {
  NETWORK_CONFIG,
  PACKAGE_IDS,
  SHARED_OBJECTS,
  ADMIN_CAPS,
  ADMIN_ADDRESS,
  REWARDS,
  TOKEN_CONFIG,
  MOVE_TARGETS,
  toBaseUnits,
  formatBoca,
  getExplorerTxUrl,
} from './contracts';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface TransactionResult {
  success: boolean;
  digest: string;
  effects?: IotaTransactionBlockResponse['effects'];
  error?: string;
  gasUsed?: number;
  explorerUrl?: string;
}

export interface MintResult extends TransactionResult {
  amount: bigint;
  recipient: string;
}

export interface BalanceResult {
  balance: bigint;
  displayBalance: string;
}

export interface UserStatusResult {
  tier: number;
  tierName: string;
  recommendationCount: number;
  upvoteCount: number;
  joinedAt: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  nextRetryTime: Date | null;
}

export interface SponsorWalletStats {
  dailyTransactions: number;
  dailyGasSpent: number;
  lastResetDate: string;
  remainingDailyBudget: number;
}

export interface IOTAClientConfig {
  /** Network to connect to */
  network?: 'testnet' | 'mainnet' | 'devnet';
  
  /** Custom RPC URL (overrides network default) */
  rpcUrl?: string;
  
  /** Sponsor wallet private key (base64 encoded) */
  sponsorPrivateKey?: string;
  
  /** Daily gas budget for sponsor wallet (in NANOS) */
  dailyGasBudget?: number;
  
  /** Maximum retries for failed transactions */
  maxRetries?: number;
  
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold?: number;
  
  /** Circuit breaker reset timeout (ms) */
  circuitBreakerResetTimeout?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_GAS_BUDGET = 10_000_000; // 10M NANOS = 0.01 IOTA
const DEFAULT_DAILY_GAS_BUDGET = 1_000_000_000; // 1B NANOS = 1 IOTA per day
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000; // 1 minute

// =============================================================================
// IOTA CLIENT CLASS
// =============================================================================

export class IOTAClient {
  private client: IotaClient;
  private sponsorKeypair: Ed25519Keypair | null = null;
  private config: Required<IOTAClientConfig>;
  
  // Circuit breaker state
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: null,
    isOpen: false,
    nextRetryTime: null,
  };
  
  // Sponsor wallet tracking
  private sponsorStats: SponsorWalletStats = {
    dailyTransactions: 0,
    dailyGasSpent: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    remainingDailyBudget: DEFAULT_DAILY_GAS_BUDGET,
  };

  constructor(config: IOTAClientConfig = {}) {
    this.config = {
      network: config.network || 'testnet',
      rpcUrl: config.rpcUrl || NETWORK_CONFIG.rpcUrl,
      sponsorPrivateKey: config.sponsorPrivateKey || process.env.BOCABOCA_SPONSOR_PRIVATE_KEY || '',
      dailyGasBudget: config.dailyGasBudget || DEFAULT_DAILY_GAS_BUDGET,
      maxRetries: config.maxRetries || DEFAULT_MAX_RETRIES,
      circuitBreakerThreshold: config.circuitBreakerThreshold || CIRCUIT_BREAKER_THRESHOLD,
      circuitBreakerResetTimeout: config.circuitBreakerResetTimeout || CIRCUIT_BREAKER_RESET_MS,
    };

    // Initialize IOTA client
    this.client = new IotaClient({ url: this.config.rpcUrl });

    // Initialize sponsor keypair if private key is provided
    if (this.config.sponsorPrivateKey) {
      try {
        const privateKey = this.config.sponsorPrivateKey;
        
        // Check if it's Bech32 format (iotaprivkey1... or suiprivkey1...)
        if (privateKey.startsWith('iotaprivkey') || privateKey.startsWith('suiprivkey')) {
          // Decode Bech32 private key
          const { schema, secretKey } = decodeIotaPrivateKey(privateKey);
          this.sponsorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
        } else {
          // Assume base64 encoded raw bytes
          const privateKeyBytes = fromB64(privateKey);
          this.sponsorKeypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
        }
        
        console.log(`[IOTAClient] Sponsor wallet initialized: ${this.sponsorKeypair.getPublicKey().toIotaAddress()}`);
      } catch (error) {
        console.error('[IOTAClient] Failed to initialize sponsor keypair:', error);
      }
    }

    // Initialize sponsor stats
    this.resetDailyStatsIfNeeded();
  }

  // ===========================================================================
  // PUBLIC API - Token Operations
  // ===========================================================================

  /**
   * Mint BOCA tokens to a recipient address
   * Requires TreasuryCap - admin only operation
   * 
   * The token::mint function returns a Coin<TOKEN>, so we need to:
   * 1. Call mint to get the coin
   * 2. Transfer the coin to the recipient
   * 
   * @param recipient - Address to mint tokens to
   * @param amount - Amount in display units (e.g., 5.0 for 5 BOCA)
   * @returns MintResult with transaction details
   */
  async mintTokens(recipient: string, amount: number): Promise<MintResult> {
    const baseAmount = toBaseUnits(amount);
    
    // Validate TreasuryCap is configured
    if (!ADMIN_CAPS.TREASURY_CAP) {
      return {
        success: false,
        digest: '',
        amount: baseAmount,
        recipient,
        error: 'TreasuryCap not configured. Set BOCABOCA_TREASURY_CAP environment variable.',
      };
    }

    const tx = new Transaction();
    
    // Step 1: Call mint - returns Coin<TOKEN>
    const [mintedCoin] = tx.moveCall({
      target: MOVE_TARGETS.token.mint,
      arguments: [
        tx.object(ADMIN_CAPS.TREASURY_CAP),
        tx.pure.u64(baseAmount),
      ],
    });

    // Step 2: Transfer the minted coin to recipient
    tx.transferObjects([mintedCoin], tx.pure.address(recipient));

    const result = await this.executeTransaction(tx);
    
    return {
      ...result,
      amount: baseAmount,
      recipient,
    };
  }

  /**
   * Get BOCA token balance for an address
   * 
   * @param address - Wallet address to query
   * @returns Balance in base units and display format
   */
  async getBalance(address: string): Promise<BalanceResult> {
    try {
      // Query coins owned by the address
      const coins = await this.client.getCoins({
        owner: address,
        coinType: `${PACKAGE_IDS.TOKEN}::token::BOCA`,
      });

      // Sum all coin balances
      const totalBalance = coins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );

      return {
        balance: totalBalance,
        displayBalance: formatBoca(totalBalance),
      };
    } catch (error) {
      console.error('[IOTAClient] getBalance error:', error);
      return {
        balance: BigInt(0),
        displayBalance: '0.00 BOCA',
      };
    }
  }

  /**
   * Transfer BOCA tokens between addresses
   * This creates a transaction that the sender must sign
   * 
   * @param from - Sender address
   * @param to - Recipient address  
   * @param amount - Amount in display units
   * @returns Transaction bytes for signing
   */
  async buildTransferTransaction(
    from: string,
    to: string,
    amount: number
  ): Promise<{ txBytes: Uint8Array; tx: Transaction }> {
    const baseAmount = toBaseUnits(amount);
    const tx = new Transaction();
    tx.setSender(from);

    // Get user's BOCA coins
    const coins = await this.client.getCoins({
      owner: from,
      coinType: `${PACKAGE_IDS.TOKEN}::token::BOCA`,
    });

    if (coins.data.length === 0) {
      throw new Error('No BOCA tokens found in wallet');
    }

    // If single coin has enough balance, use it directly
    // Otherwise, merge coins first
    const primaryCoin = coins.data[0];
    
    tx.moveCall({
      target: MOVE_TARGETS.token.transfer,
      arguments: [
        tx.object(primaryCoin.coinObjectId),
        tx.pure.u64(baseAmount),
        tx.pure.address(to),
      ],
    });

    const txBytes = await tx.build({ client: this.client });
    
    return { txBytes, tx };
  }

  // ===========================================================================
  // PUBLIC API - Reward Operations
  // ===========================================================================

  /**
   * Pay recommendation reward to a user
   * Called when user creates a new dish recommendation
   * 
   * @param userAddress - Address of user who created recommendation
   * @returns Transaction result
   */
  async payRecommendationReward(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.RECOMMENDATION / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay upvote given reward
   * Called when user upvotes another's recommendation
   * 
   * @param userAddress - Address of user who gave the upvote
   * @returns Transaction result
   */
  async payUpvoteGivenReward(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.UPVOTE_GIVEN / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay upvote received reward
   * Called when user's recommendation receives an upvote
   * 
   * @param userAddress - Address of user who received the upvote
   * @returns Transaction result
   */
  async payUpvoteReceivedReward(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.UPVOTE_RECEIVED / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay first upvote bonus
   * Extra bonus for the first upvote on a recommendation
   * 
   * @param userAddress - Address of user who gave the first upvote
   * @returns Transaction result
   */
  async payFirstUpvoteBonus(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.FIRST_UPVOTE_BONUS / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay referral reward
   * Called when a referred user completes signup
   * 
   * @param referrerAddress - Address of the referrer
   * @returns Transaction result
   */
  async payReferralReward(referrerAddress: string): Promise<MintResult> {
    return this.mintTokens(referrerAddress, REWARDS.REFERRAL / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay daily login reward
   * 
   * @param userAddress - Address of user
   * @returns Transaction result
   */
  async payDailyLoginReward(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.DAILY_LOGIN / TOKEN_CONFIG.multiplier);
  }

  /**
   * Pay streak bonus (7-day)
   * 
   * @param userAddress - Address of user
   * @returns Transaction result
   */
  async payStreakBonus(userAddress: string): Promise<MintResult> {
    return this.mintTokens(userAddress, REWARDS.STREAK_BONUS_7_DAY / TOKEN_CONFIG.multiplier);
  }

  // ===========================================================================
  // PUBLIC API - User Status Operations
  // ===========================================================================

  /**
   * Create a new user profile on-chain
   * 
   * @param userAddress - Address for the new user
   * @returns Transaction result
   */
  async createUserProfile(userAddress: string): Promise<TransactionResult> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: MOVE_TARGETS.userStatus.createProfile,
      arguments: [
        tx.pure.address(userAddress),
      ],
    });

    return this.executeTransaction(tx);
  }

  /**
   * Get user status from chain
   * Note: user_status uses per-user objects, so we query by owner
   * 
   * @param userAddress - Address to query
   * @returns User status or null if not found
   */
  async getUserStatus(userAddress: string): Promise<UserStatusResult | null> {
    try {
      // Query owned objects of type UserStatus
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_IDS.USER_STATUS}::user_status::UserStatus`,
        },
        options: {
          showContent: true,
        },
      });

      if (objects.data.length === 0) {
        return null;
      }

      const userStatusObj = objects.data[0];
      const content = userStatusObj.data?.content;
      
      if (content?.dataType !== 'moveObject') {
        return null;
      }

      const fields = content.fields as Record<string, unknown>;
      
      const tier = Number(fields.tier || 1);
      const tierNames: Record<number, string> = {
        1: 'New',
        2: 'Established', 
        3: 'Trusted',
      };

      return {
        tier,
        tierName: tierNames[tier] || 'Unknown',
        recommendationCount: Number(fields.recommendation_count || 0),
        upvoteCount: Number(fields.upvote_count || 0),
        joinedAt: Number(fields.joined_at || 0),
      };
    } catch (error) {
      console.error('[IOTAClient] getUserStatus error:', error);
      return null;
    }
  }

  // ===========================================================================
  // PUBLIC API - Recommendation Operations
  // ===========================================================================

  /**
   * Build a transaction to create a new recommendation
   * Returns transaction bytes for user signing
   * 
   * @param userAddress - Address of user creating recommendation
   * @param restaurantId - Off-chain restaurant ID
   * @param dishName - Name of the dish
   * @param rating - Rating (1-5)
   * @param review - Review text
   * @returns Transaction bytes for signing
   */
  async buildCreateRecommendationTx(
    userAddress: string,
    restaurantId: string,
    dishName: string,
    rating: number,
    review: string
  ): Promise<{ txBytes: Uint8Array; tx: Transaction }> {
    const tx = new Transaction();
    tx.setSender(userAddress);

    tx.moveCall({
      target: MOVE_TARGETS.recommendation.create,
      arguments: [
        tx.object(SHARED_OBJECTS.RECOMMENDATION_REGISTRY),
        tx.pure.string(restaurantId),
        tx.pure.string(dishName),
        tx.pure.u8(rating),
        tx.pure.string(review),
      ],
    });

    const txBytes = await tx.build({ client: this.client });
    
    return { txBytes, tx };
  }

  /**
   * Build a transaction to upvote a recommendation
   * 
   * @param userAddress - Address of user upvoting
   * @param recommendationId - Object ID of the recommendation
   * @returns Transaction bytes for signing
   */
  async buildUpvoteTx(
    userAddress: string,
    recommendationId: string
  ): Promise<{ txBytes: Uint8Array; tx: Transaction }> {
    const tx = new Transaction();
    tx.setSender(userAddress);

    tx.moveCall({
      target: MOVE_TARGETS.recommendation.upvote,
      arguments: [
        tx.object(SHARED_OBJECTS.RECOMMENDATION_REGISTRY),
        tx.object(recommendationId),
      ],
    });

    const txBytes = await tx.build({ client: this.client });
    
    return { txBytes, tx };
  }

  // ===========================================================================
  // PUBLIC API - Escrow Operations
  // ===========================================================================

  /**
   * Create an escrow for a transaction
   * 
   * @param senderAddress - Address creating the escrow
   * @param recipientAddress - Address that can claim the escrow
   * @param amount - Amount in display units
   * @param expirationHours - Hours until escrow expires
   * @returns Transaction bytes for signing
   */
  async buildCreateEscrowTx(
    senderAddress: string,
    recipientAddress: string,
    amount: number,
    expirationHours: number = 72
  ): Promise<{ txBytes: Uint8Array; tx: Transaction }> {
    const baseAmount = toBaseUnits(amount);
    const tx = new Transaction();
    tx.setSender(senderAddress);

    // Get sender's BOCA coins
    const coins = await this.client.getCoins({
      owner: senderAddress,
      coinType: `${PACKAGE_IDS.TOKEN}::token::BOCA`,
    });

    if (coins.data.length === 0) {
      throw new Error('No BOCA tokens found in wallet');
    }

    const expirationMs = Date.now() + (expirationHours * 60 * 60 * 1000);

    tx.moveCall({
      target: MOVE_TARGETS.escrow.create,
      arguments: [
        tx.object(SHARED_OBJECTS.ESCROW_REGISTRY),
        tx.object(coins.data[0].coinObjectId),
        tx.pure.u64(baseAmount),
        tx.pure.address(recipientAddress),
        tx.pure.u64(expirationMs),
      ],
    });

    const txBytes = await tx.build({ client: this.client });
    
    return { txBytes, tx };
  }

  // ===========================================================================
  // PUBLIC API - Lottery Operations
  // ===========================================================================

  /**
   * Build transaction to buy lottery ticket
   * 
   * @param userAddress - Address buying ticket
   * @param ticketCost - Cost in display units
   * @returns Transaction bytes for signing
   */
  async buildBuyLotteryTicketTx(
    userAddress: string,
    ticketCost: number
  ): Promise<{ txBytes: Uint8Array; tx: Transaction }> {
    const baseAmount = toBaseUnits(ticketCost);
    const tx = new Transaction();
    tx.setSender(userAddress);

    // Get user's BOCA coins
    const coins = await this.client.getCoins({
      owner: userAddress,
      coinType: `${PACKAGE_IDS.TOKEN}::token::BOCA`,
    });

    if (coins.data.length === 0) {
      throw new Error('No BOCA tokens found in wallet');
    }

    tx.moveCall({
      target: MOVE_TARGETS.lottery.buyTicket,
      arguments: [
        tx.object(SHARED_OBJECTS.LOTTERY_STATE),
        tx.object(coins.data[0].coinObjectId),
        tx.pure.u64(baseAmount),
      ],
    });

    const txBytes = await tx.build({ client: this.client });
    
    return { txBytes, tx };
  }

  /**
   * Draw lottery winner (admin only)
   * 
   * @returns Transaction result
   */
  async drawLotteryWinner(): Promise<TransactionResult> {
    if (!ADMIN_CAPS.LOTTERY_ADMIN_CAP) {
      return {
        success: false,
        digest: '',
        error: 'LotteryAdminCap not configured. Set BOCABOCA_LOTTERY_ADMIN_CAP environment variable.',
      };
    }

    const tx = new Transaction();
    
    tx.moveCall({
      target: MOVE_TARGETS.lottery.drawWinner,
      arguments: [
        tx.object(ADMIN_CAPS.LOTTERY_ADMIN_CAP),
        tx.object(SHARED_OBJECTS.LOTTERY_STATE),
      ],
    });

    return this.executeTransaction(tx);
  }

  // ===========================================================================
  // PUBLIC API - Query Operations
  // ===========================================================================

  /**
   * Get object data by ID
   * 
   * @param objectId - Object ID to query
   * @returns Object data or null
   */
  async getObject(objectId: string): Promise<unknown> {
    try {
      const result = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
          showOwner: true,
        },
      });
      return result.data;
    } catch (error) {
      console.error('[IOTAClient] getObject error:', error);
      return null;
    }
  }

  /**
   * Get transaction details by digest
   * 
   * @param digest - Transaction digest
   * @returns Transaction response or null
   */
  async getTransaction(digest: string): Promise<IotaTransactionBlockResponse | null> {
    try {
      return await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
        },
      });
    } catch (error) {
      console.error('[IOTAClient] getTransaction error:', error);
      return null;
    }
  }

  /**
   * Get recent transactions for an address
   * 
   * @param address - Address to query
   * @param limit - Maximum number of transactions
   * @returns Array of transaction digests
   */
  async getRecentTransactions(address: string, limit: number = 10): Promise<string[]> {
    try {
      const result = await this.client.queryTransactionBlocks({
        filter: {
          FromAddress: address,
        },
        limit,
        order: 'descending',
      });
      return result.data.map(tx => tx.digest);
    } catch (error) {
      console.error('[IOTAClient] getRecentTransactions error:', error);
      return [];
    }
  }

  // ===========================================================================
  // PUBLIC API - Health & Status
  // ===========================================================================

  /**
   * Check if the IOTA client is connected and healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Try to get chain identifier as a health check
      await this.client.getChainIdentifier();
      
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sponsor wallet statistics
   */
  getSponsorStats(): SponsorWalletStats {
    this.resetDailyStatsIfNeeded();
    return { ...this.sponsorStats };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Get sponsor wallet address (if configured)
   */
  getSponsorAddress(): string | null {
    return this.sponsorKeypair?.getPublicKey().toIotaAddress() || null;
  }

  // ===========================================================================
  // INTERNAL - Transaction Execution
  // ===========================================================================

  /**
   * Execute a transaction with retry logic and circuit breaker
   */
  private async executeTransaction(tx: Transaction): Promise<TransactionResult> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      return {
        success: false,
        digest: '',
        error: 'Circuit breaker is open. Too many recent failures.',
      };
    }

    // Check sponsor wallet budget
    this.resetDailyStatsIfNeeded();
    if (this.sponsorStats.remainingDailyBudget < DEFAULT_GAS_BUDGET) {
      return {
        success: false,
        digest: '',
        error: 'Daily sponsor wallet budget exceeded.',
      };
    }

    // Ensure sponsor keypair exists
    if (!this.sponsorKeypair) {
      return {
        success: false,
        digest: '',
        error: 'Sponsor wallet not configured. Set BOCABOCA_SPONSOR_PRIVATE_KEY environment variable.',
      };
    }

    // Set gas budget
    tx.setGasBudget(DEFAULT_GAS_BUDGET);

    // Retry loop
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.client.signAndExecuteTransaction({
          signer: this.sponsorKeypair,
          transaction: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        // Success - reset circuit breaker
        this.recordSuccess();

        // Update sponsor stats
        const gasUsed = Number(result.effects?.gasUsed?.computationCost || 0) +
                       Number(result.effects?.gasUsed?.storageCost || 0);
        this.updateSponsorStats(gasUsed);

        return {
          success: true,
          digest: result.digest,
          effects: result.effects,
          gasUsed,
          explorerUrl: getExplorerTxUrl(result.digest),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[IOTAClient] Transaction attempt ${attempt}/${this.config.maxRetries} failed:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed
    this.recordFailure();

    return {
      success: false,
      digest: '',
      error: lastError?.message || 'Transaction failed after all retries',
    };
  }

  /**
   * Execute a user-signed transaction
   * For transactions where the user signs (not sponsor)
   */
  async executeSignedTransaction(
    txBytes: Uint8Array,
    signature: string
  ): Promise<TransactionResult> {
    if (this.isCircuitOpen()) {
      return {
        success: false,
        digest: '',
        error: 'Circuit breaker is open. Too many recent failures.',
      };
    }

    try {
      const result = await this.client.executeTransactionBlock({
        transactionBlock: txBytes,
        signature,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      this.recordSuccess();

      return {
        success: true,
        digest: result.digest,
        effects: result.effects,
        explorerUrl: getExplorerTxUrl(result.digest),
      };
    } catch (error) {
      this.recordFailure();
      
      return {
        success: false,
        digest: '',
        error: error instanceof Error ? error.message : 'Transaction execution failed',
      };
    }
  }

  // ===========================================================================
  // INTERNAL - Circuit Breaker
  // ===========================================================================

  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }

    // Check if we should try to reset
    if (this.circuitBreaker.nextRetryTime && new Date() >= this.circuitBreaker.nextRetryTime) {
      // Half-open state - allow one request to test
      this.circuitBreaker.isOpen = false;
      return false;
    }

    return true;
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.lastFailure = null;
    this.circuitBreaker.nextRetryTime = null;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = new Date();

    if (this.circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = new Date(
        Date.now() + this.config.circuitBreakerResetTimeout
      );
      console.warn('[IOTAClient] Circuit breaker opened due to repeated failures');
    }
  }

  // ===========================================================================
  // INTERNAL - Sponsor Wallet Tracking
  // ===========================================================================

  private resetDailyStatsIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.sponsorStats.lastResetDate !== today) {
      this.sponsorStats = {
        dailyTransactions: 0,
        dailyGasSpent: 0,
        lastResetDate: today,
        remainingDailyBudget: this.config.dailyGasBudget,
      };
    }
  }

  private updateSponsorStats(gasUsed: number): void {
    this.sponsorStats.dailyTransactions++;
    this.sponsorStats.dailyGasSpent += gasUsed;
    this.sponsorStats.remainingDailyBudget = Math.max(
      0,
      this.config.dailyGasBudget - this.sponsorStats.dailyGasSpent
    );
  }

  // ===========================================================================
  // INTERNAL - Utilities
  // ===========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: IOTAClient | null = null;

/**
 * Get the singleton IOTAClient instance
 * Creates a new instance if one doesn't exist
 */
export function getIOTAClient(config?: IOTAClientConfig): IOTAClient {
  if (!clientInstance) {
    clientInstance = new IOTAClient(config);
  }
  return clientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetIOTAClient(): void {
  clientInstance = null;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default IOTAClient;