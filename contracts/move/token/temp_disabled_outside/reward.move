module omeonechain::reward {
    use std::string::{Self, String};
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    
    use omeonechain::common::{Self, TimeStamp};
    use omeonechain::token::{Self};
    use omeonechain::recommendation::{Self};
    use omeonechain::reputation::{Self};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 401;
    const E_ALREADY_INITIALIZED: u64 = 402;
    const E_REWARD_ALREADY_PROCESSED: u64 = 403;
    const E_REWARD_THRESHOLD_NOT_MET: u64 = 404;
    const E_INVALID_REWARD_TYPE: u64 = 405;
    
    /// Constants
    const REWARD_TYPE_RECOMMENDATION: u8 = 1;
    const REWARD_TYPE_CURATION: u8 = 2;
    const REWARD_TYPE_REFERRAL: u8 = 3;
    const REWARD_TYPE_LEADERBOARD: u8 = 4;
    const REWARD_TYPE_SPAM_REPORT: u8 = 5;
    
    const STARTER_PACK_FOLLOWING_REWARD: u64 = 50000000; // 0.5 TOK with 8 decimals
    const STARTER_PACK_RECOMMENDATION_REWARD: u64 = 50000000; // 0.5 TOK per recommendation
    const STARTER_PACK_ENGAGEMENT_REWARD: u64 = 200000000; // 2 TOK for engagement
    const MAX_STARTER_PACK_RECOMMENDATIONS: u64 = 5; // Max 5 recommendations for starter pack
    
    const REFERRAL_REWARD_SIGNUP: u64 = 100000000; // 1 TOK for signup
    const REFERRAL_REWARD_ACTIVE: u64 = 100000000; // 1 TOK for active referral
    
    const LEADERBOARD_POOL_WEEKLY: u64 = 5000000000; // 50 TOK weekly pool
    const LEADERBOARD_PRIZES: vector<u64> = vector[2000000000, 1200000000, 800000000, 400000000, 100000000, 100000000, 100000000, 100000000, 100000000, 100000000]; // [20, 12, 8, 4, 1, 1, 1, 1, 1, 1] TOK
    
    const TRUST_THRESHOLD: u64 = 25; // Trust score must reach 0.25 to trigger reward
    
    /// Reward registry for tracking processed rewards
    public struct RewardRegistry has key {
        id: UID,
        processed_recommendations: vector<String>,
        processed_curations: vector<String>,
        processed_referrals: vector<address>,
        starter_packs_issued: vector<address>,
        leaderboard_history: vector<LeaderboardPeriod>,
        weekly_period: u64,
        timestamp: TimeStamp,
    }
    
    /// Starter pack progress
    public struct StarterPackProgress has key {
        id: UID,
        user: address,
        following_completed: bool,
        recommendations_completed: u64,
        engagement_completed: bool,
        following_reward_claimed: bool,
        recommendation_rewards_claimed: u64,
        engagement_reward_claimed: bool,
        completed: bool,
        timestamp: TimeStamp,
    }
    
    /// Leaderboard period
    public struct LeaderboardPeriod has store {
        period_id: u64,
        start_time: u64,
        end_time: u64,
        winners: vector<address>,
        total_rewards: u64,
    }
    
    /// Initialize the reward module
    public fun initialize(ctx: &mut TxContext) {
        // Create reward registry
        let reward_registry = RewardRegistry {
            id: object::new(ctx),
            processed_recommendations: vector::empty<String>(),
            processed_curations: vector::empty<String>(),
            processed_referrals: vector::empty<address>(),
            starter_packs_issued: vector::empty<address>(),
            leaderboard_history: vector::empty<LeaderboardPeriod>(),
            weekly_period: 0,
            timestamp: common::create_timestamp(),
        };
        
        // Share registry
        transfer::share_object(reward_registry);
    }
    
    /// Initialize starter pack progress for a user
    public fun initialize_starter_pack(ctx: &mut TxContext): StarterPackProgress {
        let user_addr = tx_context::sender(ctx);
        
        // Create starter pack progress
        let progress = StarterPackProgress {
            id: object::new(ctx),
            user: user_addr,
            following_completed: false,
            recommendations_completed: 0,
            engagement_completed: false,
            following_reward_claimed: false,
            recommendation_rewards_claimed: 0,
            engagement_reward_claimed: false,
            completed: false,
            timestamp: common::create_timestamp(),
        };
        
        progress
    }
    
    /// Check and update starter pack following progress
    public fun check_following_progress(
        progress: &mut StarterPackProgress,
        user: address
    ) {
        // Skip if already completed
        if (progress.following_completed) {
            return
        };
        
        // Check following count
        let following_count = reputation::get_following_count(user);
        
        // Check if requirement met (at least 3 follows)
        if (following_count >= 3) {
            progress.following_completed = true;
            common::update_timestamp(&mut progress.timestamp);
        };
    }
    
    /// Check and update starter pack recommendation progress
    public fun check_recommendation_progress(
        progress: &mut StarterPackProgress,
        registry: &RewardRegistry,
        user: address,
        recommendation_id: String
    ) {
        // Skip if already at max
        if (progress.recommendations_completed >= MAX_STARTER_PACK_RECOMMENDATIONS) {
            return
        };
        
        // Get recommendation trust score
        let (exists, author, _, trust_score, _, _, _) = recommendation::get_recommendation(recommendation_id);
        
        // Check if valid recommendation that meets threshold
        if (exists && author == user && trust_score >= TRUST_THRESHOLD) {
            // Check if recommendation already counted
            if (!vector::contains(&registry.processed_recommendations, &recommendation_id)) {
                // Increment count
                progress.recommendations_completed = progress.recommendations_completed + 1;
                common::update_timestamp(&mut progress.timestamp);
            };
        };
    }
    
    /// Check and update starter pack engagement progress
    public fun check_engagement_progress(
        progress: &mut StarterPackProgress,
        user: address
    ) {
        // TODO: Implement engagement check logic
        // This would verify if user has engaged with 10 distinct tips from ≥ 3 authors
        
        // Simplified implementation for now
        let engagement_count = reputation::get_engagement_count(user);
        if (engagement_count >= 10) {
            progress.engagement_completed = true;
            common::update_timestamp(&mut progress.timestamp);
        };
    }
    
    /// Claim starter pack following reward
    public fun claim_following_reward(
        registry: &mut RewardRegistry,
        progress: &mut StarterPackProgress,
        user: address,
        ctx: &mut TxContext
    ) {
        // Check if following requirement completed and reward not claimed
        assert!(progress.following_completed, 0);
        assert!(!progress.following_reward_claimed, 0);
        
        // Mark reward as claimed
        progress.following_reward_claimed = true;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(user, string::utf8(b"starter_following"));
        
        // Update starter pack registry
        update_starter_pack_completion(registry, progress);
    }
    
    /// Claim starter pack recommendation reward
    public fun claim_recommendation_reward(
        registry: &mut RewardRegistry,
        progress: &mut StarterPackProgress,
        user: address,
        ctx: &mut TxContext
    ) {
        // Check if there are unclaimed recommendation rewards
        assert!(progress.recommendation_rewards_claimed < progress.recommendations_completed, 0);
        
        // Mark one reward as claimed
        progress.recommendation_rewards_claimed = progress.recommendation_rewards_claimed + 1;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(user, string::utf8(b"starter_recommendation"));
        
        // Update starter pack registry
        update_starter_pack_completion(registry, progress);
    }
    
    /// Claim starter pack engagement reward
    public fun claim_engagement_reward(
        registry: &mut RewardRegistry,
        progress: &mut StarterPackProgress,
        user: address,
        ctx: &mut TxContext
    ) {
        // Check if engagement requirement completed and reward not claimed
        assert!(progress.engagement_completed, 0);
        assert!(!progress.engagement_reward_claimed, 0);
        
        // Mark reward as claimed
        progress.engagement_reward_claimed = true;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(user, string::utf8(b"starter_engagement"));
        
        // Update starter pack registry
        update_starter_pack_completion(registry, progress);
    }
    
    /// Update starter pack completion status
    fun update_starter_pack_completion(
        registry: &mut RewardRegistry,
        progress: &mut StarterPackProgress
    ) {
        // Check if all rewards claimed
        if (progress.following_reward_claimed &&
            progress.recommendation_rewards_claimed >= MAX_STARTER_PACK_RECOMMENDATIONS &&
            progress.engagement_reward_claimed &&
            !progress.completed) {
            
            // Mark as completed
            progress.completed = true;
            
            // Add to registry
            if (!vector::contains(&registry.starter_packs_issued, &progress.user)) {
                vector::push_back(&mut registry.starter_packs_issued, progress.user);
            };
        };
    }
    
    /// Process a recommendation reward
    public fun process_recommendation_reward(
        registry: &mut RewardRegistry,
        recommendation_id: String,
        ctx: &mut TxContext
    ) {
        // Check if already processed
        assert!(!vector::contains(&registry.processed_recommendations, &recommendation_id), 
                E_REWARD_ALREADY_PROCESSED);
        
        // Get recommendation details
        let (exists, author, _, trust_score, _, _, _) = recommendation::get_recommendation(recommendation_id);
        assert!(exists, 0);
        
        // Check trust threshold
        assert!(trust_score >= TRUST_THRESHOLD, E_REWARD_THRESHOLD_NOT_MET);
        
        // Calculate reward multiplier
        let multiplier = recommendation::calculate_reward_multiplier(recommendation_id);
        
        // Issue token reward
        token::issue_recommendation_reward(author, recommendation_id);
        
        // Add to processed list
        vector::push_back(&mut registry.processed_recommendations, recommendation_id);
        common::update_timestamp(&mut registry.timestamp);
    }
    
    /// Process a referral reward
    public fun process_referral_reward(
        registry: &mut RewardRegistry,
        referrer: address,
        referred: address,
        reward_type: u8,
        ctx: &mut TxContext
    ) {
        // Validate reward type
        assert!(reward_type == 1 || reward_type == 2, E_INVALID_REWARD_TYPE);
        
        // Create a unique string for this referral
        let referral_str = string::utf8(b"ref_");
        string::append(&mut referral_str, address_to_string(referrer));
        string::append(&mut referral_str, string::utf8(b"_"));
        string::append(&mut referral_str, address_to_string(referred));
        string::append(&mut referral_str, string::utf8(b"_"));
        string::append(&mut referral_str, u64_to_string((reward_type as u64)));
        
        // Check if already processed
        let processed = vector::contains(&registry.processed_recommendations, &referral_str);
        assert!(!processed, E_REWARD_ALREADY_PROCESSED);
        
        // Determine reward amount
        let reward_amount = if (reward_type == 1) {
            REFERRAL_REWARD_SIGNUP
        } else {
            REFERRAL_REWARD_ACTIVE
        };
        
        // Issue token reward
        token::issue_recommendation_reward(referrer, referral_str);
        
        // Add to processed list
        vector::push_back(&mut registry.processed_recommendations, referral_str);
        vector::push_back(&mut registry.processed_referrals, referred);
        common::update_timestamp(&mut registry.timestamp);
    }
    
    /// Process leaderboard rewards for a week
    public fun process_leaderboard_rewards(
        registry: &mut RewardRegistry,
        winners: vector<address>,
        ctx: &mut TxContext
    ) {
        // Create new period
        let period_id = registry.weekly_period + 1;
        let now = common::current_timestamp();
        let start_time = now - 604800; // 1 week ago
        let end_time = now;
        
        // Calculate total rewards
        let mut total_rewards = 0;
        let mut i = 0;
        let prize_count = vector::length(&LEADERBOARD_PRIZES);
        let winner_count = vector::length(&winners);
        
        while (i < winner_count && i < prize_count) {
            let winner = *vector::borrow(&winners, i);
            let prize = *vector::borrow(&LEADERBOARD_PRIZES, i);
            
            // Issue token reward to winner
            let reward_ref = string::utf8(b"leaderboard_");
            string::append(&mut reward_ref, u64_to_string(period_id));
            string::append(&mut reward_ref, string::utf8(b"_"));
            string::append(&mut reward_ref, u64_to_string(i));
            
            token::issue_recommendation_reward(winner, reward_ref);
            
            total_rewards = total_rewards + prize;
            i = i + 1;
        };
        
        // Create period record
        let period = LeaderboardPeriod {
            period_id,
            start_time,
            end_time,
            winners,
            total_rewards,
        };
        
        // Add to history
        vector::push_back(&mut registry.leaderboard_history, period);
        registry.weekly_period = period_id;
        common::update_timestamp(&mut registry.timestamp);
    }
    
    /// Check if a recommendation reward has been processed
    public fun is_recommendation_processed(
        registry: &RewardRegistry,
        recommendation_id: String
    ): bool {
        vector::contains(&registry.processed_recommendations, &recommendation_id)
    }
    
    /// Check if a user has completed the starter pack
    public fun has_completed_starter_pack(progress: &StarterPackProgress): bool {
        progress.completed
    }
    
    /// Get starter pack progress
    public fun get_starter_pack_progress(progress: &StarterPackProgress): (bool, u64, bool, bool, u64, bool) {
        (
            progress.following_completed,
            progress.recommendations_completed,
            progress.engagement_completed,
            progress.following_reward_claimed,
            progress.recommendation_rewards_claimed,
            progress.engagement_reward_claimed
        )
    }
    
    /// Convert address to string (helper function)
    fun address_to_string(addr: address): String {
        // Simple implementation for demonstration
        // In practice, use a proper hex conversion
        string::utf8(b"addr")
    }
    
    /// Convert u64 to string (helper function)
    fun u64_to_string(value: u64): String {
        if (value == 0) {
            return string::utf8(b"0")
        };
        
        let mut buffer = vector::empty<u8>();
        let mut temp = value;
        
        while (temp > 0) {
            let digit = ((temp % 10) as u8) + 48; // Convert to ASCII
            vector::push_back(&mut buffer, digit);
            temp = temp / 10;
        };
        
        // Reverse the digits
        let len = vector::length(&buffer);
        let mut i = 0;
        let mut j = len - 1;
        
        while (i < j) {
            let temp = *vector::borrow(&buffer, i);
            *vector::borrow_mut(&mut buffer, i) = *vector::borrow(&buffer, j);
            *vector::borrow_mut(&mut buffer, j) = temp;
            i = i + 1;
            j = j - 1;
        };
        
        string::utf8(buffer)
    }
    
    #[test_only]
    public fun setup_test(ctx: &mut TxContext) {
        // Initialize necessary modules for testing
        initialize(ctx);
    }
    
    #[test]
    fun test_starter_pack_initialization() {
        // Test implementation would go here
        // Using new IOTA test framework syntax
    }
}