/// BocaBoca Common Module v1.0
/// Shared types, constants, and utility functions
/// 
/// CRITICAL FIX FROM v0.8:
/// - Changed ALL sui:: imports to iota:: for IOTA Rebased compatibility
/// - sui::object → iota::object
/// - sui::tx_context → iota::tx_context
/// - sui::transfer → iota::transfer
/// - sui::coin → iota::coin

module common::common {
    // ============================================
    // IOTA IMPORTS (NOT sui::)
    // ============================================
    
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::clock::{Self, Clock};

    // ============================================
    // CONSTANTS
    // ============================================

    /// Token decimals (6 decimals = 1,000,000 base units per BOCA)
    const DECIMALS: u64 = 1_000_000;

    /// Tier constants
    const TIER_NEW: u8 = 1;
    const TIER_ESTABLISHED: u8 = 2;
    const TIER_TRUSTED: u8 = 3;

    /// Tier weights (basis points: 10000 = 1.0x)
    const WEIGHT_NEW: u64 = 5000;          // 0.5x
    const WEIGHT_ESTABLISHED: u64 = 10000; // 1.0x
    const WEIGHT_TRUSTED: u64 = 15000;     // 1.5x

    /// Time constants (milliseconds)
    const MS_PER_SECOND: u64 = 1000;
    const MS_PER_MINUTE: u64 = 60_000;
    const MS_PER_HOUR: u64 = 3_600_000;
    const MS_PER_DAY: u64 = 86_400_000;
    const MS_PER_WEEK: u64 = 604_800_000;

    /// Escrow periods
    const ESCROW_7_DAYS: u64 = 604_800_000;      // 7 days in ms
    const ESCROW_6_MONTHS: u64 = 15_552_000_000; // ~180 days in ms

    /// Validation threshold (3.0 engagement points with 6 decimals)
    const VALIDATION_THRESHOLD: u64 = 3_000_000;

    // ============================================
    // ERRORS (shared across modules)
    // ============================================

    const E_NOT_AUTHORIZED: u64 = 100;
    const E_INVALID_AMOUNT: u64 = 101;
    const E_INSUFFICIENT_BALANCE: u64 = 102;
    const E_ALREADY_EXISTS: u64 = 103;
    const E_NOT_FOUND: u64 = 104;
    const E_EXPIRED: u64 = 105;
    const E_NOT_READY: u64 = 106;
    const E_INVALID_STATE: u64 = 107;
    const E_RATE_LIMITED: u64 = 108;
    const E_SPAM_FLAGGED: u64 = 109;

    // ============================================
    // STRUCTS
    // ============================================

    /// Global configuration (shared object)
    struct GlobalConfig has key {
        id: UID,
        /// Protocol version
        version: u64,
        /// Is protocol paused
        is_paused: bool,
        /// Admin address
        admin: address,
        /// Treasury address
        treasury: address,
        /// Protocol fee rate (basis points)
        fee_rate: u64,
        /// Last updated timestamp
        updated_at: u64,
    }

    /// Protocol admin capability
    struct ProtocolAdminCap has key, store {
        id: UID,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        let admin_cap = ProtocolAdminCap {
            id: object::new(ctx),
        };

        let config = GlobalConfig {
            id: object::new(ctx),
            version: 1,
            is_paused: false,
            admin: sender,
            treasury: sender,
            fee_rate: 1000, // 10% default
            updated_at: 0,
        };

        transfer::transfer(admin_cap, sender);
        transfer::share_object(config);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Update protocol configuration
    public entry fun update_config(
        _admin: &ProtocolAdminCap,
        config: &mut GlobalConfig,
        new_treasury: address,
        new_fee_rate: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        config.treasury = new_treasury;
        config.fee_rate = new_fee_rate;
        config.updated_at = clock::timestamp_ms(clock);
    }

    /// Pause/unpause protocol
    public entry fun set_paused(
        _admin: &ProtocolAdminCap,
        config: &mut GlobalConfig,
        paused: bool,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        config.is_paused = paused;
        config.updated_at = clock::timestamp_ms(clock);
    }

    /// Transfer admin to new address
    public entry fun transfer_admin(
        admin_cap: ProtocolAdminCap,
        new_admin: address,
        _ctx: &mut TxContext
    ) {
        transfer::transfer(admin_cap, new_admin);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /// Get tier weight for engagement calculations
    public fun get_tier_weight(tier: u8): u64 {
        if (tier == TIER_TRUSTED) {
            WEIGHT_TRUSTED
        } else if (tier == TIER_ESTABLISHED) {
            WEIGHT_ESTABLISHED
        } else {
            WEIGHT_NEW
        }
    }

    /// Apply tier weight to an amount (returns weighted amount)
    public fun apply_tier_weight(amount: u64, tier: u8): u64 {
        let weight = get_tier_weight(tier);
        (amount * weight) / 10000
    }

    /// Convert BOCA to base units
    public fun to_base_units(boca_amount: u64): u64 {
        boca_amount * DECIMALS
    }

    /// Convert base units to BOCA (integer division)
    public fun from_base_units(base_units: u64): u64 {
        base_units / DECIMALS
    }

    /// Calculate percentage (basis points)
    public fun calculate_percentage(amount: u64, basis_points: u64): u64 {
        (amount * basis_points) / 10000
    }

    /// Check if timestamp has expired
    public fun is_expired(deadline: u64, clock: &Clock): bool {
        clock::timestamp_ms(clock) >= deadline
    }

    /// Get current timestamp
    public fun now(clock: &Clock): u64 {
        clock::timestamp_ms(clock)
    }

    /// Calculate days since timestamp
    public fun days_since(timestamp: u64, clock: &Clock): u64 {
        let now = clock::timestamp_ms(clock);
        if (now <= timestamp) {
            0
        } else {
            (now - timestamp) / MS_PER_DAY
        }
    }

    /// Integer square root (for lottery ticket calculation)
    public fun integer_sqrt(n: u64): u64 {
        if (n == 0) return 0;
        if (n == 1) return 1;
        
        let x = n;
        let y = (x + 1) / 2;
        
        while (y < x) {
            x = y;
            y = (x + n / x) / 2;
        };
        
        x
    }

    /// Minimum of two u64 values
    public fun min_u64(a: u64, b: u64): u64 {
        if (a < b) { a } else { b }
    }

    /// Maximum of two u64 values
    public fun max_u64(a: u64, b: u64): u64 {
        if (a > b) { a } else { b }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /// Get protocol version
    public fun get_version(config: &GlobalConfig): u64 {
        config.version
    }

    /// Check if protocol is paused
    public fun is_paused(config: &GlobalConfig): bool {
        config.is_paused
    }

    /// Get treasury address
    public fun get_treasury(config: &GlobalConfig): address {
        config.treasury
    }

    /// Get fee rate (basis points)
    public fun get_fee_rate(config: &GlobalConfig): u64 {
        config.fee_rate
    }

    /// Get constants (for frontend)
    public fun get_decimals(): u64 { DECIMALS }
    public fun get_tier_new(): u8 { TIER_NEW }
    public fun get_tier_established(): u8 { TIER_ESTABLISHED }
    public fun get_tier_trusted(): u8 { TIER_TRUSTED }
    public fun get_weight_new(): u64 { WEIGHT_NEW }
    public fun get_weight_established(): u64 { WEIGHT_ESTABLISHED }
    public fun get_weight_trusted(): u64 { WEIGHT_TRUSTED }
    public fun get_ms_per_day(): u64 { MS_PER_DAY }
    public fun get_escrow_7_days(): u64 { ESCROW_7_DAYS }
    public fun get_escrow_6_months(): u64 { ESCROW_6_MONTHS }
    public fun get_validation_threshold(): u64 { VALIDATION_THRESHOLD }

    // ============================================
    // ERROR CONSTANTS (public for other modules)
    // ============================================

    public fun err_not_authorized(): u64 { E_NOT_AUTHORIZED }
    public fun err_invalid_amount(): u64 { E_INVALID_AMOUNT }
    public fun err_insufficient_balance(): u64 { E_INSUFFICIENT_BALANCE }
    public fun err_already_exists(): u64 { E_ALREADY_EXISTS }
    public fun err_not_found(): u64 { E_NOT_FOUND }
    public fun err_expired(): u64 { E_EXPIRED }
    public fun err_not_ready(): u64 { E_NOT_READY }
    public fun err_invalid_state(): u64 { E_INVALID_STATE }
    public fun err_rate_limited(): u64 { E_RATE_LIMITED }
    public fun err_spam_flagged(): u64 { E_SPAM_FLAGGED }

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }
}
