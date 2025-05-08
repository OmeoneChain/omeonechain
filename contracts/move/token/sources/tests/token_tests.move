#[test_only]
module omeonechain::token_tests {
    use std::string;
    use std::signer;
    use std::unit_test;
    
    use omeonechain::common;
    use omeonechain::token;
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
        token::initialize(&admin);
        
        // Initialize token balances
        token::initialize_balance(&alice);
        token::initialize_balance(&bob);
        token::initialize_balance(&carol);
        
        (admin, alice, bob, carol)
    }
    
    #[test]
    fun test_token_supply() {
        let (admin, _, _, _) = setup_test_environment();
        
        // Verify supply details
        let (total_supply, circulating, burned, emission_rate) = token::get_token_supply();
        
        // Total supply should be 10 billion tokens
        assert!(total_supply == 10000000000, 0);
        
        // Initially no tokens in circulation
        assert!(circulating == 0, 0);
        
        // Initially no tokens burned
        assert!(burned == 0, 0);
        
        // Initial emission rate should be 100%
        assert!(emission_rate == 100, 0);
    }
    
    #[test]
    fun test_token_allocation() {
        let (admin, alice, bob, carol) = setup_test_environment();
        
        // Mint tokens from development allocation
        token::mint_development(&admin, ALICE, 10000000, string::utf8(b"test_dev_allocation"));
        
        // Verify balance
        let alice_balance = token::get_balance(ALICE);
        assert!(alice_balance == 10000000, 0);
        
        // Mint tokens from ecosystem allocation
        token::mint_ecosystem(&admin, BOB, 20000000, string::utf8(b"test_eco_allocation"));
        
        // Verify balance
        let bob_balance = token::get_balance(BOB);
        assert!(bob_balance == 20000000, 0);
        
        // Mint tokens from team allocation
        token::mint_team(&admin, CAROL, 15000000, string::utf8(b"test_team_allocation"));
        
        // Verify balance
        let carol_balance = token::get_balance(CAROL);
        assert!(carol_balance == 15000000, 0);
        
        // Verify updated supply
        let (_, circulating, _, _) = token::get_token_supply();
        assert!(circulating == 45000000, 0); // Sum of all minted tokens
    }
    
    #[test]
    fun test_token_transfer() {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Mint tokens to Alice
        token::mint_development(&admin, ALICE, 50000000, string::utf8(b"test_transfer"));
        
        // Transfer tokens from Alice to Bob
        token::transfer(&alice, BOB, 20000000, string::utf8(b"test_user_transfer"));
        
        // Verify balances
        let alice_balance = token::get_balance(ALICE);
        let bob_balance = token::get_balance(BOB);
        
        assert!(alice_balance == 30000000, 0); // 50M - 20M
        assert!(bob_balance == 20000000, 0);
    }
    
    #[test]
    fun test_token_burn() {
        let (admin, alice, _, _) = setup_test_environment();
        
        // Mint tokens to Alice
        token::mint_development(&admin, ALICE, 50000000, string::utf8(b"test_burn"));
        
        // Burn tokens
        token::burn(&alice, 10000000, string::utf8(b"test_burn_operation"));
        
        // Verify balance
        let alice_balance = token::get_balance(ALICE);
        assert!(alice_balance == 40000000, 0); // 50M - 10M
        
        // Verify burn count
        let (_, circulating, burned, _) = token::get_token_supply();
        assert!(circulating == 40000000, 0);
        assert!(burned == 10000000, 0);
    }
    
    #[test]
    fun test_fee_processing() {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Mint tokens to Alice
        token::mint_development(&admin, ALICE, 50000000, string::utf8(b"test_fee"));
        
        // Process fee
        token::process_fee(&alice, 10000000, string::utf8(b"test_fee_payment"));
        
        // Verify Alice's balance
        let alice_balance = token::get_balance(ALICE);
        assert!(alice_balance == 40000000, 0); // 50M - 10M
        
        // Verify treasury balance (should get 25% of fee)
        let treasury_balance = token::get_balance(@omeonechain);
        assert!(treasury_balance == 2500000, 0); // 10M * 25%
        
        // Verify burn amount (should be 75% of fee)
        let (_, circulating, burned, _) = token::get_token_supply();
        assert!(burned == 7500000, 0); // 10M * 75%
        assert!(circulating == 42500000, 0); // 50M - 7.5M burned
    }
    
    #[test]
    fun test_halving() {
        let (admin, alice, _, _) = setup_test_environment();
        
        // Initial emission rate should be 100%
        let initial_rate = token::get_emission_rate();
        assert!(initial_rate == 100, 0);
        
        // To test halving, we would need to distribute enough tokens to trigger a halving event
        // This would be quite involved in a unit test, but here's a sketch of how it would work:
        
        // 1. Mint enough tokens to trigger the first halving
        // Note: This would require distributing 1 billion tokens (10% of supply)
        // For testing purposes, this is simplified
        
        // 2. Check the new emission rate
        // The rate should be 50% after the first halving
        
        // 3. Mint more tokens to trigger the second halving
        
        // 4. Check that the emission rate is now 25%
    }
    
    #[test]
    #[expected_failure(abort_code = 302)] // E_INSUFFICIENT_BALANCE
    fun test_insufficient_balance_transfer() {
        let (admin, alice, bob, _) = setup_test_environment();
        
        // Mint a small amount to Alice
        token::mint_development(&admin, ALICE, 10000000, string::utf8(b"test_insufficient"));
        
        // Try to transfer more than Alice has
        token::transfer(&alice, BOB, 20000000, string::utf8(b"test_should_fail"));
        
        // Should fail with insufficient balance error
    }
}
