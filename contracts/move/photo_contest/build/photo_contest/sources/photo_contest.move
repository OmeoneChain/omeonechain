/// BocaBoca Photo Contest Module v1.0 "Serendipity Sunday"
/// Weekly photo contest with community voting
/// 
/// CHANGES FROM v0.8:
/// - All prizes 10× (1st: 10 → 100 BOCA, 2nd: 5 → 50 BOCA, 3rd: 3 → 30 BOCA)
/// - Added NOMINATION_REWARD: 0.5 BOCA per nomination (was missing)
/// - Total pool: 18 → 180 BOCA

module photo_contest::photo_contest {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::table::{Self, Table};
    use std::vector;
    use std::string::String;

    // Import TOKEN type from deployed token module
    use bocaboca::token::TOKEN;

    // ============================================
    // CONSTANTS - v1.0 White Paper Specifications
    // ============================================
    
    /// Token decimals
    const DECIMALS: u64 = 1_000_000;

    /// Prize amounts - UPDATED 10× for v1.0
    const FIRST_PLACE_PRIZE: u64 = 100_000_000;      // 100 BOCA (was 10)
    const SECOND_PLACE_PRIZE: u64 = 50_000_000;      // 50 BOCA (was 5)
    const THIRD_PLACE_PRIZE: u64 = 30_000_000;       // 30 BOCA (was 3)
    
    /// Total prize pool
    const TOTAL_PRIZE_POOL: u64 = 180_000_000;       // 180 BOCA (was 18)

    /// Participation reward - NEW in v1.0
    const NOMINATION_REWARD: u64 = 500_000;          // 0.5 BOCA per nomination

    /// Contest configuration
    const MAX_FINALISTS: u64 = 10;
    const MIN_NOMINATIONS: u64 = 5;  // Minimum nominations to proceed

    /// Feature rewards
    const FIRST_PLACE_FEATURE: vector<u8> = b"homepage";
    const SECOND_PLACE_FEATURE: vector<u8> = b"banner";
    const THIRD_PLACE_FEATURE: vector<u8> = b"banner";

    /// Contest phases (days of week, 0 = Sunday)
    /// Monday-Wednesday: Nominations
    /// Thursday AM: Finalist selection
    /// Thursday-Saturday: Voting
    /// Sunday 8:15 PM: Winner announcement

    /// Phase durations in milliseconds
    const NOMINATION_PHASE_MS: u64 = 259_200_000;  // 3 days (Mon-Wed)
    const SELECTION_PHASE_MS: u64 = 43_200_000;    // 12 hours (Thu AM)
    const VOTING_PHASE_MS: u64 = 216_000_000;      // 2.5 days (Thu PM - Sat)
    
    /// Day in milliseconds
    const DAY_MS: u64 = 86_400_000;

    // ============================================
    // ERRORS
    // ============================================
    
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_WRONG_PHASE: u64 = 2;
    const E_ALREADY_NOMINATED: u64 = 3;
    const E_NOT_FINALIST: u64 = 4;
    const E_ALREADY_VOTED: u64 = 5;
    const E_INSUFFICIENT_TREASURY: u64 = 6;
    const E_CONTEST_NOT_ACTIVE: u64 = 7;
    const E_INVALID_PHOTO: u64 = 8;
    const E_SELF_NOMINATION: u64 = 9;

    // ============================================
    // ENUMS
    // ============================================

    /// Contest phases
    const PHASE_INACTIVE: u8 = 0;
    const PHASE_NOMINATIONS: u8 = 1;
    const PHASE_SELECTION: u8 = 2;
    const PHASE_VOTING: u8 = 3;
    const PHASE_COMPLETE: u8 = 4;

    // ============================================
    // STRUCTS
    // ============================================

    /// Photo contest state - shared object
    public struct PhotoContestState has key {
        id: UID,
        /// Current contest week
        current_week: u64,
        /// Current phase
        current_phase: u8,
        /// Phase start timestamp
        phase_start: u64,
        /// Treasury for prizes
        treasury: Balance<TOKEN>,
        /// Total prizes distributed all-time
        total_distributed: u64,
        /// Nominations this week (recommendation_id -> nomination)
        nominations: Table<ID, PhotoNomination>,
        /// Nomination IDs for iteration
        nomination_list: vector<ID>,
        /// Selected finalists
        finalists: vector<ID>,
        /// Votes (voter -> recommendation_id voted for)
        votes: Table<address, ID>,
        /// Vote counts per finalist
        vote_counts: Table<ID, u64>,
        /// Previous winners
        last_winners: vector<ContestWinner>,
    }

    /// Photo nomination entry
    public struct PhotoNomination has store, drop {
        /// Recommendation ID containing the photo
        recommendation_id: ID,
        /// Photo URL/IPFS hash
        photo_url: String,
        /// Nominator address
        nominator: address,
        /// Photo author address
        author: address,
        /// Nomination timestamp
        nominated_at: u64,
        /// Is finalist
        is_finalist: bool,
        /// Vote count (only counted if finalist)
        votes: u64,
    }

    /// Contest winner record
    public struct ContestWinner has store, drop, copy {
        recommendation_id: ID,
        author: address,
        place: u8,
        prize_amount: u64,
        feature_type: vector<u8>,
        votes: u64,
        week: u64,
    }

    /// Admin capability
    public struct ContestAdminCap has key, store {
        id: UID,
    }

    /// Nomination receipt (proof of participation)
    public struct NominationReceipt has key, store {
        id: UID,
        nominator: address,
        recommendation_id: ID,
        week: u64,
        reward_earned: u64,
    }

    /// Vote receipt
    public struct VoteReceipt has key, store {
        id: UID,
        voter: address,
        voted_for: ID,
        week: u64,
    }

    // ============================================
    // EVENTS
    // ============================================

    public struct PhotoNominated has copy, drop {
        recommendation_id: ID,
        nominator: address,
        author: address,
        week: u64,
        reward_earned: u64,
    }

    public struct FinalistsSelected has copy, drop {
        week: u64,
        finalist_count: u64,
        finalist_ids: vector<ID>,
    }

    public struct VoteCast has copy, drop {
        voter: address,
        voted_for: ID,
        week: u64,
    }

    public struct ContestWinnersAnnounced has copy, drop {
        week: u64,
        first_place: ID,
        second_place: ID,
        third_place: ID,
        total_votes: u64,
    }

    public struct PhaseChanged has copy, drop {
        week: u64,
        old_phase: u8,
        new_phase: u8,
        timestamp: u64,
    }

    public struct ParticipationRewardPaid has copy, drop {
        recipient: address,
        amount: u64,
        week: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    fun init(ctx: &mut TxContext) {
        let admin_cap = ContestAdminCap {
            id: object::new(ctx),
        };

        let contest_state = PhotoContestState {
            id: object::new(ctx),
            current_week: 0,
            current_phase: PHASE_INACTIVE,
            phase_start: 0,
            treasury: balance::zero(),
            total_distributed: 0,
            nominations: table::new(ctx),
            nomination_list: vector::empty(),
            finalists: vector::empty(),
            votes: table::new(ctx),
            vote_counts: table::new(ctx),
            last_winners: vector::empty(),
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(contest_state);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Start a new contest week (nominations phase)
    public entry fun start_nominations(
        _admin: &ContestAdminCap,
        state: &mut PhotoContestState,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(
            state.current_phase == PHASE_INACTIVE || state.current_phase == PHASE_COMPLETE,
            E_CONTEST_NOT_ACTIVE
        );
        
        let now = clock::timestamp_ms(clock);
        let old_phase = state.current_phase;
        
        // Clear previous week data
        clear_contest_data(state);
        
        state.current_week = state.current_week + 1;
        state.current_phase = PHASE_NOMINATIONS;
        state.phase_start = now;

        event::emit(PhaseChanged {
            week: state.current_week,
            old_phase,
            new_phase: PHASE_NOMINATIONS,
            timestamp: now,
        });
    }

    /// Select finalists (random selection from nominations)
    public entry fun select_finalists(
        _admin: &ContestAdminCap,
        state: &mut PhotoContestState,
        vrf_seed: vector<u8>,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(state.current_phase == PHASE_NOMINATIONS, E_WRONG_PHASE);
        
        let now = clock::timestamp_ms(clock);
        let old_phase = state.current_phase;
        
        let num_nominations = vector::length(&state.nomination_list);
        
        // Select up to MAX_FINALISTS randomly
        let num_finalists = if (num_nominations > MAX_FINALISTS) {
            MAX_FINALISTS
        } else {
            num_nominations
        };

        // Random selection
        let selected = random_select_finalists(state, &vrf_seed, num_finalists);
        
        // Mark finalists and initialize vote counts
        let mut i = 0;
        while (i < vector::length(&selected)) {
            let rec_id = *vector::borrow(&selected, i);
            
            // Mark as finalist
            if (table::contains(&state.nominations, rec_id)) {
                let nom = table::borrow_mut(&mut state.nominations, rec_id);
                nom.is_finalist = true;
            };
            
            // Initialize vote count
            table::add(&mut state.vote_counts, rec_id, 0);
            
            i = i + 1;
        };

        state.finalists = selected;
        state.current_phase = PHASE_VOTING;
        state.phase_start = now;

        event::emit(FinalistsSelected {
            week: state.current_week,
            finalist_count: vector::length(&state.finalists),
            finalist_ids: state.finalists,
        });

        event::emit(PhaseChanged {
            week: state.current_week,
            old_phase,
            new_phase: PHASE_VOTING,
            timestamp: now,
        });
    }

    /// Announce winners and distribute prizes
    public entry fun announce_winners(
        _admin: &ContestAdminCap,
        state: &mut PhotoContestState,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(state.current_phase == PHASE_VOTING, E_WRONG_PHASE);
        
        let now = clock::timestamp_ms(clock);
        
        // Sort finalists by vote count
        let sorted = sort_by_votes(state);
        
        // Ensure we have enough finalists
        let num_finalists = vector::length(&sorted);
        if (num_finalists < 3) {
            // Not enough participation, rollover
            state.current_phase = PHASE_COMPLETE;
            return
        };

        // Get top 3
        let first_id = *vector::borrow(&sorted, 0);
        let second_id = *vector::borrow(&sorted, 1);
        let third_id = *vector::borrow(&sorted, 2);

        // Calculate total votes
        let mut total_votes = 0u64;
        let mut i = 0;
        while (i < num_finalists) {
            let id = *vector::borrow(&sorted, i);
            total_votes = total_votes + *table::borrow(&state.vote_counts, id);
            i = i + 1;
        };

        // Create winner records and pay prizes
        let mut winners = vector::empty<ContestWinner>();

        // First place
        let first_nom = table::borrow(&state.nominations, first_id);
        let first_winner = ContestWinner {
            recommendation_id: first_id,
            author: first_nom.author,
            place: 1,
            prize_amount: FIRST_PLACE_PRIZE,
            feature_type: FIRST_PLACE_FEATURE,
            votes: first_nom.votes,
            week: state.current_week,
        };
        pay_prize(state, first_nom.author, FIRST_PLACE_PRIZE, ctx);
        vector::push_back(&mut winners, first_winner);

        // Second place
        let second_nom = table::borrow(&state.nominations, second_id);
        let second_winner = ContestWinner {
            recommendation_id: second_id,
            author: second_nom.author,
            place: 2,
            prize_amount: SECOND_PLACE_PRIZE,
            feature_type: SECOND_PLACE_FEATURE,
            votes: second_nom.votes,
            week: state.current_week,
        };
        pay_prize(state, second_nom.author, SECOND_PLACE_PRIZE, ctx);
        vector::push_back(&mut winners, second_winner);

        // Third place
        let third_nom = table::borrow(&state.nominations, third_id);
        let third_winner = ContestWinner {
            recommendation_id: third_id,
            author: third_nom.author,
            place: 3,
            prize_amount: THIRD_PLACE_PRIZE,
            feature_type: THIRD_PLACE_FEATURE,
            votes: third_nom.votes,
            week: state.current_week,
        };
        pay_prize(state, third_nom.author, THIRD_PLACE_PRIZE, ctx);
        vector::push_back(&mut winners, third_winner);

        state.last_winners = winners;
        state.current_phase = PHASE_COMPLETE;

        event::emit(ContestWinnersAnnounced {
            week: state.current_week,
            first_place: first_id,
            second_place: second_id,
            third_place: third_id,
            total_votes,
        });

        event::emit(PhaseChanged {
            week: state.current_week,
            old_phase: PHASE_VOTING,
            new_phase: PHASE_COMPLETE,
            timestamp: now,
        });
    }

    /// Fund the contest treasury
    public entry fun fund_contest(
        state: &mut PhotoContestState,
        payment: Coin<TOKEN>,
        _ctx: &mut TxContext
    ) {
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut state.treasury, payment_balance);
    }

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    /// Nominate a photo for the contest
    /// v1.0: Now pays NOMINATION_REWARD to nominator
    public entry fun nominate_photo(
        state: &mut PhotoContestState,
        recommendation_id: ID,
        photo_url: String,
        author: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(state.current_phase == PHASE_NOMINATIONS, E_WRONG_PHASE);
        
        let sender = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Cannot nominate own photo
        assert!(sender != author, E_SELF_NOMINATION);
        
        // Cannot nominate same photo twice
        assert!(!table::contains(&state.nominations, recommendation_id), E_ALREADY_NOMINATED);

        // Create nomination
        let nomination = PhotoNomination {
            recommendation_id,
            photo_url,
            nominator: sender,
            author,
            nominated_at: now,
            is_finalist: false,
            votes: 0,
        };

        table::add(&mut state.nominations, recommendation_id, nomination);
        vector::push_back(&mut state.nomination_list, recommendation_id);

        // v1.0: Pay participation reward to nominator
        let mut reward_paid = 0u64;
        if (balance::value(&state.treasury) >= NOMINATION_REWARD) {
            let reward = coin::take(&mut state.treasury, NOMINATION_REWARD, ctx);
            transfer::public_transfer(reward, sender);
            state.total_distributed = state.total_distributed + NOMINATION_REWARD;
            reward_paid = NOMINATION_REWARD;

            event::emit(ParticipationRewardPaid {
                recipient: sender,
                amount: NOMINATION_REWARD,
                week: state.current_week,
            });
        };

        // Create receipt for nominator
        let receipt = NominationReceipt {
            id: object::new(ctx),
            nominator: sender,
            recommendation_id,
            week: state.current_week,
            reward_earned: reward_paid,
        };
        transfer::transfer(receipt, sender);

        event::emit(PhotoNominated {
            recommendation_id,
            nominator: sender,
            author,
            week: state.current_week,
            reward_earned: reward_paid,
        });
    }

    /// Cast vote for a finalist
    public entry fun vote(
        state: &mut PhotoContestState,
        recommendation_id: ID,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(state.current_phase == PHASE_VOTING, E_WRONG_PHASE);
        
        let sender = tx_context::sender(ctx);
        
        // Check not already voted
        assert!(!table::contains(&state.votes, sender), E_ALREADY_VOTED);
        
        // Check voting for a finalist
        assert!(vector::contains(&state.finalists, &recommendation_id), E_NOT_FINALIST);

        // Record vote
        table::add(&mut state.votes, sender, recommendation_id);
        
        // Increment vote count
        let count = table::borrow_mut(&mut state.vote_counts, recommendation_id);
        *count = *count + 1;
        
        // Update nomination record
        if (table::contains(&state.nominations, recommendation_id)) {
            let nom = table::borrow_mut(&mut state.nominations, recommendation_id);
            nom.votes = nom.votes + 1;
        };

        // Create receipt for voter
        let receipt = VoteReceipt {
            id: object::new(ctx),
            voter: sender,
            voted_for: recommendation_id,
            week: state.current_week,
        };
        transfer::transfer(receipt, sender);

        event::emit(VoteCast {
            voter: sender,
            voted_for: recommendation_id,
            week: state.current_week,
        });
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /// Clear contest data for new week
    fun clear_contest_data(state: &mut PhotoContestState) {
        // Clear nominations
        let mut len = vector::length(&state.nomination_list);
        while (len > 0) {
            let id = vector::pop_back(&mut state.nomination_list);
            if (table::contains(&state.nominations, id)) {
                table::remove(&mut state.nominations, id);
            };
            len = len - 1;
        };
        
        // Clear finalists
        state.finalists = vector::empty();
        
        // Note: votes and vote_counts tables would need iteration to clear
        // For simplicity, we recreate them in a real implementation
    }

    /// Random selection of finalists from nominations
    fun random_select_finalists(
        state: &PhotoContestState,
        vrf_seed: &vector<u8>,
        count: u64
    ): vector<ID> {
        let mut selected = vector::empty<ID>();
        let mut available = state.nomination_list; // Copy
        
        let mut i = 0;
        while (i < count && vector::length(&available) > 0) {
            // Generate random index
            let rand = generate_random(vrf_seed, i, vector::length(&available));
            
            // Select and remove
            let selected_id = vector::swap_remove(&mut available, rand);
            vector::push_back(&mut selected, selected_id);
            
            i = i + 1;
        };
        
        selected
    }

    /// Generate pseudo-random number from VRF seed
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

    /// Sort finalists by vote count (descending)
    fun sort_by_votes(state: &PhotoContestState): vector<ID> {
        let mut sorted = state.finalists; // Copy
        let len = vector::length(&sorted);
        
        // Simple bubble sort for small list
        let mut i = 0;
        while (i < len) {
            let mut j = i + 1;
            while (j < len) {
                let id_i = *vector::borrow(&sorted, i);
                let id_j = *vector::borrow(&sorted, j);
                
                let votes_i = *table::borrow(&state.vote_counts, id_i);
                let votes_j = *table::borrow(&state.vote_counts, id_j);
                
                if (votes_j > votes_i) {
                    vector::swap(&mut sorted, i, j);
                };
                
                j = j + 1;
            };
            i = i + 1;
        };
        
        sorted
    }

    /// Pay prize to winner
    fun pay_prize(
        state: &mut PhotoContestState,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        if (balance::value(&state.treasury) >= amount) {
            let prize = coin::take(&mut state.treasury, amount, ctx);
            transfer::public_transfer(prize, recipient);
            state.total_distributed = state.total_distributed + amount;
        };
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /// Get contest state
    public fun get_contest_info(state: &PhotoContestState): (u64, u8, u64, u64) {
        (
            state.current_week,
            state.current_phase,
            vector::length(&state.nomination_list),
            vector::length(&state.finalists)
        )
    }

    /// Get treasury balance
    public fun get_treasury_balance(state: &PhotoContestState): u64 {
        balance::value(&state.treasury)
    }

    /// Get last winners
    public fun get_last_winners(state: &PhotoContestState): &vector<ContestWinner> {
        &state.last_winners
    }

    /// Get prize amounts
    public fun get_first_place_prize(): u64 { FIRST_PLACE_PRIZE }
    public fun get_second_place_prize(): u64 { SECOND_PLACE_PRIZE }
    public fun get_third_place_prize(): u64 { THIRD_PLACE_PRIZE }
    public fun get_total_prize_pool(): u64 { TOTAL_PRIZE_POOL }
    public fun get_nomination_reward(): u64 { NOMINATION_REWARD }

    /// Check if user has voted
    public fun has_voted(state: &PhotoContestState, voter: address): bool {
        table::contains(&state.votes, voter)
    }

    /// Get finalists
    public fun get_finalists(state: &PhotoContestState): &vector<ID> {
        &state.finalists
    }
}
