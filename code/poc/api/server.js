// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory data store (in a real implementation, this would be on IOTA Tangle)
const db = {
  services: {},
  recommendations: [],
  users: {}
};

// Helper function to generate deterministic IDs (simulating blockchain hash)
function generateId(data) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data) + Date.now())
    .digest('hex')
    .slice(0, 16);
}

// ENDPOINTS

// Get all recommendations
app.get('/api/v1/recommendations', (req, res) => {
  // Support filtering
  const { category, serviceId, author } = req.query;
  
  let results = db.recommendations;
  
  if (category) {
    results = results.filter(rec => rec.category === category);
  }
  
  if (serviceId) {
    results = results.filter(rec => rec.serviceId === serviceId);
  }
  
  if (author) {
    results = results.filter(rec => rec.author === author);
  }
  
  res.json(results);
});

// Get a single recommendation
app.get('/api/v1/recommendations/:id', (req, res) => {
  const recommendation = db.recommendations.find(rec => rec.id === req.params.id);
  
  if (!recommendation) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }
  
  res.json(recommendation);
});

// Create a recommendation
app.post('/api/v1/recommendations', (req, res) => {
  const { author, serviceId, serviceName, category, rating, title, body, tags = [] } = req.body;
  
  // Validation
  if (!author || !serviceName || !category || !rating || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Create or get service
  let actualServiceId = serviceId;
  
  if (!actualServiceId) {
    // Create new service
    actualServiceId = generateId({ name: serviceName, category });
    
    db.services[actualServiceId] = {
      id: actualServiceId,
      name: serviceName,
      category,
      averageRating: 0,
      totalRecommendations: 0,
      createdAt: new Date().toISOString()
    };
  }
  
  // Create recommendation
  const recommendationId = generateId({ author, serviceName, title, body });
  
  const recommendation = {
    id: recommendationId,
    author,
    serviceId: actualServiceId,
    serviceName,
    category,
    rating: parseInt(rating),
    content: {
      title,
      body
    },
    tags,
    timestamp: new Date().toISOString(),
    votes: {
      upvotes: 0,
      downvotes: 0
    },
    verificationStatus: 'unverified',
    contentHash: crypto
      .createHash('sha256')
      .update(JSON.stringify({ author, serviceName, title, body }))
      .digest('hex')
  };
  
  db.recommendations.push(recommendation);
  
  // Update service stats
  const service = db.services[actualServiceId];
  service.totalRecommendations += 1;
  
  // Calculate new average rating
  const serviceRecommendations = db.recommendations.filter(rec => rec.serviceId === actualServiceId);
  const totalRating = serviceRecommendations.reduce((sum, rec) => sum + rec.rating, 0);
  service.averageRating = totalRating / serviceRecommendations.length;
  
  // Update user stats
  if (!db.users[author]) {
    db.users[author] = {
      id: author,
      totalRecommendations: 0,
      reputation: 0,
      createdAt: new Date().toISOString()
    };
  }
  
  db.users[author].totalRecommendations += 1;
  
  res.status(201).json(recommendation);
});

// Upvote a recommendation
app.post('/api/v1/recommendations/:id/upvote', (req, res) => {
  const { voter } = req.body;
  
  if (!voter) {
    return res.status(400).json({ error: 'Voter ID required' });
  }
  
  const recommendation = db.recommendations.find(rec => rec.id === req.params.id);
  
  if (!recommendation) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }
  
  // In a real implementation, we would check if this user already voted
  
  recommendation.votes.upvotes += 1;
  
  // Update author reputation
  const author = recommendation.author;
  
  if (!db.users[author]) {
    db.users[author] = {
      id: author,
      totalRecommendations: 1,
      reputation: 0,
      createdAt: new Date().toISOString()
    };
  }
  
  db.users[author].reputation += 1;
  
  res.json(recommendation);
});

// Downvote a recommendation
app.post('/api/v1/recommendations/:id/downvote', (req, res) => {
  const { voter } = req.body;
  
  if (!voter) {
    return res.status(400).json({ error: 'Voter ID required' });
  }
  
  const recommendation = db.recommendations.find(rec => rec.id === req.params.id);
  
  if (!recommendation) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }
  
  // In a real implementation, we would check if this user already voted
  
  recommendation.votes.downvotes += 1;
  
  res.json(recommendation);
});

// Get services
app.get('/api/v1/services', (req, res) => {
  res.json(Object.values(db.services));
});

// Get a specific service
app.get('/api/v1/services/:id', (req, res) => {
  const service = db.services[req.params.id];
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  res.json(service);
});

// Get user profile
app.get('/api/v1/users/:id', (req, res) => {
  const user = db.users[req.params.id];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// Add some sample data
function addSampleData() {
  // Add services
  const restaurantId = generateId({ name: 'Mama\'s Kitchen', category: 'restaurant' });
  const hotelId = generateId({ name: 'Grand Hotel', category: 'accommodation' });
  
  db.services[restaurantId] = {
    id: restaurantId,
    name: 'Mama\'s Kitchen',
    category: 'restaurant',
    averageRating: 0,
    totalRecommendations: 0,
    createdAt: new Date().toISOString()
  };
  
  db.services[hotelId] = {
    id: hotelId,
    name: 'Grand Hotel',
    category: 'accommodation',
    averageRating: 0,
    totalRecommendations: 0,
    createdAt: new Date().toISOString()
  };
  
  // Add users
  const user1 = 'JaneDoe';
  const user2 = 'TravelGuru';
  
  db.users[user1] = {
    id: user1,
    totalRecommendations: 0,
    reputation: 0,
    createdAt: new Date().toISOString()
  };
  
  db.users[user2] = {
    id: user2,
    totalRecommendations: 0,
    reputation: 0,
    createdAt: new Date().toISOString()
  };
  
  // Add recommendations
  const rec1 = {
    id: generateId({ author: user1, serviceName: 'Mama\'s Kitchen' }),
    author: user1,
    serviceId: restaurantId,
    serviceName: 'Mama\'s Kitchen',
    category: 'restaurant',
    rating: 5,
    content: {
      title: 'Best Italian in town',
      body: 'The pasta is made fresh daily and the sauce is incredible. Highly recommended!'
    },
    tags: ['italian', 'pasta', 'familyFriendly'],
    timestamp: new Date().toISOString(),
    votes: {
      upvotes: 3,
      downvotes: 0
    },
    verificationStatus: 'unverified',
    contentHash: crypto.createHash('sha256').update('rec1').digest('hex')
  };
  
  const rec2 = {
    id: generateId({ author: user2, serviceName: 'Grand Hotel' }),
    author: user2,
    serviceId: hotelId,
    serviceName: 'Grand Hotel',
    category: 'accommodation',
    rating: 4,
    content: {
      title: 'Excellent stay downtown',
      body: 'Great location, friendly staff, and comfortable rooms. The breakfast could be better.'
    },
    tags: ['luxury', 'central', 'business'],
    timestamp: new Date().toISOString(),
    votes: {
      upvotes: 2,
      downvotes: 1
    },
    verificationStatus: 'unverified',
    contentHash: crypto.createHash('sha256').update('rec2').digest('hex')
  };
  
  db.recommendations.push(rec1);
  db.recommendations.push(
