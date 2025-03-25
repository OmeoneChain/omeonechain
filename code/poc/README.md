# OmeoneChain Proof of Concept

This repository contains a simplified proof of concept (POC) implementation for OmeoneChain, a decentralized recommendation platform. This POC demonstrates the core functionality of creating, retrieving, and interacting with recommendations in a centralized way before implementing the full decentralized architecture.

## Components

1. **Core Recommendation Implementation** (`recommendation-poc.js`): A JavaScript module demonstrating the data structures and basic logic of OmeoneChain's recommendation system.

2. **API Server** (`server.js`): A simple Express.js server implementing RESTful endpoints for recommendation management.

3. **Frontend Demo** (`index.html`): A basic web interface to visualize and interact with recommendations.

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm or yarn

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/omeonechain-poc.git
   cd omeonechain-poc
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the API server:
   ```bash
   npm start
   ```

4. Open the frontend demo:
   - Simply open `index.html` in your web browser, or
   - Serve it with a static file server:
     ```bash
     npx serve
     ```

## API Endpoints

The API server implements the following endpoints:

### Recommendations

- `GET /api/v1/recommendations` - List all recommendations (with optional filtering)
- `GET /api/v1/recommendations/:id` - Get a specific recommendation
- `POST /api/v1/recommendations` - Create a new recommendation
- `POST /api/v1/recommendations/:id/upvote` - Upvote a recommendation
- `POST /api/v1/recommendations/:id/downvote` - Downvote a recommendation

### Services

- `GET /api/v1/services` - List all services
- `GET /api/v1/services/:id` - Get a specific service

### Users

- `GET /api/v1/users/:id` - Get a user profile

## Example API Usage

### Creating a Recommendation

```bash
curl -X POST http://localhost:3000/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "author": "JohnDoe",
    "serviceName": "Coffee Haven",
    "category": "cafe",
    "rating": 5,
    "title": "Best coffee in town",
    "body": "The espresso is exceptional and the atmosphere is cozy.",
    "tags": ["coffee", "espresso", "relaxing"]
  }'
```

### Getting All Recommendations

```bash
curl http://localhost:3000/api/v1/recommendations
```

### Filtering Recommendations by Category

```bash
curl http://localhost:3000/api/v1/recommendations?category=restaurant
```

## Differences from Final Implementation

This POC demonstrates the core functionality but differs from the final implementation in several ways:

1. **Centralized vs. Decentralized**: This POC uses a centralized database instead of a distributed ledger (IOTA Tangle).

2. **Data Persistence**: Data is stored in-memory and will be lost when the server restarts.

3. **Authentication**: No cryptographic signing or verification is implemented.

4. **Token Economy**: The token reward system is not implemented.

5. **Scalability**: The POC is not optimized for scale.

## Next Steps

1. **IOTA Integration**: Implement interaction with the IOTA Tangle for storing recommendation metadata.

2. **IPFS Integration**: Add distributed storage for recommendation content.

3. **Token Implementation**: Develop the token economy and reward system.

4. **Identity System**: Implement a decentralized identity solution for users.

5. **Enhanced UI**: Develop a more sophisticated user interface.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
