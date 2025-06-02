// contracts/move/token/sources/reward_distribution.move
module omeone_token::reward_distribution {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use omeone_token::omeone_token::{Self, TokenRegistry, UserWallet};

    // ========== Error Codes ==========
    const EInvalidAction: u64 = 1;
    const ERewardAlreadyClaimed: u64 = 2;
    const ETrustScoreTooLow: u64 = 3;
    const EInvalidSocialDistance: u64 = 4;

    // ========== Constants ==========
    const TRUST_WEIGHT_1_HOP: u64 = 75;  // 0.75 * 100
    const TRUST_WEIGHT_2_HOP: u64 = 25;  // 0.25 * 100
    const MAX_HOPS: u8 = 2;
    
    // Reward types
    const REWARD_RECOMMENDATION: u8 = 1;
    const REWARD_UPVOTE: u8 = 2;
    const REWARD_CURATION: u8 = 3;
    const REWARD_REFERRAL: u8 = 4;
    const REWARD_LEADERBOARD: u8 = 5;
    const REWARD_ONBOARDING: u8 = 6;

    // ========== Structs ==========

    /// Tracks reward eligibility and distribution
    struct RewardTracker has key {
        id: UID,
        /// Tracks pending rewards by action ID
        pending_rewards: Table<vector<u8>, PendingReward>,
        /// Tracks claimed rewards to prevent double-claiming
        claimed_rewards: Table<vector<u8>, bool>,
        /// Social graph weights cache
        social_weights: Table<address, Table<address, SocialWeight>>,
    }

    /// Pending reward waiting for trust threshold
    struct PendingReward has store {
        author: address,
        action_id: vector<u8>,
        action_type: u8,
        base_amount: u64,
        current_trust_score: u64,
        social_endorsements: Table<address, SocialEndorsement>,
        created_timestamp: u64,
        expires_timestamp: u64, // 30 days for impact tracking
    }

    /// Social weight between two users
    struct SocialWeight has store {
        weight: u64, // 0-100 scale
        hops: u8,    // 1 or 2 hops
        last_updated: u64,
    }

    /// Endorsement from social graph
    struct SocialEndorsement has store {
        endorser: address,
        endorser_trust_score: u64,
        social_distance: u8, // 1 or 2 hops
        weight_contribution: u64,
        timestamp: u64,
    }

    /// Reward calculation result
    struct RewardCalculation has copy, drop {
        base_reward: u64,
        trust_multiplier: u64,
        final_amount: u64,
        endorsement_count: u64,
    }

    // ========== Events ==========

    struct ActionSubmitted has copy, drop {
        author: address,
        action_id: vector<u8>,
        action_type: u8,
        timestamp: u64,
    }

    struct TrustThresholdReached has copy, drop {
        action_id: vector<u8>,
        final_trust_score: u64,
        reward_amount: u64,
    }

    struct SocialEndorsementAdded has copy, drop {
        action_id: vector<u8>,
        endorser: address,
        weight_contribution: u64,
    }

    // ========== Initialize Function ==========

    fun init(ctx: &mut TxContext) {
        let tracker = RewardTracker {
            id: object::new(ctx),
            pending_rewards: table::new(ctx),
            claimed_rewards: table::new(ctx),
            social_weights: table::new(ctx),
        };
        
        transfer::share_object(tracker);
    }

    // ========== Core Reward Functions ==========

    /// Submit a new action for potential reward (recommendation, upvote, etc.)
    public fun submit_action_for_reward(
        tracker: &mut RewardTracker,
        author_wallet: &UserWallet,
        action_id: vector<u8>,
        action_type: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let expires_time = current_time + (30 * 24 * 60 * 60 * 1000); // 30 days
        
        let base_amount = get_base_reward_amount(action_type);
        
        let pending_reward = PendingReward {
            author: omeone_token::get_owner(author_wallet),
            action_id: action_id,
            action_type,
            base_amount,
            current_trust_score: 0,
            social_endorsements: table::new(ctx),
            created_timestamp: current_time,
            expires_timestamp: expires_time,
        };
        
        table::add(&mut tracker.pending_rewards, action_id, pending_reward);
        
        event::emit(ActionSubmitted {
            author: omeone_token::get_owner(author_wallet),
            action_id,
            action_type,
            timestamp: current_time,
        });
    }

    /// Add social endorsement (upvote, save, etc.) to an action
    public fun add_social_endorsement(
        tracker: &mut RewardTracker,
        endorser_wallet: &UserWallet,
        action_id: vector<u8>,
        social_distance: u8, // 1 or 2 hops
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(social_distance <= MAX_HOPS, EInvalidSocialDistance);
        assert!(table::contains(&tracker.pending_rewards, action_id), EInvalidAction);
        
        let pending_reward = table::borrow_mut(&mut tracker.pending_rewards, action_id);
        let endorser_address = omeone_token::get_owner(endorser_wallet);
        let endorser_trust = omeone_token::get_trust_score(endorser_wallet);
        
        // Calculate weight contribution based on social distance
        let weight_contribution = if (social_distance == 1) {
            TRUST_WEIGHT_1_HOP
        } else {
            TRUST_WEIGHT_2_HOP
        };
        
        // Apply endorser's trust score as additional weight
        let final_weight = (weight_contribution * endorser_trust) / 100;
        
        let endorsement = SocialEndorsement {
            endorser: endorser_address,
            endorser_trust_score: endorser_trust,
            social_distance,
            weight_contribution: final_weight,
            timestamp: clock::timestamp_ms(clock),
        };
        
        table::add(&mut pending_reward.social_endorsements, endorser_address, endorsement);
        
        // Recalculate trust score
        let new_trust_score = calculate_trust_score(pending_reward);
        pending_reward.current_trust_score = new_trust_score;
        
        event::emit(SocialEndorsementAdded {
            action_id,
            endorser: endorser_address,
            weight_contribution: final_weight,
        });
        
        // Check if trust threshold reached (0.25 = 25)
        if (new_trust_score >= 25) {
            event::emit(TrustThresholdReached {
                action_id,
                final_trust_score: new_trust_score,
                reward_amount: calculate_final_reward_amount(pending_reward),
            });
        }
    }

    /// Claim reward once trust threshold is met
    public fun claim_reward(
        tracker: &mut RewardTracker,
        token_registry: &mut TokenRegistry,
        author_wallet: &mut UserWallet,
        action_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&tracker.pending_rewards, action_id), EInvalidAction);
        assert!(!table::contains(&tracker.claimed_rewards, action_id), ERewardAlreadyClaimed);
        
        let pending_reward = table::borrow(&tracker.pending_rewards, action_id);
        assert!(pending_reward.current_trust_score >= 25, ETrustScoreTooLow);
        
        // Calculate final reward
        let final_amount = calculate_final_reward_amount(pending_reward);
        let social_weights_sum = get_total_social_weights(pending_reward);
        
        // Distribute the reward through token contract
        omeone_token::distribute_reward(
            token_registry,
            author_wallet,
            pending_reward.current_trust_score,
            social_weights_sum,
            clock,
            ctx
        );
        
        // Mark as claimed
        table::add(&mut tracker.claimed_rewards, action_id, true);
        
        // Clean up pending reward
        let PendingReward { 
            author: _, 
            action_id: _, 
            action_type: _, 
            base_amount: _, 
            current_trust_score: _, 
            social_endorsements, 
            created_timestamp: _, 
            expires_timestamp: _ 
        } = table::remove(&mut tracker.pending_rewards, action_id);
        
        table::destroy_empty(social_endorsements);
    }

    // ========== Specialized Reward Functions ==========

    /// Distribute onboarding rewards (Starter Pack)
    public fun distribute_onboarding_reward(
        token_registry: &mut TokenRegistry,
        user_wallet: &mut UserWallet,
        milestone: u8, // 1=follow 3 accounts, 2=5 recommendations, 3=10 interactions
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = if (milestone == 1) { 500_000 }      // 0.5 TOK for follows
                           else if (milestone == 2) { 2_500_000 } // 2.5 TOK for recommendations
                           else if (milestone == 3) { 2_000_000 } // 2 TOK for interactions
                           else { 0 };
        
        if (reward_amount > 0) {
            omeone_token::distribute_reward(
                token_registry,
                user_wallet,
                100, // Max trust score for onboarding
                100, // Max social weight for onboarding
                clock,
                ctx
            );
        }
    }

    /// Distribute leaderboard rewards (weekly)
    public fun distribute_leaderboard_reward(
        token_registry: &mut TokenRegistry,
        winner_wallet: &mut UserWallet,
        position: u8, // 1st = 20 TOK, 2nd = 12 TOK, etc.
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = if (position == 1) { 20_000_000 }      // 20 TOK
                           else if (position == 2) { 12_000_000 }  // 12 TOK
                           else if (position == 3) { 8_000_000 }   // 8 TOK
                           else if (position == 4) { 4_000_000 }   // 4 TOK
                           else { 1_000_000 };                     // 1 TOK for positions 5-10
        
        omeone_token::distribute_reward(
            token_registry,
            winner_wallet,
            100, // Max trust score for leaderboard
            100, // Max social weight for leaderboard
            clock,
            ctx
        );
    }

    // ========== Helper Functions ==========

    /// Calculate trust score based on social endorsements
    fun calculate_trust_score(pending_reward: &PendingReward): u64 {
        let total_weight = 0u64;
        let endorsement_count = table::length(&pending_reward.social_endorsements);
        
        // Simple calculation: sum of all weight contributions
        // In a real implementation, this would iterate through the table
        // For now, return a basic calculation
        if (endorsement_count > 0) {
            total_weight = endorsement_count * 30; // Simplified calculation
        };
        
        // Cap at 100 (representing 1.0)
        if (total_weight > 100) { 100 } else { total_weight }
    }

    /// Calculate final reward amount based on trust score and social weights
    fun calculate_final_reward_amount(pending_reward: &PendingReward): u64 {
        let trust_multiplier = pending_reward.current_trust_score;
        (pending_reward.base_amount * trust_multiplier) / 100
    }

    /// Get total social weights for reward calculation
    fun get_total_social_weights(pending_reward: &PendingReward): u64 {
        // Sum all weight contributions from endorsements
        let total = 0u64;
        let endorsement_count = table::length(&pending_reward.social_endorsements);
        
        // Simplified calculation - in real implementation would iterate
        total = endorsement_count * 50; // Average weight per endorsement
        
        // Cap at max multiplier (3.0 = 300)
        if (total > 300) { 300 } else { total }
    }

    /// Get base reward amount for action type
    fun get_base_reward_amount(action_type: u8): u64 {
        if (action_type == REWARD_RECOMMENDATION) { 1_000_000 }      // 1 TOK base
        else if (action_type == REWARD_UPVOTE) { 100_000 }          // 0.1 TOK per 10 upvotes
        else if (action_type == REWARD_CURATION) { 1_000_000 }      // 1 TOK for lists
        else if (action_type == REWARD_REFERRAL) { 2_000_000 }      // 2 TOK for referrals
        else { 500_000 } // Default 0.5 TOK
    }

    // ========== View Functions ==========

    /// Check if action is eligible for reward claim
    public fun is_eligible_for_reward(
        tracker: &RewardTracker,
        action_id: vector<u8>
    ): bool {
        if (!table::contains(&tracker.pending_rewards, action_id)) {
            return false
        };
        
        let pending_reward = table::borrow(&tracker.pending_rewards, action_id);
        pending_reward.current_trust_score >= 25
    }

    /// Get pending reward info
    public fun get_pending_reward_info(
        tracker: &RewardTracker,
        action_id: vector<u8>
    ): (u64, u64, u64) { // (current_trust_score, endorsement_count, potential_reward)
        assert!(table::contains(&tracker.pending_rewards, action_id), EInvalidAction);
        
        let pending_reward = table::borrow(&tracker.pending_rewards, action_id);
        let endorsement_count = table::length(&pending_reward.social_endorsements);
        let potential_reward = calculate_final_reward_amount(pending_reward);
        
        (pending_reward.current_trust_score, endorsement_count, potential_reward)
    }
}