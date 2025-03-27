// omeonechain-storage.js - Combined IOTA and IPFS integration for OmeoneChain
const { ClientBuilder } = require('@iota/client');
const { create } = require('ipfs-http-client');
const crypto = require('crypto');

// ====== IPFS FUNCTIONS ======

// Connect to IPFS (Infura or Local)
async function getIpfsClient() {
  try {
    // Try Infura first (replace with your credentials)
    const projectId = process.env.INFURA_PROJECT_ID;
    const projectSecret = process.env.INFURA_PROJECT_SECRET;
    
    if (projectId && projectSecret) {
      const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
      return create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: auth
        }
      });
    } else {
      // Fall back to local node
      console.log('No Infura credentials found, using local IPFS node...');
      return create({
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      });
    }
  } catch (error) {
    console.error('Error connecting to IPFS:', error);
    throw error;
  }
}

// Store content on IPFS
async function storeOnIpfs(content) {
  try {
    const ipfs = await getIpfsClient();
    const contentString = JSON.stringify(content);
    const result = await ipfs.add(contentString);
    
    // Calculate content hash for verification
    const contentHash = crypto.createHash('sha256').update(contentString).digest('hex');
    
    return {
      cid: result.cid.toString(),
      contentHash
    };
  } catch (error) {
    console.error('Error storing on IPFS:', error);
    throw error;
  }
}

// Retrieve content from IPFS
async function getFromIpfs(cid) {
  try {
    const ipfs = await getIpfsClient();
    let contentString = '';
    
    for await (const chunk of ipfs.cat(cid)) {
      contentString += new TextDecoder().decode(chunk);
    }
    
    return JSON.parse(contentString);
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw error;
  }
}

// ====== IOTA FUNCTIONS ======

// Connect to IOTA testnet
async function getIotaClient() {
  return new ClientBuilder()
    .node('https://api.testnet.shimmer.network')
    .localPow(true)
    .build();
}

// Store metadata on IOTA Tangle
async function storeOnTangle(metadata) {
  try {
    const client = await getIotaClient();
    const dataString = JSON.stringify(metadata);
    
    const message = await client.message()
      .index('OmeoneChain.Recommendation')
      .data(new TextEncoder().encode(dataString))
      .submit();
    
    return message.messageId;
  } catch (error) {
    console.error('Error storing on IOTA Tangle:', error);
    throw error;
  }
}

// Retrieve metadata from IOTA Tangle
async function getFromTangle(messageId) {
  try {
    const client = await getIotaClient();
    const message = await client.getMessage(messageId);
    
    if (message && message.payload && message.payload.data) {
      const decodedData = new TextDecoder().decode(message.payload.data);
      return JSON.parse(decodedData);
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving from IOTA Tangle:', error);
    throw error;
  }
}

// ====== COMBINED FUNCTIONS ======

// Store a complete recommendation
async function storeRecommendation(recommendation) {
  try {
    // 1. Separate content and metadata
    const content = {
      title: recommendation.title,
      body: recommendation.body,
      tags: recommendation.tags,
      media: recommendation.media || []
    };
    
    // 2. Store content on IPFS
    console.log('Storing content on IPFS...');
    const ipfsResult = await storeOnIpfs(content);
    console.log('Content stored on IPFS with CID:', ipfsResult.cid);
    
    // 3. Create metadata for IOTA
    const metadata = {
      id: crypto.randomUUID(),
      author: recommendation.author,
      serviceId: recommendation.serviceId,
      serviceName: recommendation.serviceName,
      category: recommendation.category,
      rating: recommendation.rating,
      timestamp: new Date().toISOString(),
      contentRef: {
        ipfsCid: ipfsResult.cid,
        contentHash: ipfsResult.contentHash
      },
      verificationStatus: 'unverified'
    };
    
    // 4. Store metadata on IOTA Tangle
    console.log('Storing metadata on IOTA Tangle...');
    const messageId = await storeOnTangle(metadata);
    console.log('Metadata stored on IOTA Tangle with message ID:', messageId);
    
    return {
      messageId,
      ipfsCid: ipfsResult.cid,
      recommendation: {
        ...metadata,
        content
      }
    };
  } catch (error) {
    console.error('Error storing recommendation:', error);
    throw error;
  }
}

// Retrieve and verify a complete recommendation
async function getRecommendation(messageId) {
  try {
    // 1. Get metadata from IOTA Tangle
    console.log('Retrieving metadata from IOTA Tangle...');
    const metadata = await getFromTangle(messageId);
    
    if (!metadata) {
      throw new Error('Recommendation metadata not found');
    }
    
    console.log('Metadata retrieved from IOTA Tangle');
    
    // 2. Get content from IPFS using the CID
    console.log('Retrieving content from IPFS...');
    const content = await getFromIpfs(metadata.contentRef.ipfsCid);
    console.log('Content retrieved from IPFS');
    
    // 3. Verify content integrity
    const contentString = JSON.stringify(content);
    const calculatedHash = crypto.createHash('sha256').update(contentString).digest('hex');
    const isVerified = calculatedHash === metadata.contentRef.contentHash;
    
    console.log('Content verification:', isVerified ? 'VERIFIED' : 'FAILED');
    
    // 4. Combine data and return
    return {
      metadata,
      content,
      isVerified
    };
  } catch (error) {
    console.error('Error retrieving recommendation:', error);
    throw error;
  }
}

// ====== EXAMPLE USAGE ======

async function runExample() {
  try {
    // Sample recommendation
    const recommendation = {
      author: 'user-' + Math.floor(Math.random() * 1000),
      serviceId: 'restaurant-' + Math.floor(Math.random() * 1000),
      serviceName: 'Amazing Burger Joint',
      category: 'restaurant',
      rating: 5,
      title: 'Best burgers in town!',
      body: 'The classic cheeseburger is amazing. Great atmosphere and friendly staff too.',
      tags: ['burgers', 'casual', 'family-friendly']
    };
    
    console.log('========================================');
    console.log('STORING RECOMMENDATION');
    console.log('========================================');
    console.log('Sample recommendation:', recommendation);
    
    // Store the recommendation
    const storeResult = await storeRecommendation(recommendation);
    console.log('Store result:', storeResult);
    
    console.log('========================================');
    console.log('RETRIEVING RECOMMENDATION');
    console.log('========================================');
    
    // Retrieve the recommendation
    const retrievedRecommendation = await getRecommendation(storeResult.messageId);
    console.log('Retrieved recommendation:', retrievedRecommendation);
    
    console.log('========================================');
    console.log('VERIFICATION RESULT:', retrievedRecommendation.isVerified ? 'SUCCESS' : 'FAILED');
    console.log('========================================');
    
    // Display public access URLs
    console.log('Content can be viewed at:');
    console.log(`https://ipfs.io/ipfs/${storeResult.ipfsCid}`);
    console.log(`Message can be viewed at: https://explorer.iota.org/testnet/message/${storeResult.messageId}`);
    
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run the example if executed directly
if (require.main === module) {
  runExample()
    .then(() => console.log('Example completed successfully'))
    .catch(error => console.error('Example failed:', error));
}

// Export functions
module.exports = {
  storeRecommendation,
  getRecommendation,
  storeOnIpfs,
  getFromIpfs,
  storeOnTangle,
  getFromTangle
};
