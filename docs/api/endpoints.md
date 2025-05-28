# OmeoneChain API Endpoints Reference

## Base Information
- **Base URL:** `http://localhost:3001/api/v1`
- **Authentication:** Bearer token (JWT) - *Coming in Phase 4*
- **Rate Limiting:** 100 requests/minute per IP
- **Content-Type:** `application/json`
- **API Version:** v1

## Quick Reference

### 🏛️ Governance Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/governance/proposals` | List all governance proposals | No |
| POST | `/governance/proposals` | Create new governance proposal | Yes |
| GET | `/governance/proposals/:id` | Get specific proposal details | No |
| POST | `/governance/proposals/:id/vote` | Vote on a proposal | Yes |
| GET | `/governance/stake` | Get current user's staking info | Yes |
| POST | `/governance/stake` | Stake tokens for governance | Yes |

### 👥 User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get current user's profile | Yes |
| PUT | `/users/profile` | Update user profile | Yes |
| GET | `/users/:id` | Get specific user's public profile | No |
| POST | `/users/:id/follow` | Follow another user | Yes |
| DELETE | `/users/:id/follow` | Unfollow a user | Yes |
| GET | `/users/:id/reputation` | Get user's reputation details | No |

### ⭐ Recommendations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/recommendations` | List recommendations with filters | No |
| POST | `/recommendations` | Create new recommendation | Yes |
| GET | `/recommendations/:id` | Get specific recommendation | No |
| POST | `/recommendations/:id/vote` | Vote on recommendation | Yes |

### 🪙 Token Operations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tokens/balance` | Get current user's token balance | Yes |
| POST | `/tokens/transfer` | Transfer tokens to another user | Yes |
| GET | `/tokens/rewards` | Get reward history and statistics | Yes |

### 🏢 Services
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/services` | List services with filtering | No |
| POST | `/services` | Register new service | Yes |
| GET | `/services/:id` | Get service details | No |
| PUT | `/services/:id` | Update service information | Yes |

### 🔧 Developer Tools
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/developer/stats` | Get platform statistics | No |
| GET | `/developer/health` | API health check | No |

---

## Detailed Endpoint Documentation

### 🏛️ Governance Endpoints

#### GET /governance/proposals
List all governance proposals with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by proposal status (`active`, `passed`, `rejected`, `pending`)
- `type` (optional): Filter by proposal type (`parameter_change`, `treasury`, `upgrade`)
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "proposals": [
      {
        "id": "prop_123",
        "title": "Increase Base Reward Rate",
        "description": "Proposal to increase base reward from 1 TOK to 1.5 TOK per validated recommendation",
        "type": "parameter_change",
        "status": "active",
        "author": "user_456",
        "votesFor": 1250,
        "votesAgainst": 320,
        "totalStake": 15000,
        "votingEnds": "2025-06-15T18:00:00Z",
        "createdAt": "2025-05-20T10:30:00Z"
      }
    ],
    "total": 12,
    "hasMore": false
  }
}
```

#### POST /governance/proposals
Create a new governance proposal.

**Request Body:**
```json
{
  "title": "Proposal Title (required, 5-100 chars)",
  "description": "Detailed proposal description (required, 50-2000 chars)",
  "type": "parameter_change",
  "data": {
    "parameter": "baseReward",
    "currentValue": 1,
    "proposedValue": 1.5,
    "reasoning": "Increase participation incentives"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prop_789",
    "title": "Proposal Title",
    "status": "active",
    "votingEnds": "2025-06-15T18:00:00Z",
    "requiredStake": 100,
    "message": "Proposal created successfully"
  }
}
```

#### POST /governance/proposals/:id/vote
Vote on a governance proposal.

**URL Parameters:**
- `id`: Proposal ID (required)

**Request Body:**
```json
{
  "vote": "yes",
  "weight": 150
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposalId": "prop_123",
    "vote": "yes", 
    "weight": 150,
    "newTotals": {
      "votesFor": 1400,
      "votesAgainst": 320
    },
    "message": "Vote recorded successfully"
  }
}
```

#### GET /governance/stake
Get current user's staking information.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStaked": 500,
    "tier": "Curator",
    "stakingRewards": 23.5,
    "votingPower": 1.3,
    "lockedUntil": "2025-08-20T00:00:00Z",
    "availableToStake": 750
  }
}
```

#### POST /governance/stake
Stake tokens for governance participation.

**Request Body:**
```json
{
  "amount": 250,
  "duration": 90
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amountStaked": 250,
    "newTotalStake": 750,
    "newTier": "Curator",
    "votingPower": 1.5,
    "lockedUntil": "2025-08-20T00:00:00Z"
  }
}
```

---

### 👥 User Management Endpoints

#### GET /users/profile
Get the current authenticated user's profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "alice_reviewer",
    "trustScore": 8.6,
    "reputation": 1250,
    "level": "Expert",
    "specializations": ["restaurants", "coffee"],
    "stats": {
      "recommendationsCount": 87,
      "upvotesReceived": 456,
      "followersCount": 23,
      "followingCount": 12
    },
    "joinedAt": "2025-03-15T10:00:00Z"
  }
}
```

#### PUT /users/profile
Update user profile information.

**Request Body:**
```json
{
  "username": "new_username",
  "bio": "Food enthusiast and travel blogger",
  "specializations": ["restaurants", "travel", "coffee"],
  "location": {
    "city": "New York",
    "country": "USA"
  }
}
```

#### POST /users/:id/follow
Follow another user.

**URL Parameters:**
- `id`: User ID to follow

**Response:**
```json
{
  "success": true,
  "data": {
    "following": true,
    "followerId": "user_123",
    "followingId": "user_456",
    "message": "Successfully following user"
  }
}
```

---

### ⭐ Recommendation Endpoints

#### GET /recommendations
List recommendations with filtering and search.

**Query Parameters:**
- `category` (optional): Filter by category (`restaurant`, `hotel`, `service`)
- `location` (optional): Filter by location (format: `lat,lng,radius_km`)
- `minTrustScore` (optional): Minimum trust score (0-10)
- `sortBy` (optional): Sort order (`trust_score`, `recent`, `rating`)
- `limit` (optional): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_789",
        "title": "Amazing Italian Restaurant",
        "content": "Best pasta in the neighborhood, authentic flavors",
        "rating": 5,
        "trustScore": 8.4,
        "author": {
          "id": "user_456",
          "username": "foodie_expert",
          "trustScore": 9.1
        },
        "service": {
          "id": "rest_123",
          "name": "Mario's Trattoria",
          "category": "restaurant"
        },
        "location": {
          "lat": 40.7128,
          "lng": -74.0060,
          "address": "123 Main St, New York, NY"
        },
        "votes": {
          "upvotes": 23,
          "downvotes": 2
        },
        "createdAt": "2025-05-25T14:30:00Z"
      }
    ],
    "total": 156,
    "hasMore": true
  }
}
```

#### POST /recommendations
Create a new recommendation.

**Request Body:**
```json
{
  "serviceId": "rest_123",
  "title": "Great dinner experience",
  "content": "Excellent service and amazing food quality. The pasta was perfectly cooked.",
  "rating": 5,
  "tags": ["pasta", "italian", "romantic"],
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "media": [
    {
      "type": "image",
      "url": "/uploads/photo123.jpg",
      "caption": "Delicious carbonara"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rec_890",
    "title": "Great dinner experience",
    "trustScore": 0.0,
    "status": "pending_validation",
    "potentialReward": 1.0,
    "message": "Recommendation created. Rewards unlock at Trust Score ≥ 0.25"
  }
}
```

---

### 🪙 Token Endpoints

#### GET /tokens/balance
Get current user's token balance and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1250,
    "staked": 500,
    "available": 750,
    "pendingRewards": 23.5,
    "totalEarned": 890,
    "recentTransactions": [
      {
        "id": "tx_456",
        "type": "reward",
        "amount": 2.5,
        "source": "recommendation_vote",
        "timestamp": "2025-05-27T09:15:00Z"
      }
    ]
  }
}
```

#### POST /tokens/transfer
Transfer tokens to another user.

**Request Body:**
```json
{
  "recipientId": "user_789",
  "amount": 50,
  "note": "Thanks for the great restaurant recommendation!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_567",
    "amount": 50,
    "recipient": "user_789",
    "newBalance": 1200,
    "message": "Transfer completed successfully"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "title",
      "issue": "Title must be between 5 and 100 characters"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

- **Default Limit:** 100 requests per minute per IP address
- **Authenticated Users:** 200 requests per minute
- **Headers Included:**
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Webhooks (Coming in Phase 4)

Register webhooks to receive real-time updates:

- `proposal.created`: New governance proposal
- `proposal.voted`: Vote cast on proposal
- `recommendation.created`: New recommendation
- `user.followed`: User followed/unfollowed
- `tokens.transferred`: Token transfer completed

---

*For integration examples and practical guides, see [Integration Guide](integration-guide.md)*