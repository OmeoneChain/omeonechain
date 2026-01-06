/// BocaBoca User Status Module v1.0
/// Manages user tiers, reputation weights, and spam prevention
/// 
/// CHANGES FROM v0.8:
/// - ESTABLISHED_AGE_DAYS: 30 → 7
/// - TRUSTED_AGE_DAYS: 100 → 30  
/// - TRUSTED_MIN_RECOMMENDATIONS: 50 → 3
/// - Removed TRUSTED_MIN_AVG_ENGAGEMENT requirement

module user_status::user_status {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::clock::{Self, Clock};
    use iota::event;

    // ============================================
    // CONSTANTS - v1.0 White Paper Specifications
    // ============================================
    
    /// Tier identifiers (used in frontend mapping)
    const TIER_NEW: u8 = 1;
    const TIER_ESTABLISHED: u8 = 2;
    const TIER_TRUSTED: u8 = 3;

    /// Tier thresholds - UPDATED FOR v1.0
    const NEW_AGE_DAYS: u64 = 0;                    // 0-6 days = New tier
    const ESTABLISHED_AGE_DAYS: u64 = 7;           // ≥7 days = Established (was 30)
    const TRUSTED_AGE_DAYS: u64 = 30;              // ≥30 days = Trusted eligible (was 100)
    const TRUSTED_MIN_RECOMMENDATIONS: u64 = 3;    // ≥3 validated recs required (was 50)
    
    /// Engagement weights by tier (basis points: 10000 = 1.0x)
    const WEIGHT_NEW: u64 = 5000;          // 0.5x
    const WEIGHT_ESTABLISHED: u64 = 10000; // 1.0x
    const WEIGHT_TRUSTED: u64 = 15000;     // 1.5x

    /// Rate limits
    const DAILY_RATE_LIMIT: u64 = 5;       // Standard daily limit
    const FIRST_DAY_BOOST: u64 = 10;       // Registration/upgrade day limit
    const SPAM_RATE_LIMIT: u64 = 3;        // Reduced limit for spam-flagged

    /// Escrow periods (milliseconds)
    const ESCROW_PERIOD_NEW: u64 = 604_800_000;  // 7 days in ms
    const ESCROW_PERIOD_NONE: u64 = 0;

    /// Spam penalty durations (days)
    const SPAM_PENALTY_FIRST: u64 = 30;
    const SPAM_PENALTY_SECOND: u64 = 90;
    const SPAM_PENALTY_PERMANENT: u64 = 0;  // 0 = permanent

    /// Day in milliseconds
    const MS_PER_DAY: u64 = 86_400_000;

    // ============================================
    // ERRORS
    // ============================================
    
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_RATE_LIMIT_EXCEEDED: u64 = 2;
    const E_PERMANENTLY_BANNED: u64 = 3;
    const E_INVALID_TIER: u64 = 4;
    const E_USER_NOT_FOUND: u64 = 5;

    // ============================================
    // STRUCTS
    // ============================================

    /// Main user status object - one per user
    public struct UserStatus has key, store {
        id: UID,
        owner: address,
        /// Account creation timestamp (ms)
        created_at: u64,
        /// Last activity timestamp (ms)
        last_active: u64,
        /// Total validated recommendations
        validated_recommendations: u64,
        /// Current calculated tier (1=New, 2=Established, 3=Trusted)
        current_tier: u8,
        /// Spam strike count (0-3)
        spam_strikes: u8,
        /// Spam restriction end timestamp (0 = no restriction, max = permanent)
        spam_restriction_until: u64,
        /// Daily recommendation count
        daily_rec_count: u64,
        /// Last recommendation date (day number)
        last_rec_day: u64,
        /// Is registration day (for first-day boost)
        is_registration_day: bool,
        /// Is wallet upgrade day (for upgrade boost)
        is_upgrade_day: bool,
        /// Total engagement points received
        total_engagement_points: u64,
    }

    /// Admin capability for moderation
    public struct AdminCap has key, store {
        id: UID,
    }

    // ============================================
    // EVENTS
    // ============================================

    public struct UserCreated has copy, drop {
        user_id: ID,
        owner: address,
        created_at: u64,
    }

    public struct TierUpgraded has copy, drop {
        user_id: ID,
        owner: address,
        old_tier: u8,
        new_tier: u8,
    }

    public struct SpamFlagged has copy, drop {
        user_id: ID,
        owner: address,
        strike_count: u8,
        restriction_until: u64,
    }

    public struct RateLimitHit has copy, drop {
        user_id: ID,
        owner: address,
        current_count: u64,
        limit: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    /// Create a new user status record
    public entry fun create_user_status(
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        let user_status = UserStatus {
            id: object::new(ctx),
            owner: sender,
            created_at: now,
            last_active: now,
            validated_recommendations: 0,
            current_tier: TIER_NEW,
            spam_strikes: 0,
            spam_restriction_until: 0,
            daily_rec_count: 0,
            last_rec_day: now / MS_PER_DAY,
            is_registration_day: true,
            is_upgrade_day: false,
            total_engagement_points: 0,
        };

        let user_id = object::id(&user_status);
        
        event::emit(UserCreated {
            user_id,
            owner: sender,
            created_at: now,
        });

        transfer::transfer(user_status, sender);
    }

    /// Check and update tier based on current status
    public entry fun update_tier(
        user_status: &mut UserStatus,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        let age_days = (now - user_status.created_at) / MS_PER_DAY;
        let old_tier = user_status.current_tier;
        
        // Calculate new tier based on v1.0 requirements
        let new_tier = calculate_tier(
            age_days,
            user_status.validated_recommendations
        );

        if (new_tier != old_tier) {
            user_status.current_tier = new_tier;
            
            event::emit(TierUpgraded {
                user_id: object::id(user_status),
                owner: user_status.owner,
                old_tier: old_tier,
                new_tier: new_tier,
            });
        }

        // user_status.last_active = now;
    }

    /// Check if user can create a recommendation (rate limiting)
    public fun can_create_recommendation(
        user_status: &UserStatus,
        clock: &Clock,
    ): bool {
        let now = clock::timestamp_ms(clock);
        let today = now / MS_PER_DAY;
        
        // Check for permanent ban
        if (user_status.spam_strikes >= 3) {
            return false
        };

        // Check for active spam restriction
        if (user_status.spam_restriction_until > now) {
            // During restriction, use reduced rate limit
            let limit = SPAM_RATE_LIMIT;
            if (user_status.last_rec_day == today) {
                return user_status.daily_rec_count < limit
            };
            return true
        };

        // Determine rate limit
        let limit = get_daily_limit(user_status, today);
        
        // Check if within limit
        if (user_status.last_rec_day == today) {
            user_status.daily_rec_count < limit
        } else {
            true // New day, reset count
        }
    }

    /// Record a recommendation creation (call after successful creation)
    public entry fun record_recommendation(
        user_status: &mut UserStatus,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        let today = now / MS_PER_DAY;

        // Reset daily count if new day
        if (user_status.last_rec_day != today) {
            user_status.daily_rec_count = 0;
            user_status.last_rec_day = today;
            
            // Clear registration/upgrade day flags
            user_status.is_registration_day = false;
            user_status.is_upgrade_day = false;
        };

        let limit = get_daily_limit(user_status, today);
        
        // Enforce rate limit
        assert!(user_status.daily_rec_count < limit, E_RATE_LIMIT_EXCEEDED);
        
        user_status.daily_rec_count = user_status.daily_rec_count + 1;
        // user_status.last_active = now;

        // Emit event if approaching limit
        if (user_status.daily_rec_count >= limit - 1) {
            event::emit(RateLimitHit {
                user_id: object::id(user_status),
                owner: user_status.owner,
                current_count: user_status.daily_rec_count,
                limit,
            });
        }
    }

    /// Record a validated recommendation (for tier progression)
    public entry fun record_validation(
        user_status: &mut UserStatus,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        user_status.validated_recommendations = user_status.validated_recommendations + 1;
        user_status.last_active = clock::timestamp_ms(clock);
        
        // Auto-update tier after validation
        let age_days = (clock::timestamp_ms(clock) - user_status.created_at) / MS_PER_DAY;
        let old_tier = user_status.current_tier;
        let new_tier = calculate_tier(age_days, user_status.validated_recommendations);
        
        if (new_tier != old_tier) {
            user_status.current_tier = new_tier;
            event::emit(TierUpgraded {
                user_id: object::id(user_status),
                owner: user_status.owner,
                old_tier: old_tier,
                new_tier: new_tier,
            });
        }
    }

    /// Record engagement received (for analytics)
    public entry fun record_engagement(
        user_status: &mut UserStatus,
        points: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        user_status.total_engagement_points = user_status.total_engagement_points + points;
        user_status.last_active = clock::timestamp_ms(clock);
    }

    /// Mark wallet upgrade day (enables 10-rec boost)
    public entry fun mark_wallet_upgrade(
        user_status: &mut UserStatus,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        user_status.is_upgrade_day = true;
        user_status.last_active = clock::timestamp_ms(clock);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Flag user for spam (admin only)
    public entry fun flag_spam(
        _admin: &AdminCap,
        user_status: &mut UserStatus,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        
        assert!(user_status.spam_strikes < 3, E_PERMANENTLY_BANNED);
        
        user_status.spam_strikes = user_status.spam_strikes + 1;
        
        // Calculate restriction period
        let restriction_days = if (user_status.spam_strikes == 1) {
            SPAM_PENALTY_FIRST
        } else if (user_status.spam_strikes == 2) {
            SPAM_PENALTY_SECOND
        } else {
            // Third strike = permanent
            user_status.spam_restriction_until = 18446744073709551615; // u64::MAX
            event::emit(SpamFlagged {
                user_id: object::id(user_status),
                owner: user_status.owner,
                strike_count: user_status.spam_strikes,
                restriction_until: user_status.spam_restriction_until,
            });
            return
        };

        user_status.spam_restriction_until = now + (restriction_days * MS_PER_DAY);
        
        event::emit(SpamFlagged {
            user_id: object::id(user_status),
            owner: user_status.owner,
            strike_count: user_status.spam_strikes,
            restriction_until: user_status.spam_restriction_until,
        });
    }

    /// Clear spam flag (admin only, for first/second offense after time served)
    public entry fun clear_spam_flag(
        _admin: &AdminCap,
        user_status: &mut UserStatus,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);
        
        // Can only clear if restriction period has passed
        assert!(now >= user_status.spam_restriction_until, E_NOT_AUTHORIZED);
        // Cannot clear permanent ban
        assert!(user_status.spam_strikes < 3, E_PERMANENTLY_BANNED);
        
        user_status.spam_restriction_until = 0;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /// Get user's current tier
    public fun get_tier(user_status: &UserStatus): u8 {
        user_status.current_tier
    }

    /// Get tier engagement weight (basis points)
    public fun get_tier_weight(user_status: &UserStatus): u64 {
        get_weight_for_tier(user_status.current_tier)
    }

    /// Get tier engagement weight as multiplier (for display: 0.5, 1.0, 1.5)
    public fun get_tier_weight_display(user_status: &UserStatus): u64 {
        get_tier_weight(user_status) / 100  // Returns 50, 100, or 150
    }

    /// Check if user requires escrow
    public fun requires_escrow(user_status: &UserStatus): bool {
        user_status.current_tier == TIER_NEW
    }

    /// Get escrow period for user (in ms)
    public fun get_escrow_period(user_status: &UserStatus): u64 {
        if (user_status.current_tier == TIER_NEW) {
            ESCROW_PERIOD_NEW
        } else {
            ESCROW_PERIOD_NONE
        }
    }

    /// Get user stats
    public fun get_stats(user_status: &UserStatus): (u8, u64, u64, u8) {
        (
            user_status.current_tier,
            user_status.validated_recommendations,
            user_status.total_engagement_points,
            user_status.spam_strikes
        )
    }

    /// Check if user has governance rights (Trusted tier only)
    public fun has_governance_rights(user_status: &UserStatus): bool {
        user_status.current_tier == TIER_TRUSTED
    }

    /// Get remaining daily recommendations
    public fun get_remaining_daily_recs(
        user_status: &UserStatus,
        clock: &Clock
    ): u64 {
        let today = clock::timestamp_ms(clock) / MS_PER_DAY;
        let limit = get_daily_limit(user_status, today);
        
        if (user_status.last_rec_day != today) {
            limit // Full allowance on new day
        } else if (user_status.daily_rec_count >= limit) {
            0
        } else {
            limit - user_status.daily_rec_count
        }
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /// Calculate tier based on age and validated recommendations
    /// v1.0 Requirements:
    /// - New (1): 0-6 days active
    /// - Established (2): ≥7 days active
    /// - Trusted (3): ≥30 days + 3 validated recommendations
    fun calculate_tier(age_days: u64, validated_recs: u64): u8 {
        if (age_days >= TRUSTED_AGE_DAYS && validated_recs >= TRUSTED_MIN_RECOMMENDATIONS) {
            TIER_TRUSTED
        } else if (age_days >= ESTABLISHED_AGE_DAYS) {
            TIER_ESTABLISHED
        } else {
            TIER_NEW
        }
    }

    /// Get weight for a specific tier
    fun get_weight_for_tier(tier: u8): u64 {
        if (tier == TIER_TRUSTED) {
            WEIGHT_TRUSTED
        } else if (tier == TIER_ESTABLISHED) {
            WEIGHT_ESTABLISHED
        } else {
            WEIGHT_NEW
        }
    }

    /// Get daily limit based on user status and day
    fun get_daily_limit(user_status: &UserStatus, _today: u64): u64 {
        // Check for spam restriction
        if (user_status.spam_strikes > 0 && user_status.spam_restriction_until > 0) {
            return SPAM_RATE_LIMIT
        };
        
        // Check for first-day boost
        if (user_status.is_registration_day || user_status.is_upgrade_day) {
            return FIRST_DAY_BOOST
        };
        
        DAILY_RATE_LIMIT
    }

    // ============================================
    // TEST HELPERS (only available in test mode)
    // ============================================

    #[test_only]
    public fun create_for_testing(ctx: &mut TxContext): UserStatus {
        UserStatus {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            created_at: 0,
            last_active: 0,
            validated_recommendations: 0,
            current_tier: TIER_NEW,
            spam_strikes: 0,
            spam_restriction_until: 0,
            daily_rec_count: 0,
            last_rec_day: 0,
            is_registration_day: true,
            is_upgrade_day: false,
            total_engagement_points: 0,
        }
    }

    #[test_only]
    public fun set_tier_for_testing(user_status: &mut UserStatus, tier: u8) {
        user_status.current_tier = tier;
    }

    #[test_only]
    public fun set_validated_recs_for_testing(user_status: &mut UserStatus, count: u64) {
        user_status.validated_recommendations = count;
    }
}
