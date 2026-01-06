/// BocaBoca Weekly Lottery Module v1.0
/// Handles weekly engagement-based lottery with VRF drawing

module lottery::lottery {
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use std::vector;

    // Import BOCA token type (exports as TOKEN)
    use bocaboca::token::TOKEN;

    // ======== Constants ========
    const LOTTERY_POOL: u64 = 500_000_000;           // 500 BOCA
    const FIRST_PLACE_PRIZE: u64 = 250_000_000;      // 250 BOCA
    const SECOND_PLACE_PRIZE: u64 = 150_000_000;     // 150 BOCA
    const THIRD_PLACE_PRIZE: u64 = 100_000_000;      // 100 BOCA
    const MAX_TICKETS_PER_USER: u64 = 10;
    const WEEK_MS: u64 = 604_800_000;

    // ======== Errors ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_LOTTERY_NOT_ACTIVE: u64 = 2;
    const E_ALREADY_ENTERED: u64 = 3;
    const E_INSUFFICIENT_TREASURY: u64 = 5;
    const E_LOTTERY_IN_PROGRESS: u64 = 6;
    const E_DRAWING_NOT_READY: u64 = 7;

    // ======== Structs ========

    public struct LotteryState has key {
        id: UID,
        current_week: u64,
        week_start: u64,
        is_active: bool,
        treasury: Balance<TOKEN>,
        total_distributed: u64,
        participants: Table<address, LotteryEntry>,
        participant_list: vector<address>,
        total_tickets: u64,
        last_winners: vector<Winner>,
    }

    public struct LotteryEntry has store, drop, copy {
        user: address,
        engagement_score: u64,
        tickets: u64,
        entered_at: u64,
    }

    public struct Winner has store, drop, copy {
        user: address,
        place: u8,
        prize_amount: u64,
        spotlights: u64,
        tickets: u64,
        week: u64,
    }

    public struct LotteryAdminCap has key, store {
        id: UID,
    }

    public struct LotteryReceipt has key, store {
        id: UID,
        user: address,
        week: u64,
        tickets: u64,
        engagement_score: u64,
    }

    // ======== Events ========

    public struct LotteryEntryRecorded has copy, drop {
        user: address,
        week: u64,
        engagement_score: u64,
        tickets: u64,
    }

    public struct LotteryDrawn has copy, drop {
        week: u64,
        first_place: address,
        second_place: address,
        third_place: address,
        total_participants: u64,
        total_tickets: u64,
    }

    public struct PrizePaid has copy, drop {
        winner: address,
        place: u8,
        amount: u64,
        spotlights: u64,
        week: u64,
    }

    public struct NewWeekStarted has copy, drop {
        week: u64,
        start_time: u64,
    }

    // ======== Init ========

    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            LotteryAdminCap { id: object::new(ctx) },
            tx_context::sender(ctx)
        );

        transfer::share_object(LotteryState {
            id: object::new(ctx),
            current_week: 1,
            week_start: 0,
            is_active: false,
            treasury: balance::zero(),
            total_distributed: 0,
            participants: table::new(ctx),
            participant_list: vector::empty(),
            total_tickets: 0,
            last_winners: vector::empty(),
        });
    }

    // ======== Admin Functions ========

    public entry fun start_new_week(
        _admin: &LotteryAdminCap,
        state: &mut LotteryState,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(!state.is_active, E_LOTTERY_IN_PROGRESS);
        
        let now = clock::timestamp_ms(clock);
        clear_participants(state);
        
        state.current_week = state.current_week + 1;
        state.week_start = now;
        state.is_active = true;
        state.total_tickets = 0;

        event::emit(NewWeekStarted {
            week: state.current_week,
            start_time: now,
        });
    }

    public entry fun fund_lottery(
        state: &mut LotteryState,
        payment: Coin<TOKEN>,
        _ctx: &mut TxContext
    ) {
        balance::join(&mut state.treasury, coin::into_balance(payment));
    }

    public entry fun execute_drawing(
        _admin: &LotteryAdminCap,
        state: &mut LotteryState,
        vrf_seed: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(state.is_active, E_LOTTERY_NOT_ACTIVE);
        
        let now = clock::timestamp_ms(clock);
        assert!(now >= state.week_start + WEEK_MS, E_DRAWING_NOT_READY);
        
        let num_participants = vector::length(&state.participant_list);
        
        if (num_participants < 3) {
            state.is_active = false;
            return
        };

        assert!(
            balance::value(&state.treasury) >= LOTTERY_POOL,
            E_INSUFFICIENT_TREASURY
        );

        let winners = select_winners(state, &vrf_seed);
        pay_prizes(state, &winners, ctx);
        
        state.last_winners = winners;
        state.is_active = false;

        let first = *vector::borrow(&state.last_winners, 0);
        let second = *vector::borrow(&state.last_winners, 1);
        let third = *vector::borrow(&state.last_winners, 2);

        event::emit(LotteryDrawn {
            week: state.current_week,
            first_place: first.user,
            second_place: second.user,
            third_place: third.user,
            total_participants: num_participants,
            total_tickets: state.total_tickets,
        });
    }

    // ======== Public Functions ========

    public entry fun record_engagement(
        state: &mut LotteryState,
        engagement_score: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(state.is_active, E_LOTTERY_NOT_ACTIVE);
        
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        let tickets = calculate_ticket_count(engagement_score);

        if (table::contains(&state.participants, sender)) {
            let entry = table::borrow_mut(&mut state.participants, sender);
            if (engagement_score > entry.engagement_score) {
                state.total_tickets = state.total_tickets - entry.tickets + tickets;
                entry.engagement_score = engagement_score;
                entry.tickets = tickets;
            };
        } else {
            let entry = LotteryEntry {
                user: sender,
                engagement_score,
                tickets,
                entered_at: now,
            };
            table::add(&mut state.participants, sender, entry);
            vector::push_back(&mut state.participant_list, sender);
            state.total_tickets = state.total_tickets + tickets;
        };

        transfer::transfer(
            LotteryReceipt {
                id: object::new(ctx),
                user: sender,
                week: state.current_week,
                tickets,
                engagement_score,
            },
            sender
        );

        event::emit(LotteryEntryRecorded {
            user: sender,
            week: state.current_week,
            engagement_score,
            tickets,
        });
    }

    // ======== Internal Functions ========

    fun calculate_ticket_count(engagement_score: u64): u64 {
        let sqrt_score = integer_sqrt(engagement_score);
        if (sqrt_score > MAX_TICKETS_PER_USER) {
            MAX_TICKETS_PER_USER
        } else if (sqrt_score == 0) {
            1
        } else {
            sqrt_score
        }
    }

    fun integer_sqrt(n: u64): u64 {
        if (n == 0) { return 0 };
        if (n == 1) { return 1 };
        
        let mut x = n;
        let mut y = (x + 1) / 2;
        
        while (y < x) {
            x = y;
            y = (x + n / x) / 2;
        };
        x
    }

    fun select_winners(state: &LotteryState, vrf_seed: &vector<u8>): vector<Winner> {
        let mut winners = vector::empty<Winner>();
        let mut excluded = vector::empty<address>();
        
        let first = weighted_random_select(state, vrf_seed, 0, &excluded);
        vector::push_back(&mut excluded, first);
        vector::push_back(&mut winners, Winner {
            user: first,
            place: 1,
            prize_amount: FIRST_PLACE_PRIZE,
            spotlights: 3,
            tickets: get_user_tickets(state, first),
            week: state.current_week,
        });

        let second = weighted_random_select(state, vrf_seed, 1, &excluded);
        vector::push_back(&mut excluded, second);
        vector::push_back(&mut winners, Winner {
            user: second,
            place: 2,
            prize_amount: SECOND_PLACE_PRIZE,
            spotlights: 2,
            tickets: get_user_tickets(state, second),
            week: state.current_week,
        });

        let third = weighted_random_select(state, vrf_seed, 2, &excluded);
        vector::push_back(&mut winners, Winner {
            user: third,
            place: 3,
            prize_amount: THIRD_PLACE_PRIZE,
            spotlights: 1,
            tickets: get_user_tickets(state, third),
            week: state.current_week,
        });

        winners
    }

    fun weighted_random_select(
        state: &LotteryState,
        vrf_seed: &vector<u8>,
        iteration: u64,
        excluded: &vector<address>
    ): address {
        let mut total_eligible_tickets = 0u64;
        let mut i = 0;
        let len = vector::length(&state.participant_list);
        
        while (i < len) {
            let addr = *vector::borrow(&state.participant_list, i);
            if (!vector::contains(excluded, &addr)) {
                let entry = table::borrow(&state.participants, addr);
                total_eligible_tickets = total_eligible_tickets + entry.tickets;
            };
            i = i + 1;
        };

        let random = generate_random(vrf_seed, iteration, total_eligible_tickets);
        
        let mut cumulative = 0u64;
        i = 0;
        
        while (i < len) {
            let addr = *vector::borrow(&state.participant_list, i);
            if (!vector::contains(excluded, &addr)) {
                let entry = table::borrow(&state.participants, addr);
                cumulative = cumulative + entry.tickets;
                if (random < cumulative) {
                    return addr
                };
            };
            i = i + 1;
        };

        *vector::borrow(&state.participant_list, len - 1)
    }

    fun generate_random(vrf_seed: &vector<u8>, iteration: u64, max: u64): u64 {
        if (max == 0) { return 0 };
        
        let seed_len = vector::length(vrf_seed);
        let mut hash_input = 0u64;
        
        let mut i = 0;
        while (i < seed_len && i < 8) {
            hash_input = hash_input * 256 + (*vector::borrow(vrf_seed, i) as u64);
            i = i + 1;
        };
        
        hash_input = hash_input ^ (iteration * 0x9e3779b97f4a7c15);
        hash_input % max
    }

    fun get_user_tickets(state: &LotteryState, user: address): u64 {
        if (table::contains(&state.participants, user)) {
            table::borrow(&state.participants, user).tickets
        } else {
            0
        }
    }

    fun pay_prizes(
        state: &mut LotteryState,
        winners: &vector<Winner>,
        ctx: &mut TxContext
    ) {
        let mut i = 0;
        let len = vector::length(winners);
        
        while (i < len) {
            let winner = vector::borrow(winners, i);
            
            if (balance::value(&state.treasury) >= winner.prize_amount) {
                let prize = coin::take(&mut state.treasury, winner.prize_amount, ctx);
                transfer::public_transfer(prize, winner.user);
                state.total_distributed = state.total_distributed + winner.prize_amount;

                event::emit(PrizePaid {
                    winner: winner.user,
                    place: winner.place,
                    amount: winner.prize_amount,
                    spotlights: winner.spotlights,
                    week: winner.week,
                });
            };
            
            i = i + 1;
        };
    }

    fun clear_participants(state: &mut LotteryState) {
        let len = vector::length(&state.participant_list);
        let mut i = 0;
        
        while (i < len) {
            let addr = vector::pop_back(&mut state.participant_list);
            if (table::contains(&state.participants, addr)) {
                table::remove(&mut state.participants, addr);
            };
            i = i + 1;
        };
        
        state.participant_list = vector::empty();
        state.total_tickets = 0;
    }

    // ======== View Functions ========

    public fun get_lottery_info(state: &LotteryState): (u64, u64, bool, u64, u64) {
        (
            state.current_week,
            state.week_start,
            state.is_active,
            vector::length(&state.participant_list),
            state.total_tickets
        )
    }

    public fun get_treasury_balance(state: &LotteryState): u64 {
        balance::value(&state.treasury)
    }

    public fun get_last_winners(state: &LotteryState): &vector<Winner> {
        &state.last_winners
    }
}
