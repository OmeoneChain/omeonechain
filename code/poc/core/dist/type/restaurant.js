"use strict";
// Enhanced Restaurant Database Schema for User-Generated Content
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CITIES = exports.CUISINE_TYPES = exports.RestaurantService = exports.restaurantSchema = void 0;
// Database Schema (SQL)
exports.restaurantSchema = `
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  
  -- Location data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Restaurant details
  cuisine_type VARCHAR(100),
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4), -- 1=$ to 4=$$$$
  phone VARCHAR(50),
  website TEXT,
  hours JSONB,
  
  -- User-generated metadata
  added_by VARCHAR(255) NOT NULL, -- wallet address
  verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  
  -- Trust Score aggregation
  total_recommendations INTEGER DEFAULT 0,
  avg_trust_score DECIMAL(3,2) DEFAULT 0,
  last_recommendation_date TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for location-based queries
CREATE INDEX idx_restaurants_location ON restaurants USING GIST (
  point(longitude, latitude)
);

-- Index for city-based searches
CREATE INDEX idx_restaurants_city ON restaurants (city, cuisine_type);

-- Index for Trust Score ordering
CREATE INDEX idx_restaurants_trust_score ON restaurants (avg_trust_score DESC);
`;
// Database helper functions
class RestaurantService {
    async createRestaurant(input, addedBy) {
        // Implementation would:
        // 1. Validate input data
        // 2. Check for duplicates nearby (within 50m)
        // 3. Insert into database
        // 4. Return created restaurant
        throw new Error('Implementation needed');
    }
    async searchRestaurants(filters, userAddress, page = 1, limit = 20) {
        // Implementation would:
        // 1. Build SQL query with filters
        // 2. Calculate personalized trust scores if user provided
        // 3. Order by specified sort criteria
        // 4. Return paginated results
        throw new Error('Implementation needed');
    }
    async getRestaurantDetail(id, userAddress) {
        // Implementation would:
        // 1. Get restaurant basic info
        // 2. Get all recommendations for this restaurant
        // 3. Calculate personalized trust score breakdown
        // 4. Get social proof data
        // 5. Return comprehensive restaurant data
        throw new Error('Implementation needed');
    }
    async updateTrustScore(restaurantId) {
        // Implementation would:
        // 1. Recalculate average trust score from all recommendations
        // 2. Update restaurant record
        // 3. Update last_recommendation_date
        throw new Error('Implementation needed');
    }
    async verifyRestaurant(restaurantId, verifiedBy) {
        // Implementation would:
        // 1. Increment verification_count
        // 2. Set verified = true if threshold reached
        // 3. Track who verified it
        throw new Error('Implementation needed');
    }
}
exports.RestaurantService = RestaurantService;
// Cuisine types for dropdown
exports.CUISINE_TYPES = [
    'American', 'Asian', 'Brazilian', 'Chinese', 'French', 'Indian',
    'Italian', 'Japanese', 'Mexican', 'Mediterranean', 'Portuguese',
    'Thai', 'Vietnamese', 'International', 'Fast Food', 'Cafe', 'Other'
];
// Cities for initial deployment
exports.SUPPORTED_CITIES = [
    { name: 'Brasília', country: 'Brazil' },
    { name: 'Lisbon', country: 'Portugal' },
    { name: 'São Paulo', country: 'Brazil' }
];
//# sourceMappingURL=restaurant.js.map