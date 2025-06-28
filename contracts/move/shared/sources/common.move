module omeone::common {
    use std::string::{String};
    use std::vector;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::transfer;

    /// Error codes  
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;
    const E_INVALID_ARGUMENT: u64 = 4;
    const E_RESOURCE_NOT_FOUND: u64 = 5;
    const E_RESOURCE_ALREADY_EXISTS: u64 = 6;

    /// Constants
    const TRUST_SCORE_DECIMALS: u8 = 2;
    const MAX_TRUST_SCORE: u64 = 1000; // 10.00 with 2 decimal places
    const MIN_TRUST_WEIGHT: u64 = 0;
    const DIRECT_FOLLOWER_WEIGHT: u64 = 75; // 0.75 with 2 decimal places
    const INDIRECT_FOLLOWER_WEIGHT: u64 = 25; // 0.25 with 2 decimal places

    /// Admin capability for secure access control
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Get current timestamp from transaction context
    public fun current_timestamp(ctx: &TxContext): u64 {
        tx_context::epoch_timestamp_ms(ctx)
    }

    /// Utility to check if an address is the module owner/admin
    public fun is_admin(addr: address): bool {
        // For development - in production, check AdminCap ownership
        addr == @omeone || addr == @0xCAFE
    }

    /// Initialize admin capability
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// StorageId struct to uniquely identify on-chain objects
    public struct StorageId has copy, drop, store {
        id: String,
    }

    /// Create a new storage ID
    public fun create_storage_id(id: String): StorageId {
        StorageId { id }
    }

    /// Get string ID from StorageId
    public fun get_id_string(storage_id: &StorageId): String {
        storage_id.id
    }

    /// ContentHash struct for verifying off-chain content
    public struct ContentHash has copy, drop, store {
        hash: vector<u8>,
        hash_type: u8, // 1 = SHA-256, 2 = BLAKE3, etc.
    }

    /// Create a new content hash
    public fun create_content_hash(hash: vector<u8>, hash_type: u8): ContentHash {
        assert!(hash_type > 0 && hash_type <= 3, E_INVALID_ARGUMENT);
        ContentHash { hash, hash_type }
    }

    /// Verify content hash against expected value
    public fun verify_content_hash(stored: &ContentHash, provided: vector<u8>, hash_type: u8): bool {
        stored.hash_type == hash_type && stored.hash == provided
    }

    /// IPFS CID wrapper
    public struct IpfsCid has copy, drop, store {
        cid: String,
    }

    /// Create a new IPFS CID reference
    public fun create_ipfs_cid(cid: String): IpfsCid {
        IpfsCid { cid }
    }

    /// Get CID string from IpfsCid
    public fun get_cid_string(ipfs_cid: &IpfsCid): String {
        ipfs_cid.cid
    }

    /// TimeStamp utility for tracking creation/modification times
    public struct TimeStamp has copy, drop, store {
        created_at: u64,
        modified_at: u64,
    }

    /// Create a new timestamp with current time
    public fun create_timestamp(ctx: &TxContext): TimeStamp {
        let now = current_timestamp(ctx);
        TimeStamp {
            created_at: now,
            modified_at: now,
        }
    }

    /// Update the modified timestamp
    public fun update_timestamp(timestamp: &mut TimeStamp, ctx: &TxContext) {
        timestamp.modified_at = current_timestamp(ctx);
    }

    /// Get creation time
    public fun get_creation_time(timestamp: &TimeStamp): u64 {
        timestamp.created_at
    }

    /// Get last modification time
    public fun get_modified_time(timestamp: &TimeStamp): u64 {
        timestamp.modified_at
    }

    /// Location struct for geographical coordinates
    public struct Location has copy, drop, store {
        latitude: u64,  // Stored as integer with 6 decimal places (multiply by 1,000,000)
        longitude: u64, // Stored as integer with 6 decimal places (multiply by 1,000,000)
        is_negative_lat: bool,
        is_negative_long: bool,
    }

    /// Create a new location
    public fun create_location(
        latitude: u64, 
        longitude: u64,
        is_negative_lat: bool,
        is_negative_long: bool
    ): Location {
        // Basic validation
        assert!(latitude <= 90000000, E_INVALID_ARGUMENT); // Max 90 degrees
        assert!(longitude <= 180000000, E_INVALID_ARGUMENT); // Max 180 degrees
        
        Location {
            latitude,
            longitude,
            is_negative_lat,
            is_negative_long,
        }
    }

    /// Category enum for service types
    public struct Category has copy, drop, store {
        code: u8, // 1 = Restaurant, 2 = Hotel, 3 = Activity, etc.
    }

    /// Create a category
    public fun create_category(code: u8): Category {
        // Validate category code is within valid range
        assert!(code > 0 && code <= 10, E_INVALID_ARGUMENT);
        Category { code }
    }

    /// Get trust weight constants
    public fun get_direct_follower_weight(): u64 { DIRECT_FOLLOWER_WEIGHT }
    public fun get_indirect_follower_weight(): u64 { INDIRECT_FOLLOWER_WEIGHT }
    public fun get_max_trust_score(): u64 { MAX_TRUST_SCORE }

    /// Time utility functions
    public fun days_to_ms(days: u64): u64 {
        days * 24 * 60 * 60 * 1000
    }

    public fun hours_to_ms(hours: u64): u64 {
        hours * 60 * 60 * 1000
    }

    public fun minutes_to_ms(minutes: u64): u64 {
        minutes * 60 * 1000
    }

    #[test_only]
    use sui::test_scenario;

    #[test]
    fun test_current_timestamp() {
        let scenario_val = test_scenario::begin(@0x1);
        let scenario = &mut scenario_val;
        let ctx = test_scenario::ctx(scenario);
        
        let ts = current_timestamp(ctx);
        assert!(ts > 0, 0);
        
        test_scenario::end(scenario_val);
    }

    #[test]
    fun test_content_hash() {
        let hash = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let hash_type = 1; // SHA-256
        let content_hash = create_content_hash(hash, hash_type);
        
        // Test verification with same hash
        assert!(verify_content_hash(&content_hash, hash, hash_type), 0);
        
        // Test verification with different hash
        let different_hash = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdee";
        assert!(!verify_content_hash(&content_hash, different_hash, hash_type), 0);
    }

    #[test]
    fun test_timestamp() {
        let scenario_val = test_scenario::begin(@0x1);
        let scenario = &mut scenario_val;
        let ctx = test_scenario::ctx(scenario);
        
        let mut ts = create_timestamp(ctx);
        let created = get_creation_time(&ts);
        assert!(created > 0, 0);
        
        // Test updating timestamp
        update_timestamp(&mut ts, ctx);
        let modified = get_modified_time(&ts);
        assert!(modified >= created, 0);
        
        test_scenario::end(scenario_val);
    }

    #[test]
    fun test_location() {
        // Create a valid location (New York City approx: 40.7128° N, 74.0060° W)
        let lat = 40712800; // 40.712800
        let long = 74006000; // 74.006000
        let location = create_location(lat, long, false, true);
        
        assert!(location.latitude == lat, 0);
        assert!(location.longitude == long, 0);
        assert!(!location.is_negative_lat, 0); // North is positive
        assert!(location.is_negative_long, 0); // West is negative
    }

    #[test]
    fun test_trust_constants() {
        assert!(get_direct_follower_weight() == 75, 0);
        assert!(get_indirect_follower_weight() == 25, 0);
        assert!(get_max_trust_score() == 1000, 0);
    }
}