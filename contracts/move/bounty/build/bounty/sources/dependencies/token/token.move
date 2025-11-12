module bocaboca::token {
    use std::string::String;
    use std::option;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::clock::{Self, Clock};
    use iota::balance::{Self, Balance};
    use iota::event;

    /// The one-time witness type - MUST match module name in uppercase
    public struct TOKEN has drop {}

    /// Token registry for tracking supply, allocations, and metrics
    public struct TokenRegistry has key {
        id: UID,
        
        // Supply tracking
        total_supply: u64,
        circulating_supply: u64,
        
        // Allocation pools (in base units with 6 decimals)
        community_pool: u64,           // 40% - 4,000,000,000.000000 BOCA
        community_distributed: u64,
        
        team_pool: u64,                // 25% - 2,500,000,000.000000 BOCA
        team_distributed: u64,
        team_vesting_start: u64,       // Timestamp when vesting begins
        
        ecosystem_pool: u64,           // 15% - 1,500,000,000.000000 BOCA
        ecosystem_distributed: u64,
        
        marketing_pool: u64,           // 10% - 1,000,000,000.000000 BOCA
        marketing_distributed: u64,
        
        treasury_pool: u64,            // 10% - 1,000,000,000.000000 BOCA
        treasury_distributed: u64,
        
        // Emission tracking
        current_emission_rate: u64,    // Daily emission rate
        last_emission_update: u64,     // Last time emission was updated
        emission_epoch: u8,            // Current emission epoch (0-4)
        
        // Metadata
        created_at: u64,
        last_updated: u64,
    }

    /// Vesting schedule for team tokens
    public struct VestingSchedule has key {
        id: UID,
        beneficiary: address,
        total_amount: u64,
        amount_claimed: u64,
        start_time: u64,
        cliff_duration: u64,           // 1 year cliff
        vesting_duration: u64,         // 4 year total vesting
        last_claim_time: u64,
    }

    /// Allocation withdrawal event
    public struct AllocationWithdrawn has copy, drop {
        pool_name: String,
        amount: u64,
        recipient: address,
        timestamp: u64,
    }

    /// Emission updated event
    public struct EmissionUpdated has copy, drop {
        old_rate: u64,
        new_rate: u64,
        epoch: u8,
        timestamp: u64,
    }

    /// Vesting claimed event
    public struct VestingClaimed has copy, drop {
        beneficiary: address,
        amount: u64,
        timestamp: u64,
    }

    /// Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 302;
    const E_INVALID_AMOUNT: u64 = 304;
    const E_INSUFFICIENT_ALLOCATION: u64 = 305;
    const E_VESTING_NOT_STARTED: u64 = 306;
    const E_CLIFF_NOT_REACHED: u64 = 307;
    const E_NO_VESTED_TOKENS: u64 = 308;
    const E_INVALID_EPOCH: u64 = 309;
    const E_NOT_AUTHORIZED: u64 = 310;

    /// Constants - All values in base units (6 decimals)
    /// 1 BOCA = 1,000,000 base units
    
    // Total supply: 10 billion BOCA
    const TOTAL_SUPPLY: u64 = 10_000_000_000_000_000; // 10B with 6 decimals
    
    // Allocation amounts (40% + 25% + 15% + 10% + 10% = 100%)
    const COMMUNITY_ALLOCATION: u64 = 4_000_000_000_000_000;  // 4B BOCA (40%)
    const TEAM_ALLOCATION: u64 = 2_500_000_000_000_000;       // 2.5B BOCA (25%)
    const ECOSYSTEM_ALLOCATION: u64 = 1_500_000_000_000_000;  // 1.5B BOCA (15%)
    const MARKETING_ALLOCATION: u64 = 1_000_000_000_000_000;  // 1B BOCA (10%)
    const TREASURY_ALLOCATION: u64 = 1_000_000_000_000_000;   // 1B BOCA (10%)
    
    // Initial emission rate: ~4.71M BOCA per year / 365 days = ~12,904 BOCA per day
    const INITIAL_EMISSION_RATE: u64 = 12_904_000_000; // 12,904 BOCA per day with 6 decimals
    
    // Emission epochs (halving every 4 years)
    const EPOCH_DURATION: u64 = 126_144_000_000; // 4 years in milliseconds (365.25 * 4 * 24 * 60 * 60 * 1000)
    const MAX_EMISSION_EPOCH: u8 = 4; // 5 total epochs (0-4)
    
    // Vesting parameters for team tokens
    const VESTING_CLIFF: u64 = 31_536_000_000; // 1 year in milliseconds
    const VESTING_DURATION: u64 = 126_144_000_000; // 4 years in milliseconds
    
    /// Initialize the token
    fun init(witness: TOKEN, ctx: &mut TxContext) {
        // Create the BOCA currency with 6 decimals
        let (treasury_cap, metadata) = coin::create_currency<TOKEN>(
            witness,
            6, // 6 decimals for BOCA
            b"BOCA",
            b"BocaBoca Token",
            b"The native token of the BocaBoca dining recommendation network",
            option::none(),
            ctx
        );

        // Create token registry with allocation pools
        let registry = TokenRegistry {
            id: object::new(ctx),
            
            total_supply: TOTAL_SUPPLY,
            circulating_supply: 0,
            
            community_pool: COMMUNITY_ALLOCATION,
            community_distributed: 0,
            
            team_pool: TEAM_ALLOCATION,
            team_distributed: 0,
            team_vesting_start: 0, // Set when vesting begins
            
            ecosystem_pool: ECOSYSTEM_ALLOCATION,
            ecosystem_distributed: 0,
            
            marketing_pool: MARKETING_ALLOCATION,
            marketing_distributed: 0,
            
            treasury_pool: TREASURY_ALLOCATION,
            treasury_distributed: 0,
            
            current_emission_rate: INITIAL_EMISSION_RATE,
            last_emission_update: 0, // Will be set on first update
            emission_epoch: 0,
            
            created_at: 0, // Would use clock in production
            last_updated: 0,
        };

        // Transfer the treasury cap to sender (should be multi-sig in production)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        
        // Freeze metadata (makes it immutable)
        transfer::public_freeze_object(metadata);
        
        // Share registry (makes it accessible to all)
        transfer::share_object(registry);
    }

    /// Mint tokens from a specific allocation pool
    /// This is the primary minting function for controlled distribution
    public fun mint_from_allocation(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        registry: &mut TokenRegistry,
        pool_name: String,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        use std::string;
        
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let now = clock::timestamp_ms(clock);
        
        // Check which pool and validate allocation
        let pool_name_bytes = string::bytes(&pool_name);
        
        if (pool_name_bytes == b"community") {
            assert!(registry.community_distributed + amount <= registry.community_pool, 
                    E_INSUFFICIENT_ALLOCATION);
            registry.community_distributed = registry.community_distributed + amount;
        } else if (pool_name_bytes == b"ecosystem") {
            assert!(registry.ecosystem_distributed + amount <= registry.ecosystem_pool, 
                    E_INSUFFICIENT_ALLOCATION);
            registry.ecosystem_distributed = registry.ecosystem_distributed + amount;
        } else if (pool_name_bytes == b"marketing") {
            assert!(registry.marketing_distributed + amount <= registry.marketing_pool, 
                    E_INSUFFICIENT_ALLOCATION);
            registry.marketing_distributed = registry.marketing_distributed + amount;
        } else if (pool_name_bytes == b"treasury") {
            assert!(registry.treasury_distributed + amount <= registry.treasury_pool, 
                    E_INSUFFICIENT_ALLOCATION);
            registry.treasury_distributed = registry.treasury_distributed + amount;
        } else {
            // Invalid pool name
            abort E_INVALID_AMOUNT
        };
        
        // Update circulating supply
        registry.circulating_supply = registry.circulating_supply + amount;
        registry.last_updated = now;
        
        // Emit event
        event::emit(AllocationWithdrawn {
            pool_name,
            amount,
            recipient: tx_context::sender(ctx),
            timestamp: now,
        });
        
        // Mint the tokens
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Simple mint wrapper for lottery, photo contest, and other direct minting
    /// This is a convenience function that wraps coin::mint for cleaner calling
    public fun mint(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Create vesting schedule for team member
    public fun create_vesting_schedule(
        beneficiary: address,
        amount: u64,
        registry: &mut TokenRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ): VestingSchedule {
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(registry.team_distributed + amount <= registry.team_pool, 
                E_INSUFFICIENT_ALLOCATION);
        
        let now = clock::timestamp_ms(clock);
        
        // Set vesting start time if not already set
        if (registry.team_vesting_start == 0) {
            registry.team_vesting_start = now;
        };
        
        // Update team distributed amount
        registry.team_distributed = registry.team_distributed + amount;
        registry.last_updated = now;
        
        VestingSchedule {
            id: object::new(ctx),
            beneficiary,
            total_amount: amount,
            amount_claimed: 0,
            start_time: registry.team_vesting_start,
            cliff_duration: VESTING_CLIFF,
            vesting_duration: VESTING_DURATION,
            last_claim_time: 0,
        }
    }

    /// Claim vested tokens from vesting schedule
    public fun claim_vested_tokens(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        vesting: &mut VestingSchedule,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let now = clock::timestamp_ms(clock);
        let claimer = tx_context::sender(ctx);
        
        // Verify claimer is beneficiary
        assert!(claimer == vesting.beneficiary, E_NOT_AUTHORIZED);
        
        // Check if vesting has started
        assert!(now >= vesting.start_time, E_VESTING_NOT_STARTED);
        
        // Check if cliff period has passed
        assert!(now >= vesting.start_time + vesting.cliff_duration, E_CLIFF_NOT_REACHED);
        
        // Calculate vested amount
        let vested_amount = calculate_vested_amount(vesting, now);
        let claimable = vested_amount - vesting.amount_claimed;
        
        assert!(claimable > 0, E_NO_VESTED_TOKENS);
        
        // Update vesting schedule
        vesting.amount_claimed = vesting.amount_claimed + claimable;
        vesting.last_claim_time = now;
        
        // Emit event
        event::emit(VestingClaimed {
            beneficiary: claimer,
            amount: claimable,
            timestamp: now,
        });
        
        // Mint and return tokens
        coin::mint(treasury_cap, claimable, ctx)
    }

    /// Calculate vested amount based on time elapsed
    fun calculate_vested_amount(vesting: &VestingSchedule, current_time: u64): u64 {
        if (current_time < vesting.start_time + vesting.cliff_duration) {
            return 0
        };
        
        if (current_time >= vesting.start_time + vesting.vesting_duration) {
            return vesting.total_amount
        };
        
        let elapsed = current_time - vesting.start_time;
        (vesting.total_amount * elapsed) / vesting.vesting_duration
    }

    /// Update emission rate based on time-based halving (every 4 years)
    public fun update_emission_rate(
        registry: &mut TokenRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        
        // Initialize last_emission_update if this is first call
        if (registry.last_emission_update == 0) {
            registry.last_emission_update = now;
            return
        };
        
        let time_elapsed = now - registry.last_emission_update;
        
        // Check if we've passed an epoch boundary
        if (time_elapsed >= EPOCH_DURATION && registry.emission_epoch < MAX_EMISSION_EPOCH) {
            let old_rate = registry.current_emission_rate;
            
            // Halve the emission rate
            registry.current_emission_rate = registry.current_emission_rate / 2;
            registry.emission_epoch = registry.emission_epoch + 1;
            registry.last_emission_update = now;
            registry.last_updated = now;
            
            // Emit event
            event::emit(EmissionUpdated {
                old_rate,
                new_rate: registry.current_emission_rate,
                epoch: registry.emission_epoch,
                timestamp: now,
            });
        };
    }

    /// Get current daily emission rate
    public fun get_daily_emission_rate(registry: &TokenRegistry): u64 {
        registry.current_emission_rate
    }

    /// Get available allocation for a specific pool
    public fun get_available_allocation(registry: &TokenRegistry, pool_name: String): u64 {
        use std::string;
        
        let pool_name_bytes = string::bytes(&pool_name);
        
        if (pool_name_bytes == b"community") {
            registry.community_pool - registry.community_distributed
        } else if (pool_name_bytes == b"team") {
            registry.team_pool - registry.team_distributed
        } else if (pool_name_bytes == b"ecosystem") {
            registry.ecosystem_pool - registry.ecosystem_distributed
        } else if (pool_name_bytes == b"marketing") {
            registry.marketing_pool - registry.marketing_distributed
        } else if (pool_name_bytes == b"treasury") {
            registry.treasury_pool - registry.treasury_distributed
        } else {
            0
        }
    }

    /// Burn tokens (reduce circulating supply)
    public fun burn(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        registry: &mut TokenRegistry,
        coin: Coin<TOKEN>,
        clock: &Clock,
    ): u64 {
        let amount = coin::value(&coin);
        let burned = coin::burn(treasury_cap, coin);
        
        // Update circulating supply
        if (registry.circulating_supply >= amount) {
            registry.circulating_supply = registry.circulating_supply - amount;
        } else {
            registry.circulating_supply = 0;
        };
        
        registry.last_updated = clock::timestamp_ms(clock);
        
        burned
    }

    /// Transfer tokens
    public fun transfer_tokens(
        coin: Coin<TOKEN>,
        recipient: address,
        _description: String,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(coin, recipient);
    }

    /// Split coin
    public fun split_coin(
        coin: &mut Coin<TOKEN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        assert!(coin::value(coin) >= amount, E_INSUFFICIENT_BALANCE);
        coin::split(coin, amount, ctx)
    }

    /// Join coins
    public fun join_coins(
        coin1: &mut Coin<TOKEN>,
        coin2: Coin<TOKEN>
    ) {
        coin::join(coin1, coin2);
    }

    /// Get token balance
    public fun get_balance(coin: &Coin<TOKEN>): u64 {
        coin::value(coin)
    }

    /// Get registry info - basic supply data
    public fun get_registry_info(registry: &TokenRegistry): (u64, u64, u64, u8) {
        (
            registry.total_supply,
            registry.circulating_supply,
            registry.current_emission_rate,
            registry.emission_epoch
        )
    }

    /// Get allocation info - all pool balances
    public fun get_allocation_info(registry: &TokenRegistry): (u64, u64, u64, u64, u64, u64) {
        (
            registry.community_pool - registry.community_distributed,
            registry.team_pool - registry.team_distributed,
            registry.ecosystem_pool - registry.ecosystem_distributed,
            registry.marketing_pool - registry.marketing_distributed,
            registry.treasury_pool - registry.treasury_distributed,
            registry.circulating_supply
        )
    }

    /// Get vesting info
    public fun get_vesting_info(vesting: &VestingSchedule, clock: &Clock): (u64, u64, u64, bool) {
        let now = clock::timestamp_ms(clock);
        let vested = calculate_vested_amount(vesting, now);
        let claimable = if (vested > vesting.amount_claimed) {
            vested - vesting.amount_claimed
        } else {
            0
        };
        let cliff_passed = now >= vesting.start_time + vesting.cliff_duration;
        
        (
            vesting.total_amount,
            vesting.amount_claimed,
            claimable,
            cliff_passed
        )
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(TOKEN {}, ctx);
    }
}
