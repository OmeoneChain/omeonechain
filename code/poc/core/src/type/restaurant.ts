// Enhanced Restaurant Database Schema for User-Generated Content

// Database Schema (SQL)
export const restaurantSchema = `
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

// TypeScript Interface
export interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  
  // Location
  latitude: number;
  longitude: number;
  
  // Details
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
  hours?: {
    [day: string]: { open: string; close: string } | 'closed';
  };
  
  // User-generated data
  addedBy: string; // wallet address
  verified: boolean;
  verificationCount: number;
  
  // Trust Score data
  totalRecommendations: number;
  avgTrustScore: number;
  lastRecommendationDate?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Restaurant creation input
export interface CreateRestaurantInput {
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
}

// Restaurant search filters
export interface RestaurantFilters {
  city?: string;
  cuisineType?: string;
  priceRange?: number[];
  minTrustScore?: number;
  sortBy?: 'trustScore' | 'distance' | 'recent' | 'recommendations';
  sortOrder?: 'asc' | 'desc';
  
  // Location-based search
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
}

// Restaurant search result
export interface RestaurantSearchResult {
  restaurant: Restaurant;
  distanceKm?: number;
  trustScoreForUser?: number; // Personalized trust score for the requesting user
  friendRecommendations?: number; // How many friends recommended this
  totalUserRecommendations?: number; // Total recs from user's social graph
}

// API Response types
export interface RestaurantSearchResponse {
  results: RestaurantSearchResult[];
  total: number;
  page: number;
  limit: number;
  filters: RestaurantFilters;
}

export interface RestaurantDetailResponse extends Restaurant {
  // Enhanced data for restaurant detail pages
  recommendations: Array<{
    id: string;
    title: string;
    author: string;
    trustScore: number;
    isFromFriend?: boolean;
    socialDistance?: number; // 1 = direct friend, 2 = friend of friend
    createdAt: Date;
  }>;
  
  // Trust Score breakdown
  trustScoreBreakdown: {
    directFriends: number;
    friendsOfFriends: number;
    globalAverage: number;
    totalRecommendations: number;
    explanation: string;
  };
  
  // Social proof
  socialProof: {
    friendsWhoRecommend: Array<{
      address: string;
      displayName?: string;
      recommendationCount: number;
    }>;
    totalFriendsRecommended: number;
    mostRecentFriendRecommendation?: Date;
  };
}

// Database helper functions
export class RestaurantService {
  
  async createRestaurant(input: CreateRestaurantInput, addedBy: string): Promise<Restaurant> {
    // Implementation would:
    // 1. Validate input data
    // 2. Check for duplicates nearby (within 50m)
    // 3. Insert into database
    // 4. Return created restaurant
    throw new Error('Implementation needed');
  }
  
  async searchRestaurants(
    filters: RestaurantFilters, 
    userAddress?: string,
    page: number = 1, 
    limit: number = 20
  ): Promise<RestaurantSearchResponse> {
    // Implementation would:
    // 1. Build SQL query with filters
    // 2. Calculate personalized trust scores if user provided
    // 3. Order by specified sort criteria
    // 4. Return paginated results
    throw new Error('Implementation needed');
  }
  
  async getRestaurantDetail(id: number, userAddress?: string): Promise<RestaurantDetailResponse> {
    // Implementation would:
    // 1. Get restaurant basic info
    // 2. Get all recommendations for this restaurant
    // 3. Calculate personalized trust score breakdown
    // 4. Get social proof data
    // 5. Return comprehensive restaurant data
    throw new Error('Implementation needed');
  }
  
  async updateTrustScore(restaurantId: number): Promise<void> {
    // Implementation would:
    // 1. Recalculate average trust score from all recommendations
    // 2. Update restaurant record
    // 3. Update last_recommendation_date
    throw new Error('Implementation needed');
  }
  
  async verifyRestaurant(restaurantId: number, verifiedBy: string): Promise<void> {
    // Implementation would:
    // 1. Increment verification_count
    // 2. Set verified = true if threshold reached
    // 3. Track who verified it
    throw new Error('Implementation needed');
  }
}

// Cuisine types for dropdown
export const CUISINE_TYPES = [
  'American', 'Asian', 'Brazilian', 'Chinese', 'French', 'Indian', 
  'Italian', 'Japanese', 'Mexican', 'Mediterranean', 'Portuguese',
  'Thai', 'Vietnamese', 'International', 'Fast Food', 'Cafe', 'Other'
] as const;

// Cities for initial deployment
export const SUPPORTED_CITIES = [
  { name: 'Brasília', country: 'Brazil' },
  { name: 'Lisbon', country: 'Portugal' },
  { name: 'São Paulo', country: 'Brazil' }
] as const;

export type CuisineType = typeof CUISINE_TYPES[number];
export type SupportedCity = typeof SUPPORTED_CITIES[number];