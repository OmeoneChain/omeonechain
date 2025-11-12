module recommendation::recommendation {
    use std::string::{String};
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    use iota::table::{Self, Table};
    use iota::coin::TreasuryCap;
    use user_status::user_status;
    use bocaboca::token::{Self, TOKEN};
    use rewards::rewards;
    use escrow::escrow;
    use email_escrow::email_escrow;
    
    /// One-time witness for initialization
    public struct RECOMMENDATION has drop {}
    
    /// Error codes
    const E_RECOMMENDATION_NOT_FOUND: u64 = 101;
    const E_ALREADY_ENGAGED: u64 = 102;
    const E_CANNOT_ENGAGE_OWN: u64 = 103;
    const E_NOT_AUTHOR: u64 = 104;
    const E_RECOMMENDATION_ALREADY_EXISTS: u64 = 105;
    const E_RATE_LIMIT_EXCEEDED: u64 = 106;
    const E_INVALID_COMMENT: u64 = 107;
    const E_REWARD_ALREADY_CLAIMED: u64 = 108;
    
    /// Engagement point values (scaled by 1000 for precision)
    /// These can be adjusted via governance
    const LIKE_VALUE: u64 = 250;      // 0.25 points per like
    const SAVE_VALUE: u64 = 500;      // 0.5 points per save
    const COMMENT_VALUE: u64 = 750;   // 0.75 points per comment
    
    /// Validation threshold - 3.0 points (scaled by 1000)
    const VALIDATION_THRESHOLD: u64 = 3000;
    
    /// Simplified types for standalone deployment
    public struct StorageId has store, copy, drop {
        id_string: String,
    }
    
    public struct ContentHash has store, copy, drop {
        hash_bytes: vector<u8>,
        hash_type: u8,
    }
    
    public struct IpfsCid has store, copy, drop {
        cid_string: String,
    }
    
    public struct Category has store, copy, drop {
        category_code: u8,
    }
    
    public struct Location has store, copy, drop {
        latitude: u64,
        longitude: u64,
        is_negative_lat: bool,
        is_negative_long: bool,
    }
    
    public struct TimeStamp has store, copy, drop {
        timestamp_ms: u64,
    }
    
    /// Comment on a recommendation
    public struct Comment has store, copy, drop {
        commenter: address,
        comment_text: String,
        timestamp: u64,
        engagement_weight: u64,  // Tier weight at time of comment
    }
    
    /// Recommendation struct
    public struct Recommendation has key, store {
        id: UID,
        storage_id: StorageId,
        author: address,
        timestamp: TimeStamp,
        service_id: String,
        category: Category,
        location: Location,
        content_hash: ContentHash,
        ipfs_cid: IpfsCid,
        
        // Unified engagement tracking (all positive signals)
        likes: vector<address>,
        saves: vector<address>,
        comments: vector<Comment>,
        
        // Calculated engagement metrics
        engagement_points: u64,           // Weighted engagement score (scaled by 1000)
        validation_threshold_met: bool,   // True when >= 3.0 points
        validation_bonus_claimed: bool,   // True when validation bonus has been claimed
        
        // Metadata
        created_at: u64,
        last_updated: u64,
    }
    
    /// User's engagement tracking (prevent duplicate likes/saves)
    public struct UserEngagement has key, store {
        id: UID,
        user_address: address,
        liked_recommendations: Table<String, bool>,      // storage_id -> true
        saved_recommendations: Table<String, bool>,       // storage_id -> true
        commented_recommendations: Table<String, u64>,    // storage_id -> comment count
    }
    
    /// Global registry of all recommendations
    public struct GlobalRecommendationRegistry has key {
        id: UID,
        recommendations: vector<StorageId>,
        last_id: u64,
        total_recommendations: u64,
        total_engagement_points: u64,
    }
    
    /// Events
    public struct RecommendationCreated has copy, drop {
        id: StorageId,
        author: address,
        service_id: String,
        timestamp: u64,
    }
    
    public struct RecommendationLiked has copy, drop {
        id: StorageId,
        user: address,
        new_engagement_points: u64,
        timestamp: u64,
    }
    
    public struct RecommendationSaved has copy, drop {
        id: StorageId,
        user: address,
        new_engagement_points: u64,
        timestamp: u64,
    }
    
    public struct CommentAdded has copy, drop {
        id: StorageId,
        user: address,
        comment_text: String,
        new_engagement_points: u64,
        timestamp: u64,
    }
    
    public struct ValidationThresholdReached has copy, drop {
        id: StorageId,
        author: address,
        engagement_points: u64,
        timestamp: u64,
    }
    
    /// Initialize the recommendation module
    fun init(_witness: RECOMMENDATION, ctx: &mut TxContext) {
        // Create global registry
        let global_registry = GlobalRecommendationRegistry {
            id: object::new(ctx),
            recommendations: vector::empty<StorageId>(),
            last_id: 0,
            total_recommendations: 0,
            total_engagement_points: 0,
        };
        
        transfer::share_object(global_registry);
    }
    
    /// Create a new recommendation with immediate reward distribution
    public fun create_recommendation(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut rewards::GlobalRewardsRegistry,
        user_status_registry: &mut user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        global_registry: &mut GlobalRecommendationRegistry,
        service_id: String,
        category_code: u8,
        latitude: u64,
        longitude: u64,
        is_negative_lat: bool,
        is_negative_long: bool,
        content_hash_bytes: vector<u8>,
        hash_type: u8,
        ipfs_cid: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): Recommendation {
        let author_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Check rate limit via user_status
        assert!(user_status::check_rate_limit(user_status_registry, author_addr, clock), 
                E_RATE_LIMIT_EXCEEDED);
        
        // Generate unique ID
        global_registry.last_id = global_registry.last_id + 1;
        let rec_id = global_registry.last_id;
        
        // Convert numeric ID to string
        let mut id_string = std::string::utf8(b"REC");
        std::string::append(&mut id_string, u64_to_string(rec_id));
        let storage_id = StorageId { id_string };
        
        // Create helper objects
        let content_hash = ContentHash { hash_bytes: content_hash_bytes, hash_type };
        let category = Category { category_code };
        let location = Location { latitude, longitude, is_negative_lat, is_negative_long };
        let timestamp = TimeStamp { timestamp_ms: now };
        let ipfs_cid_obj = IpfsCid { cid_string: ipfs_cid };
        
        // Create recommendation
        let recommendation = Recommendation {
            id: object::new(ctx),
            storage_id,
            author: author_addr,
            timestamp,
            service_id,
            category,
            location,
            content_hash,
            ipfs_cid: ipfs_cid_obj,
            
            likes: vector::empty<address>(),
            saves: vector::empty<address>(),
            comments: vector::empty<Comment>(),
            
            engagement_points: 0,
            validation_threshold_met: false,
            validation_bonus_claimed: false,
            
            created_at: now,
            last_updated: now,
        };
        
        // Add to global registry
        vector::push_back(&mut global_registry.recommendations, storage_id);
        global_registry.total_recommendations = global_registry.total_recommendations + 1;
        
        // Increment user's recommendation count in user_status
        user_status::increment_recommendation_count(user_status_registry, author_addr, clock);
        
        // Distribute creation reward (0.5 BOCA)
        rewards::distribute_creation_reward(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            author_addr,
            storage_id.id_string,
            clock,
            ctx
        );
        
        // Emit event
        event::emit(RecommendationCreated {
            id: storage_id,
            author: author_addr,
            service_id,
            timestamp: now,
        });
        
        recommendation
    }
    
    /// Create user engagement tracker
    public fun create_user_engagement(ctx: &mut TxContext): UserEngagement {
        let user_addr = tx_context::sender(ctx);
        
        UserEngagement {
            id: object::new(ctx),
            user_address: user_addr,
            liked_recommendations: table::new<String, bool>(ctx),
            saved_recommendations: table::new<String, bool>(ctx),
            commented_recommendations: table::new<String, u64>(ctx),
        }
    }
    
    /// Like a recommendation (no reward for likes)
    public fun like_recommendation(
        user_status_registry: &mut user_status::UserStatusRegistry,
        recommendation: &mut Recommendation,
        user_engagement: &mut UserEngagement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Verify user owns the engagement tracker
        assert!(user_engagement.user_address == user_addr, E_NOT_AUTHOR);
        
        // Check if user is not the author
        assert!(recommendation.author != user_addr, E_CANNOT_ENGAGE_OWN);
        
        // Check if user has already liked
        let storage_id_str = std::string::utf8(*std::string::bytes(&recommendation.storage_id.id_string));
        assert!(!table::contains(&user_engagement.liked_recommendations, storage_id_str), 
                E_ALREADY_ENGAGED);
        
        // Add like
        vector::push_back(&mut recommendation.likes, user_addr);
        table::add(&mut user_engagement.liked_recommendations, storage_id_str, true);
        
        // Get user's tier weight
        let tier_weight = user_status::get_engagement_weight(user_status_registry, user_addr);
        
        // Calculate engagement points for this like
        let like_points = (LIKE_VALUE * tier_weight) / 1000;
        
        // Update engagement points
        recommendation.engagement_points = recommendation.engagement_points + like_points;
        recommendation.last_updated = now;
        
        // Check validation threshold (no rewards distributed here, just check)
        check_validation_threshold_internal(
            recommendation, 
            user_status_registry, 
            clock
        );
        
        // Emit event
        event::emit(RecommendationLiked {
            id: recommendation.storage_id,
            user: user_addr,
            new_engagement_points: recommendation.engagement_points,
            timestamp: now,
        });
    }
    
    /// Save a recommendation - rewards the AUTHOR of the recommendation
    public fun save_recommendation(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut rewards::GlobalRewardsRegistry,
        user_status_registry: &mut user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recommendation: &mut Recommendation,
        user_engagement: &mut UserEngagement,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Verify user owns the engagement tracker
        assert!(user_engagement.user_address == user_addr, E_NOT_AUTHOR);
        
        // Check if user is not the author
        assert!(recommendation.author != user_addr, E_CANNOT_ENGAGE_OWN);
        
        // Check if user has already saved
        let storage_id_str = std::string::utf8(*std::string::bytes(&recommendation.storage_id.id_string));
        assert!(!table::contains(&user_engagement.saved_recommendations, storage_id_str), 
                E_ALREADY_ENGAGED);
        
        // Add save
        vector::push_back(&mut recommendation.saves, user_addr);
        table::add(&mut user_engagement.saved_recommendations, storage_id_str, true);
        
        // Get user's tier weight
        let tier_weight = user_status::get_engagement_weight(user_status_registry, user_addr);
        
        // Calculate engagement points for this save
        let save_points = (SAVE_VALUE * tier_weight) / 1000;
        
        // Update engagement points
        recommendation.engagement_points = recommendation.engagement_points + save_points;
        recommendation.last_updated = now;
        
        // Distribute engagement reward to AUTHOR (0.1 BOCA × tier weight)
        rewards::distribute_engagement_reward(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recommendation.author,  // Reward goes to the author
            2,  // REWARD_TYPE_ENGAGEMENT_SAVE
            recommendation.storage_id.id_string,
            clock,
            ctx
        );
        
        // Check validation threshold
        check_validation_threshold(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recommendation,
            clock,
            ctx
        );
        
        // Emit event
        event::emit(RecommendationSaved {
            id: recommendation.storage_id,
            user: user_addr,
            new_engagement_points: recommendation.engagement_points,
            timestamp: now,
        });
    }
    
    /// Add a comment to a recommendation - rewards the AUTHOR of the recommendation
    public fun add_comment(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut rewards::GlobalRewardsRegistry,
        user_status_registry: &mut user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recommendation: &mut Recommendation,
        user_engagement: &mut UserEngagement,
        comment_text: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user_addr = tx_context::sender(ctx);
        let now = clock::timestamp_ms(clock);
        
        // Verify user owns the engagement tracker
        assert!(user_engagement.user_address == user_addr, E_NOT_AUTHOR);
        
        // Check if user is not the author
        assert!(recommendation.author != user_addr, E_CANNOT_ENGAGE_OWN);
        
        // Validate comment text is not empty
        assert!(std::string::length(&comment_text) > 0, E_INVALID_COMMENT);
        
        // Get user's tier weight
        let tier_weight = user_status::get_engagement_weight(user_status_registry, user_addr);
        
        // Create comment
        let comment = Comment {
            commenter: user_addr,
            comment_text,
            timestamp: now,
            engagement_weight: tier_weight,
        };
        
        // Add comment to recommendation
        vector::push_back(&mut recommendation.comments, comment);
        
        // Track user's comment count for this recommendation
        let storage_id_str = std::string::utf8(*std::string::bytes(&recommendation.storage_id.id_string));
        let current_count = if (table::contains(&user_engagement.commented_recommendations, storage_id_str)) {
            *table::borrow(&user_engagement.commented_recommendations, storage_id_str)
        } else {
            0
        };
        
        if (current_count == 0) {
            table::add(&mut user_engagement.commented_recommendations, storage_id_str, 1);
        } else {
            *table::borrow_mut(&mut user_engagement.commented_recommendations, storage_id_str) = current_count + 1;
        };
        
        // Calculate engagement points for this comment
        let comment_points = (COMMENT_VALUE * tier_weight) / 1000;
        
        // Update engagement points
        recommendation.engagement_points = recommendation.engagement_points + comment_points;
        recommendation.last_updated = now;
        
        // Distribute engagement reward to AUTHOR (0.05 BOCA × tier weight)
        rewards::distribute_engagement_reward(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recommendation.author,  // Reward goes to the author
            3,  // REWARD_TYPE_ENGAGEMENT_COMMENT
            recommendation.storage_id.id_string,
            clock,
            ctx
        );
        
        // Check validation threshold
        check_validation_threshold(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recommendation,
            clock,
            ctx
        );
        
        // Emit event
        event::emit(CommentAdded {
            id: recommendation.storage_id,
            user: user_addr,
            comment_text,
            new_engagement_points: recommendation.engagement_points,
            timestamp: now,
        });
    }
    
    /// Check if recommendation has reached validation threshold and distribute bonus
    fun check_validation_threshold(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut rewards::GlobalRewardsRegistry,
        user_status_registry: &mut user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recommendation: &mut Recommendation,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        if (!recommendation.validation_threshold_met && 
            recommendation.engagement_points >= VALIDATION_THRESHOLD) {
            
            recommendation.validation_threshold_met = true;
            
            // Notify user_status that recommendation is validated
            user_status::mark_recommendation_validated(
                user_status_registry,
                recommendation.author,
                clock
            );
            
            // Distribute validation bonus if not already claimed (1.0 BOCA)
            if (!recommendation.validation_bonus_claimed) {
                rewards::distribute_validation_bonus(
                    treasury_cap,
                    rewards_registry,
                    user_status_registry,
                    escrow_registry,
                    email_escrow_registry,
                    recommendation.author,
                    recommendation.storage_id.id_string,
                    clock,
                    ctx
                );
                
                recommendation.validation_bonus_claimed = true;
            };
            
            // Emit event
            event::emit(ValidationThresholdReached {
                id: recommendation.storage_id,
                author: recommendation.author,
                engagement_points: recommendation.engagement_points,
                timestamp: clock::timestamp_ms(clock),
            });
        };
    }
    
    /// Internal check without reward distribution (used by like_recommendation)
    fun check_validation_threshold_internal(
        recommendation: &mut Recommendation,
        user_status_registry: &mut user_status::UserStatusRegistry,
        clock: &Clock,
    ) {
        if (!recommendation.validation_threshold_met && 
            recommendation.engagement_points >= VALIDATION_THRESHOLD) {
            
            recommendation.validation_threshold_met = true;
            
            // Notify user_status that recommendation is validated
            user_status::mark_recommendation_validated(
                user_status_registry,
                recommendation.author,
                clock
            );
            
            // Note: Validation bonus will be claimed when this function is called
            // with treasury_cap parameter (via save or comment actions)
            
            // Emit event
            event::emit(ValidationThresholdReached {
                id: recommendation.storage_id,
                author: recommendation.author,
                engagement_points: recommendation.engagement_points,
                timestamp: clock::timestamp_ms(clock),
            });
        };
    }
    
    /// Manually claim validation bonus (if threshold was met via likes)
    public fun claim_validation_bonus(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        rewards_registry: &mut rewards::GlobalRewardsRegistry,
        user_status_registry: &user_status::UserStatusRegistry,
        escrow_registry: &mut escrow::GlobalEscrowRegistry,
        email_escrow_registry: &mut email_escrow::GlobalEmailEscrowRegistry,
        recommendation: &mut Recommendation,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        // Verify caller is the author
        assert!(caller == recommendation.author, E_NOT_AUTHOR);
        
        // Verify threshold is met
        assert!(recommendation.validation_threshold_met, E_RECOMMENDATION_NOT_FOUND);
        
        // Verify bonus not already claimed
        assert!(!recommendation.validation_bonus_claimed, E_REWARD_ALREADY_CLAIMED);
        
        // Distribute validation bonus (1.0 BOCA)
        rewards::distribute_validation_bonus(
            treasury_cap,
            rewards_registry,
            user_status_registry,
            escrow_registry,
            email_escrow_registry,
            recommendation.author,
            recommendation.storage_id.id_string,
            clock,
            ctx
        );
        
        recommendation.validation_bonus_claimed = true;
    }
    
    /// Get recommendation data
    public fun get_recommendation_data(recommendation: &Recommendation): (
        address,      // author
        String,       // service_id
        u64,          // engagement_points
        u64,          // likes count
        u64,          // saves count
        u64,          // comments count
        bool,         // validation_threshold_met
        bool,         // validation_bonus_claimed
        String        // ipfs_cid
    ) {
        (
            recommendation.author,
            recommendation.service_id,
            recommendation.engagement_points,
            vector::length(&recommendation.likes),
            vector::length(&recommendation.saves),
            vector::length(&recommendation.comments),
            recommendation.validation_threshold_met,
            recommendation.validation_bonus_claimed,
            recommendation.ipfs_cid.cid_string
        )
    }
    
    /// Get engagement breakdown
    public fun get_engagement_breakdown(recommendation: &Recommendation): (u64, u64, u64, u64) {
        (
            vector::length(&recommendation.likes),
            vector::length(&recommendation.saves),
            vector::length(&recommendation.comments),
            recommendation.engagement_points
        )
    }
    
    /// Get comments
    public fun get_comments(recommendation: &Recommendation): vector<Comment> {
        recommendation.comments
    }
    
    /// Check if user has liked a recommendation
    public fun has_liked(
        user_engagement: &UserEngagement,
        storage_id: &StorageId
    ): bool {
        let storage_id_str = std::string::utf8(*std::string::bytes(&storage_id.id_string));
        table::contains(&user_engagement.liked_recommendations, storage_id_str)
    }
    
    /// Check if user has saved a recommendation
    public fun has_saved(
        user_engagement: &UserEngagement,
        storage_id: &StorageId
    ): bool {
        let storage_id_str = std::string::utf8(*std::string::bytes(&storage_id.id_string));
        table::contains(&user_engagement.saved_recommendations, storage_id_str)
    }
    
    /// Get user's comment count for a recommendation
    public fun get_user_comment_count(
        user_engagement: &UserEngagement,
        storage_id: &StorageId
    ): u64 {
        let storage_id_str = std::string::utf8(*std::string::bytes(&storage_id.id_string));
        if (table::contains(&user_engagement.commented_recommendations, storage_id_str)) {
            *table::borrow(&user_engagement.commented_recommendations, storage_id_str)
        } else {
            0
        }
    }
    
    /// Get storage ID string
    public fun get_storage_id_string(storage_id: &StorageId): String {
        storage_id.id_string
    }
    
    /// Get global registry stats
    public fun get_registry_stats(registry: &GlobalRecommendationRegistry): (u64, u64, u64) {
        (
            registry.last_id,
            registry.total_recommendations,
            registry.total_engagement_points
        )
    }
    
    /// Convert u64 to string (helper function)
    fun u64_to_string(value: u64): String {
        use std::string;
        
        if (value == 0) {
            return string::utf8(b"0")
        };
        
        let mut buffer = vector::empty<u8>();
        let mut temp = value;
        
        while (temp > 0) {
            let digit = ((temp % 10) as u8) + 48; // Convert to ASCII
            vector::push_back(&mut buffer, digit);
            temp = temp / 10;
        };
        
        // Reverse the digits
        let len = vector::length(&buffer);
        let mut i = 0;
        let mut j = len - 1;
        
        while (i < j) {
            let temp_val = *vector::borrow(&buffer, i);
            *vector::borrow_mut(&mut buffer, i) = *vector::borrow(&buffer, j);
            *vector::borrow_mut(&mut buffer, j) = temp_val;
            i = i + 1;
            if (j > 0) {
                j = j - 1;
            };
        };
        
        string::utf8(buffer)
    }
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let global_registry = GlobalRecommendationRegistry {
            id: object::new(ctx),
            recommendations: vector::empty<StorageId>(),
            last_id: 0,
            total_recommendations: 0,
            total_engagement_points: 0,
        };
        
        transfer::share_object(global_registry);
    }
}
