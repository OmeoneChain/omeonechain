#[test_only]
module omeonechain::recommendation_tests {
    use std::string;
    use std::vector;
    use std::signer;
    use std::unit_test;
    
    use omeonechain::common;
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
        reputation::initialize(&admin);
        recommendation::initialize(&admin);
        
        // Initialize user reputations
        reputation::initialize_user_reputation(&alice);
        reputation::initialize_user_reputation(&bob);
        reputation::initialize_user_reputation(&carol);
        
        // Setup social graph
        reputation::follow(&alice, BOB);
        reputation::follow(&bob, CAROL);
        
        (admin, alice, bob, carol)
    }
    
    #[test]
    fun test_recommendation_lifecycle() {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Create a recommendation
        recommendation::create_recommendation(
            &alice,
            string::utf8(b"restaurant-123"),
            1, // Restaurant category
            40712800, // Latitude (NYC)
            74006000, // Longitude
            false, // North latitude (not negative)
            true,  // West longitude (negative)
            vector<u8>[1, 2, 3, 4], // Content hash (simplified)
            1, // Hash type (SHA-256)
            string::utf8(b"QmHashExample") // IPFS CID
        );
        
        // Get the recommendation ID (in a real test, we would query this)
        let rec_id = string::utf8(b"REC1");
        
        // Have Bob upvote the recommendation
        recommendation::upvote_recommendation(&bob, rec_id);
        
        // Verify recommendation details
        let (exists, author, service_id, trust_score, upvotes, downvotes, ipfs_cid) = 
            recommendation::get_recommendation(rec_id);
        
        assert!(exists, 0);
        assert!(author == ALICE, 0);
        assert!(service_id == string::utf8(b"restaurant-123"), 0);
        assert!(upvotes == 1, 0); // One upvote from Bob
        assert!(downvotes == 0, 0); // No downvotes
        
        // Have Carol downvote the recommendation
        recommendation::downvote_recommendation(&carol, rec_id);
        
        // Verify updated recommendation details
        let (_, _, _, _, upvotes, downvotes, _) = recommendation::get_recommendation(rec_id);
        assert!(upvotes == 1, 0); // Still one upvote
        assert!(downvotes == 1, 0); // One downvote from Carol
        
        // Calculate reward multiplier
        let multiplier = recommendation::calculate_reward_multiplier(rec_id);
        
        // Check trust-based reward calculation
        // In a real test, we would have more assertions about the expected multiplier
        // based on social distance and reputation
    }
    
    #[test]
    #[expected_failure(abort_code = 102)] // E_ALREADY_VOTED
    fun test_cannot_upvote_twice() {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Create a recommendation
        recommendation::create_recommendation(
            &alice,
            string::utf8(b"restaurant-123"),
            1, // Restaurant category
            40712800, // Latitude
            74006000, // Longitude
            false,
            true,
            vector<u8>[1, 2, 3, 4], // Content hash
            1, // Hash type
            string::utf8(b"QmHashExample")
        );
        
        // Get the recommendation ID
        let rec_id = string::utf8(b"REC1");
        
        // Have Bob upvote the recommendation
        recommendation::upvote_recommendation(&bob, rec_id);
        
        // Try to upvote again - should fail
        recommendation::upvote_recommendation(&bob, rec_id);
    }
    
    #[test]
    #[expected_failure(abort_code = 103)] // E_CANNOT_VOTE_OWN
    fun test_cannot_upvote_own_recommendation() {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Create a recommendation
        recommendation::create_recommendation(
            &alice,
            string::utf8(b"restaurant-123"),
            1, // Restaurant category
            40712800, // Latitude
            74006000, // Longitude
            false,
            true,
            vector<u8>[1, 2, 3, 4], // Content hash
            1, // Hash type
            string::utf8(b"QmHashExample")
        );
        
        // Get the recommendation ID
        let rec_id = string::utf8(b"REC1");
        
        // Try to upvote own recommendation - should fail
        recommendation::upvote_recommendation(&alice, rec_id);
    }
    
    #[test]
    fun test_trust_score_calculation() {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Create a recommendation
        recommendation::create_recommendation(
            &alice,
            string::utf8(b"restaurant-123"),
            1, // Restaurant category
            40712800, // Latitude
            74006000, // Longitude
            false,
            true,
            vector<u8>[1, 2, 3, 4], // Content hash
            1, // Hash type
            string::utf8(b"QmHashExample")
        );
        
        // Get the recommendation ID
        let rec_id = string::utf8(b"REC1");
        
        // Have Bob and Carol upvote the recommendation
        recommendation::upvote_recommendation(&bob, rec_id);
        
        // Create another user and have them upvote
        let dave = unit_test::create_signer_for_testing(@0x103);
        reputation::initialize_user_reputation(&dave);
        recommendation::upvote_recommendation(&dave, rec_id);
        
        // Verify trust score is calculated
        let (_, _, _, trust_score, _, _, _) = recommendation::get_recommendation(rec_id);
        assert!(trust_score > 0, 0); // Trust score should be positive with two upvotes
        
        // Add a downvote
        recommendation::downvote_recommendation(&carol, rec_id);
        
        // Verify trust score is updated
        let (_, _, _, new_trust_score, _, _, _) = recommendation::get_recommendation(rec_id);
        
        // In a real test, we would have more specific assertions about how the trust score changes
        // based on upvotes and downvotes from users with different social distances
    }
}
