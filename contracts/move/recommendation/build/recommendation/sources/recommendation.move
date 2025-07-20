module omeone::recommendation {
    use std::string::{String};
    use iota::object::{UID};
    use iota::tx_context::{TxContext};
    use iota::transfer;
    use iota::event;
    
    // One-time witness for initialization
    public struct RECOMMENDATION has drop {}
    
    /// Error codes
    const E_RECOMMENDATION_NOT_FOUND: u64 = 101;
    const E_ALREADY_VOTED: u64 = 102;
    const E_CANNOT_VOTE_OWN: u64 = 103;
    const E_NOT_AUTHOR: u64 = 104;
    const E_RECOMMENDATION_ALREADY_EXISTS: u64 = 105;
    
    /// Constants
    const BASE_REWARD_THRESHOLD: u64 = 25; // Trust score must reach 0.25 to trigger reward
    const TRUST_MULTIPLIER_CAP: u64 = 300; // Maximum 3x multiplier for trust bonus
    const MAX_TRUST_SCORE: u64 = 1000; // 10.00 trust score
    const DIRECT_FOLLOWER_WEIGHT: u64 = 75; // 0.75 weight
    const INDIRECT_FOLLOWER_WEIGHT: u64 = 25; // 0.25 weight
    const MIN_TRUST_WEIGHT: u64 = 0; // No weight beyond 2 hops
    
    /// Simplified StorageId for standalone deployment
    public struct StorageId has store, copy, drop {
        id_string: String,
    }
    
    /// Simplified content hash
    public struct ContentHash has store, copy, drop {
        hash_bytes: vector<u8>,
        hash_type: u8,
    }
    
    /// Simplified IPFS CID
    public struct IpfsCid has store, copy, drop {
        cid_string: String,
    }
    
    /// Simplified Category
    public struct Category has store, copy, drop {
        category_code: u8,
    }
    
    /// Simplified Location
    public struct Location has store, copy, drop {
        latitude: u64,
        longitude: u64,
        is_negative_lat: bool,
        is_negative_long: bool,
    }
    
    /// Simplified Timestamp
    public struct TimeStamp has store, copy, drop {
        timestamp_ms: u64,
    }
    
    /// Recommendation struct representing a user recommendation
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
        upvotes: vector<address>,
        downvotes: vector<address>,
        trust_score: u64,  // Trust score with 2 decimal precision (e.g., 125 = 1.25)
        trust_weight_sum: u64, // Sum of all trust weights applied (used for reward calculation)
        reward_claimed: bool,
        has_reward_threshold: bool, // Whether recommendation has reached reward threshold
    }
    
    /// RecommendationRegistry to track all recommendations by a user
    public struct RecommendationRegistry has key {
        id: UID,
        recommendations: vector<StorageId>,
    }
    
    /// Global registry of all recommendations in the system
    public struct GlobalRecommendationRegistry has key {
        id: UID,
        recommendations: vector<StorageId>,
        last_id: u64,
    }
    
    /// Events
    public struct RecommendationCreated has copy, drop {
        id: StorageId,
        author: address,
        service_id: String,
    }
    
    public struct RecommendationUpvoted has copy, drop {
        id: StorageId,
        voter: address,
        new_trust_score: u64,
    }
    
    public struct RecommendationDownvoted has copy, drop {
        id: StorageId,
        voter: address,
        new_trust_score: u64,
    }
    
    /// Initialize the recommendation module - called automatically on deployment
    fun init(_witness: RECOMMENDATION, ctx: &mut TxContext) {
        use iota::object;
        use std::vector;
        
        // Create global registry
        let global_registry = GlobalRecommendationRegistry {
            id: object::new(ctx),
            recommendations: vector::empty<StorageId>(),
            last_id: 0,
        };
        
        transfer::share_object(global_registry);
    }
    
    /// Create a new recommendation
    public fun create_recommendation(
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
        ctx: &mut TxContext
    ): Recommendation {
        use iota::tx_context;
        use iota::object;
        use std::vector;
        use std::string;
        
        // Get author address
        let author_addr = tx_context::sender(ctx);
        
        // Generate unique ID
        global_registry.last_id = global_registry.last_id + 1;
        let rec_id = global_registry.last_id;
        
        // Convert numeric ID to string
        let mut id_string = string::utf8(b"REC");
        string::append(&mut id_string, u64_to_string(rec_id));
        let storage_id = StorageId { id_string };
        
        // Create content hash, category, location, and timestamp objects
        let content_hash = ContentHash { hash_bytes: content_hash_bytes, hash_type };
        let category = Category { category_code };
        let location = Location { latitude, longitude, is_negative_lat, is_negative_long };
        let timestamp = TimeStamp { timestamp_ms: 0 }; // Would use real timestamp in production
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
            upvotes: vector::empty<address>(),
            downvotes: vector::empty<address>(),
            trust_score: 0,
            trust_weight_sum: 0,
            reward_claimed: false,
            has_reward_threshold: false,
        };
        
        // Add to global registry
        vector::push_back(&mut global_registry.recommendations, storage_id);
        
        // Emit event
        event::emit(RecommendationCreated {
            id: storage_id,
            author: author_addr,
            service_id,
        });
        
        recommendation
    }
    
    /// Create user recommendation registry
    public fun create_user_registry(ctx: &mut TxContext): RecommendationRegistry {
        use iota::object;
        use std::vector;
        
        RecommendationRegistry {
            id: object::new(ctx),
            recommendations: vector::empty<StorageId>(),
        }
    }
    
    /// Add recommendation to user registry
    public fun add_to_user_registry(
        registry: &mut RecommendationRegistry,
        storage_id: StorageId
    ) {
        use std::vector;
        
        vector::push_back(&mut registry.recommendations, storage_id);
    }
    
    /// Upvote a recommendation - simplified for standalone deployment
    public fun upvote_recommendation(
        recommendation: &mut Recommendation,
        voter_addr: address,
        voter_trust_modifier: u64, // Simplified - would get from reputation system
        social_distance: u8, // Simplified - would calculate from social graph
        ctx: &mut TxContext
    ) {
        use std::vector;
        
        // Check if voter is not the author
        assert!(recommendation.author != voter_addr, E_CANNOT_VOTE_OWN);
        
        // Check if voter has already voted
        assert!(!has_voted(recommendation, voter_addr), E_ALREADY_VOTED);
        
        // Calculate trust weight
        let trust_weight = calculate_trust_weight(social_distance, voter_trust_modifier);
        
        // Add upvote
        vector::push_back(&mut recommendation.upvotes, voter_addr);
        
        // Update trust score
        update_trust_score(recommendation);
        
        // Update trust weight sum
        recommendation.trust_weight_sum = recommendation.trust_weight_sum + trust_weight;
        
        // Check if recommendation now meets threshold for rewards
        if (!recommendation.has_reward_threshold && recommendation.trust_score >= BASE_REWARD_THRESHOLD) {
            recommendation.has_reward_threshold = true;
            // Trigger reward calculation - would call token module in full implementation
        };
        
        // Emit event
        event::emit(RecommendationUpvoted {
            id: recommendation.storage_id,
            voter: voter_addr,
            new_trust_score: recommendation.trust_score,
        });
    }
    
    /// Downvote a recommendation
    public fun downvote_recommendation(
        recommendation: &mut Recommendation,
        voter_addr: address,
        _ctx: &mut TxContext
    ) {
        use std::vector;
        
        // Check if voter is not the author
        assert!(recommendation.author != voter_addr, E_CANNOT_VOTE_OWN);
        
        // Check if voter has already voted
        assert!(!has_voted(recommendation, voter_addr), E_ALREADY_VOTED);
        
        // Add downvote
        vector::push_back(&mut recommendation.downvotes, voter_addr);
        
        // Update trust score
        update_trust_score(recommendation);
        
        // Emit event
        event::emit(RecommendationDownvoted {
            id: recommendation.storage_id,
            voter: voter_addr,
            new_trust_score: recommendation.trust_score,
        });
    }
    
    /// Calculate trust weight based on social distance and reputation
    fun calculate_trust_weight(social_dist: u8, voter_trust_modifier: u64): u64 {
        let base_weight = if (social_dist == 1) {
            DIRECT_FOLLOWER_WEIGHT
        } else if (social_dist == 2) {
            INDIRECT_FOLLOWER_WEIGHT
        } else {
            MIN_TRUST_WEIGHT
        };
        
        // Apply reputation modifier
        base_weight * voter_trust_modifier / 100 // Normalize by dividing by 100
    }
    
    /// Update trust score for a recommendation based on votes
    fun update_trust_score(recommendation: &mut Recommendation) {
        use std::vector;
        
        let upvote_count = vector::length(&recommendation.upvotes);
        let downvote_count = vector::length(&recommendation.downvotes);
        
        if (upvote_count == 0 && downvote_count == 0) {
            recommendation.trust_score = 0;
            return
        };
        
        // Calculate ratio of upvotes
        let total_votes = upvote_count + downvote_count;
        let upvote_ratio = (upvote_count * 100) / total_votes;
        
        // Apply volume factor (square root of total votes, capped)
        let volume_factor = if (total_votes > 100) {
            10 // Cap at 10x for 100+ votes
        } else {
            // Simplified approximation of square root factor
            let sqrt_factor = if (total_votes < 4) { total_votes } else if (total_votes < 9) { 2 + (total_votes / 4) } else { 3 + (total_votes / 9) };
            sqrt_factor
        };
        
        // Calculate trust score (upvote_ratio * volume_factor)
        let raw_score = upvote_ratio * volume_factor;
        
        // Cap at max trust score (10.00) 
        if (raw_score > MAX_TRUST_SCORE) {
            recommendation.trust_score = MAX_TRUST_SCORE;
        } else {
            recommendation.trust_score = raw_score;
        }
    }
    
    /// Check if a user has already voted on a recommendation
    fun has_voted(recommendation: &Recommendation, voter: address): bool {
        use std::vector;
        
        vector::contains(&recommendation.upvotes, &voter) || 
        vector::contains(&recommendation.downvotes, &voter)
    }
    
    /// Find a recommendation by ID in global registry
    public fun find_recommendation_in_registry(
        global_registry: &GlobalRecommendationRegistry,
        storage_id: &StorageId
    ): bool {
        use std::vector;
        use std::string;
        
        let mut i = 0;
        let len = vector::length(&global_registry.recommendations);
        
        while (i < len) {
            let rec_id = vector::borrow(&global_registry.recommendations, i);
            if (string::as_bytes(&rec_id.id_string) == string::as_bytes(&storage_id.id_string)) {
                return true
            };
            i = i + 1;
        };
        
        false
    }
    
    /// Get recommendation data (public view)
    public fun get_recommendation_data(recommendation: &Recommendation): (address, String, u64, u64, u64, String) {
        use std::vector;
        
        let upvotes = vector::length(&recommendation.upvotes);
        let downvotes = vector::length(&recommendation.downvotes);
        
        (
            recommendation.author,
            recommendation.service_id,
            recommendation.trust_score,
            upvotes,
            downvotes,
            recommendation.ipfs_cid.cid_string
        )
    }
    
    /// Get recommendation by ID (public view wrapper for compatibility)
    public fun get_recommendation(_id: String): (bool, address, String, u64, u64, u64, String) {
        use std::string;
        
        // This is a simplified version - in a real implementation,
        // you would need to pass in the recommendation object or have a global lookup
        // For now, return default values to maintain interface compatibility
        (false, @0x0, string::utf8(b""), 0, 0, 0, string::utf8(b""))
    }
    
    /// Calculate reward for a recommendation
    public fun calculate_reward_multiplier(recommendation: &Recommendation): u64 {
        // No reward if threshold not met
        if (!recommendation.has_reward_threshold) {
            return 0
        };
        
        // Cap the multiplier at TRUST_MULTIPLIER_CAP (3.00)
        if (recommendation.trust_weight_sum > TRUST_MULTIPLIER_CAP) {
            return TRUST_MULTIPLIER_CAP
        } else {
            return recommendation.trust_weight_sum
        }
    }
    
    /// Mark recommendation reward as claimed
    public fun mark_reward_claimed(recommendation: &mut Recommendation) {
        recommendation.reward_claimed = true;
    }
    
    /// Get recommendation statistics
    public fun get_recommendation_stats(recommendation: &Recommendation): (u64, u64, u64, bool, bool) {
        use std::vector;
        
        (
            vector::length(&recommendation.upvotes),
            vector::length(&recommendation.downvotes),
            recommendation.trust_score,
            recommendation.has_reward_threshold,
            recommendation.reward_claimed
        )
    }
    
    /// Convert u64 to string (helper function)
    fun u64_to_string(value: u64): String {
        use std::string;
        use std::vector;
        
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
            j = j - 1;
        };
        
        string::utf8(buffer)
    }
    
    /// Get storage ID string
    public fun get_storage_id_string(storage_id: &StorageId): String {
        storage_id.id_string
    }
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        use iota::object;
        use std::vector;
        
        let global_registry = GlobalRecommendationRegistry {
            id: object::new(ctx),
            recommendations: vector::empty<StorageId>(),
            last_id: 0,
        };
        
        transfer::share_object(global_registry);
    }
}