// ipfs-poc.js - Simple script to interact with IPFS for content storage
const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// IPFS client setup - using Infura's IPFS service as an example
// In production, you'd likely run your own IPFS node
async function getIpfsClient() {
  try {
    // Connect to Infura's IPFS gateway (you'll need to replace with your own project ID and secret)
    const projectId = 'YOUR_INFURA_PROJECT_ID';  // Replace with your Infura project ID
    const projectSecret = 'YOUR_INFURA_PROJECT_SECRET'; // Replace with your Infura project secret
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    
    const client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth
      }
    });
    
    return client;
  } catch (error) {
    console.error('Error connecting to IPFS:', error);
    throw error;
  }
}

// Alternative: Connect to a local IPFS node
async function getLocalIpfsClient() {
  try {
    // Connect to local IPFS daemon (you must have IPFS daemon running)
    const client = create({
      host: 'localhost',
      port: 5001,
      protocol: 'http'
    });
    
    return client;
  } catch (error) {
    console.error('Error connecting to local IPFS:', error);
    throw error;
  }
}

// Store a recommendation's content on IPFS
async function storeRecommendationContent(content) {
  try {
    // Get IPFS client (use local client if Infura credentials not set)
    let client;
    try {
      client = await getIpfsClient();
    } catch (error) {
      console.log('Falling back to local IPFS client...');
      client = await getLocalIpfsClient();
    }
    
    // Convert content object to JSON string
    const contentString = JSON.stringify(content);
    
    // Add the content to IPFS
    const addResult = await client.add(contentString);
    console.log('Content added to IPFS with CID:', addResult.cid.toString());
    
    // Generate a verification hash of the content
    const contentHash = crypto.createHash('sha256').update(contentString).digest('hex');
    
    return {
      ipfsCid: addResult.cid.toString(),
      contentHash: contentHash
    };
  } catch (error) {
    console.error('Error storing content on IPFS:', error);
    throw error;
  }
}

// Store content with media files
async function storeRecommendationWithMedia(content, mediaFiles = []) {
  try {
    // Get IPFS client
    let client;
    try {
      client = await getIpfsClient();
    } catch (error) {
      console.log('Falling back to local IPFS client...');
      client = await getLocalIpfsClient();
    }
    
    // Upload each media file and store its CID
    const mediaResults = [];
    
    for (const filePath of mediaFiles) {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      
      const fileResult = await client.add({
        path: fileName,
        content: fileContent
      });
      
      mediaResults.push({
        name: fileName,
        ipfsCid: fileResult.cid.toString(),
        contentType: getContentType(fileName)
      });
    }
    
    // Add media references to the content
    const contentWithMedia = {
      ...content,
      media: mediaResults
    };
    
    // Store the complete content
    return await storeRecommendationContent(contentWithMedia);
  } catch (error) {
    console.error('Error storing content with media on IPFS:', error);
    throw error;
  }
}

// Helper to determine content type based on file extension
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Retrieve content from IPFS by CID
async function getContentFromIpfs(cid) {
  try {
    // Get IPFS client
    let client;
    try {
      client = await getIpfsClient();
    } catch (error) {
      console.log('Falling back to local IPFS client...');
      client = await getLocalIpfsClient();
    }
    
    // Get the content as a string
    let contentString = '';
    
    // Using for-await-of to handle the async iterator returned by client.cat
    for await (const chunk of client.cat(cid)) {
      contentString += new TextDecoder().decode(chunk);
    }
    
    // Parse the JSON content
    const content = JSON.parse(contentString);
    
    // Verify the content hash
    const verificationHash = crypto.createHash('sha256').update(contentString).digest('hex');
    
    return {
      content,
      verified: content.contentHash === verificationHash
    };
  } catch (error) {
    console.error('Error retrieving content from IPFS:', error);
    throw error;
  }
}

// Create a complete recommendation with IPFS storage and prepare for IOTA
async function createCompleteRecommendation(recommendation, mediaFiles = []) {
  try {
    // First store the content on IPFS
    const ipfsResult = await storeRecommendationWithMedia(
      {
        title: recommendation.content.title,
        body: recommendation.content.body,
        tags: recommendation.tags,
        // Add other content fields as needed
      },
      mediaFiles
    );
    
    // Create the metadata for IOTA storage
    const iotaMetadata = {
      id: crypto.randomUUID(),
      author: recommendation.author,
      serviceId: recommendation.serviceId,
      serviceName: recommendation.serviceName,
      category: recommendation.category,
      rating: recommendation.rating,
      timestamp: new Date().toISOString(),
      ipfsCid: ipfsResult.ipfsCid,
      contentHash: ipfsResult.contentHash,
      verificationStatus: 'unverified'
    };
    
    return {
      iotaMetadata,
      ipfsResult
    };
  } catch (error) {
    console.error('Error creating complete recommendation:', error);
    throw error;
  }
}

// Example usage
async function runExample() {
  try {
    // Sample recommendation
    const recommendation = {
      author: 'user-123',
      serviceId: 'cafe-456',
      serviceName: 'Coffee Haven',
      category: 'cafe',
      rating: 5,
      content: {
        title: 'Best coffee in town',
        body: 'The espresso is amazing and the atmosphere is perfect for working. Highly recommended!'
      },
      tags: ['coffee', 'wifi', 'workspace']
    };
    
    console.log('Sample recommendation:', recommendation);
    
    // Store content on IPFS
    console.log('Storing content on IPFS...');
    const ipfsResult = await storeRecommendationContent(recommendation.content);
    console.log('IPFS result:', ipfsResult);
    
    // Retrieve content from IPFS
    console.log('Retrieving content from IPFS...');
    const retrievedContent = await getContentFromIpfs(ipfsResult.ipfsCid);
    console.log('Retrieved content:', retrievedContent);
    
    // Create a complete recommendation
    console.log('Creating complete recommendation...');
    
    // Note: For this example to work with media files, you would need actual files
    // For demo purposes, we'll skip media files by passing an empty array
    const completeRecommendation = await createCompleteRecommendation(recommendation, []);
    console.log('Complete recommendation:', completeRecommendation);
    
    console.log('--------------------------------------------');
    console.log('NEXT STEPS:');
    console.log('1. Store the iotaMetadata on the IOTA Tangle');
    console.log('2. Use the ipfsCid to retrieve the full content');
    console.log('3. Verify the content against the contentHash');
    
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example if executed directly
if (require.main === module) {
  runExample()
    .then(() => console.log('Example completed successfully'))
    .catch(error => console.error('Example failed:', error));
}

// Export functions for use in other modules
module.exports = {
  storeRecommendationContent,
  storeRecommendationWithMedia,
  getContentFromIpfs,
  createCompleteRecommendation
};
