module omeone::reputation {
    use std::vector;
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    
    // One-time witness for initialization
    public struct REPUTATION has drop {}
    
    /// Error codes
    const E_NOT_INITIALIZED: u64 = 201;
    const E_ALREADY_FOLLOWING: u64 = 202;
    const E_NOT_FOLLOWING: u64 = 203;
    const E_CANNOT_FOLLOW_SELF: u64 = 204;
    const E_REPUTATION_ALREADY_EXISTS: u64 = 205;
    const E_INSUFFICIENT_REPUTATION: u64 = 206;
    const E_INVALID_VERIFICATION_DATA: u64 = 207;
    const E_VERIFICATION_ALREADY_EXISTS: u64 = 208;
    const E_INSUFFICIENT_VERIFIERS: u64 = 209;
    const E_INVALID_PENALTY_AMOUNT: u64 = 210;
    
    /// Constants - Enhanced thresholds
    const VERIFICATION_LEVEL_NONE: u8 = 0;
    const VERIFICATION_LEVEL_BASIC: u8 = 1;
    const VERIFICATION_LEVEL_VERIFIED: u8 = 2;
    const VERIFICATION_LEVEL_EXPERT: u8 = 3;
    
    const MAX_REPUTATION_SCORE: u64 = 1000; // 10.00 with 2 decimal precision
    const INITIAL_REPUTATION_SCORE: u64 = 500; // 5.00 with 2 decimal precision (higher start)
    
    // Enhanced reputation thresholds for different privileges
    const MIN_REWARD_THRESHOLD: u64 = 250;  // 2.50 reputation - can earn tokens
    const GOVERNANCE_THRESHOLD: u64 = 400;  // 4.00 reputation - can vote  
    const PROPOSAL_THRESHOLD: u64 = 500;    // 5.00 reputation - can submit proposals
    const EXPERT_THRESHOLD: u64 = 750;      // 7.50 reputation - expert status
    
    // Penalty amounts
    const SPAM_PENALTY: u64 = 50;           // -0.50 reputation
    const FAKE_RELATIONSHIP_PENALTY: u64 = 100; // -1.00 reputation
    const HARASSMENT_PENALTY: u64 = 250;   // -2.50 reputation
    const IMPERSONATION_PENALTY: u64 = 500; // -5.00 reputation
    
    // Verification types
    const VERIFICATION_SPAM: u8 = 1;
    const VERIFICATION_FAKE_RELATIONSHIP: u8 = 2;
    const VERIFICATION_HARASSMENT: u8 = 3;
    const VERIFICATION_IMPERSONATION: u8 = 4;
    
    /// Simplified timestamp structure
    public struct TimeStamp has store, copy, drop {
        timestamp_ms: u64,
    }
    
    /// Enhanced reputation score with analytics
    public struct ReputationScore has key, store {
        id: UID,
        owner: address,
        score: u64, // 0-1000 (0.00-10.00 with 2 decimal precision)
        verification_level: u8,
        specializations: vector<u8>, // Category codes user is specialized in
        total_recommendations: u64,
        upvotes_received: u64,
        downvotes_received: u64,
        
        // Enhanced metrics
        recent_performance: u64,     // Last 30 days average
        historical_performance: u64, // All-time average
        last_calculation: TimeStamp, // Weekly update tracking
        
        // Quality metrics
        average_trust_score: u64,    // Average trust score of user's content
        spam_reports: u64,           // Number of spam reports against user
        verified_contributions: u64, // Community-verified quality content
        
        timestamp: TimeStamp,
    }
    
    /// Enhanced social graph with analytics
    public struct SocialGraph has key {
        id: UID,
        owner: address,
        followers: vector<address>,
        following: vector<address>,
        
        // Enhanced social metrics
        strong_connections: u64,     // High-interaction connections
        weak_connections: u64,       // Low-interaction connections
        mutual_connections: u64,     // Mutual follow relationships
        
        // Trust weights for key connections (on-chain storage for top connections)
        trust_connections: vector<TrustConnection>,
        
        // Off-chain reference for extended graph
        extended_graph_hash: vector<u8>, // IPFS hash for full social graph
        total_extended_connections: u64,
        
        timestamp: TimeStamp,
    }
    
    /// Trust connection for high-impact relationships
    public struct TrustConnection has store, copy, drop {
        target: address,
        trust_weight: u64,           // 0-1000 weighted trust value
        connection_type: u8,         // 1=direct, 2=friend-of-friend
        established_at: TimeStamp,
        interaction_count: u64,
        last_interaction: TimeStamp,
    }
    
    /// Community verification report
    public struct VerificationReport has key, store {
        id: UID,
        target_user: address,
        violation_type: u8,          // Type of violation reported
        evidence_hash: vector<u8>,   // IPFS hash of evidence
        verifiers: vector<address>,  // Users who verified this report
        creation_time: TimeStamp,
        status: u8,                  // 0=pending, 1=approved, 2=rejected
        penalty_applied: bool,
    }
    
    /// Global registry for reputation scores - Enhanced
    public struct GlobalReputationRegistry has key {
        id: UID,
        registered_users: vector<address>,
        
        // Enhanced global metrics
        total_users: u64,
        average_reputation: u64,
        weekly_update_batch_size: u64,
        last_batch_processed: u64,
        
        // Community verification tracking
        pending_reports: vector<address>, // Report objects by address
        total_reports_processed: u64,
        
        // Discovery incentive integration
        discovery_campaign_participation: vector<DiscoveryParticipation>,
    }
    
    /// Discovery campaign participation tracking
    public struct DiscoveryParticipation has store, copy, drop {
        user: address,
        campaign_type: u8,           // Geographic, category, etc.
        tokens_earned: u64,
        recommendations_contributed: u64,
        average_quality: u64,
    }
    
    /// Events
    public struct ReputationInitialized has copy, drop {
        user: address,
        initial_score: u64,
    }
    
    public struct UserFollowed has copy, drop {
        follower: address,
        followed: address,
    }
    
    public struct UserUnfollowed has copy, drop {
        follower: address,
        followed: address,
    }
    
    public struct ReputationUpdated has copy, drop {
        user: address,
        old_score: u64,
        new_score: u64,
    }
    
    /// Initialize the reputation module - called automatically on deployment
    fun init(_witness: REPUTATION, ctx: &mut TxContext) {
        // Create enhanced global registry and share it
        let global_registry = GlobalReputationRegistry {
            id: object::new(ctx),
            registered_users: vector::empty<address>(),
            total_users: 0,
            average_reputation: INITIAL_REPUTATION_SCORE,
            weekly_update_batch_size: 1000,
            last_batch_processed: 0,
            pending_reports: vector::empty<address>(),
            total_reports_processed: 0,
            discovery_campaign_participation: vector::empty<DiscoveryParticipation>(),
        };
        
        transfer::share_object(global_registry);
    }
    
    /// Helper function to create timestamp
    fun create_timestamp(): TimeStamp {
        TimeStamp {
            timestamp_ms: 0 // Will be set when used with actual clock
        }
    }
    
    /// Helper function to update timestamp
    fun update_timestamp(ts: &mut TimeStamp) {
        ts.timestamp_ms = 0; // Will be set when used with actual clock
    }
    
    /// Create category (simplified - for compatibility)
    fun create_category(category_code: u8) {
        // Simplified category validation - just ensure it's within range
        assert!(category_code >= 1 && category_code <= 10, E_INVALID_VERIFICATION_DATA);
    }
    
    /// Initialize reputation for a new user - Enhanced
    public fun initialize_user_reputation(
        global_registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ): (ReputationScore, SocialGraph) {
        let user_addr = tx_context::sender(ctx);
        
        // Create enhanced reputation score
        let reputation = ReputationScore {
            id: object::new(ctx),
            owner: user_addr,
            score: INITIAL_REPUTATION_SCORE,
            verification_level: VERIFICATION_LEVEL_BASIC,
            specializations: vector::empty<u8>(),
            total_recommendations: 0,
            upvotes_received: 0,
            downvotes_received: 0,
            
            // Enhanced metrics
            recent_performance: INITIAL_REPUTATION_SCORE,
            historical_performance: INITIAL_REPUTATION_SCORE,
            last_calculation: create_timestamp(),
            
            // Quality metrics
            average_trust_score: INITIAL_REPUTATION_SCORE,
            spam_reports: 0,
            verified_contributions: 0,
            
            timestamp: create_timestamp(),
        };
        
        // Create enhanced social graph
        let social_graph = SocialGraph {
            id: object::new(ctx),
            owner: user_addr,
            followers: vector::empty<address>(),
            following: vector::empty<address>(),
            
            // Enhanced metrics
            strong_connections: 0,
            weak_connections: 0,
            mutual_connections: 0,
            
            // Trust connections
            trust_connections: vector::empty<TrustConnection>(),
            
            // Off-chain reference
            extended_graph_hash: vector::empty<u8>(),
            total_extended_connections: 0,
            
            timestamp: create_timestamp(),
        };
        
        // Add to global registry
        vector::push_back(&mut global_registry.registered_users, user_addr);
        global_registry.total_users = global_registry.total_users + 1;
        
        // Emit event
        event::emit(ReputationInitialized {
            user: user_addr,
            initial_score: INITIAL_REPUTATION_SCORE,
        });
        
        (reputation, social_graph)
    }
    
    /// Follow another user - Enhanced with trust tracking
    public fun follow(
        follower_graph: &mut SocialGraph,
        followed_graph: &mut SocialGraph,
        followed_reputation: &ReputationScore,
        followed: address,
        ctx: &mut TxContext
    ) {
        let follower_addr = tx_context::sender(ctx);
        
        // Cannot follow self
        assert!(follower_addr != followed, E_CANNOT_FOLLOW_SELF);
        
        // Check if already following
        assert!(!vector::contains(&follower_graph.following, &followed), E_ALREADY_FOLLOWING);
        
        // Update following list for follower
        vector::push_back(&mut follower_graph.following, followed);
        update_timestamp(&mut follower_graph.timestamp);
        
        // Update followers list for followed
        vector::push_back(&mut followed_graph.followers, follower_addr);
        update_timestamp(&mut followed_graph.timestamp);
        
        // Create trust connection if followed user has good reputation
        let trust_weight = calculate_initial_trust_weight(followed_reputation.score);
        
        let trust_connection = TrustConnection {
            target: followed,
            trust_weight,
            connection_type: 1, // Direct connection
            established_at: create_timestamp(),
            interaction_count: 0,
            last_interaction: create_timestamp(),
        };
        
        vector::push_back(&mut follower_graph.trust_connections, trust_connection);
        
        // Check for mutual connection
        if (vector::contains(&followed_graph.following, &follower_addr)) {
            follower_graph.mutual_connections = follower_graph.mutual_connections + 1;
            followed_graph.mutual_connections = followed_graph.mutual_connections + 1;
        };
        
        // Emit event
        event::emit(UserFollowed {
            follower: follower_addr,
            followed,
        });
    }
    
    /// Unfollow a user - Enhanced
    public fun unfollow(
        follower_graph: &mut SocialGraph,
        followed_graph: &mut SocialGraph,
        followed: address,
        ctx: &mut TxContext
    ) {
        let follower_addr = tx_context::sender(ctx);
        
        // Cannot unfollow self
        assert!(follower_addr != followed, E_CANNOT_FOLLOW_SELF);
        
        // Check if following
        assert!(vector::contains(&follower_graph.following, &followed), E_NOT_FOLLOWING);
        
        // Remove from following list
        let (found, index) = vector_index_of(&follower_graph.following, &followed);
        if (found) {
            vector::remove(&mut follower_graph.following, index);
            update_timestamp(&mut follower_graph.timestamp);
        };
        
        // Remove from followers list
        let (found, index) = vector_index_of(&followed_graph.followers, &follower_addr);
        if (found) {
            vector::remove(&mut followed_graph.followers, index);
            update_timestamp(&mut followed_graph.timestamp);
        };
        
        // Remove trust connection
        remove_trust_connection(follower_graph, followed);
        
        // Update mutual connections if applicable
        if (vector::contains(&followed_graph.following, &follower_addr)) {
            if (follower_graph.mutual_connections > 0) {
                follower_graph.mutual_connections = follower_graph.mutual_connections - 1;
            };
            if (followed_graph.mutual_connections > 0) {
                followed_graph.mutual_connections = followed_graph.mutual_connections - 1;
            };
        };
        
        // Emit event
        event::emit(UserUnfollowed {
            follower: follower_addr,
            followed,
        });
    }
    
    /// Submit community verification report - NEW
    public fun submit_verification_report(
        target_user: address,
        violation_type: u8,
        evidence_hash: vector<u8>,
        global_registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ): VerificationReport {
        let reporter_addr = tx_context::sender(ctx);
        
        // Validate violation type
        assert!(violation_type >= 1 && violation_type <= 4, E_INVALID_VERIFICATION_DATA);
        
        // Create verification report
        let report = VerificationReport {
            id: object::new(ctx),
            target_user,
            violation_type,
            evidence_hash,
            verifiers: vector::singleton(reporter_addr),
            creation_time: create_timestamp(),
            status: 0, // Pending
            penalty_applied: false,
        };
        
        // Add to global tracking
        vector::push_back(&mut global_registry.pending_reports, reporter_addr);
        
        report
    }
    
    /// Add verification to existing report - NEW
    public fun add_verification(
        report: &mut VerificationReport,
        ctx: &mut TxContext
    ) {
        let verifier_addr = tx_context::sender(ctx);
        
        // Check if already verified by this user
        assert!(!vector::contains(&report.verifiers, &verifier_addr), E_VERIFICATION_ALREADY_EXISTS);
        
        vector::push_back(&mut report.verifiers, verifier_addr);
        
        // Auto-approve if we have 3+ verifiers
        if (vector::length(&report.verifiers) >= 3) {
            report.status = 1; // Approved
        };
    }
    
    /// Apply reputation penalty - NEW
    public fun apply_reputation_penalty(
        target_reputation: &mut ReputationScore,
        report: &mut VerificationReport,
        global_registry: &mut GlobalReputationRegistry,
        ctx: &mut TxContext
    ) {
        // Verify report is approved and penalty not yet applied
        assert!(report.status == 1, E_INSUFFICIENT_VERIFIERS);
        assert!(!report.penalty_applied, E_VERIFICATION_ALREADY_EXISTS);
        assert!(vector::length(&report.verifiers) >= 3, E_INSUFFICIENT_VERIFIERS);
        
        let old_score = target_reputation.score;
        let penalty = get_penalty_amount(report.violation_type);
        
        // Apply penalty (ensure score doesn't go below 0)
        if (target_reputation.score > penalty) {
            target_reputation.score = target_reputation.score - penalty;
        } else {
            target_reputation.score = 0;
        };
        
        // Update spam reports counter
        target_reputation.spam_reports = target_reputation.spam_reports + 1;
        
        // Mark penalty as applied
        report.penalty_applied = true;
        
        // Update global registry
        global_registry.total_reports_processed = global_registry.total_reports_processed + 1;
        
        // Update timestamp
        update_timestamp(&mut target_reputation.timestamp);
        
        // Emit event
        event::emit(ReputationUpdated {
            user: report.target_user,
            old_score,
            new_score: target_reputation.score,
        });
    }
    
    /// Update reputation score for recommendation activity - Enhanced
    public fun update_reputation_for_recommendation(
        reputation: &mut ReputationScore,
        upvotes: u64,
        downvotes: u64,
        trust_score: u64,  // NEW: Trust score of the recommendation
        ctx: &mut TxContext
    ) {
        let old_score = reputation.score;
        
        // Update stats
        reputation.total_recommendations = reputation.total_recommendations + 1;
        reputation.upvotes_received = reputation.upvotes_received + upvotes;
        reputation.downvotes_received = reputation.downvotes_received + downvotes;
        
        // Update average trust score (moving average)
        let total_recs = reputation.total_recommendations;
        if (total_recs == 1) {
            reputation.average_trust_score = trust_score;
        } else {
            let weighted_avg = (reputation.average_trust_score * (total_recs - 1) + trust_score) / total_recs;
            reputation.average_trust_score = weighted_avg;
        };
        
        // Enhanced score calculation with trust score weighting
        if (upvotes > 0 || downvotes > 0) {
            let total_votes = upvotes + downvotes;
            
            if (upvotes > downvotes) {
                // Positive adjustment with trust score bonus
                let vote_ratio = (upvotes * 100) / total_votes;
                let trust_bonus = if (trust_score >= 750) { 20 } else if (trust_score >= 500) { 10 } else { 0 };
                let adjustment = (vote_ratio + trust_bonus) / 10;
                
                // Cap the score at MAX_REPUTATION_SCORE
                if (reputation.score + adjustment > MAX_REPUTATION_SCORE) {
                    reputation.score = MAX_REPUTATION_SCORE;
                } else {
                    reputation.score = reputation.score + adjustment;
                }
            } else if (downvotes > upvotes) {
                // Negative adjustment
                let vote_ratio = (downvotes * 100) / total_votes;
                let adjustment = vote_ratio / 10;
                
                // Ensure score doesn't go below 0
                if (adjustment > reputation.score) {
                    reputation.score = 0;
                } else {
                    reputation.score = reputation.score - adjustment;
                }
            }
        };
        
        // Update performance metrics
        update_performance_metrics(reputation, trust_score);
        
        // Update timestamp
        update_timestamp(&mut reputation.timestamp);
        
        // Emit event if score changed
        if (old_score != reputation.score) {
            event::emit(ReputationUpdated {
                user: reputation.owner,
                old_score,
                new_score: reputation.score,
            });
        };
    }
    
    /// Calculate trust weights for social connections - NEW
    public fun calculate_trust_weights(
        social_graph: &SocialGraph,
        interacting_users: vector<address>
    ): u64 {
        let total_weight = 0;
        let i = 0;
        let len = vector::length(&interacting_users);
        
        while (i < len) {
            let user_addr = *vector::borrow(&interacting_users, i);
            
            // Find trust connection
            let j = 0;
            let trust_len = vector::length(&social_graph.trust_connections);
            while (j < trust_len) {
                let connection = vector::borrow(&social_graph.trust_connections, j);
                if (connection.target == user_addr) {
                    // Apply social distance weighting
                    if (connection.connection_type == 1) {
                        total_weight = total_weight + (connection.trust_weight * 75 / 100); // 0.75x for direct
                    } else if (connection.connection_type == 2) {
                        total_weight = total_weight + (connection.trust_weight * 25 / 100); // 0.25x for FOF
                    };
                    break
                };
                j = j + 1;
            };
            
            i = i + 1;
        };
        
        // Cap at 3.0x multiplier (3000 in our scale)
        if (total_weight > 3000) {
            total_weight = 3000;
        };
        
        total_weight
    }
    
    /// Set user verification level - Enhanced
    public fun set_verification_level(
        reputation: &mut ReputationScore,
        level: u8,
        ctx: &mut TxContext
    ) {
        // Validate level
        assert!(level <= VERIFICATION_LEVEL_EXPERT, 0);
        
        let old_score = reputation.score;
        reputation.verification_level = level;
        
        // Boost reputation for verification
        let verification_bonus = if (level == VERIFICATION_LEVEL_EXPERT) {
            100 // +1.00 for expert
        } else if (level == VERIFICATION_LEVEL_VERIFIED) {
            50  // +0.50 for verified
        } else {
            0
        };
        
        if (reputation.score + verification_bonus <= MAX_REPUTATION_SCORE) {
            reputation.score = reputation.score + verification_bonus;
        } else {
            reputation.score = MAX_REPUTATION_SCORE;
        };
        
        // Update timestamp
        update_timestamp(&mut reputation.timestamp);
        
        // Emit event if score changed
        if (old_score != reputation.score) {
            event::emit(ReputationUpdated {
                user: reputation.owner,
                old_score,
                new_score: reputation.score,
            });
        };
    }
    
    /// Add specialization for a user
    public fun add_specialization(
        reputation: &mut ReputationScore,
        category_code: u8,
        ctx: &mut TxContext
    ) {
        // Validate category
        create_category(category_code); // Will abort if invalid
        
        // Add specialization if not already present
        if (!vector::contains(&reputation.specializations, &category_code)) {
            vector::push_back(&mut reputation.specializations, category_code);
            
            // Update timestamp
            update_timestamp(&mut reputation.timestamp);
        }
    }
    
    /// Get social distance between two users - Enhanced
    public fun social_distance(user1: address, user2: address): u8 {
        if (user1 == user2) {
            return 0 // Same user
        };
        
        // Simplified implementation - in real system would need to access social graphs
        // For now, return default distances
        1 // Assume direct following for simplicity
    }
    
    /// Enhanced privilege checking functions - NEW
    public fun can_earn_rewards(reputation: &ReputationScore): bool {
        reputation.score >= MIN_REWARD_THRESHOLD
    }
    
    public fun can_participate_governance(reputation: &ReputationScore): bool {
        reputation.score >= GOVERNANCE_THRESHOLD
    }
    
    public fun can_submit_proposals(reputation: &ReputationScore): bool {
        reputation.score >= PROPOSAL_THRESHOLD
    }
    
    public fun is_expert_level(reputation: &ReputationScore): bool {
        reputation.score >= EXPERT_THRESHOLD
    }
    
    /// Get reputation score value (public view)
    public fun get_reputation_value(reputation: &ReputationScore): u64 {
        reputation.score
    }
    
    /// Get enhanced trust modifier based on reputation and verification
    public fun get_trust_modifier(reputation: &ReputationScore): u64 {
        // Base modifier is 100 (1.0x)
        let base_modifier = 100;
        
        // Enhanced verification bonus
        let verification_bonus = if (reputation.verification_level == VERIFICATION_LEVEL_EXPERT) {
            50 // +0.5x for expert
        } else if (reputation.verification_level == VERIFICATION_LEVEL_VERIFIED) {
            25 // +0.25x for verified
        } else {
            0
        };
        
        // Reputation factor (more granular)
        let reputation_factor = reputation.score / 100; // Convert to 0-10 scale
        let reputation_bonus = reputation_factor * 3; // Each full point adds 0.03x
        
        // Quality bonus based on average trust score
        let quality_bonus = if (reputation.average_trust_score >= 750) {
            15 // +0.15x for high quality
        } else if (reputation.average_trust_score >= 500) {
            8  // +0.08x for medium quality
        } else {
            0
        };
        
        // Spam penalty
        let spam_penalty = if (reputation.spam_reports > 5) {
            20 // -0.20x for multiple spam reports
        } else if (reputation.spam_reports > 2) {
            10 // -0.10x for some spam reports
        } else {
            0
        };
        
        // Combine modifiers
        let total_modifier = base_modifier + verification_bonus + reputation_bonus + quality_bonus;
        if (total_modifier > spam_penalty) {
            total_modifier - spam_penalty
        } else {
            10 // Minimum 0.1x modifier
        }
    }
    
    /// Check if user follows another user (public view)
    public fun is_following(social_graph: &SocialGraph, followed: address): bool {
        vector::contains(&social_graph.following, &followed)
    }
    
    /// Get enhanced social metrics
    public fun get_social_metrics(social_graph: &SocialGraph): (u64, u64, u64, u64) {
        (
            vector::length(&social_graph.followers),      // follower count
            vector::length(&social_graph.following),      // following count
            social_graph.mutual_connections,              // mutual connections
            vector::length(&social_graph.trust_connections) // trust connections
        )
    }
    
    /// Get follower count (public view)
    public fun get_follower_count(social_graph: &SocialGraph): u64 {
        vector::length(&social_graph.followers)
    }
    
    /// Get following count (public view)
    public fun get_following_count(social_graph: &SocialGraph): u64 {
        vector::length(&social_graph.following)
    }
    
    /// Get engagement count (compatibility function)
    public fun get_engagement_count(user: address): u64 {
        // Simplified implementation for compatibility
        // In real system would calculate from interactions
        0
    }
    
    // === Helper Functions ===
    
    fun calculate_initial_trust_weight(target_reputation: u64): u64 {
        // Higher reputation users get higher initial trust weight
        if (target_reputation >= EXPERT_THRESHOLD) {
            1000 // Full trust weight
        } else if (target_reputation >= GOVERNANCE_THRESHOLD) {
            750  // Good trust weight
        } else if (target_reputation >= MIN_REWARD_THRESHOLD) {
            500  // Medium trust weight
        } else {
            250  // Low trust weight
        }
    }
    
    fun remove_trust_connection(social_graph: &mut SocialGraph, target: address) {
        let i = 0;
        let len = vector::length(&social_graph.trust_connections);
        while (i < len) {
            let connection = vector::borrow(&social_graph.trust_connections, i);
            if (connection.target == target) {
                vector::remove(&mut social_graph.trust_connections, i);
                break
            };
            i = i + 1;
        };
    }
    
    fun get_penalty_amount(violation_type: u8): u64 {
        if (violation_type == VERIFICATION_SPAM) {
            SPAM_PENALTY
        } else if (violation_type == VERIFICATION_FAKE_RELATIONSHIP) {
            FAKE_RELATIONSHIP_PENALTY
        } else if (violation_type == VERIFICATION_HARASSMENT) {
            HARASSMENT_PENALTY
        } else if (violation_type == VERIFICATION_IMPERSONATION) {
            IMPERSONATION_PENALTY
        } else {
            0
        }
    }
    
    fun update_performance_metrics(reputation: &mut ReputationScore, trust_score: u64) {
        // Update recent performance (simplified)
        if (reputation.total_recommendations <= 10) {
            reputation.recent_performance = (reputation.recent_performance + trust_score) / 2;
        } else {
            // More sophisticated moving average for established users
            let weight = 90; // 90% old, 10% new
            reputation.recent_performance = (reputation.recent_performance * weight + trust_score * (100 - weight)) / 100;
        };
        
        // Update historical performance
        let total_recs = reputation.total_recommendations;
        reputation.historical_performance = (reputation.historical_performance * (total_recs - 1) + trust_score) / total_recs;
    }
    
    /// Find the index of an element in a vector
    fun vector_index_of<T: copy + drop>(v: &vector<T>, e: &T): (bool, u64) {
        let i = 0;
        let len = vector::length(v);
        
        while (i < len) {
            if (vector::borrow(v, i) == e) {
                return (true, i)
            };
            i = i + 1;
        };
        
        (false, 0)
    }
    
    #[test_only]
    public fun setup_test(ctx: &mut TxContext) {
        let global_registry = GlobalReputationRegistry {
            id: object::new(ctx),
            registered_users: vector::empty<address>(),
            total_users: 0,
            average_reputation: INITIAL_REPUTATION_SCORE,
            weekly_update_batch_size: 1000,
            last_batch_processed: 0,
            pending_reports: vector::empty<address>(),
            total_reports_processed: 0,
            discovery_campaign_participation: vector::empty<DiscoveryParticipation>(),
        };
        
        transfer::share_object(global_registry);
    }
}