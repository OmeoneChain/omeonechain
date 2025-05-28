# OmeoneChain Integration Guide

A comprehensive guide for developers integrating OmeoneChain's decentralized recommendation and governance system into their applications.

## Quick Start

### 1. Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/OmeoneChain/omeonechain.git
cd omeonechain

# Setup and start the development environment
./setup-api.sh
./start-dev.sh

# Test the API (in another terminal)
./test-api.sh
```

The API server will be running at `http://localhost:3001`

### 2. Basic API Client Setup

#### JavaScript/Node.js Client
```javascript
class OmeoneChainClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3001/api/v1';
    this.apiKey = options.apiKey; // For future authentication
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data.data;
  }

  // Governance methods
  governance = {
    getProposals: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/governance/proposals?${params}`);
    },
    
    createProposal: (proposal) => {
      return this.request('/governance/proposals', {
        method: 'POST',
        body: proposal
      });
    },
    
    vote: (proposalId, vote, weight) => {
      return this.request(`/governance/proposals/${proposalId}/vote`, {
        method: 'POST',
        body: { vote, weight }
      });
    },
    
    getStake: () => {
      return this.request('/governance/stake');
    },
    
    stake: (amount, duration) => {
      return this.request('/governance/stake', {
        method: 'POST',
        body: { amount, duration }
      });
    }
  };

  // User methods
  users = {
    getProfile: () => {
      return this.request('/users/profile');
    },
    
    updateProfile: (updates) => {
      return this.request('/users/profile', {
        method: 'PUT',
        body: updates
      });
    },
    
    getUser: (userId) => {
      return this.request(`/users/${userId}`);
    },
    
    follow: (userId) => {
      return this.request(`/users/${userId}/follow`, {
        method: 'POST'
      });
    },
    
    getReputation: (userId) => {
      return this.request(`/users/${userId}/reputation`);
    }
  };

  // Recommendation methods
  recommendations = {
    list: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return this.request(`/recommendations?${params}`);
    },
    
    create: (recommendation) => {
      return this.request('/recommendations', {
        method: 'POST',
        body: recommendation
      });
    },
    
    get: (recommendationId) => {
      return this.request(`/recommendations/${recommendationId}`);
    },
    
    vote: (recommendationId, vote) => {
      return this.request(`/recommendations/${recommendationId}/vote`, {
        method: 'POST',
        body: { vote }
      });
    }
  };

  // Token methods
  tokens = {
    getBalance: () => {
      return this.request('/tokens/balance');
    },
    
    transfer: (recipientId, amount, note) => {
      return this.request('/tokens/transfer', {
        method: 'POST',
        body: { recipientId, amount, note }
      });
    },
    
    getRewards: () => {
      return this.request('/tokens/rewards');
    }
  };
}

// Initialize client
const omeone = new OmeoneChainClient({
  baseURL: 'http://localhost:3001/api/v1'
});
```

### 3. Basic Usage Examples

```javascript
// Get governance proposals
const proposals = await omeone.governance.getProposals({ 
  status: 'active' 
});
console.log(`Found ${proposals.total} active proposals`);

// Check user's trust score
const profile = await omeone.users.getProfile();
console.log(`Your trust score: ${profile.trustScore}/10`);

// Get nearby recommendations
const recs = await omeone.recommendations.list({
  location: '40.7128,-74.0060,5', // NYC, 5km radius
  minTrustScore: 5.0
});
console.log(`Found ${recs.total} trusted recommendations nearby`);
```

---

## Integration Patterns

### 1. Trust Score Display Widget

#### React Component
```jsx
import { useState, useEffect } from 'react';

function TrustScoreWidget({ userId, showDetails = false }) {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrustScore() {
      try {
        const reputation = await omeone.users.getReputation(userId);
        setTrustData(reputation);
      } catch (error) {
        console.error('Failed to fetch trust score:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrustScore();
  }, [userId]);

  if (loading) return <div className="trust-loading">Loading...</div>;
  
  if (!trustData) return <div className="trust-error">Unable to load trust score</div>;

  const { trustScore, reputation, level } = trustData;
  const scoreColor = trustScore >= 8 ? 'green' : trustScore >= 6 ? 'orange' : 'red';

  return (
    <div className="trust-score-widget">
      <div className={`trust-score trust-${scoreColor}`}>
        <span className="score">{trustScore.toFixed(1)}</span>
        <span className="max">/10</span>
      </div>
      {showDetails && (
        <div className="trust-details">
          <div className="level">{level}</div>
          <div className="reputation">{reputation} reputation</div>
        </div>
      )}
    </div>
  );
}

// Usage
<TrustScoreWidget userId="user_123" showDetails={true} />
```

#### CSS Styling
```css
.trust-score-widget {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.trust-score {
  display: flex;
  align-items: baseline;
  font-weight: bold;
}

.trust-score.trust-green { color: #22c55e; }
.trust-score.trust-orange { color: #f97316; }
.trust-score.trust-red { color: #ef4444; }

.trust-details {
  font-size: 0.875rem;
  color: #6b7280;
}
```

### 2. Governance Dashboard Integration

```jsx
function GovernanceDashboard() {
  const [proposals, setProposals] = useState([]);
  const [userStake, setUserStake] = useState(null);
  const [voting, setVoting] = useState({});

  useEffect(() => {
    async function loadGovernanceData() {
      try {
        const [proposalsData, stakeData] = await Promise.all([
          omeone.governance.getProposals({ status: 'active' }),
          omeone.governance.getStake()
        ]);
        
        setProposals(proposalsData.proposals);
        setUserStake(stakeData);
      } catch (error) {
        console.error('Failed to load governance data:', error);
      }
    }

    loadGovernanceData();
  }, []);

  const handleVote = async (proposalId, vote) => {
    setVoting(prev => ({ ...prev, [proposalId]: true }));
    
    try {
      await omeone.governance.vote(proposalId, vote, userStake?.votingPower || 1);
      
      // Refresh proposals
      const updated = await omeone.governance.getProposals({ status: 'active' });
      setProposals(updated.proposals);
      
      alert(`Vote "${vote}" recorded successfully!`);
    } catch (error) {
      alert(`Voting failed: ${error.message}`);
    } finally {
      setVoting(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  return (
    <div className="governance-dashboard">
      <div className="stake-info">
        <h3>Your Governance Status</h3>
        {userStake ? (
          <div>
            <p>Staked: {userStake.totalStaked} TOK ({userStake.tier})</p>
            <p>Voting Power: {userStake.votingPower}x</p>
          </div>
        ) : (
          <p>Connect wallet to participate in governance</p>
        )}
      </div>

      <div className="proposals">
        <h3>Active Proposals ({proposals.length})</h3>
        {proposals.map(proposal => (
          <div key={proposal.id} className="proposal-card">
            <h4>{proposal.title}</h4>
            <p>{proposal.description}</p>
            
            <div className="voting-stats">
              <span>For: {proposal.votesFor}</span>
              <span>Against: {proposal.votesAgainst}</span>
              <span>Ends: {new Date(proposal.votingEnds).toLocaleDateString()}</span>
            </div>
            
            <div className="voting-buttons">
              <button 
                onClick={() => handleVote(proposal.id, 'yes')}
                disabled={voting[proposal.id]}
              >
                Vote Yes
              </button>
              <button 
                onClick={() => handleVote(proposal.id, 'no')}
                disabled={voting[proposal.id]}
              >
                Vote No
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Recommendation Feed Integration

```jsx
function RecommendationFeed({ location, category }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minTrustScore: 5.0,
    sortBy: 'trust_score'
  });

  useEffect(() => {
    async function loadRecommendations() {
      setLoading(true);
      try {
        const params = {
          ...filters,
          ...(location && { location: `${location.lat},${location.lng},10` }),
          ...(category && { category })
        };
        
        const data = await omeone.recommendations.list(params);
        setRecommendations(data.recommendations);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendations();
  }, [location, category, filters]);

  const handleVote = async (recommendationId, vote) => {
    try {
      await omeone.recommendations.vote(recommendationId, vote);
      
      // Update the local state to reflect the vote
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { 
                ...rec, 
                votes: {
                  ...rec.votes,
                  [vote === 'up' ? 'upvotes' : 'downvotes']: 
                    rec.votes[vote === 'up' ? 'upvotes' : 'downvotes'] + 1
                }
              }
            : rec
        )
      );
    } catch (error) {
      alert(`Voting failed: ${error.message}`);
    }
  };

  if (loading) return <div>Loading recommendations...</div>;

  return (
    <div className="recommendation-feed">
      <div className="filters">
        <label>
          Min Trust Score:
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.5"
            value={filters.minTrustScore}
            onChange={(e) => setFilters(prev => ({
              ...prev, 
              minTrustScore: parseFloat(e.target.value)
            }))}
          />
          {filters.minTrustScore}
        </label>
        
        <select 
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({
            ...prev, 
            sortBy: e.target.value
          }))}
        >
          <option value="trust_score">Sort by Trust Score</option>
          <option value="recent">Sort by Recent</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      <div className="recommendations">
        {recommendations.map(rec => (
          <div key={rec.id} className="recommendation-card">
            <div className="rec-header">
              <h4>{rec.title}</h4>
              <TrustScoreWidget userId={rec.author.id} />
            </div>
            
            <div className="rec-content">
              <p>{rec.content}</p>
              <div className="rec-meta">
                <span>By: {rec.author.username}</span>
                <span>Rating: {rec.rating}/5</span>
                <span>Trust: {rec.trustScore}/10</span>
              </div>
            </div>
            
            <div className="rec-actions">
              <button onClick={() => handleVote(rec.id, 'up')}>
                👍 {rec.votes.upvotes}
              </button>
              <button onClick={() => handleVote(rec.id, 'down')}>
                👎 {rec.votes.downvotes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Advanced Integration Scenarios

### 1. Service Provider Integration

For restaurants, hotels, and other businesses wanting to integrate OmeoneChain recommendations:

```javascript
class ServiceProviderIntegration {
  constructor(serviceId, omeoneClient) {
    this.serviceId = serviceId;
    this.omeone = omeoneClient;
  }

  async getServiceRecommendations() {
    const recommendations = await this.omeone.recommendations.list({
      serviceId: this.serviceId,
      sortBy: 'trust_score'
    });
    
    return recommendations.recommendations;
  }

  async getServiceStats() {
    const service = await this.omeone.services.get(this.serviceId);
    const recommendations = await this.getServiceRecommendations();
    
    return {
      totalRecommendations: recommendations.length,
      averageTrustScore: this.calculateAverageTrustScore(recommendations),
      recentRecommendations: recommendations.slice(0, 5),
      topReviewers: this.getTopReviewers(recommendations)
    };
  }

  calculateAverageTrustScore(recommendations) {
    if (recommendations.length === 0) return 0;
    
    const sum = recommendations.reduce((acc, rec) => acc + rec.trustScore, 0);
    return (sum / recommendations.length).toFixed(1);
  }

  getTopReviewers(recommendations) {
    const reviewers = {};
    
    recommendations.forEach(rec => {
      const author = rec.author;
      if (!reviewers[author.id]) {
        reviewers[author.id] = {
          ...author,
          recommendationCount: 0,
          avgTrustScore: 0
        };
      }
      reviewers[author.id].recommendationCount++;
    });
    
    return Object.values(reviewers)
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 5);
  }

  // Widget for embedding in service provider websites
  generateEmbedCode() {
    return `
      <div id="omeone-recommendations-${this.serviceId}"></div>
      <script>
        (function() {
          const script = document.createElement('script');
          script.src = 'https://api.omeonechain.com/embed.js';
          script.onload = function() {
            OmeoneEmbed.render('${this.serviceId}', {
              container: 'omeone-recommendations-${this.serviceId}',
              theme: 'light',
              maxRecommendations: 5
            });
          };
          document.head.appendChild(script);
        })();
      </script>
    `;
  }
}

// Usage
const provider = new ServiceProviderIntegration('restaurant_123', omeone);
const stats = await provider.getServiceStats();
console.log(`Average trust score: ${stats.averageTrustScore}/10`);
```

### 2. Social Platform Integration

For integrating trust scores into existing social networks:

```javascript
class SocialPlatformIntegration {
  constructor(omeoneClient) {
    this.omeone = omeoneClient;
  }

  // Add trust scores to user profiles
  async enhanceUserProfiles(userIds) {
    const enhancedProfiles = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const reputation = await this.omeone.users.getReputation(userId);
          return {
            userId,
            trustScore: reputation.trustScore,
            level: reputation.level,
            specializations: reputation.specializations
          };
        } catch (error) {
          return { userId, trustScore: null, error: error.message };
        }
      })
    );

    return enhancedProfiles;
  }

  // Filter content by trust scores
  async filterContentByTrust(contentList, minTrustScore = 5.0) {
    const authorIds = [...new Set(contentList.map(content => content.authorId))];
    const trustScores = await this.enhanceUserProfiles(authorIds);
    
    const trustMap = trustScores.reduce((acc, user) => {
      acc[user.userId] = user.trustScore;
      return acc;
    }, {});

    return contentList.filter(content => {
      const authorTrust = trustMap[content.authorId];
      return authorTrust && authorTrust >= minTrustScore;
    });
  }

  // Create trust-weighted feeds
  async createTrustWeightedFeed(userId, contentList) {
    const userProfile = await this.omeone.users.getProfile();
    const following = userProfile.following || [];
    
    // Get trust scores for all authors
    const authorIds = [...new Set(contentList.map(c => c.authorId))];
    const trustScores = await this.enhanceUserProfiles(authorIds);
    
    const trustMap = trustScores.reduce((acc, user) => {
      acc[user.userId] = user.trustScore;
      return acc;
    }, {});

    // Weight content by author trust and social connection
    return contentList
      .map(content => ({
        ...content,
        trustScore: trustMap[content.authorId] || 0,
        socialWeight: following.includes(content.authorId) ? 1.5 : 1.0
      }))
      .sort((a, b) => {
        const aScore = a.trustScore * a.socialWeight;
        const bScore = b.trustScore * b.socialWeight;
        return bScore - aScore;
      });
  }
}
```

### 3. Mobile App Integration (React Native)

```javascript
// OmeoneChain React Native SDK
import AsyncStorage from '@react-native-async-storage/async-storage';

class OmeoneChainMobile extends OmeoneChainClient {
  constructor(options = {}) {
    super(options);
    this.initializeAuth();
  }

  async initializeAuth() {
    const token = await AsyncStorage.getItem('omeone_auth_token');
    if (token) {
      this.apiKey = token;
    }
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: credentials
    });
    
    await AsyncStorage.setItem('omeone_auth_token', response.token);
    this.apiKey = response.token;
    
    return response;
  }

  async logout() {
    await AsyncStorage.removeItem('omeone_auth_token');
    this.apiKey = null;
  }

  // Location-aware recommendations
  async getNearbyRecommendations(coords, radius = 5) {
    const location = `${coords.latitude},${coords.longitude},${radius}`;
    return await this.recommendations.list({
      location,
      sortBy: 'trust_score',
      limit: 20
    });
  }

  // Push notification registration
  async registerForNotifications(pushToken) {
    return await this.request('/notifications/register', {
      method: 'POST',
      body: { pushToken, platform: Platform.OS }
    });
  }
}

// React Native component example
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Geolocation from '@react-native-geolocation-service';

function NearbyRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const omeone = new OmeoneChainMobile();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      async (position) => {
        const coords = position.coords;
        setLocation(coords);
        
        try {
          const recs = await omeone.getNearbyRecommendations(coords);
          setRecommendations(recs.recommendations);
        } catch (error) {
          console.error('Failed to load recommendations:', error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const renderRecommendation = ({ item }) => (
    <TouchableOpacity style={styles.recommendationCard}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.meta}>
        <Text>Trust: {item.trustScore}/10</Text>
        <Text>By: {item.author.username}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Finding recommendations near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Nearby Recommendations ({recommendations.length})
      </Text>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={renderRecommendation}
        refreshing={loading}
        onRefresh={getCurrentLocation}
      />
    </View>
  );
}
```

---

## Error Handling Best Practices

### Comprehensive Error Handling
```javascript
class ErrorHandler {
  static handle(error, context) {
    console.error(`OmeoneChain API Error in ${context}:`, error);

    switch (error.code) {
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error);
      case 'UNAUTHORIZED':
        return this.handleAuthError(error);
      case 'RATE_LIMITED':
        return this.handleRateLimit(error);
      case 'INSUFFICIENT_STAKE':
        return this.handleInsufficientStake(error);
      case 'VOTING_ENDED':
        return this.handleVotingEnded(error);
      default:
        return this.handleGenericError(error);
    }
  }

  static handleValidationError(error) {
    const field = error.details?.field;
    const issue = error.details?.issue;
    return `Invalid ${field}: ${issue}`;
  }

  static handleAuthError(error) {
    // Redirect to login or show auth modal
    return 'Please sign in to continue';
  }

  static handleRateLimit(error) {
    const resetTime = error.details?.resetTime;
    return `Too many requests. Try again in ${resetTime} seconds`;
  }

  static handleInsufficientStake(error) {
    const required = error.details?.requiredStake;
    return `You need to stake at least ${required} TOK to perform this action`;
  }

  static handleVotingEnded(error) {
    return 'Voting period for this proposal has ended';
  }

  static handleGenericError(error) {
    return 'An unexpected error occurred. Please try again';
  }
}

// Usage in components
try {
  await omeone.governance.vote(proposalId, 'yes');
} catch (error) {
  const message = ErrorHandler.handle(error, 'governance.vote');
  setErrorMessage(message);
}
```

### Retry Logic with Exponential Backoff
```javascript
class RetryableClient extends OmeoneChainClient {
  async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(endpoint, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.code === 'VALIDATION_ERROR' || error.code === 'UNAUTHORIZED') {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}
```

---

## Testing Your Integration

### Test Data Setup
```javascript
// Create test data for development
async function setupTestData() {
  const testUsers = [
    { id: 'user_alice', username: 'alice_foodie', trustScore: 8.5 },
    { id: 'user_bob', username: 'bob_explorer', trustScore: 7.2 },
    { id: 'user_carol', username: 'carol_critic', trustScore: 9.1 }
  ];

  const testRecommendations = [
    {
      title: 'Amazing Pizza Place',
      content: 'Best margherita in the city!',
      rating: 5,
      serviceId: 'pizza_123',
      authorId: 'user_alice'
    },
    {
      title: 'Great Coffee Shop',
      content: 'Perfect for remote work',
      rating: 4,
      serviceId: 'coffee_456',
      authorId: 'user_bob'
    }
  ];

  // Create test data
  for (const rec of testRecommendations) {
    await omeone.recommendations.create(rec);
  }

  console.log('Test data created successfully');
}
```

### Integration Test Suite
```javascript
describe('OmeoneChain Integration Tests', () => {
  let client;

  beforeAll(() => {
    client = new OmeoneChainClient({
      baseURL: 'http://localhost:3001/api/v1'
    });
  });

  test('should fetch active governance proposals', async () => {
    const proposals = await client.governance.getProposals({ 
      status: 'active' 
    });
    
    expect(proposals).toHaveProperty('proposals');
    expect(proposals).toHaveProperty('total');
    expect(Array.isArray(proposals.proposals)).toBe(true);
  });

  test('should create and vote on proposal', async () => {
    const proposal = {
      title: 'Test Proposal',
      description: 'This is a test proposal for integration testing',
      type: 'parameter_change',
      data: { parameter: 'testParam', value: 'testValue' }
    };

    const created = await client.governance.createProposal(proposal);
    expect(created).toHaveProperty('id');

    const vote = await client.governance.vote(created.id, 'yes', 1);
    expect(vote.vote).toBe('yes');
  });

  test('should handle API errors gracefully', async () => {
    try {
      await client.governance.getProposals({ status: 'invalid_status' });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('validation');
    }
  });
});
```

---

## Performance Optimization

### Caching Strategy
```javascript
class CachedOmeoneClient extends OmeoneChainClient {
  constructor(options = {}) {
    super(options);
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes
  }

  async requestWithCache(endpoint, options = {}, cacheKey = null) {
    const key = cacheKey || `${options.method || 'GET'}:${endpoint}`;
    
    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const data = await this.request(endpoint, options);
    
    // Cache successful GET responses
    if (!options.method || options.method === 'GET') {
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
    }

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Batch Operations
```javascript
// Batch multiple API calls efficiently
async function batchUserProfiles(userIds) {
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    batches.push(
      Promise.all(
        batch.map(id => 
          omeone.users.getReputation(id).catch(err => ({ id, error: err.message }))
        )
      )
    );
  }

  const results = await Promise.all(batches);
  return results.flat();
}
```

---

## Security Considerations

### Input Validation
```javascript
function validateProposal(proposal) {
  const errors = [];

  if (!proposal.title || proposal.title.length < 5 || proposal.title.length > 100) {
    errors.push('Title must be between 5 and 100 characters');
  }

  if (!proposal.description || proposal.description.length < 50) {
    errors.push('Description must be at least 50 characters');
  }

  if (!['parameter_change', 'treasury', 'upgrade'].includes(proposal.type)) {
    errors.push('Invalid proposal type');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

### Rate Limiting Compliance
```javascript
class RateLimitedClient extends OmeoneChainClient {
  constructor(options = {}) {
    super(options);
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestsPerMinute = options.requestsPerMinute || 100;
    this.requestTimes = [];
  }

  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      
      // Remove requests older than 1 minute
      this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
      
      // Check if we can make another request
      if (this.requestTimes.length >= this.requestsPerMinute) {
        const oldestRequest = Math.min(...this.requestTimes);
        const waitTime = 60000 - (now - oldestRequest);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      const { endpoint, options, resolve, reject } = this.requestQueue.shift();
      this.requestTimes.push(now);

      try {
        const result = await super.request(endpoint, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }
}
```

---

## Getting Help

### Community Resources
- **GitHub Issues**: [https://github.com/OmeoneChain/omeonechain/issues](https://github.com/OmeoneChain/omeonechain/issues)
- **Developer Documentation**: [https://docs.omeonechain.com](https://docs.omeonechain.com)
- **API Reference**: [endpoints.md](endpoints.md)

### Common Issues
1. **Connection Errors**: Ensure the API server is running on port 3001
2. **CORS Issues**: Check that your domain is in the CORS whitelist
3. **Rate Limiting**: Implement proper request throttling
4. **Authentication**: JWT authentication will be required in Phase 4

### Support
For integration support, please:
1. Check the existing documentation
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Join the developer community discussions

---

*This integration guide covers the current Phase 3 API. Additional features and authentication will be added in Phase 4 with blockchain integration.*