// code/poc/core/src/adapters/rebased-adapter.ts
// Enhanced version with Move contract integration

import { ChainAdapter, Transaction, TransactionResult, StateQuery, EventFilter, Event, ChainEvent, NetworkInfo, TokenBalance } from '../type/chain';
import axios from 'axios';
import { IotaWallet } from '@iota/wallet';
import { Ed25519Seed } from '@iota/crypto.js';
import * as crypto from 'crypto';

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
    addSocialConnection: 'reputation::add_social_connection',
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
    rewards?: string; // New: Reward distribution contract
  };
  packageId?: string; // Move package ID after deployment
  options?: {
    retryAttempts?: number;
    maxFeePerTransaction?: number;
    timeoutMs?: number;
    enableSponsorWallet?: boolean; // Enable automatic fee sponsoring
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
export class RebasedAdapter implements ChainAdapter {
  private nodeUrl: string;
  private apiKey: string;
  private wallet: any;
  private _isConnected: boolean = false;
  private eventSubscribers: Map<string, Function[]> = new Map();
  private lastCommitNumber: number = 0;
  private config: RebasedConfig;
  private client: any;
  private currentChainId: string = '';
  private eventIterator: AsyncIterator<Event> | null = null;
  
  // Move contract function mappings
  private moveContracts: MoveContractMappings = {
    token: {
      createUserWallet: 'omeone_token::create_user_wallet',
      stakeTokens: 'omeone_token::stake_tokens',
      claimRewards: 'omeone_token::claim_rewards',
      distributeReward: 'omeone_token::distribute_reward',
      updateTrustScore: 'omeone_token::update_trust_score',
      updateReputationScore: 'omeone_token::update_reputation_score',
      getCurrentRewardRate: 'omeone_token::get_current_reward_rate',
      getTotalRewardsDistributed: 'omeone_token::get_total_rewards_distributed',
      getBalance: 'omeone_token::get_balance',
      getTrustScore: 'omeone_token::get_trust_score',
      getReputationScore: 'omeone_token::get_reputation_score',
    },
    rewards: {
      submitActionForReward: 'reward_distribution::submit_action_for_reward',
      addSocialEndorsement: 'reward_distribution::add_social_endorsement',
      claimReward: 'reward_distribution::claim_reward',
      distributeOnboardingReward: 'reward_distribution::distribute_onboarding_reward',
      distributeLeaderboardReward: 'reward_distribution::distribute_leaderboard_reward',
      isEligibleForReward: 'reward_distribution::is_eligible_for_reward',
      getPendingRewardInfo: 'reward_distribution::get_pending_reward_info',
      claimDiscoveryBonus: 'discovery_incentives::claim_discovery_bonus',
      getActiveCampaigns: 'discovery_incentives::get_active_campaigns',
    },
    governance: {
      createProposal: 'governance::create_proposal',
      vote: 'governance::vote',
      executeProposal: 'governance::execute_proposal',
      getProposal: 'governance::get_proposal',
      getVotingPower: 'governance::get_voting_power',
    },
    reputation: {
      updateUserReputation: 'reputation::update_user_reputation',
      getSocialWeight: 'reputation::get_social_weight',
      calculateTrustScore: 'reputation::calculate_trust_score',
      submitCommunityVerification: 'reputation::submit_community_verification',
      addSocialConnection: 'reputation::add_social_connection',
      removeSocialConnection: 'reputation::remove_social_connection',
      getUserReputation: 'reputation::get_user_reputation',
    },
  };
  
  private readonly DEFAULT_OPTIONS = {
    retryAttempts: 3,
    maxFeePerTransaction: 50,
    timeoutMs: 30000,
    enableSponsorWallet: true,
  };

  constructor(configOrNodeUrl: RebasedConfig | string, apiKey?: string, seed?: string) {
    if (typeof configOrNodeUrl === 'string') {
      // Legacy constructor - enhanced with Move contract addresses
      this.nodeUrl = configOrNodeUrl;
      this.apiKey = apiKey || '';
      
      if (seed) {
        this.initializeWallet(seed);
      }
      
      this.config = {
        network: 'testnet',
        nodeUrl: this.nodeUrl,
        account: { address: '', privateKey: '' },
        contractAddresses: {
          recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
          reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
          token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
          governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
          service: '0x4f6d656f6e65536572766963655ddc8',
          rewards: '0x4f6d656f6e6552657761726473655ddc9', // New rewards contract
        },
        packageId: '0x4f6d656f6e65506163a6167655ddc0', // Default package ID
        options: this.DEFAULT_OPTIONS
      };
    } else {
      // New constructor with enhanced config
      this.config = {
        ...configOrNodeUrl,
        options: { ...this.DEFAULT_OPTIONS, ...configOrNodeUrl.options },
        contractAddresses: {
          ...configOrNodeUrl.contractAddresses,
          rewards: configOrNodeUrl.contractAddresses.rewards || '0x4f6d656f6e6552657761726473655ddc9',
        }
      };
      
      this.nodeUrl = this.config.nodeUrl;
      this.apiKey = '';
      
      if (this.config.account.privateKey) {
        this.initializeWallet(this.config.account.privateKey);
      }
    }
    
    this.initializeClient();
  }

  // ========== FIXED CHAINADAPTER INTERFACE METHODS ==========

  /**
   * FIXED: isConnected should return Promise<boolean>, not boolean
   */
  async isConnected(): Promise<boolean> {
    return this._isConnected && this.client !== null;
  }

  /**
   * FIXED: connect should return Promise<boolean>, not Promise<void>
   */
  async connect(options?: Record<string, any>): Promise<boolean> {
    try {
      const nodeInfo = await this.client.getNodeInfo();
      
      console.log(`Connected to IOTA Rebased ${this.config.network} node:`, nodeInfo.version);
      console.log(`Network: ${nodeInfo.network}`);
      
      this.currentChainId = nodeInfo.network || `rebased-${this.config.network}`;
      this.pollForEvents();
      this._isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to IOTA Rebased node:', error);
      this._isConnected = false;
      return false;
    }
  }

  /**
   * ADDED: Missing store method required by ChainAdapter
   */
  async store(key: string, value: any): Promise<void> {
    try {
      // Store data using IPFS or other off-chain storage
      const serializedValue = JSON.stringify(value);
      
      // For now, use a simple in-memory storage approach
      // In production, this would integrate with IPFS
      const storageResult = await this.callMoveFunction('token', 'storeData', [
        key,
        this.stringToBytes(serializedValue)
      ]);
      
      if (!storageResult.success) {
        throw new Error(storageResult.error || 'Failed to store data');
      }
    } catch (error) {
      console.error('Error storing data:', error);
      throw new Error(`Failed to store data for key ${key}: ${error}`);
    }
  }

  /**
   * ADDED: Missing retrieve method required by ChainAdapter
   */
  async retrieve(key: string): Promise<any> {
    try {
      // Retrieve data from IPFS or other off-chain storage
      const retrievalResult = await this.callMoveFunction('token', 'retrieveData', [key]);
      
      if (retrievalResult.success && retrievalResult.result) {
        try {
          return JSON.parse(retrievalResult.result);
        } catch (parseError) {
          // If not JSON, return as string
          return retrievalResult.result;
        }
      }
      
      throw new Error('Data not found');
    } catch (error) {
      console.error('Error retrieving data:', error);
      throw new Error(`Failed to retrieve data for key ${key}: ${error}`);
    }
  }

  /**
   * ADDED: Missing submitActionForReward method required by ChainAdapter
   */
  async submitActionForReward(userId: string, actionData: any): Promise<TransactionResult> {
    try {
      const actionId = actionData.actionId || crypto.randomUUID();
      const actionType = actionData.actionType || 1;
      
      const result = await this.submitRecommendationForReward(userId, actionId, actionType);
      
      return {
        id: result.result?.transaction_id || crypto.randomUUID(),
        status: result.success ? 'confirmed' : 'failed',
        timestamp: new Date().toISOString(),
        commitNumber: result.result?.commit_number,
        objectId: result.result?.object_id,
        gasUsed: result.gasUsed,
        events: result.events,
        details: result.result,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      console.error('Error submitting action for reward:', error);
      return {
        id: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      };
    }
  }

  /**
   * FIXED: getBalance to return proper TokenBalance type
   */
  async getBalance(address: string): Promise<TokenBalance> {
    try {
      // Use existing getUserBalance method if available for this address
      if (address === this.config.account.address) {
        const balance = await this.getUserBalance(address);
        return {
          confirmed: balance.liquid.toString(),
          pending: balance.pendingRewards.toString(),
          value: (balance.liquid + balance.staked).toString(),
          decimals: 6,
          symbol: 'TOK'
        };
      }
      
      // Generic balance query
      const result = await this.callMoveFunction('token', 'getBalance', [address]);
      
      return {
        confirmed: result.success ? (result.result?.liquid || '0') : '0',
        pending: result.success ? (result.result?.pending_rewards || '0') : '0',
        value: result.success ? (result.result?.liquid || '0') : '0',
        decimals: 6,
        symbol: 'TOK'
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      return { 
        confirmed: '0', 
        pending: '0', 
        value: '0', 
        decimals: 6, 
        symbol: 'TOK' 
      };
    }
  }

  /**
   * FIXED: getNetworkInfo to return proper NetworkInfo type
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      if (!this._isConnected) {
        await this.connect();
      }
      
      const nodeInfo = await this.client.getNodeInfo();
      const currentCommit = await this.getCurrentCommit();
      
      return {
        chainId: this.currentChainId || this.config.network,
        networkName: `IOTA Rebased ${this.config.network}`,
        networkType: this.config.network,
        blockHeight: currentCommit,
        latestCheckpoint: currentCommit.toString(),
        isHealthy: true
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        chainId: this.config.network,
        networkName: `IOTA Rebased ${this.config.network}`,
        networkType: this.config.network,
        blockHeight: 0,
        latestCheckpoint: '0',
        isHealthy: false
      };
    }
  }

  /**
   * FIXED: watchEvents to return proper AsyncIterator<ChainEvent>
   */
  async *watchEvents(filter: EventFilter): AsyncIterator<ChainEvent> {
    if (!this._isConnected) {
      await this.connect();
    }
    
    if (this.eventIterator) {
      try {
        await this.eventIterator.return?.();
      } catch (error) {
        console.warn('Error closing previous event iterator:', error);
      }
    }
    
    const eventQueue: ChainEvent[] = [];
    let resolveNext: ((value: IteratorResult<ChainEvent>) => void) | null = null;
    let isActive = true;
    
    const unsubscribeFunctions: (() => void)[] = [];
    
    for (const eventType of filter.eventTypes) {
      try {
        const contractType = this.getContractTypeFromEventType(eventType);
        const contractAddress = this.getContractAddress(contractType);
        
        const unsubscribe = await this.client.watchEvents(
          contractAddress,
          eventType,
          (eventData: any) => {
            if (!isActive) return;
            
            if (filter.fromCommit && eventData.commitNumber < filter.fromCommit) {
              return;
            }
            
            if (filter.address && eventData.address !== filter.address) {
              return;
            }
            
            // Convert Event to ChainEvent
            const chainEvent: ChainEvent = {
              type: eventType,
              commitNumber: eventData.commitNumber,
              timestamp: new Date().toISOString(),
              address: eventData.address || contractAddress,
              data: this.deserializeFromMoveVM(eventData.data),
              transactionId: eventData.transactionId,
              blockHeight: eventData.commitNumber
            };
            
            if (resolveNext) {
              const resolver = resolveNext;
              resolveNext = null;
              resolver({
                done: false,
                value: chainEvent
              });
            } else {
              eventQueue.push(chainEvent);
            }
          }
        );
        
        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error(`Failed to watch events for type ${eventType}:`, error);
      }
    }
    
    // Create new iterator
    const iterator: AsyncIterator<ChainEvent> = {
      next: async (): Promise<IteratorResult<ChainEvent>> => {
        if (!isActive) {
          return { done: true, value: undefined };
        }
        
        if (eventQueue.length > 0) {
          return {
            done: false,
            value: eventQueue.shift()!
          };
        }
        
        return new Promise<IteratorResult<ChainEvent>>(resolve => {
          resolveNext = resolve;
        });
      },
      
      return: async (): Promise<IteratorResult<ChainEvent>> => {
        isActive = false;
        
        for (const unsubscribe of unsubscribeFunctions) {
          unsubscribe();
        }
        
        if (resolveNext) {
          resolveNext({ done: true, value: undefined });
          resolveNext = null;
        }
        
        return { done: true, value: undefined };
      }
    };
    
    this.eventIterator = iterator as any;
    
    // Yield events from the iterator
    try {
      while (true) {
        const result = await iterator.next();
        if (result.done) {
          break;
        }
        yield result.value;
      }
    } finally {
      await iterator.return?.();
    }
  }

  /**
   * FIXED: subscribeToEvents signature to match ChainAdapter interface
   */
  subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string;
  subscribeToEvents(filter: EventFilter): AsyncIterator<ChainEvent>;
  subscribeToEvents(
    filterOrEventType: EventFilter | string, 
    callback?: (event: ChainEvent) => void
  ): string | AsyncIterator<ChainEvent> {
    if (typeof filterOrEventType === 'string' && callback) {
      // String + callback overload
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const filter: EventFilter = {
        eventTypes: [filterOrEventType],
        fromCommit: undefined,
        address: undefined
      };
      
      // Start the event watcher in the background
      (async () => {
        try {
          for await (const event of this.watchEvents(filter)) {
            callback(event);
          }
        } catch (error) {
          console.error(`Event subscription ${subscriptionId} error:`, error);
        }
      })();
      
      console.log('Event subscription created:', subscriptionId);
      return subscriptionId;
    } else {
      // EventFilter overload
      return this.watchEvents(filterOrEventType as EventFilter);
    }
  }

  // ========== Enhanced Move Contract Integration ==========

  /**
   * Call a Move contract function with automatic sponsor wallet handling
   * 
   * @param contractType - Type of contract (token, governance, etc.)
   * @param functionName - Name of the function to call
   * @param args - Function arguments
   * @param options - Call options
   */
  async callMoveFunction(
    contractType: keyof MoveContractMappings,
    functionName: string,
    args: any[] = [],
    options: {
      useSponsorWallet?: boolean;
      maxGas?: number;
      sender?: string;
    } = {}
  ): Promise<MoveCallResult> {
    if (!this._isConnected) {
      await this.connect();
    }

    try {
      // Get the contract address
      const contractAddress = this.getContractAddress(contractType);
      
      // Build the full function name with package ID
      const fullFunctionName = this.buildFullFunctionName(contractType, functionName);
      
      // Determine sender (sponsor wallet or user)
      const sender = this.determineSender(options);
      
      // Prepare the transaction
      const txData = {
        sender,
        function: fullFunctionName,
        arguments: this.serializeArgsForMove(args),
        type_arguments: [], // Add type arguments if needed
        gas_budget: options.maxGas || this.config.options?.maxFeePerTransaction || 50,
      };

      // Execute the call
      const result = await this.client.api.post('/api/v1/move/call', txData);
      
      if (result.data.success) {
        return {
          success: true,
          result: this.deserializeFromMoveVM(result.data.result),
          gasUsed: result.data.gas_used,
          events: result.data.events || [],
        };
      } else {
        return {
          success: false,
          error: result.data.error || 'Unknown Move function call error',
          gasUsed: result.data.gas_used,
        };
      }
    } catch (error) {
      console.error(`Move function call failed (${contractType}::${functionName}):`, error);
      return {
        success: false,
        error: (error as Error).message || 'Move function call failed',
      };
    }
  }

  /**
   * Enhanced submitTx with Move contract integration
   */
  async submitTx(tx: OmeoneTransaction): Promise<TransactionResult> {
    if (!this._isConnected) {
      await this.connect();
    }

    const retryAttempts = this.config.options?.retryAttempts || 3;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Route to appropriate Move contract based on payload type
        const result = await this.routeToMoveContract(tx);
        
        if (result.success) {
          return {
            id: result.result?.transaction_id || crypto.randomUUID(),
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            commitNumber: result.result?.commit_number,
            objectId: result.result?.object_id,
            gasUsed: result.gasUsed,
            events: result.events,
            details: result.result
          };
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } catch (error) {
        if (attempt === retryAttempts) {
          console.error(`Failed to submit transaction after ${retryAttempts} attempts:`, error);
          return {
            id: '',
            status: 'failed',
            timestamp: new Date().toISOString(),
            error: (error as Error).message
          };
        }
        
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Attempt ${attempt} failed, retrying in ${backoffMs}ms:`, (error as Error).message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    return {
      id: '',
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: 'Failed to submit transaction after exhausting retry attempts'
    };
  }

  // ========== TYPESCRIPT COMPATIBILITY FIXES ==========

  /**
   * Query objects from the chain - ADDED for ChainAdapter compatibility
   */
  async queryObjects(filter: any): Promise<any[]> {
    try {
      // Use existing queryState method for consistency
      const query: StateQuery = {
        objectType: filter.objectType || 'recommendation',
        filter: filter.filter || {},
        pagination: filter.pagination
      };
      
      const result = await this.queryState(query);
      return result.results;
    } catch (error) {
      console.error('Error querying objects:', error);
      throw new Error(`Failed to query objects: ${error}`);
    }
  }

  /**
   * Unsubscribe from chain events - ADDED for ChainAdapter compatibility
   */
  async unsubscribeFromEvents(subscriptionId: string): Promise<void> {
    try {
      // Stop the event iterator if it exists
      if (this.eventIterator) {
        await this.eventIterator.return?.();
        this.eventIterator = null;
      }
      console.log('Unsubscribed from events:', subscriptionId);
    } catch (error) {
      console.error('Error unsubscribing from events:', error);
      throw new Error(`Failed to unsubscribe from events: ${error}`);
    }
  }

  /**
   * Check if connected to node - ADDED for ChainAdapter compatibility
   */
  async isConnectedToNode(): Promise<boolean> {
    try {
      return this._isConnected && this.client !== null;
    } catch (error) {
      console.error('Error checking node connection:', error);
      return false;
    }
  }

  /**
   * Get wallet address - ADDED for ChainAdapter compatibility
   */
  async getWalletAddress(publicKey?: string): Promise<string> {
    try {
      if (publicKey) {
        // If public key provided, derive address from it
        // For now, return the configured address as fallback
        return this.config.account.address;
      }
      
      if (!this.config.account.address) {
        throw new Error('Wallet address not configured');
      }
      return this.config.account.address;
    } catch (error) {
      console.error('Error getting wallet address:', error);
      throw new Error(`Failed to get wallet address: ${error}`);
    }
  }

  /**
   * Health check for the adapter - ADDED for ChainAdapter compatibility
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const isConnected = await this.isConnectedToNode();
      if (!isConnected) {
        return { 
          healthy: false, 
          details: { error: 'Not connected to IOTA Rebased node' }
        };
      }
      
      // Test basic functionality
      try {
        const currentCommit = await this.getCurrentCommit();
        return { 
          healthy: true, 
          details: { 
            message: 'IOTA Rebased adapter healthy',
            currentCommit,
            nodeUrl: this.nodeUrl,
            network: this.config.network
          }
        };
      } catch (error) {
        return { 
          healthy: false, 
          details: { error: `Health check failed: ${(error as Error).message}` }
        };
      }
    } catch (error) {
      return { 
        healthy: false, 
        details: { error: `Health check failed: ${error}` }
      };
    }
  }

  // ========== OmeoneChain-Specific Move Contract Methods ==========

  /**
   * Token Operations
   */
  async createUserWallet(userAddress: string): Promise<MoveCallResult> {
    return await this.callMoveFunction('token', 'createUserWallet', [userAddress]);
  }

  async stakeTokens(
    userAddress: string, 
    amount: number, 
    stakeType: number, 
    lockPeriodMonths: number
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('token', 'stakeTokens', [
      userAddress,
      amount.toString(),
      stakeType.toString(),
      lockPeriodMonths.toString(),
      this.getCurrentTimestamp() // clock parameter
    ]);
  }

  async claimUserRewards(userAddress: string): Promise<MoveCallResult> {
    return await this.callMoveFunction('token', 'claimRewards', [userAddress]);
  }

  async getUserBalance(userAddress: string): Promise<{
    liquid: number;
    staked: number;
    pendingRewards: number;
    lifetimeRewards: number;
  }> {
    const result = await this.callMoveFunction('token', 'getBalance', [userAddress]);
    
    if (result.success && result.result) {
      return {
        liquid: parseInt(result.result.liquid || '0'),
        staked: parseInt(result.result.staked || '0'),
        pendingRewards: parseInt(result.result.pending_rewards || '0'),
        lifetimeRewards: parseInt(result.result.lifetime_rewards || '0'),
      };
    }
    
    return { liquid: 0, staked: 0, pendingRewards: 0, lifetimeRewards: 0 };
  }

  async getUserTrustScore(userAddress: string): Promise<number> {
    const result = await this.callMoveFunction('token', 'getTrustScore', [userAddress]);
    return result.success ? (parseInt(result.result || '0') / 100) : 0; // Convert from 0-100 to 0-1
  }

  async getUserReputationScore(userAddress: string): Promise<number> {
    const result = await this.callMoveFunction('token', 'getReputationScore', [userAddress]);
    return result.success ? parseInt(result.result || '0') : 0;
  }

  /**
   * Reward Distribution Operations
   */
  async submitRecommendationForReward(
    userAddress: string,
    actionId: string,
    actionType: number = 1
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'submitActionForReward', [
      this.config.contractAddresses.rewards, // RewardTracker object
      userAddress, // UserWallet object
      this.stringToBytes(actionId), // action_id as bytes
      actionType.toString(),
      this.getCurrentTimestamp() // clock object
    ]);
  }

  async addSocialEndorsement(
    endorserAddress: string,
    actionId: string,
    socialDistance: number = 1
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'addSocialEndorsement', [
      this.config.contractAddresses.rewards,
      endorserAddress,
      this.stringToBytes(actionId),
      socialDistance.toString(),
      this.getCurrentTimestamp()
    ]);
  }

  async claimRecommendationReward(
    userAddress: string,
    actionId: string
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'claimReward', [
      this.config.contractAddresses.rewards, // RewardTracker
      this.config.contractAddresses.token,   // TokenRegistry
      userAddress,                           // UserWallet
      this.stringToBytes(actionId),          // action_id
      this.getCurrentTimestamp()             // clock
    ]);
  }

  async checkRewardEligibility(actionId: string): Promise<{
    trustScore: number;
    endorsements: number;
    potentialReward: number;
    isEligible: boolean;
  }> {
    const result = await this.callMoveFunction('rewards', 'getPendingRewardInfo', [
      this.config.contractAddresses.rewards,
      this.stringToBytes(actionId)
    ]);
    
    if (result.success && result.result) {
      return {
        trustScore: parseInt(result.result.current_trust_score || '0') / 100,
        endorsements: parseInt(result.result.endorsement_count || '0'),
        potentialReward: parseInt(result.result.potential_reward || '0') / 1000000, // Convert from micro-tokens
        isEligible: result.result.is_eligible || false,
      };
    }
    
    return { trustScore: 0, endorsements: 0, potentialReward: 0, isEligible: false };
  }

  async distributeOnboardingReward(
    userAddress: string,
    milestone: number
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'distributeOnboardingReward', [
      this.config.contractAddresses.token,
      userAddress,
      milestone.toString(),
      this.getCurrentTimestamp()
    ]);
  }

  async distributeLeaderboardReward(
    userAddress: string,
    position: number
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'distributeLeaderboardReward', [
      this.config.contractAddresses.token,
      userAddress,
      position.toString(),
      this.getCurrentTimestamp()
    ]);
  }

  // ========== All other existing methods remain the same ==========
  
  async getChainId(): Promise<string> {
    if (!this._isConnected) {
      await this.connect();
    }
    
    if (!this.currentChainId) {
      try {
        const info = await this.client.getNodeInfo();
        this.currentChainId = info.network || `rebased-${this.config.network}`;
      } catch (error) {
        console.error('Failed to get chain ID:', error);
        throw new Error('Could not retrieve chain ID');
      }
    }
    
    return this.currentChainId;
  }

  async queryState<T>(query: StateQuery): Promise<{
    results: T[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    if (!this._isConnected) {
      await this.connect();
    }
    
    try {
      const contractType = this.getContractTypeFromObjectType(query.objectType);
      const contractAddress = this.getContractAddress(contractType);
      
      let method = 'get';
      if (query.filter && query.filter.id) {
        method = `get_${query.objectType}`;
      } else {
        method = `list_${query.objectType}s`;
      }
      
      const args = this.formatQueryArgs(query);
      const result = await this.client.queryContract(contractAddress, method, args);
      
      const items = Array.isArray(result) ? result : [result];
      const deserializedItems = items.map(item => this.deserializeFromMoveVM(item)) as T[];
      
      const pagination = query.pagination ? {
        offset: query.pagination.offset,
        limit: query.pagination.limit,
        hasMore: deserializedItems.length >= query.pagination.limit
      } : undefined;
      
      return {
        results: deserializedItems,
        total: pagination ? items.length + pagination.offset : items.length,
        pagination
      };
    } catch (error) {
      console.error('Failed to query state:', error);
      throw new Error(`State query failed: ${(error as Error).message}`);
    }
  }

  async getCurrentCommit(): Promise<number> {
    if (!this._isConnected) {
      await this.connect();
    }
    
    try {
      const info = await this.client.getNodeInfo();
      return info.latestCommitNumber || 0;
    } catch (error) {
      console.error('Failed to get current commit number:', error);
      throw new Error('Could not retrieve current commit number');
    }
  }

  async estimateFee(tx: Transaction): Promise<number> {
    const baseFee = 5;
    let complexityMultiplier = 1;
    
    const txType = this.getTxTypeFromPayload(tx.payload);
    
    switch (txType) {
      case 'createRecommendation':
        complexityMultiplier = 2;
        break;
      case 'submitProposal':
        complexityMultiplier = 3;
        break;
      case 'registerService':
        complexityMultiplier = 2;
        break;
      default:
        complexityMultiplier = 1;
    }
    
    const payloadSize = JSON.stringify(tx.payload).length;
    const sizeMultiplier = Math.ceil(payloadSize / 1024);
    
    let estimatedFee = baseFee * complexityMultiplier * sizeMultiplier;
    const maxFee = this.config.options?.maxFeePerTransaction || 50;
    estimatedFee = Math.min(estimatedFee, maxFee);
    
    return estimatedFee;
  }

  async disconnect(): Promise<void> {
    if (this.eventIterator) {
      try {
        await this.eventIterator.return?.();
      } catch (error) {
        console.warn('Error closing event iterator:', error);
      }
      this.eventIterator = null;
    }
    
    this._isConnected = false;
    console.log('Disconnected from IOTA Rebased node');
  }

  private async initializeWallet(seed: string): Promise<void> {
    try {
      const seedBytes = Ed25519Seed.fromMnemonic(seed);
      
      this.wallet = new IotaWallet({
        storagePath: './wallet-database',
        clientOptions: {
          nodes: [this.nodeUrl],
          localPow: true,
        },
        secretManager: {
          stronghold: {
            password: crypto.randomBytes(32).toString('hex'),
            snapshotPath: './wallet.stronghold',
          },
        },
      });
      
      const account = await this.wallet.createAccount({
        alias: 'OmeoneChain',
      });
      
      console.log('Wallet initialized successfully');
      console.log(`Address: ${(await account.addresses())[0].address}`);
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw new Error('Wallet initialization failed');
    }
  }

  // Legacy method support
  public async submitTransaction(transaction: any): Promise<any> {
    if (!this._isConnected) {
      await this.connect();
    }
    
    try {
      const tx: OmeoneTransaction = {
        sender: transaction.sender,
        payload: {
          type: transaction.type,
          action: transaction.action,
          data: transaction.data
        },
        feeOptions: {
          maxFee: transaction.fee
        }
      };
      
      const result = await this.submitTx(tx);
      
      return {
        transactionId: result.id,
        objectId: result.objectId,
        commitNumber: result.commitNumber,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error('Transaction submission failed:', error);
      throw new Error(`Failed to submit transaction: ${(error as Error).message}`);
    }
  }

  // ========== Helper Methods ==========

  private async routeToMoveContract(tx: OmeoneTransaction): Promise<MoveCallResult> {
    const { type, action, data } = tx.payload;
    
    switch (type) {
      case 'token':
        return await this.handleTokenTransaction(action, data, tx.sender);
        
      case 'reward':
        return await this.handleRewardTransaction(action, data, tx.sender);
        
      case 'governance':
        return await this.handleGovernanceTransaction(action, data, tx.sender);
        
      case 'reputation':
        return await this.handleReputationTransaction(action, data, tx.sender);
        
      default:
        throw new Error(`Unknown transaction type: ${type}`);
    }
  }

  private async handleTokenTransaction(action: string, data: any, sender: string): Promise<MoveCallResult> {
    switch (action) {
      case 'stake':
        return await this.stakeTokens(sender, data.amount, data.stakeType, data.lockPeriod);
        
      case 'claim_rewards':
        return await this.claimUserRewards(sender);
        
      case 'create_wallet':
        return await this.createUserWallet(sender);
        
      default:
        throw new Error(`Unknown token action: ${action}`);
    }
  }

  private async handleRewardTransaction(action: string, data: any, sender: string): Promise<MoveCallResult> {
    switch (action) {
      case 'submit_recommendation':
        return await this.submitRecommendationForReward(sender, data.actionId, data.actionType);
        
      case 'endorse':
        return await this.addSocialEndorsement(sender, data.actionId, data.socialDistance);
        
      case 'claim_reward':
        return await this.claimRecommendationReward(sender, data.actionId);
        
      case 'onboarding':
        return await this.distributeOnboardingReward(sender, data.milestone);
        
      case 'leaderboard':
        return await this.distributeLeaderboardReward(sender, data.position);
        
      default:
        throw new Error(`Unknown reward action: ${action}`);
    }
  }

  private async handleGovernanceTransaction(action: string, data: any, sender: string): Promise<MoveCallResult> {
    switch (action) {
      case 'create_proposal':
        return await this.createGovernanceProposal(sender, data.title, data.description, data.type);
        
      case 'vote':
        return await this.voteOnProposal(sender, data.proposalId, data.support);
        
      default:
        throw new Error(`Unknown governance action: ${action}`);
    }
  }

  private async handleReputationTransaction(action: string, data: any, sender: string): Promise<MoveCallResult> {
    // Implement reputation-specific transactions
    throw new Error(`Reputation transactions not yet implemented: ${action}`);
  }

  private getContractAddress(contractType: keyof MoveContractMappings): string {
    switch (contractType) {
      case 'token':
        return this.config.contractAddresses.token;
      case 'rewards':
        return this.config.contractAddresses.rewards || this.config.contractAddresses.token;
      case 'governance':
        return this.config.contractAddresses.governance;
      case 'reputation':
        return this.config.contractAddresses.reputation;
      default:
        throw new Error(`Unknown contract type: ${contractType}`);
    }
  }

  private buildFullFunctionName(contractType: keyof MoveContractMappings, functionName: string): string {
    const contractMappings = this.moveContracts[contractType];
    const moveFunction = contractMappings[functionName as keyof typeof contractMappings];
    
    if (!moveFunction) {
      throw new Error(`Unknown function ${functionName} for contract ${contractType}`);
    }
    
    // Build full function name with package ID
    const packageId = this.config.packageId || '0x1';
    return `${packageId}::${moveFunction}`;
  }

  private determineSender(options: { useSponsorWallet?: boolean; sender?: string }): string {
    if (options.sender) {
      return options.sender;
    }
    
    if (options.useSponsorWallet !== false && 
        this.config.options?.enableSponsorWallet && 
        this.config.sponsorWallet?.address) {
      return this.config.sponsorWallet.address;
    }
    
    return this.config.account.address;
  }

  private serializeArgsForMove(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      } else if (typeof arg === 'number') {
        return arg.toString();
      } else if (typeof arg === 'boolean') {
        return arg.toString();
      } else if (Array.isArray(arg)) {
        return arg;
      } else if (typeof arg === 'object') {
        return JSON.stringify(arg);
      } else {
        return arg.toString();
      }
    });
  }

  private stringToBytes(str: string): number[] {
    return Array.from(new TextEncoder().encode(str));
  }

  private getCurrentTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString(); // Unix timestamp
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = {
        api: axios.create({
          baseURL: this.nodeUrl,
          timeout: this.config.options?.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {})
          },
        }),
        async getNodeInfo() {
          const response = await this.api.get('/api/v1/info');
          return response.data;
        },
        async getAccount(address: string) {
          const response = await this.api.get(`/api/v1/accounts/${address}`);
          return response.data;
        },
        async submitTransaction(tx: any) {
          const response = await this.api.post('/api/v1/transactions', tx);
          return response.data;
        },
        async getTransactionStatus(txId: string) {
          const response = await this.api.get(`/api/v1/transactions/${txId}/status`);
          return response.data;
        },
        async queryContract(address: string, method: string, args: any[]) {
          const response = await this.api.post(`/api/v1/contracts/${address}/call`, {
            method,
            args,
          });
          return response.data;
        },
        async watchEvents(contractAddress: string, eventName: string, callback: Function) {
          const interval = setInterval(async () => {
            try {
              const response = await this.api.get(`/api/v1/contracts/${contractAddress}/events?name=${eventName}`);
              if (response.data.events && response.data.events.length > 0) {
                response.data.events.forEach((event: any) => {
                  callback(event);
                });
              }
            } catch (error) {
              console.error('Error watching events:', error);
            }
          }, 5000);
          
          return () => clearInterval(interval);
        }
      };
    } catch (error) {
      console.error('Failed to initialize IOTA Rebased client:', error);
      throw new Error(`RebasedAdapter initialization failed: ${(error as Error).message}`);
    }
  }

  private getContractTypeFromObjectType(objectType: string): keyof MoveContractMappings {
    switch (objectType.toLowerCase()) {
      case 'recommendation':
        return 'token'; // Recommendations are stored in token contract
      case 'reputation':
      case 'user':
      case 'profile':
        return 'reputation';
      case 'token':
      case 'transaction':
        return 'token';
      case 'governance':
      case 'proposal':
        return 'governance';
      case 'reward':
        return 'rewards';
      default:
        throw new Error(`Unknown object type: ${objectType}`);
    }
  }

  private getContractTypeFromEventType(eventType: string): keyof MoveContractMappings {
    if (eventType.includes('recommendation')) {
      return 'token';
    } else if (eventType.includes('reputation') || eventType.includes('user')) {
      return 'reputation';
    } else if (eventType.includes('token') || eventType.includes('transfer')) {
      return 'token';
    } else if (eventType.includes('governance') || eventType.includes('proposal')) {
      return 'governance';
    } else if (eventType.includes('reward')) {
      return 'rewards';
    } else {
      throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  private formatQueryArgs(query: StateQuery): any[] {
    const args: any[] = [];
    
    if (query.filter && query.filter.id) {
      args.push(query.filter.id);
    }
    
    if (query.filter) {
      const filterObj = { ...query.filter };
      delete filterObj.id;
      
      if (Object.keys(filterObj).length > 0) {
        args.push(JSON.stringify(filterObj));
      }
    }
    
    if (query.pagination) {
      args.push(query.pagination.limit);
      args.push(query.pagination.offset);
    }
    
    if (query.sort) {
      args.push(JSON.stringify({
        field: query.sort.field,
        direction: query.sort.direction
      }));
    }
    
    return args;
  }

  private getTxTypeFromPayload(payload: any): string {
    if (payload.type) {
      return payload.type;
    }
    
    if (payload.recommendation || payload.serviceId) {
      return 'createRecommendation';
    } else if (payload.reputationScore || payload.userId) {
      return 'updateReputation';
    } else if (payload.amount || payload.recipient) {
      return 'transferTokens';
    } else if (payload.title || payload.proposalId) {
      return 'submitProposal';
    } else if (payload.name && payload.category) {
      return 'registerService';
    }
    
    return 'unknown';
  }

  private deserializeFromMoveVM(data: any): any {
    if (typeof data === 'string') {
      if (data.startsWith('{') || data.startsWith('[')) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }
      
      if (data.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
        return new Date(data);
      }
      
      if (data.match(/^\d+$/)) {
        const num = parseInt(data, 10);
        if (!isNaN(num)) {
          return num;
        }
      }
      
      return data;
    } else if (Array.isArray(data)) {
      return data.map(item => this.deserializeFromMoveVM(item));
    } else if (data !== null && typeof data === 'object') {
      const result: Record<string, any> = {};
      for (const key in data) {
        result[key] = this.deserializeFromMoveVM(data[key]);
      }
      return result;
    } else {
      return data;
    }
  }

  private pollForEvents(): void {
    // Implementation for polling events if needed
    // Your existing implementation here
  }

  // Add the missing discovery campaign and reputation methods that were in the original
  async updateUserReputationOnChain(
    userId: string,
    reputationScore: number,
    verificationLevel: number,
    socialConnections: Array<{
      targetId: string;
      trustWeight: number;
      connectionType: number;
    }> = []
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('reputation', 'updateUserReputation', [
      userId,
      Math.floor(reputationScore), // Convert to integer
      verificationLevel, // 0=basic, 1=verified, 2=expert
      JSON.stringify(socialConnections),
      this.getCurrentTimestamp()
    ]);
  }

  async submitCommunityVerificationOnChain(
    verifierId: string,
    targetUserId: string,
    evidence: string,
    category: string,
    verificationHash: string
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('reputation', 'submitCommunityVerification', [
      verifierId,
      targetUserId,
      this.stringToBytes(evidence),
      this.stringToBytes(category),
      this.stringToBytes(verificationHash),
      this.getCurrentTimestamp()
    ]);
  }

  async addSocialConnectionOnChain(
    followerId: string,
    followedId: string,
    trustWeight: number,
    connectionType: number = 1
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('reputation', 'addSocialConnection', [
      followerId,
      followedId,
      Math.floor(trustWeight * 1000), // Convert 0.75 -> 750
      connectionType, // 1=direct, 2=friend-of-friend
      this.getCurrentTimestamp()
    ]);
  }

  async removeSocialConnectionOnChain(
    followerId: string,
    followedId: string
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('reputation', 'removeSocialConnection', [
      followerId,
      followedId,
      this.getCurrentTimestamp()
    ]);
  }

  async claimDiscoveryBonusOnChain(
    userId: string,
    campaignId: string,
    recommendationIds: string[]
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('rewards', 'claimDiscoveryBonus', [
      this.config.contractAddresses.rewards,
      userId,
      this.stringToBytes(campaignId),
      recommendationIds.map(id => this.stringToBytes(id)),
      this.getCurrentTimestamp()
    ]);
  }

  async getOnChainReputationData(userId: string): Promise<{
    reputationScore: number;
    verificationLevel: number;
    socialConnections: number;
    lastUpdated: string;
    verificationCount: number;
  }> {
    const result = await this.callMoveFunction('reputation', 'getUserReputation', [userId]);
    
    if (result.success && result.result) {
      return {
        reputationScore: parseInt(result.result.reputation_score || '0') / 100, // Convert from integer
        verificationLevel: parseInt(result.result.verification_level || '0'),
        socialConnections: parseInt(result.result.connection_count || '0'),
        lastUpdated: result.result.last_updated || new Date().toISOString(),
        verificationCount: parseInt(result.result.verification_count || '0'),
      };
    }
    
    return {
      reputationScore: 0,
      verificationLevel: 0,
      socialConnections: 0,
      lastUpdated: new Date().toISOString(),
      verificationCount: 0,
    };
  }

  async getActiveDiscoveryCampaignsOnChain(region?: string, category?: string): Promise<Array<{
    campaignId: string;
    region: string;
    category: string;
    bonusMultiplier: number;
    targetRecommendations: number;
    expiresAt: string;
    minTrustScore: number;
    bonusPool: number;
    participantCount: number;
  }>> {
    const result = await this.callMoveFunction('rewards', 'getActiveCampaigns', [
      this.config.contractAddresses.rewards,
      region || '',
      category || ''
    ]);
    
    if (result.success && result.result && Array.isArray(result.result)) {
      return result.result.map((campaign: any) => ({
        campaignId: campaign.campaign_id || '',
        region: campaign.region || '',
        category: campaign.category || '',
        bonusMultiplier: (parseInt(campaign.bonus_multiplier || '100') / 100), // Convert from integer
        targetRecommendations: parseInt(campaign.target_recommendations || '0'),
        expiresAt: campaign.expires_at || '',
        minTrustScore: (parseInt(campaign.min_trust_score || '25') / 100), // Convert from integer
        bonusPool: parseInt(campaign.bonus_pool || '0'),
        participantCount: parseInt(campaign.participant_count || '0'),
      }));
    }
    
    return [];
  }

  async calculateTrustScoreOnChain(
    sourceUserId: string,
    targetUserId: string,
    maxDepth: number = 2
  ): Promise<{
    trustScore: number;
    directConnection: boolean;
    shortestPath: number;
    socialDistance: number;
  }> {
    const result = await this.callMoveFunction('reputation', 'calculateTrustScore', [
      sourceUserId,
      targetUserId,
      maxDepth.toString()
    ]);
    
    if (result.success && result.result) {
      return {
        trustScore: (parseInt(result.result.trust_score || '0') / 1000), // Convert from integer
        directConnection: result.result.direct_connection || false,
        shortestPath: parseInt(result.result.shortest_path || '999'),
        socialDistance: parseInt(result.result.social_distance || '999'),
      };
    }
    
    return {
      trustScore: 0,
      directConnection: false,
      shortestPath: 999,
      socialDistance: 999,
    };
  }

  async syncReputationWithBlockchain(
    userId: string,
    offChainData: {
      reputationScore: number;
      verificationLevel: string;
      socialConnections: number;
    }
  ): Promise<{
    synced: boolean;
    discrepancies: string[];
    transactionId?: string;
  }> {
    try {
      // Get on-chain data
      const onChainData = await this.getOnChainReputationData(userId);
      
      const discrepancies: string[] = [];
      
      // Check reputation score (allow 10 point difference for rounding)
      const scoreDiff = Math.abs(offChainData.reputationScore - (onChainData.reputationScore * 1000));
      if (scoreDiff > 10) {
        discrepancies.push(`Reputation score: off-chain ${offChainData.reputationScore}, on-chain ${onChainData.reputationScore * 1000}`);
      }
      
      // Check verification level
      const verificationLevelMap = { 'basic': 0, 'verified': 1, 'expert': 2 };
      const expectedLevel = verificationLevelMap[offChainData.verificationLevel as keyof typeof verificationLevelMap] || 0;
      if (expectedLevel !== onChainData.verificationLevel) {
        discrepancies.push(`Verification level: off-chain ${offChainData.verificationLevel}, on-chain ${onChainData.verificationLevel}`);
      }
      
      // If discrepancies found, update on-chain
      if (discrepancies.length > 0) {
        const updateResult = await this.updateUserReputationOnChain(
          userId,
          offChainData.reputationScore,
          expectedLevel
        );
        
        return {
          synced: updateResult.success,
          discrepancies,
          transactionId: updateResult.result?.transaction_id,
        };
      }
      
      return {
        synced: true,
        discrepancies: [],
      };
    } catch (error) {
      return {
        synced: false,
        discrepancies: [`Sync failed: ${(error as Error).message}`],
      };
    }
  }

  async createGovernanceProposal(
    proposerAddress: string,
    title: string,
    description: string,
    proposalType: string
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('governance', 'createProposal', [
      this.config.contractAddresses.governance,
      proposerAddress,
      this.stringToBytes(title),
      this.stringToBytes(description),
      this.stringToBytes(proposalType),
      this.getCurrentTimestamp()
    ]);
  }

  async voteOnProposal(
    voterAddress: string,
    proposalId: string,
    support: boolean
  ): Promise<MoveCallResult> {
    return await this.callMoveFunction('governance', 'vote', [
      this.config.contractAddresses.governance,
      voterAddress,
      this.stringToBytes(proposalId),
      support.toString(),
      this.getCurrentTimestamp()
    ]);
  }

  async getCurrentRewardRate(): Promise<number> {
    const result = await this.callMoveFunction('token', 'getCurrentRewardRate', [
      this.config.contractAddresses.token
    ]);
    return result.success ? parseInt(result.result || '1000') : 1000;
  }

  async getTotalRewardsDistributed(): Promise<number> {
    const result = await this.callMoveFunction('token', 'getTotalRewardsDistributed', [
      this.config.contractAddresses.token
    ]);
    return result.success ? parseInt(result.result || '0') : 0;
  }

  async getSystemStats(): Promise<{
    currentRewardRate: number;
    totalDistributed: number;
    activeUsers: number;
  }> {
    const [rewardRate, totalDistributed] = await Promise.all([
      this.getCurrentRewardRate(),
      this.getTotalRewardsDistributed()
    ]);
    
    return {
      currentRewardRate: rewardRate,
      totalDistributed,
      activeUsers: 0, // Would need separate tracking
    };
  }
}