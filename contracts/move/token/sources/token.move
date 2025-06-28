module omeone::token {
    use std::string::{Self, String};
    use std::vector;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::event;
    
    // You'll need to create this common module or import timestamp functions
    // use omeone::common::{Self, TimeStamp};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 301;
    const E_INSUFFICIENT_BALANCE: u64 = 302;
    const E_TOKEN_ALREADY_EXISTS: u64 = 303;
    const E_EXCEEDS_SUPPLY_CAP: u64 = 304;
    const E_REWARD_ALREADY_CLAIMED: u64 = 305;
    const E_BELOW_REWARD_THRESHOLD: u64 = 306;
    const E_INVALID_HALVING_PERIOD: u64 = 307;
    
    /// Constants
    const TOTAL_SUPPLY_CAP: u64 = 10_000_000_000_000_000_000; // 10 billion tokens with 9 decimals
    const DECIMALS: u8 = 9; // Changed to 9 decimals as discussed
    
    const REWARDS_ALLOCATION: u64 = 5_200_000_000_000_000_000; // 5.2 billion tokens (52%)
    const DEVELOPMENT_ALLOCATION: u64 = 2_000_000_000_000_000_000; // 2 billion tokens (20%)
    const ECOSYSTEM_ALLOCATION: u64 = 1_600_000_000_000_000_000; // 1.6 billion tokens (16%)
    const TEAM_ALLOCATION: u64 = 1_200_000_000_000_000_000; // 1.2 billion tokens (12%)
    
    // Halving thresholds (10% of supply each)
    const HALVING_THRESHOLD_1: u64 = 1_000_000_000_000_000_000; // 1 billion tokens (10% of total)
    const HALVING_THRESHOLD_2: u64 = 2_000_000_000_000_000_000; // 2 billion tokens (20% of total)
    const HALVING_THRESHOLD_3: u64 = 3_000_000_000_000_000_000; // 3 billion tokens (30% of total)
    
    const BASE_EMISSION_RATE: u64 = 100; // Base emission rate (100%)
    const FEE_BURN_PERCENTAGE: u64 = 75; // 75% of fees are burned

    /// One-time witness for token creation
    public struct OMEONE has drop {}

    /// Token supply registry - now compatible with IOTA Rebased
    public struct TokenSupply has key {
        id: UID,
        treasury_cap: TreasuryCap<OMEONE>,
        total_supply: u64,
        circulating_supply: u64,
        rewards_remaining: u64,
        development_remaining: u64,
        ecosystem_remaining: u64,
        team_remaining: u64,
        total_burned: u64,
        emission_rate: u64,
        halving_index: u64,
        created_at: u64,
    }
    
    /// Transaction record
    public struct Transaction has copy, drop, store {
        id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        transaction_type: u8, // 1=reward, 2=transfer, 3=fee, 4=burn
        reference: String,
        timestamp: u64,
    }
    
    /// Reward claim registry
    public struct RewardClaimRegistry has key {
        id: UID,
        claimed_recommendations: vector<String>,
    }

    /// Events
    public struct TokenMinted has copy, drop {
        recipient: address,
        amount: u64,
        allocation_type: String, // "reward", "development", "ecosystem", "team"
        reference: String,
    }

    public struct TokenBurned has copy, drop {
        amount: u64,
        burned_by: address,
        reason: String,
    }

    public struct HalvingTriggered has copy, drop {
        old_emission_rate: u64,
        new_emission_rate: u64,
        halving_index: u64,
        total_distributed: u64,
    }

    /// Initialize the token (called once at deployment)
    fun init(witness: OMEONE, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            DECIMALS,
            b"TOK",
            b"OmeoneChain Token",
            b"Trust-based social recommendation rewards",
            option::none(),
            ctx
        );

        // Create token supply registry
        let token_supply = TokenSupply {
            id: object::new(ctx),
            treasury_cap,
            total_supply: TOTAL_SUPPLY_CAP,
            circulating_supply: 0,
            rewards_remaining: REWARDS_ALLOCATION,
            development_remaining: DEVELOPMENT_ALLOCATION,
            ecosystem_remaining: ECOSYSTEM_ALLOCATION,
            team_remaining: TEAM_ALLOCATION,
            total_burned: 0,
            emission_rate: BASE_EMISSION_RATE,
            halving_index: 0,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        // Create reward claim registry
        let reward_claim_registry = RewardClaimRegistry {
            id: object::new(ctx),
            claimed_recommendations: vector::empty<String>(),
        };

        // Share the objects
        transfer::share_object(token_supply);
        transfer::share_object(reward_claim_registry);
        transfer::public_freeze_object(metadata);
    }

    /// Mint tokens for development allocation
    public fun mint_development(
        token_supply: &mut TokenSupply,
        recipient: address,
        amount: u64,
        reference: String,
        ctx: &mut TxContext
    ): Coin<OMEONE> {
        // Check if amount is within remaining development allocation
        assert!(amount <= token_supply.development_remaining, E_EXCEEDS_SUPPLY_CAP);

        // Mint coins
        let minted_coin = coin::mint(&mut token_supply.treasury_cap, amount, ctx);

        // Update supply tracking
        token_supply.circulating_supply = token_supply.circulating_supply + amount;
        token_supply.development_remaining = token_supply.development_remaining - amount;

        // Emit event
        event::emit(TokenMinted {
            recipient,
            amount,
            allocation_type: string::utf8(b"development"),
            reference,
        });

        minted_coin
    }

    /// Issue recommendation reward
    public fun issue_recommendation_reward(
        token_supply: &mut TokenSupply,
        reward_registry: &mut RewardClaimRegistry,
        author: address,
        recommendation_id: String,
        trust_score: u64,
        social_weights: vector<u64>,
        ctx: &mut TxContext
    ): Option<Coin<OMEONE>> {
        // Check if recommendation already claimed
        if (vector::contains(&reward_registry.claimed_recommendations, &recommendation_id)) {
            return option::none()
        };

        // Calculate reward using the same logic as before
        let base_reward = 1_000_000_000; // 1 TOK with 9 decimals
        let trust_threshold = 250; // 0.25 * 1000

        if (trust_score < trust_threshold) {
            return option::none()
        };

        // Calculate social multiplier
        let total_weight = 0;
        let i = 0;
        let len = vector::length(&social_weights);
        
        while (i < len) {
            total_weight = total_weight + *vector::borrow(&social_weights, i);
            i = i + 1;
        };

        let max_multiplier = 3000; // 3.0x max
        if (total_weight > max_multiplier) {
            total_weight = max_multiplier;
        };

        // Calculate final reward
        let adjusted_reward = base_reward * token_supply.emission_rate / 100;
        let reward_amount = (adjusted_reward * total_weight) / 1000;

        // Check if we have enough rewards remaining
        if (reward_amount > token_supply.rewards_remaining) {
            return option::none()
        };

        // Mint reward
        let reward_coin = coin::mint(&mut token_supply.treasury_cap, reward_amount, ctx);

        // Update tracking
        token_supply.circulating_supply = token_supply.circulating_supply + reward_amount;
        token_supply.rewards_remaining = token_supply.rewards_remaining - reward_amount;
        vector::push_back(&mut reward_registry.claimed_recommendations, recommendation_id);

        // Check halving threshold
        check_halving_threshold(token_supply);

        // Emit event
        event::emit(TokenMinted {
            recipient: author,
            amount: reward_amount,
            allocation_type: string::utf8(b"reward"),
            reference: recommendation_id,
        });

        option::some(reward_coin)
    }

    /// Burn tokens (75% of protocol fees)
    public fun burn_tokens(
        token_supply: &mut TokenSupply,
        burn_coin: Coin<OMEONE>,
        reason: String,
        ctx: &mut TxContext
    ) {
        let burn_amount = coin::value(&burn_coin);
        
        // Burn the coins (they are permanently destroyed)
        coin::burn(&mut token_supply.treasury_cap, burn_coin);
        
        // Update tracking
        token_supply.circulating_supply = token_supply.circulating_supply - burn_amount;
        token_supply.total_burned = token_supply.total_burned + burn_amount;

        // Emit event
        event::emit(TokenBurned {
            amount: burn_amount,
            burned_by: tx_context::sender(ctx),
            reason,
        });
    }

    /// Check if a halving threshold has been reached
    fun check_halving_threshold(token_supply: &mut TokenSupply) {
        let total_distributed = REWARDS_ALLOCATION - token_supply.rewards_remaining +
                               DEVELOPMENT_ALLOCATION - token_supply.development_remaining +
                               ECOSYSTEM_ALLOCATION - token_supply.ecosystem_remaining +
                               TEAM_ALLOCATION - token_supply.team_remaining;
        
        let next_threshold = (token_supply.halving_index + 1) * HALVING_THRESHOLD_1;
        
        if (total_distributed >= next_threshold) {
            let old_rate = token_supply.emission_rate;
            token_supply.halving_index = token_supply.halving_index + 1;
            token_supply.emission_rate = token_supply.emission_rate / 2;

            event::emit(HalvingTriggered {
                old_emission_rate: old_rate,
                new_emission_rate: token_supply.emission_rate,
                halving_index: token_supply.halving_index,
                total_distributed,
            });
        };
    }

    // Getter functions
    public fun get_total_supply(token_supply: &TokenSupply): u64 {
        token_supply.total_supply
    }

    public fun get_circulating_supply(token_supply: &TokenSupply): u64 {
        token_supply.circulating_supply
    }

    public fun get_emission_rate(token_supply: &TokenSupply): u64 {
        token_supply.emission_rate
    }

    public fun get_halving_index(token_supply: &TokenSupply): u64 {
        token_supply.halving_index
    }

    public fun decimals(): u8 { DECIMALS }
    public fun total_supply_cap(): u64 { TOTAL_SUPPLY_CAP }
}