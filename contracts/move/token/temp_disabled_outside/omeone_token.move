// contracts/move/token/sources/omeone_token.move
module omeone_token::omeone_token {
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::object::{Self, UID};
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use iota::balance::{Self, Balance};
    use iota::table::{Self, Table};
    use iota::clock::{Self, Clock};
    use iota::event;
    use std::option;

    // ========== Error Codes ==========
    const EInsufficientBalance: u64 = 1;
    const EInvalidReward: u64 = 2;
    const EHalvingNotReached: u64 = 3;
    const EInvalidTrustScore: u64 = 4;
    const EStakingPeriodNotMet: u64 = 5;

    // ========== Constants ==========
    const TOTAL_SUPPLY: u64 = 10_000_000_000; // 10 billion tokens
    const REWARDS_POOL: u64 = 5_200_000_000;  // 52% for rewards
    const DECIMALS: u8 = 6;
    const MIN_TRUST_SCORE_FOR_REWARD: u64 = 25; // 0.25 * 100
    const MAX_TRUST_MULTIPLIER: u64 = 300; // 3.0 * 100

    // ========== Structs ==========
    
    /// The OmeoneToken coin type
    public struct OMEONE_TOKEN has drop {}

    /// Global token state and economics
    public struct TokenRegistry has key {
        id: UID,
        /// Treasury capability for minting
        treasury_cap: TreasuryCap<OMEONE_TOKEN>,
        /// Current supply distributed from rewards pool
        rewards_distributed: u64,
        /// Current halving period (0-9, representing 10 halving events)
        current_halving_period: u8,
        /// Tokens distributed in current period
        current_period_distributed: u64,
        /// Threshold for next halving (10% increments)
        next_halving_threshold: u64,
        /// Base reward rate (starts high, halves each period)
        base_reward_rate: u64,
        /// Sponsor wallet for fee-less transactions
        sponsor_wallet: Balance<OMEONE_TOKEN>,
    }

    /// User wallet and staking information
    public struct UserWallet has key {
        id: UID,
        /// User's address
        owner: address,
        /// Liquid token balance
        balance: Balance<OMEONE_TOKEN>,
        /// Staked tokens with lock periods
        staked_tokens: Table<u64, StakeInfo>, // stake_id -> StakeInfo
        /// Total reputation score (influences rewards)
        reputation_score: u64,
        /// Trust score (0-100, represents 0.0-1.0)
        trust_score: u64,
        /// Total rewards earned lifetime
        lifetime_rewards: u64,
        /// Pending rewards to be claimed
        pending_rewards: u64,
    }

    /// Staking information
    public struct StakeInfo has store {
        amount: u64,
        stake_type: u8, // 1=Explorer(25), 2=Curator(100), 3=Passport(50), 4=Validator(1000)
        lock_period_months: u8,
        stake_timestamp: u64,
        unlock_timestamp: u64,
    }

    /// Reward distribution event
    public struct RewardDistributed has copy, drop {
        recipient: address,
        amount: u64,
        reason: vector<u8>, // "recommendation", "upvote", "curation", etc.
        trust_multiplier: u64,
    }

    /// Halving event
    public struct HalvingTriggered has copy, drop {
        period: u8,
        new_reward_rate: u64,
        total_distributed: u64,
    }

    /// Staking event
    public struct TokensStaked has copy, drop {
        user: address,
        amount: u64,
        stake_type: u8,
        lock_period: u8,
    }

    // ========== Initialize Function ==========
    
    fun init(witness: OMEONE_TOKEN, ctx: &mut TxContext) {
        // Create the currency
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            DECIMALS,
            b"TOK",
            b"OmeoneToken",
            b"The native token of OmeoneChain recommendation network",
            option::none(),
            ctx
        );

        // Create token registry
        let registry = TokenRegistry {
            id: object::new(ctx),
            treasury_cap,
            rewards_distributed: 0,
            current_halving_period: 0,
            current_period_distributed: 0,
            next_halving_threshold: REWARDS_POOL / 10, // First halving at 10%
            base_reward_rate: 1000, // Starting reward rate (can be adjusted)
            sponsor_wallet: balance::zero<OMEONE_TOKEN>(),
        };

        // Share objects
        transfer::share_object(registry);
        transfer::public_freeze_object(metadata);
    }

    // ========== User Wallet Management ==========

    /// Create a new user wallet
    public fun create_user_wallet(ctx: &mut TxContext): UserWallet {
        UserWallet {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            balance: balance::zero<OMEONE_TOKEN>(),
            staked_tokens: table::new<u64, StakeInfo>(ctx),
            reputation_score: 0,
            trust_score: 0,
            lifetime_rewards: 0,
            pending_rewards: 0,
        }
    }

    /// Get user balance
    public fun get_balance(wallet: &UserWallet): u64 {
        balance::value(&wallet.balance)
    }

    /// Get user trust score
    public fun get_trust_score(wallet: &UserWallet): u64 {
        wallet.trust_score
    }

    /// Get user reputation score
    public fun get_reputation_score(wallet: &UserWallet): u64 {
        wallet.reputation_score
    }

    // ========== Reward Distribution ==========

    /// Distribute reward based on trust score and social weight
    /// This is called when a recommendation reaches Trust >= 0.25
    public fun distribute_reward(
        registry: &mut TokenRegistry,
        recipient_wallet: &mut UserWallet,
        trust_score: u64,
        social_weights_sum: u64, // Sum of trust weights from social graph
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate trust score meets minimum threshold
        assert!(trust_score >= MIN_TRUST_SCORE_FOR_REWARD, EInvalidTrustScore);
        
        // Calculate base reward
        let base_reward = registry.base_reward_rate;
        
        // Apply trust multiplier (capped at 3x)
        let trust_multiplier = if (social_weights_sum > MAX_TRUST_MULTIPLIER) {
            MAX_TRUST_MULTIPLIER
        } else {
            social_weights_sum
        };
        
        // Calculate final reward: base_reward * trust_multiplier / 100
        let final_reward = (base_reward * trust_multiplier) / 100;
        
        // Check if halving is needed
        check_and_trigger_halving(registry);
        
        // Mint tokens for reward
        let reward_coin = coin::mint(&mut registry.treasury_cap, final_reward, ctx);
        let reward_balance = coin::into_balance(reward_coin);
        
        // Add to user's pending rewards
        recipient_wallet.pending_rewards = recipient_wallet.pending_rewards + final_reward;
        recipient_wallet.lifetime_rewards = recipient_wallet.lifetime_rewards + final_reward;
        
        // Update distribution tracking
        registry.rewards_distributed = registry.rewards_distributed + final_reward;
        registry.current_period_distributed = registry.current_period_distributed + final_reward;
        
        // Emit event
        event::emit(RewardDistributed {
            recipient: recipient_wallet.owner,
            amount: final_reward,
            reason: b"recommendation_reward",
            trust_multiplier,
        });
    }

    /// Claim pending rewards
    public fun claim_rewards(
        wallet: &mut UserWallet,
        ctx: &mut TxContext
    ): Coin<OMEONE_TOKEN> {
        let amount = wallet.pending_rewards;
        wallet.pending_rewards = 0;
        
        // Convert balance to coin for transfer
        let reward_balance = balance::split(&mut wallet.balance, amount);
        coin::from_balance(reward_balance, ctx)
    }

    // ========== Staking System ==========

    /// Stake tokens with specified type and lock period
    public fun stake_tokens(
        wallet: &mut UserWallet,
        amount: u64,
        stake_type: u8, // 1=Explorer, 2=Curator, 3=Passport, 4=Validator
        lock_period_months: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate sufficient balance
        assert!(balance::value(&wallet.balance) >= amount, EInsufficientBalance);
        
        // Validate stake type requirements
        let min_amount = get_min_stake_amount(stake_type);
        assert!(amount >= min_amount, EInsufficientBalance);
        
        // Calculate unlock timestamp
        let current_time = clock::timestamp_ms(clock);
        let lock_duration_ms = (lock_period_months as u64) * 30 * 24 * 60 * 60 * 1000; // months to ms
        let unlock_timestamp = current_time + lock_duration_ms;
        
        // Create stake info
        let stake_info = StakeInfo {
            amount,
            stake_type,
            lock_period_months,
            stake_timestamp: current_time,
            unlock_timestamp,
        };
        
        // Generate stake ID (using current time + amount as simple ID)
        let stake_id = current_time + amount;
        
        // Move tokens from balance to staking
        let staked_balance = balance::split(&mut wallet.balance, amount);
        balance::destroy_zero(staked_balance); // In real implementation, tokens would be locked
        
        // Record stake
        table::add(&mut wallet.staked_tokens, stake_id, stake_info);
        
        // Emit event
        event::emit(TokensStaked {
            user: wallet.owner,
            amount,
            stake_type,
            lock_period: lock_period_months,
        });
    }

    /// Get minimum stake amount for stake type
    fun get_min_stake_amount(stake_type: u8): u64 {
        if (stake_type == 1) { 25 * 1000000 }      // Explorer: 25 TOK
        else if (stake_type == 2) { 100 * 1000000 } // Curator: 100 TOK
        else if (stake_type == 3) { 50 * 1000000 }  // Passport: 50 TOK
        else if (stake_type == 4) { 1000 * 1000000 } // Validator: 1000 TOK
        else { 0 }
    }

    // ========== Halving Mechanism ==========

    /// Check if halving threshold is reached and trigger if needed
    fun check_and_trigger_halving(registry: &mut TokenRegistry) {
        if (registry.rewards_distributed >= registry.next_halving_threshold && 
            registry.current_halving_period < 9) {
            
            // Trigger halving
            registry.current_halving_period = registry.current_halving_period + 1;
            registry.base_reward_rate = registry.base_reward_rate / 2;
            registry.current_period_distributed = 0;
            
            // Set next threshold (another 10% of total rewards pool)
            registry.next_halving_threshold = registry.next_halving_threshold + (REWARDS_POOL / 10);
            
            // Emit halving event
            event::emit(HalvingTriggered {
                period: registry.current_halving_period,
                new_reward_rate: registry.base_reward_rate,
                total_distributed: registry.rewards_distributed,
            });
        }
    }

    // ========== View Functions ==========

    /// Get current reward rate
    public fun get_current_reward_rate(registry: &TokenRegistry): u64 {
        registry.base_reward_rate
    }

    /// Get total rewards distributed
    public fun get_total_rewards_distributed(registry: &TokenRegistry): u64 {
        registry.rewards_distributed
    }

    /// Get current halving period
    public fun get_current_halving_period(registry: &TokenRegistry): u8 {
        registry.current_halving_period
    }

    /// Check if user has sufficient stake for governance
    public fun has_governance_stake(wallet: &UserWallet, min_stake_type: u8): bool {
        // Implementation would check if user has appropriate stake
        // For now, simplified check
        wallet.reputation_score > 0 && !table::is_empty(&wallet.staked_tokens)
    }

    // ========== Administrative Functions ==========

    /// Update user's trust score (called by reputation system)
    public(package) fun update_trust_score(
        wallet: &mut UserWallet,
        new_trust_score: u64
    ) {
        wallet.trust_score = new_trust_score;
    }

    /// Update user's reputation score (called by reputation system)
    public(package) fun update_reputation_score(
        wallet: &mut UserWallet,
        new_reputation_score: u64
    ) {
        wallet.reputation_score = new_reputation_score;
    }
}