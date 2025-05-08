module omeonechain::reward {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    
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
    struct RewardRegistry has key {
        processed_recommendations: vector<String>,
        processed_curations: vector<String>,
        processed_referrals: vector<address>,
        starter_packs_issued: vector<address>,
        leaderboard_history: vector<LeaderboardPeriod>,
        weekly_period: u64,
        timestamp: TimeStamp,
    }
    
    /// Starter pack progress
    struct StarterPackProgress has key {
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
    struct LeaderboardPeriod has store {
        period_id: u64,
        start_time: u64,
        end_time: u64,
        winners: vector<address>,
        total_rewards: u64,
    }
    
    /// Initialize the reward module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Check if already initialized
        assert!(!exists<RewardRegistry>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));
        
        // Create reward registry
        let reward_registry = RewardRegistry {
            processed_recommendations: vector::empty<String>(),
            processed_curations: vector::empty<String>(),
            processed_referrals: vector::empty<address>(),
            starter_packs_issued: vector::empty<address>(),
            leaderboard_history: vector::empty<LeaderboardPeriod>(),
            weekly_period: 0,
            timestamp: common::create_timestamp(),
        };
        
        // Store registry
        move_to(admin, reward_registry);
    }
    
    /// Initialize starter pack progress for a user
    public entry fun initialize_starter_pack(user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Check if already initialized
        if (!exists<StarterPackProgress>(user_addr)) {
            // Create starter pack progress
            let progress = StarterPackProgress {
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
            
            // Store progress
            move_to(user, progress);
        };
    }
    
    /// Check and update starter pack following progress
    public entry fun check_following_progress(
        user: address
    ) acquires StarterPackProgress, RewardRegistry {
        // Ensure user has starter pack progress
        assert!(exists<StarterPackProgress>(user), error::not_found(0));
        
        // Get progress
        let progress = borrow_global_mut<StarterPackProgress>(user);
        
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
            
            // Check if reward can be claimed automatically
            if (!progress.following_reward_claimed) {
                // Issue reward (handled by caller)
            };
        };
    }
    
    /// Check and update starter pack recommendation progress
    public entry fun check_recommendation_progress(
        user: address,
        recommendation_id: String
    ) acquires StarterPackProgress, RewardRegistry {
        // Ensure user has starter pack progress
        assert!(exists<StarterPackProgress>(user), error::not_found(0));
        
        // Get progress
        let progress = borrow_global_mut<StarterPackProgress>(user);
        
        // Skip if already at max
        if (progress.recommendations_completed >= MAX_STARTER_PACK_RECOMMENDATIONS) {
            return
        };
        
        // Get recommendation trust score
        let (exists, author, _, trust_score, _, _, _) = recommendation::get_recommendation(recommendation_id);
        
        // Check if valid recommendation that meets threshold
        if (exists && author == user && trust_score >= TRUST_THRESHOLD) {
            // Check if recommendation already counted
            let registry = borrow_global<RewardRegistry>(@omeonechain);
            if (!vector::contains(&registry.processed_recommendations, &recommendation_id)) {
                // Increment count
                progress.recommendations_completed = progress.recommendations_completed + 1;
                common::update_timestamp(&mut progress.timestamp);
                
                // Check if reward can be claimed automatically
                if (progress.recommendation_rewards_claimed < progress.recommendations_completed) {
                    // Issue reward (handled by caller)
                };
            };
        };
    }
    
    /// Check and update starter pack engagement progress
    public entry fun check_engagement_progress(
        user: address
    ) acquires StarterPackProgress, RewardRegistry {
        // TODO: Implement engagement check logic
        // This would verify if user has engaged with 10 distinct tips from ≥ 3 authors
    }
    
    /// Claim starter pack following reward
    public entry fun claim_following_reward(
        admin: &signer,
        user: address
    ) acquires StarterPackProgress, RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Ensure user has starter pack progress
        assert!(exists<StarterPackProgress>(user), error::not_found(0));
        
        // Get progress
        let progress = borrow_global_mut<StarterPackProgress>(user);
        
        // Check if following requirement completed and reward not claimed
        assert!(progress.following_completed, error::invalid_state(0));
        assert!(!progress.following_reward_claimed, error::invalid_state(0));
        
        // Mark reward as claimed
        progress.following_reward_claimed = true;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(admin, user, string::utf8(b"starter_following"));
        
        // Update starter pack registry
        update_starter_pack_completion(progress);
    }
    
    /// Claim starter pack recommendation reward
    public entry fun claim_recommendation_reward(
        admin: &signer,
        user: address
    ) acquires StarterPackProgress, RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Ensure user has starter pack progress
        assert!(exists<StarterPackProgress>(user), error::not_found(0));
        
        // Get progress
        let progress = borrow_global_mut<StarterPackProgress>(user);
        
        // Check if there are unclaimed recommendation rewards
        assert!(progress.recommendation_rewards_claimed < progress.recommendations_completed, error::invalid_state(0));
        
        // Mark one reward as claimed
        progress.recommendation_rewards_claimed = progress.recommendation_rewards_claimed + 1;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(admin, user, string::utf8(b"starter_recommendation"));
        
        // Update starter pack registry
        update_starter_pack_completion(progress);
    }
    
    /// Claim starter pack engagement reward
    public entry fun claim_engagement_reward(
        admin: &signer,
        user: address
    ) acquires StarterPackProgress, RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Ensure user has starter pack progress
        assert!(exists<StarterPackProgress>(user), error::not_found(0));
        
        // Get progress
        let progress = borrow_global_mut<StarterPackProgress>(user);
        
        // Check if engagement requirement completed and reward not claimed
        assert!(progress.engagement_completed, error::invalid_state(0));
        assert!(!progress.engagement_reward_claimed, error::invalid_state(0));
        
        // Mark reward as claimed
        progress.engagement_reward_claimed = true;
        common::update_timestamp(&mut progress.timestamp);
        
        // Issue token reward
        token::issue_recommendation_reward(admin, user, string::utf8(b"starter_engagement"));
        
        // Update starter pack registry
        update_starter_pack_completion(progress);
    }
    
    /// Update starter pack completion status
    fun update_starter_pack_completion(progress: &mut StarterPackProgress) acquires RewardRegistry {
        // Check if all rewards claimed
        if (progress.following_reward_claimed &&
            progress.recommendation_rewards_claimed >= MAX_STARTER_PACK_RECOMMENDATIONS &&
            progress.engagement_reward_claimed &&
            !progress.completed) {
            
            // Mark as completed
            progress.completed = true;
            
            // Add to registry
            let registry = borrow_global_mut<RewardRegistry>(@omeonechain);
            if (!vector::contains(&registry.starter_packs_issued, &progress.user)) {
                vector::push_back(&mut registry.starter_packs_issued, progress.user);
            };
        };
    }
    
    /// Process a recommendation reward
    public entry fun process_recommendation_reward(
        admin: &signer,
        recommendation_id: String
    ) acquires RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get registry
        let registry = borrow_global_mut<RewardRegistry>(@omeonechain);
        
        // Check if already processed
        assert!(!vector::contains(&registry.processed_recommendations, &recommendation_id), 
                error::invalid_state(E_REWARD_ALREADY_PROCESSED));
        
        // Get recommendation details
        let (exists, author, _, trust_score, _, _, _) = recommendation::get_recommendation(recommendation_id);
        assert!(exists, error::not_found(0));
        
        // Check trust threshold
        assert!(trust_score >= TRUST_THRESHOLD, error::invalid_state(E_REWARD_THRESHOLD_NOT_MET));
        
        // Calculate reward multiplier
        let multiplier = recommendation::calculate_reward_multiplier(recommendation_id);
        
        // Issue token reward
        token::issue_recommendation_reward(admin, author, recommendation_id);
        
        // Add to processed list
        vector::push_back(&mut registry.processed_recommendations, recommendation_id);
        common::update_timestamp(&mut registry.timestamp);
    }
    
    /// Process a referral reward
    public entry fun process_referral_reward(
        admin: &signer,
        referrer: address,
        referred: address,
        reward_type: u8
    ) acquires RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Validate reward type
        assert!(reward_type == 1 || reward_type == 2, error::invalid_argument(E_INVALID_REWARD_TYPE));
        
        // Get registry
        let registry = borrow_global_mut<RewardRegistry>(@omeonechain);
        
        // Create a unique string for this referral
        let referral_str = string::utf8(b"ref_");
        string::append(&mut referral_str, address_to_string(referrer));
        string::append(&mut referral_str, string::utf8(b"_"));
        string::append(&mut referral_str, address_to_string(referred));
        string::append(&mut referral_str, string::utf8(b"_"));
        string::append(&mut referral_str, u64_to_string((reward_type as u64)));
        
        // Check if already processed
        let processed = vector::contains(&registry.processed_recommendations, &referral_str);
        assert!(!processed, error::invalid_state(E_REWARD_ALREADY_PROCESSED));
        
        // Determine reward amount
        let reward_amount = if (reward_type == 1) {
            REFERRAL_REWARD_SIGNUP
        } else {
            REFERRAL_REWARD_ACTIVE
        };
        
        // Issue token reward
        token::issue_recommendation_reward(admin, referrer, referral_str);
        
        // Add to processed list
        vector::push_back(&mut registry.processed_recommendations, referral_str);
        vector::push_back(&mut registry.processed_referrals, referred);
        common::update_timestamp(&mut registry.timestamp);
    }
    
    /// Process leaderboard rewards for a week
    public entry fun process_leaderboard_rewards(
        admin: &signer,
        winners: vector<address>
    ) acquires RewardRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get registry
        let registry = borrow_global_mut<RewardRegistry>(@omeonechain);
        
        // Create new period
        let period_id = registry.weekly_period + 1;
        let now = common::current_timestamp();
        let start_time = now - 604800; // 1 week ago
        let end_time = now;
        
        // Calculate total rewards
        let total_rewards = 0;
        let i = 0;
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
            
            token::issue_recommendation_reward(admin, winner, reward_ref);
            
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
    public fun is_recommendation_processed(recommendation_id: String): bool acquires RewardRegistry {
        let registry = borrow_global<RewardRegistry>(@omeonechain);
        vector::contains(&registry.processed_recommendations, &recommendation_id)
    }
    
    /// Check if a user has completed the starter pack
    public fun has_completed_starter_pack(user: address): bool acquires StarterPackProgress {
        if (!exists<StarterPackProgress>(user)) {
            return false
        };
        
        let progress = borrow_global<StarterPackProgress>(user);
        progress.completed
    }
    
    /// Get starter pack progress
    public fun get_starter_pack_progress(user: address): (bool, u64, bool, bool, u64, bool) acquires StarterPackProgress {
        if (!exists<StarterPackProgress>(user)) {
            return (false, 0, false, false, 0, false)
        };
        
        let progress = borrow_global<StarterPackProgress>(user);
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
        
        let buffer = vector::empty<u8>();
        let temp = value;
        
        while (temp > 0) {
            let digit = ((temp % 10) as u8) + 48; // Convert to ASCII
            vector::push_back(&mut buffer, digit);
            temp = temp / 10;
        };
        
        // Reverse the digits
        let len = vector::length(&buffer);
        let i = 0;
        let j = len - 1;
        
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
    public fun setup_test(ctx: &signer) {
        // Initialize necessary modules for testing
        initialize(ctx);
    }
    
    #[test]
    public fun test_starter_pack_initialization() acquires StarterPackProgress {
        use std::unit_test;
        
        // Create test accounts
        let scenario = unit_test::begin(@0x1);
        let user = unit_test::get_signer_for(@0x100);
        
        // Initialize starter pack
        initialize_starter_pack(&user);
        
        // Verify initialization
        assert!(exists<StarterPackProgress>(@0x100), 0);
        let progress = get_starter_pack_progress(@0x100);
        assert!(!progress.0, 0); // following_completed = false
        assert!(progress.1 == 0, 0); // recommendations_completed = 0
        assert!(!progress.2, 0); // engagement_completed = false
        
        unit_test::end(scenario);
    }
}
