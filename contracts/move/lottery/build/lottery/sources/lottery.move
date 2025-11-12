module lottery::lottery {
    use std::string::String;
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use iota::random::{Self, Random};
    use bocaboca::token::{Self, TOKEN};
    use user_status::user_status;

    /// One-time witness for initialization
    public struct LOTTERY has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 601;
    const E_LOTTERY_NOT_READY: u64 = 602;
    const E_ALREADY_DRAWN: u64 = 603;
    const E_NOT_ELIGIBLE: u64 = 604;
    const E_INSUFFICIENT_PARTICIPANTS: u64 = 605;
    const E_INVALID_WEEK: u64 = 606;
    const E_PRIZES_ALREADY_DISTRIBUTED: u64 = 607;
    const E_NOT_WINNER: u64 = 608;
    const E_SPOTLIGHT_ALREADY_SET: u64 = 609;

    /// Lottery configuration constants
    const MAX_ELIGIBLE_USERS: u64 = 50;              // Top 50 users eligible
    const MIN_ENGAGEMENT_THRESHOLD: u64 = 1000;      // 1.0 engagement point (scaled by 1000)
    const MIN_PARTICIPANTS: u64 = 3;                 // Need at least 3 users for drawing
    
    /// Prize amounts (6 decimals)
    const LOTTERY_POOL: u64 = 50_000_000;            // 50 BOCA total
    const FIRST_PLACE_PRIZE: u64 = 25_000_000;       // 25 BOCA
    const SECOND_PLACE_PRIZE: u64 = 15_000_000;      // 15 BOCA
    const THIRD_PLACE_PRIZE: u64 = 10_000_000;       // 10 BOCA
    
    /// Drawing schedule
    const DRAWING_DAY: u8 = 7;      // Sunday (1=Monday, 7=Sunday)
    const DRAWING_HOUR: u8 = 20;    // 8pm (20:00)
    const WEEK_DURATION_MS: u64 = 604_800_000;  // 7 days in milliseconds
    
    /// Spotlight slot limits
    const MAX_SPOTLIGHT_SLOTS: u64 = 3;  // Each winner can feature up to 3 recommendations

    /// User's lifetime lottery statistics (NEVER RESET)
    public struct UserLotteryStats has key, store {
        id: UID,
        user: address,
        
        // Cumulative stats (lifetime)
        lifetime_engagement: u64,           // All-time engagement points
        total_weeks_entered: u64,           // Number of weeks participated
        total_wins: u64,                    // Total times won any prize
        total_first_place: u64,             // Times won 1st place
        total_second_place: u64,            // Times won 2nd place
        total_third_place: u64,             // Times won 3rd place
        total_prizes_won: u64,              // Total BOCA won from lottery
        first_win_timestamp: u64,           // When first won
        last_win_timestamp: u64,            // When last won
        
        // Current week tracking (RESETS MONDAY)
        current_week_id: u64,               // Which week we're tracking
        current_week_engagement: u64,       // Engagement this week only
        current_week_rank: u64,             // Rank this week (0 if not ranked)
        current_week_eligible: bool,        // Top 50 this week?
        current_week_tickets: u64,          // Tickets allocated this week
    }

    /// Weekly lottery period (ONE PER WEEK, PERMANENT RECORD)
    public struct WeeklyLotteryPeriod has key, store {
        id: UID,
        period_id: u64,                     // Week number (incremental)
        start_time: u64,                    // Monday 12:00am
        end_time: u64,                      // Sunday 11:59pm
        
        // Weekly engagement tracking (frozen after drawing)
        weekly_scores: Table<address, u64>,      // User → engagement this week
        eligible_users: vector<address>,          // Top 50 users this week
        ticket_allocations: Table<address, u64>,  // User → tickets allocated
        total_tickets: u64,                       // Sum of all tickets
        
        // Drawing results
        drawing_completed: bool,
        drawing_timestamp: u64,
        first_place: address,
        second_place: address,
        third_place: address,
        
        // Prize distribution
        prizes_distributed: bool,
        prize_distribution_timestamp: u64,
        
        // Statistics
        total_participants: u64,            // Users with any engagement
        total_engagement: u64,              // Sum of all engagement
        
        // Winner spotlights
        first_place_spotlights: vector<String>,   // Recommendation IDs
        second_place_spotlights: vector<String>,
        third_place_spotlights: vector<String>,
    }

    /// Global lottery registry
    public struct GlobalLotteryRegistry has key {
        id: UID,
        current_week_id: u64,
        current_period: ID,                // Current week's period UID
        
        // Historical tracking
        total_weeks: u64,
        total_prizes_distributed: u64,      // Total BOCA distributed
        total_unique_winners: u64,
        
        // User stats tracking
        user_stats: Table<address, UserLotteryStats>,
        
        // Admin
        moderators: vector<address>,
        admin: address,
        
        // Launch time
        first_week_start: u64,
    }

    /// Events
    public struct WeekStarted has copy, drop {
        week_id: u64,
        start_time: u64,
        end_time: u64,
    }

    public struct EngagementRecorded has copy, drop {
        week_id: u64,
        user: address,
        engagement_points: u64,
        weekly_total: u64,
        lifetime_total: u64,
        timestamp: u64,
    }

    public struct LotteryDrawn has copy, drop {
        week_id: u64,
        total_eligible: u64,
        total_tickets: u64,
        first_place: address,
        second_place: address,
        third_place: address,
        timestamp: u64,
    }

    public struct PrizesDistributed has copy, drop {
        week_id: u64,
        first_place: address,
        second_place: address,
        third_place: address,
        first_prize: u64,
        second_prize: u64,
        third_prize: u64,
        timestamp: u64,
    }

    public struct SpotlightSet has copy, drop {
        week_id: u64,
        winner: address,
        place: u8,
        recommendation_ids: vector<String>,
        timestamp: u64,
    }

    /// Initialize the lottery system
    fun init(_witness: LOTTERY, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalLotteryRegistry {
            id: object::new(ctx),
            current_week_id: 0,
            current_period: object::id_from_bytes(x"0000000000000000000000000000000000000000000000000000000000000000"), // Placeholder
            total_weeks: 0,
            total_prizes_distributed: 0,
            total_unique_winners: 0,
            user_stats: table::new(ctx),
            moderators: vector::empty(),
            admin,
            first_week_start: 0,
        };

        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Start the first lottery week (called once at launch)
    public fun initialize_first_week(
        registry: &mut GlobalLotteryRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);
        assert!(registry.current_week_id == 0, E_ALREADY_DRAWN);

        let now = clock::timestamp_ms(clock);
        
        // Calculate next Monday 12:00am
        let week_start = calculate_next_monday_midnight(now);
        let week_end = week_start + WEEK_DURATION_MS;

        // Create first period
        let period = WeeklyLotteryPeriod {
            id: object::new(ctx),
            period_id: 1,
            start_time: week_start,
            end_time: week_end,
            weekly_scores: table::new(ctx),
            eligible_users: vector::empty(),
            ticket_allocations: table::new(ctx),
            total_tickets: 0,
            drawing_completed: false,
            drawing_timestamp: 0,
            first_place: @0x0,
            second_place: @0x0,
            third_place: @0x0,
            prizes_distributed: false,
            prize_distribution_timestamp: 0,
            total_participants: 0,
            total_engagement: 0,
            first_place_spotlights: vector::empty(),
            second_place_spotlights: vector::empty(),
            third_place_spotlights: vector::empty(),
        };

        let period_uid = object::uid_to_inner(&period.id);

        registry.current_week_id = 1;
        registry.current_period = period_uid;
        registry.first_week_start = week_start;
        registry.total_weeks = 1;

        event::emit(WeekStarted {
            week_id: 1,
            start_time: week_start,
            end_time: week_end,
        });

        transfer::share_object(period);
    }

    /// Record engagement for a user (called by recommendation contract)
    public fun record_engagement(
        registry: &mut GlobalLotteryRegistry,
        period: &mut WeeklyLotteryPeriod,
        user: address,
        engagement_points: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);

        // Verify we're in the current period
        assert!(period.period_id == registry.current_week_id, E_INVALID_WEEK);
        assert!(now >= period.start_time && now < period.end_time, E_INVALID_WEEK);
        assert!(!period.drawing_completed, E_ALREADY_DRAWN);

        // Update or create user stats
        if (!table::contains(&registry.user_stats, user)) {
            let user_stats = UserLotteryStats {
                id: object::new(ctx),
                user,
                lifetime_engagement: 0,
                total_weeks_entered: 0,
                total_wins: 0,
                total_first_place: 0,
                total_second_place: 0,
                total_third_place: 0,
                total_prizes_won: 0,
                first_win_timestamp: 0,
                last_win_timestamp: 0,
                current_week_id: registry.current_week_id,
                current_week_engagement: 0,
                current_week_rank: 0,
                current_week_eligible: false,
                current_week_tickets: 0,
            };
            table::add(&mut registry.user_stats, user, user_stats);
        };

        let user_stats = table::borrow_mut(&mut registry.user_stats, user);

        // Reset weekly stats if new week
        if (user_stats.current_week_id != registry.current_week_id) {
            user_stats.current_week_id = registry.current_week_id;
            user_stats.current_week_engagement = 0;
            user_stats.current_week_rank = 0;
            user_stats.current_week_eligible = false;
            user_stats.current_week_tickets = 0;
            user_stats.total_weeks_entered = user_stats.total_weeks_entered + 1;
        };

        // Update weekly engagement
        let current_weekly = if (table::contains(&period.weekly_scores, user)) {
            *table::borrow(&period.weekly_scores, user)
        } else {
            0
        };

        let new_weekly = current_weekly + engagement_points;

        if (current_weekly == 0) {
            table::add(&mut period.weekly_scores, user, new_weekly);
            period.total_participants = period.total_participants + 1;
        } else {
            *table::borrow_mut(&mut period.weekly_scores, user) = new_weekly;
        };

        period.total_engagement = period.total_engagement + engagement_points;

        // Update user stats
        user_stats.current_week_engagement = new_weekly;
        user_stats.lifetime_engagement = user_stats.lifetime_engagement + engagement_points;

        event::emit(EngagementRecorded {
            week_id: registry.current_week_id,
            user,
            engagement_points,
            weekly_total: new_weekly,
            lifetime_total: user_stats.lifetime_engagement,
            timestamp: now,
        });
    }

    /// Execute lottery drawing (Sunday 8pm)
    public fun execute_drawing(
        registry: &mut GlobalLotteryRegistry,
        period: &mut WeeklyLotteryPeriod,
        random: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify caller is authorized
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        // Verify we're in the right week
        assert!(period.period_id == registry.current_week_id, E_INVALID_WEEK);

        // Verify drawing hasn't been done
        assert!(!period.drawing_completed, E_ALREADY_DRAWN);

        // Verify we're past the drawing time
        assert!(now >= period.end_time, E_LOTTERY_NOT_READY);

        // Step 1: Determine eligible users (top 50 with >= 1.0 engagement)
        let eligible = calculate_top_eligible_users(period, registry);
        let eligible_count = vector::length(&eligible);

        assert!(eligible_count >= MIN_PARTICIPANTS, E_INSUFFICIENT_PARTICIPANTS);

        period.eligible_users = eligible;

        // Step 2: Allocate tickets (sqrt of engagement score)
        let mut total_tickets = 0;
        let mut i = 0;
        
        while (i < eligible_count) {
            let user = *vector::borrow(&eligible, i);
            let engagement = *table::borrow(&period.weekly_scores, user);
            
            // Calculate tickets: sqrt(engagement / 1000) rounded
            let tickets = calculate_ticket_count(engagement);
            table::add(&mut period.ticket_allocations, user, tickets);
            total_tickets = total_tickets + tickets;
            
            // Update user stats
            if (table::contains(&registry.user_stats, user)) {
                let user_stats = table::borrow_mut(&mut registry.user_stats, user);
                user_stats.current_week_eligible = true;
                user_stats.current_week_tickets = tickets;
                user_stats.current_week_rank = i + 1;
            };
            
            i = i + 1;
        };

        period.total_tickets = total_tickets;

        // Step 3: Draw winners using VRF
        let (first, second, third) = draw_three_winners(
            &eligible,
            &period.ticket_allocations,
            total_tickets,
            random,
            ctx
        );

        period.first_place = first;
        period.second_place = second;
        period.third_place = third;
        period.drawing_completed = true;
        period.drawing_timestamp = now;

        // Update winner stats
        update_winner_stats(registry, first, 1, FIRST_PLACE_PRIZE, now);
        update_winner_stats(registry, second, 2, SECOND_PLACE_PRIZE, now);
        update_winner_stats(registry, third, 3, THIRD_PLACE_PRIZE, now);

        event::emit(LotteryDrawn {
            week_id: period.period_id,
            total_eligible: eligible_count,
            total_tickets: total_tickets,
            first_place: first,
            second_place: second,
            third_place: third,
            timestamp: now,
        });
    }

    /// Distribute prizes to winners (called after drawing)
    public fun distribute_prizes(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        registry: &mut GlobalLotteryRegistry,
        period: &mut WeeklyLotteryPeriod,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);
        assert!(period.drawing_completed, E_LOTTERY_NOT_READY);
        assert!(!period.prizes_distributed, E_PRIZES_ALREADY_DISTRIBUTED);

        let now = clock::timestamp_ms(clock);

        // Mint prizes
        let first_coin = token::mint(treasury_cap, FIRST_PLACE_PRIZE, ctx);
        let second_coin = token::mint(treasury_cap, SECOND_PLACE_PRIZE, ctx);
        let third_coin = token::mint(treasury_cap, THIRD_PLACE_PRIZE, ctx);

        // Transfer to winners
        transfer::public_transfer(first_coin, period.first_place);
        transfer::public_transfer(second_coin, period.second_place);
        transfer::public_transfer(third_coin, period.third_place);

        period.prizes_distributed = true;
        period.prize_distribution_timestamp = now;

        registry.total_prizes_distributed = registry.total_prizes_distributed + LOTTERY_POOL;

        event::emit(PrizesDistributed {
            week_id: period.period_id,
            first_place: period.first_place,
            second_place: period.second_place,
            third_place: period.third_place,
            first_prize: FIRST_PLACE_PRIZE,
            second_prize: SECOND_PLACE_PRIZE,
            third_prize: THIRD_PLACE_PRIZE,
            timestamp: now,
        });
    }

    /// Set winner spotlight recommendations (winners opt-in)
    public fun set_winner_spotlight(
        registry: &GlobalLotteryRegistry,
        period: &mut WeeklyLotteryPeriod,
        recommendation_ids: vector<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(period.drawing_completed, E_LOTTERY_NOT_READY);
        assert!(vector::length(&recommendation_ids) <= MAX_SPOTLIGHT_SLOTS, E_INVALID_WEEK);

        // Determine which place the caller won
        let (is_winner, place) = if (caller == period.first_place) {
            (true, 1)
        } else if (caller == period.second_place) {
            (true, 2)
        } else if (caller == period.third_place) {
            (true, 3)
        } else {
            (false, 0)
        };

        assert!(is_winner, E_NOT_WINNER);

        // Check if spotlight already set
        if (place == 1) {
            assert!(vector::is_empty(&period.first_place_spotlights), E_SPOTLIGHT_ALREADY_SET);
            period.first_place_spotlights = recommendation_ids;
        } else if (place == 2) {
            assert!(vector::is_empty(&period.second_place_spotlights), E_SPOTLIGHT_ALREADY_SET);
            period.second_place_spotlights = recommendation_ids;
        } else {
            assert!(vector::is_empty(&period.third_place_spotlights), E_SPOTLIGHT_ALREADY_SET);
            period.third_place_spotlights = recommendation_ids;
        };

        event::emit(SpotlightSet {
            week_id: period.period_id,
            winner: caller,
            place,
            recommendation_ids,
            timestamp: now,
        });
    }

    /// Start new week (Monday 12:00am after previous week ends)
    public fun start_new_week(
        registry: &mut GlobalLotteryRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let new_week_id = registry.current_week_id + 1;
        let week_start = registry.first_week_start + ((new_week_id - 1) * WEEK_DURATION_MS);
        let week_end = week_start + WEEK_DURATION_MS;

        assert!(now >= week_start, E_LOTTERY_NOT_READY);

        let period = WeeklyLotteryPeriod {
            id: object::new(ctx),
            period_id: new_week_id,
            start_time: week_start,
            end_time: week_end,
            weekly_scores: table::new(ctx),
            eligible_users: vector::empty(),
            ticket_allocations: table::new(ctx),
            total_tickets: 0,
            drawing_completed: false,
            drawing_timestamp: 0,
            first_place: @0x0,
            second_place: @0x0,
            third_place: @0x0,
            prizes_distributed: false,
            prize_distribution_timestamp: 0,
            total_participants: 0,
            total_engagement: 0,
            first_place_spotlights: vector::empty(),
            second_place_spotlights: vector::empty(),
            third_place_spotlights: vector::empty(),
        };

        let period_uid = object::uid_to_inner(&period.id);

        registry.current_week_id = new_week_id;
        registry.current_period = period_uid;
        registry.total_weeks = registry.total_weeks + 1;

        event::emit(WeekStarted {
            week_id: new_week_id,
            start_time: week_start,
            end_time: week_end,
        });

        transfer::share_object(period);
    }

    /// Calculate top eligible users (top 50 with >= 1.0 engagement)
    fun calculate_top_eligible_users(
        period: &WeeklyLotteryPeriod,
        registry: &GlobalLotteryRegistry,
    ): vector<address> {
        // Get all users with scores
        let mut all_users = vector::empty<address>();
        let mut all_scores = vector::empty<u64>();
        
        // Collect all users from user_stats who participated this week
        
        // Use the eligible_users vector that was populated during the week
        let users_iter = period.eligible_users;
        let mut i = 0;
        let user_count = vector::length(&users_iter);
        
        while (i < user_count) {
            let user = *vector::borrow(&users_iter, i);
            if (table::contains(&period.weekly_scores, user)) {
                let score = *table::borrow(&period.weekly_scores, user);
                if (score >= MIN_ENGAGEMENT_THRESHOLD) {
                    vector::push_back(&mut all_users, user);
                    vector::push_back(&mut all_scores, score);
                };
            };
            i = i + 1;
        };
        
        // Sort by score (descending) - bubble sort for simplicity
        let n = vector::length(&all_users);
        if (n == 0) {
            return vector::empty()
        };
        
        let mut i = 0;
        while (i < n - 1) {
            let mut j = 0;
            while (j < n - i - 1) {
                let score_j = *vector::borrow(&all_scores, j);
                let score_j1 = *vector::borrow(&all_scores, j + 1);
                
                if (score_j < score_j1) {
                    // Swap scores
                    *vector::borrow_mut(&mut all_scores, j) = score_j1;
                    *vector::borrow_mut(&mut all_scores, j + 1) = score_j;
                    
                    // Swap users
                    let user_j = *vector::borrow(&all_users, j);
                    let user_j1 = *vector::borrow(&all_users, j + 1);
                    *vector::borrow_mut(&mut all_users, j) = user_j1;
                    *vector::borrow_mut(&mut all_users, j + 1) = user_j;
                };
                j = j + 1;
            };
            i = i + 1;
        };
        
        // Take top 50 (or all if fewer than 50)
        let take_count = if (n > MAX_ELIGIBLE_USERS) { MAX_ELIGIBLE_USERS } else { n };
        let mut result = vector::empty<address>();
        let mut i = 0;
        
        while (i < take_count) {
            vector::push_back(&mut result, *vector::borrow(&all_users, i));
            i = i + 1;
        };
        
        result
    }

    /// Calculate ticket count from engagement score (square root)
    fun calculate_ticket_count(engagement: u64): u64 {
        // Engagement is scaled by 1000, so divide first
        let points = engagement / 1000;
        
        // Calculate square root (simple approximation)
        if (points == 0) { return 0 };
        if (points == 1) { return 1 };
        
        // Newton's method for square root
        let mut x = points;
        let mut i = 0;
        
        while (i < 10) {  // 10 iterations should be enough
            let next = (x + points / x) / 2;
            if (next >= x) break;
            x = next;
            i = i + 1;
        };
        
        // Ensure at least 1 ticket
        if (x == 0) { 1 } else { x }
    }

    /// Draw three winners using VRF
    fun draw_three_winners(
        eligible: &vector<address>,
        ticket_allocations: &Table<address, u64>,
        total_tickets: u64,
        random: &Random,
        ctx: &mut TxContext
    ): (address, address, address) {
        let mut generator = random::new_generator(random, ctx);
        
        // Draw first place
        let first_ticket = random::generate_u64_in_range(&mut generator, 1, total_tickets);
        let first = find_winner_by_ticket(eligible, ticket_allocations, first_ticket);
        
        // Draw second place (exclude first)
        let mut second = first;
        let mut attempts = 0;
        while (second == first && attempts < 100) {
            let second_ticket = random::generate_u64_in_range(&mut generator, 1, total_tickets);
            second = find_winner_by_ticket(eligible, ticket_allocations, second_ticket);
            attempts = attempts + 1;
        };
        
        // Draw third place (exclude first and second)
        let mut third = first;
        let mut attempts = 0;
        while ((third == first || third == second) && attempts < 100) {
            let third_ticket = random::generate_u64_in_range(&mut generator, 1, total_tickets);
            third = find_winner_by_ticket(eligible, ticket_allocations, third_ticket);
            attempts = attempts + 1;
        };
        
        (first, second, third)
    }

    /// Find winner by ticket number
    fun find_winner_by_ticket(
        eligible: &vector<address>,
        ticket_allocations: &Table<address, u64>,
        winning_ticket: u64,
    ): address {
        let mut cumulative = 0;
        let mut i = 0;
        let len = vector::length(eligible);
        
        while (i < len) {
            let user = *vector::borrow(eligible, i);
            let tickets = *table::borrow(ticket_allocations, user);
            cumulative = cumulative + tickets;
            
            if (winning_ticket <= cumulative) {
                return user
            };
            
            i = i + 1;
        };
        
        // Fallback (should never happen)
        *vector::borrow(eligible, 0)
    }

    /// Update winner statistics
    fun update_winner_stats(
        registry: &mut GlobalLotteryRegistry,
        winner: address,
        place: u8,
        prize: u64,
        timestamp: u64,
    ) {
        if (!table::contains(&registry.user_stats, winner)) {
            return
        };
        
        let stats = table::borrow_mut(&mut registry.user_stats, winner);
        
        stats.total_wins = stats.total_wins + 1;
        stats.total_prizes_won = stats.total_prizes_won + prize;
        
        if (stats.first_win_timestamp == 0) {
            stats.first_win_timestamp = timestamp;
        };
        stats.last_win_timestamp = timestamp;
        
        if (place == 1) {
            stats.total_first_place = stats.total_first_place + 1;
        } else if (place == 2) {
            stats.total_second_place = stats.total_second_place + 1;
        } else if (place == 3) {
            stats.total_third_place = stats.total_third_place + 1;
        };
    }

    /// Calculate next Monday midnight from a timestamp
    fun calculate_next_monday_midnight(timestamp_ms: u64): u64 {
        // This is a simplified version - in production would need proper date math
        // For now, align to week boundaries
        let days_ms = 86_400_000;
        let week_ms = days_ms * 7;
        
        // Round up to next week boundary
        ((timestamp_ms / week_ms) + 1) * week_ms
    }

    /// Check if address is a moderator
    fun is_moderator(registry: &GlobalLotteryRegistry, addr: address): bool {
        vector::contains(&registry.moderators, &addr) || addr == registry.admin
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalLotteryRegistry,
        new_moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);

        if (!vector::contains(&registry.moderators, &new_moderator)) {
            vector::push_back(&mut registry.moderators, new_moderator);
        };
    }

    /// Get user lottery stats
    public fun get_user_stats(
        registry: &GlobalLotteryRegistry,
        user: address,
    ): (u64, u64, u64, u64, u64, u64, u64) {
        if (!table::contains(&registry.user_stats, user)) {
            return (0, 0, 0, 0, 0, 0, 0)
        };

        let stats = table::borrow(&registry.user_stats, user);
        (
            stats.lifetime_engagement,
            stats.total_weeks_entered,
            stats.total_wins,
            stats.total_prizes_won,
            stats.current_week_engagement,
            stats.current_week_rank,
            stats.current_week_tickets
        )
    }

    /// Get weekly period info
    public fun get_period_info(period: &WeeklyLotteryPeriod): (
        u64,  // period_id
        u64,  // start_time
        u64,  // end_time
        bool, // drawing_completed
        u64,  // total_participants
        u64,  // total_eligible
        u64   // total_tickets
    ) {
        (
            period.period_id,
            period.start_time,
            period.end_time,
            period.drawing_completed,
            period.total_participants,
            vector::length(&period.eligible_users),
            period.total_tickets
        )
    }

    /// Get weekly winners
    public fun get_winners(period: &WeeklyLotteryPeriod): (address, address, address) {
        (period.first_place, period.second_place, period.third_place)
    }

    /// Get global stats
    public fun get_global_stats(registry: &GlobalLotteryRegistry): (u64, u64, u64) {
        (
            registry.total_weeks,
            registry.total_prizes_distributed,
            registry.current_week_id
        )
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(LOTTERY {}, ctx);
    }
}