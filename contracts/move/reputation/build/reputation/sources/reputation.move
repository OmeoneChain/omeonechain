module omeone::reputation {
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::table::{Self, Table};
    use iota::event;

    // One-time witness following IOTA pattern
    public struct REPUTATION has drop {}

    // Error codes
    const E_INVALID_USER: u64 = 202;
    const E_REPUTATION_NOT_FOUND: u64 = 203;
    const E_UNAUTHORIZED: u64 = 204;
    const E_INVALID_SCORE: u64 = 207;
    const E_INVALID_ENGAGEMENT_TYPE: u64 = 208;
    const E_SOCIAL_DISTANCE_TOO_HIGH: u64 = 209;

    // Verification levels
    const VERIFICATION_LEVEL_BASIC: u8 = 1;
    const VERIFICATION_LEVEL_VERIFIED: u8 = 2;
    const VERIFICATION_LEVEL_EXPERT: u8 = 3;

    // Trust weights for social distance
    const TRUST_WEIGHT_DIRECT: u64 = 750;     // 0.75 weight for direct connections
    const TRUST_WEIGHT_INDIRECT: u64 = 250;   // 0.25 weight for friend-of-friend
    const MAX_SOCIAL_DISTANCE: u8 = 2;        // Beyond 2 hops = no weight

    // Core reputation data structure
    public struct ReputationScore has key, store {
        id: UID,
        user_address: address,
        base_score: u64,           // Base reputation score (0-1000)
        trust_score: u64,          // Calculated trust score (0-1000)
        verification_level: u8,     // 0=none, 1=basic, 2=verified, 3=expert
        specializations: vector<u8>, // Areas of expertise
        
        // Engagement metrics
        total_recommendations: u64,
        helpful_votes_received: u64,
        total_followers: u64,
        total_following: u64,
        
        // Temporal factors
        last_activity_time: u64,
        account_creation_time: u64,
        reputation_decay_factor: u64,
        
        // Social graph data
        social_connections: vector<address>,
        trust_relationships: Table<address, u64>, // address -> trust weight
    }

    // Global registry for reputation management
    public struct GlobalReputationRegistry has key {
        id: UID,
        total_users: u64,
        reputation_scores: Table<address, ReputationScore>,
        verification_requests: Table<address, u8>,
        admin_addresses: vector<address>,
    }

    // Social graph structure for relationship management
    public struct SocialGraph has key, store {
        id: UID,
        user_address: address,
        direct_connections: vector<address>,
        connection_strengths: Table<address, u64>,
        last_updated: u64,
    }

    // Events
    public struct ReputationUpdated has copy, drop {
        user: address,
        old_score: u64,
        new_score: u64,
        update_reason: u8,
    }

    public struct SocialConnectionAdded has copy, drop {
        user: address,
        connected_to: address,
        connection_strength: u64,
    }

    public struct VerificationLevelChanged has copy, drop {
        user: address,
        old_level: u8,
        new_level: u8,
    }

    // Initialize the reputation system
    fun init(witness: REPUTATION, ctx: &mut TxContext) {
        let registry = GlobalReputationRegistry {
            id: object::new(ctx),
            total_users: 0,
            reputation_scores: table::new(ctx),
            verification_requests: table::new(ctx),
            admin_addresses: vector::empty(),
        };
        
        transfer::share_object(registry);
    }

    // Create initial reputation score for a new user
    public fun initialize_reputation(
        user_addr: address,
        registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        assert!(!table::contains(&registry.reputation_scores, user_addr), E_REPUTATION_NOT_FOUND);

        let reputation = ReputationScore {
            id: object::new(ctx),
            user_address: user_addr,
            base_score: 100,  // Starting score
            trust_score: 100,
            verification_level: VERIFICATION_LEVEL_BASIC,
            specializations: vector::empty(),
            total_recommendations: 0,
            helpful_votes_received: 0,
            total_followers: 0,
            total_following: 0,
            last_activity_time: 0, // Should be current timestamp
            account_creation_time: 0, // Should be current timestamp  
            reputation_decay_factor: 1000,
            social_connections: vector::empty(),
            trust_relationships: table::new(ctx),
        };

        table::add(&mut registry.reputation_scores, user_addr, reputation);
        registry.total_users = registry.total_users + 1;

        event::emit(ReputationUpdated {
            user: user_addr,
            old_score: 0,
            new_score: 100,
            update_reason: 1, // Account creation
        });
    }

    // Add social connection between users
    public fun add_social_connection(
        user_addr: address,
        target_addr: address,
        connection_strength: u64,
        registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.reputation_scores, user_addr), E_REPUTATION_NOT_FOUND);
        assert!(connection_strength <= 1000, E_INVALID_SCORE);

        let user_reputation = table::borrow_mut(&mut registry.reputation_scores, user_addr);
        
        if (!vector::contains(&user_reputation.social_connections, &target_addr)) {
            vector::push_back(&mut user_reputation.social_connections, target_addr);
        };
        
        if (table::contains(&user_reputation.trust_relationships, target_addr)) {
            let existing_strength = table::remove(&mut user_reputation.trust_relationships, target_addr);
            table::add(&mut user_reputation.trust_relationships, target_addr, connection_strength);
        } else {
            table::add(&mut user_reputation.trust_relationships, target_addr, connection_strength);
        };

        event::emit(SocialConnectionAdded {
            user: user_addr,
            connected_to: target_addr,
            connection_strength,
        });
    }

    // Update reputation score based on activity
    public fun update_reputation_score(
        user_addr: address,
        score_delta: u64,
        update_type: u8,
        registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.reputation_scores, user_addr), E_REPUTATION_NOT_FOUND);

        let user_reputation = table::borrow_mut(&mut registry.reputation_scores, user_addr);
        let old_score = user_reputation.base_score;
        
        // Update base score (with bounds checking)
        if (update_type == 1) { // Positive update
            user_reputation.base_score = user_reputation.base_score + score_delta;
            if (user_reputation.base_score > 1000) {
                user_reputation.base_score = 1000;
            };
        } else { // Negative update
            if (user_reputation.base_score > score_delta) {
                user_reputation.base_score = user_reputation.base_score - score_delta;
            } else {
                user_reputation.base_score = 0;
            };
        };

        // Recalculate trust score
        user_reputation.trust_score = calculate_trust_score(user_reputation);

        event::emit(ReputationUpdated {
            user: user_addr,
            old_score,
            new_score: user_reputation.base_score,
            update_reason: update_type,
        });
    }

    // Calculate trust score based on various factors
    fun calculate_trust_score(reputation: &ReputationScore): u64 {
        let base = reputation.base_score;
        
        // Apply verification level multiplier
        let verification_multiplier = if (reputation.verification_level == VERIFICATION_LEVEL_EXPERT) {
            1200
        } else if (reputation.verification_level == VERIFICATION_LEVEL_VERIFIED) {
            1100
        } else {
            1000
        };
        
        // Apply social factor (more connections = slight boost, capped)
        let social_factor = vector::length(&reputation.social_connections);
        let social_boost = if (social_factor > 100) { 100 } else { social_factor };
        
        // Calculate final trust score
        let trust_score = (base * verification_multiplier) / 1000 + social_boost;
        
        if (trust_score > 1000) { 1000 } else { trust_score }
    }

    // Set verification level for a user
    public fun set_verification_level(
        user_addr: address,
        new_level: u8,
        admin_addr: address,
        registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        assert!(vector::contains(&registry.admin_addresses, &admin_addr), E_UNAUTHORIZED);
        assert!(table::contains(&registry.reputation_scores, user_addr), E_REPUTATION_NOT_FOUND);
        assert!(new_level <= VERIFICATION_LEVEL_EXPERT, E_INVALID_SCORE);

        let user_reputation = table::borrow_mut(&mut registry.reputation_scores, user_addr);
        let old_level = user_reputation.verification_level;
        user_reputation.verification_level = new_level;
        
        // Recalculate trust score with new verification level
        user_reputation.trust_score = calculate_trust_score(user_reputation);

        event::emit(VerificationLevelChanged {
            user: user_addr,
            old_level,
            new_level,
        });
    }

    // Get user's reputation score
    public fun get_reputation_score(user_addr: address, registry: &GlobalReputationRegistry): u64 {
        if (!table::contains(&registry.reputation_scores, user_addr)) {
            return 0
        };
        
        let reputation = table::borrow(&registry.reputation_scores, user_addr);
        reputation.base_score
    }

    // Get user's trust score (weighted by verification and social factors)
    public fun get_trust_score(user_addr: address, registry: &GlobalReputationRegistry): u64 {
        if (!table::contains(&registry.reputation_scores, user_addr)) {
            return 0
        };
        
        let reputation = table::borrow(&registry.reputation_scores, user_addr);
        reputation.trust_score
    }

    // Get verification level
    public fun get_verification_level(user_addr: address, registry: &GlobalReputationRegistry): u8 {
        if (!table::contains(&registry.reputation_scores, user_addr)) {
            return 0
        };
        
        let reputation = table::borrow(&registry.reputation_scores, user_addr);
        reputation.verification_level
    }

    // Get social connections count
    public fun get_social_connections_count(user_addr: address, registry: &GlobalReputationRegistry): u64 {
        if (!table::contains(&registry.reputation_scores, user_addr)) {
            return 0
        };
        
        let reputation = table::borrow(&registry.reputation_scores, user_addr);
        vector::length(&reputation.social_connections)
    }

    // Check if two users are connected
    public fun are_users_connected(
        user_addr: address,
        target_addr: address,
        registry: &GlobalReputationRegistry
    ): bool {
        if (!table::contains(&registry.reputation_scores, user_addr)) {
            return false
        };
        
        let reputation = table::borrow(&registry.reputation_scores, user_addr);
        vector::contains(&reputation.social_connections, &target_addr)
    }

    // Calculate social distance between users (simplified)
    public fun calculate_social_distance(
        user_addr: address,
        target_addr: address,
        registry: &GlobalReputationRegistry
    ): u8 {
        if (user_addr == target_addr) {
            return 0
        };
        
        // Direct connection check
        if (are_users_connected(user_addr, target_addr, registry)) {
            return 1
        };
        
        // For now, return max distance if not directly connected
        // In full implementation, would do BFS to find shortest path
        MAX_SOCIAL_DISTANCE + 1
    }

    // Get trust weight based on social distance
    public fun get_trust_weight_for_distance(social_distance: u8): u64 {
        if (social_distance == 1) {
            TRUST_WEIGHT_DIRECT
        } else if (social_distance == 2) {
            TRUST_WEIGHT_INDIRECT  
        } else {
            0 // No trust weight beyond 2 hops
        }
    }

    // Administrative function to add admin
    public fun add_admin(
        new_admin: address,
        current_admin: address,
        registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        assert!(vector::contains(&registry.admin_addresses, &current_admin), E_UNAUTHORIZED);
        
        if (!vector::contains(&registry.admin_addresses, &new_admin)) {
            vector::push_back(&mut registry.admin_addresses, new_admin);
        };
    }

    // Get total users count
    public fun get_total_users(registry: &GlobalReputationRegistry): u64 {
        registry.total_users
    }

    // Get engagement count (placeholder)
    public fun get_engagement_count(user: address): u64 {
        // Placeholder - would integrate with recommendation system
        0
    }
}