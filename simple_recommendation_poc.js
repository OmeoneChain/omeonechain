// recommendation-poc.js
// This is a simplified proof-of-concept for the OmeoneChain recommendation storage system
// It demonstrates core concepts without requiring blockchain knowledge

const crypto = require('crypto');

class Recommendation {
  constructor(author, serviceId, category, rating, content, tags = []) {
    this.id = crypto.randomUUID();
    this.author = author;
    this.serviceId = serviceId;
    this.category = category;
    this.timestamp = new Date().toISOString();
    this.rating = rating;
    this.content = content;
    this.tags = tags;
    this.votes = {
      upvotes: 0,
      downvotes: 0
    };
    this.verificationStatus = "unverified";
    this.contentHash = this.generateContentHash();
  }

  generateContentHash() {
    // In a real implementation, this would be stored on the Tangle
    const data = JSON.stringify({
      author: this.author,
      serviceId: this.serviceId,
      content: this.content,
      timestamp: this.timestamp
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

class Service {
  constructor(name, category, location) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.category = category;
    this.location = location;
    this.averageRating = 0;
    this.totalRecommendations = 0;
    this.totalUpvotes = 0;
    this.createdAt = new Date().toISOString();
  }
}

class OmeoneChainPOC {
  constructor() {
    this.recommendations = [];
    this.services = [];
    this.users = {};
  }

  // Service methods
  createService(name, category, location) {
    const service = new Service(name, category, location);
    this.services.push(service);
    return service;
  }

  getService(serviceId) {
    return this.services.find(service => service.id === serviceId);
  }

  // Recommendation methods
  createRecommendation(author, serviceId, category, rating, content, tags = []) {
    const service = this.getService(serviceId);
    if (!service) throw new Error("Service not found");
    
    const recommendation = new Recommendation(author, serviceId, category, rating, content, tags);
    this.recommendations.push(recommendation);
    
    // Update service metrics
    service.totalRecommendations += 1;
    this.updateServiceRating(serviceId);
    
    // Update user reputation (simplified)
    if (!this.users[author]) {
      this.users[author] = {
        recommendations: 0,
        upvotesReceived: 0,
        reputation: 0
      };
    }
    this.users[author].recommendations += 1;
    
    return recommendation;
  }

  getRecommendation(id) {
    return this.recommendations.find(rec => rec.id === id);
  }

  // Voting methods
  upvoteRecommendation(recommendationId, voter) {
    const recommendation = this.getRecommendation(recommendationId);
    if (!recommendation) throw new Error("Recommendation not found");
    
    recommendation.votes.upvotes += 1;
    
    // Update service metrics
    const service = this.getService(recommendation.serviceId);
    service.totalUpvotes += 1;
    
    // Update author reputation
    const author = recommendation.author;
    this.users[author].upvotesReceived += 1;
    this.users[author].reputation += 1; // Simplified reputation calculation
    
    return recommendation;
  }

  // Query methods
  findRecommendationsByCategory(category) {
    return this.recommendations.filter(rec => rec.category === category);
  }

  findRecommendationsByAuthor(author) {
    return this.recommendations.filter(rec => rec.author === author);
  }

  // Service rating update
  updateServiceRating(serviceId) {
    const service = this.getService(serviceId);
    const serviceRecommendations = this.recommendations.filter(rec => rec.serviceId === serviceId);
    
    if (serviceRecommendations.length === 0) return;
    
    const totalRating = serviceRecommendations.reduce((sum, rec) => sum + rec.rating, 0);
    service.averageRating = totalRating / serviceRecommendations.length;
  }

  // Get user reputation
  getUserReputation(userId) {
    return this.users[userId] || { reputation: 0 };
  }
}

// Example usage
function demoOmeoneChain() {
  const platform = new OmeoneChainPOC();
  
  // Create some services
  const restaurant = platform.createService(
    "Amazing Pizza",
    "restaurant",
    { latitude: 37.7749, longitude: -122.4194, address: "123 Main St" }
  );
  
  const hotel = platform.createService(
    "Grand Hotel",
    "accommodation",
    { latitude: 37.7833, longitude: -122.4167, address: "456 Market St" }
  );
  
  // Create users (simplified)
  const user1 = "user1";
  const user2 = "user2";
  
  // Create recommendations
  const rec1 = platform.createRecommendation(
    user1,
    restaurant.id,
    "restaurant",
    5,
    { title: "Best pizza in town", body: "The margherita is amazing" },
    ["pizza", "italian"]
  );
  
  const rec2 = platform.createRecommendation(
    user2,
    restaurant.id,
    "restaurant",
    4,
    { title: "Great food", body: "Loved the pasta dishes" },
    ["pasta", "italian"]
  );
  
  const rec3 = platform.createRecommendation(
    user2,
    hotel.id,
    "accommodation",
    5,
    { title: "Excellent hotel", body: "Great service and amenities" },
    ["luxury", "downtown"]
  );
  
  // Add some votes
  platform.upvoteRecommendation(rec1.id, user2);
  platform.upvoteRecommendation(rec1.id, "user3");
  platform.upvoteRecommendation(rec2.id, user1);
  
  // Display some results
  console.log("Restaurant average rating:", restaurant.averageRating);
  console.log("Italian restaurant recommendations:", platform.findRecommendationsByCategory("restaurant").length);
  console.log("User1 reputation:", platform.getUserReputation(user1).reputation);
  console.log("User2 reputation:", platform.getUserReputation(user2).reputation);
  console.log("Recommendations by User2:", platform.findRecommendationsByAuthor(user2).length);
  
  return platform;
}

// Run the demo
const demo = demoOmeoneChain();
console.log(JSON.stringify(demo, null, 2));

module.exports = {
  Recommendation,
  Service,
  OmeoneChainPOC
};
