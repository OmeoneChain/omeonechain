/// BocaBoca Rewards Module v1.0
/// Handles all protocol-minted token rewards
/// 
/// CHANGES FROM v0.8: All reward amounts scaled 10×
/// - Creation: 0.5 → 5.0 BOCA (wallet), 0.25 → 2.5 BOCA (email)
/// - Validation bonus: 1.0 → 10.0 BOCA
/// - Save reward: 0.1 → 1.0 BOCA
/// - Comment reward: 0.05 → 0.5 BOCA
/// - Helpful comment: 0.2 → 2.0 BOCA
/// - First reviewer: 1.0 → 10.0 BOCA
/// - Onboarding total: 5.0 → 50.0 BOCA
/// - Referral: 2.0 → 20.0 BOCA
/// - Boost: 0.1 → 1.0 BOCA
/// - Reshare: 0.2 → 2.0 BOCA
/// - Attribution: 0.1 → 1.0 BOCA

module rewards::rewards {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::event;

    // Import BOCA token type (adjust path as needed)
    use bocaboca::token::TOKEN;

    // ============================================
    // CONSTANTS - v1.0 White Paper Specifications
    // ============================================
    
    /// Token decimals (6 decimals = 1,000,000 base units per BOCA)
    const DECIMALS: u64 = 1_000_000;

    // ----- CONTENT CREATION REWARDS -----
    
    /// Base reward for creating recommendation (wallet user): 5.0 BOCA
    const CREATION_REWARD_WALLET: u64 = 5_000_000;      // was 500,000
    
    /// Base reward for creating recommendation (email user): 2.5 BOCA
    const CREATION_REWARD_EMAIL: u64 = 2_500_000;       // was 250,000
    
    /// Validation bonus at 3.0 engagement points: 10.0 BOCA
    const VALIDATION_BONUS: u64 = 10_000_000;           // was 1,000,000
    
    /// First reviewer bonus: 10.0 BOCA
    const FIRST_REVIEWER_BONUS: u64 = 10_000_000;       // was 1,000,000

    // ----- ENGAGEMENT REWARDS (paid to content author) -----
    
    /// Reward when someone saves/bookmarks your rec: 1.0 BOCA (before tier weight)
    const SAVE_REWARD_BASE: u64 = 1_000_000;            // was 100,000
    
    /// Reward when someone comments on your rec: 0.5 BOCA (before tier weight)
    const COMMENT_REWARD_BASE: u64 = 500_000;           // was 50,000
    
    /// Reward when your comment is marked helpful: 2.0 BOCA
    const HELPFUL_COMMENT_REWARD: u64 = 2_000_000;      // was 200,000

    // ----- SOCIAL AMPLIFICATION REWARDS -----
    
    /// Reward for boosting a recommendation: 1.0 BOCA
    const BOOST_REWARD: u64 = 1_000_000;                // was 100,000
    
    /// Reward for resharing with endorsement: 2.0 BOCA
    const RESHARE_REWARD: u64 = 2_000_000;              // was 200,000
    
    /// Attribution bonus when your rec gets reshared: 1.0 BOCA
    const ATTRIBUTION_BONUS: u64 = 1_000_000;           // was 100,000

    // ----- ONBOARDING REWARDS -----
    
    /// Follow 3+ accounts: 5.0 BOCA
    const ONBOARDING_FOLLOW_REWARD: u64 = 5_000_000;    // was 500,000
    
    /// Create 5 recommendations: 25.0 BOCA (5.0 each)
    const ONBOARDING_REC_REWARD: u64 = 5_000_000;       // was 500,000 per rec
    
    /// Engage with 10 posts from 3+ authors: 20.0 BOCA
    const ONBOARDING_ENGAGE_REWARD: u64 = 20_000_000;   // was 2,000,000
    
    /// Total onboarding possible: 50.0 BOCA
    const ONBOARDING_TOTAL: u64 = 50_000_000;           // was 5,000,000

    // ----- REFERRAL REWARDS -----
    
    /// Referral completes onboarding: 20.0 BOCA
    const REFERRAL_COMPLETE_REWARD: u64 = 20_000_000;   // was 2,000,000
    
    /// Referred user creates 10 recs: 10.0 BOCA bonus
    const REFERRAL_MILESTONE_REWARD: u64 = 10_000_000;  // was 1,000,000

    // ----- MODERATION REWARDS -----
    
    /// Validated spam report: 10.0 BOCA + 10% of slashed escrow
    const SPAM_REPORT_REWARD: u64 = 10_000_000;         // was 1,000,000
    
    /// False spam report penalty: 5.0 BOCA
    const FALSE_REPORT_PENALTY: u64 = 5_000_000;        // was 500,000

    // ----- VALIDATION THRESHOLD -----
    
    /// Engagement points needed for validation bonus
    const VALIDATION_THRESHOLD: u64 = 3_000_000;  // 3.0 points (6 decimals)

    // ----- TIER WEIGHTS (basis points) -----
    const WEIGHT_NEW: u64 = 5000;          // 0.5x
    const WEIGHT_ESTABLISHED: u64 = 10000; // 1.0x  
    const WEIGHT_TRUSTED: u64 = 15000;     // 1.5x

    // ============================================
    // ERRORS
    // ============================================
    
    const E_INSUFFICIENT_TREASURY: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_ALREADY_CLAIMED: u64 = 3;
    const E_VALIDATION_NOT_REACHED: u64 = 4;
    const E_INVALID_TIER: u64 = 5;

    // ============================================
    // STRUCTS
    // ============================================

    /// Treasury holding rewards pool
    public struct RewardsTreasury has key {
        id: UID,
        balance: Balance<TOKEN>,
        total_distributed: u64,
        total_burned: u64,
    }

    /// Admin capability
    public struct RewardsAdminCap has key, store {
        id: UID,
    }

    /// Tracks recommendation reward status
    public struct RecommendationRewardStatus has key, store {
        id: UID,
        recommendation_id: ID,
        author: address,
        /// Base reward paid
        base_reward_paid: bool,
        /// Validation bonus paid
        validation_bonus_paid: bool,
        /// First reviewer bonus paid
        first_reviewer_paid: bool,
        /// Current engagement points (6 decimals)
        engagement_points: u64,
        /// Created timestamp
        created_at: u64,
    }

    /// Tracks user onboarding progress
    public struct OnboardingProgress has key, store {
        id: UID,
        user: address,
        follows_completed: bool,
        recs_created: u64,
        engagement_completed: bool,
        total_earned: u64,
    }

    // ============================================
    // EVENTS
    // ============================================

    public struct RewardPaid has copy, drop {
        recipient: address,
        amount: u64,
        reward_type: vector<u8>,
        recommendation_id: Option<ID>,
    }

    public struct ValidationBonusPaid has copy, drop {
        recipient: address,
        recommendation_id: ID,
        engagement_points: u64,
        amount: u64,
    }

    public struct EngagementRewardPaid has copy, drop {
        author: address,
        engager: address,
        engagement_type: vector<u8>,
        base_amount: u64,
        tier_weight: u64,
        final_amount: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    fun init(ctx: &mut TxContext) {
        let admin_cap = RewardsAdminCap {
            id: object::new(ctx),
        };
        
        let treasury = RewardsTreasury {
            id: object::new(ctx),
            balance: balance::zero(),
            total_distributed: 0,
            total_burned: 0,
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(treasury);
    }

    // ============================================
    // TREASURY MANAGEMENT
    // ============================================

    /// Fund the rewards treasury
    public entry fun fund_treasury(
        treasury: &mut RewardsTreasury,
        payment: Coin<TOKEN>,
        _ctx: &mut TxContext
    ) {
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut treasury.balance, payment_balance);
    }

    /// Withdraw from treasury (admin only)
    public entry fun withdraw_treasury(
        _admin: &RewardsAdminCap,
        treasury: &mut RewardsTreasury,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= amount, E_INSUFFICIENT_TREASURY);
        let withdrawal = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(withdrawal, recipient);
    }

    // ============================================
    // CONTENT CREATION REWARDS
    // ============================================

    /// Pay base creation reward for a new recommendation
    public entry fun pay_creation_reward(
        treasury: &mut RewardsTreasury,
        reward_status: &mut RecommendationRewardStatus,
        is_wallet_user: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!reward_status.base_reward_paid, E_ALREADY_CLAIMED);
        
        let amount = if (is_wallet_user) {
            CREATION_REWARD_WALLET
        } else {
            CREATION_REWARD_EMAIL
        };

        assert!(balance::value(&treasury.balance) >= amount, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(reward, reward_status.author);
        
        reward_status.base_reward_paid = true;
        treasury.total_distributed = treasury.total_distributed + amount;

        event::emit(RewardPaid {
            recipient: reward_status.author,
            amount,
            reward_type: b"creation",
            recommendation_id: option::some(reward_status.recommendation_id),
        });
    }

    /// Pay first reviewer bonus
    public entry fun pay_first_reviewer_bonus(
        treasury: &mut RewardsTreasury,
        reward_status: &mut RecommendationRewardStatus,
        ctx: &mut TxContext
    ) {
        assert!(!reward_status.first_reviewer_paid, E_ALREADY_CLAIMED);
        assert!(balance::value(&treasury.balance) >= FIRST_REVIEWER_BONUS, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, FIRST_REVIEWER_BONUS, ctx);
        transfer::public_transfer(reward, reward_status.author);
        
        reward_status.first_reviewer_paid = true;
        treasury.total_distributed = treasury.total_distributed + FIRST_REVIEWER_BONUS;

        event::emit(RewardPaid {
            recipient: reward_status.author,
            amount: FIRST_REVIEWER_BONUS,
            reward_type: b"first_reviewer",
            recommendation_id: option::some(reward_status.recommendation_id),
        });
    }

    // ============================================
    // ENGAGEMENT REWARDS
    // ============================================

    /// Record engagement and pay author reward
    /// Called when someone saves, comments, etc. on a recommendation
    public entry fun pay_engagement_reward(
        treasury: &mut RewardsTreasury,
        reward_status: &mut RecommendationRewardStatus,
        engagement_type: vector<u8>, // "save" or "comment"
        engager_tier: u8,
        engager: address,
        ctx: &mut TxContext
    ) {
        // Determine base reward and engagement points
        let (base_amount, engagement_contribution) = if (engagement_type == b"save") {
            (SAVE_REWARD_BASE, 1_000_000) // 1.0 point
        } else if (engagement_type == b"comment") {
            (COMMENT_REWARD_BASE, 500_000) // 0.5 point
        } else {
            (0, 0)
        };

        if (base_amount == 0) return;

        // Apply tier weight
        let tier_weight = get_tier_weight(engager_tier);
        let final_amount = (base_amount * tier_weight) / 10000;
        let weighted_points = (engagement_contribution * tier_weight) / 10000;

        // Update engagement points
        reward_status.engagement_points = reward_status.engagement_points + weighted_points;

        // Pay reward to author
        if (balance::value(&treasury.balance) >= final_amount) {
            let reward = coin::take(&mut treasury.balance, final_amount, ctx);
            transfer::public_transfer(reward, reward_status.author);
            treasury.total_distributed = treasury.total_distributed + final_amount;

            event::emit(EngagementRewardPaid {
                author: reward_status.author,
                engager,
                engagement_type,
                base_amount,
                tier_weight,
                final_amount,
            });
        };

        // Check for validation bonus
        check_and_pay_validation_bonus(treasury, reward_status, ctx);
    }

    /// Pay helpful comment reward
    public entry fun pay_helpful_comment_reward(
        treasury: &mut RewardsTreasury,
        commenter: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= HELPFUL_COMMENT_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, HELPFUL_COMMENT_REWARD, ctx);
        transfer::public_transfer(reward, commenter);
        treasury.total_distributed = treasury.total_distributed + HELPFUL_COMMENT_REWARD;

        event::emit(RewardPaid {
            recipient: commenter,
            amount: HELPFUL_COMMENT_REWARD,
            reward_type: b"helpful_comment",
            recommendation_id: option::none(),
        });
    }

    // ============================================
    // SOCIAL AMPLIFICATION REWARDS
    // ============================================

    /// Pay boost reward (to booster)
    public entry fun pay_boost_reward(
        treasury: &mut RewardsTreasury,
        booster: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= BOOST_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, BOOST_REWARD, ctx);
        transfer::public_transfer(reward, booster);
        treasury.total_distributed = treasury.total_distributed + BOOST_REWARD;

        event::emit(RewardPaid {
            recipient: booster,
            amount: BOOST_REWARD,
            reward_type: b"boost",
            recommendation_id: option::none(),
        });
    }

    /// Pay reshare reward (to resharer)
    public entry fun pay_reshare_reward(
        treasury: &mut RewardsTreasury,
        resharer: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= RESHARE_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, RESHARE_REWARD, ctx);
        transfer::public_transfer(reward, resharer);
        treasury.total_distributed = treasury.total_distributed + RESHARE_REWARD;

        event::emit(RewardPaid {
            recipient: resharer,
            amount: RESHARE_REWARD,
            reward_type: b"reshare",
            recommendation_id: option::none(),
        });
    }

    /// Pay attribution bonus (to original author when their rec is reshared)
    public entry fun pay_attribution_bonus(
        treasury: &mut RewardsTreasury,
        original_author: address,
        recommendation_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= ATTRIBUTION_BONUS, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, ATTRIBUTION_BONUS, ctx);
        transfer::public_transfer(reward, original_author);
        treasury.total_distributed = treasury.total_distributed + ATTRIBUTION_BONUS;

        event::emit(RewardPaid {
            recipient: original_author,
            amount: ATTRIBUTION_BONUS,
            reward_type: b"attribution",
            recommendation_id: option::some(recommendation_id),
        });
    }

    // ============================================
    // ONBOARDING REWARDS
    // ============================================

    /// Create onboarding progress tracker
    public entry fun create_onboarding_progress(
        user: address,
        ctx: &mut TxContext
    ) {
        let progress = OnboardingProgress {
            id: object::new(ctx),
            user,
            follows_completed: false,
            recs_created: 0,
            engagement_completed: false,
            total_earned: 0,
        };
        transfer::transfer(progress, user);
    }

    /// Pay onboarding follow milestone
    public entry fun pay_onboarding_follow_reward(
        treasury: &mut RewardsTreasury,
        progress: &mut OnboardingProgress,
        ctx: &mut TxContext
    ) {
        assert!(!progress.follows_completed, E_ALREADY_CLAIMED);
        assert!(balance::value(&treasury.balance) >= ONBOARDING_FOLLOW_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, ONBOARDING_FOLLOW_REWARD, ctx);
        transfer::public_transfer(reward, progress.user);
        
        progress.follows_completed = true;
        progress.total_earned = progress.total_earned + ONBOARDING_FOLLOW_REWARD;
        treasury.total_distributed = treasury.total_distributed + ONBOARDING_FOLLOW_REWARD;

        event::emit(RewardPaid {
            recipient: progress.user,
            amount: ONBOARDING_FOLLOW_REWARD,
            reward_type: b"onboarding_follow",
            recommendation_id: option::none(),
        });
    }

    /// Pay onboarding recommendation milestone (called per rec, up to 5)
    public entry fun pay_onboarding_rec_reward(
        treasury: &mut RewardsTreasury,
        progress: &mut OnboardingProgress,
        ctx: &mut TxContext
    ) {
        assert!(progress.recs_created < 5, E_ALREADY_CLAIMED);
        assert!(balance::value(&treasury.balance) >= ONBOARDING_REC_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, ONBOARDING_REC_REWARD, ctx);
        transfer::public_transfer(reward, progress.user);
        
        progress.recs_created = progress.recs_created + 1;
        progress.total_earned = progress.total_earned + ONBOARDING_REC_REWARD;
        treasury.total_distributed = treasury.total_distributed + ONBOARDING_REC_REWARD;

        event::emit(RewardPaid {
            recipient: progress.user,
            amount: ONBOARDING_REC_REWARD,
            reward_type: b"onboarding_rec",
            recommendation_id: option::none(),
        });
    }

    /// Pay onboarding engagement milestone
    public entry fun pay_onboarding_engage_reward(
        treasury: &mut RewardsTreasury,
        progress: &mut OnboardingProgress,
        ctx: &mut TxContext
    ) {
        assert!(!progress.engagement_completed, E_ALREADY_CLAIMED);
        assert!(balance::value(&treasury.balance) >= ONBOARDING_ENGAGE_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, ONBOARDING_ENGAGE_REWARD, ctx);
        transfer::public_transfer(reward, progress.user);
        
        progress.engagement_completed = true;
        progress.total_earned = progress.total_earned + ONBOARDING_ENGAGE_REWARD;
        treasury.total_distributed = treasury.total_distributed + ONBOARDING_ENGAGE_REWARD;

        event::emit(RewardPaid {
            recipient: progress.user,
            amount: ONBOARDING_ENGAGE_REWARD,
            reward_type: b"onboarding_engage",
            recommendation_id: option::none(),
        });
    }

    // ============================================
    // REFERRAL REWARDS
    // ============================================

    /// Pay referral completion reward
    public entry fun pay_referral_reward(
        treasury: &mut RewardsTreasury,
        referrer: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= REFERRAL_COMPLETE_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, REFERRAL_COMPLETE_REWARD, ctx);
        transfer::public_transfer(reward, referrer);
        treasury.total_distributed = treasury.total_distributed + REFERRAL_COMPLETE_REWARD;

        event::emit(RewardPaid {
            recipient: referrer,
            amount: REFERRAL_COMPLETE_REWARD,
            reward_type: b"referral",
            recommendation_id: option::none(),
        });
    }

    /// Pay referral milestone bonus (referred user creates 10 recs)
    public entry fun pay_referral_milestone_reward(
        treasury: &mut RewardsTreasury,
        referrer: address,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&treasury.balance) >= REFERRAL_MILESTONE_REWARD, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, REFERRAL_MILESTONE_REWARD, ctx);
        transfer::public_transfer(reward, referrer);
        treasury.total_distributed = treasury.total_distributed + REFERRAL_MILESTONE_REWARD;

        event::emit(RewardPaid {
            recipient: referrer,
            amount: REFERRAL_MILESTONE_REWARD,
            reward_type: b"referral_milestone",
            recommendation_id: option::none(),
        });
    }

    // ============================================
    // MODERATION REWARDS
    // ============================================

    /// Pay spam report reward
    public entry fun pay_spam_report_reward(
        treasury: &mut RewardsTreasury,
        reporter: address,
        slashed_amount: u64, // From escrow forfeit
        ctx: &mut TxContext
    ) {
        // Base reward + 10% of slashed
        let bonus = slashed_amount / 10;
        let total_reward = SPAM_REPORT_REWARD + bonus;
        
        assert!(balance::value(&treasury.balance) >= total_reward, E_INSUFFICIENT_TREASURY);
        
        let reward = coin::take(&mut treasury.balance, total_reward, ctx);
        transfer::public_transfer(reward, reporter);
        treasury.total_distributed = treasury.total_distributed + total_reward;

        event::emit(RewardPaid {
            recipient: reporter,
            amount: total_reward,
            reward_type: b"spam_report",
            recommendation_id: option::none(),
        });
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /// Check if validation threshold reached and pay bonus
    fun check_and_pay_validation_bonus(
        treasury: &mut RewardsTreasury,
        reward_status: &mut RecommendationRewardStatus,
        ctx: &mut TxContext
    ) {
        if (reward_status.validation_bonus_paid) return;
        if (reward_status.engagement_points < VALIDATION_THRESHOLD) return;
        if (balance::value(&treasury.balance) < VALIDATION_BONUS) return;

        let reward = coin::take(&mut treasury.balance, VALIDATION_BONUS, ctx);
        transfer::public_transfer(reward, reward_status.author);
        
        reward_status.validation_bonus_paid = true;
        treasury.total_distributed = treasury.total_distributed + VALIDATION_BONUS;

        event::emit(ValidationBonusPaid {
            recipient: reward_status.author,
            recommendation_id: reward_status.recommendation_id,
            engagement_points: reward_status.engagement_points,
            amount: VALIDATION_BONUS,
        });
    }

    /// Get tier weight (basis points)
    fun get_tier_weight(tier: u8): u64 {
        if (tier == 3) { // Trusted
            WEIGHT_TRUSTED
        } else if (tier == 2) { // Established
            WEIGHT_ESTABLISHED
        } else { // New
            WEIGHT_NEW
        }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /// Get treasury balance
    public fun get_treasury_balance(treasury: &RewardsTreasury): u64 {
        balance::value(&treasury.balance)
    }

    /// Get total distributed
    public fun get_total_distributed(treasury: &RewardsTreasury): u64 {
        treasury.total_distributed
    }

    /// Get reward constants (for frontend)
    public fun get_creation_reward_wallet(): u64 { CREATION_REWARD_WALLET }
    public fun get_creation_reward_email(): u64 { CREATION_REWARD_EMAIL }
    public fun get_validation_bonus(): u64 { VALIDATION_BONUS }
    public fun get_save_reward_base(): u64 { SAVE_REWARD_BASE }
    public fun get_comment_reward_base(): u64 { COMMENT_REWARD_BASE }
    public fun get_helpful_comment_reward(): u64 { HELPFUL_COMMENT_REWARD }
    public fun get_first_reviewer_bonus(): u64 { FIRST_REVIEWER_BONUS }
    public fun get_boost_reward(): u64 { BOOST_REWARD }
    public fun get_reshare_reward(): u64 { RESHARE_REWARD }
    public fun get_attribution_bonus(): u64 { ATTRIBUTION_BONUS }
    public fun get_validation_threshold(): u64 { VALIDATION_THRESHOLD }

    // ============================================
    // HELPER FUNCTION FOR OPTION
    // ============================================
    
    use std::option::{Self, Option};

    // ============================================
    // TEST HELPERS
    // ============================================

    #[test_only]
    public fun create_reward_status_for_testing(
        recommendation_id: ID,
        author: address,
        ctx: &mut TxContext
    ): RecommendationRewardStatus {
        RecommendationRewardStatus {
            id: object::new(ctx),
            recommendation_id,
            author,
            base_reward_paid: false,
            validation_bonus_paid: false,
            first_reviewer_paid: false,
            engagement_points: 0,
            created_at: 0,
        }
    }
}
