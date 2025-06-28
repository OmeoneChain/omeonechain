module omeonechain::reputation {
    use std::error;
    use std::signer;
    use std::vector;
    
    use omeonechain::common::{Self, TimeStamp};
    
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
    
    /// Enhanced reputation score with analytics
    struct ReputationScore has key, store {
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
    struct SocialGraph has key {
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
    struct TrustConnection has store, copy, drop {
        target: address,
        trust_weight: u64,           // 0-1000 weighted trust value
        connection_type: u8,         // 1=direct, 2=friend-of-friend
        established_at: TimeStamp,
        interaction_count: u64,
        last_interaction: TimeStamp,
    }
    
    /// Community verification report
    struct VerificationReport has key, store {
        target_user: address,
        violation_type: u8,          // Type of violation reported
        evidence_hash: vector<u8>,   // IPFS hash of evidence
        verifiers: vector<address>,  // Users who verified this report
        creation_time: TimeStamp,
        status: u8,                  // 0=pending, 1=approved, 2=rejected
        penalty_applied: bool,
    }
    
    /// Global registry for reputation scores - Enhanced
    struct GlobalReputationRegistry has key {
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
    struct DiscoveryParticipation has store, copy, drop {
        user: address,
        campaign_type: u8,           // Geographic, category, etc.
        tokens_earned: u64,
        recommendations_contributed: u64,
        average_quality: u64,
    }
    
    /// Initialize the reputation module - Enhanced
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        // Create enhanced global registry if it doesn't exist
        if (!exists<GlobalReputationRegistry>(admin_addr)) {
            move_to(admin, GlobalReputationRegistry {
                registered_users: vector::empty<address>(),
                total_users: 0,
                average_reputation: INITIAL_REPUTATION_SCORE,
                weekly_update_batch_size: 1000,
                last_batch_processed: 0,
                pending_reports: vector::empty<address>(),
                total_reports_processed: 0,
                discovery_campaign_participation: vector::empty<DiscoveryParticipation>(),
            });
        };
    }
    
    /// Initialize reputation for a new user - Enhanced
    public entry fun initialize_user_reputation(user: &signer) acquires GlobalReputationRegistry {
        let user_addr = signer::address_of(user);
        
        // Check if reputation already exists
        assert!(!exists<ReputationScore>(user_addr), error::already_exists(E_REPUTATION_ALREADY_EXISTS));
        
        // Create enhanced reputation score
        let reputation = ReputationScore {
            score: INITIAL_REPUTATION_SCORE,
            verification_level: VERIFICATION_LEVEL_BASIC,
            specializations: vector::empty<u8>(),
            total_recommendations: 0,
            upvotes_received: 0,
            downvotes_received: 0,
            
            // Enhanced metrics
            recent_performance: INITIAL_REPUTATION_SCORE,
            historical_performance: INITIAL_REPUTATION_SCORE,
            last_calculation: common::create_timestamp(),
            
            // Quality metrics
            average_trust_score: INITIAL_REPUTATION_SCORE,
            spam_reports: 0,
            verified_contributions: 0,
            
            timestamp: common::create_timestamp(),
        };
        
        // Create enhanced social graph
        let social_graph = SocialGraph {
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
            
            timestamp: common::create_timestamp(),
        };
        
        // Store reputation and social graph
        move_to(user, reputation);
        move_to(user, social_graph);
        
        // Add to global registry
        let global_registry = borrow_global_mut<GlobalReputationRegistry>(@omeonechain);
        vector::push_back(&mut global_registry.registered_users, user_addr);
        global_registry.total_users = global_registry.total_users + 1;
    }
    
    /// Follow another user - Enhanced with trust tracking
    public entry fun follow(follower: &signer, followed: address) acquires SocialGraph, ReputationScore {
        let follower_addr = signer::address_of(follower);
        
        // Cannot follow self
        assert!(follower_addr != followed, error::invalid_argument(E_CANNOT_FOLLOW_SELF));
        
        // Ensure both users have social graphs
        assert!(exists<SocialGraph>(follower_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(exists<SocialGraph>(followed), error::not_found(E_NOT_INITIALIZED));
        
        // Get social graphs
        let follower_graph = borrow_global_mut<SocialGraph>(follower_addr);
        let followed_graph = borrow_global_mut<SocialGraph>(followed);
        
        // Check if already following
        assert!(!vector::contains(&follower_graph.following, &followed), error::already_exists(E_ALREADY_FOLLOWING));
        
        // Update following list for follower
        vector::push_back(&mut follower_graph.following, followed);
        common::update_timestamp(&mut follower_graph.timestamp);
        
        // Update followers list for followed
        vector::push_back(&mut followed_graph.followers, follower_addr);
        common::update_timestamp(&mut followed_graph.timestamp);
        
        // Create trust connection if followed user has good reputation
        if (exists<ReputationScore>(followed)) {
            let followed_reputation = borrow_global<ReputationScore>(followed);
            let trust_weight = calculate_initial_trust_weight(followed_reputation.score);
            
            let trust_connection = TrustConnection {
                target: followed,
                trust_weight,
                connection_type: 1, // Direct connection
                established_at: common::create_timestamp(),
                interaction_count: 0,
                last_interaction: common::create_timestamp(),
            };
            
            vector::push_back(&mut follower_graph.trust_connections, trust_connection);
        };
        
        // Check for mutual connection
        if (vector::contains(&followed_graph.following, &follower_addr)) {
            follower_graph.mutual_connections = follower_graph.mutual_connections + 1;
            followed_graph.mutual_connections = followed_graph.mutual_connections + 1;
        };
    }
    
    /// Unfollow a user - Enhanced
    public entry fun unfollow(follower: &signer, followed: address) acquires SocialGraph {
        let follower_addr = signer::address_of(follower);
        
        // Cannot unfollow self
        assert!(follower_addr != followed, error::invalid_argument(E_CANNOT_FOLLOW_SELF));
        
        // Ensure both users have social graphs
        assert!(exists<SocialGraph>(follower_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(exists<SocialGraph>(followed), error::not_found(E_NOT_INITIALIZED));
        
        // Get social graphs
        let follower_graph = borrow_global_mut<SocialGraph>(follower_addr);
        let followed_graph = borrow_global_mut<SocialGraph>(followed);
        
        // Check if following
        assert!(vector::contains(&follower_graph.following, &followed), error::invalid_state(E_NOT_FOLLOWING));
        
        // Remove from following list
        let (found, index) = vector_index_of(&follower_graph.following, &followed);
        if (found) {
            vector::remove(&mut follower_graph.following, index);
            common::update_timestamp(&mut follower_graph.timestamp);
        };
        
        // Remove from followers list
        let (found, index) = vector_index_of(&followed_graph.followers, &follower_addr);
        if (found) {
            vector::remove(&mut followed_graph.followers, index);
            common::update_timestamp(&mut followed_graph.timestamp);
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
    }
    
    /// Submit community verification report - NEW
    public entry fun submit_verification_report(
        reporter: &signer,
        target_user: address,
        violation_type: u8,
        evidence_hash: vector<u8>
    ) acquires GlobalReputationRegistry {
        let reporter_addr = signer::address_of(reporter);
        
        // Validate violation type
        assert!(violation_type >= 1 && violation_type <= 4, error::invalid_argument(E_INVALID_VERIFICATION_DATA));
        
        // Create verification report
        let report = VerificationReport {
            target_user,
            violation_type,
            evidence_hash,
            verifiers: vector::singleton(reporter_addr),
            creation_time: common::create_timestamp(),
            status: 0, // Pending
            penalty_applied: false,
        };
        
        // Store report at reporter's address (unique per reporter-target pair)
        move_to(reporter, report);
        
        // Add to global tracking
        let global_registry = borrow_global_mut<GlobalReputationRegistry>(@omeonechain);
        vector::push_back(&mut global_registry.pending_reports, reporter_addr);
    }
    
    /// Add verification to existing report - NEW
    public entry fun add_verification(
        verifier: &signer,
        report_address: address
    ) acquires VerificationReport {
        let verifier_addr = signer::address_of(verifier);
        
        // Get the report
        assert!(exists<VerificationReport>(report_address), error::not_found(E_NOT_INITIALIZED));
        let report = borrow_global_mut<VerificationReport>(report_address);
        
        // Check if already verified by this user
        assert!(!vector::contains(&report.verifiers, &verifier_addr), error::already_exists(E_VERIFICATION_ALREADY_EXISTS));
        
        vector::push_back(&mut report.verifiers, verifier_addr);
        
        // Auto-approve if we have 3+ verifiers
        if (vector::length(&report.verifiers) >= 3) {
            report.status = 1; // Approved
        };
    }
    
    /// Apply reputation penalty - NEW
    public entry fun apply_reputation_penalty(
        admin: &signer,
        target_user: address,
        report_address: address
    ) acquires VerificationReport, ReputationScore, GlobalReputationRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        // Get the report
        assert!(exists<VerificationReport>(report_address), error::not_found(E_NOT_INITIALIZED));
        let report = borrow_global_mut<VerificationReport>(report_address);
        
        // Verify report is approved and penalty not yet applied
        assert!(report.status == 1, error::invalid_state(E_INSUFFICIENT_VERIFIERS));
        assert!(!report.penalty_applied, error::already_exists(E_VERIFICATION_ALREADY_EXISTS));
        assert!(vector::length(&report.verifiers) >= 3, error::invalid_state(E_INSUFFICIENT_VERIFIERS));
        
        // Get target user's reputation
        assert!(exists<ReputationScore>(target_user), error::not_found(E_NOT_INITIALIZED));
        let reputation = borrow_global_mut<ReputationScore>(target_user);
        
        let penalty = get_penalty_amount(report.violation_type);
        
        // Apply penalty (ensure score doesn't go below 0)
        if (reputation.score > penalty) {
            reputation.score = reputation.score - penalty;
        } else {
            reputation.score = 0;
        };
        
        // Update spam reports counter
        reputation.spam_reports = reputation.spam_reports + 1;
        
        // Mark penalty as applied
        report.penalty_applied = true;
        
        // Update global registry
        let global_registry = borrow_global_mut<GlobalReputationRegistry>(@omeonechain);
        global_registry.total_reports_processed = global_registry.total_reports_processed + 1;
        
        // Update timestamp
        common::update_timestamp(&mut reputation.timestamp);
    }
    
    /// Update reputation score for recommendation activity - Enhanced
    public entry fun update_reputation_for_recommendation(
        admin: &signer,
        user: address,
        upvotes: u64,
        downvotes: u64,
        trust_score: u64  // NEW: Trust score of the recommendation
    ) acquires ReputationScore {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        // Ensure user has a reputation score
        assert!(exists<ReputationScore>(user), error::not_found(E_NOT_INITIALIZED));
        
        // Get reputation score
        let reputation = borrow_global_mut<ReputationScore>(user);
        
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
        common::update_timestamp(&mut reputation.timestamp);
    }
    
    /// Calculate trust weights for social connections - NEW
    public fun calculate_trust_weights(
        user: address,
        interacting_users: vector<address>
    ): u64 acquires SocialGraph {
        if (!exists<SocialGraph>(user)) {
            return 0
        };
        
        let social_graph = borrow_global<SocialGraph>(user);
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
    
    /// Weekly batch reputation update - NEW
    public entry fun batch_update_reputation_scores(
        admin: &signer,
        user_addresses: vector<address>,
        performance_data: vector<vector<u64>>
    ) acquires ReputationScore, GlobalReputationRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        assert!(vector::length(&user_addresses) == vector::length(&performance_data), error::invalid_argument(E_INVALID_VERIFICATION_DATA));
        
        let i = 0;
        let len = vector::length(&user_addresses);
        
        while (i < len) {
            let user_addr = *vector::borrow(&user_addresses, i);
            let perf_data = *vector::borrow(&performance_data, i);
            
            if (exists<ReputationScore>(user_addr)) {
                let reputation = borrow_global_mut<ReputationScore>(user_addr);
                let recent_avg = calculate_average(perf_data);
                
                // Update with weighted moving average
                let (recent_weight, historical_weight) = get_performance_weights(reputation.total_recommendations);
                let new_score = (recent_avg * recent_weight + reputation.historical_performance * historical_weight) / 10000;
                
                if (new_score > MAX_REPUTATION_SCORE) {
                    reputation.score = MAX_REPUTATION_SCORE;
                } else {
                    reputation.score = new_score;
                };
                
                reputation.recent_performance = recent_avg;
                reputation.last_calculation = common::create_timestamp();
            };
            
            i = i + 1;
        };
        
        // Update global registry
        let global_registry = borrow_global_mut<GlobalReputationRegistry>(@omeonechain);
        global_registry.last_batch_processed = global_registry.last_batch_processed + len;
    }
    
    /// Set user verification level - Enhanced
    public entry fun set_verification_level(
        admin: &signer,
        user: address,
        level: u8
    ) acquires ReputationScore {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        // Ensure user has a reputation score
        assert!(exists<ReputationScore>(user), error::not_found(E_NOT_INITIALIZED));
        
        // Validate level
        assert!(level <= VERIFICATION_LEVEL_EXPERT, error::invalid_argument(0));
        
        // Get reputation score and update level
        let reputation = borrow_global_mut<ReputationScore>(user);
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
        common::update_timestamp(&mut reputation.timestamp);
    }
    
    /// Add specialization for a user
    public entry fun add_specialization(
        admin: &signer,
        user: address,
        category_code: u8
    ) acquires ReputationScore {
        let admin_addr = signer::address_of(admin);
        assert!(common::is_admin(admin_addr), error::permission_denied(1));
        
        // Ensure user has a reputation score
        assert!(exists<ReputationScore>(user), error::not_found(E_NOT_INITIALIZED));
        
        // Validate category
        let _ = common::create_category(category_code); // Will abort if invalid
        
        // Get reputation score
        let reputation = borrow_global_mut<ReputationScore>(user);
        
        // Add specialization if not already present
        if (!vector::contains(&reputation.specializations, &category_code)) {
            vector::push_back(&mut reputation.specializations, category_code);
            
            // Update timestamp
            common::update_timestamp(&mut reputation.timestamp);
        }
    }
    
    /// Get social distance between two users - Enhanced
    public fun social_distance(user1: address, user2: address): u8 acquires SocialGraph {
        if (user1 == user2) {
            return 0 // Same user
        };
        
        if (!exists<SocialGraph>(user1) || !exists<SocialGraph>(user2)) {
            return 255 // Max distance if either user is not initialized
        };
        
        let user1_graph = borrow_global<SocialGraph>(user1);
        
        // Check direct following via trust connections
        let i = 0;
        let len = vector::length(&user1_graph.trust_connections);
        while (i < len) {
            let connection = vector::borrow(&user1_graph.trust_connections, i);
            if (connection.target == user2) {
                return connection.connection_type
            };
            i = i + 1;
        };
        
        // Check traditional following list
        if (vector::contains(&user1_graph.following, &user2)) {
            return 1 // Direct following
        };
        
        // Check for indirect (2-hop) following
        let i = 0;
        let len = vector::length(&user1_graph.following);
        
        while (i < len) {
            let intermediate = *vector::borrow(&user1_graph.following, i);
            
            if (exists<SocialGraph>(intermediate)) {
                let intermediate_graph = borrow_global<SocialGraph>(intermediate);
                
                if (vector::contains(&intermediate_graph.following, &user2)) {
                    return 2 // Found 2-hop path
                };
            };
            
            i = i + 1;
        };
        
        // No path found within 2 hops
        return 3 // Beyond 2 hops
    }
    
    /// Enhanced privilege checking functions - NEW
    public fun can_earn_rewards(user: address): bool acquires ReputationScore {
        if (!exists<ReputationScore>(user)) {
            return false
        };
        let reputation = borrow_global<ReputationScore>(user);
        reputation.score >= MIN_REWARD_THRESHOLD
    }
    
    public fun can_participate_governance(user: address): bool acquires ReputationScore {
        if (!exists<ReputationScore>(user)) {
            return false
        };
        let reputation = borrow_global<ReputationScore>(user);
        reputation.score >= GOVERNANCE_THRESHOLD
    }
    
    public fun can_submit_proposals(user: address): bool acquires ReputationScore {
        if (!exists<ReputationScore>(user)) {
            return false
        };
        let reputation = borrow_global<ReputationScore>(user);
        reputation.score >= PROPOSAL_THRESHOLD
    }
    
    public fun is_expert_level(user: address): bool acquires ReputationScore {
        if (!exists<ReputationScore>(user)) {
            return false
        };
        let reputation = borrow_global<ReputationScore>(user);
        reputation.score >= EXPERT_THRESHOLD
    }
    
    /// Get reputation score for a user (public view)
    public fun get_reputation_score(user: address): &ReputationScore acquires ReputationScore {
        assert!(exists<ReputationScore>(user), error::not_found(E_NOT_INITIALIZED));
        borrow_global<ReputationScore>(user)
    }
    
    /// Get reputation score value (public view)
    public fun get_reputation_value(user: address): u64 acquires ReputationScore {
        if (!exists<ReputationScore>(user)) {
            return 0
        };
        
        let reputation = borrow_global<ReputationScore>(user);
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
    public fun is_following(follower: address, followed: address): bool acquires SocialGraph {
        if (!exists<SocialGraph>(follower)) {
            return false
        };
        
        let graph = borrow_global<SocialGraph>(follower);
        vector::contains(&graph.following, &followed)
    }
    
    /// Get enhanced social metrics
    public fun get_social_metrics(user: address): (u64, u64, u64, u64) acquires SocialGraph {
        if (!exists<SocialGraph>(user)) {
            return (0, 0, 0, 0)
        };
        
        let graph = borrow_global<SocialGraph>(user);
        (
            vector::length(&graph.followers),      // follower count
            vector::length(&graph.following),      // following count
            graph.mutual_connections,              // mutual connections
            vector::length(&graph.trust_connections) // trust connections
        )
    }
    
    /// Get follower count (public view)
    public fun get_follower_count(user: address): u64 acquires SocialGraph {
        if (!exists<SocialGraph>(user)) {
            return 0
        };
        
        let graph = borrow_global<SocialGraph>(user);
        vector::length(&graph.followers)
    }
    
    /// Get following count (public view)
    public fun get_following_count(user: address): u64 acquires SocialGraph {
        if (!exists<SocialGraph>(user)) {
            return 0
        };
        
        let graph = borrow_global<SocialGraph>(user);
        vector::length(&graph.following)
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
    
    fun get_performance_weights(total_recommendations: u64): (u64, u64) {
        if (total_recommendations <= 10) {
            (8000, 2000) // 80% recent, 20% historical for new users
        } else if (total_recommendations <= 50) {
            (7000, 3000) // 70% recent, 30% historical for moderate users
        } else {
            (6000, 4000) // 60% recent, 40% historical for established users
        }
    }
    
    fun calculate_average(values: vector<u64>): u64 {
        let sum = 0;
        let len = vector::length(&values);
        if (len == 0) return 500; // Default to 5.00 if no data
        
        let i = 0;
        while (i < len) {
            sum = sum + *vector::borrow(&values, i);
            i = i + 1;
        };
        
        sum / len
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
    public fun setup_test(ctx: &signer) {
        initialize(ctx);
    }
    
    // Keep your existing tests and add enhanced ones
    #[test]
    public fun test_initialize_reputation() acquires GlobalReputationRegistry {
        use std::unit_test;
        
        let scenario = unit_test::begin(@0x1);
        let admin = unit_test::get_signer_for(@0x42);
        let user = unit_test::get_signer_for(@0x100);
        
        setup_test(&admin);
        initialize_user_reputation(&user);
        
        let global_registry = borrow_global<GlobalReputationRegistry>(@omeonechain);
        assert!(vector::contains(&global_registry.registered_users, &@0x100), 0);
        
        unit_test::end(scenario);
    }
    
    #[test]
    public fun test_enhanced_privileges() acquires ReputationScore, GlobalReputationRegistry {
        use std::unit_test;
        
        let scenario = unit_test::begin(@0x1);
        let admin = unit_test::get_signer_for(@0x42);
        let user = unit_test::get_signer_for(@0x100);
        
        setup_test(&admin);
        initialize_user_reputation(&user);
        
        // Test initial privileges (score = 500)
        assert!(can_earn_rewards(@0x100), 0);           // ≥250
        assert!(can_participate_governance(@0x100), 1); // ≥400
        assert!(can_submit_proposals(@0x100), 2);       // ≥500
        assert!(!is_expert_level(@0x100), 3);           // <750
        
        unit_test::end(scenario);
    }
    
    #[test]
    public fun test_follow_unfollow() acquires SocialGraph, GlobalReputationRegistry, ReputationScore {
        use std::unit_test;
        
        let scenario = unit_test::begin(@0x1);
        let admin = unit_test::get_signer_for(@0x42);
        let user1 = unit_test::get_signer_for(@0x100);
        let user2 = unit_test::get_signer_for(@0x101);
        
        setup_test(&admin);
        initialize_user_reputation(&user1);
        initialize_user_reputation(&user2);
        
        // Test enhanced follow with trust connection
        follow(&user1, @0x101);
        assert!(is_following(@0x100, @0x101), 0);
        
        let (followers, following, mutual, trust_connections) = get_social_metrics(@0x100);
        assert!(following == 1, 1);
        assert!(trust_connections == 1, 2); // Should have created trust connection
        
        // Test unfollow
        unfollow(&user1, @0x101);
        assert!(!is_following(@0x100, @0x101), 3);
        
        let (followers, following, mutual, trust_connections) = get_social_metrics(@0x100);
        assert!(following == 0, 4);
        assert!(trust_connections == 0, 5); // Should have removed trust connection
        
        unit_test::end(scenario);
    }
}