module bounty::bounty {
    use std::string::String;
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self as coin, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use bocaboca::token::TOKEN;
    use user_status::user_status;

    /// One-time witness for initialization
    public struct BOUNTY has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 801;
    const E_BOUNTY_NOT_FOUND: u64 = 802;
    const E_BOUNTY_EXPIRED: u64 = 803;
    const E_BOUNTY_ALREADY_AWARDED: u64 = 804;
    const E_NOT_REQUESTER: u64 = 805;
    const E_NO_RESPONSES: u64 = 806;
    const E_INVALID_RESPONSE_INDEX: u64 = 807;
    const E_INSUFFICIENT_AMOUNT: u64 = 808;
    const E_ALREADY_RESPONDED: u64 = 809;
    const E_CANNOT_RESPOND_OWN_BOUNTY: u64 = 810;
    const E_BOUNTY_NOT_EXPIRED: u64 = 811;
    const E_ALREADY_REFUNDED: u64 = 812;

    /// Constants
    const MIN_BOUNTY_AMOUNT: u64 = 1_000_000;         // 1.0 BOCA minimum (6 decimals)
    const BOUNTY_DURATION_MS: u64 = 604_800_000;      // 7 days in milliseconds
    const PLATFORM_FEE_PERCENTAGE: u64 = 1000;        // 10% (scaled by 100)
    const REFUND_FEE_PERCENTAGE: u64 = 200;           // 2% processing fee on refunds (scaled by 100)

    /// Bounty status
    const STATUS_ACTIVE: u8 = 1;      // Accepting responses
    const STATUS_AWARDED: u8 = 2;     // Winner selected, prize distributed
    const STATUS_EXPIRED: u8 = 3;     // Expired without winner
    const STATUS_REFUNDED: u8 = 4;    // Refunded to requester

    /// Individual bounty response
    public struct BountyResponse has store, copy, drop {
        responder: address,
        recommendation_id: String,     // Reference to recommendation
        response_text: String,         // Why this recommendation fits
        submitted_at: u64,
        response_index: u64,           // Index in responses vector
    }

    /// Bounty request with escrowed funds
    public struct BountyRequest has key, store {
        id: UID,
        bounty_id: String,             // Unique identifier
        requester: address,
        
        // Bounty details
        request_title: String,         // e.g., "Best sushi under $30 in Austin"
        request_description: String,   // Additional details
        tags: vector<String>,          // e.g., ["sushi", "austin", "budget"]
        
        // Escrow
        escrowed_amount: Balance<TOKEN>,
        original_amount: u64,          // Track original for refund calculation
        
        // Timing
        created_at: u64,
        expires_at: u64,               // created_at + 7 days
        
        // Responses
        responses: vector<BountyResponse>,
        total_responses: u64,
        
        // Winner selection
        winner_index: u64,             // Index in responses vector (0 if none)
        winner_selected: bool,
        awarded_at: u64,               // When winner was selected
        
        // Status
        status: u8,
        refunded: bool,
        refunded_at: u64,
    }

    /// User's bounty statistics
    public struct UserBountyStats has key, store {
        id: UID,
        user: address,
        
        // As requester
        bounties_created: u64,
        total_pledged: u64,
        bounties_awarded: u64,
        bounties_refunded: u64,
        
        // As responder
        responses_submitted: u64,
        bounties_won: u64,
        total_winnings: u64,
        
        // Timestamps
        first_bounty_created: u64,
        last_bounty_created: u64,
        first_bounty_won: u64,
        last_bounty_won: u64,
    }

    /// Global bounty registry
    public struct GlobalBountyRegistry has key {
        id: UID,
        
        // Statistics
        total_bounties: u64,
        active_bounties: u64,
        total_pledged: u64,           // All-time pledged
        total_awarded: u64,           // Total BOCA awarded to winners
        total_refunded: u64,          // Total BOCA refunded
        total_fees_collected: u64,    // Platform fees (burned)
        
        // Bounty tracking
        bounty_requests: Table<String, BountyRequest>,  // bounty_id -> BountyRequest
        user_stats: Table<address, UserBountyStats>,
        
        // Admin
        moderators: vector<address>,
        admin: address,
        last_bounty_id: u64,          // Counter for generating IDs
    }

    /// Events
    public struct BountyCreated has copy, drop {
        bounty_id: String,
        requester: address,
        amount: u64,
        title: String,
        expires_at: u64,
        timestamp: u64,
    }

    public struct BountyResponseSubmitted has copy, drop {
        bounty_id: String,
        responder: address,
        recommendation_id: String,
        response_index: u64,
        timestamp: u64,
    }

    public struct BountyAwarded has copy, drop {
        bounty_id: String,
        requester: address,
        winner: address,
        winner_amount: u64,
        platform_fee: u64,
        timestamp: u64,
    }

    public struct BountyRefunded has copy, drop {
        bounty_id: String,
        requester: address,
        refund_amount: u64,
        processing_fee: u64,
        timestamp: u64,
    }

    public struct BountyExpired has copy, drop {
        bounty_id: String,
        requester: address,
        total_responses: u64,
        timestamp: u64,
    }

    /// Initialize the bounty system
    fun init(_witness: BOUNTY, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalBountyRegistry {
            id: object::new(ctx),
            total_bounties: 0,
            active_bounties: 0,
            total_pledged: 0,
            total_awarded: 0,
            total_refunded: 0,
            total_fees_collected: 0,
            bounty_requests: table::new(ctx),
            user_stats: table::new(ctx),
            moderators: vector::empty(),
            admin,
            last_bounty_id: 0,
        };

        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Create a bounty request
    public fun create_bounty(
        registry: &mut GlobalBountyRegistry,
        pledged_tokens: Coin<TOKEN>,
        title: String,
        description: String,
        tags: vector<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ): String {
        let requester = tx_context::sender(ctx);
        let amount = coin::value(&pledged_tokens);
        let now = clock::timestamp_ms(clock);

        // Validate amount
        assert!(amount >= MIN_BOUNTY_AMOUNT, E_INSUFFICIENT_AMOUNT);

        // Generate bounty ID
        registry.last_bounty_id = registry.last_bounty_id + 1;
        let mut bounty_id = std::string::utf8(b"BOUNTY");
        std::string::append(&mut bounty_id, u64_to_string(registry.last_bounty_id));

        let expires_at = now + BOUNTY_DURATION_MS;

        // Create bounty request
        let bounty = BountyRequest {
            id: object::new(ctx),
            bounty_id,
            requester,
            request_title: title,
            request_description: description,
            tags,
            escrowed_amount: coin::into_balance(pledged_tokens),
            original_amount: amount,
            created_at: now,
            expires_at,
            responses: vector::empty(),
            total_responses: 0,
            winner_index: 0,
            winner_selected: false,
            awarded_at: 0,
            status: STATUS_ACTIVE,
            refunded: false,
            refunded_at: 0,
        };

        // Update or create user stats
        if (!table::contains(&registry.user_stats, requester)) {
            let stats = UserBountyStats {
                id: object::new(ctx),
                user: requester,
                bounties_created: 0,
                total_pledged: 0,
                bounties_awarded: 0,
                bounties_refunded: 0,
                responses_submitted: 0,
                bounties_won: 0,
                total_winnings: 0,
                first_bounty_created: 0,
                last_bounty_created: 0,
                first_bounty_won: 0,
                last_bounty_won: 0,
            };
            table::add(&mut registry.user_stats, requester, stats);
        };

        let user_stats = table::borrow_mut(&mut registry.user_stats, requester);
        user_stats.bounties_created = user_stats.bounties_created + 1;
        user_stats.total_pledged = user_stats.total_pledged + amount;
        user_stats.last_bounty_created = now;
        
        if (user_stats.first_bounty_created == 0) {
            user_stats.first_bounty_created = now;
        };

        // Add to registry
        table::add(&mut registry.bounty_requests, bounty_id, bounty);
        registry.total_bounties = registry.total_bounties + 1;
        registry.active_bounties = registry.active_bounties + 1;
        registry.total_pledged = registry.total_pledged + amount;

        event::emit(BountyCreated {
            bounty_id,
            requester,
            amount,
            title,
            expires_at,
            timestamp: now,
        });

        bounty_id
    }

    /// Submit a response to a bounty
    public fun submit_response(
        registry: &mut GlobalBountyRegistry,
        bounty_id: String,
        recommendation_id: String,
        response_text: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let responder = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow_mut(&mut registry.bounty_requests, bounty_id);

        // Verify bounty is active
        assert!(bounty.status == STATUS_ACTIVE, E_BOUNTY_EXPIRED);
        assert!(now < bounty.expires_at, E_BOUNTY_EXPIRED);
        assert!(!bounty.winner_selected, E_BOUNTY_ALREADY_AWARDED);

        // Cannot respond to own bounty
        assert!(responder != bounty.requester, E_CANNOT_RESPOND_OWN_BOUNTY);

        // Check if already responded
        let mut i = 0;
        let len = vector::length(&bounty.responses);
        while (i < len) {
            let existing_response = vector::borrow(&bounty.responses, i);
            assert!(existing_response.responder != responder, E_ALREADY_RESPONDED);
            i = i + 1;
        };

        // Create response
        let response_index = bounty.total_responses;
        let response = BountyResponse {
            responder,
            recommendation_id,
            response_text,
            submitted_at: now,
            response_index,
        };

        vector::push_back(&mut bounty.responses, response);
        bounty.total_responses = bounty.total_responses + 1;

        // Update or create responder stats
        if (!table::contains(&registry.user_stats, responder)) {
            let stats = UserBountyStats {
                id: object::new(ctx),
                user: responder,
                bounties_created: 0,
                total_pledged: 0,
                bounties_awarded: 0,
                bounties_refunded: 0,
                responses_submitted: 0,
                bounties_won: 0,
                total_winnings: 0,
                first_bounty_created: 0,
                last_bounty_created: 0,
                first_bounty_won: 0,
                last_bounty_won: 0,
            };
            table::add(&mut registry.user_stats, responder, stats);
        };

        let responder_stats = table::borrow_mut(&mut registry.user_stats, responder);
        responder_stats.responses_submitted = responder_stats.responses_submitted + 1;

        event::emit(BountyResponseSubmitted {
            bounty_id,
            responder,
            recommendation_id,
            response_index,
            timestamp: now,
        });
    }

    /// Award bounty to winner (requester selects winner)
    public fun award_bounty(
        registry: &mut GlobalBountyRegistry,
        bounty_id: String,
        winner_index: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<TOKEN>, Coin<TOKEN>) {
        let requester = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow_mut(&mut registry.bounty_requests, bounty_id);

        // Verify requester
        assert!(requester == bounty.requester, E_NOT_REQUESTER);

        // Verify bounty status
        assert!(bounty.status == STATUS_ACTIVE, E_BOUNTY_ALREADY_AWARDED);
        assert!(!bounty.winner_selected, E_BOUNTY_ALREADY_AWARDED);
        assert!(bounty.total_responses > 0, E_NO_RESPONSES);
        assert!(winner_index < bounty.total_responses, E_INVALID_RESPONSE_INDEX);

        // Get winner
        let winner_response = vector::borrow(&bounty.responses, winner_index);
        let winner = winner_response.responder;

        // Calculate amounts
        let total_amount = balance::value(&bounty.escrowed_amount);
        let platform_fee = (total_amount * PLATFORM_FEE_PERCENTAGE) / 10000;
        let winner_amount = total_amount - platform_fee;

        // Update bounty
        bounty.winner_index = winner_index;
        bounty.winner_selected = true;
        bounty.awarded_at = now;
        bounty.status = STATUS_AWARDED;

        // Update registry stats
        registry.active_bounties = registry.active_bounties - 1;
        registry.total_awarded = registry.total_awarded + winner_amount;
        registry.total_fees_collected = registry.total_fees_collected + platform_fee;

        // Update requester stats
        let requester_stats = table::borrow_mut(&mut registry.user_stats, requester);
        requester_stats.bounties_awarded = requester_stats.bounties_awarded + 1;

        // Update winner stats
        let winner_stats = table::borrow_mut(&mut registry.user_stats, winner);
        winner_stats.bounties_won = winner_stats.bounties_won + 1;
        winner_stats.total_winnings = winner_stats.total_winnings + winner_amount;
        winner_stats.last_bounty_won = now;
        
        if (winner_stats.first_bounty_won == 0) {
            winner_stats.first_bounty_won = now;
        };

        // Extract tokens
        let total_balance = balance::withdraw_all(&mut bounty.escrowed_amount);
        let mut total_coin = coin::from_balance(total_balance, ctx);
        
        let fee_coin = coin::split(&mut total_coin, platform_fee, ctx);
        let winner_coin = total_coin; // Remaining amount

        event::emit(BountyAwarded {
            bounty_id,
            requester,
            winner,
            winner_amount,
            platform_fee,
            timestamp: now,
        });

        // Return (winner_coin, fee_coin to be burned)
        (winner_coin, fee_coin)
    }

    /// Refund bounty if no winner selected after 7 days
    public fun refund_bounty(
        registry: &mut GlobalBountyRegistry,
        bounty_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<TOKEN>, Coin<TOKEN>) {
        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow_mut(&mut registry.bounty_requests, bounty_id);

        // Verify bounty has expired
        assert!(now >= bounty.expires_at, E_BOUNTY_NOT_EXPIRED);
        assert!(!bounty.winner_selected, E_BOUNTY_ALREADY_AWARDED);
        assert!(!bounty.refunded, E_ALREADY_REFUNDED);

        // Calculate refund (minus 2% processing fee)
        let total_amount = balance::value(&bounty.escrowed_amount);
        let processing_fee = (total_amount * REFUND_FEE_PERCENTAGE) / 10000;
        let refund_amount = total_amount - processing_fee;

        // Update bounty
        bounty.status = STATUS_REFUNDED;
        bounty.refunded = true;
        bounty.refunded_at = now;

        // Update registry stats
        registry.active_bounties = registry.active_bounties - 1;
        registry.total_refunded = registry.total_refunded + refund_amount;
        registry.total_fees_collected = registry.total_fees_collected + processing_fee;

        // Update requester stats
        let requester_stats = table::borrow_mut(&mut registry.user_stats, bounty.requester);
        requester_stats.bounties_refunded = requester_stats.bounties_refunded + 1;

        // Extract tokens
        let total_balance = balance::withdraw_all(&mut bounty.escrowed_amount);
        let mut total_coin = coin::from_balance(total_balance, ctx);
        
        let fee_coin = coin::split(&mut total_coin, processing_fee, ctx);
        let refund_coin = total_coin; // Remaining amount

        event::emit(BountyRefunded {
            bounty_id,
            requester: bounty.requester,
            refund_amount,
            processing_fee,
            timestamp: now,
        });

        // Return (refund_coin, fee_coin to be burned)
        (refund_coin, fee_coin)
    }

    /// Mark bounty as expired (no refund, just status update)
    public fun mark_expired(
        registry: &mut GlobalBountyRegistry,
        bounty_id: String,
        clock: &Clock,
    ) {
        let now = clock::timestamp_ms(clock);

        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow_mut(&mut registry.bounty_requests, bounty_id);

        assert!(now >= bounty.expires_at, E_BOUNTY_NOT_EXPIRED);
        assert!(bounty.status == STATUS_ACTIVE, E_BOUNTY_EXPIRED);

        bounty.status = STATUS_EXPIRED;
        registry.active_bounties = registry.active_bounties - 1;

        event::emit(BountyExpired {
            bounty_id,
            requester: bounty.requester,
            total_responses: bounty.total_responses,
            timestamp: now,
        });
    }

    /// Get bounty details
    public fun get_bounty_info(
        registry: &GlobalBountyRegistry,
        bounty_id: String,
    ): (address, String, u64, u64, u64, u64, bool, u8) {
        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow(&registry.bounty_requests, bounty_id);
        
        (
            bounty.requester,
            bounty.request_title,
            bounty.original_amount,
            bounty.created_at,
            bounty.expires_at,
            bounty.total_responses,
            bounty.winner_selected,
            bounty.status
        )
    }

    /// Get bounty responses
    public fun get_responses(
        registry: &GlobalBountyRegistry,
        bounty_id: String,
    ): vector<BountyResponse> {
        assert!(table::contains(&registry.bounty_requests, bounty_id), E_BOUNTY_NOT_FOUND);
        
        let bounty = table::borrow(&registry.bounty_requests, bounty_id);
        bounty.responses
    }

    /// Get user bounty statistics
    public fun get_user_stats(
        registry: &GlobalBountyRegistry,
        user: address,
    ): (u64, u64, u64, u64, u64, u64) {
        if (!table::contains(&registry.user_stats, user)) {
            return (0, 0, 0, 0, 0, 0)
        };

        let stats = table::borrow(&registry.user_stats, user);
        (
            stats.bounties_created,
            stats.total_pledged,
            stats.responses_submitted,
            stats.bounties_won,
            stats.total_winnings,
            stats.bounties_awarded
        )
    }

    /// Get global bounty statistics
    public fun get_global_stats(registry: &GlobalBountyRegistry): (u64, u64, u64, u64, u64) {
        (
            registry.total_bounties,
            registry.active_bounties,
            registry.total_awarded,
            registry.total_refunded,
            registry.total_fees_collected
        )
    }

    /// Check if bounty is active and accepting responses
    public fun is_bounty_active(
        registry: &GlobalBountyRegistry,
        bounty_id: String,
        clock: &Clock,
    ): bool {
        if (!table::contains(&registry.bounty_requests, bounty_id)) {
            return false
        };

        let bounty = table::borrow(&registry.bounty_requests, bounty_id);
        let now = clock::timestamp_ms(clock);

        bounty.status == STATUS_ACTIVE && 
        now < bounty.expires_at && 
        !bounty.winner_selected
    }

    /// Helper: Convert u64 to string
    fun u64_to_string(value: u64): String {
        use std::string;
        
        if (value == 0) {
            return string::utf8(b"0")
        };
        
        let mut buffer = vector::empty<u8>();
        let mut temp = value;
        
        while (temp > 0) {
            let digit = ((temp % 10) as u8) + 48;
            vector::push_back(&mut buffer, digit);
            temp = temp / 10;
        };
        
        let len = vector::length(&buffer);
        let mut i = 0;
        let mut j = len - 1;
        
        while (i < j) {
            let temp_val = *vector::borrow(&buffer, i);
            *vector::borrow_mut(&mut buffer, i) = *vector::borrow(&buffer, j);
            *vector::borrow_mut(&mut buffer, j) = temp_val;
            i = i + 1;
            if (j > 0) {
                j = j - 1;
            };
        };
        
        string::utf8(buffer)
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalBountyRegistry,
        new_moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);

        if (!vector::contains(&registry.moderators, &new_moderator)) {
            vector::push_back(&mut registry.moderators, new_moderator);
        };
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(BOUNTY {}, ctx);
    }
}
