# OmeoneChain Storage System: IOTA + IPFS Integration

This document explains the complete storage solution for OmeoneChain, combining IOTA Tangle for metadata storage and IPFS for content storage.

## Architecture Overview

OmeoneChain's hybrid storage approach:

1. **IPFS Layer**: Stores recommendation content (titles, descriptions, reviews, media files)
2. **IOTA Layer**: Stores metadata, content references, and verification hashes

This architecture provides:
- Scalability for storing large recommendation content
- Cost efficiency through feeless IOTA transactions
- Data integrity verification through cryptographic hashing
- Decentralized content availability through IPFS

## Workflow

### Storing a Recommendation

1. **Content Preparation**: The recommendation content (title, body, tags, media) is separated from metadata
2. **IPFS Storage**: Content is stored on IPFS, which returns a Content Identifier (CID)
3. **Content Verification**: A cryptographic hash of the content is calculated
4. **Metadata Creation**: A metadata object is created including the IPFS CID and content hash
5. **IOTA Storage**: The metadata is stored on the IOTA Tangle
6. **Reference Return**: The IOTA message ID and IPFS CID are returned as references

### Retrieving a Recommendation

1. **Metadata Retrieval**: The metadata is retrieved from the IOTA Tangle using the message ID
2. **Content Retrieval**: The content is retrieved from IPFS using the CID stored in the metadata
3. **Verification**: The content is verified by comparing its hash with the stored hash
4. **Combination**: The metadata and content are combined to create the complete recommendation

## Implementation Details

The `omeonechain-storage.js` script implements:

- Connection to IOTA Testnet
- Connection to either Infura IPFS or a local IPFS node
- Functions for storing content on IPFS
- Functions for storing metadata on IOTA
- Functions for retrieving and verifying recommendations

## Security Features

1. **Content Integrity**: Verified through cryptographic hashing
2. **Immutability**: IOTA Tangle provides tamper-proof storage for metadata
3. **Transparency**: All transactions are visible on the public ledger
4. **Resilience**: Content availability through IPFS's distributed storage network

## Limitations & Future Enhancements

**Current Limitations**:
- No content encryption for private recommendations
- No persistence guarantee for IPFS content without pinning
- Limited query capabilities for recommendations

**Planned Enhancements**:
- Integration with IPFS pinning services
- Content encryption for private recommendations
- Advanced querying and indexing
- Token-based incentives for content storage and hosting

## Setup & Usage

### Prerequisites

- Node.js 14+ installed
- (Optional) Local IPFS node running
- (Optional) Infura IPFS account

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (for Infura IPFS):
   ```bash
   export INFURA_PROJECT_ID=your_project_id
   export INFURA_PROJECT_SECRET=your_project_secret
   ```

### Running the Example

```bash
npm start
```

This will:
1. Create a sample recommendation
2. Store it using the hybrid storage system
3. Retrieve and verify it
4. Display public access URLs for the content

### API Reference

#### `storeRecommendation(recommendation)`
Stores a recommendation using the hybrid storage system.

**Parameters:**
- `recommendation`: Object containing the recommendation data

**Returns:**
- Object containing `messageId`, `ipfsCid`, and the full recommendation

#### `getRecommendation(messageId)`
Retrieves a recommendation by its IOTA message ID.

**Parameters:**
- `messageId`: The IOTA message ID

**Returns:**
- Object containing `metadata`, `content`, and a verification status

#### Additional Helper Functions

- `storeOnIpfs(content)`: Stores content directly on IPFS
- `getFromIpfs(cid)`: Retrieves content from IPFS by CID
- `storeOnTangle(metadata)`: Stores metadata directly on the Tangle
- `getFromTangle(messageId)`: Retrieves metadata from the Tangle

## Integration with the REST API

To integrate this storage system with the OmeoneChain API:

1. Import the storage module:
   ```javascript
   const storage = require('./omeonechain-storage');
   ```

2. Use it in your API endpoints:
   ```javascript
   app.post('/api/v1/recommendations', async (req, res) => {
     try {
       const recommendation = req.body;
       const result = await storage.storeRecommendation(recommendation);
       res.status(201).json(result);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   app.get('/api/v1/recommendations/:messageId', async (req, res) => {
     try {
       const recommendation = await storage.getRecommendation(req.params.messageId);
       if (!recommendation) {
         return res.status(404).json({ error: 'Recommendation not found' });
       }
       res.json(recommendation);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

## Accessing Content

The stored content can be accessed through public gateways:

1. **IPFS Content**:
   - `https://ipfs.io/ipfs/{cid}`
   - `https://gateway.pinata.cloud/ipfs/{cid}`
   - `https://infura-ipfs.io/ipfs/{cid}`

2. **IOTA Metadata**:
   - `https://explorer.iota.org/testnet/message/{messageId}`

## Conclusion

This hybrid storage solution provides OmeoneChain with a scalable, decentralized architecture for storing recommendation data. By combining IPFS for content storage and IOTA for metadata and verification, we achieve a system that is both efficient and secure.
