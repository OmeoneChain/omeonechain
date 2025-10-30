/**
 * Recommendation Data Structure
 * 
 * Represents a recommendation in the OmeoneChain/Zesto system
 * Updated for Trust Score 2.0 with dish-level ratings and contextual intelligence
 * Based on Technical Specifications A.2.1 + Trust Score 2.0 Enhancement
 */

export interface Location {
  /**
   * Latitude coordinate
   */
  latitude: number;
  
  /**
   * Longitude coordinate
   */
  longitude: number;
  
  /**
   * Optional human-readable address
   */
  address?: string;
}

export interface MediaItem {
  /**
   * Type of media ("image", "video", etc.)
   */
  type: string;
  
  /**
   * Reference to stored media on IPFS
   */
  ipfsHash: string;
  
  /**
   * Optional caption for the media
   */
  caption?: string;
}

export interface Content {
  /**
   * Title of the recommendation
   */
  title: string;
  
  /**
   * Main body text of the recommendation
   */
  body: string;
  
  /**
   * Array of media items attached to the recommendation
   */
  media: MediaItem[];
}

export interface TangleReference {
  /**
   * On-chain object ID
   */
  objectId: string;
  
  /**
   * Ledger commit height
   */
  commitNumber: number;
}

// ============================================
// TRUST SCORE 2.0 NEW TYPES
// ============================================

/**
 * Individual dish rating within a recommendation
 * Enables hyper-specific recommendations like "Their pasta is 9/10, skip dessert"
 */
export interface Dish {
  /**
   * Unique identifier for the dish rating
   */
  id: string;
  
  /**
   * Name of the dish (user-entered, may contain typos)
   */
  name: string;
  
  /**
   * Dish category (pasta, appetizer, dessert, etc.)
   */
  category?: string;
  
  /**
   * Rating on 0-10 scale (more granular than 1-5)
   */
  rating: number;
  
  /**
   * Optional notes about the dish
   */
  notes?: string;
  
  /**
   * Would the user order this again?
   */
  would_order_again: boolean;
  
  /**
   * Estimated price of the dish
   */
  estimated_price?: number;
  
  /**
   * Dietary attributes (vegetarian, vegan, gluten_free, etc.)
   */
  dietary_tags?: string[];
}

/**
 * Detailed restaurant aspect ratings
 * Goes beyond overall rating to capture specific dimensions
 */
export interface RestaurantAspects {
  /**
   * Atmosphere and decor quality (0-10)
   */
  ambiance: number;
  
  /**
   * Service quality and attentiveness (0-10)
   */
  service: number;
  
  /**
   * Price vs quality ratio (0-10)
   */
  value_for_money: number;
  
  /**
   * Noise level description
   */
  noise_level?: 'quiet' | 'moderate' | 'loud';
  
  /**
   * Wait time in minutes (if applicable)
   */
  wait_time_minutes?: number;
}

/**
 * Occasion types for contextual matching
 */
export type OccasionType = 
  | 'date_night'
  | 'family_dinner'
  | 'quick_lunch'
  | 'celebration'
  | 'business_lunch'
  | 'casual'
  | 'special_occasion';

/**
 * Meal type categories
 */
export type MealType = 
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'dinner'
  | 'late_night'
  | 'snack';

/**
 * Contextual factors about when/why recommendation was made
 * Enables smart defaults like "Perfect for Your Saturday Family Brunch"
 */
export interface ContextualFactors {
  /**
   * Social occasion or purpose of visit
   */
  occasion: OccasionType;
  
  /**
   * Number of people in the party
   */
  party_size: number;
  
  /**
   * When the visit occurred
   */
  time_of_visit?: string; // ISO8601 timestamp
  
  /**
   * Day of week (0=Sunday, 6=Saturday)
   */
  day_of_week?: number;
  
  /**
   * Type of meal
   */
  meal_type?: MealType;
  
  /**
   * Total amount spent
   */
  total_spent?: number;
  
  /**
   * How long the visit lasted (in minutes)
   */
  visit_duration_minutes?: number;
  
  /**
   * Weather conditions during visit
   */
  weather_condition?: string;
}

/**
 * Trust Score 2.0 calculation breakdown
 * Replaces simple social distance with intelligent multi-factor scoring
 */
export interface TrustScore2_0 {
  /**
   * Social trust component (30% weight)
   * Based on following relationships and social distance
   */
  social_weight: number;
  
  /**
   * Taste alignment component (50% weight)
   * Based on cuisine preference correlation and rating similarity
   */
  taste_alignment: number;
  
  /**
   * Contextual match component (20% weight)
   * Based on occasion, timing, and situational relevance
   */
  contextual_match: number;
  
  /**
   * Recency factor (multiplier)
   * Time-based decay for recommendation freshness
   */
  recency_factor: number;
  
  /**
   * Quality signals (multiplier)
   * Community validation through saves, likes, verified visits
   */
  quality_signals: number;
  
  /**
   * Final combined trust score (0-1)
   */
  overall_trust_score: number;
  
  /**
   * Human-readable explanation of the score
   */
  explanation: string;
}

/**
 * Search context for contextual recommendations
 * Allows users to override smart defaults or provide explicit context
 */
export interface SearchContext {
  /**
   * Desired occasion type
   */
  occasion?: OccasionType;
  
  /**
   * Price range filter [min, max]
   */
  price_range?: [number, number];
  
  /**
   * How adventurous the user feels
   */
  cuisine_openness?: 'specific' | 'adventurous' | 'familiar';
  
  /**
   * Location preference relative to user
   */
  location?: 'near_work' | 'near_home' | 'exploring';
  
  /**
   * When planning to go
   */
  timing?: 'tonight' | 'weekend' | 'planning_ahead';
  
  /**
   * Expected party size
   */
  party_size?: number;
  
  /**
   * Dietary requirements or restrictions
   */
  dietary_needs?: string[];
  
  /**
   * Preferred meal type
   */
  meal_type?: MealType;
}

// ============================================
// ENHANCED RECOMMENDATION INTERFACE
// ============================================

/**
 * Main Recommendation interface defining the structure of recommendation data
 * Enhanced with Trust Score 2.0 dish-level and contextual data
 */
export interface Recommendation {
  /**
   * Unique identifier for the recommendation
   */
  id: string;
  
  /**
   * Public key or identifier of the author
   */
  author: string;
  
  /**
   * Author ID (UUID format for database compatibility)
   */
  author_id?: string;
  
  /**
   * ISO8601 timestamp of creation
   */
  timestamp: string;
  
  /**
   * Identifier of the service being recommended
   */
  serviceId: string;
  
  /**
   * Restaurant ID (for database queries)
   */
  restaurant_id?: number;
  
  /**
   * Service category (e.g., "restaurant", "hotel")
   */
  category: string;
  
  /**
   * Geographic location of the recommendation
   */
  location: Location;
  
  /**
   * @deprecated Use overall_rating instead (Trust Score 2.0)
   * Legacy rating on a 1-5 scale
   */
  rating?: number;
  
  /**
   * NEW: Overall restaurant experience rating (0-10 scale)
   * More granular than legacy 1-5 system
   */
  overall_rating?: number;
  
  /**
   * NEW: Individual dish ratings
   * Enables dish-level precision recommendations
   */
  dishes?: Dish[];
  
  /**
   * NEW: Detailed restaurant aspect ratings
   */
  aspects?: RestaurantAspects;
  
  /**
   * NEW: Contextual information about the visit
   */
  context?: ContextualFactors;
  
  /**
   * Content of the recommendation
   */
  content: Content;
  
  /**
   * Array of relevant tags
   */
  tags: string[];
  
  /**
   * NEW: Context-based tags for smart defaults
   * e.g., ["date_night", "italian", "romantic"]
   */
  context_tags?: string[];
  
  /**
   * NEW: Cuisine type for taste alignment
   */
  cuisine_type?: string;
  
  /**
   * Verification status ("verified", "unverified")
   */
  verificationStatus: string;
  
  /**
   * NEW: Verified visit via QR code or loyalty scan
   */
  verified_visit?: boolean;
  
  /**
   * NEW: When visit was verified
   */
  visit_verified_at?: string;
  
  /**
   * Hash of the content for verification
   */
  contentHash: string;
  
  /**
   * Reference to on-chain storage
   */
  tangle: TangleReference;
  
  /**
   * Blockchain transaction ID
   */
  blockchain_tx_id?: string;
  
  /**
   * Blockchain transaction status
   */
  blockchain_status?: string;
  
  /**
   * Indicates originating chain
   */
  chainID: string;
  
  /**
   * NEW: Trust Score 2.0 context for personalized ranking
   */
  trust_context?: TrustScore2_0;
  
  /**
   * NEW: Loyalty program context (tier, visit number, etc.)
   */
  loyalty_context?: {
    card_id?: string;
    tier_level?: string;
    visit_number?: number;
  };
  
  /**
   * Engagement metrics
   */
  upvotes_count?: number;
  saves_count?: number;
  
  /**
   * Token rewards
   */
  base_reward?: number;
  social_reward?: number;
  total_tokens_earned?: number;
  
  /**
   * Additional metadata
   */
  is_featured?: boolean;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Minimal recommendation data for on-chain storage
 * Only critical numerical data and metadata (not rich content)
 */
export interface OnChainRecommendation {
  /**
   * Core rating data (drives trust scores and token rewards)
   */
  ratings: {
    restaurant: number; // 0-10 overall experience
    dishes: Array<{
      name: string;
      rating: number; // 0-10
    }>;
    aspects: {
      ambiance: number;
      service: number;
      valueForMoney: number;
    };
  };
  
  /**
   * Trust calculation essentials
   */
  authorId: string;
  timestamp: number;
  contextTags: string[];
  
  /**
   * Verification hash pointing to off-chain rich content
   */
  contentHash: string;
  
  /**
   * Blockchain metadata
   */
  transactionId: string;
  blockHeight: number;
}

/**
 * Off-chain rich content stored in IPFS
 * Detailed reviews, photos, and verbose context
 */
export interface OffChainContent {
  /**
   * Detailed text review of restaurant
   */
  restaurantReview: string;
  
  /**
   * Individual dish reviews
   */
  dishReviews: {
    [dishName: string]: string;
  };
  
  /**
   * Photos and media
   */
  photos: string[]; // IPFS hashes
  
  /**
   * Detailed visit information
   */
  visitDetails: {
    date: string;
    partySize: number;
    occasion: string;
    totalSpent?: number;
  };
}

// ============================================
// EXISTING TYPES (PRESERVED)
// ============================================

/**
 * Types of actions that can be performed on a recommendation
 */
export enum RecommendationActionType {
  CREATE = 'create',
  UPDATE = 'update',
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  DELETE = 'delete',
  SAVE = 'save', // NEW: Save to personal collection
  SHARE = 'share' // NEW: Share with network
}

/**
 * Structure for recommendation action events
 */
export interface RecommendationAction {
  /**
   * Type of action performed
   */
  type: RecommendationActionType;
  
  /**
   * ID of the recommendation being acted upon
   */
  recommendationId: string;
  
  /**
   * User performing the action
   */
  userId: string;
  
  /**
   * Timestamp of the action
   */
  timestamp: string;
  
  /**
   * Additional data related to the action
   */
  data?: any;
}

/**
 * Filter parameters for retrieving recommendations
 * Enhanced with Trust Score 2.0 contextual filters
 */
export interface RecommendationFilter {
  /**
   * Optional author/user ID to filter by
   */
  author?: string;
  
  /**
   * Optional category to filter by
   */
  category?: string;
  
  /**
   * Optional service ID to filter by
   */
  serviceId?: string;
  
  /**
   * Optional tags to filter by (any match)
   */
  tags?: string[];
  
  /**
   * @deprecated Use overall_rating filter instead
   * Optional minimum rating threshold (legacy 1-5)
   */
  minRating?: number;
  
  /**
   * NEW: Minimum overall rating (0-10 scale)
   */
  min_overall_rating?: number;
  
  /**
   * NEW: Filter by cuisine type
   */
  cuisine_type?: string;
  
  /**
   * NEW: Filter by context tags
   */
  context_tags?: string[];
  
  /**
   * NEW: Filter by occasion
   */
  occasion?: OccasionType;
  
  /**
   * NEW: Filter by verified visits only
   */
  verified_visits_only?: boolean;
  
  /**
   * NEW: Minimum Trust Score threshold
   */
  min_trust_score?: number;
  
  /**
   * Optional location to search near
   */
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  
  /**
   * Pagination parameters
   */
  pagination?: {
    offset: number;
    limit: number;
  };
  
  /**
   * Sorting parameters
   */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  /**
   * NEW: Context for personalized filtering
   */
  search_context?: SearchContext;
}

/**
 * Response structure for recommendation queries
 */
export interface RecommendationQueryResponse {
  /**
   * Array of recommendations matching the filter
   */
  recommendations: Recommendation[];
  
  /**
   * Total count of matching recommendations
   */
  total: number;
  
  /**
   * Pagination information
   */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  
  /**
   * NEW: Context used for this query
   */
  applied_context?: SearchContext;
}