/// Discovery Incentives Module for OmeoneChain
/// Manages governance-controlled incentive campaigns funded by ecosystem pool
/// Supports geographic, category, and quality-based discovery bonuses

module omeone::discovery_incentives {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;
    use std::vector;
    use std::string::{Self, String};
    
    use omeone::common::{
        Self,
        get_current_timestamp
    };

    // Error codes
    const E_INVALID_CAMPAIGN_ID: u64 = 1;
    const E_CAMPAIGN_NOT_ACTIVE: u64 = 2;
    const E_INSUFFICIENT_BUDGET: u64 = 3;
    const E_INVALID_PARAMETERS: u64 = 4;
    const E_UNAUTHORIZED_ACCESS: u64 = 5;
    const E_CAMPAIGN_ALREADY_EXISTS: u64 = 6;
    const E_INVALID_METRICS: u64 = 7;
    const E_USER_ALREADY_CLAIMED: u64 = 8;
    const E_QUALITY_THRESHOLD_NOT_MET: u64 = 9;
    const E_CAMPAIGN_BUDGET_EXCEEDED: u64 = 10;

    // Campaign types
    const CAMPAIGN_TYPE_GEOGRAPHIC: u8 = 1;
    const CAMPAIGN_TYPE_CATEGORY: u8 = 2;
    const CAMPAIGN_TYPE_QUALITY: u8 = 3;
    const CAMPAIGN_TYPE_NETWORK: u8 = 4;
    const CAMPAIGN_TYPE_BRIDGE_BUILDER: u8 = 5;

    // Campaign status
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_PAUSED: u8 = 2;
    const STATUS_COMPLETED: u8 = 3;
    const STATUS_CANCELLED: u8 = 4;

    // Performance thresholds
    const HIGH_PERFORMANCE_THRESHOLD: u64 = 3000; // 3x ROI
    const LOW_PERFORMANCE_THRESHOLD: u64 = 1500;  // 1.5x ROI
    const QUALITY_SCORE_MINIMUM: u64 = 300;       // 0.30 trust score minimum

    /// Geographic/neighborhood discovery incentive
    struct GeographicIncentive has store, copy, drop {
        region_id: String,               // "lisbon_alfama", "sao_paulo_vila_madalena"
        bonus_multiplier: u64,           // 150 = 1.5x normal rewards
        target_recommendations: u64,     // Stop bonus after N recommendations
        current_count: u64,              // Recommendations claimed so far
        active_until: u64,               // Expiration timestamp
        min_trust_score: u64             // Minimum trust score to qualify
    }

    /// Category-based incentive for content gaps
    struct CategoryIncentive has store, copy, drop {
        category: String,                // "breakfast", "date_night", "family_friendly"
        quality_threshold: u64,          // Minimum trust score (e.g., 0.4)
        bonus_tokens: u64,              // Flat bonus per recommendation
        monthly_cap_per_user: u64,      // Max bonus per user per month
        total_monthly_budget: u64,      // Total budget for this category
        current_month_spent: u64        // Spent in current month
    }

    /// Quality and engagement incentive
    struct QualityIncentive has store, copy, drop {
        metric_type: u8,                // 1=high_engagement, 2=cross_platform, 3=repeat_visits
        performance_threshold: u64,     // Trigger level (e.g., >10 upvotes)
        reward_multiplier: u64,         // Applied to base rewards
        evaluation_period: u64,         // Window for measuring performance (days)
        max_claims_per_user: u64        // Limit per user
    }

    /// Social network building incentive
    struct NetworkIncentive has store, copy, drop {
        incentive_type: u8,             // 1=first_follower, 2=diverse_network, 3=bridge_builder
        threshold: u64,                 // Trigger point (e.g., 10 followers)
        reward_amount: u64,             // One-time or recurring reward
        max_claims_per_user: u64,       // Per user limit
        geographic_requirement: bool,    // Must be from different cities
        min_reputation_requirement: u64 // Minimum recipient reputation
    }

    /// Discovery incentive campaign
    struct DiscoveryCampaign has key, store {
        id: UID,
        campaign_name: String,
        campaign_type: u8,
        creator: address,               // Campaign creator (governance)
        
        // Campaign parameters
        geographic_incentive: option::Option<GeographicIncentive>,
        category_incentive: option::Option<CategoryIncentive>,
        quality_incentive: option::Option<QualityIncentive>,
        network_incentive: option::Option<NetworkIncentive>,
        
        // Budget and performance
        total_budget: u64,              // Total tokens allocated
        remaining_budget: u64,          // Tokens available for distribution
        tokens_distributed: u64,       // Total tokens distributed
        
        // Timeline
        start_time: u64,
        end_time: u64,
        status: u8,
        
        // Performance tracking
        target_metrics: vector<u64>,    // Success targets
        actual_metrics: vector<u64>,    // Current performance
        roi_multiplier: u64,            // Performance ratio (basis points)
        
        // User tracking
        user_claims: Table<address, UserCampaignData>
    }

    /// User's participation in campaign
    struct UserCampaignData has store, copy, drop {
        total_claimed: u64,             // Total tokens claimed
        claims_this_month: u64,         // Claims in current month
        last_claim_time: u64,           // Most recent claim
        recommendations_count: u64,     // Recommendations submitted
        average_quality: u64,           // Average trust score achieved
        month_of_last_claim: u64        // Track monthly limits
    }

    /// Global discovery incentive pool
    struct DiscoveryIncentivePool has key {
        id: UID,
        
        // Funding sources
        ecosystem_allocation: Balance<omeone::token::OMEONE>,
        partnership_contributions: Balance<omeone::token::OMEONE>,
        revenue_reinvestment: Balance<omeone::token::OMEONE>,
        
        // Budget management
        monthly_budget_limit: u64,      // Governance-set monthly spend limit
        current_month_spent: u64,       // Spent in current month
        reserve_ratio: u64,             // Percentage kept in reserve
        current_month: u64,             // Track month for budget reset
        
        // Campaign registry
        active_campaigns: Table<ID, DiscoveryCampaign>,
        campaign_performance: Table<ID, CampaignMetrics>,
        
        // Governance
        authorized_creators: vector<address>, // Who can create campaigns
        min_proposal_stake: u64         // Minimum stake to propose campaign
    }

    /// Campaign performance metrics
    struct CampaignMetrics has store, copy, drop {
        target_recommendations: u64,
        actual_recommendations: u64,
        target_quality_score: u64,      // Average trust score target
        actual_quality_score: u64,      // Achieved average trust score
        cost_per_quality_recommendation: u64,
        roi_multiplier: u64,            // Performance vs. target
        user_acquisition_count: u64,    // New users attracted
        platform_activity_boost: u64    // % increase in activity
    }

    // Events
    struct CampaignCreated has copy, drop {
        campaign_id: ID,
        creator: address,
        campaign_type: u8,
        total_budget: u64,
        start_time: u64,
        end_time: u64
    }

    struct IncentiveAwarded has copy, drop {
        campaign_id: ID,
        user: address,
        incentive_type: String,
        amount: u64,
        recommendation_id: ID,
        quality_score: u64,
        timestamp: u64
    }

    struct CampaignStatusChanged has copy, drop {
        campaign_id: ID,
        old_status: u8,
        new_status: u8,
        reason: String,
        timestamp: u64
    }

    struct BudgetUpdated has copy, drop {
        campaign_id: ID,
        previous_budget: u64,
        new_budget: u64,
        reason: String,
        timestamp: u64
    }

    struct PerformanceAssessment has copy, drop {
        campaign_id: ID,
        roi_multiplier: u64,
        recommendations_generated: u64,
        average_quality: u64,
        budget_efficiency: u64,
        timestamp: u64
    }

    /// Initialize the discovery incentive system
    fun init(ctx: &mut TxContext) {
        let pool = DiscoveryIncentivePool {
            id: object::new(ctx),
            
            ecosystem_allocation: balance::zero(),
            partnership_contributions: balance::zero(),
            revenue_reinvestment: balance::zero(),
            
            monthly_budget_limit: 50_000_000_000_000, // 50M tokens per month
            current_month_spent: 0,
            reserve_ratio: 2000, // 20% reserve
            current_month: get_current_month(),
            
            active_campaigns: table::new(ctx),
            campaign_performance: table::new(ctx),
            
            authorized_creators: vector::empty(),
            min_proposal_stake: 100_000_000_000 // 100 TOK minimum stake
        };
        
        transfer::share_object(pool);
    }

    /// Create a geographic discovery campaign
    public fun create_geographic_campaign(
        creator: &signer,
        campaign_name: String,
        region_id: String,
        bonus_multiplier: u64,
        target_recommendations: u64,
        duration_days: u64,
        total_budget: u64,
        min_trust_score: u64,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ): ID {
        let creator_addr = tx_context::sender(ctx);
        assert!(vector::contains(&pool.authorized_creators, &creator_addr), E_UNAUTHORIZED_ACCESS);
        assert!(total_budget <= pool.monthly_budget_limit, E_INSUFFICIENT_BUDGET);
        assert!(bonus_multiplier >= 1000 && bonus_multiplier <= 3000, E_INVALID_PARAMETERS); // 1x to 3x

        let current_time = get_current_timestamp();
        let end_time = current_time + (duration_days * 24 * 60 * 60 * 1000); // Convert days to milliseconds

        let geographic_incentive = GeographicIncentive {
            region_id,
            bonus_multiplier,
            target_recommendations,
            current_count: 0,
            active_until: end_time,
            min_trust_score
        };

        let campaign = DiscoveryCampaign {
            id: object::new(ctx),
            campaign_name,
            campaign_type: CAMPAIGN_TYPE_GEOGRAPHIC,
            creator: creator_addr,
            
            geographic_incentive: option::some(geographic_incentive),
            category_incentive: option::none(),
            quality_incentive: option::none(),
            network_incentive: option::none(),
            
            total_budget,
            remaining_budget: total_budget,
            tokens_distributed: 0,
            
            start_time: current_time,
            end_time,
            status: STATUS_ACTIVE,
            
            target_metrics: vector::singleton(target_recommendations),
            actual_metrics: vector::singleton(0),
            roi_multiplier: 10000, // Start at 1x (100%)
            
            user_claims: table::new(ctx)
        };

        let campaign_id = object::id(&campaign);
        table::add(&mut pool.active_campaigns, campaign_id, campaign);

        event::emit(CampaignCreated {
            campaign_id,
            creator: creator_addr,
            campaign_type: CAMPAIGN_TYPE_GEOGRAPHIC,
            total_budget,
            start_time: current_time,
            end_time
        });

        campaign_id
    }

    /// Create a category-based discovery campaign
    public fun create_category_campaign(
        creator: &signer,
        campaign_name: String,
        category: String,
        quality_threshold: u64,
        bonus_tokens: u64,
        monthly_cap_per_user: u64,
        total_monthly_budget: u64,
        duration_days: u64,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ): ID {
        let creator_addr = tx_context::sender(ctx);
        assert!(vector::contains(&pool.authorized_creators, &creator_addr), E_UNAUTHORIZED_ACCESS);
        assert!(total_monthly_budget <= pool.monthly_budget_limit, E_INSUFFICIENT_BUDGET);
        assert!(quality_threshold >= QUALITY_SCORE_MINIMUM, E_INVALID_PARAMETERS);

        let current_time = get_current_timestamp();
        let end_time = current_time + (duration_days * 24 * 60 * 60 * 1000);

        let category_incentive = CategoryIncentive {
            category,
            quality_threshold,
            bonus_tokens,
            monthly_cap_per_user,
            total_monthly_budget,
            current_month_spent: 0
        };

        let campaign = DiscoveryCampaign {
            id: object::new(ctx),
            campaign_name,
            campaign_type: CAMPAIGN_TYPE_CATEGORY,
            creator: creator_addr,
            
            geographic_incentive: option::none(),
            category_incentive: option::some(category_incentive),
            quality_incentive: option::none(),
            network_incentive: option::none(),
            
            total_budget: total_monthly_budget,
            remaining_budget: total_monthly_budget,
            tokens_distributed: 0,
            
            start_time: current_time,
            end_time,
            status: STATUS_ACTIVE,
            
            target_metrics: vector::empty(),
            actual_metrics: vector::empty(),
            roi_multiplier: 10000,
            
            user_claims: table::new(ctx)
        };

        let campaign_id = object::id(&campaign);
        table::add(&mut pool.active_campaigns, campaign_id, campaign);

        event::emit(CampaignCreated {
            campaign_id,
            creator: creator_addr,
            campaign_type: CAMPAIGN_TYPE_CATEGORY,
            total_budget: total_monthly_budget,
            start_time: current_time,
            end_time
        });

        campaign_id
    }

    /// Claim geographic incentive bonus
    public fun claim_geographic_incentive(
        user: &signer,
        campaign_id: ID,
        recommendation_id: ID,
        trust_score: u64,
        region_id: String,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ): u64 {
        let user_addr = tx_context::sender(ctx);
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        assert!(campaign.status == STATUS_ACTIVE, E_CAMPAIGN_NOT_ACTIVE);
        assert!(option::is_some(&campaign.geographic_incentive), E_INVALID_PARAMETERS);
        
        let geo_incentive = option::borrow(&campaign.geographic_incentive);
        assert!(trust_score >= geo_incentive.min_trust_score, E_QUALITY_THRESHOLD_NOT_MET);
        assert!(geo_incentive.region_id == region_id, E_INVALID_PARAMETERS);
        assert!(geo_incentive.current_count < geo_incentive.target_recommendations, E_CAMPAIGN_BUDGET_EXCEEDED);

        // Calculate bonus amount (base reward × multiplier)
        let base_reward = 1_000_000_000_000; // 1 TOK in base units
        let bonus_amount = (base_reward * geo_incentive.bonus_multiplier) / 1000;
        
        assert!(campaign.remaining_budget >= bonus_amount, E_INSUFFICIENT_BUDGET);

        // Update campaign
        campaign.remaining_budget = campaign.remaining_budget - bonus_amount;
        campaign.tokens_distributed = campaign.tokens_distributed + bonus_amount;
        
        // Update geographic incentive
        let geo_incentive_mut = option::borrow_mut(&mut campaign.geographic_incentive);
        geo_incentive_mut.current_count = geo_incentive_mut.current_count + 1;

        // Update or create user campaign data
        update_user_campaign_data(campaign, user_addr, bonus_amount, trust_score, ctx);

        // Update pool spending
        pool.current_month_spent = pool.current_month_spent + bonus_amount;

        event::emit(IncentiveAwarded {
            campaign_id,
            user: user_addr,
            incentive_type: string::utf8(b"geographic_bonus"),
            amount: bonus_amount,
            recommendation_id,
            quality_score: trust_score,
            timestamp: get_current_timestamp()
        });

        bonus_amount
    }

    /// Claim category incentive bonus
    public fun claim_category_incentive(
        user: &signer,
        campaign_id: ID,
        recommendation_id: ID,
        trust_score: u64,
        category: String,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ): u64 {
        let user_addr = tx_context::sender(ctx);
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        assert!(campaign.status == STATUS_ACTIVE, E_CAMPAIGN_NOT_ACTIVE);
        assert!(option::is_some(&campaign.category_incentive), E_INVALID_PARAMETERS);
        
        let cat_incentive = option::borrow(&campaign.category_incentive);
        assert!(trust_score >= cat_incentive.quality_threshold, E_QUALITY_THRESHOLD_NOT_MET);
        assert!(cat_incentive.category == category, E_INVALID_PARAMETERS);

        // Check monthly cap
        let current_month = get_current_month();
        if (table::contains(&campaign.user_claims, user_addr)) {
            let user_data = table::borrow(&campaign.user_claims, user_addr);
            if (user_data.month_of_last_claim == current_month) {
                assert!(user_data.claims_this_month < cat_incentive.monthly_cap_per_user, E_USER_ALREADY_CLAIMED);
            };
        };

        let bonus_amount = cat_incentive.bonus_tokens;
        assert!(campaign.remaining_budget >= bonus_amount, E_INSUFFICIENT_BUDGET);

        // Update campaign
        campaign.remaining_budget = campaign.remaining_budget - bonus_amount;
        campaign.tokens_distributed = campaign.tokens_distributed + bonus_amount;

        // Update category incentive
        let cat_incentive_mut = option::borrow_mut(&mut campaign.category_incentive);
        cat_incentive_mut.current_month_spent = cat_incentive_mut.current_month_spent + bonus_amount;

        // Update or create user campaign data
        update_user_campaign_data(campaign, user_addr, bonus_amount, trust_score, ctx);

        // Update pool spending
        pool.current_month_spent = pool.current_month_spent + bonus_amount;

        event::emit(IncentiveAwarded {
            campaign_id,
            user: user_addr,
            incentive_type: string::utf8(b"category_bonus"),
            amount: bonus_amount,
            recommendation_id,
            quality_score: trust_score,
            timestamp: get_current_timestamp()
        });

        bonus_amount
    }

    /// Update campaign performance and ROI
    public fun update_campaign_performance(
        campaign_id: ID,
        actual_recommendations: u64,
        average_quality: u64,
        user_acquisition_count: u64,
        activity_boost_percentage: u64,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        
        // Update actual metrics
        if (vector::length(&campaign.actual_metrics) > 0) {
            *vector::borrow_mut(&mut campaign.actual_metrics, 0) = actual_recommendations;
        } else {
            vector::push_back(&mut campaign.actual_metrics, actual_recommendations);
        };

        // Calculate ROI multiplier
        let target_recs = if (vector::length(&campaign.target_metrics) > 0) {
            *vector::borrow(&campaign.target_metrics, 0)
        } else {
            1
        };

        campaign.roi_multiplier = if (target_recs > 0) {
            (actual_recommendations * 10000) / target_recs
        } else {
            10000
        };

        // Create or update performance metrics
        let metrics = CampaignMetrics {
            target_recommendations: target_recs,
            actual_recommendations,
            target_quality_score: 400, // Default 0.40 target
            actual_quality_score: average_quality,
            cost_per_quality_recommendation: if (actual_recommendations > 0) {
                campaign.tokens_distributed / actual_recommendations
            } else {
                0
            },
            roi_multiplier: campaign.roi_multiplier,
            user_acquisition_count,
            platform_activity_boost: activity_boost_percentage
        };

        if (table::contains(&pool.campaign_performance, campaign_id)) {
            let existing_metrics = table::borrow_mut(&mut pool.campaign_performance, campaign_id);
            *existing_metrics = metrics;
        } else {
            table::add(&mut pool.campaign_performance, campaign_id, metrics);
        };

        // Auto-adjust campaign status based on performance
        if (campaign.roi_multiplier >= HIGH_PERFORMANCE_THRESHOLD) {
            // High performance - consider budget increase
            if (campaign.status == STATUS_ACTIVE) {
                // Keep active, could increase budget through governance
            };
        } else if (campaign.roi_multiplier <= LOW_PERFORMANCE_THRESHOLD) {
            // Low performance - consider pausing
            if (campaign.status == STATUS_ACTIVE) {
                campaign.status = STATUS_PAUSED;
                event::emit(CampaignStatusChanged {
                    campaign_id,
                    old_status: STATUS_ACTIVE,
                    new_status: STATUS_PAUSED,
                    reason: string::utf8(b"Low performance auto-pause"),
                    timestamp: get_current_timestamp()
                });
            };
        };

        event::emit(PerformanceAssessment {
            campaign_id,
            roi_multiplier: campaign.roi_multiplier,
            recommendations_generated: actual_recommendations,
            average_quality,
            budget_efficiency: metrics.cost_per_quality_recommendation,
            timestamp: get_current_timestamp()
        });
    }

    /// Pause campaign (governance action)
    public fun pause_campaign(
        authorized_user: &signer,
        campaign_id: ID,
        reason: String,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        assert!(vector::contains(&pool.authorized_creators, &user_addr), E_UNAUTHORIZED_ACCESS);
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        let old_status = campaign.status;
        campaign.status = STATUS_PAUSED;

        event::emit(CampaignStatusChanged {
            campaign_id,
            old_status,
            new_status: STATUS_PAUSED,
            reason,
            timestamp: get_current_timestamp()
        });
    }

    /// Resume paused campaign
    public fun resume_campaign(
        authorized_user: &signer,
        campaign_id: ID,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        assert!(vector::contains(&pool.authorized_creators, &user_addr), E_UNAUTHORIZED_ACCESS);
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        assert!(campaign.status == STATUS_PAUSED, E_CAMPAIGN_NOT_ACTIVE);
        
        let old_status = campaign.status;
        campaign.status = STATUS_ACTIVE;

        event::emit(CampaignStatusChanged {
            campaign_id,
            old_status,
            new_status: STATUS_ACTIVE,
            reason: string::utf8(b"Manual resume by governance"),
            timestamp: get_current_timestamp()
        });
    }

    /// Adjust campaign budget (governance action)
    public fun adjust_campaign_budget(
        authorized_user: &signer,
        campaign_id: ID,
        new_budget: u64,
        reason: String,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        assert!(vector::contains(&pool.authorized_creators, &user_addr), E_UNAUTHORIZED_ACCESS);
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        
        let campaign = table::borrow_mut(&mut pool.active_campaigns, campaign_id);
        let previous_budget = campaign.total_budget;
        
        // Adjust budgets
        let budget_difference = if (new_budget > previous_budget) {
            new_budget - previous_budget
        } else {
            previous_budget - new_budget
        };

        campaign.total_budget = new_budget;
        
        // Adjust remaining budget proportionally
        if (new_budget > previous_budget) {
            campaign.remaining_budget = campaign.remaining_budget + budget_difference;
        } else if (campaign.remaining_budget > budget_difference) {
            campaign.remaining_budget = campaign.remaining_budget - budget_difference;
        } else {
            campaign.remaining_budget = 0;
        };

        event::emit(BudgetUpdated {
            campaign_id,
            previous_budget,
            new_budget,
            reason,
            timestamp: get_current_timestamp()
        });
    }

    /// Add authorized campaign creator (governance function)
    public fun add_authorized_creator(
        admin: &signer,
        new_creator: address,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        // This would typically be called by governance contract
        // For now, we'll implement basic authorization check
        let admin_addr = tx_context::sender(ctx);
        
        if (!vector::contains(&pool.authorized_creators, &new_creator)) {
            vector::push_back(&mut pool.authorized_creators, new_creator);
        };
    }

    /// Fund discovery incentive pool from ecosystem allocation
    public fun fund_from_ecosystem(
        ecosystem_tokens: Coin<omeone::token::OMEONE>,
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        let funding_amount = coin::value(&ecosystem_tokens);
        let funding_balance = coin::into_balance(ecosystem_tokens);
        balance::join(&mut pool.ecosystem_allocation, funding_balance);
    }

    /// Monthly budget reset (automated function)
    public fun reset_monthly_budget(
        pool: &mut DiscoveryIncentivePool,
        ctx: &mut TxContext
    ) {
        let current_month = get_current_month();
        
        if (current_month != pool.current_month) {
            pool.current_month = current_month;
            pool.current_month_spent = 0;
            
            // Reset monthly spending for category campaigns
            // This would iterate through active campaigns and reset monthly counters
            // Implementation depends on specific requirements
        };
    }

    // === Helper Functions ===

    fun update_user_campaign_data(
        campaign: &mut DiscoveryCampaign,
        user_addr: address,
        bonus_amount: u64,
        trust_score: u64,
        ctx: &mut TxContext
    ) {
        let current_time = get_current_timestamp();
        let current_month = get_current_month();
        
        if (table::contains(&campaign.user_claims, user_addr)) {
            let user_data = table::borrow_mut(&mut campaign.user_claims, user_addr);
            
            user_data.total_claimed = user_data.total_claimed + bonus_amount;
            user_data.last_claim_time = current_time;
            user_data.recommendations_count = user_data.recommendations_count + 1;
            
            // Update monthly claims
            if (user_data.month_of_last_claim != current_month) {
                user_data.claims_this_month = bonus_amount;
                user_data.month_of_last_claim = current_month;
            } else {
                user_data.claims_this_month = user_data.claims_this_month + bonus_amount;
            };
            
            // Update average quality (moving average)
            let total_quality = user_data.average_quality * (user_data.recommendations_count - 1) + trust_score;
            user_data.average_quality = total_quality / user_data.recommendations_count;
        } else {
            let user_data = UserCampaignData {
                total_claimed: bonus_amount,
                claims_this_month: bonus_amount,
                last_claim_time: current_time,
                recommendations_count: 1,
                average_quality: trust_score,
                month_of_last_claim: current_month
            };
            table::add(&mut campaign.user_claims, user_addr, user_data);
        };
    }

    fun get_current_month(): u64 {
        // Simplified month calculation - in production would use proper date handling
        let current_time = get_current_timestamp();
        current_time / (30 * 24 * 60 * 60 * 1000) // Approximate month in milliseconds
    }

    // === Public Getters ===

    public fun get_campaign_status(campaign_id: ID, pool: &DiscoveryIncentivePool): u8 {
        if (!table::contains(&pool.active_campaigns, campaign_id)) {
            return 0 // Not found
        };
        let campaign = table::borrow(&pool.active_campaigns, campaign_id);
        campaign.status
    }

    public fun get_campaign_budget_info(campaign_id: ID, pool: &DiscoveryIncentivePool): (u64, u64, u64) {
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        let campaign = table::borrow(&pool.active_campaigns, campaign_id);
        (campaign.total_budget, campaign.remaining_budget, campaign.tokens_distributed)
    }

    public fun get_campaign_performance(campaign_id: ID, pool: &DiscoveryIncentivePool): (u64, u64, u64) {
        if (!table::contains(&pool.campaign_performance, campaign_id)) {
            return (0, 0, 10000) // Default values
        };
        let metrics = table::borrow(&pool.campaign_performance, campaign_id);
        (metrics.actual_recommendations, metrics.actual_quality_score, metrics.roi_multiplier)
    }

    public fun get_user_campaign_data(
        campaign_id: ID, 
        user: address, 
        pool: &DiscoveryIncentivePool
    ): (u64, u64, u64, u64) {
        assert!(table::contains(&pool.active_campaigns, campaign_id), E_INVALID_CAMPAIGN_ID);
        let campaign = table::borrow(&pool.active_campaigns, campaign_id);
        
        if (!table::contains(&campaign.user_claims, user)) {
            return (0, 0, 0, 0) // No data
        };
        
        let user_data = table::borrow(&campaign.user_claims, user);
        (user_data.total_claimed, user_data.claims_this_month, 
         user_data.recommendations_count, user_data.average_quality)
    }

    public fun get_monthly_budget_status(pool: &DiscoveryIncentivePool): (u64, u64, u64) {
        (pool.monthly_budget_limit, pool.current_month_spent, 
         pool.monthly_budget_limit - pool.current_month_spent)
    }

    public fun is_authorized_creator(user: address, pool: &DiscoveryIncentivePool): bool {
        vector::contains(&pool.authorized_creators, &user)
    }

    public fun get_pool_balance(pool: &DiscoveryIncentivePool): u64 {
        balance::value(&pool.ecosystem_allocation) + 
        balance::value(&pool.partnership_contributions) + 
        balance::value(&pool.revenue_reinvestment)
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}