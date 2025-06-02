// code/poc/core/src/adapters/rebased-adapter.ts
// Enhanced version with Move contract integration

import { ChainAdapter, Transaction, TransactionResult, StateQuery, EventFilter, Event } from '../types/chain';
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
  private isConnected: boolean = false;
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
    if (!this.isConnected) {
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
        error: error.message || 'Move function call failed',
      };
    }
  }

  /**
   * Enhanced submitTx with Move contract integration
   */
  async submitTx(tx: OmeoneTransaction): Promise<TransactionResult> {
    if (!this.isConnected) {
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
            error: error.message
          };
        }
        
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Attempt ${attempt} failed, retrying in ${backoffMs}ms:`, error.message);
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

  /**
   * Governance Operations
   */
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

  /**
   * System State Queries
   */
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

  // ========== Keep All Existing Methods ==========
  
  // [Keep all your existing methods from the original file]
  // This includes: initializeClient, getChainId, queryState, watchEvents, 
  // getCurrentCommit, estimateFee, connect, disconnect, initializeWallet,
  // submitTransaction, queryObjectState, queryObjects, subscribeToEvents,
  // unsubscribeFromEvents, pollForEvents, callContractFunction, 
  // getWalletAddress, isConnectedToNode, and all helper methods
  
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
      throw new Error(`RebasedAdapter initialization failed: ${error.message}`);
    }
  }

  async getChainId(): Promise<string> {
    if (!this.isConnected) {
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
    if (!this.isConnected) {
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
      throw new Error(`State query failed: ${error.message}`);
    }
  }

  async *watchEvents(filter: EventFilter): AsyncIterator<Event> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    if (this.eventIterator) {
      try {
        await this.eventIterator.return?.();
      } catch (error) {
        console.warn('Error closing previous event iterator:', error);
      }
    }
    
    const eventQueue: Event[] = [];
    let resolveNext: ((value: IteratorResult<Event>) => void) | null = null;
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
            
            if (filter.filter) {
              for (const key in filter.filter) {
                if (eventData.data[key] !== filter.filter[key]) {
                  return;
                }
              }
            }
            
            const event: Event = {
              type: eventType,
              commitNumber: eventData.commitNumber,
              timestamp: eventData.timestamp,
              address: eventData.address || contractAddress,
              data: this.deserializeFromMoveVM(eventData.data)
            };
            
            if (resolveNext) {
              const resolver = resolveNext;
              resolveNext = null;
              resolver({
                done: false,
                value: event
              });
            } else {
              eventQueue.push(event);
            }
          }
        );
        
        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error(`Failed to watch events for type ${eventType}:`, error);
      }
    }
    
    this.eventIterator = {
      next: async (): Promise<IteratorResult<Event>> => {
        if (!isActive) {
          return { done: true, value: undefined };
        }
        
        if (eventQueue.length > 0) {
          return {
            done: false,
            value: eventQueue.shift()!
          };
        }
        
        return new Promise<IteratorResult<Event>>(resolve => {
          resolveNext = resolve;
        });
      },
      
      return: async (): Promise<IteratorResult<Event>> => {
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
    
    return this.eventIterator;
  }

  async getCurrentCommit(): Promise<number> {
    if (!this.isConnected) {
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

  async connect(options?: Record<string, any>): Promise<void> {
    try {
      const nodeInfo = await this.client.getNodeInfo();
      
      console.log(`Connected to IOTA Rebased ${this.config.network} node:`, nodeInfo.version);
      console.log(`Network: ${nodeInfo.network}`);
      
      this.currentChainId = nodeInfo.network || `rebased-${this.config.network}`;
      this.pollForEvents();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to IOTA Rebased node:', error);
      this.isConnected = false;
      throw new Error(`Connection failed: ${error.message}`);
    }
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
    
    this.isConnected = false;
    console.log('Disconnected from IOTA Rebased node');
  }

  // [Continue with all other existing methods...]
  // Include: initializeWallet, submitTransaction, queryObjectState, queryObjects,
  // subscribeToEvents, unsubscribeFromEvents, pollForEvents, callContractFunction,
  // getWalletAddress, isConnectedToNode, and all private helper methods

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
    if (!this.isConnected) {
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
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  // [Include all other existing methods with proper TypeScript types]
  // Keep all functionality from your original implementation

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

  // [Add any remaining methods from your original implementation]
}