module escrow::escrow {
    use std::string::String;
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use bocaboca::token::TOKEN;
    use user_status::user_status;

    /// One-time witness for initialization
    public struct ESCROW has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 401;
    const E_ESCROW_NOT_FOUND: u64 = 402;
    const E_ESCROW_STILL_LOCKED: u64 = 403;
    const E_ALREADY_RELEASED: u64 = 404;
    const E_ALREADY_FORFEITED: u64 = 405;
    const E_NOT_NEW_TIER: u64 = 406;
    const E_INSUFFICIENT_BALANCE: u64 = 407;
    const E_INVALID_AMOUNT: u64 = 408;

    /// Constants
    const ESCROW_DURATION_MS: u64 = 604_800_000;  // 7 days in milliseconds
    const REPORTER_SHARE_PERCENTAGE: u64 = 1000;  // 10% (scaled by 100)
    const BURN_SHARE_PERCENTAGE: u64 = 9000;      // 90% (scaled by 100)

    /// Escrow status
    const STATUS_ACTIVE: u8 = 1;      // Currently held in escrow
    const STATUS_RELEASED: u8 = 2;    // Released to user (clean)
    const STATUS_FORFEITED: u8 = 3;   // Forfeited due to spam

    /// Individual escrow holding
    public struct EscrowHold has key, store {
        id: UID,
        user: address,
        amount: Balance<TOKEN>,
        
        // Reference to what this escrow is for
        recommendation_id: String,     // Which recommendation earned this
        reward_type: u8,                // Type of reward (creation, engagement, etc.)
        
        // Timing
        created_at: u64,
        release_time: u64,              // When it can be released (created_at + 7 days)
        
        // Status tracking
        status: u8,                     // Active/Released/Forfeited
        released_at: u64,               // Timestamp of release (0 if not released)
        forfeited_at: u64,              // Timestamp of forfeiture (0 if not forfeited)
        
        // Spam tracking
        spam_reporter: address,         // Who reported spam (if forfeited)
    }

    /// User's escrow registry (tracks all holds for a user)
    public struct UserEscrowRegistry has key, store {
        id: UID,
        user: address,
        active_holds: vector<ID>,      // UIDs of active escrow holds
        total_escrowed: u64,            // Total amount currently in escrow
        total_released: u64,            // Lifetime total released
        total_forfeited: u64,           // Lifetime total forfeited
        hold_count: u64,                // Total number of holds created
    }

    /// Global escrow registry
    public struct GlobalEscrowRegistry has key {
        id: UID,
        total_active_escrows: u64,
        total_escrowed_amount: u64,
        total_released_amount: u64,
        total_forfeited_amount: u64,
        user_registries: Table<address, UserEscrowRegistry>,
        moderators: vector<address>,
        admin: address,
    }

    /// Events
    public struct EscrowCreated has copy, drop {
        user: address,
        amount: u64,
        recommendation_id: String,
        release_time: u64,
        timestamp: u64,
    }

    public struct EscrowReleased has copy, drop {
        user: address,
        amount: u64,
        recommendation_id: String,
        timestamp: u64,
    }

    public struct EscrowForfeited has copy, drop {
        user: address,
        amount: u64,
        recommendation_id: String,
        reporter: address,
        reporter_share: u64,
        burn_amount: u64,
        timestamp: u64,
    }

    /// Initialize the escrow system
    fun init(_witness: ESCROW, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalEscrowRegistry {
            id: object::new(ctx),
            total_active_escrows: 0,
            total_escrowed_amount: 0,
            total_released_amount: 0,
            total_forfeited_amount: 0,
            user_registries: table::new(ctx),
            moderators: vector::empty(),
            admin,
        };

        // Admin is automatically a moderator
        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Create escrow hold for a New tier user
    /// Takes user's UserStatus object to verify they require escrow
    public fun create_escrow_hold(
        registry: &mut GlobalEscrowRegistry,
        user_status: &user_status::UserStatus,
        user: address,
        reward_coin: Coin<TOKEN>,
        recommendation_id: String,
        reward_type: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let amount = coin::value(&reward_coin);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let now = clock::timestamp_ms(clock);
        let release_time = now + ESCROW_DURATION_MS;

        // Verify user requires escrow (New tier)
        assert!(user_status::requires_escrow(user_status), E_NOT_NEW_TIER);

        // Create escrow hold
        let escrow_hold = EscrowHold {
            id: object::new(ctx),
            user,
            amount: coin::into_balance(reward_coin),
            recommendation_id,
            reward_type,
            created_at: now,
            release_time,
            status: STATUS_ACTIVE,
            released_at: 0,
            forfeited_at: 0,
            spam_reporter: @0x0,
        };

        let escrow_uid = object::uid_to_inner(&escrow_hold.id);

        // Update or create user registry
        if (!table::contains(&registry.user_registries, user)) {
            let user_registry = UserEscrowRegistry {
                id: object::new(ctx),
                user,
                active_holds: vector::empty(),
                total_escrowed: 0,
                total_released: 0,
                total_forfeited: 0,
                hold_count: 0,
            };
            table::add(&mut registry.user_registries, user, user_registry);
        };

        let user_registry = table::borrow_mut(&mut registry.user_registries, user);
        vector::push_back(&mut user_registry.active_holds, escrow_uid);
        user_registry.total_escrowed = user_registry.total_escrowed + amount;
        user_registry.hold_count = user_registry.hold_count + 1;

        // Update global stats
        registry.total_active_escrows = registry.total_active_escrows + 1;
        registry.total_escrowed_amount = registry.total_escrowed_amount + amount;

        // Emit event
        event::emit(EscrowCreated {
            user,
            amount,
            recommendation_id,
            release_time,
            timestamp: now,
        });

        // Transfer escrow hold to user (they own it but can't access funds until released)
        transfer::transfer(escrow_hold, user);

        escrow_uid
    }

    /// Release escrow hold after 7 days
    /// Note: Spam check removed - rely on moderator forfeit mechanism instead
    public fun release_escrow(
        registry: &mut GlobalEscrowRegistry,
        escrow_hold: &mut EscrowHold,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify caller owns the escrow
        assert!(escrow_hold.user == caller, E_NOT_AUTHORIZED);

        // Check status
        assert!(escrow_hold.status == STATUS_ACTIVE, E_ALREADY_RELEASED);

        // Check if 7 days have passed
        assert!(now >= escrow_hold.release_time, E_ESCROW_STILL_LOCKED);

        // Get amount
        let amount = balance::value(&escrow_hold.amount);

        // Update escrow status
        escrow_hold.status = STATUS_RELEASED;
        escrow_hold.released_at = now;

        // Update user registry
        if (table::contains(&registry.user_registries, escrow_hold.user)) {
            let user_registry = table::borrow_mut(&mut registry.user_registries, escrow_hold.user);
            user_registry.total_escrowed = user_registry.total_escrowed - amount;
            user_registry.total_released = user_registry.total_released + amount;
            
            // Remove from active holds
            let escrow_uid = object::uid_to_inner(&escrow_hold.id);
            remove_from_active_holds(&mut user_registry.active_holds, &escrow_uid);
        };

        // Update global stats
        registry.total_active_escrows = registry.total_active_escrows - 1;
        registry.total_escrowed_amount = registry.total_escrowed_amount - amount;
        registry.total_released_amount = registry.total_released_amount + amount;

        // Emit event
        event::emit(EscrowReleased {
            user: escrow_hold.user,
            amount,
            recommendation_id: escrow_hold.recommendation_id,
            timestamp: now,
        });

        // Extract and return tokens
        let released_balance = balance::withdraw_all(&mut escrow_hold.amount);
        coin::from_balance(released_balance, ctx)
    }

    /// Forfeit escrow due to spam (moderator only)
    public fun forfeit_escrow(
        registry: &mut GlobalEscrowRegistry,
        escrow_hold: &mut EscrowHold,
        reporter: address,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<TOKEN>, Coin<TOKEN>) {
        let moderator = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify moderator
        assert!(is_moderator(registry, moderator), E_NOT_AUTHORIZED);

        // Check status
        assert!(escrow_hold.status == STATUS_ACTIVE, E_ALREADY_FORFEITED);

        // Get amount
        let total_amount = balance::value(&escrow_hold.amount);

        // Calculate shares
        let reporter_share = (total_amount * REPORTER_SHARE_PERCENTAGE) / 10000;
        let burn_amount = total_amount - reporter_share;

        // Update escrow status
        escrow_hold.status = STATUS_FORFEITED;
        escrow_hold.forfeited_at = now;
        escrow_hold.spam_reporter = reporter;

        // Update user registry
        if (table::contains(&registry.user_registries, escrow_hold.user)) {
            let user_registry = table::borrow_mut(&mut registry.user_registries, escrow_hold.user);
            user_registry.total_escrowed = user_registry.total_escrowed - total_amount;
            user_registry.total_forfeited = user_registry.total_forfeited + total_amount;
            
            // Remove from active holds
            let escrow_uid = object::uid_to_inner(&escrow_hold.id);
            remove_from_active_holds(&mut user_registry.active_holds, &escrow_uid);
        };

        // Update global stats
        registry.total_active_escrows = registry.total_active_escrows - 1;
        registry.total_escrowed_amount = registry.total_escrowed_amount - total_amount;
        registry.total_forfeited_amount = registry.total_forfeited_amount + total_amount;

        // Emit event
        event::emit(EscrowForfeited {
            user: escrow_hold.user,
            amount: total_amount,
            recommendation_id: escrow_hold.recommendation_id,
            reporter,
            reporter_share,
            burn_amount,
            timestamp: now,
        });

        // Split balance
        let total_balance = balance::withdraw_all(&mut escrow_hold.amount);
        let mut total_coin = coin::from_balance(total_balance, ctx);
        
        let reporter_coin = coin::split(&mut total_coin, reporter_share, ctx);
        let burn_coin = total_coin; // Remaining amount

        (reporter_coin, burn_coin)
    }

    /// Check if escrow can be released (time-based only)
    public fun can_release_escrow(
        escrow_hold: &EscrowHold,
        clock: &Clock,
    ): bool {
        let now = clock::timestamp_ms(clock);

        // Check basic conditions
        if (escrow_hold.status != STATUS_ACTIVE) {
            return false
        };

        now >= escrow_hold.release_time
    }

    /// Get user's active escrow amount
    public fun get_user_active_escrow(
        registry: &GlobalEscrowRegistry,
        user: address,
    ): u64 {
        if (!table::contains(&registry.user_registries, user)) {
            return 0
        };

        let user_registry = table::borrow(&registry.user_registries, user);
        user_registry.total_escrowed
    }

    /// Get user's escrow stats
    public fun get_user_escrow_stats(
        registry: &GlobalEscrowRegistry,
        user: address,
    ): (u64, u64, u64, u64) {
        if (!table::contains(&registry.user_registries, user)) {
            return (0, 0, 0, 0)
        };

        let user_registry = table::borrow(&registry.user_registries, user);
        (
            user_registry.total_escrowed,
            user_registry.total_released,
            user_registry.total_forfeited,
            user_registry.hold_count
        )
    }

    /// Get escrow hold info
    public fun get_escrow_info(escrow_hold: &EscrowHold): (
        address,   // user
        u64,       // amount
        String,    // recommendation_id
        u64,       // created_at
        u64,       // release_time
        u8,        // status
        bool       // is_released
    ) {
        (
            escrow_hold.user,
            balance::value(&escrow_hold.amount),
            escrow_hold.recommendation_id,
            escrow_hold.created_at,
            escrow_hold.release_time,
            escrow_hold.status,
            escrow_hold.status == STATUS_RELEASED
        )
    }

    /// Get global escrow stats
    public fun get_global_stats(registry: &GlobalEscrowRegistry): (u64, u64, u64, u64) {
        (
            registry.total_active_escrows,
            registry.total_escrowed_amount,
            registry.total_released_amount,
            registry.total_forfeited_amount
        )
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalEscrowRegistry,
        new_moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);

        if (!vector::contains(&registry.moderators, &new_moderator)) {
            vector::push_back(&mut registry.moderators, new_moderator);
        };
    }

    /// Check if address is a moderator
    fun is_moderator(registry: &GlobalEscrowRegistry, addr: address): bool {
        vector::contains(&registry.moderators, &addr) || addr == registry.admin
    }

    /// Helper: Remove UID from active holds vector
    fun remove_from_active_holds(active_holds: &mut vector<ID>, uid_to_remove: &ID) {
        let mut i = 0;
        let len = vector::length(active_holds);

        while (i < len) {
            let hold_uid = vector::borrow(active_holds, i);
            if (hold_uid == uid_to_remove) {
                let _ = vector::remove(active_holds, i);
                return
            };
            i = i + 1;
        };
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ESCROW {}, ctx);
    }
}
