#[test_only]
module omeonechain::reward_tests {
    use std::string;
    use std::signer;
    use std::unit_test;
    
    use omeonechain::common;
    use omeonechain::token;
    use omeonechain::reward;
    use omeonechain::recommendation;
    use omeonechain::reputation;
    
    // Test constants
    const ALICE: address = @0x100;
    const BOB: address = @0x101;
    const CAROL: address = @0x102;
    
    fun setup_test_environment(): (signer, signer, signer, signer) {
        // Create test accounts
        let admin = unit_test::create_signer_for_testing(@omeonechain);
        let alice = unit_test::create_signer_for_testing(ALICE);
        let bob = unit_test::create_signer_for_testing(BOB);
        let carol = unit_test::create_signer_for_testing(CAROL);
        
        // Initialize modules
        reward::initialize(&admin);
        token::initialize(&admin);
        
        // Initialize token balances
        token::initialize_balance(&alice);
        token::initialize_balance(&bob);
        token::initialize_balance(&carol);
        
        (admin, alice, bob, carol)
    }
    
    #[test]
    fun test_starter_pack() acquires reward::StarterPackProgress {
        let (admin, alice, _, _) = setup_test_environment();
        
        // Initialize starter pack for Alice
        reward::initialize_starter_pack(&alice);
        
        // Check initial progress
        let (following_completed, recommendations_completed, engagement_completed, 
             following_reward_claimed, recommendation_rewards_claimed, engagement_reward_claimed) = 
            reward::get_starter_pack_progress(ALICE);
        
        // Initially nothing should be completed or claimed
        assert!(!following_completed, 0);
        assert!(recommendations_completed == 0, 0);
        assert!(!engagement_completed, 0);
        assert!(!following_reward_claimed, 0);
        assert!(recommendation_rewards_claimed == 0, 0);
        assert!(!engagement_reward_claimed, 0);
        
        // Mark following as completed
        let alice_pack = borrow_global_mut<reward::StarterPackProgress>(ALICE);
        alice_pack.following_completed = true;
        
        // Check updated progress
        let (following_completed, _, _, _, _, _) = reward::get_starter_pack_progress(ALICE);
        assert!(following_completed, 0);
        
        // Check completion status
        let has_completed = reward::has_completed_starter_pack(ALICE);
        assert!(!has_completed, 0); // Not fully completed yet
    }
    
    #[test]
    fun test_process_recommendation_reward() acquires reward::RewardRegistry {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // In a real test, we would:
        // 1. Create a recommendation
        // 2. Have users upvote it to reach the threshold
        // 3. Process the reward
        
        // For this simplified test, we'll just check if the recommendation has been processed
        let rec_id = string::utf8(b"test_recommendation");
        let processed = reward::is_recommendation_processed(rec_id);
        assert!(!processed, 0); // Should not be processed initially
        
        // Note: A full test would actually call process_recommendation_reward
        // and then verify the token balance was updated, but this requires more setup
    }
    
    #[test]
    fun test_referral_reward() acquires reward::RewardRegistry {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Process a referral reward (signup type)
        reward::process_referral_reward(&admin, ALICE, BOB, 1);
        
        // Check if processed (in a real test, we would verify token balances)
        // Note: We can't easily check if a specific referral was processed without
        // more complex query methods in the module
        
        // In a full test, we would:
        // 1. Check Alice's token balance increased
        // 2. Verify we can't process the same referral twice
    }
    
    #[test]
    fun test_leaderboard_rewards() acquires reward::RewardRegistry {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Create a vector of winners
        let winners = vector<address>[@0x100, @0x101, @0x102];
        
        // Process leaderboard rewards
        reward::process_leaderboard_rewards(&admin, winners);
        
        // In a full test, we would:
        // 1. Verify the period was created
        // 2. Check that winners received their rewards
        // 3. Verify the weekly period counter increased
    }
}
