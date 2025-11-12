#[test_only]
module omeonechain::reputation_tests {
    use std::string;
    use std::vector;
    use std::signer;
    use std::unit_test;
    
    use omeonechain::common;
    use omeonechain::reputation;
    
    // Test constants
    const ALICE: address = @0x100;
    const BOB: address = @0x101;
    const CAROL: address = @0x102;
    const DAVE: address = @0x103;
    const EVE: address = @0x104;
    
    const INITIAL_REPUTATION_SCORE: u64 = 50; // 0.50 with 2 decimal precision
    
    fun setup_test_environment(): (signer, signer, signer, signer, signer, signer) {
        // Create test accounts
        let admin = unit_test::create_signer_for_testing(@omeonechain);
        let alice = unit_test::create_signer_for_testing(ALICE);
        let bob = unit_test::create_signer_for_testing(BOB);
        let carol = unit_test::create_signer_for_testing(CAROL);
        let dave = unit_test::create_signer_for_testing(DAVE);
        let eve = unit_test::create_signer_for_testing(EVE);
        
        // Initialize reputation module
        reputation::initialize(&admin);
        
        (admin, alice, bob, carol, dave, eve)
    }
    
    #[test]
    fun test_initialize_reputation() acquires reputation::GlobalReputationRegistry, reputation::ReputationScore {
        let (admin, alice, bob, carol, _, _) = setup_test_environment();
        
        // Initialize reputation for Alice
        reputation::initialize_user_reputation(&alice);
        
        // Verify reputation was initialized
        let score = reputation::get_reputation_value(ALICE);
        assert!(score == INITIAL_REPUTATION_SCORE, 0);
        
        // Initialize more users
        reputation::initialize_user_reputation(&bob);
        reputation::initialize_user_reputation(&carol);
        
        // Verify global registry has users
        let registry = borrow_global<reputation::GlobalReputationRegistry>(@omeonechain);
        assert!(vector::contains(&registry.registered_users, &ALICE), 0);
        assert!(vector::contains(&registry.registered_users, &BOB), 0);
        assert!(vector::contains(&registry.registered_users, &CAROL), 0);
    }
    
    #[test]
    fun test_social_graph_operations() acquires reputation::SocialGraph, reputation::GlobalReputationRegistry {
        let (admin, alice, bob, carol, dave, _) = setup_test_environment();
        
        // Initialize reputations
        reputation::initialize_user_reputation(&alice);
        reputation::initialize_user_reputation(&bob);
        reputation::initialize_user_reputation(&carol);
        reputation::initialize_user_reputation(&dave);
        
        // Test following
        reputation::follow(&alice, BOB);
        reputation::follow(&bob, CAROL);
        reputation::follow(&carol, DAVE);
        reputation::follow(&dave, ALICE); // Creates a cycle
        
        // Verify following relationships
        assert!(reputation::is_following(ALICE, BOB), 0);
        assert!(reputation::is_following(BOB, CAROL), 0);
        assert!(reputation::is_following(CAROL, DAVE), 0);
        assert!(reputation::is_following(DAVE, ALICE), 0);
        
        // Verify follower counts
        assert!(reputation::get_follower_count(BOB) == 1, 0); // Alice follows Bob
        assert!(reputation::get_follower_count(CAROL) == 1, 0); // Bob follows Carol
        
        // Verify following counts
        assert!(reputation::get_following_count(ALICE) == 1, 0); // Alice follows Bob
        assert!(reputation::get_following_count(BOB) == 1, 0); // Bob follows Carol
        
        // Test unfollowing
        reputation::unfollow(&alice, BOB);
        
        // Verify relationship is removed
        assert!(!reputation::is_following(ALICE, BOB), 0);
        assert!(reputation::get_follower_count(BOB) == 0, 0); // No one follows Bob now
        assert!(reputation::get_following_count(ALICE) == 0, 0); // Alice follows no one now
    }
    
    #[test]
    fun test_social_distance() acquires reputation::SocialGraph, reputation::GlobalReputationRegistry {
        let (admin, alice, bob, carol, dave, eve) = setup_test_environment();
        
        // Initialize reputations
        reputation::initialize_user_reputation(&alice);
        reputation::initialize_user_reputation(&bob);
        reputation::initialize_user_reputation(&carol);
        reputation::initialize_user_reputation(&dave);
        reputation::initialize_user_reputation(&eve);
        
        // Create social graph:
        // Alice -> Bob -> Carol -> Dave
        //   |                ^
        //   +----------------+
        //           Eve
        
        reputation::follow(&alice, BOB);
        reputation::follow(&bob, CAROL);
        reputation::follow(&carol, DAVE);
        reputation::follow(&alice, CAROL); // Direct connection to create 2-hop path
        
        // Test distances
        let alice_to_alice = reputation::social_distance(ALICE, ALICE);
        let alice_to_bob = reputation::social_distance(ALICE, BOB);
        let alice_to_carol = reputation::social_distance(ALICE, CAROL);
        let alice_to_dave = reputation::social_distance(ALICE, DAVE);
        let alice_to_eve = reputation::social_distance(ALICE, EVE);
        
        assert!(alice_to_alice == 0, 0); // Self distance is 0
        assert!(alice_to_bob == 1, 0); // Direct connection
        assert!(alice_to_carol == 1, 0); // Direct connection
        assert!(alice_to_dave == 2, 0); // Two hops through Carol
        assert!(alice_to_eve == 3, 0); // Beyond 2 hops (actually unreachable)
    }
    
    #[test]
    fun test_reputation_updates() acquires reputation::ReputationScore, reputation::GlobalReputationRegistry {
        let (admin, alice, _, _, _, _) = setup_test_environment();
        
        // Initialize reputation for Alice
        reputation::initialize_user_reputation(&alice);
        
        // Get initial score
        let initial_score = reputation::get_reputation_value(ALICE);
        
        // Update reputation for recommendation activity
        reputation::update_reputation_for_recommendation(&admin, ALICE, 10, 2); // 10 upvotes, 2 downvotes
        
        // Verify score increased
        let new_score = reputation::get_reputation_value(ALICE);
        assert!(new_score > initial_score, 0);
        
        // Update with more downvotes than upvotes
        reputation::update_reputation_for_recommendation(&admin, ALICE, 2, 10); // 2 upvotes, 10 downvotes
        
        // Verify score decreased
        let final_score = reputation::get_reputation_value(ALICE);
        assert!(final_score < new_score, 0);
    }
    
    #[test]
    fun test_verification_levels() acquires reputation::ReputationScore, reputation::GlobalReputationRegistry {
        let (admin, alice, _, _, _, _) = setup_test_environment();
        
        // Initialize reputation for Alice
        reputation::initialize_user_reputation(&alice);
        
        // Set verification level
        reputation::set_verification_level(&admin, ALICE, 2); // VERIFICATION_LEVEL_VERIFIED
        
        // Get reputation and check trust modifier
        let rep = reputation::get_reputation_score(ALICE);
        let modifier = reputation::get_trust_modifier(rep);
        
        // Verified users get a +10 bonus to trust modifier
        assert!(modifier > 100, 0); // Base modifier is 100 (1.0x)
    }
    
    #[test]
    fun test_specializations() acquires reputation::ReputationScore, reputation::GlobalReputationRegistry {
        let (admin, alice, _, _, _, _) = setup_test_environment();
        
        // Initialize reputation for Alice
        reputation::initialize_user_reputation(&alice);
        
        // Add specializations
        reputation::add_specialization(&admin, ALICE, 1); // Restaurant category
        reputation::add_specialization(&admin, ALICE, 2); // Hotel category
        
        // Cannot test specifics of specializations without more query functions,
        // but we can test that the operation completes successfully
        
        // Try adding the same specialization again (should not error,
        // but also should not duplicate)
        reputation::add_specialization(&admin, ALICE, 1);
    }
    
    #[test_only]
    public fun create_signer_for_testing(addr: address): signer {
        // In a real implementation, this would not be possible
        // This is only for testing
        unit_test::create_signer_for_testing(addr)
    }
}
