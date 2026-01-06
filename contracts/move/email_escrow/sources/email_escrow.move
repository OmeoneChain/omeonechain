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

    /// One-time witness for initialization
    public struct EMAIL_ESCROW has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 501;
    const E_NO_PENDING_TOKENS: u64 = 504;
    const E_ESCROW_NOT_EXPIRED: u64 = 505;
    const E_ESCROW_ALREADY_CLAIMED: u64 = 506;
    const E_ESCROW_ALREADY_EXPIRED: u64 = 507;
    const E_INVALID_AMOUNT: u64 = 508;

    /// Constants
    const ESCROW_DURATION_MS: u64 = 15_552_000_000;  // 6 months (180 days) in milliseconds
    const EXPIRATION_WARNING_MS: u64 = 2_592_000_000; // 30 days before expiration

    /// Email user's pending token escrow
    public struct EmailEscrowHold has key, store {
        id: UID,
        user: address,
        pending_balance: Balance<TOKEN>,
        created_at: u64,
        expiration_time: u64,
        last_deposit: u64,
        total_deposited: u64,
        claimed_on_upgrade: bool,
        expired: bool,
        claimed_at: u64,
        expired_at: u64,
    }

    /// Global email escrow registry
    public struct GlobalEmailEscrowRegistry has key {
        id: UID,
        total_email_escrows: u64,
        total_pending_amount: u64,
        total_claimed_amount: u64,
        total_expired_amount: u64,
        total_upgrades: u64,
        user_escrows: Table<address, EmailEscrowHold>,
        moderators: vector<address>,
        admin: address,
        treasury: address,
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
            treasury: admin,
        };

        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Add pending tokens for an email user (moderator only - tier check done off-chain)
    public fun add_pending_tokens(
        registry: &mut GlobalEmailEscrowRegistry,
        user: address,
        tokens: Coin<TOKEN>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let amount = coin::value(&tokens);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let now = clock::timestamp_ms(clock);

        if (table::contains(&registry.user_escrows, user)) {
            let escrow = table::borrow_mut(&mut registry.user_escrows, user);
            
            assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);
            assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);

            let token_balance = coin::into_balance(tokens);
            balance::join(&mut escrow.pending_balance, token_balance);
            
            escrow.total_deposited = escrow.total_deposited + amount;
            escrow.last_deposit = now;

            let new_total = balance::value(&escrow.pending_balance);
            registry.total_pending_amount = registry.total_pending_amount + amount;

            let time_until_expiration = if (now < escrow.expiration_time) {
                escrow.expiration_time - now
            } else {
                0
            };

            if (time_until_expiration <= EXPIRATION_WARNING_MS && time_until_expiration > 0) {
                let days_remaining = time_until_expiration / 86_400_000;
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

    /// Claim pending tokens on wallet upgrade (moderator triggers after verifying upgrade)
    public fun claim_on_upgrade(
        registry: &mut GlobalEmailEscrowRegistry,
        user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.user_escrows, user), E_NO_PENDING_TOKENS);
        let escrow = table::borrow_mut(&mut registry.user_escrows, user);

        assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);
        assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);

        let amount = balance::value(&escrow.pending_balance);
        assert!(amount > 0, E_NO_PENDING_TOKENS);

        let days_until_expiration = if (now < escrow.expiration_time) {
            (escrow.expiration_time - now) / 86_400_000
        } else {
            0
        };

        escrow.claimed_on_upgrade = true;
        escrow.claimed_at = now;

        registry.total_pending_amount = registry.total_pending_amount - amount;
        registry.total_claimed_amount = registry.total_claimed_amount + amount;
        registry.total_upgrades = registry.total_upgrades + 1;

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

    /// Expire unclaimed tokens (callable by moderator after expiration)
    public fun expire_unclaimed_tokens(
        registry: &mut GlobalEmailEscrowRegistry,
        user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<TOKEN> {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.user_escrows, user), E_NO_PENDING_TOKENS);
        let escrow = table::borrow_mut(&mut registry.user_escrows, user);

        assert!(!escrow.claimed_on_upgrade, E_ESCROW_ALREADY_CLAIMED);
        assert!(!escrow.expired, E_ESCROW_ALREADY_EXPIRED);
        assert!(now >= escrow.expiration_time, E_ESCROW_NOT_EXPIRED);

        let amount = balance::value(&escrow.pending_balance);
        
        escrow.expired = true;
        escrow.expired_at = now;

        registry.total_pending_amount = registry.total_pending_amount - amount;
        registry.total_expired_amount = registry.total_expired_amount + amount;

        let expired_balance = balance::withdraw_all(&mut escrow.pending_balance);
        let expired_coin = coin::from_balance(expired_balance, ctx);

        event::emit(EscrowExpired {
            user,
            amount,
            returned_to_treasury: true,
            timestamp: now,
        });

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
        !escrow.claimed_on_upgrade && !escrow.expired && balance::value(&escrow.pending_balance) > 0
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
        
        let days_until_expiration = if (now < escrow.expiration_time && !escrow.expired) {
            (escrow.expiration_time - now) / 86_400_000
        } else {
            0
        };
        
        (
            balance::value(&escrow.pending_balance),
            escrow.total_deposited,
            escrow.expiration_time,
            days_until_expiration,
            escrow.claimed_on_upgrade,
            escrow.expired
        )
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

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(EMAIL_ESCROW {}, ctx);
    }
}
