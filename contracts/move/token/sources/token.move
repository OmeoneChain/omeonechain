module omeonechain::token {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    
    use omeonechain::common::{Self, TimeStamp};
    use omeonechain::recommendation::{Self};
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 301;
    const E_INSUFFICIENT_BALANCE: u64 = 302;
    const E_TOKEN_ALREADY_EXISTS: u64 = 303;
    const E_EXCEEDS_SUPPLY_CAP: u64 = 304;
    const E_REWARD_ALREADY_CLAIMED: u64 = 305;
    const E_BELOW_REWARD_THRESHOLD: u64 = 306;
    const E_INVALID_HALVING_PERIOD: u64 = 307;
    
    /// Constants
    const TOTAL_SUPPLY_CAP: u64 = 10000000000; // 10 billion tokens
    const DECIMALS: u8 = 8; // 8 decimal places
    
    const REWARDS_ALLOCATION: u64 = 5200000000; // 5.2 billion tokens (52%)
    const DEVELOPMENT_ALLOCATION: u64 = 2000000000; // 2 billion tokens (20%)
    const ECOSYSTEM_ALLOCATION: u64 = 1600000000; // 1.6 billion tokens (16%)
    const TEAM_ALLOCATION: u64 = 1200000000; // 1.2 billion tokens (12%)
    
    // Halving thresholds (10% of supply each)
    const HALVING_THRESHOLD_1: u64 = 1000000000; // 1 billion tokens (10% of total)
    const HALVING_THRESHOLD_2: u64 = 2000000000; // 2 billion tokens (20% of total)
    const HALVING_THRESHOLD_3: u64 = 3000000000; // 3 billion tokens (30% of total)
    // ... and so on until 90%
    
    const BASE_EMISSION_RATE: u64 = 100; // Base emission rate (100%)
    const FEE_BURN_PERCENTAGE: u64 = 75; // 75% of fees are burned
    
    /// Token balance for a user
    struct TokenBalance has key, store {
        balance: u64,
        timestamp: TimeStamp,
    }
    
    /// Token supply registry
    struct TokenSupply has key {
        total_supply: u64,
        circulating_supply: u64,
        rewards_remaining: u64,
        development_remaining: u64,
        ecosystem_remaining: u64,
        team_remaining: u64,
        total_burned: u64,
        emission_rate: u64, // Current emission rate percentage
        halving_index: u64, // Current halving period (0-9)
        timestamp: TimeStamp,
    }
    
    /// Transaction registry
    struct TransactionRegistry has key {
        transaction_count: u64,
        transactions: vector<Transaction>,
    }
    
    /// Transaction record
    struct Transaction has store {
        id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        transaction_type: u8, // 1=reward, 2=transfer, 3=fee, 4=burn
        reference: String, // Optional reference (e.g., recommendation ID)
        timestamp: u64,
    }
    
    /// Reward claim registry
    struct RewardClaimRegistry has key {
        claimed_recommendations: vector<String>,
    }
    
    /// Initialize the token module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Check if already initialized
        assert!(!exists<TokenSupply>(admin_addr), error::already_exists(E_TOKEN_ALREADY_EXISTS));
        
        // Create token supply registry
        let token_supply = TokenSupply {
            total_supply: TOTAL_SUPPLY_CAP,
            circulating_supply: 0,
            rewards_remaining: REWARDS_ALLOCATION,
            development_remaining: DEVELOPMENT_ALLOCATION,
            ecosystem_remaining: ECOSYSTEM_ALLOCATION,
            team_remaining: TEAM_ALLOCATION,
            total_burned: 0,
            emission_rate: BASE_EMISSION_RATE,
            halving_index: 0,
            timestamp: common::create_timestamp(),
        };
        
        // Create transaction registry
        let transaction_registry = TransactionRegistry {
            transaction_count: 0,
            transactions: vector::empty<Transaction>(),
        };
        
        // Create reward claim registry
        let reward_claim_registry = RewardClaimRegistry {
            claimed_recommendations: vector::empty<String>(),
        };
        
        // Store registries
        move_to(admin, token_supply);
        move_to(admin, transaction_registry);
        move_to(admin, reward_claim_registry);
        
        // Initialize admin balance
        let admin_balance = TokenBalance {
            balance: 0,
            timestamp: common::create_timestamp(),
        };
        move_to(admin, admin_balance);
    }
    
    /// Initialize a user's token balance
    public entry fun initialize_balance(user: &signer) {
        let user_addr = signer::address_of(user);
        
        // Check if balance already exists
        if (!exists<TokenBalance>(user_addr)) {
            // Create balance with 0 tokens
            let balance = TokenBalance {
                balance: 0,
                timestamp: common::create_timestamp(),
            };
            move_to(user, balance);
        };
    }
    
    /// Transfer tokens from sender to recipient
    public entry fun transfer(
        sender: &signer,
        recipient: address,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TransactionRegistry {
        let sender_addr = signer::address_of(sender);
        
        // Ensure both sender and recipient have balance resources
        assert!(exists<TokenBalance>(sender_addr), error::not_found(0));
        
        // Initialize recipient balance if it doesn't exist
        if (!exists<TokenBalance>(recipient)) {
            let recipient_signer = create_signer_for_testing(recipient); // Note: This is for testing only
            initialize_balance(&recipient_signer);
        };
        
        // Get balances
        let sender_balance = borrow_global_mut<TokenBalance>(sender_addr);
        let recipient_balance = borrow_global_mut<TokenBalance>(recipient);
        
        // Check if sender has sufficient balance
        assert!(sender_balance.balance >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        // Update balances
        sender_balance.balance = sender_balance.balance - amount;
        recipient_balance.balance = recipient_balance.balance + amount;
        
        // Update timestamps
        common::update_timestamp(&mut sender_balance.timestamp);
        common::update_timestamp(&mut recipient_balance.timestamp);
        
        // Record transaction
        record_transaction(sender_addr, recipient, amount, 2, reference);
    }
    
    /// Mint tokens for development allocation
    public entry fun mint_development(
        admin: &signer,
        recipient: address,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get token supply
        let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
        
        // Check if amount is within remaining development allocation
        assert!(amount <= token_supply.development_remaining, error::invalid_state(E_EXCEEDS_SUPPLY_CAP));
        
        // Initialize recipient balance if it doesn't exist
        if (!exists<TokenBalance>(recipient)) {
            let recipient_signer = create_signer_for_testing(recipient); // Note: This is for testing only
            initialize_balance(&recipient_signer);
        };
        
        // Get recipient balance
        let recipient_balance = borrow_global_mut<TokenBalance>(recipient);
        
        // Update balances
        recipient_balance.balance = recipient_balance.balance + amount;
        token_supply.circulating_supply = token_supply.circulating_supply + amount;
        token_supply.development_remaining = token_supply.development_remaining - amount;
        
        // Update timestamps
        common::update_timestamp(&mut recipient_balance.timestamp);
        common::update_timestamp(&mut token_supply.timestamp);
        
        // Record transaction
        record_transaction(@omeonechain, recipient, amount, 1, reference);
    }
    
    /// Mint tokens for ecosystem allocation
    public entry fun mint_ecosystem(
        admin: &signer,
        recipient: address,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get token supply
        let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
        
        // Check if amount is within remaining ecosystem allocation
        assert!(amount <= token_supply.ecosystem_remaining, error::invalid_state(E_EXCEEDS_SUPPLY_CAP));
        
        // Initialize recipient balance if it doesn't exist
        if (!exists<TokenBalance>(recipient)) {
            let recipient_signer = create_signer_for_testing(recipient); // Note: This is for testing only
            initialize_balance(&recipient_signer);
        };
        
        // Get recipient balance
        let recipient_balance = borrow_global_mut<TokenBalance>(recipient);
        
        // Update balances
        recipient_balance.balance = recipient_balance.balance + amount;
        token_supply.circulating_supply = token_supply.circulating_supply + amount;
        token_supply.ecosystem_remaining = token_supply.ecosystem_remaining - amount;
        
        // Update timestamps
        common::update_timestamp(&mut recipient_balance.timestamp);
        common::update_timestamp(&mut token_supply.timestamp);
        
        // Record transaction
        record_transaction(@omeonechain, recipient, amount, 1, reference);
    }
    
    /// Mint tokens for team allocation
    public entry fun mint_team(
        admin: &signer,
        recipient: address,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get token supply
        let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
        
        // Check if amount is within remaining team allocation
        assert!(amount <= token_supply.team_remaining, error::invalid_state(E_EXCEEDS_SUPPLY_CAP));
        
        // Initialize recipient balance if it doesn't exist
        if (!exists<TokenBalance>(recipient)) {
            let recipient_signer = create_signer_for_testing(recipient); // Note: This is for testing only
            initialize_balance(&recipient_signer);
        };
        
        // Get recipient balance
        let recipient_balance = borrow_global_mut<TokenBalance>(recipient);
        
        // Update balances
        recipient_balance.balance = recipient_balance.balance + amount;
        token_supply.circulating_supply = token_supply.circulating_supply + amount;
        token_supply.team_remaining = token_supply.team_remaining - amount;
        
        // Update timestamps
        common::update_timestamp(&mut recipient_balance.timestamp);
        common::update_timestamp(&mut token_supply.timestamp);
        
        // Record transaction
        record_transaction(@omeonechain, recipient, amount, 1, reference);
    }
    
    /// Issue recommendation reward
    public entry fun issue_recommendation_reward(
        admin: &signer,
        author: address,
        recommendation_id: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry, RewardClaimRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(E_NOT_AUTHORIZED));
        
        // Get token supply and reward claim registry
        let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
        let reward_registry = borrow_global_mut<RewardClaimRegistry>(@omeonechain);
        
        // Check if recommendation already claimed
        assert!(!vector::contains(&reward_registry.claimed_recommendations, &recommendation_id), 
                error::invalid_state(E_REWARD_ALREADY_CLAIMED));
        
        // Calculate reward multiplier
        let multiplier = recommendation::calculate_reward_multiplier(recommendation_id);
        
        // Ensure recommendation meets threshold
        assert!(multiplier > 0, error::invalid_state(E_BELOW_REWARD_THRESHOLD));
        
        // Calculate base reward (1 token) adjusted by emission rate
        let base_reward = 100000000; // 1 token with 8 decimals
        let adjusted_reward = base_reward * token_supply.emission_rate / 100;
        
        // Apply multiplier
        let reward_amount = adjusted_reward * multiplier;
        
        // Ensure we have enough rewards remaining
        assert!(reward_amount <= token_supply.rewards_remaining, error::invalid_state(E_EXCEEDS_SUPPLY_CAP));
        
        // Initialize author balance if it doesn't exist
        if (!exists<TokenBalance>(author)) {
            let author_signer = create_signer_for_testing(author); // Note: This is for testing only
            initialize_balance(&author_signer);
        };
        
        // Get author balance
        let author_balance = borrow_global_mut<TokenBalance>(author);
        
        // Update balances
        author_balance.balance = author_balance.balance + reward_amount;
        token_supply.circulating_supply = token_supply.circulating_supply + reward_amount;
        token_supply.rewards_remaining = token_supply.rewards_remaining - reward_amount;
        
        // Update timestamps
        common::update_timestamp(&mut author_balance.timestamp);
        common::update_timestamp(&mut token_supply.timestamp);
        
        // Record claim
        vector::push_back(&mut reward_registry.claimed_recommendations, recommendation_id);
        
        // Record transaction
        record_transaction(@omeonechain, author, reward_amount, 1, recommendation_id);
        
        // Mark recommendation reward as claimed
        recommendation::mark_reward_claimed(admin, recommendation_id);
        
        // Check if halving threshold reached
        check_halving_threshold(token_supply);
    }
    
    /// Burn tokens for fee or other purposes
    public entry fun burn(
        sender: &signer,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry {
        let sender_addr = signer::address_of(sender);
        
        // Ensure sender has balance resource
        assert!(exists<TokenBalance>(sender_addr), error::not_found(0));
        
        // Get balances
        let sender_balance = borrow_global_mut<TokenBalance>(sender_addr);
        let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
        
        // Check if sender has sufficient balance
        assert!(sender_balance.balance >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        // Update balances
        sender_balance.balance = sender_balance.balance - amount;
        token_supply.circulating_supply = token_supply.circulating_supply - amount;
        token_supply.total_burned = token_supply.total_burned + amount;
        
        // Update timestamps
        common::update_timestamp(&mut sender_balance.timestamp);
        common::update_timestamp(&mut token_supply.timestamp);
        
        // Record transaction
        record_transaction(sender_addr, @0x0, amount, 4, reference); // Burn address is 0x0
    }
    
    /// Process a fee payment with partial burn
    public entry fun process_fee(
        sender: &signer,
        amount: u64,
        reference: String
    ) acquires TokenBalance, TokenSupply, TransactionRegistry {
        let sender_addr = signer::address_of(sender);
        
        // Ensure sender has balance resource
        assert!(exists<TokenBalance>(sender_addr), error::not_found(0));
        
        // Get sender balance
        let sender_balance = borrow_global_mut<TokenBalance>(sender_addr);
        
        // Check if sender has sufficient balance
        assert!(sender_balance.balance >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        // Calculate burn amount and treasury amount
        let burn_amount = amount * FEE_BURN_PERCENTAGE / 100;
        let treasury_amount = amount - burn_amount;
        
        // Update sender balance
        sender_balance.balance = sender_balance.balance - amount;
        common::update_timestamp(&mut sender_balance.timestamp);
        
        // Process burn
        if (burn_amount > 0) {
            let token_supply = borrow_global_mut<TokenSupply>(@omeonechain);
            token_supply.circulating_supply = token_supply.circulating_supply - burn_amount;
            token_supply.total_burned = token_supply.total_burned + burn_amount;
            common::update_timestamp(&mut token_supply.timestamp);
            
            // Record burn transaction
            record_transaction(sender_addr, @0x0, burn_amount, 4, reference);
        };
        
        // Process treasury allocation
        if (treasury_amount > 0) {
            // Ensure treasury has a balance
            if (!exists<TokenBalance>(@omeonechain)) {
                let treasury_signer = create_signer_for_testing(@omeonechain); // Note: This is for testing only
                initialize_balance(&treasury_signer);
            };
            
            // Update treasury balance
            let treasury_balance = borrow_global_mut<TokenBalance>(@omeonechain);
            treasury_balance.balance = treasury_balance.balance + treasury_amount;
            common::update_timestamp(&mut treasury_balance.timestamp);
            
            // Record fee transaction
            record_transaction(sender_addr, @omeonechain, treasury_amount, 3, reference);
        };
    }
    
    /// Check if a halving threshold has been reached
    fun check_halving_threshold(token_supply: &mut TokenSupply) {
        let total_distributed = REWARDS_ALLOCATION - token_supply.rewards_remaining +
                               DEVELOPMENT_ALLOCATION - token_supply.development_remaining +
                               ECOSYSTEM_ALLOCATION - token_supply.ecosystem_remaining +
                               TEAM_ALLOCATION - token_supply.team_remaining;
        
        let next_threshold = (token_supply.halving_index + 1) * HALVING_THRESHOLD_1;
        
        // Check if we've crossed the next threshold
        if (total_distributed >= next_threshold) {
            // Apply halving
            token_supply.halving_index = token_supply.halving_index + 1;
            token_supply.emission_rate = token_supply.emission_rate / 2;
        };
    }
    
    /// Record a transaction
    fun record_transaction(
        sender: address,
        recipient: address,
        amount: u64,
        transaction_type: u8,
        reference: String
    ) acquires TransactionRegistry {
        let registry = borrow_global_mut<TransactionRegistry>(@omeonechain);
        
        // Create transaction record
        let transaction = Transaction {
            id: registry.transaction_count,
            sender,
            recipient,
            amount,
            transaction_type,
            reference,
            timestamp: common::current_timestamp(),
        };
        
        // Add to registry
        vector::push_back(&mut registry.transactions, transaction);
        registry.transaction_count = registry.transaction_count + 1;
    }
    
    /// Get token balance for a user (public view)
    public fun get_balance(user: address): u64 acquires TokenBalance {
        if (!exists<TokenBalance>(user)) {
            return 0
        };
        
        let balance = borrow_global<TokenBalance>(user);
        balance.balance
    }
    
    /// Get token supply information (public view)
    public fun get_token_supply(): (u64, u64, u64, u64) acquires TokenSupply {
        let supply = borrow_global<TokenSupply>(@omeonechain);
        (
            supply.total_supply,
            supply.circulating_supply,
            supply.total_burned,
            supply.emission_rate
        )
    }
    
    /// Get current emission rate (public view)
    public fun get_emission_rate(): u64 acquires TokenSupply {
        let supply = borrow_global<TokenSupply>(@omeonechain);
        supply.emission_rate
    }
    
    /// Get halving index (public view)
    public fun get_halving_index(): u64 acquires TokenSupply {
        let supply = borrow_global<TokenSupply>(@omeonechain);
        supply.halving_index
    }
    
    /// Create a signer for testing purposes only
    #[test_only]
    public fun create_signer_for_testing(addr: address): signer {
        // In a real implementation, this would not be possible
        // This is only for testing
        @0x1
    }
    
    #[test_only]
    public fun setup_test(ctx: &signer) {
        // Initialize token module
        initialize(ctx);
    }
    
    #[test]
    public fun test_initialize() acquires TokenSupply {
        use std::unit_test;
        
        // Create test account
        let scenario = unit_test::begin(@0x1);
        let admin = unit_test::get_signer_for(@0x42);
        
        // Initialize module
        setup_test(&admin);
        
        // Verify token supply was initialized
        let token_supply = borrow_global<TokenSupply>(@omeonechain);
        assert!(token_supply.total_supply == TOTAL_SUPPLY_CAP, 0);
        assert!(token_supply.rewards_remaining == REWARDS_ALLOCATION, 0);
        assert!(token_supply.development_remaining == DEVELOPMENT_ALLOCATION, 0);
        assert!(token_supply.ecosystem_remaining == ECOSYSTEM_ALLOCATION, 0);
        assert!(token_supply.team_remaining == TEAM_ALLOCATION, 0);
        assert!(token_supply.emission_rate == BASE_EMISSION_RATE, 0);
        
        unit_test::end(scenario);
    }
    
    #[test]
    public fun test_mint_transfer() acquires TokenBalance, TokenSupply, TransactionRegistry {
        use std::unit_test;
        
        // Create test accounts
        let scenario = unit_test::begin(@0x1);
        let admin = unit_test::get_signer_for(@0x42);
        let user1 = unit_test::get_signer_for(@0x100);
        let user2 = unit_test::get_signer_for(@0x101);
        
        // Initialize module
        setup_test(&admin);
        
        // Initialize user balances
        initialize_balance(&user1);
        initialize_balance(&user2);
        
        // Mint tokens for user1
        mint_development(&admin, @0x100, 1000000000, string::utf8(b"test"));
        
        // Verify balance
        let balance1 = get_balance(@0x100);
        assert!(balance1 == 1000000000, 0);
        
        // Transfer tokens
        transfer(&user1, @0x101, 500000000, string::utf8(b"test_transfer"));
        
        // Verify balances
        let new_balance1 = get_balance(@0x100);
        let balance2 = get_balance(@0x101);
        assert!(new_balance1 == 500000000, 0);
        assert!(balance2 == 500000000, 0);
        
        unit_test::end(scenario);
    }
}
