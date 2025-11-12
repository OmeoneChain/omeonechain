module user_status::user_status {
    use std::vector;
    use std::string::String;
    use std::hash;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::table::{Self, Table};
    use iota::clock::{Self, Clock};
    use iota::event;

    /// One-time witness following IOTA pattern
    public struct USER_STATUS has drop {}

    /// Error codes
    const E_INVALID_USER: u64 = 202;
    const E_USER_NOT_FOUND: u64 = 203;
    const E_UNAUTHORIZED: u64 = 204;
    const E_RATE_LIMIT_EXCEEDED: u64 = 205;
    const E_SPAM_FLAGGED: u64 = 206;
    const E_ALREADY_EXISTS: u64 = 207;
    const E_INVALID_TIER: u64 = 208;
    const E_NOT_MODERATOR: u64 = 209;
    const E_ALREADY_WALLET_USER: u64 = 210;
    const E_NOT_EMAIL_USER: u64 = 211;

    /// Account tier constants (email vs wallet)
    const ACCOUNT_TIER_EMAIL: u8 = 1;           // Email-only account (no wallet)
    const ACCOUNT_TIER_WALLET: u8 = 2;          // Wallet account (any tier)

    /// Tier constants (for both email and wallet users)
    const TIER_NEW: u8 = 1;          // 0-30 days, 0.5× engagement weight
    const TIER_ESTABLISHED: u8 = 2;  // 30+ days, 1.0× engagement weight
    const TIER_TRUSTED: u8 = 3;      // 100+ days + requirements, 1.5× engagement weight

    /// Tier requirements
    const ESTABLISHED_AGE_DAYS: u64 = 30;
    const TRUSTED_AGE_DAYS: u64 = 100;
    const TRUSTED_MIN_RECOMMENDATIONS: u64 = 50;
    const TRUSTED_MIN_AVG_ENGAGEMENT: u64 = 2000; // 2.0 with 3 decimal precision (2000/1000)

    /// Rate limiting constants
    const STANDARD_RATE_LIMIT: u64 = 5;  // 5 recommendations per day
    const BOOST_RATE_LIMIT: u64 = 10;    // 10 recommendations on boost days
    const PENALTY_RATE_LIMIT: u64 = 3;   // 3 recommendations per day if spam-flagged

    /// Engagement weight multipliers (scaled by 1000)
    const WEIGHT_NEW: u64 = 500;         // 0.5× for New tier
    const WEIGHT_ESTABLISHED: u64 = 1000; // 1.0× for Established tier
    const WEIGHT_TRUSTED: u64 = 1500;    // 1.5× for Trusted tier

    /// Social distance trust weights (scaled by 1000)
    const TRUST_WEIGHT_DIRECT: u64 = 750;     // 0.75 weight for direct connections
    const TRUST_WEIGHT_INDIRECT: u64 = 250;   // 0.25 weight for friend-of-friend
    const MAX_SOCIAL_DISTANCE: u8 = 2;        // Beyond 2 hops = no weight

    /// Milliseconds in a day
    const MS_PER_DAY: u64 = 86_400_000;

    /// User status tracking for tier system
    public struct UserStatus has key, store {
        id: UID,
        user_address: address,
        
        // Account tier (email vs wallet)
        account_tier: u8,              // 1=email, 2=wallet
        email_hash: vector<u8>,        // Hashed email ID (empty for wallet-only)
        wallet_linked: bool,           // Has wallet been connected?
        upgrade_timestamp: u64,        // When upgraded from email to wallet (0 if wallet-only)
        
        // User tier system (applies to both email and wallet)
        tier: u8,                      // Current tier (1=New, 2=Established, 3=Trusted)
        account_created: u64,          // Timestamp when account was created
        
        // Recommendation tracking
        total_recommendations: u64,     // Total recommendations created
        validated_recommendations: u64, // Recommendations with ≥3.0 engagement
        
        // Rate limiting
        daily_recommendation_count: u64,  // Recommendations today
        last_recommendation_date: u64,    // Date of last recommendation (day number)
        current_rate_limit: u64,          // Current daily limit (5, 10, or 3)
        boost_days: vector<u64>,          // Days with 10-rec boost (registration, wallet upgrade)
        
        // Spam tracking
        spam_flags: u64,                  // Total number of spam flags received
        active_spam_flag: bool,           // Currently flagged as spam
        spam_flag_history: vector<SpamFlag>, // History of spam reports
        
        // Social graph
        social_connections: vector<address>,  // All connections (bidirectional)
        followers: vector<address>,            // Users following this user
        following: vector<address>,            // Users this user follows
        
        // Timestamps
        last_tier_check: u64,
        last_updated: u64,
    }

    /// Spam flag record
    public struct SpamFlag has store, copy, drop {
        reporter: address,
        moderator: address,
        flagged_at: u64,
        cleared_at: u64,      // 0 if still active
        reason: u8,            // Reason code
    }

    /// Global registry for user status management
    public struct UserStatusRegistry has key {
        id: UID,
        total_users: u64,
        total_email_users: u64,
        total_wallet_users: u64,
        total_upgrades: u64,               // Email → Wallet upgrades
        user_statuses: Table<address, UserStatus>,
        moderators: vector<address>,
        admin: address,
    }

    /// Events
    public struct UserStatusCreated has copy, drop {
        user: address,
        account_tier: u8,
        tier: u8,
        timestamp: u64,
    }

    public struct TierUpdated has copy, drop {
        user: address,
        old_tier: u8,
        new_tier: u8,
        timestamp: u64,
    }

    public struct AccountUpgraded has copy, drop {
        user: address,
        from_tier: u8,
        to_tier: u8,
        timestamp: u64,
    }

    public struct RecommendationCounted has copy, drop {
        user: address,
        daily_count: u64,
        rate_limit: u64,
        timestamp: u64,
    }

    public struct SpamFlagged has copy, drop {
        user: address,
        reporter: address,
        moderator: address,
        timestamp: u64,
    }

    public struct SpamFlagCleared has copy, drop {
        user: address,
        moderator: address,
        timestamp: u64,
    }

    public struct SocialConnectionAdded has copy, drop {
        user: address,
        connected_to: address,
        connection_type: u8, // 1=follow, 2=mutual
        timestamp: u64,
    }

    public struct BoostDayAdded has copy, drop {
        user: address,
        boost_date: u64,
        reason: String,
        timestamp: u64,
    }

    /// Initialize the user status system
    fun init(_witness: USER_STATUS, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let mut registry = UserStatusRegistry {
            id: object::new(ctx),
            total_users: 0,
            total_email_users: 0,
            total_wallet_users: 0,
            total_upgrades: 0,
            user_statuses: table::new(ctx),
            moderators: vector::empty(),
            admin,
        };
        
        // Admin is automatically a moderator
        vector::push_back(&mut registry.moderators, admin);
        
        transfer::share_object(registry);
    }

    /// Hash email for privacy-preserving storage
    fun hash_email(email: &String): vector<u8> {
        let email_bytes = std::string::bytes(email);
        hash::sha3_256(*email_bytes)
    }

    /// Initialize user status for an email-tier user (no wallet)
    public fun initialize_email_user(
        registry: &mut UserStatusRegistry,
        email: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Check if user already exists
        assert!(!table::contains(&registry.user_statuses, user_addr), E_ALREADY_EXISTS);
        
        // Hash email for privacy
        let email_hash = hash_email(&email);
        
        // Create email-tier user status
        let mut user_status = UserStatus {
            id: object::new(ctx),
            user_address: user_addr,
            
            // Account tier
            account_tier: ACCOUNT_TIER_EMAIL,
            email_hash,
            wallet_linked: false,
            upgrade_timestamp: 0,
            
            tier: TIER_NEW,
            account_created: now,
            
            total_recommendations: 0,
            validated_recommendations: 0,
            
            daily_recommendation_count: 0,
            last_recommendation_date: get_day_number(now),
            current_rate_limit: BOOST_RATE_LIMIT, // Start with boost on registration
            boost_days: vector::empty(),
            
            spam_flags: 0,
            active_spam_flag: false,
            spam_flag_history: vector::empty(),
            
            social_connections: vector::empty(),
            followers: vector::empty(),
            following: vector::empty(),
            
            last_tier_check: now,
            last_updated: now,
        };
        
        // Add registration day as boost day (10 recommendations allowed)
        let today = get_day_number(now);
        vector::push_back(&mut user_status.boost_days, today);
        
        // Add to registry
        table::add(&mut registry.user_statuses, user_addr, user_status);
        registry.total_users = registry.total_users + 1;
        registry.total_email_users = registry.total_email_users + 1;
        
        // Emit events
        event::emit(UserStatusCreated {
            user: user_addr,
            account_tier: ACCOUNT_TIER_EMAIL,
            tier: TIER_NEW,
            timestamp: now,
        });
        
        event::emit(BoostDayAdded {
            user: user_addr,
            boost_date: today,
            reason: std::string::utf8(b"Registration day"),
            timestamp: now,
        });
    }

    /// Initialize user status for a wallet user (direct wallet signup)
    public fun initialize_user_status(
        registry: &mut UserStatusRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Check if user already exists
        assert!(!table::contains(&registry.user_statuses, user_addr), E_ALREADY_EXISTS);
        
        // Create initial user status (WALLET TIER)
        let mut user_status = UserStatus {
            id: object::new(ctx),
            user_address: user_addr,
            
            // Account tier (wallet from the start)
            account_tier: ACCOUNT_TIER_WALLET,
            email_hash: vector::empty(), // Empty for wallet users
            wallet_linked: true,
            upgrade_timestamp: 0, // 0 indicates wallet-only user
            
            tier: TIER_NEW,
            account_created: now,
            
            total_recommendations: 0,
            validated_recommendations: 0,
            
            daily_recommendation_count: 0,
            last_recommendation_date: get_day_number(now),
            current_rate_limit: BOOST_RATE_LIMIT, // Start with boost on registration
            boost_days: vector::empty(),
            
            spam_flags: 0,
            active_spam_flag: false,
            spam_flag_history: vector::empty(),
            
            social_connections: vector::empty(),
            followers: vector::empty(),
            following: vector::empty(),
            
            last_tier_check: now,
            last_updated: now,
        };
        
        // Add registration day as boost day (10 recommendations allowed)
        let today = get_day_number(now);
        vector::push_back(&mut user_status.boost_days, today);
        
        // Add to registry
        table::add(&mut registry.user_statuses, user_addr, user_status);
        registry.total_users = registry.total_users + 1;
        registry.total_wallet_users = registry.total_wallet_users + 1;
        
        // Emit events
        event::emit(UserStatusCreated {
            user: user_addr,
            account_tier: ACCOUNT_TIER_WALLET,
            tier: TIER_NEW,
            timestamp: now,
        });
        
        event::emit(BoostDayAdded {
            user: user_addr,
            boost_date: today,
            reason: std::string::utf8(b"Registration day"),
            timestamp: now,
        });
    }

    /// Upgrade from email-tier to wallet-tier
    public fun upgrade_to_wallet(
        registry: &mut UserStatusRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        
        // Can only upgrade from email tier
        assert!(user_status.account_tier == ACCOUNT_TIER_EMAIL, E_NOT_EMAIL_USER);
        assert!(!user_status.wallet_linked, E_ALREADY_WALLET_USER);
        
        let old_tier = user_status.account_tier;
        
        // Update to wallet tier
        user_status.account_tier = ACCOUNT_TIER_WALLET;
        user_status.wallet_linked = true;
        user_status.upgrade_timestamp = now;
        user_status.last_updated = now;
        
        // Add wallet upgrade day as boost day (10 recommendations allowed)
        let today = get_day_number(now);
        if (!vector::contains(&user_status.boost_days, &today)) {
            vector::push_back(&mut user_status.boost_days, today);
            user_status.current_rate_limit = BOOST_RATE_LIMIT;
        };
        
        // Update registry counts
        registry.total_email_users = registry.total_email_users - 1;
        registry.total_wallet_users = registry.total_wallet_users + 1;
        registry.total_upgrades = registry.total_upgrades + 1;
        
        // Emit events
        event::emit(AccountUpgraded {
            user: user_addr,
            from_tier: old_tier,
            to_tier: ACCOUNT_TIER_WALLET,
            timestamp: now,
        });
        
        event::emit(BoostDayAdded {
            user: user_addr,
            boost_date: today,
            reason: std::string::utf8(b"Wallet upgrade"),
            timestamp: now,
        });
    }

    /// Check and update user tier based on age and activity
    /// NOTE: Both email and wallet users can progress through tiers
    public fun check_and_update_tier(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        clock: &Clock,
    ) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        let old_tier = user_status.tier;
        
        // Calculate account age in days
        // For email users: from account creation
        // For upgraded users: from account creation (not upgrade time - this ensures fair tier progression)
        // For wallet-only users: from account creation
        let account_age_ms = now - user_status.account_created;
        let account_age_days = account_age_ms / MS_PER_DAY;
        
        // Calculate average engagement per recommendation
        let avg_engagement = if (user_status.total_recommendations > 0) {
            (user_status.validated_recommendations * 1000) / user_status.total_recommendations
        } else {
            0
        };
        
        // Determine new tier (applies to both email and wallet users)
        let new_tier = if (account_age_days >= TRUSTED_AGE_DAYS && 
                          user_status.total_recommendations >= TRUSTED_MIN_RECOMMENDATIONS &&
                          avg_engagement >= TRUSTED_MIN_AVG_ENGAGEMENT &&
                          !user_status.active_spam_flag) {
            TIER_TRUSTED
        } else if (account_age_days >= ESTABLISHED_AGE_DAYS) {
            TIER_ESTABLISHED
        } else {
            TIER_NEW
        };
        
        // Update tier if changed
        if (new_tier != old_tier) {
            user_status.tier = new_tier;
            user_status.last_tier_check = now;
            user_status.last_updated = now;
            
            event::emit(TierUpdated {
                user: user_addr,
                old_tier,
                new_tier,
                timestamp: now,
            });
        };
    }

    /// Check if user can create a recommendation (rate limit)
    public fun check_rate_limit(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        clock: &Clock,
    ): bool {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        let today = get_day_number(now);
        
        // Reset daily count if it's a new day
        if (user_status.last_recommendation_date < today) {
            user_status.daily_recommendation_count = 0;
            user_status.last_recommendation_date = today;
            
            // Check if today is a boost day
            if (vector::contains(&user_status.boost_days, &today)) {
                user_status.current_rate_limit = BOOST_RATE_LIMIT;
            } else if (user_status.active_spam_flag) {
                user_status.current_rate_limit = PENALTY_RATE_LIMIT;
            } else {
                user_status.current_rate_limit = STANDARD_RATE_LIMIT;
            };
        };
        
        // Check if under rate limit
        user_status.daily_recommendation_count < user_status.current_rate_limit
    }

    /// Increment recommendation count (call after creating recommendation)
    public fun increment_recommendation_count(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        clock: &Clock,
    ) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        
        // Increment counts
        user_status.daily_recommendation_count = user_status.daily_recommendation_count + 1;
        user_status.total_recommendations = user_status.total_recommendations + 1;
        user_status.last_updated = now;
        
        // Emit event
        event::emit(RecommendationCounted {
            user: user_addr,
            daily_count: user_status.daily_recommendation_count,
            rate_limit: user_status.current_rate_limit,
            timestamp: now,
        });
    }

    /// Mark a recommendation as validated (≥3.0 engagement)
    public fun mark_recommendation_validated(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        clock: &Clock,
    ) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        user_status.validated_recommendations = user_status.validated_recommendations + 1;
        user_status.last_updated = clock::timestamp_ms(clock);
        
        // Check if user now qualifies for tier upgrade
        check_and_update_tier(registry, user_addr, clock);
    }

    /// Flag user as spam (moderator only)
    public fun flag_as_spam(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        reporter: address,
        reason: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let moderator = tx_context::sender(ctx);
        
        // Verify moderator
        assert!(is_moderator(registry, moderator), E_NOT_MODERATOR);
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        
        // Create spam flag record
        let spam_flag = SpamFlag {
            reporter,
            moderator,
            flagged_at: now,
            cleared_at: 0,
            reason,
        };
        
        // Update user status
        user_status.active_spam_flag = true;
        user_status.spam_flags = user_status.spam_flags + 1;
        user_status.current_rate_limit = PENALTY_RATE_LIMIT;
        user_status.last_updated = now;
        vector::push_back(&mut user_status.spam_flag_history, spam_flag);
        
        // Emit event
        event::emit(SpamFlagged {
            user: user_addr,
            reporter,
            moderator,
            timestamp: now,
        });
    }

    /// Clear spam flag (moderator only)
    public fun clear_spam_flag(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let moderator = tx_context::sender(ctx);
        
        // Verify moderator
        assert!(is_moderator(registry, moderator), E_NOT_MODERATOR);
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        
        // Update most recent spam flag
        if (vector::length(&user_status.spam_flag_history) > 0) {
            let last_idx = vector::length(&user_status.spam_flag_history) - 1;
            let last_flag = vector::borrow_mut(&mut user_status.spam_flag_history, last_idx);
            last_flag.cleared_at = now;
        };
        
        // Clear active flag
        user_status.active_spam_flag = false;
        user_status.current_rate_limit = STANDARD_RATE_LIMIT;
        user_status.last_updated = now;
        
        // Emit event
        event::emit(SpamFlagCleared {
            user: user_addr,
            moderator,
            timestamp: now,
        });
    }

    /// Add a boost day (10 recommendations allowed)
    public fun add_boost_day(
        registry: &mut UserStatusRegistry,
        user_addr: address,
        reason: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Only admin or moderators can add boost days
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller) || caller == registry.admin, E_NOT_MODERATOR);
        
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow_mut(&mut registry.user_statuses, user_addr);
        let now = clock::timestamp_ms(clock);
        let today = get_day_number(now);
        
        // Add boost day if not already present
        if (!vector::contains(&user_status.boost_days, &today)) {
            vector::push_back(&mut user_status.boost_days, today);
        };
        
        user_status.last_updated = now;
        
        // Emit event
        event::emit(BoostDayAdded {
            user: user_addr,
            boost_date: today,
            reason,
            timestamp: now,
        });
    }

    /// Get engagement weight multiplier based on tier
    /// NOTE: Email and wallet users get the SAME engagement weights
    /// Email users just have their rewards routed to escrow
    public fun get_engagement_weight(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): u64 {
        if (!table::contains(&registry.user_statuses, user_addr)) {
            return WEIGHT_NEW // Default to New tier weight
        };
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        
        if (user_status.tier == TIER_TRUSTED) {
            WEIGHT_TRUSTED
        } else if (user_status.tier == TIER_ESTABLISHED) {
            WEIGHT_ESTABLISHED
        } else {
            WEIGHT_NEW
        }
    }

    /// Add social connection (follow relationship)
    public fun add_social_connection(
        registry: &mut UserStatusRegistry,
        target_addr: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let follower = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.user_statuses, follower), E_USER_NOT_FOUND);
        assert!(table::contains(&registry.user_statuses, target_addr), E_USER_NOT_FOUND);
        
        // Update follower's following list
        {
            let follower_status = table::borrow_mut(&mut registry.user_statuses, follower);
            vector::push_back(&mut follower_status.following, target_addr);
        };
        
        // Update target's followers list
        {
            let target_status = table::borrow_mut(&mut registry.user_statuses, target_addr);
            vector::push_back(&mut target_status.followers, follower);
        };
        
        // Check if mutual follow
        let is_mutual = {
            let follower_status = table::borrow(&registry.user_statuses, follower);
            vector::contains(&follower_status.followers, &target_addr)
        };
        
        // Emit event
        event::emit(SocialConnectionAdded {
            user: follower,
            connected_to: target_addr,
            connection_type: if (is_mutual) { 2 } else { 1 },
            timestamp: now,
        });
    }

    /// Remove social connection (unfollow)
    public fun remove_social_connection(
        registry: &mut UserStatusRegistry,
        target_addr: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let follower = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.user_statuses, follower), E_USER_NOT_FOUND);
        assert!(table::contains(&registry.user_statuses, target_addr), E_USER_NOT_FOUND);
        
        // Remove from follower's following list
        let follower_status = table::borrow_mut(&mut registry.user_statuses, follower);
        remove_from_vector(&mut follower_status.following, &target_addr);
        follower_status.last_updated = now;
        
        // Remove from target's followers list
        let target_status = table::borrow_mut(&mut registry.user_statuses, target_addr);
        remove_from_vector(&mut target_status.followers, &follower);
        target_status.last_updated = now;
    }

    /// Calculate social distance between two users
    public fun calculate_social_distance(
        registry: &UserStatusRegistry,
        user1: address,
        user2: address,
    ): u8 {
        if (user1 == user2) {
            return 0
        };
        
        if (!table::contains(&registry.user_statuses, user1) || 
            !table::contains(&registry.user_statuses, user2)) {
            return MAX_SOCIAL_DISTANCE + 1
        };
        
        let user1_status = table::borrow(&registry.user_statuses, user1);
        
        // Check for direct connection (distance = 1)
        if (vector::contains(&user1_status.following, &user2)) {
            return 1
        };
        
        // Check for friend-of-friend (distance = 2)
        let mut i = 0;
        let following_len = vector::length(&user1_status.following);
        
        while (i < following_len) {
            let followed_user = *vector::borrow(&user1_status.following, i);
            if (table::contains(&registry.user_statuses, followed_user)) {
                let followed_status = table::borrow(&registry.user_statuses, followed_user);
                if (vector::contains(&followed_status.following, &user2)) {
                    return 2
                };
            };
            i = i + 1;
        };
        
        // Beyond 2 hops or no connection
        MAX_SOCIAL_DISTANCE + 1
    }

    /// Get trust weight based on social distance
    public fun get_trust_weight_for_distance(social_distance: u8): u64 {
        if (social_distance == 1) {
            TRUST_WEIGHT_DIRECT
        } else if (social_distance == 2) {
            TRUST_WEIGHT_INDIRECT
        } else {
            0 // No trust weight beyond 2 hops
        }
    }

    /// Check if user is email-tier (no wallet)
    public fun is_email_tier(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): bool {
        if (!table::contains(&registry.user_statuses, user_addr)) {
            return false
        };
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        user_status.account_tier == ACCOUNT_TIER_EMAIL
    }

    /// Check if user is wallet-tier
    public fun is_wallet_tier(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): bool {
        if (!table::contains(&registry.user_statuses, user_addr)) {
            return false
        };
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        user_status.account_tier == ACCOUNT_TIER_WALLET
    }

    /// Get account tier (1=email, 2=wallet)
    public fun get_account_tier(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): u8 {
        if (!table::contains(&registry.user_statuses, user_addr)) {
            return ACCOUNT_TIER_EMAIL // Default to email
        };
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        user_status.account_tier
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut UserStatusRegistry,
        new_moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_UNAUTHORIZED);
        
        if (!vector::contains(&registry.moderators, &new_moderator)) {
            vector::push_back(&mut registry.moderators, new_moderator);
        };
    }

    /// Remove moderator (admin only)
    public fun remove_moderator(
        registry: &mut UserStatusRegistry,
        moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_UNAUTHORIZED);
        
        remove_from_vector(&mut registry.moderators, &moderator);
    }

    /// Check if address is a moderator
    public fun is_moderator(registry: &UserStatusRegistry, addr: address): bool {
        vector::contains(&registry.moderators, &addr)
    }

    /// Get user status info
    public fun get_user_status(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): (u8, u8, u64, u64, u64, bool, u64) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        
        (
            user_status.account_tier,      // 1=email, 2=wallet
            user_status.tier,              // 1=New, 2=Established, 3=Trusted
            user_status.total_recommendations,
            user_status.validated_recommendations,
            user_status.daily_recommendation_count,
            user_status.active_spam_flag,
            user_status.spam_flags
        )
    }

    /// Get user tier
    public fun get_user_tier(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): u8 {
        if (!table::contains(&registry.user_statuses, user_addr)) {
            return TIER_NEW
        };
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        user_status.tier
    }

    /// Get social stats
    public fun get_social_stats(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): (u64, u64, u64) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        
        (
            vector::length(&user_status.followers),
            vector::length(&user_status.following),
            vector::length(&user_status.social_connections)
        )
    }

    /// Get rate limit info
    public fun get_rate_limit_info(
        registry: &UserStatusRegistry,
        user_addr: address,
    ): (u64, u64, u64) {
        assert!(table::contains(&registry.user_statuses, user_addr), E_USER_NOT_FOUND);
        
        let user_status = table::borrow(&registry.user_statuses, user_addr);
        
        (
            user_status.current_rate_limit,
            user_status.daily_recommendation_count,
            user_status.last_recommendation_date
        )
    }

    /// Get registry stats
    public fun get_registry_stats(registry: &UserStatusRegistry): (u64, u64, u64, u64) {
        (
            registry.total_users,
            registry.total_email_users,
            registry.total_wallet_users,
            registry.total_upgrades
        )
    }

    /// Get total users count
    public fun get_total_users(registry: &UserStatusRegistry): u64 {
        registry.total_users
    }

    /// Helper: Get day number from timestamp
    fun get_day_number(timestamp_ms: u64): u64 {
        timestamp_ms / MS_PER_DAY
    }

    /// Helper: Remove address from vector
    fun remove_from_vector(vec: &mut vector<address>, item: &address) {
        let (found, idx) = vector::index_of(vec, item);
        if (found) {
            vector::remove(vec, idx);
        };
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(USER_STATUS {}, ctx);
    }
}