module email_escrow::email_escrow {
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
    public struct EMAIL_ESCROW has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 501;
    const E_NOT_EMAIL_USER: u64 = 502;
    const E_ALREADY_WALLET_USER: u64 = 503;
    const E_NO_PENDING_TOKENS: u64 = 504;
    const E_ESCROW_NOT_EXPIRED: u64 = 505;
    const E_ESCROW_ALREADY_CLAIMED: u64 = 506;
    const E_ESCROW_ALREADY_EXPIRED: u64 = 507;
    const E_INVALID_AMOUNT: u64 = 508;

    /// Constants
    const ESCROW_DURATION_MS: u64 = 15_552_000_000;  // 6 months (180 days) in milliseconds
    const EXPIRATION_WARNING_MS: u64 = 2_592_000_000; // 30 days before expiration
    const MIN_PENDING_AMOUNT: u64 = 1_000;            // 0.001 BOCA minimum (6 decimals)

    /// Email user's pending token escrow
    public struct EmailEscrowHold has key, store {
        id: UID,
        user: address,
        pending_balance: Balance<TOKEN>,      // Accumulated tokens
        
        // Timing
        created_at: u64,                      // When first tokens were escrowed
        expiration_time: u64,                 // created_at + 6 months
        last_deposit: u64,                    // Last time tokens were added
        
        // Status tracking
        total_deposited: u64,                 // Lifetime deposits
        claimed_on_upgrade: bool,             // True if claimed via wallet upgrade
        expired: bool,                        // True if 6 months passed without upgrade
        claimed_at: u64,                      // When claimed (0 if not claimed)
        expired_at: u64,                      // When expired (0 if not expired)
    }

    /// Global email escrow registry
    public struct GlobalEmailEscrowRegistry has key {
        id: UID,
        
        // Statistics
        total_email_escrows: u64,
        total_pending_amount: u64,            // Total BOCA currently in escrow
        total_claimed_amount: u64,            // Total BOCA claimed on upgrade
        total_expired_amount: u64,            // Total BOCA expired (returned to treasury)
        total_upgrades: u64,                  // Number of successful upgrades
        
        // User escrow tracking
        user_escrows: Table<address, EmailEscrowHold>,
        
        // Admin
        moderators: vector<address>,
        admin: address,
        treasury: address,                    // Where expired tokens go
    }

    /// Events
    public struct EmailEscrowCreated has copy, drop {
        user: address,
        initial_amount: u64,
        expiration_time: u64,
        timestamp: u64,
    }

    public struct TokensAddedToEscrow has copy, drop {
        user: address,
        amount: u64,
        new_total: u64,
        timestamp: u64,
    }

    public struct EscrowClaimedOnUpgrade has copy, drop {
        user: address,
        amount: u64,
        days_until_expiration: u64,
        timestamp: u64,
    }

    public struct EscrowExpired has copy, drop {
        user: address,
        amount: u64,
        returned_to_treasury: bool,
        timestamp: u64,
    }

    public struct ExpirationWarning has copy, drop {
        user: address,
        pending_amount: u64,
        days_until_expiration: u64,
        timestamp: u64,
    }

    /// Initialize the email escrow system
    fun init(_witness: EMAIL_ESCROW, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalEmailEscrowRegistry {
            id: object::new(ctx),
            total_email_escrows: 0,
            total_pending_amount: 0,
            total_claimed_amount: 0,
            total_expired_amount: 0,
            total_upgrades: 0,
            user_escrows: table::new(ctx),
            moderators: vector::empty(),
            admin,
            treasury: admin, // Default treasury to admin, can be changed later
        };

        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Create or add to email escrow for a user
    public fun add_pending_tokens(
        registry: &mut GlobalEmailEscrowRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        user: address,
        tokens: Coin<TOKEN>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&tokens);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let now = clock::timestamp_ms(clock);

        // Verify user is email-tier
        assert!(user_status::is_email_tier(user_status_registry, user), E_NOT_EMAIL_USER);

        // Check if escrow already exists
        if (table::contains(&registry.user_escrows, user)) {
            // Add to existing escrow
            let escrow = table::borrow_mut(&mut registry.user_escrows, user);
            
            // Cannot add to expired or claimed escrow
            assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);
            assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);

            let token_balance = coin::into_balance(tokens);
            balance::join(&mut escrow.pending_balance, token_balance);
            
            escrow.total_deposited = escrow.total_deposited + amount;
            escrow.last_deposit = now;

            let new_total = balance::value(&escrow.pending_balance);
            registry.total_pending_amount = registry.total_pending_amount + amount;

            // Check if approaching expiration (30 days warning)
            let time_until_expiration = if (now < escrow.expiration_time) {
                escrow.expiration_time - now
            } else {
                0
            };

            if (time_until_expiration <= EXPIRATION_WARNING_MS && time_until_expiration > 0) {
                let days_remaining = time_until_expiration / 86_400_000; // Convert to days
                event::emit(ExpirationWarning {
                    user,
                    pending_amount: new_total,
                    days_until_expiration: days_remaining,
                    timestamp: now,
                });
            };

            event::emit(TokensAddedToEscrow {
                user,
                amount,
                new_total,
                timestamp: now,
            });
        } else {
            // Create new escrow
            let expiration_time = now + ESCROW_DURATION_MS;
            
            let escrow = EmailEscrowHold {
                id: object::new(ctx),
                user,
                pending_balance: coin::into_balance(tokens),
                created_at: now,
                expiration_time,
                last_deposit: now,
                total_deposited: amount,
                claimed_on_upgrade: false,
                expired: false,
                claimed_at: 0,
                expired_at: 0,
            };

            table::add(&mut registry.user_escrows, user, escrow);
            registry.total_email_escrows = registry.total_email_escrows + 1;
            registry.total_pending_amount = registry.total_pending_amount + amount;

            event::emit(EmailEscrowCreated {
                user,
                initial_amount: amount,
                expiration_time,
                timestamp: now,
            });
        };
    }

    /// Claim all pending tokens on wallet upgrade
    public fun claim_on_upgrade(
        registry: &mut GlobalEmailEscrowRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let user = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify user has upgraded to wallet (this function should be called AFTER upgrade)
        assert!(user_status::is_wallet_tier(user_status_registry, user), E_ALREADY_WALLET_USER);

        // Get escrow
        assert!(table::contains(&registry.user_escrows, user), E_NO_PENDING_TOKENS);
        let escrow = table::borrow_mut(&mut registry.user_escrows, user);

        // Verify not already claimed or expired
        assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);
        assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);

        let amount = balance::value(&escrow.pending_balance);
        assert!(amount > 0, E_NO_PENDING_TOKENS);

        // Calculate days until expiration (for analytics)
        let days_until_expiration = if (now < escrow.expiration_time) {
            (escrow.expiration_time - now) / 86_400_000
        } else {
            0
        };

        // Mark as claimed
        escrow.claimed_on_upgrade = true;
        escrow.claimed_at = now;

        // Update registry stats
        registry.total_pending_amount = registry.total_pending_amount - amount;
        registry.total_claimed_amount = registry.total_claimed_amount + amount;
        registry.total_upgrades = registry.total_upgrades + 1;

        // Extract tokens
        let claimed_balance = balance::withdraw_all(&mut escrow.pending_balance);
        let claimed_coin = coin::from_balance(claimed_balance, ctx);

        event::emit(EscrowClaimedOnUpgrade {
            user,
            amount,
            days_until_expiration,
            timestamp: now,
        });

        claimed_coin
    }

    /// Expire unclaimed tokens (callable by anyone after expiration)
    public fun expire_unclaimed_tokens(
        registry: &mut GlobalEmailEscrowRegistry,
        user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.user_escrows, user), E_NO_PENDING_TOKENS);
        let escrow = table::borrow_mut(&mut registry.user_escrows, user);

        // Verify not already claimed or expired
        assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);
        assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);

        // Verify expiration time has passed
        assert!(now >= escrow.expiration_time, E_ESCROW_NOT_EXPIRED);

        let amount = balance::value(&escrow.pending_balance);
        
        // Mark as expired
        escrow.expired = true;
        escrow.expired_at = now;

        // Update registry stats
        registry.total_pending_amount = registry.total_pending_amount - amount;
        registry.total_expired_amount = registry.total_expired_amount + amount;

        // Extract tokens to return to treasury
        let expired_balance = balance::withdraw_all(&mut escrow.pending_balance);
        let expired_coin = coin::from_balance(expired_balance, ctx);

        event::emit(EscrowExpired {
            user,
            amount,
            returned_to_treasury: true,
            timestamp: now,
        });

        // Return coin to be sent to treasury
        expired_coin
    }

    /// Check if user has pending tokens
    public fun has_pending_tokens(
        registry: &GlobalEmailEscrowRegistry,
        user: address,
    ): bool {
        if (!table::contains(&registry.user_escrows, user)) {
            return false
        };

        let escrow = table::borrow(&registry.user_escrows, user);
        
        // Has pending if not claimed, not expired, and has balance
        !escrow.claimed_on_upgrade && 
        !escrow.expired && 
        balance::value(&escrow.pending_balance) > 0
    }

    /// Get pending token amount for user
    public fun get_pending_amount(
        registry: &GlobalEmailEscrowRegistry,
        user: address,
    ): u64 {
        if (!table::contains(&registry.user_escrows, user)) {
            return 0
        };

        let escrow = table::borrow(&registry.user_escrows, user);
        
        if (escrow.claimed_on_upgrade || escrow.expired) {
            return 0
        };

        balance::value(&escrow.pending_balance)
    }

    /// Get escrow details
    public fun get_escrow_info(
        registry: &GlobalEmailEscrowRegistry,
        user: address,
        clock: &Clock,
    ): (u64, u64, u64, u64, bool, bool) {
        assert!(table::contains(&registry.user_escrows, user), E_NO_PENDING_TOKENS);
        
        let escrow = table::borrow(&registry.user_escrows, user);
        let now = clock::timestamp_ms(clock);
        
        // Calculate days until expiration
        let days_until_expiration = if (now < escrow.expiration_time && !escrow.expired) {
            (escrow.expiration_time - now) / 86_400_000
        } else {
            0
        };
        
        (
            balance::value(&escrow.pending_balance),  // current pending amount
            escrow.total_deposited,                   // lifetime deposits
            escrow.expiration_time,                   // expiration timestamp
            days_until_expiration,                    // days remaining
            escrow.claimed_on_upgrade,                // claimed status
            escrow.expired                            // expired status
        )
    }

    /// Check if escrow is approaching expiration (within 30 days)
    public fun is_approaching_expiration(
        registry: &GlobalEmailEscrowRegistry,
        user: address,
        clock: &Clock,
    ): bool {
        if (!table::contains(&registry.user_escrows, user)) {
            return false
        };

        let escrow = table::borrow(&registry.user_escrows, user);
        
        if (escrow.claimed_on_upgrade || escrow.expired) {
            return false
        };

        let now = clock::timestamp_ms(clock);
        let time_until_expiration = if (now < escrow.expiration_time) {
            escrow.expiration_time - now
        } else {
            0
        };

        time_until_expiration <= EXPIRATION_WARNING_MS && time_until_expiration > 0
    }

    /// Get global escrow statistics
    public fun get_global_stats(registry: &GlobalEmailEscrowRegistry): (u64, u64, u64, u64, u64) {
        (
            registry.total_email_escrows,
            registry.total_pending_amount,
            registry.total_claimed_amount,
            registry.total_expired_amount,
            registry.total_upgrades
        )
    }

    /// Set treasury address (admin only)
    public fun set_treasury(
        registry: &mut GlobalEmailEscrowRegistry,
        new_treasury: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);
        
        registry.treasury = new_treasury;
    }

    /// Get treasury address
    public fun get_treasury(registry: &GlobalEmailEscrowRegistry): address {
        registry.treasury
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalEmailEscrowRegistry,
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
    fun is_moderator(registry: &GlobalEmailEscrowRegistry, addr: address): bool {
        vector::contains(&registry.moderators, &addr) || addr == registry.admin
    }

    /// Batch expire multiple users' tokens (moderator only, for cleanup)
    public fun batch_expire_tokens(
        registry: &mut GlobalEmailEscrowRegistry,
        users: vector<address>,
        clock: &Clock,
        ctx: &mut TxContext
    ): vector<Coin<TOKEN>> {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let mut expired_coins = vector::empty<Coin<TOKEN>>();
        let mut i = 0;
        let len = vector::length(&users);

        while (i < len) {
            let user = *vector::borrow(&users, i);
            
            // Only expire if conditions are met
            if (table::contains(&registry.user_escrows, user)) {
                let escrow = table::borrow(&registry.user_escrows, user);
                let now = clock::timestamp_ms(clock);
                
                if (!escrow.claimed_on_upgrade && 
                    !escrow.expired && 
                    now >= escrow.expiration_time) {
                    
                    let expired_coin = expire_unclaimed_tokens(registry, user, clock, ctx);
                    vector::push_back(&mut expired_coins, expired_coin);
                };
            };
            
            i = i + 1;
        };

        expired_coins
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(EMAIL_ESCROW {}, ctx);
    }
}
