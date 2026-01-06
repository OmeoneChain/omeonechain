module recommendation::recommendation {
    use std::string::String;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::Clock;
    use iota::table::{Self, Table};

    // ======== Error Codes ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_RECOMMENDATION_NOT_FOUND: u64 = 2;
    const E_ALREADY_ENGAGED: u64 = 3;
    const E_CANNOT_ENGAGE_OWN: u64 = 4;
    const E_INVALID_RATING: u64 = 5;

    // ======== Engagement Values (scaled by 1000) ========
    const SAVE_VALUE: u64 = 1000;     // 1.0 points per save
    const COMMENT_VALUE: u64 = 500;   // 0.5 points per comment
    const VALIDATION_THRESHOLD: u64 = 3000;  // 3.0 points

    // ======== Structs ========
    
    /// Admin capability for moderator functions
    public struct RecommendationAdminCap has key, store {
        id: UID,
    }

    /// Global registry tracking all recommendations
    public struct RecommendationRegistry has key {
        id: UID,
        total_recommendations: u64,
        total_engagements: u64,
        /// Maps storage_id to recommendation object ID for lookups
        recommendation_index: Table<String, address>,
    }

    /// Individual recommendation
    public struct Recommendation has key, store {
        id: UID,
        storage_id: String,           // Unique identifier
        author: address,
        restaurant_name: String,
        overall_rating: u8,           // 0-10
        content_hash: String,         // IPFS hash of full content
        
        // Engagement tracking
        save_count: u64,
        comment_count: u64,
        engagement_points: u64,       // Scaled by 1000
        
        // Validation status
        is_validated: bool,
        validation_bonus_paid: bool,
        
        // Metadata
        created_at: u64,
        updated_at: u64,
    }

    /// Tracks who has engaged with what
    public struct EngagementRecord has key {
        id: UID,
        /// Maps "user_addr:rec_storage_id:type" to bool
        engagements: Table<String, bool>,
    }

    // ======== Events ========
    
    public struct RecommendationCreated has copy, drop {
        storage_id: String,
        author: address,
        restaurant_name: String,
        overall_rating: u8,
        timestamp: u64,
    }

    public struct EngagementAdded has copy, drop {
        storage_id: String,
        user: address,
        engagement_type: u8,  // 1=save, 2=comment
        author: address,
        new_points: u64,
        timestamp: u64,
    }

    public struct ValidationReached has copy, drop {
        storage_id: String,
        author: address,
        total_points: u64,
        timestamp: u64,
    }

    // ======== Init ========
    
    fun init(ctx: &mut TxContext) {
        // Create admin cap
        transfer::transfer(
            RecommendationAdminCap { id: object::new(ctx) },
            tx_context::sender(ctx)
        );

        // Create shared registry
        transfer::share_object(RecommendationRegistry {
            id: object::new(ctx),
            total_recommendations: 0,
            total_engagements: 0,
            recommendation_index: table::new(ctx),
        });

        // Create shared engagement record
        transfer::share_object(EngagementRecord {
            id: object::new(ctx),
            engagements: table::new(ctx),
        });
    }

    // ======== Public Functions ========

    /// Create a new recommendation
    public entry fun create_recommendation(
        registry: &mut RecommendationRegistry,
        storage_id: String,
        restaurant_name: String,
        overall_rating: u8,
        content_hash: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(overall_rating <= 10, E_INVALID_RATING);
        
        let author = tx_context::sender(ctx);
        let now = iota::clock::timestamp_ms(clock);

        let rec = Recommendation {
            id: object::new(ctx),
            storage_id: storage_id,
            author,
            restaurant_name,
            overall_rating,
            content_hash,
            save_count: 0,
            comment_count: 0,
            engagement_points: 0,
            is_validated: false,
            validation_bonus_paid: false,
            created_at: now,
            updated_at: now,
        };

        // Emit creation event (off-chain system handles rewards)
        event::emit(RecommendationCreated {
            storage_id: rec.storage_id,
            author,
            restaurant_name: rec.restaurant_name,
            overall_rating,
            timestamp: now,
        });

        // Update registry
        registry.total_recommendations = registry.total_recommendations + 1;
        
        // Store recommendation object ID in index
        let rec_addr = object::uid_to_address(&rec.id);
        table::add(&mut registry.recommendation_index, rec.storage_id, rec_addr);

        // Transfer recommendation to author
        transfer::transfer(rec, author);
    }

    /// Save/bookmark a recommendation
    public entry fun save_recommendation(
        recommendation: &mut Recommendation,
        engagement_record: &mut EngagementRecord,
        registry: &mut RecommendationRegistry,
        tier_weight: u64,  // Passed from off-chain (500, 1000, or 1500 for 0.5x, 1.0x, 1.5x)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user = tx_context::sender(ctx);
        assert!(user != recommendation.author, E_CANNOT_ENGAGE_OWN);

        // Check if already engaged
        let key = make_engagement_key(user, recommendation.storage_id, 1);
        assert!(!table::contains(&engagement_record.engagements, key), E_ALREADY_ENGAGED);

        // Record engagement
        table::add(&mut engagement_record.engagements, key, true);

        // Calculate weighted points
        let points = (SAVE_VALUE * tier_weight) / 1000;
        
        // Update recommendation
        recommendation.save_count = recommendation.save_count + 1;
        recommendation.engagement_points = recommendation.engagement_points + points;
        recommendation.updated_at = iota::clock::timestamp_ms(clock);

        // Update registry
        registry.total_engagements = registry.total_engagements + 1;

        // Check validation threshold
        let now = iota::clock::timestamp_ms(clock);
        if (recommendation.engagement_points >= VALIDATION_THRESHOLD && !recommendation.is_validated) {
            recommendation.is_validated = true;
            event::emit(ValidationReached {
                storage_id: recommendation.storage_id,
                author: recommendation.author,
                total_points: recommendation.engagement_points,
                timestamp: now,
            });
        };

        // Emit engagement event (off-chain handles rewards)
        event::emit(EngagementAdded {
            storage_id: recommendation.storage_id,
            user,
            engagement_type: 1,
            author: recommendation.author,
            new_points: recommendation.engagement_points,
            timestamp: now,
        });
    }

    /// Comment on a recommendation
    public entry fun add_comment(
        recommendation: &mut Recommendation,
        engagement_record: &mut EngagementRecord,
        registry: &mut RecommendationRegistry,
        tier_weight: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user = tx_context::sender(ctx);
        assert!(user != recommendation.author, E_CANNOT_ENGAGE_OWN);

        // Check if already commented
        let key = make_engagement_key(user, recommendation.storage_id, 2);
        assert!(!table::contains(&engagement_record.engagements, key), E_ALREADY_ENGAGED);

        // Record engagement
        table::add(&mut engagement_record.engagements, key, true);

        // Calculate weighted points
        let points = (COMMENT_VALUE * tier_weight) / 1000;

        // Update recommendation
        recommendation.comment_count = recommendation.comment_count + 1;
        recommendation.engagement_points = recommendation.engagement_points + points;
        recommendation.updated_at = iota::clock::timestamp_ms(clock);

        // Update registry
        registry.total_engagements = registry.total_engagements + 1;

        // Check validation threshold
        let now = iota::clock::timestamp_ms(clock);
        if (recommendation.engagement_points >= VALIDATION_THRESHOLD && !recommendation.is_validated) {
            recommendation.is_validated = true;
            event::emit(ValidationReached {
                storage_id: recommendation.storage_id,
                author: recommendation.author,
                total_points: recommendation.engagement_points,
                timestamp: now,
            });
        };

        // Emit engagement event
        event::emit(EngagementAdded {
            storage_id: recommendation.storage_id,
            user,
            engagement_type: 2,
            author: recommendation.author,
            new_points: recommendation.engagement_points,
            timestamp: now,
        });
    }

    /// Mark validation bonus as paid (called by moderator after off-chain reward distribution)
    public entry fun mark_validation_paid(
        _admin: &RecommendationAdminCap,
        recommendation: &mut Recommendation,
    ) {
        recommendation.validation_bonus_paid = true;
    }

    // ======== View Functions ========

    public fun get_engagement_points(rec: &Recommendation): u64 {
        rec.engagement_points
    }

    public fun is_validated(rec: &Recommendation): bool {
        rec.is_validated
    }

    public fun get_author(rec: &Recommendation): address {
        rec.author
    }

    public fun get_save_count(rec: &Recommendation): u64 {
        rec.save_count
    }

    public fun get_comment_count(rec: &Recommendation): u64 {
        rec.comment_count
    }

    public fun get_total_recommendations(registry: &RecommendationRegistry): u64 {
        registry.total_recommendations
    }

    // ======== Internal Functions ========

    fun make_engagement_key(user: address, storage_id: String, engagement_type: u8): String {
        // Simple key format - in production use proper serialization
        let mut key = std::string::utf8(b"");
        std::string::append(&mut key, address_to_string(user));
        std::string::append_utf8(&mut key, b":");
        std::string::append(&mut key, storage_id);
        std::string::append_utf8(&mut key, b":");
        std::string::append(&mut key, u8_to_string(engagement_type));
        key
    }

    fun address_to_string(addr: address): String {
        // Simplified - returns hex representation
        let bytes = std::bcs::to_bytes(&addr);
        bytes_to_hex_string(bytes)
    }

    fun bytes_to_hex_string(bytes: vector<u8>): String {
        let hex_chars = b"0123456789abcdef";
        let mut result = vector::empty<u8>();
        let len = vector::length(&bytes);
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(&bytes, i);
            vector::push_back(&mut result, *vector::borrow(&hex_chars, ((byte >> 4) as u64)));
            vector::push_back(&mut result, *vector::borrow(&hex_chars, ((byte & 0x0f) as u64)));
            i = i + 1;
        };
        std::string::utf8(result)
    }

    fun u8_to_string(val: u8): String {
        if (val == 0) {
            return std::string::utf8(b"0")
        };
        if (val == 1) {
            return std::string::utf8(b"1")
        };
        std::string::utf8(b"2")
    }
}
