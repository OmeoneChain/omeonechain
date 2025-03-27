# IPFS Integration for OmeoneChain

This document explains the integration of the InterPlanetary File System (IPFS) with OmeoneChain for decentralized storage of recommendation content.

## Overview

IPFS is a peer-to-peer hypermedia protocol designed to make the web faster, safer, and more open. It provides:

- Content-addressed storage (data is addressed by its hash, not its location)
- Decentralized file storage and retrieval
- Deduplication of identical content
- High availability through content replication

In OmeoneChain's architecture, IPFS serves as the storage layer for recommendation content, while the IOTA Tangle stores metadata and verification hashes.

## Current Implementation

The proof-of-concept (`ipfs-poc.js`) demonstrates basic integration with IPFS, including:

1. Connecting to an IPFS node (either Infura's IPFS service or a local node)
2. Storing recommendation content on IPFS
3. Handling media attachments (images, videos, etc.)
4. Retrieving content from IPFS using its Content Identifier (CID)
5. Verifying content integrity using cryptographic hashes

## How Content is Stored

In this implementation:

1. Recommendation content (title, body, media) is stored on IPFS
2. IPFS returns a Content Identifier (CID) that uniquely identifies the content
3. The CID, along with a verification hash, is stored in the metadata
4. The metadata is designed to be stored on the IOTA Tangle (see IOTA integration)

## Benefits of the Hybrid Approach

By combining IPFS storage with IOTA Tangle for metadata:

1. **Efficiency**: Only metadata needs to be replicated across the Tangle, while larger content is stored on IPFS
2. **Cost-effectiveness**: IPFS handles large data efficiently, while IOTA provides feeless transactions for metadata
3. **Verifiability**: Content hashes stored on the Tangle allow for verification of IPFS content
4. **Scalability**: The architecture can handle large amounts of media-rich content

## Limitations of the Current POC

This proof-of-concept has several limitations that will be addressed in future versions:

1. **Pinning Service**: The current implementation doesn't include a pinning service to ensure content persistence
2. **Gateway Access**: It doesn't set up public gateway access for easy content retrieval
3. **Content Encryption**: No encryption for private content is implemented yet
4. **Chunking**: Large files are not optimally chunked for efficient storage

## Next Steps

1. **Pinning Integration**: Add integration with a pinning service (Pinata, Infura, etc.)
2. **Content Access Controls**: Implement permission-based access to certain content
3. **Encryption**: Add end-to-end encryption for private recommendations
4. **Performance Optimization**: Implement proper chunking and parallel uploads
5. **Combined IOTA-IPFS Flow**: Create a unified workflow that uses both systems

## Setting Up IPFS for This POC

You can use this POC in one of two ways:

### Option 1: Using Infura's IPFS Service

1. Sign up for an Infura account at https://infura.io/
2. Create a new IPFS project
3. Get your Project ID and API Secret
4. Replace the placeholders in the code with your actual credentials

### Option 2: Running a Local IPFS Node

1. Install IPFS Desktop or IPFS CLI from https://ipfs.io/#install
2. Start your IPFS daemon locally:
   ```
   ipfs daemon
   ```
3. The code will automatically connect to your local node

## Testing This Implementation

To test this implementation:

1. Install dependencies:
   ```
   npm install
   ```

2. Choose your IPFS connection method (Infura or local) and configure as needed

3. Run the example:
   ```
   npm start
   ```

The script will:
- Create a sample recommendation
- Store its content on IPFS
- Retrieve it using the CID
- Verify the content integrity

## Integration with IOTA

The IPFS and IOTA integrations are designed to work together:

1. Store recommendation content on IPFS to get a CID
2. Create metadata including the IPFS CID and content hash
3. Store the metadata on the IOTA Tangle
4. To retrieve a recommendation, first get the metadata from IOTA
5. Use the IPFS CID from the metadata to retrieve the full content
6. Verify the content against the stored hash

## Technical Resources

- [IPFS Documentation](https://docs.ipfs.io/)
- [IPFS HTTP Client Library](https://github.com/ipfs/js-ipfs-http-client)
- [IPFS Web UI](https://github.com/ipfs/ipfs-webui)
- [Infura IPFS](https://infura.io/docs/ipfs)
- [Pinata IPFS Pinning Service](https://pinata.cloud/)

## Conclusion

This IPFS integration provides OmeoneChain with a scalable, decentralized storage solution for recommendation content. When combined with the IOTA Tangle for metadata and verification, it creates a powerful hybrid architecture that maintains the benefits of both systems.
- Retrieve it using the CID
- Verify the content integrity

## Integration with IOTA

The IPFS and IOTA integrations are designed to work together:

1. Store recommendation content on IPFS to get a CID
2. Create metadata including the IPFS CID and content hash
3. Store the metadata on the I
