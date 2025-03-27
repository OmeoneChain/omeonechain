// iota-poc.js - Simple script to interact with IOTA Tangle testnet
const { ClientBuilder } = require('@iota/client');
const crypto = require('crypto');

// IOTA Client setup
async function getIotaClient() {
  // Connect to the IOTA Testnet
  return new ClientBuilder()
    .node('https://api.testnet.shimmer.network')
    .localPow(true)
    .build();
}

// Generate a random seed (in a production environment, secure this properly)
function generateSeed() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new wallet (for demonstration purposes)
async function createWallet() {
  try {
    const client = await getIotaClient();
    const seed = generateSeed();
    
    console.log('Generated seed (KEEP SECURE IN PRODUCTION):', seed);
    
    // Generate an address
    const address = await client.generateAddresses(seed, {
      accountIndex: 0,
      range: {
        start: 0,
        end: 1,
      },
      internal: false,
      bech32Hrp: 'tst',
    });
    
    console.log('Generated address:', address[0]);
    
    return { seed, address: address[0] };
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

// Store recommendation data in the Tangle
async function storeRecommendation(recommendationData) {
  try {
    const client = await getIotaClient();
    
    // Convert recommendation to JSON string
    const dataString = JSON.stringify(recommendationData);
    
    // Create message with the recommendation data as index
    const message = await client.message()
      .index('OmeoneChain.Recommendation')
      .data(new TextEncoder().encode(dataString))
      .submit();
    
    console.log('Message sent to the Tangle:', message);
    console.log('Message ID:', message.messageId);
    
    return message.messageId;
  } catch (error) {
    console.error('Error storing recommendation:', error);
    throw error;
  }
}

// Retrieve a message by its ID
async function getMessageById(messageId) {
  try {
    const client = await getIotaClient();
    const message = await client.getMessage(messageId);
    
    console.log('Retrieved message:', message);
    
    // Extract and decode the payload data if it exists
    if (message && message.payload && message.payload.data) {
      const decodedData = new TextDecoder().decode(message.payload.data);
      const parsedData = JSON.parse(decodedData);
      console.log('Decoded recommendation data:', parsedData);
      return parsedData;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving message:', error);
    throw error;
  }
}

// Get all recommendations by index
async function getAllRecommendations() {
  try {
    const client = await getIotaClient();
    const messageIds = await client.getMessage()
      .index('OmeoneChain.Recommendation')
      .exec();
    
    console.log('Found recommendation message IDs:', messageIds);
    
    // Retrieve and decode each message
    const recommendations = [];
    for (const messageId of messageIds) {
      const recommendation = await getMessageById(messageId);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error retrieving recommendations:', error);
    throw error;
  }
}

// Example usage of our functions
async function runExample() {
  try {
    // Create a test wallet
    const wallet = await createWallet();
    console.log('Created test wallet:', wallet);
    
    // Create a sample recommendation
    const recommendation = {
      id: crypto.randomUUID(),
      author: wallet.address.slice(0, 10), // Use part of the address as author ID
      serviceId: 'restaurant-123',
      serviceName: 'Amazing Pizza',
      category: 'restaurant',
      rating: 5,
      content: {
        title: 'Best pizza in town',
        body: 'The margherita is amazing! Highly recommended.'
      },
      tags: ['pizza', 'italian', 'family-friendly'],
      timestamp: new Date().toISOString(),
      verificationStatus: 'unverified',
      contentHash: crypto.createHash('sha256')
        .update('Amazing Pizza Best pizza in town')
        .digest('hex')
    };
    
    console.log('Sample recommendation:', recommendation);
    
    // Store the recommendation on the Tangle
    const messageId = await storeRecommendation(recommendation);
    console.log('Stored recommendation with message ID:', messageId);
    
    // Retrieve and verify the recommendation
    const retrievedRecommendation = await getMessageById(messageId);
    console.log('Retrieved recommendation:', retrievedRecommendation);
    
    // Get all recommendations (might include others if deployed on shared testnet)
    const allRecommendations = await getAllRecommendations();
    console.log('All recommendations:', allRecommendations);
    
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Execute the example if run directly
if (require.main === module) {
  runExample()
    .then(() => console.log('Example completed successfully'))
    .catch(error => console.error('Example failed:', error));
}

// Export functions for use in other modules
module.exports = {
  createWallet,
  storeRecommendation,
  getMessageById,
  getAllRecommendations
};
