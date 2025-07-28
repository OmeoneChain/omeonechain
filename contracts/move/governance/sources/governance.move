module omeone::governance {
    use std::string::{String};
    use iota::object::{UID};
    use iota::tx_context::{TxContext};
    use iota::transfer;
    use iota::clock::{Clock};
    use iota::table::{Table};
    use iota::coin::{Coin};
    use iota::balance::{Balance};
    use iota::event;
    
    // One-time witness for initialization
    public struct GOVERNANCE has drop {}
    
    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 501;
    const E_INSUFFICIENT_STAKE: u64 = 502;
    const E_ALREADY_VOTED: u64 = 503;
    const E_PROPOSAL_NOT_ACTIVE: u64 = 504;
    const E_INVALID_PROPOSAL_STATE: u64 = 505;
    const E_EARLY_UNSTAKE: u64 = 506;
    const E_PROPOSAL_EXECUTION_FAILED: u64 = 507;
    const E_UNKNOWN_PROPOSAL: u64 = 508;
    const E_INSUFFICIENT_REPUTATION: u64 = 509;
    const E_INVALID_TIMELOCK: u64 = 510;
    const E_INSUFFICIENT_QUORUM: u64 = 511;
    
    /// Constants
    // Proposal states
    const PROPOSAL_STATE_DRAFT: u8 = 0;
    const PROPOSAL_STATE_ACTIVE: u8 = 1;
    const PROPOSAL_STATE_PASSED: u8 = 2;
    const PROPOSAL_STATE_FAILED: u8 = 3;
    const PROPOSAL_STATE_EXECUTED: u8 = 4;
    const PROPOSAL_STATE_CANCELED: u8 = 5;
    
    // Proposal types
    const PROPOSAL_TYPE_PARAMETER: u8 = 1;
    const PROPOSAL_TYPE_UPGRADE: u8 = 2;
    const PROPOSAL_TYPE_TREASURY: u8 = 3;
    const PROPOSAL_TYPE_CONTENT_POLICY: u8 = 4;
    
    // Stake tiers
    const STAKE_TIER_EXPLORER: u8 = 1;
    const STAKE_TIER_CURATOR: u8 = 2;
    const STAKE_TIER_VALIDATOR: u8 = 3;
    
    // Stake tier requirements (in MIST - 1 TOK = 1_000_000_000 MIST)
    const EXPLORER_STAKE_AMOUNT: u64 = 25_000_000_000; // 25 TOK
    const CURATOR_STAKE_AMOUNT: u64 = 100_000_000_000; // 100 TOK
    const VALIDATOR_STAKE_AMOUNT: u64 = 1_000_000_000_000; // 1000 TOK
    
    // Stake tier minimum durations (in milliseconds)
    const EXPLORER_STAKE_DURATION: u64 = 2_592_000_000; // 30 days
    const CURATOR_STAKE_DURATION: u64 = 7_776_000_000; // 90 days
    const VALIDATOR_STAKE_DURATION: u64 = 31_536_000_000; // 365 days
    
    // Reputation requirements (scaled by 100, so 30 = 0.30)
    const EXPLORER_REPUTATION: u64 = 30; // Trust score 0.3
    const CURATOR_REPUTATION: u64 = 40; // Trust score 0.4
    const VALIDATOR_REPUTATION: u64 = 60; // Trust score 0.6
    
    // Voting weights
    const VALIDATOR_VOTE_WEIGHT_MULTIPLIER: u64 = 150; // 1.5x voting power
    
    // Timelock durations (in milliseconds)
    const STANDARD_TIMELOCK: u64 = 604_800_000; // 7 days
    const CRITICAL_TIMELOCK: u64 = 7_776_000_000; // 90 days
    
    // Quorum requirements (percentage * 100)
    const STANDARD_QUORUM_PERCENTAGE: u64 = 2000; // 20% of staked tokens
    const CRITICAL_QUORUM_PERCENTAGE: u64 = 3000; // 30% of staked tokens
    const MINIMUM_VOTER_COUNT: u64 = 1000; // At least 1000 unique voters for critical proposals
    
    // Early unstake penalty (percentage * 100)
    const EARLY_UNSTAKE_PENALTY_PERCENTAGE: u64 = 500; // 5% penalty
    
    /// Governance parameters
    public struct GovernanceParameters has key {
        id: UID,
        // Fee parameters (percentage * 100)
        fee_burn_percentage: u64, // 7500 = 75%
        service_provider_commission: u64, // 1000 = 10%
        expert_content_fee: u64, // 1500 = 15%
        nft_ticket_fee: u64, // 500 = 5%
        taste_passport_fee: u64, // Fee in MIST
        
        // Reward parameters
        base_reward: u64, // Base reward in MIST
        trust_multiplier_cap: u64, // 300 = 3.0x
        
        // Trust score parameters (percentage * 100)
        direct_follower_weight: u64, // 7500 = 0.75
        indirect_follower_weight: u64, // 2500 = 0.25
        trust_score_threshold: u64, // 2500 = 0.25
        
        // Governance parameters
        proposal_fee: u64, // Fee in MIST
        vote_quorum: u64, // Percentage * 100
        vote_threshold: u64, // Percentage * 100
        
        // Timestamps
        created_at: u64,
        updated_at: u64,
    }
    
    /// Governance registry
    public struct GovernanceRegistry has key {
        id: UID,
        proposals: Table<u64, address>, // proposal_id -> proposal_owner
        next_proposal_id: u64,
        total_staked: u64,
        staked_accounts: vector<address>,
        active_proposals: vector<u64>,
        created_at: u64,
        updated_at: u64,
    }
    
    /// Proposal
    public struct Proposal has key {
        id: UID,
        proposal_id: u64,
        proposer: address,
        proposal_type: u8,
        title: String,
        description: String,
        execution_hash: vector<u8>,
        parameters: Table<String, u64>, // parameter_name -> value
        state: u8,
        votes_for: u64,
        votes_against: u64,
        unique_voters: vector<address>,
        voting_start_time: u64,
        voting_end_time: u64,
        execution_time: u64,
        created_at: u64,
        last_updated: u64,
    }
    
    /// Vote record for a user
    public struct VoteRecord has key {
        id: UID,
        voter: address,
        voted_proposals: Table<u64, bool>, // proposal_id -> vote_value
        vote_power_used: Table<u64, u64>, // proposal_id -> voting_power
        total_votes_cast: u64,
        created_at: u64,
        updated_at: u64,
    }
    
    /// Staked tokens for governance (using generic Balance instead of specific token type)
    public struct StakedTokens<phantom T> has key {
        id: UID,
        staker: address,
        staked_balance: Balance<T>,
        tier: u8,
        locked_until: u64,
        penalty_balance: Balance<T>, // For early unstake penalties
        created_at: u64,
        updated_at: u64,
    }
    
    /// Events
    public struct ProposalCreated has copy, drop {
        proposal_id: u64,
        proposer: address,
        proposal_type: u8,
        title: String,
        voting_end_time: u64,
    }
    
    public struct VoteCast has copy, drop {
        proposal_id: u64,
        voter: address,
        support: bool,
        voting_power: u64,
        timestamp: u64,
    }
    
    public struct ProposalExecuted has copy, drop {
        proposal_id: u64,
        executor: address,
        success: bool,
        timestamp: u64,
    }
    
    public struct TokensStaked has copy, drop {
        staker: address,
        amount: u64,
        tier: u8,
        locked_until: u64,
    }
    
    public struct TokensUnstaked has copy, drop {
        staker: address,
        amount: u64,
        penalty: u64,
        timestamp: u64,
    }
    
    /// Initialize the governance module - called automatically on deployment
    fun init(_witness: GOVERNANCE, ctx: &mut TxContext) {
        use iota::object;
        use iota::table;
        use std::vector;
        
        // Create and share governance registry
        let registry = GovernanceRegistry {
            id: object::new(ctx),
            proposals: table::new<u64, address>(ctx),
            next_proposal_id: 1,
            total_staked: 0,
            staked_accounts: vector::empty<address>(),
            active_proposals: vector::empty<u64>(),
            created_at: 0, // Will be set when first used with clock
            updated_at: 0,
        };
        transfer::share_object(registry);
        
        // Create and share governance parameters
        let parameters = GovernanceParameters {
            id: object::new(ctx),
            fee_burn_percentage: 7500, // 75%
            service_provider_commission: 1000, // 10%
            expert_content_fee: 1500, // 15%
            nft_ticket_fee: 500, // 5%
            taste_passport_fee: 1_000_000_000, // 1 TOK
            
            base_reward: 1_000_000_000, // 1 TOK
            trust_multiplier_cap: 300, // 3.0x
            
            direct_follower_weight: 7500, // 0.75
            indirect_follower_weight: 2500, // 0.25
            trust_score_threshold: 2500, // 0.25
            
            proposal_fee: 100_000_000_000, // 100 TOK
            vote_quorum: 2000, // 20%
            vote_threshold: 5100, // 51%
            
            created_at: 0,
            updated_at: 0,
        };
        transfer::share_object(parameters);
    }
    
    /// Stake tokens for governance participation
    public fun stake_tokens<T>(
        stake_coin: Coin<T>,
        tier: u8,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): StakedTokens<T> {
        use iota::tx_context;
        use iota::coin;
        use iota::clock;
        use iota::object;
        use iota::balance;
        
        let staker = tx_context::sender(ctx);
        let amount = coin::value(&stake_coin);
        
        // Validate tier and amount
        let min_amount = if (tier == STAKE_TIER_EXPLORER) {
            EXPLORER_STAKE_AMOUNT
        } else if (tier == STAKE_TIER_CURATOR) {
            CURATOR_STAKE_AMOUNT
        } else if (tier == STAKE_TIER_VALIDATOR) {
            VALIDATOR_STAKE_AMOUNT
        } else {
            abort E_INSUFFICIENT_STAKE
        };
        
        assert!(amount >= min_amount, E_INSUFFICIENT_STAKE);
        
        // Validate duration
        let min_duration = if (tier == STAKE_TIER_EXPLORER) {
            EXPLORER_STAKE_DURATION
        } else if (tier == STAKE_TIER_CURATOR) {
            CURATOR_STAKE_DURATION
        } else { // VALIDATOR
            VALIDATOR_STAKE_DURATION
        };
        
        assert!(duration_ms >= min_duration, E_INSUFFICIENT_STAKE);
        
        // Calculate lock end time
        let now = clock::timestamp_ms(clock);
        let lock_until = now + duration_ms;
        
        // Create staked tokens object
        let staked = StakedTokens {
            id: object::new(ctx),
            staker,
            staked_balance: coin::into_balance(stake_coin),
            tier,
            locked_until: lock_until,
            penalty_balance: balance::zero<T>(),
            created_at: now,
            updated_at: now,
        };
        
        // Emit event
        event::emit(TokensStaked {
            staker,
            amount,
            tier,
            locked_until: lock_until,
        });
        
        staked
    }
    
    /// Unstake tokens - FIXED: Added mut declarations
    public fun unstake_tokens<T>(
        staked: &mut StakedTokens<T>,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        use iota::clock;
        use iota::balance;
        use iota::coin;
        
        let now = clock::timestamp_ms(clock);
        let staked_amount = balance::value(&staked.staked_balance);
        
        // Validate amount
        assert!(amount > 0 && amount <= staked_amount, E_INSUFFICIENT_STAKE);
        
        // Check if early unstake
        let is_early = now < staked.locked_until;
        let penalty_amount = if (is_early) {
            (amount * EARLY_UNSTAKE_PENALTY_PERCENTAGE) / 10000
        } else {
            0
        };
        
        // Calculate return amount
        let return_amount = amount - penalty_amount;
        
        // Extract tokens from stake - FIXED: Added mut
        let mut unstaked_balance = balance::split(&mut staked.staked_balance, amount);
        let return_balance = balance::split(&mut unstaked_balance, return_amount);
        
        // Add penalty to penalty balance if applicable
        if (penalty_amount > 0) {
            balance::join(&mut staked.penalty_balance, unstaked_balance);
        } else {
            balance::destroy_zero(unstaked_balance);
        };
        
        // Update timestamp
        staked.updated_at = now;
        
        // Convert to coin and return
        let return_coin = coin::from_balance(return_balance, ctx);
        
        // Emit event
        event::emit(TokensUnstaked {
            staker: staked.staker,
            amount,
            penalty: penalty_amount,
            timestamp: now,
        });
        
        return_coin
    }
    
    /// Create a proposal - FIXED: Added mut declarations
    public fun create_proposal(
        proposal_type: u8,
        title: String,
        description: String,
        execution_hash: vector<u8>,
        parameter_names: vector<String>,
        parameter_values: vector<u64>,
        voting_duration_ms: u64,
        staked: &StakedTokens<object::UID>, // Generic placeholder for now
        registry: &mut GovernanceRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ): u64 {
        use iota::tx_context;
        use iota::clock;
        use iota::object;
        use iota::table;
        use std::vector;
        
        let proposer = tx_context::sender(ctx);
        
        // Validate proposal type
        assert!(proposal_type >= PROPOSAL_TYPE_PARAMETER && proposal_type <= PROPOSAL_TYPE_CONTENT_POLICY, 
                E_INVALID_PROPOSAL_STATE);
        
        // Check stake tier - must be CURATOR or higher
        assert!(staked.tier >= STAKE_TIER_CURATOR, E_INSUFFICIENT_STAKE);
        assert!(staked.staker == proposer, E_NOT_AUTHORIZED);
        
        // Ensure parameter arrays have same length
        assert!(vector::length(&parameter_names) == vector::length(&parameter_values), E_INVALID_PROPOSAL_STATE);
        
        // Generate proposal ID
        let proposal_id = registry.next_proposal_id;
        registry.next_proposal_id = registry.next_proposal_id + 1;
        
        // Calculate voting period
        let now = clock::timestamp_ms(clock);
        let voting_end = now + voting_duration_ms;
        let execution_time = voting_end + STANDARD_TIMELOCK;
        
        // Build parameters table - FIXED: Added mut declarations
        let mut parameters = table::new<String, u64>(ctx);
        let mut i = 0;
        let num_params = vector::length(&parameter_names);
        
        while (i < num_params) {
            let name = *vector::borrow(&parameter_names, i);
            let value = *vector::borrow(&parameter_values, i);
            table::add(&mut parameters, name, value);
            i = i + 1;
        };
        
        // Create proposal
        let proposal = Proposal {
            id: object::new(ctx),
            proposal_id,
            proposer,
            proposal_type,
            title: title,
            description: description,
            execution_hash,
            parameters,
            state: PROPOSAL_STATE_ACTIVE,
            votes_for: 0,
            votes_against: 0,
            unique_voters: vector::empty<address>(),
            voting_start_time: now,
            voting_end_time: voting_end,
            execution_time,
            created_at: now,
            last_updated: now,
        };
        
        // Add to registry
        table::add(&mut registry.proposals, proposal_id, proposer);
        vector::push_back(&mut registry.active_proposals, proposal_id);
        registry.updated_at = now;
        
        // Emit event
        event::emit(ProposalCreated {
            proposal_id,
            proposer,
            proposal_type,
            title: title,
            voting_end_time: voting_end,
        });
        
        // Transfer proposal to proposer
        transfer::transfer(proposal, proposer);
        
        proposal_id
    }
    
    /// Vote on a proposal
    public fun vote_on_proposal<T>(
        proposal: &mut Proposal,
        support: bool,
        staked: &StakedTokens<T>,
        vote_record: &mut VoteRecord,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        use iota::tx_context;
        use iota::clock;
        use iota::balance;
        use iota::table;
        use std::vector;
        
        let voter = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Validate voter owns the staked tokens and vote record
        assert!(staked.staker == voter, E_NOT_AUTHORIZED);
        assert!(vote_record.voter == voter, E_NOT_AUTHORIZED);
        
        // Check if proposal is active
        assert!(proposal.state == PROPOSAL_STATE_ACTIVE, E_PROPOSAL_NOT_ACTIVE);
        assert!(now <= proposal.voting_end_time, E_PROPOSAL_NOT_ACTIVE);
        
        // Check if voter has minimum stake
        assert!(staked.tier >= STAKE_TIER_EXPLORER, E_INSUFFICIENT_STAKE);
        
        // Check if already voted
        assert!(!table::contains(&vote_record.voted_proposals, proposal.proposal_id), E_ALREADY_VOTED);
        
        // Calculate voting power
        let base_power = balance::value(&staked.staked_balance);
        let voting_power = if (staked.tier == STAKE_TIER_VALIDATOR) {
            (base_power * VALIDATOR_VOTE_WEIGHT_MULTIPLIER) / 100
        } else {
            base_power
        };
        
        // Update proposal vote counts
        if (support) {
            proposal.votes_for = proposal.votes_for + voting_power;
        } else {
            proposal.votes_against = proposal.votes_against + voting_power;
        };
        
        // Add voter to unique voters if not present
        if (!vector::contains(&proposal.unique_voters, &voter)) {
            vector::push_back(&mut proposal.unique_voters, voter);
        };
        
        // Record vote
        table::add(&mut vote_record.voted_proposals, proposal.proposal_id, support);
        table::add(&mut vote_record.vote_power_used, proposal.proposal_id, voting_power);
        vote_record.total_votes_cast = vote_record.total_votes_cast + 1;
        vote_record.updated_at = now;
        
        // Update proposal
        proposal.last_updated = now;
        
        // Emit event
        event::emit(VoteCast {
            proposal_id: proposal.proposal_id,
            voter,
            support,
            voting_power,
            timestamp: now,
        });
        
        // Check if proposal should be finalized
        check_and_finalize_proposal(proposal, clock);
    }
    
    /// Execute a passed proposal
    public fun execute_proposal(
        proposal: &mut Proposal,
        parameters: &mut GovernanceParameters,
        clock: &Clock,
        ctx: &mut TxContext
    ): bool {
        use iota::tx_context;
        use iota::clock;
        
        let executor = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Check if proposal is passed
        assert!(proposal.state == PROPOSAL_STATE_PASSED, E_INVALID_PROPOSAL_STATE);
        
        // Check if timelock period has elapsed
        assert!(now >= proposal.execution_time, E_INVALID_TIMELOCK);
        
        // Execute based on proposal type
        let success = if (proposal.proposal_type == PROPOSAL_TYPE_PARAMETER) {
            execute_parameter_change(proposal, parameters);
            true
        } else {
            // Other proposal types would be implemented here
            false
        };
        
        // Update proposal state
        if (success) {
            proposal.state = PROPOSAL_STATE_EXECUTED;
        } else {
            proposal.state = PROPOSAL_STATE_FAILED;
        };
        proposal.last_updated = now;
        
        // Emit event
        event::emit(ProposalExecuted {
            proposal_id: proposal.proposal_id,
            executor,
            success,
            timestamp: now,
        });
        
        success
    }
    
    /// Create vote record for a user
    public fun create_vote_record(ctx: &mut TxContext): VoteRecord {
        use iota::tx_context;
        use iota::object;
        use iota::table;
        
        let voter = tx_context::sender(ctx);
        
        VoteRecord {
            id: object::new(ctx),
            voter,
            voted_proposals: table::new<u64, bool>(ctx),
            vote_power_used: table::new<u64, u64>(ctx),
            total_votes_cast: 0,
            created_at: 0, // Will be set when first used
            updated_at: 0,
        }
    }
    
    /// Check and finalize proposal status
    fun check_and_finalize_proposal(proposal: &mut Proposal, clock: &Clock) {
        use iota::clock;
        use std::vector;
        
        let now = clock::timestamp_ms(clock);
        
        if (now > proposal.voting_end_time && proposal.state == PROPOSAL_STATE_ACTIVE) {
            let total_votes = proposal.votes_for + proposal.votes_against;
            let voter_count = vector::length(&proposal.unique_voters);
            
            // Simple quorum check (would be more sophisticated in production)
            let quorum_reached = total_votes > 0 && voter_count >= 10;
            let threshold_reached = proposal.votes_for > proposal.votes_against;
            
            if (quorum_reached && threshold_reached) {
                proposal.state = PROPOSAL_STATE_PASSED;
            } else {
                proposal.state = PROPOSAL_STATE_FAILED;
            };
            
            proposal.last_updated = now;
        };
    }
    
    /// Execute parameter change
    fun execute_parameter_change(_proposal: &Proposal, parameters: &mut GovernanceParameters) {
        // This would iterate through the parameters table and update governance parameters
        // Implementation would check each parameter name and update accordingly
        parameters.updated_at = 0; // Would use proper timestamp in production
    }
    
    /// Get proposal info
    public fun get_proposal_info(proposal: &Proposal): (u64, u8, u64, u64, u64, u64, u64) {
        use std::vector;
        
        (
            proposal.proposal_id,
            proposal.state,
            proposal.votes_for,
            proposal.votes_against,
            vector::length(&proposal.unique_voters),
            proposal.voting_start_time,
            proposal.voting_end_time
        )
    }
    
    /// Get stake info
    public fun get_stake_info<T>(staked: &StakedTokens<T>): (u64, u8, u64, u64) {
        use iota::balance;
        
        (
            balance::value(&staked.staked_balance),
            staked.tier,
            staked.locked_until,
            balance::value(&staked.penalty_balance)
        )
    }
    
    /// Get governance parameters
    public fun get_parameters(parameters: &GovernanceParameters): (u64, u64, u64, u64, u64) {
        (
            parameters.fee_burn_percentage,
            parameters.trust_multiplier_cap,
            parameters.trust_score_threshold,
            parameters.vote_quorum,
            parameters.vote_threshold
        )
    }
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        use iota::object;
        use iota::table;
        use std::vector;
        
        let registry = GovernanceRegistry {
            id: object::new(ctx),
            proposals: table::new<u64, address>(ctx),
            next_proposal_id: 1,
            total_staked: 0,
            staked_accounts: vector::empty<address>(),
            active_proposals: vector::empty<u64>(),
            created_at: 0,
            updated_at: 0,
        };
        let parameters = GovernanceParameters {
            id: object::new(ctx),
            fee_burn_percentage: 7500,
            service_provider_commission: 1000,
            expert_content_fee: 1500,
            nft_ticket_fee: 500,
            taste_passport_fee: 1_000_000_000,
            base_reward: 1_000_000_000,
            trust_multiplier_cap: 300,
            direct_follower_weight: 7500,
            indirect_follower_weight: 2500,
            trust_score_threshold: 2500,
            proposal_fee: 100_000_000_000,
            vote_quorum: 2000,
            vote_threshold: 5100,
            created_at: 0,
            updated_at: 0,
        };
        
        transfer::share_object(registry);
        transfer::share_object(parameters);
    }
}