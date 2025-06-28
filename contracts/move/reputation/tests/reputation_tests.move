#[test_only]
module omeone::reputation_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::test_utils;
    use sui::table;
    use std::vector;
    use std::string;
    
    use omeone::reputation::{Self, UserReputation, ReputationRegistry};
    use omeone::common;

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA1;
    const BOB: address = @0xB1;
    const CHARLIE: address = @0xC1;
    const DAVE: address = @0xD1;
    const EVE: address = @0xE1;

    #[test]
    fun test_create_user_reputation() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Initialize reputation system
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        // Create reputation for Alice
        let alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Verify initial values
        assert!(reputation::get_reputation_score(&alice_reputation) == 500, 0); // 5.00 initial score
        assert!(reputation::get_verification_level(&alice_reputation) == 0, 1); // Basic level
        assert!(reputation::can_earn_rewards(&alice_reputation) == true, 2); // Above 2.50 threshold
        assert!(reputation::can_participate_governance(&alice_reputation) == true, 3); // Above 4.00 threshold
        assert!(reputation::can_submit_proposals(&alice_reputation) == false, 4); // Below 5.00 threshold
        assert!(reputation::is_expert_level(&alice_reputation) == false, 5); // Below 7.50 threshold
        
        // Check social metrics
        let (followers, following) = reputation::get_social_metrics(&alice_reputation);
        assert!(followers == 0, 6);
        assert!(following == 0, 7);
        
        // Check trust connections
        assert!(reputation::get_trust_connection_count(&alice_reputation) == 0, 8);
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_social_connections() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        // Create reputations for Alice and Bob
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        let bob_reputation = reputation::create_user_reputation(BOB, &mut registry, ctx);
        let bob_score = reputation::get_reputation_score(&bob_reputation);
        
        // Alice follows Bob
        reputation::add_social_connection(&mut alice_reputation, BOB, bob_score, ctx);
        
        // Verify connection was added
        assert!(reputation::get_trust_connection_count(&alice_reputation) == 1, 0);
        let (followers, following) = reputation::get_social_metrics(&alice_reputation);
        assert!(following == 1, 1);
        
        // Remove connection
        reputation::remove_social_connection(&mut alice_reputation, BOB, ctx);
        
        // Verify connection was removed
        assert!(reputation::get_trust_connection_count(&alice_reputation) == 0, 2);
        let (followers, following) = reputation::get_social_metrics(&alice_reputation);
        assert!(following == 0, 3);
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_utils::destroy(bob_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_trust_weight_calculation() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        // Create reputations
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        let bob_reputation = reputation::create_user_reputation(BOB, &mut registry, ctx);
        let charlie_reputation = reputation::create_user_reputation(CHARLIE, &mut registry, ctx);
        
        let bob_score = reputation::get_reputation_score(&bob_reputation);
        let charlie_score = reputation::get_reputation_score(&charlie_reputation);
        
        // Alice follows Bob and Charlie
        reputation::add_social_connection(&mut alice_reputation, BOB, bob_score, ctx);
        reputation::add_social_connection(&mut alice_reputation, CHARLIE, charlie_score, ctx);
        
        // Test trust weight calculation with interacting users
        let interacting_users = vector[BOB, CHARLIE];
        let total_weight = reputation::calculate_trust_weights(&alice_reputation, interacting_users);
        
        // Should be based on direct connections with default trust weights
        assert!(total_weight > 0, 0);
        assert!(total_weight <= 3000, 1); // Capped at 3x multiplier
        
        // Test with empty vector
        let empty_users = vector::empty<address>();
        let zero_weight = reputation::calculate_trust_weights(&alice_reputation, empty_users);
        assert!(zero_weight == 0, 2);
        
        // Test with non-connected user
        let dave_reputation = reputation::create_user_reputation(DAVE, &mut registry, ctx);
        let non_connected_users = vector[DAVE];
        let no_weight = reputation::calculate_trust_weights(&alice_reputation, non_connected_users);
        assert!(no_weight == 0, 3);
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_utils::destroy(bob_reputation);
        test_utils::destroy(charlie_reputation);
        test_utils::destroy(dave_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reputation_score_update() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        let initial_score = reputation::get_reputation_score(&alice_reputation);
        
        // Create performance data (simulating good performance)
        let performance_data = vector[600, 650, 700, 550, 800]; // Above average performance
        
        // Update reputation score
        reputation::update_reputation_score(&mut alice_reputation, performance_data, ctx);
        
        let new_score = reputation::get_reputation_score(&alice_reputation);
        
        // Score should have improved with good performance data
        assert!(new_score >= initial_score, 0);
        assert!(new_score <= 1000, 1); // Within valid range
        
        // Test with poor performance data
        let poor_performance = vector[200, 150, 300, 250, 100]; // Below average
        reputation::update_reputation_score(&mut alice_reputation, poor_performance, ctx);
        
        let updated_score = reputation::get_reputation_score(&alice_reputation);
        assert!(updated_score < new_score, 2); // Should decrease with poor performance
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_verification_and_penalties() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        // Create reputations for verifiers and target
        let alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        let bob_reputation = reputation::create_user_reputation(BOB, &mut registry, ctx);
        let charlie_reputation = reputation::create_user_reputation(CHARLIE, &mut registry, ctx);
        let mut eve_reputation = reputation::create_user_reputation(EVE, &mut registry, ctx); // Target of report
        
        let initial_eve_score = reputation::get_reputation_score(&eve_reputation);
        
        // Submit verification report (spam violation)
        test_scenario::next_tx(&mut scenario, ALICE);
        let alice_signer = test_scenario::take_from_sender<signer>(&scenario);
        
        let evidence_hash = vector[1, 2, 3, 4]; // Sample evidence hash
        let report_id = reputation::submit_verification_report(
            &alice_signer,
            EVE,
            1, // VERIFICATION_SPAM
            evidence_hash,
            &mut registry,
            ctx
        );
        
        test_scenario::return_to_sender(&scenario, alice_signer);
        
        // Add more verifications
        test_scenario::next_tx(&mut scenario, BOB);
        let bob_signer = test_scenario::take_from_sender<signer>(&scenario);
        reputation::add_verification(&bob_signer, report_id, &mut registry, ctx);
        test_scenario::return_to_sender(&scenario, bob_signer);
        
        test_scenario::next_tx(&mut scenario, CHARLIE);
        let charlie_signer = test_scenario::take_from_sender<signer>(&scenario);
        reputation::add_verification(&charlie_signer, report_id, &mut registry, ctx);
        test_scenario::return_to_sender(&scenario, charlie_signer);
        
        // Apply penalty (should work now with 3+ verifiers)
        reputation::apply_reputation_penalty(&mut eve_reputation, report_id, &mut registry, ctx);
        
        let penalized_score = reputation::get_reputation_score(&eve_reputation);
        assert!(penalized_score < initial_eve_score, 0); // Score should decrease
        assert!(penalized_score == initial_eve_score - 50, 1); // Spam penalty is 50 points
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_utils::destroy(bob_reputation);
        test_utils::destroy(charlie_reputation);
        test_utils::destroy(eve_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reputation_thresholds() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Test initial thresholds (score = 500)
        assert!(reputation::can_earn_rewards(&alice_reputation) == true, 0); // ≥250
        assert!(reputation::can_participate_governance(&alice_reputation) == true, 1); // ≥400
        assert!(reputation::can_submit_proposals(&alice_reputation) == true, 2); // ≥500
        assert!(reputation::is_expert_level(&alice_reputation) == false, 3); // <750
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_performance_weights() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Test with new user (≤10 recommendations)
        let performance_data_high = vector[800, 850, 900]; // High performance
        let performance_data_low = vector[200, 150, 100];  // Low performance
        
        // Update with high performance
        reputation::update_reputation_score(&mut alice_reputation, performance_data_high, ctx);
        let score_after_high = reputation::get_reputation_score(&alice_reputation);
        
        // Should weight recent performance heavily for new users (80%)
        assert!(score_after_high > 500, 0); // Should improve from initial 500
        
        // Simulate having more recommendations (moderate user: 11-50 posts)
        // This would be tracked in actual implementation through recommendation counting
        
        // Update with low performance
        reputation::update_reputation_score(&mut alice_reputation, performance_data_low, ctx);
        let score_after_low = reputation::get_reputation_score(&alice_reputation);
        
        assert!(score_after_low < score_after_high, 1); // Should decrease
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // E_ALREADY_CONNECTED
    fun test_duplicate_connection_fails() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        let bob_reputation = reputation::create_user_reputation(BOB, &mut registry, ctx);
        let bob_score = reputation::get_reputation_score(&bob_reputation);
        
        // Add connection
        reputation::add_social_connection(&mut alice_reputation, BOB, bob_score, ctx);
        
        // Try to add same connection again - should fail
        reputation::add_social_connection(&mut alice_reputation, BOB, bob_score, ctx);
        
        // Clean up (won't reach here due to expected failure)
        test_utils::destroy(alice_reputation);
        test_utils::destroy(bob_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)] // E_NOT_CONNECTED
    fun test_remove_nonexistent_connection_fails() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Try to remove connection that doesn't exist - should fail
        reputation::remove_social_connection(&mut alice_reputation, BOB, ctx);
        
        // Clean up (won't reach here due to expected failure)
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)] // E_INVALID_TARGET
    fun test_self_connection_fails() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Try to connect to self - should fail
        reputation::add_social_connection(&mut alice_reputation, ALICE, 500, ctx);
        
        // Clean up (won't reach here due to expected failure)
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reputation_bounds() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        let mut alice_reputation = reputation::create_user_reputation(ALICE, &mut registry, ctx);
        
        // Test with extremely high performance data
        let extreme_high_performance = vector[1200, 1500, 1800]; // Above max scale
        reputation::update_reputation_score(&mut alice_reputation, extreme_high_performance, ctx);
        
        let score = reputation::get_reputation_score(&alice_reputation);
        assert!(score <= 1000, 0); // Should be capped at max (10.00)
        
        // Clean up
        test_utils::destroy(alice_reputation);
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_batch_operations() {
        let scenario = test_scenario::begin(ADMIN);
        let ctx = test_scenario::ctx(&mut scenario);
        
        reputation::init_for_testing(ctx);
        test_scenario::next_tx(&mut scenario, ADMIN);
        
        let mut registry = test_scenario::take_shared<ReputationRegistry>(&scenario);
        
        // Create multiple users for batch testing
        let users = vector[ALICE, BOB, CHARLIE, DAVE];
        let performance_data = vector[
            vector[600, 650, 700],
            vector[550, 580, 620],
            vector[700, 750, 800],
            vector[400, 450, 500]
        ];
        
        // Test batch update function
        reputation::batch_update_reputation_scores(
            &mut registry,
            users,
            performance_data,
            ctx
        );
        
        // Verify batch processing completed without errors
        // In a real implementation, we would verify individual score updates
        
        test_scenario::return_shared(registry);
        test_scenario::end(scenario);
    }
}