module photo_contest::photo_contest {
    use std::string::String;
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Coin, TreasuryCap};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use iota::random::{Self, Random};
    use bocaboca::token::{Self, TOKEN};
    use user_status::user_status;
    use recommendation::recommendation;

    /// One-time witness for initialization
    public struct PHOTO_CONTEST has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 701;
    const E_CONTEST_NOT_READY: u64 = 702;
    const E_NOMINATION_PERIOD_CLOSED: u64 = 703;
    const E_ALREADY_NOMINATED: u64 = 704;
    const E_VOTING_PERIOD_CLOSED: u64 = 705;
    const E_ALREADY_VOTED: u64 = 706;
    const E_CANNOT_VOTE_OWN: u64 = 707;
    const E_NOT_FINALIST: u64 = 708;
    const E_FINALISTS_ALREADY_SELECTED: u64 = 709;
    const E_INSUFFICIENT_NOMINATIONS: u64 = 710;
    const E_WINNERS_ALREADY_SELECTED: u64 = 711;
    const E_PRIZES_ALREADY_DISTRIBUTED: u64 = 712;
    const E_INVALID_NOMINEE: u64 = 713;
    const E_NOT_RECOMMENDATION_OWNER: u64 = 714;

    /// Contest configuration constants
    const MAX_FINALISTS: u64 = 10;                   // Select 10 finalists
    const MIN_NOMINATIONS: u64 = 3;                  // Need at least 3 to run contest
    
    /// Prize amounts (6 decimals)
    const FIRST_PLACE_PRIZE: u64 = 10_000_000;       // 10 BOCA
    const SECOND_PLACE_PRIZE: u64 = 5_000_000;       // 5 BOCA
    const THIRD_PLACE_PRIZE: u64 = 3_000_000;        // 3 BOCA
    const TOTAL_PRIZE_POOL: u64 = 18_000_000;        // 18 BOCA total
    
    /// Timeline constants (day of week: 1=Monday, 7=Sunday)
    const NOMINATION_START_DAY: u8 = 1;              // Monday
    const NOMINATION_END_DAY: u8 = 3;                // Wednesday
    const FINALIST_SELECTION_DAY: u8 = 4;            // Thursday
    const FINALIST_SELECTION_HOUR: u8 = 9;           // 9am
    const VOTING_END_DAY: u8 = 6;                    // Saturday
    const WINNER_ANNOUNCEMENT_DAY: u8 = 7;           // Sunday
    const WINNER_ANNOUNCEMENT_HOUR: u8 = 20;         // 8pm (20:00)
    const WINNER_ANNOUNCEMENT_MINUTE: u8 = 15;       // 8:15pm
    
    const WEEK_DURATION_MS: u64 = 604_800_000;       // 7 days in milliseconds

    /// Photo nomination
    public struct PhotoNomination has store, copy, drop {
        nominator: address,
        recommendation_id: String,
        photo_ipfs_cid: String,
        restaurant_name: String,
        caption: String,
        submission_timestamp: u64,
        votes: u64,                                   // Vote count (pure 1 person = 1 vote)
        is_finalist: bool,
    }

    /// Weekly photo contest
    public struct WeeklyPhotoContest has key, store {
        id: UID,
        week_id: u64,
        start_time: u64,                              // Monday 12:00am
        
        // Nomination phase (Monday-Wednesday)
        nomination_deadline: u64,                     // Wednesday 11:59pm
        nominations: vector<PhotoNomination>,
        nominators: Table<address, u64>,              // address -> nomination_index
        total_nominations: u64,
        
        // Finalist selection phase (Thursday 9am)
        finalists_selected: bool,
        finalist_selection_time: u64,
        finalists: vector<u64>,                       // Indices into nominations vector
        
        // Voting phase (Thursday-Saturday)
        voting_deadline: u64,                         // Saturday 11:59pm
        voters: Table<address, u64>,                  // address -> voted_for_index
        total_votes: u64,
        
        // Results (Sunday 8:15pm)
        winners_selected: bool,
        winner_selection_time: u64,
        first_place_index: u64,
        second_place_index: u64,
        third_place_index: u64,
        
        // Prize distribution
        prizes_distributed: bool,
        prize_distribution_timestamp: u64,
    }

    /// User's lifetime photo contest statistics
    public struct UserPhotoContestStats has key, store {
        id: UID,
        user: address,
        
        // Lifetime stats
        total_nominations: u64,
        total_finalist_appearances: u64,
        total_wins: u64,
        total_first_place: u64,
        total_second_place: u64,
        total_third_place: u64,
        total_prizes_won: u64,                        // In BOCA
        total_votes_received: u64,                    // Lifetime votes
        
        // First/last activity
        first_nomination_timestamp: u64,
        last_nomination_timestamp: u64,
        first_win_timestamp: u64,
        last_win_timestamp: u64,
        
        // Current week
        nominated_this_week: bool,
        voted_this_week: bool,
        current_week_id: u64,
    }

    /// Global photo contest registry
    public struct GlobalPhotoContestRegistry has key {
        id: UID,
        current_week_id: u64,
        current_contest: ID,                         // Current week's contest UID
        
        // Historical tracking
        total_weeks: u64,
        total_nominations: u64,
        total_prizes_distributed: u64,                // Total BOCA distributed
        total_unique_winners: u64,
        
        // User stats tracking
        user_stats: Table<address, UserPhotoContestStats>,
        
        // Admin
        moderators: vector<address>,
        admin: address,
        
        // Launch time
        first_week_start: u64,
    }

    /// Events
    public struct ContestWeekStarted has copy, drop {
        week_id: u64,
        start_time: u64,
        nomination_deadline: u64,
        voting_deadline: u64,
    }

    public struct PhotoNominated has copy, drop {
        week_id: u64,
        nominator: address,
        recommendation_id: String,
        photo_ipfs_cid: String,
        restaurant_name: String,
        timestamp: u64,
    }

    public struct FinalistsSelected has copy, drop {
        week_id: u64,
        total_nominations: u64,
        finalists_count: u64,
        finalist_indices: vector<u64>,
        timestamp: u64,
    }

    public struct VoteCast has copy, drop {
        week_id: u64,
        voter: address,
        nominee_index: u64,
        restaurant_name: String,
        timestamp: u64,
    }

    public struct WinnersAnnounced has copy, drop {
        week_id: u64,
        first_place: address,
        second_place: address,
        third_place: address,
        first_place_votes: u64,
        second_place_votes: u64,
        third_place_votes: u64,
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

    /// Initialize the photo contest system
    fun init(_witness: PHOTO_CONTEST, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalPhotoContestRegistry {
            id: object::new(ctx),
            current_week_id: 0,
            current_contest: object::id_from_bytes(x"0000000000000000000000000000000000000000000000000000000000000000"), // Placeholder
            total_weeks: 0,
            total_nominations: 0,
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

    /// Start the first contest week (called once at launch)
    public fun initialize_first_week(
        registry: &mut GlobalPhotoContestRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);
        assert!(registry.current_week_id == 0, E_FINALISTS_ALREADY_SELECTED);

        let now = clock::timestamp_ms(clock);
        
        // Calculate next Monday 12:00am
        let week_start = calculate_next_monday_midnight(now);
        let nomination_deadline = week_start + (NOMINATION_END_DAY as u64) * 86_400_000;
        let voting_deadline = week_start + (VOTING_END_DAY as u64) * 86_400_000;

        // Create first contest
        let contest = WeeklyPhotoContest {
            id: object::new(ctx),
            week_id: 1,
            start_time: week_start,
            nomination_deadline,
            nominations: vector::empty(),
            nominators: table::new(ctx),
            total_nominations: 0,
            finalists_selected: false,
            finalist_selection_time: week_start + (FINALIST_SELECTION_DAY as u64) * 86_400_000,
            finalists: vector::empty(),
            voting_deadline,
            voters: table::new(ctx),
            total_votes: 0,
            winners_selected: false,
            winner_selection_time: week_start + (WINNER_ANNOUNCEMENT_DAY as u64) * 86_400_000,
            first_place_index: 0,
            second_place_index: 0,
            third_place_index: 0,
            prizes_distributed: false,
            prize_distribution_timestamp: 0,
        };

        let contest_uid = object::uid_to_inner(&contest.id);

        registry.current_week_id = 1;
        registry.current_contest = contest_uid;
        registry.first_week_start = week_start;
        registry.total_weeks = 1;

        event::emit(ContestWeekStarted {
            week_id: 1,
            start_time: week_start,
            nomination_deadline,
            voting_deadline,
        });

        transfer::share_object(contest);
    }

    /// Nominate a photo (Monday-Wednesday)
    public fun nominate_photo(
        registry: &mut GlobalPhotoContestRegistry,
        contest: &mut WeeklyPhotoContest,
        recommendation_id: String,
        photo_ipfs_cid: String,
        restaurant_name: String,
        caption: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let nominator = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify we're in nomination period
        assert!(now >= contest.start_time && now <= contest.nomination_deadline, 
                E_NOMINATION_PERIOD_CLOSED);
        
        // Verify user hasn't already nominated
        assert!(!table::contains(&contest.nominators, nominator), E_ALREADY_NOMINATED);
        
        // TODO: Verify recommendation ownership on-chain
        // In production, would call: recommendation::verify_owner(recommendation_id, nominator)
        // For now, we trust and verify via moderation

        // Create nomination
        let nomination = PhotoNomination {
            nominator,
            recommendation_id,
            photo_ipfs_cid,
            restaurant_name,
            caption,
            submission_timestamp: now,
            votes: 0,
            is_finalist: false,
        };

        // Add to contest
        let nomination_index = vector::length(&contest.nominations);
        vector::push_back(&mut contest.nominations, nomination);
        table::add(&mut contest.nominators, nominator, nomination_index);
        contest.total_nominations = contest.total_nominations + 1;

        // Update or create user stats
        if (!table::contains(&registry.user_stats, nominator)) {
            let stats = UserPhotoContestStats {
                id: object::new(ctx),
                user: nominator,
                total_nominations: 0,
                total_finalist_appearances: 0,
                total_wins: 0,
                total_first_place: 0,
                total_second_place: 0,
                total_third_place: 0,
                total_prizes_won: 0,
                total_votes_received: 0,
                first_nomination_timestamp: 0,
                last_nomination_timestamp: 0,
                first_win_timestamp: 0,
                last_win_timestamp: 0,
                nominated_this_week: false,
                voted_this_week: false,
                current_week_id: 0,
            };
            table::add(&mut registry.user_stats, nominator, stats);
        };

        let user_stats = table::borrow_mut(&mut registry.user_stats, nominator);
        
        // Reset weekly flags if new week
        if (user_stats.current_week_id != registry.current_week_id) {
            user_stats.nominated_this_week = false;
            user_stats.voted_this_week = false;
            user_stats.current_week_id = registry.current_week_id;
        };

        user_stats.total_nominations = user_stats.total_nominations + 1;
        user_stats.nominated_this_week = true;
        user_stats.last_nomination_timestamp = now;
        
        if (user_stats.first_nomination_timestamp == 0) {
            user_stats.first_nomination_timestamp = now;
        };

        registry.total_nominations = registry.total_nominations + 1;

        event::emit(PhotoNominated {
            week_id: contest.week_id,
            nominator,
            recommendation_id,
            photo_ipfs_cid,
            restaurant_name,
            timestamp: now,
        });
    }

    /// Select finalists using VRF (Thursday 9am)
    public fun select_finalists(
        registry: &mut GlobalPhotoContestRegistry,
        contest: &mut WeeklyPhotoContest,
        random: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify caller is authorized
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);
        
        // Verify we're past nomination deadline
        assert!(now >= contest.nomination_deadline, E_CONTEST_NOT_READY);
        
        // Verify finalists haven't been selected
        assert!(!contest.finalists_selected, E_FINALISTS_ALREADY_SELECTED);
        
        // Verify we have enough nominations
        assert!(contest.total_nominations >= MIN_NOMINATIONS, E_INSUFFICIENT_NOMINATIONS);

        let total_noms = vector::length(&contest.nominations);
        
        // If 10 or fewer nominations, all become finalists
        if (total_noms <= MAX_FINALISTS) {
            let mut i = 0;
            while (i < total_noms) {
                vector::push_back(&mut contest.finalists, i);
                let nomination = vector::borrow_mut(&mut contest.nominations, i);
                nomination.is_finalist = true;
                
                // Update user stats
                let nominator = nomination.nominator;
                if (table::contains(&registry.user_stats, nominator)) {
                    let stats = table::borrow_mut(&mut registry.user_stats, nominator);
                    stats.total_finalist_appearances = stats.total_finalist_appearances + 1;
                };
                
                i = i + 1;
            };
        } else {
            // Use VRF to select 10 random finalists
            let mut generator = random::new_generator(random, ctx);
            let mut selected = vector::empty<u64>();
            
            while (vector::length(&selected) < MAX_FINALISTS) {
                let random_index = random::generate_u64_in_range(&mut generator, 0, total_noms - 1);
                
                // Check if already selected
                if (!vector::contains(&selected, &random_index)) {
                    vector::push_back(&mut selected, random_index);
                    vector::push_back(&mut contest.finalists, random_index);
                    
                    let nomination = vector::borrow_mut(&mut contest.nominations, random_index);
                    nomination.is_finalist = true;
                    
                    // Update user stats
                    let nominator = nomination.nominator;
                    if (table::contains(&registry.user_stats, nominator)) {
                        let stats = table::borrow_mut(&mut registry.user_stats, nominator);
                        stats.total_finalist_appearances = stats.total_finalist_appearances + 1;
                    };
                };
            };
        };

        contest.finalists_selected = true;
        contest.finalist_selection_time = now;

        event::emit(FinalistsSelected {
            week_id: contest.week_id,
            total_nominations: total_noms,
            finalists_count: vector::length(&contest.finalists),
            finalist_indices: contest.finalists,
            timestamp: now,
        });
    }

    /// Vote for a finalist (Thursday-Saturday)
    /// Pure 1 person = 1 vote (democratic)
    public fun vote_for_photo(
        registry: &mut GlobalPhotoContestRegistry,
        contest: &mut WeeklyPhotoContest,
        nominee_index: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let voter = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify finalists have been selected
        assert!(contest.finalists_selected, E_CONTEST_NOT_READY);
        
        // Verify we're in voting period
        assert!(now >= contest.finalist_selection_time && now <= contest.voting_deadline, 
                E_VOTING_PERIOD_CLOSED);
        
        // Verify voter hasn't already voted
        assert!(!table::contains(&contest.voters, voter), E_ALREADY_VOTED);
        
        // Verify nominee is a finalist
        assert!(vector::contains(&contest.finalists, &nominee_index), E_NOT_FINALIST);
        
        // Verify valid index
        assert!(nominee_index < vector::length(&contest.nominations), E_INVALID_NOMINEE);
        
        let nomination = vector::borrow(&contest.nominations, nominee_index);
        
        // Verify not voting for own photo
        assert!(nomination.nominator != voter, E_CANNOT_VOTE_OWN);

        // Record vote (pure 1 vote = 1 vote)
        table::add(&mut contest.voters, voter, nominee_index);
        contest.total_votes = contest.total_votes + 1;
        
        // Update nomination vote count
        let nomination_mut = vector::borrow_mut(&mut contest.nominations, nominee_index);
        nomination_mut.votes = nomination_mut.votes + 1;
        
        // Update nominator's stats
        if (table::contains(&registry.user_stats, nomination_mut.nominator)) {
            let stats = table::borrow_mut(&mut registry.user_stats, nomination_mut.nominator);
            stats.total_votes_received = stats.total_votes_received + 1;
        };
        
        // Update voter's stats
        if (!table::contains(&registry.user_stats, voter)) {
            let stats = UserPhotoContestStats {
                id: object::new(ctx),
                user: voter,
                total_nominations: 0,
                total_finalist_appearances: 0,
                total_wins: 0,
                total_first_place: 0,
                total_second_place: 0,
                total_third_place: 0,
                total_prizes_won: 0,
                total_votes_received: 0,
                first_nomination_timestamp: 0,
                last_nomination_timestamp: 0,
                first_win_timestamp: 0,
                last_win_timestamp: 0,
                nominated_this_week: false,
                voted_this_week: false,
                current_week_id: 0,
            };
            table::add(&mut registry.user_stats, voter, stats);
        };
        
        let voter_stats = table::borrow_mut(&mut registry.user_stats, voter);
        
        // Reset weekly flags if new week
        if (voter_stats.current_week_id != registry.current_week_id) {
            voter_stats.nominated_this_week = false;
            voter_stats.voted_this_week = false;
            voter_stats.current_week_id = registry.current_week_id;
        };
        
        voter_stats.voted_this_week = true;

        event::emit(VoteCast {
            week_id: contest.week_id,
            voter,
            nominee_index,
            restaurant_name: nomination_mut.restaurant_name,
            timestamp: now,
        });
    }

    /// Select winners based on votes (Sunday 8:15pm)
    public fun select_winners(
        registry: &mut GlobalPhotoContestRegistry,
        contest: &mut WeeklyPhotoContest,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        // Verify caller is authorized
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);
        
        // Verify we're past voting deadline
        assert!(now >= contest.voting_deadline, E_CONTEST_NOT_READY);
        
        // Verify winners haven't been selected
        assert!(!contest.winners_selected, E_WINNERS_ALREADY_SELECTED);
        
        // Find top 3 by vote count (first-to-reach ties win)
        let (first, second, third) = find_top_three_finalists(&contest.finalists, &contest.nominations);
        
        contest.first_place_index = first;
        contest.second_place_index = second;
        contest.third_place_index = third;
        contest.winners_selected = true;
        contest.winner_selection_time = now;
        
        // Get winner addresses and vote counts
        let first_nom = vector::borrow(&contest.nominations, first);
        let second_nom = vector::borrow(&contest.nominations, second);
        let third_nom = vector::borrow(&contest.nominations, third);
        
        // Update winner stats
        update_winner_stats(registry, first_nom.nominator, 1, FIRST_PLACE_PRIZE, now);
        update_winner_stats(registry, second_nom.nominator, 2, SECOND_PLACE_PRIZE, now);
        update_winner_stats(registry, third_nom.nominator, 3, THIRD_PLACE_PRIZE, now);

        event::emit(WinnersAnnounced {
            week_id: contest.week_id,
            first_place: first_nom.nominator,
            second_place: second_nom.nominator,
            third_place: third_nom.nominator,
            first_place_votes: first_nom.votes,
            second_place_votes: second_nom.votes,
            third_place_votes: third_nom.votes,
            timestamp: now,
        });
    }

    /// Distribute prizes to winners (called after winner selection)
    public fun distribute_prizes(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        registry: &mut GlobalPhotoContestRegistry,
        contest: &mut WeeklyPhotoContest,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);
        assert!(contest.winners_selected, E_CONTEST_NOT_READY);
        assert!(!contest.prizes_distributed, E_PRIZES_ALREADY_DISTRIBUTED);

        let now = clock::timestamp_ms(clock);

        // Get winners
        let first_nom = vector::borrow(&contest.nominations, contest.first_place_index);
        let second_nom = vector::borrow(&contest.nominations, contest.second_place_index);
        let third_nom = vector::borrow(&contest.nominations, contest.third_place_index);

        // Mint prizes
        let first_coin = token::mint(treasury_cap, FIRST_PLACE_PRIZE, ctx);
        let second_coin = token::mint(treasury_cap, SECOND_PLACE_PRIZE, ctx);
        let third_coin = token::mint(treasury_cap, THIRD_PLACE_PRIZE, ctx);

        // Transfer to winners
        transfer::public_transfer(first_coin, first_nom.nominator);
        transfer::public_transfer(second_coin, second_nom.nominator);
        transfer::public_transfer(third_coin, third_nom.nominator);

        contest.prizes_distributed = true;
        contest.prize_distribution_timestamp = now;

        registry.total_prizes_distributed = registry.total_prizes_distributed + TOTAL_PRIZE_POOL;

        event::emit(PrizesDistributed {
            week_id: contest.week_id,
            first_place: first_nom.nominator,
            second_place: second_nom.nominator,
            third_place: third_nom.nominator,
            first_prize: FIRST_PLACE_PRIZE,
            second_prize: SECOND_PLACE_PRIZE,
            third_prize: THIRD_PLACE_PRIZE,
            timestamp: now,
        });
    }

    /// Start new contest week (Monday 12:00am)
    public fun start_new_week(
        registry: &mut GlobalPhotoContestRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);

        assert!(is_moderator(registry, caller), E_NOT_AUTHORIZED);

        let new_week_id = registry.current_week_id + 1;
        let week_start = registry.first_week_start + ((new_week_id - 1) * WEEK_DURATION_MS);
        let nomination_deadline = week_start + (NOMINATION_END_DAY as u64) * 86_400_000;
        let voting_deadline = week_start + (VOTING_END_DAY as u64) * 86_400_000;

        assert!(now >= week_start, E_CONTEST_NOT_READY);

        let contest = WeeklyPhotoContest {
            id: object::new(ctx),
            week_id: new_week_id,
            start_time: week_start,
            nomination_deadline,
            nominations: vector::empty(),
            nominators: table::new(ctx),
            total_nominations: 0,
            finalists_selected: false,
            finalist_selection_time: week_start + (FINALIST_SELECTION_DAY as u64) * 86_400_000,
            finalists: vector::empty(),
            voting_deadline,
            voters: table::new(ctx),
            total_votes: 0,
            winners_selected: false,
            winner_selection_time: week_start + (WINNER_ANNOUNCEMENT_DAY as u64) * 86_400_000,
            first_place_index: 0,
            second_place_index: 0,
            third_place_index: 0,
            prizes_distributed: false,
            prize_distribution_timestamp: 0,
        };

        let contest_uid = object::uid_to_inner(&contest.id);

        registry.current_week_id = new_week_id;
        registry.current_contest = contest_uid;
        registry.total_weeks = registry.total_weeks + 1;

        event::emit(ContestWeekStarted {
            week_id: new_week_id,
            start_time: week_start,
            nomination_deadline,
            voting_deadline,
        });

        transfer::share_object(contest);
    }

    /// Find top 3 finalists by vote count (first-to-reach ties win)
    fun find_top_three_finalists(
        finalists: &vector<u64>,
        nominations: &vector<PhotoNomination>,
    ): (u64, u64, u64) {
        let finalist_count = vector::length(finalists);
        assert!(finalist_count >= 3, E_INSUFFICIENT_NOMINATIONS);
        
        // Get all finalist indices with their vote counts and timestamps
        let mut sorted_finalists = vector::empty<u64>();
        let mut i = 0;
        
        while (i < finalist_count) {
            vector::push_back(&mut sorted_finalists, *vector::borrow(finalists, i));
            i = i + 1;
        };
        
        // Bubble sort by votes (descending), then by timestamp (ascending) for ties
        let n = vector::length(&sorted_finalists);
        let mut i = 0;
        
        while (i < n - 1) {
            let mut j = 0;
            while (j < n - i - 1) {
                let idx_j = *vector::borrow(&sorted_finalists, j);
                let idx_j1 = *vector::borrow(&sorted_finalists, j + 1);
                
                let nom_j = vector::borrow(nominations, idx_j);
                let nom_j1 = vector::borrow(nominations, idx_j1);
                
                // Sort by votes descending, then timestamp ascending
                let should_swap = if (nom_j.votes < nom_j1.votes) {
                    true
                } else if (nom_j.votes == nom_j1.votes && nom_j.submission_timestamp > nom_j1.submission_timestamp) {
                    true
                } else {
                    false
                };
                
                if (should_swap) {
                    *vector::borrow_mut(&mut sorted_finalists, j) = idx_j1;
                    *vector::borrow_mut(&mut sorted_finalists, j + 1) = idx_j;
                };
                
                j = j + 1;
            };
            i = i + 1;
        };
        
        // Return top 3
        (
            *vector::borrow(&sorted_finalists, 0),
            *vector::borrow(&sorted_finalists, 1),
            *vector::borrow(&sorted_finalists, 2)
        )
    }

    /// Update winner statistics
    fun update_winner_stats(
        registry: &mut GlobalPhotoContestRegistry,
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
        let days_ms = 86_400_000;
        let week_ms = days_ms * 7;
        ((timestamp_ms / week_ms) + 1) * week_ms
    }

    /// Check if address is a moderator
    fun is_moderator(registry: &GlobalPhotoContestRegistry, addr: address): bool {
        vector::contains(&registry.moderators, &addr) || addr == registry.admin
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalPhotoContestRegistry,
        new_moderator: address,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == registry.admin, E_NOT_AUTHORIZED);

        if (!vector::contains(&registry.moderators, &new_moderator)) {
            vector::push_back(&mut registry.moderators, new_moderator);
        };
    }

    /// Get user photo contest stats
    public fun get_user_stats(
        registry: &GlobalPhotoContestRegistry,
        user: address,
    ): (u64, u64, u64, u64, u64, bool, bool) {
        if (!table::contains(&registry.user_stats, user)) {
            return (0, 0, 0, 0, 0, false, false)
        };

        let stats = table::borrow(&registry.user_stats, user);
        (
            stats.total_nominations,
            stats.total_finalist_appearances,
            stats.total_wins,
            stats.total_prizes_won,
            stats.total_votes_received,
            stats.nominated_this_week,
            stats.voted_this_week
        )
    }

    /// Get contest info
    public fun get_contest_info(contest: &WeeklyPhotoContest): (
        u64,  // week_id
        u64,  // total_nominations
        bool, // finalists_selected
        u64,  // total_votes
        bool, // winners_selected
        bool  // prizes_distributed
    ) {
        (
            contest.week_id,
            contest.total_nominations,
            contest.finalists_selected,
            contest.total_votes,
            contest.winners_selected,
            contest.prizes_distributed
        )
    }

    /// Get finalists
    public fun get_finalists(contest: &WeeklyPhotoContest): vector<u64> {
        contest.finalists
    }

    /// Get nomination details
    public fun get_nomination(
        contest: &WeeklyPhotoContest,
        index: u64,
    ): (address, String, String, String, u64, bool) {
        assert!(index < vector::length(&contest.nominations), E_INVALID_NOMINEE);
        
        let nom = vector::borrow(&contest.nominations, index);
        (
            nom.nominator,
            nom.photo_ipfs_cid,
            nom.restaurant_name,
            nom.caption,
            nom.votes,
            nom.is_finalist
        )
    }

    /// Get winners
    public fun get_winners(contest: &WeeklyPhotoContest): (u64, u64, u64) {
        (
            contest.first_place_index,
            contest.second_place_index,
            contest.third_place_index
        )
    }

    /// Get global stats
    public fun get_global_stats(registry: &GlobalPhotoContestRegistry): (u64, u64, u64, u64) {
        (
            registry.total_weeks,
            registry.total_nominations,
            registry.total_prizes_distributed,
            registry.current_week_id
        )
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(PHOTO_CONTEST {}, ctx);
    }
}