module rewards::rewards {
    use std::string::String;
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self as coin, Coin, TreasuryCap};
    use iota::clock::{Self, Clock};
    use iota::event;
    use bocaboca::token::{Self, TOKEN};
    use user_status::user_status;
    use escrow::escrow;
    use email_escrow::email_escrow;

    /// One-time witness for initialization
    public struct REWARDS has drop {}

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 901;
    const E_INVALID_AMOUNT: u64 = 902;
    const E_INVALID_REWARD_TYPE: u64 = 903;
    const E_USER_NOT_FOUND: u64 = 904;

    /// Reward type constants
    const REWARD_TYPE_CREATION: u8 = 1;           // Base content creation
    const REWARD_TYPE_ENGAGEMENT_SAVE: u8 = 2;    // Someone saved recommendation
    const REWARD_TYPE_ENGAGEMENT_COMMENT: u8 = 3; // Someone commented
    const REWARD_TYPE_VALIDATION: u8 = 4;         // Hit 3.0 threshold
    const REWARD_TYPE_FIRST_REVIEWER: u8 = 5;     // First to review restaurant
    const REWARD_TYPE_HELPFUL_COMMENT: u8 = 6;    // Comment marked helpful
    const REWARD_TYPE_ONBOARDING: u8 = 7;         // Onboarding rewards
    const REWARD_TYPE_REFERRAL: u8 = 8;           // Referral rewards
    const REWARD_TYPE_LOTTERY: u8 = 9;            // Lottery winnings
    const REWARD_TYPE_PHOTO_CONTEST: u8 = 10;     // Photo contest prizes

    /// Base reward amounts (6 decimals - scaled)
    /// Email users get SAME amounts, just routed to email_escrow
    const BASE_CREATION_REWARD: u64 = 500_000;        // 0.5 BOCA
    const VALIDATION_BONUS: u64 = 1_000_000;          // 1.0 BOCA
    const SAVE_REWARD: u64 = 100_000;                 // 0.1 BOCA per save (× tier weight)
    const COMMENT_REWARD: u64 = 50_000;               // 0.05 BOCA per comment (× tier weight)
    const HELPFUL_COMMENT_BONUS: u64 = 200_000;       // 0.2 BOCA for helpful mark
    const FIRST_REVIEWER_BONUS: u64 = 1_000_000;      // 1.0 BOCA
    const ONBOARDING_REWARD: u64 = 5_000_000;         // 5.0 BOCA total
    const REFERRAL_REWARD: u64 = 2_000_000;           // 2.0 BOCA per referral

    /// Global rewards registry
    public struct GlobalRewardsRegistry has key {
        id: UID,
        
        // Statistics
        total_rewards_distributed: u64,
        total_email_escrowed: u64,
        total_wallet_escrowed: u64,
        total_direct_distributed: u64,
        
        // By reward type
        creation_rewards: u64,
        engagement_rewards: u64,
        validation_rewards: u64,
        first_reviewer_rewards: u64,
        helpful_comment_rewards: u64,
        onboarding_rewards: u64,
        referral_rewards: u64,
        lottery_rewards: u64,
        contest_rewards: u64,
        
        // Admin
        moderators: vector<address>,
        admin: address,
    }

    /// Events
    public struct RewardDistributed has copy, drop {
        recipient: address,
        amount: u64,
        reward_type: u8,
        routed_to: String,         // "direct", "wallet_escrow", or "email_escrow"
        reference_id: String,      // Recommendation ID or other reference
        timestamp: u64,
    }

    public struct BatchRewardDistributed has copy, drop {
        total_recipients: u64,
        total_amount: u64,
        reward_type: u8,
        timestamp: u64,
    }

    /// Initialize the rewards system
    fun init(_witness: REWARDS, ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let mut registry = GlobalRewardsRegistry {
            id: object::new(ctx),
            total_rewards_distributed: 0,
            total_email_escrowed: 0,
            total_wallet_escrowed: 0,
            total_direct_distributed: 0,
            creation_rewards: 0,
            engagement_rewards: 0,
            validation_rewards: 0,
            first_reviewer_rewards: 0,
            helpful_comment_rewards: 0,
            onboarding_rewards: 0,
            referral_rewards: 0,
            lottery_rewards: 0,
            contest_rewards: 0,
            moderators: vector::empty(),
            admin,
        };

        vector::push_back(&mut registry.moderators, admin);

        transfer::share_object(registry);
    }

    /// Distribute base content creation reward
    public fun distribute_creation_reward(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        recommendation_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Email and wallet users get SAME base reward
        let base_amount = BASE_CREATION_REWARD;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, base_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_CREATION,
            recommendation_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.creation_rewards = rewards_registry.creation_rewards + base_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + base_amount;
    }

    /// Distribute engagement reward (save or comment)
    public fun distribute_engagement_reward(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        engagement_type: u8,  // REWARD_TYPE_ENGAGEMENT_SAVE or REWARD_TYPE_ENGAGEMENT_COMMENT
        recommendation_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Get user's tier weight (SAME for email and wallet users)
        let tier_weight = user_status::get_engagement_weight(user_status_registry, recipient);
        
        // Calculate reward based on engagement type and tier
        let base_amount = if (engagement_type == REWARD_TYPE_ENGAGEMENT_SAVE) {
            SAVE_REWARD
        } else {
            COMMENT_REWARD
        };
        
        // Apply tier weight: (base_amount × tier_weight) / 1000
        let reward_amount = (base_amount * tier_weight) / 1000;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            engagement_type,
            recommendation_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.engagement_rewards = rewards_registry.engagement_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Distribute validation bonus (3.0 threshold reached)
    public fun distribute_validation_bonus(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        recommendation_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = VALIDATION_BONUS;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_VALIDATION,
            recommendation_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.validation_rewards = rewards_registry.validation_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Distribute first reviewer bonus
    public fun distribute_first_reviewer_bonus(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        recommendation_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = FIRST_REVIEWER_BONUS;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_FIRST_REVIEWER,
            recommendation_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.first_reviewer_rewards = rewards_registry.first_reviewer_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Distribute helpful comment bonus
    public fun distribute_helpful_comment_bonus(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        comment_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = HELPFUL_COMMENT_BONUS;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_HELPFUL_COMMENT,
            comment_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.helpful_comment_rewards = rewards_registry.helpful_comment_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Distribute onboarding reward
    public fun distribute_onboarding_reward(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = ONBOARDING_REWARD;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_ONBOARDING,
            std::string::utf8(b"onboarding"),
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.onboarding_rewards = rewards_registry.onboarding_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Distribute referral reward
    public fun distribute_referral_reward(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        referred_user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reward_amount = REFERRAL_REWARD;
        
        // Mint reward
        let reward_coin = token::mint(treasury_cap, reward_amount, ctx);
        
        // Create reference ID from referred user address
        let reference_id = address_to_string(referred_user);
        
        // Route based on account tier
        route_reward(
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recipient,
            reward_coin,
            REWARD_TYPE_REFERRAL,
            reference_id,
            clock,
            ctx
        );
        
        // Update stats
        rewards_registry.referral_rewards = rewards_registry.referral_rewards + reward_amount;
        rewards_registry.total_rewards_distributed = rewards_registry.total_rewards_distributed + reward_amount;
    }

    /// Core routing logic - routes reward to appropriate destination based on user tier
    fun route_reward(
        rewards_registry: &mut GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recipient: address,
        reward_coin: Coin<TOKEN>,
        reward_type: u8,
        reference_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&reward_coin);
        let now = clock::timestamp_ms(clock);
        
        // Determine routing based on account tier
        let account_tier = user_status::get_account_tier(user_status_registry, recipient);
        let user_tier = user_status::get_user_tier(user_status_registry, recipient);
        
        let routed_to = if (account_tier == 1) {
            // Email-tier user → route to email_escrow (6-month hold)
            email_escrow::add_pending_tokens(
                email_escrow_registry,
                user_status_registry,
                recipient,
                reward_coin,
                clock,
                ctx
            );
            
            rewards_registry.total_email_escrowed = rewards_registry.total_email_escrowed + amount;
            std::string::utf8(b"email_escrow")
            
        } else if (user_tier == 1) {
            // Wallet-tier user, New tier → route to anti-spam escrow (7-day hold)
            let _escrow_uid = escrow::create_escrow_hold(
                escrow_registry,
                user_status_registry,
                recipient,
                reward_coin,
                reference_id,
                reward_type,
                clock,
                ctx
            );
            
            rewards_registry.total_wallet_escrowed = rewards_registry.total_wallet_escrowed + amount;
            std::string::utf8(b"wallet_escrow")
            
        } else {
            // Wallet-tier user, Established or Trusted → direct transfer
            transfer::public_transfer(reward_coin, recipient);
            
            rewards_registry.total_direct_distributed = rewards_registry.total_direct_distributed + amount;
            std::string::utf8(b"direct")
        };
        
        // Emit event
        event::emit(RewardDistributed {
            recipient,
            amount,
            reward_type,
            routed_to,
            reference_id,
            timestamp: now,
        });
    }

    /// Get global rewards statistics
    public fun get_global_stats(registry: &GlobalRewardsRegistry): (
        u64,  // total_rewards_distributed
        u64,  // total_email_escrowed
        u64,  // total_wallet_escrowed
        u64   // total_direct_distributed
    ) {
        (
            registry.total_rewards_distributed,
            registry.total_email_escrowed,
            registry.total_wallet_escrowed,
            registry.total_direct_distributed
        )
    }

    /// Get rewards by type
    public fun get_rewards_by_type(registry: &GlobalRewardsRegistry): (
        u64,  // creation_rewards
        u64,  // engagement_rewards
        u64,  // validation_rewards
        u64,  // first_reviewer_rewards
        u64,  // helpful_comment_rewards
        u64,  // onboarding_rewards
        u64,  // referral_rewards
        u64,  // lottery_rewards
        u64   // contest_rewards
    ) {
        (
            registry.creation_rewards,
            registry.engagement_rewards,
            registry.validation_rewards,
            registry.first_reviewer_rewards,
            registry.helpful_comment_rewards,
            registry.onboarding_rewards,
            registry.referral_rewards,
            registry.lottery_rewards,
            registry.contest_rewards
        )
    }

    /// Helper: Convert address to string (simplified for now)
    /// TODO: Implement proper hex conversion for production
    fun address_to_string(_addr: address): String {
        // Simplified - would need proper hex conversion in production
        std::string::utf8(b"referral")
    }

    /// Add moderator (admin only)
    public fun add_moderator(
        registry: &mut GlobalRewardsRegistry,
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
        init(REWARDS {}, ctx);
    }
}
