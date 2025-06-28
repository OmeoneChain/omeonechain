/// Social Graph Module for OmeoneChain
/// Manages extended social relationships and off-chain graph synchronization
/// Provides friend-of-friend discovery and trust propagation

module omeone::social_graph {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    use std::vector;
    use std::string::{Self, String};
    
    use omeone::common::{
        Self,
        get_current_timestamp,
        TRUST_WEIGHT_DIRECT,
        TRUST_WEIGHT_INDIRECT
    };

    // Error codes
    const E_INVALID_USER: u64 = 1;
    const E_INVALID_TARGET: u64 = 2;
    const E_PATH_NOT_FOUND: u64 = 3;
    const E_INVALID_MERKLE_PROOF: u64 = 4;
    const E_GRAPH_SYNC_FAILED: u64 = 5;
    const E_MAX_HOPS_EXCEEDED: u64 = 6;
    const E_INVALID_HASH: u64 = 7;

    // Constants
    const MAX_SOCIAL_HOPS: u8 = 2;          // Beyond 2 hops = no trust weight
    const MAX_CONNECTIONS_PER_USER: u64 = 5000; // Practical limit for on-chain storage
    const FRIEND_OF_FRIEND_DISCOVERY_LIMIT: u64 = 50; // Max FOF suggestions
    const GRAPH_SYNC_BATCH_SIZE: u64 = 100; // Batch size for off-chain sync

    /// Extended social connection (stored off-chain, referenced on-chain)
    struct ExtendedConnection has store, copy, drop {
        target: address,
        connection_strength: u64,    // 0-1000 scale based on interactions
        mutual_connections: u64,     // Number of mutual friends
        discovered_at: u64,          // When connection was discovered
        interaction_frequency: u64,   // Recent interaction rate
        last_interaction: u64        // Most recent interaction
    }

    /// Friend-of-friend discovery data
    struct FriendOfFriendPath has store, copy, drop {
        target: address,
        intermediate: address,       // The mutual friend
        path_strength: u64,         // Combined connection strength
        discovery_score: u64,       // Relevance for recommendations
        common_interests: vector<String>, // Shared categories/preferences
        geographic_proximity: u64    // Distance-based relevance
    }

    /// Off-chain graph synchronization data
    struct GraphSyncData has store, copy, drop {
        ipfs_hash: vector<u8>,
        merkle_root: vector<u8>,
        total_connections: u64,
        sync_timestamp: u64,
        verified_connections: u64,   // Connections with merkle proofs
        batch_number: u64
    }

    /// Social graph analytics and insights
    struct SocialGraphInsights has key, store {
        id: UID,
        user_address: address,
        
        // Network metrics
        total_connections: u64,
        strong_connections: u64,     // High interaction connections
        weak_connections: u64,       // Low interaction connections
        
        // Discovery metrics
        friend_of_friend_pool: u64,  // Available FOF connections
        discovery_opportunities: u64, // Recommended new connections
        network_density: u64,        // How connected your network is
        
        // Geographic and interest clustering
        city_clusters: VecMap<String, u64>, // Geographic distribution
        interest_clusters: VecMap<String, u64>, // Interest distribution
        
        // Sync status
        last_full_sync: u64,
        pending_sync_items: u64,
        sync_status: u8              // 0=synced, 1=pending, 2=error
    }

    /// Global social graph registry
    struct SocialGraphRegistry has key {
        id: UID,
        total_connections: u64,
        total_users_with_graphs: u64,
        average_connections_per_user: u64,
        
        // Friend-of-friend discovery pool
        discovery_pool: Table<address, vector<FriendOfFriendPath>>,
        
        // Graph sync management
        sync_queue: vector<address>, // Users pending sync
        sync_batch_size: u64,
        last_sync_batch_time: u64
    }

    // Events
    struct ExtendedConnectionAdded has copy, drop {
        user: address,
        target: address,
        connection_strength: u64,
        path_type: String,           // "direct" or "friend_of_friend"
        timestamp: u64
    }

    struct FriendOfFriendDiscovered has copy, drop {
        user: address,
        target: address,
        intermediate: address,
        discovery_score: u64,
        timestamp: u64
    }

    struct GraphSyncCompleted has copy, drop {
        user: address,
        synced_connections: u64,
        new_discoveries: u64,
        sync_duration_ms: u64,
        timestamp: u64
    }

    struct NetworkInsightsUpdated has copy, drop {
        user: address,
        total_connections: u64,
        discovery_opportunities: u64,
        network_density: u64,
        timestamp: u64
    }

    /// Initialize the social graph system
    fun init(ctx: &mut TxContext) {
        let registry = SocialGraphRegistry {
            id: object::new(ctx),
            total_connections: 0,
            total_users_with_graphs: 0,
            average_connections_per_user: 0,
            discovery_pool: table::new(ctx),
            sync_queue: vector::empty(),
            sync_batch_size: GRAPH_SYNC_BATCH_SIZE,
            last_sync_batch_time: get_current_timestamp()
        };
        
        transfer::share_object(registry);
    }

    /// Create social graph insights for a user
    public fun create_social_graph_insights(
        user: address,
        ctx: &mut TxContext
    ): SocialGraphInsights {
        SocialGraphInsights {
            id: object::new(ctx),
            user_address: user,
            
            total_connections: 0,
            strong_connections: 0,
            weak_connections: 0,
            
            friend_of_friend_pool: 0,
            discovery_opportunities: 0,
            network_density: 0,
            
            city_clusters: vec_map::empty(),
            interest_clusters: vec_map::empty(),
            
            last_full_sync: get_current_timestamp(),
            pending_sync_items: 0,
            sync_status: 0
        }
    }

    /// Add extended connection (typically from off-chain discovery)
    public fun add_extended_connection(
        insights: &mut SocialGraphInsights,
        target: address,
        connection_strength: u64,
        mutual_connections: u64,
        registry: &mut SocialGraphRegistry,
        ctx: &mut TxContext
    ) {
        let current_time = get_current_timestamp();
        
        insights.total_connections = insights.total_connections + 1;
        
        // Categorize connection strength
        if (connection_strength >= 750) {
            insights.strong_connections = insights.strong_connections + 1;
        } else {
            insights.weak_connections = insights.weak_connections + 1;
        };

        registry.total_connections = registry.total_connections + 1;
        update_average_connections(registry);

        event::emit(ExtendedConnectionAdded {
            user: insights.user_address,
            target,
            connection_strength,
            path_type: string::utf8(b"extended"),
            timestamp: current_time
        });
    }

    /// Discover friend-of-friend connections
    public fun discover_friend_of_friend_connections(
        user_insights: &SocialGraphInsights,
        user_connections: vector<address>,
        target_user_connections: VecMap<address, vector<address>>,
        registry: &mut SocialGraphRegistry,
        ctx: &mut TxContext
    ): vector<FriendOfFriendPath> {
        let discoveries = vector::empty<FriendOfFriendPath>();
        let user_addr = user_insights.user_address;
        
        let i = 0;
        let user_conn_len = vector::length(&user_connections);
        
        while (i < user_conn_len && vector::length(&discoveries) < FRIEND_OF_FRIEND_DISCOVERY_LIMIT) {
            let intermediate = *vector::borrow(&user_connections, i);
            
            if (vec_map::contains(&target_user_connections, &intermediate)) {
                let intermediate_connections = vec_map::borrow(&target_user_connections, &intermediate);
                let j = 0;
                let int_conn_len = vector::length(intermediate_connections);
                
                while (j < int_conn_len && vector::length(&discoveries) < FRIEND_OF_FRIEND_DISCOVERY_LIMIT) {
                    let potential_target = *vector::borrow(intermediate_connections, j);
                    
                    // Don't suggest if already connected or self
                    if (potential_target != user_addr && !is_already_connected(user_addr, potential_target, &user_connections)) {
                        let path = create_friend_of_friend_path(
                            potential_target,
                            intermediate,
                            calculate_path_strength(user_addr, intermediate, potential_target),
                            ctx
                        );
                        vector::push_back(&mut discoveries, path);
                        
                        event::emit(FriendOfFriendDiscovered {
                            user: user_addr,
                            target: potential_target,
                            intermediate,
                            discovery_score: path.discovery_score,
                            timestamp: get_current_timestamp()
                        });
                    };
                    j = j + 1;
                };
            };
            i = i + 1;
        };

        // Update discovery pool in registry
        if (table::contains(&registry.discovery_pool, user_addr)) {
            let existing_discoveries = table::borrow_mut(&mut registry.discovery_pool, user_addr);
            *existing_discoveries = discoveries;
        } else {
            table::add(&mut registry.discovery_pool, user_addr, discoveries);
        };

        discoveries
    }

    /// Sync social graph with off-chain data
    public fun sync_social_graph(
        insights: &mut SocialGraphInsights,
        ipfs_hash: vector<u8>,
        merkle_root: vector<u8>,
        total_connections: u64,
        verified_connections: u64,
        registry: &mut SocialGraphRegistry,
        ctx: &mut TxContext
    ) {
        let current_time = get_current_timestamp();
        let sync_start_time = current_time;
        
        // Update sync status
        insights.sync_status = 1; // Syncing
        insights.pending_sync_items = total_connections;
        
        // Update connection counts
        let previous_connections = insights.total_connections;
        insights.total_connections = total_connections;
        
        // Calculate new discoveries
        let new_discoveries = if (total_connections > previous_connections) {
            total_connections - previous_connections
        } else {
            0
        };

        // Update network density (simplified calculation)
        insights.network_density = calculate_network_density(total_connections, verified_connections);
        
        // Mark sync as complete
        insights.last_full_sync = current_time;
        insights.pending_sync_items = 0;
        insights.sync_status = 0; // Synced
        
        // Update registry
        update_average_connections(registry);
        
        let sync_duration = current_time - sync_start_time;
        
        event::emit(GraphSyncCompleted {
            user: insights.user_address,
            synced_connections: total_connections,
            new_discoveries,
            sync_duration_ms: sync_duration,
            timestamp: current_time
        });
    }

    /// Update network insights and discovery opportunities
    public fun update_network_insights(
        insights: &mut SocialGraphInsights,
        city_data: VecMap<String, u64>,
        interest_data: VecMap<String, u64>,
        discovery_opportunities: u64,
        ctx: &mut TxContext
    ) {
        insights.city_clusters = city_data;
        insights.interest_clusters = interest_data;
        insights.discovery_opportunities = discovery_opportunities;
        
        event::emit(NetworkInsightsUpdated {
            user: insights.user_address,
            total_connections: insights.total_connections,
            discovery_opportunities,
            network_density: insights.network_density,
            timestamp: get_current_timestamp()
        });
    }

    /// Calculate trust weight for recommendation based on social path
    public fun calculate_social_trust_weight(
        user_insights: &SocialGraphInsights,
        recommender: address,
        registry: &SocialGraphRegistry
    ): u64 {
        // Check if recommender is in discovery pool (friend-of-friend)
        if (table::contains(&registry.discovery_pool, user_insights.user_address)) {
            let discoveries = table::borrow(&registry.discovery_pool, user_insights.user_address);
            let i = 0;
            let len = vector::length(discoveries);
            
            while (i < len) {
                let path = vector::borrow(discoveries, i);
                if (path.target == recommender) {
                    // Apply friend-of-friend weight
                    return (path.path_strength * TRUST_WEIGHT_INDIRECT) / 1000
                };
                i = i + 1;
            };
        };
        
        // If not found in FOF, return 0 (no trust weight beyond 2 hops)
        0
    }

    /// Get friend-of-friend recommendations for user
    public fun get_friend_of_friend_recommendations(
        user: address,
        registry: &SocialGraphRegistry,
        limit: u64
    ): vector<FriendOfFriendPath> {
        if (!table::contains(&registry.discovery_pool, user)) {
            return vector::empty()
        };
        
        let all_discoveries = table::borrow(&registry.discovery_pool, user);
        let recommendations = vector::empty<FriendOfFriendPath>();
        let i = 0;
        let len = vector::length(all_discoveries);
        let actual_limit = if (limit > len) { len } else { limit };
        
        while (i < actual_limit) {
            let discovery = *vector::borrow(all_discoveries, i);
            vector::push_back(&mut recommendations, discovery);
            i = i + 1;
        };
        
        recommendations
    }

    /// Queue user for graph sync
    public fun queue_for_sync(
        user: address,
        registry: &mut SocialGraphRegistry,
        _ctx: &mut TxContext
    ) {
        if (!vector::contains(&registry.sync_queue, &user)) {
            vector::push_back(&mut registry.sync_queue, user);
        };
    }

    /// Process sync queue (batch operation)
    public fun process_sync_queue(
        registry: &mut SocialGraphRegistry,
        ctx: &mut TxContext
    ): vector<address> {
        let current_time = get_current_timestamp();
        let processed_users = vector::empty<address>();
        let batch_size = registry.sync_batch_size;
        
        let i = 0;
        while (i < batch_size && !vector::is_empty(&registry.sync_queue)) {
            let user = vector::pop_back(&mut registry.sync_queue);
            vector::push_back(&mut processed_users, user);
            i = i + 1;
        };
        
        registry.last_sync_batch_time = current_time;
        processed_users
    }

    // === Helper Functions ===

    fun create_friend_of_friend_path(
        target: address,
        intermediate: address,
        path_strength: u64,
        ctx: &mut TxContext
    ): FriendOfFriendPath {
        FriendOfFriendPath {
            target,
            intermediate,
            path_strength,
            discovery_score: calculate_discovery_score(path_strength),
            common_interests: vector::empty(), // Would be populated from off-chain data
            geographic_proximity: 500 // Default medium proximity
        }
    }

    fun calculate_path_strength(
        user: address,
        intermediate: address,
        target: address
    ): u64 {
        // Simplified calculation - would be more sophisticated with real data
        // Based on mutual interaction frequency and connection strength
        650 // Default good path strength
    }

    fun calculate_discovery_score(path_strength: u64): u64 {
        // Higher path strength = higher discovery score
        if (path_strength >= 800) {
            900
        } else if (path_strength >= 600) {
            700
        } else if (path_strength >= 400) {
            500
        } else {
            300
        }
    }

    fun calculate_network_density(total_connections: u64, verified_connections: u64): u64 {
        if (total_connections == 0) {
            return 0
        };
        
        // Simplified density calculation: verified connections / total connections
        (verified_connections * 1000) / total_connections
    }

    fun is_already_connected(user: address, target: address, connections: &vector<address>): bool {
        vector::contains(connections, &target)
    }

    fun update_average_connections(registry: &mut SocialGraphRegistry) {
        if (registry.total_users_with_graphs > 0) {
            registry.average_connections_per_user = 
                registry.total_connections / registry.total_users_with_graphs;
        };
    }

    // === Public Getters ===

    public fun get_total_connections(insights: &SocialGraphInsights): u64 {
        insights.total_connections
    }

    public fun get_network_density(insights: &SocialGraphInsights): u64 {
        insights.network_density
    }

    public fun get_discovery_opportunities(insights: &SocialGraphInsights): u64 {
        insights.discovery_opportunities
    }

    public fun get_sync_status(insights: &SocialGraphInsights): u8 {
        insights.sync_status
    }

    public fun get_strong_weak_connections(insights: &SocialGraphInsights): (u64, u64) {
        (insights.strong_connections, insights.weak_connections)
    }

    public fun get_city_clusters(insights: &SocialGraphInsights): &VecMap<String, u64> {
        &insights.city_clusters
    }

    public fun get_interest_clusters(insights: &SocialGraphInsights): &VecMap<String, u64> {
        &insights.interest_clusters
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}