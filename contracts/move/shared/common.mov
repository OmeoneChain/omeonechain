module omeonechain::common {
    use std::error;
    use std::signer;
    use std::string::{String};
    use std::vector;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;
    const E_INVALID_ARGUMENT: u64 = 4;
    const E_RESOURCE_NOT_FOUND: u64 = 5;
    const E_RESOURCE_ALREADY_EXISTS: u64 = 6;

    /// Constants
    const TRUST_SCORE_DECIMALS: u8 = 2; // Trust score is represented with 2 decimal places
    const MAX_TRUST_SCORE: u64 = 1000; // 10.00 with 2 decimal places
    const MIN_TRUST_WEIGHT: u64 = 0;
    const DIRECT_FOLLOWER_WEIGHT: u64 = 75; // 0.75 with 2 decimal places
    const INDIRECT_FOLLOWER_WEIGHT: u64 = 25; // 0.25 with 2 decimal places

    /// Timestamp utility to get current time in seconds
    public fun current_timestamp(): u64 {
        // Implementation would call blockchain timestamp in production
        // For testing, we just return a fixed value
        1651234567
    }

    /// Utility to check if an address is the module owner/admin
    public fun is_admin(addr: address): bool {
        // Implement admin check here, could be a hardcoded address
        // or a dynamic admin registry
        addr == @omeonechain
    }

    /// Utility to check authorization
    public fun check_authorized(account: &signer) {
        let addr = signer::address_of(account);
        assert!(is_admin(addr), error::permission_denied(E_NOT_AUTHORIZED));
    }

    /// StorageId struct to uniquely identify on-chain objects
    struct StorageId has copy, drop, store {
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
    struct ContentHash has copy, drop, store {
        hash: vector<u8>,
        hash_type: u8, // 1 = SHA-256, 2 = BLAKE3, etc.
    }

    /// Create a new content hash
    public fun create_content_hash(hash: vector<u8>, hash_type: u8): ContentHash {
        assert!(hash_type > 0 && hash_type <= 3, error::invalid_argument(E_INVALID_ARGUMENT));
        ContentHash { hash, hash_type }
    }

    /// Verify content hash against expected value
    public fun verify_content_hash(stored: &ContentHash, provided: vector<u8>, hash_type: u8): bool {
        stored.hash_type == hash_type && stored.hash == provided
    }

    /// IPFS CID wrapper
    struct IpfsCid has copy, drop, store {
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
    struct TimeStamp has copy, drop, store {
        created_at: u64,
        modified_at: u64,
    }

    /// Create a new timestamp
    public fun create_timestamp(): TimeStamp {
        let now = current_timestamp();
        TimeStamp {
            created_at: now,
            modified_at: now,
        }
    }

    /// Update the modified timestamp
    public fun update_timestamp(timestamp: &mut TimeStamp) {
        timestamp.modified_at = current_timestamp();
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
    struct Location has copy, drop, store {
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
        assert!(latitude <= 90000000, error::invalid_argument(E_INVALID_ARGUMENT)); // Max 90 degrees
        assert!(longitude <= 180000000, error::invalid_argument(E_INVALID_ARGUMENT)); // Max 180 degrees
        
        Location {
            latitude,
            longitude,
            is_negative_lat,
            is_negative_long,
        }
    }

    /// Category enum for service types
    struct Category has copy, drop, store {
        code: u8, // 1 = Restaurant, 2 = Hotel, 3 = Activity, etc.
    }

    /// Create a category
    public fun create_category(code: u8): Category {
        // Validate category code is within valid range
        assert!(code > 0 && code <= 10, error::invalid_argument(E_INVALID_ARGUMENT));
        Category { code }
    }

    /// Test harness for all functions in this module (internal)
    #[test_only]
    struct CommonTests has drop {}

    #[test]
    public fun test_current_timestamp() {
        let ts = current_timestamp();
        assert!(ts > 0, 0);
    }

    #[test]
    public fun test_content_hash() {
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
    public fun test_timestamp() {
        let ts = create_timestamp();
        let created = get_creation_time(&ts);
        assert!(created > 0, 0);
        
        // Test updating timestamp
        update_timestamp(&mut ts);
        let modified = get_modified_time(&ts);
        assert!(modified >= created, 0);
    }

    #[test]
    public fun test_location() {
        // Create a valid location (New York City approx: 40.7128° N, 74.0060° W)
        let lat = 40712800; // 40.712800
        let long = 74006000; // 74.006000
        let location = create_location(lat, long, false, true);
        
        assert!(location.latitude == lat, 0);
        assert!(location.longitude == long, 0);
        assert!(!location.is_negative_lat, 0); // North is positive
        assert!(location.is_negative_long, 0); // West is negative
    }
}
