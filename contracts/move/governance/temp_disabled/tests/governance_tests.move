#[test_only]
module omeonechain::governance_tests {
    use std::string;
    use std::vector;
    use std::signer;
    use std::unit_test;
    
    use omeonechain::common;
    use omeonechain::governance;
    use omeonechain::token;
    use omeonechain::reputation;
    
    // Test constants
    const ALICE: address = @0x100;
    const BOB: address = @0x101;
    const CAROL: address = @0x102;
    
    // Parameter constants
    const EXPLORER_STAKE_AMOUNT: u64 = 2500000000; // 25 TOK
    const CURATOR_STAKE_AMOUNT: u64 = 10000000000; // 100 TOK
    
    fun setup_test_environment(): (signer, signer, signer, signer) {
        // Create test accounts
        let admin = unit_test::create_signer_for_testing(@omeonechain);
        let alice = unit_test::create_signer_for_testing(ALICE);
        let bob = unit_test::create_signer_for_testing(BOB);
        let carol = unit_test::create_signer_for_testing(CAROL);
        
        // Initialize modules
        governance::initialize(&admin);
        token::initialize(&admin);
        reputation::initialize(&admin);
        
        // Initialize user reputations
        reputation::initialize_user_reputation(&alice);
        reputation::initialize_user_reputation(&bob);
        reputation::initialize_user_reputation(&carol);
        
        // Set up verification levels and reputation scores
        // This would require admin privileges in the reputation module
        
        // Initialize token balances
        token::initialize_balance(&alice);
        token::initialize_balance(&bob);
        token::initialize_balance(&carol);
        
        // Mint tokens to users for staking
        token::mint_development(&admin, ALICE, CURATOR_STAKE_AMOUNT * 2, string::utf8(b"test_tokens"));
        token::mint_development(&admin, BOB, EXPLORER_STAKE_AMOUNT * 2, string::utf8(b"test_tokens"));
        
        (admin, alice, bob, carol)
    }
    
    #[test]
    fun test_governance_parameters() acquires governance::GovernanceParameters {
        let (admin, _, _, _) = setup_test_environment();
        
        // Get governance parameters
        let (fee_burn, trust_cap, trust_threshold, quorum, threshold) = governance::get_governance_parameters();
        
        // Verify default parameters
        assert!(fee_burn == 75, 0); // 75% fee burn
        assert!(trust_cap == 300, 0); // 3x trust multiplier cap
        assert!(trust_threshold == 25, 0); // 0.25 trust threshold
        assert!(quorum == 20, 0); // 20% quorum
        assert!(threshold == 51, 0); // 51% threshold
    }
    
    #[test]
    fun test_staking() acquires governance::GovernanceRegistry, governance::StakedTokens {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Stake tokens as Explorer tier
        governance::stake_tokens(&bob, EXPLORER_STAKE_AMOUNT, 1, 30); // 30 day stake
        
        // Verify stake
        let (exists, amount, tier, lock_until) = governance::get_stake(BOB);
        assert!(exists, 0);
        assert!(amount == EXPLORER_STAKE_AMOUNT, 0);
        assert!(tier == 1, 0); // Explorer tier
        
        // Stake tokens as Curator tier
        governance::stake_tokens(&alice, CURATOR_STAKE_AMOUNT, 2, 90); // 90 day stake
        
        // Verify stake
        let (exists, amount, tier, _) = governance::get_stake(ALICE);
        assert!(exists, 0);
        assert!(amount == CURATOR_STAKE_AMOUNT, 0);
        assert!(tier == 2, 0); // Curator tier
        
        // Check total staked
        let total_staked = governance::get_total_staked();
        assert!(total_staked == EXPLORER_STAKE_AMOUNT + CURATOR_STAKE_AMOUNT, 0);
        
        // Note: Testing unstaking would require time manipulation, which is not easily
        // done in Move unit tests without special test helpers
    }
    
    #[test]
    fun test_proposal_creation() acquires governance::GovernanceRegistry, governance::StakedTokens, governance::Proposal {
        let (admin, alice, _, _) = setup_test_environment();
        
        // Stake tokens as Curator (required for proposal creation)
        governance::stake_tokens(&alice, CURATOR_STAKE_AMOUNT, 2, 90);
        
        // Set up reputation for Alice (required for proposal creation)
        let alice_signer = reputation::create_signer_for_testing(ALICE);
        reputation::set_verification_level(&admin, ALICE, 2); // Set to verified level
        
        // Create parameter names and values
        let param_names = vector<string::String>[string::utf8(b"fee_burn_percentage")];
        let param_values = vector<u64>[80]; // Change fee burn to 80%
        
        // Create a proposal
        governance::create_proposal(
            &alice,
            1, // Parameter change proposal
            string::utf8(b"Increase Fee Burn"),
            string::utf8(b"Proposal to increase fee burn percentage from 75% to 80%"),
            vector<u8>[1, 2, 3, 4], // Dummy execution hash
            param_names,
            param_values,
            7 // 7 day voting period
        );
        
        // Get proposal details (it would have ID 1 as the first proposal)
        let (exists, state, votes_for, votes_against, voter_count, _, _) = governance::get_proposal(1);
        
        // Verify proposal was created
        assert!(exists, 0);
        assert!(state == 1, 0); // Active state
        assert!(votes_for == 0, 0);
        assert!(votes_against == 0, 0);
        assert!(voter_count == 0, 0);
    }
    
    #[test]
    fun test_voting() acquires governance::GovernanceRegistry, governance::StakedTokens, governance::Proposal, governance::VoteRecord {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Stake tokens
        governance::stake_tokens(&alice, CURATOR_STAKE_AMOUNT, 2, 90);
        governance::stake_tokens(&bob, EXPLORER_STAKE_AMOUNT, 1, 30);
        
        // Set up reputation
        let alice_signer = reputation::create_signer_for_testing(ALICE);
        reputation::set_verification_level(&admin, ALICE, 2);
        
        // Create a proposal
        let param_names = vector<string::String>[string::utf8(b"fee_burn_percentage")];
        let param_values = vector<u64>[80];
        
        governance::create_proposal(
            &alice,
            1,
            string::utf8(b"Increase Fee Burn"),
            string::utf8(b"Proposal to increase fee burn percentage from 75% to 80%"),
            vector<u8>[1, 2, 3, 4],
            param_names,
            param_values,
            7
        );
        
        // Vote on the proposal
        governance::vote_on_proposal(&bob, 1, true); // Vote in favor
        
        // Check votes
        let (_, _, votes_for, votes_against, voter_count, _, _) = governance::get_proposal(1);
        assert!(votes_for == EXPLORER_STAKE_AMOUNT, 0); // Bob's stake amount
        assert!(votes_against == 0, 0);
        assert!(voter_count == 1, 0); // One voter
    }
    
    #[test]
    #[expected_failure(abort_code = 503)] // E_ALREADY_VOTED
    fun test_cannot_vote_twice() acquires governance::GovernanceRegistry, governance::StakedTokens, governance::Proposal, governance::VoteRecord {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Stake tokens
        governance::stake_tokens(&alice, CURATOR_STAKE_AMOUNT, 2, 90);
        governance::stake_tokens(&bob, EXPLORER_STAKE_AMOUNT, 1, 30);
        
        // Set up reputation
        let alice_signer = reputation::create_signer_for_testing(ALICE);
        reputation::set_verification_level(&admin, ALICE, 2);
        
        // Create a proposal
        let param_names = vector<string::String>[string::utf8(b"fee_burn_percentage")];
        let param_values = vector<u64>[80];
        
        governance::create_proposal(
            &alice,
            1,
            string::utf8(b"Increase Fee Burn"),
            string::utf8(b"Proposal to increase fee burn percentage from 75% to 80%"),
            vector<u8>[1, 2, 3, 4],
            param_names,
            param_values,
            7
        );
        
        // Vote on the proposal
        governance::vote_on_proposal(&bob, 1, true);
        
        // Try to vote again - should fail
        governance::vote_on_proposal(&bob, 1, false);
    }
}
