export declare const restaurantSchema = "\nCREATE TABLE restaurants (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  address TEXT NOT NULL,\n  city VARCHAR(100) NOT NULL,\n  country VARCHAR(100) NOT NULL,\n  \n  -- Location data\n  latitude DECIMAL(10, 8) NOT NULL,\n  longitude DECIMAL(11, 8) NOT NULL,\n  \n  -- Restaurant details\n  cuisine_type VARCHAR(100),\n  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4), -- 1=$ to 4=$$$$\n  phone VARCHAR(50),\n  website TEXT,\n  hours JSONB,\n  \n  -- User-generated metadata\n  added_by VARCHAR(255) NOT NULL, -- wallet address\n  verified BOOLEAN DEFAULT FALSE,\n  verification_count INTEGER DEFAULT 0,\n  \n  -- Trust Score aggregation\n  total_recommendations INTEGER DEFAULT 0,\n  avg_trust_score DECIMAL(3,2) DEFAULT 0,\n  last_recommendation_date TIMESTAMP,\n  \n  -- Timestamps\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n\n-- Index for location-based queries\nCREATE INDEX idx_restaurants_location ON restaurants USING GIST (\n  point(longitude, latitude)\n);\n\n-- Index for city-based searches\nCREATE INDEX idx_restaurants_city ON restaurants (city, cuisine_type);\n\n-- Index for Trust Score ordering\nCREATE INDEX idx_restaurants_trust_score ON restaurants (avg_trust_score DESC);\n";
export interface Restaurant {
    id: number;
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
    hours?: {
        [day: string]: {
            open: string;
            close: string;
        } | 'closed';
    };
    addedBy: string;
    verified: boolean;
    verificationCount: number;
    totalRecommendations: number;
    avgTrustScore: number;
    lastRecommendationDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
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
export interface RestaurantFilters {
    city?: string;
    cuisineType?: string;
    priceRange?: number[];
    minTrustScore?: number;
    sortBy?: 'trustScore' | 'distance' | 'recent' | 'recommendations';
    sortOrder?: 'asc' | 'desc';
    centerLat?: number;
    centerLng?: number;
    radiusKm?: number;
}
export interface RestaurantSearchResult {
    restaurant: Restaurant;
    distanceKm?: number;
    trustScoreForUser?: number;
    friendRecommendations?: number;
    totalUserRecommendations?: number;
}
export interface RestaurantSearchResponse {
    results: RestaurantSearchResult[];
    total: number;
    page: number;
    limit: number;
    filters: RestaurantFilters;
}
export interface RestaurantDetailResponse extends Restaurant {
    recommendations: Array<{
        id: string;
        title: string;
        author: string;
        trustScore: number;
        isFromFriend?: boolean;
        socialDistance?: number;
        createdAt: Date;
    }>;
    trustScoreBreakdown: {
        directFriends: number;
        friendsOfFriends: number;
        globalAverage: number;
        totalRecommendations: number;
        explanation: string;
    };
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
export declare class RestaurantService {
    createRestaurant(input: CreateRestaurantInput, addedBy: string): Promise<Restaurant>;
    searchRestaurants(filters: RestaurantFilters, userAddress?: string, page?: number, limit?: number): Promise<RestaurantSearchResponse>;
    getRestaurantDetail(id: number, userAddress?: string): Promise<RestaurantDetailResponse>;
    updateTrustScore(restaurantId: number): Promise<void>;
    verifyRestaurant(restaurantId: number, verifiedBy: string): Promise<void>;
}
export declare const CUISINE_TYPES: readonly ["American", "Asian", "Brazilian", "Chinese", "French", "Indian", "Italian", "Japanese", "Mexican", "Mediterranean", "Portuguese", "Thai", "Vietnamese", "International", "Fast Food", "Cafe", "Other"];
export declare const SUPPORTED_CITIES: readonly [{
    readonly name: "Brasília";
    readonly country: "Brazil";
}, {
    readonly name: "Lisbon";
    readonly country: "Portugal";
}, {
    readonly name: "São Paulo";
    readonly country: "Brazil";
}];
export type CuisineType = typeof CUISINE_TYPES[number];
export type SupportedCity = typeof SUPPORTED_CITIES[number];
