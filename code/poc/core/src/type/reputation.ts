/**
 * User Reputation Model
 * 
 * Represents a user's reputation and contribution metrics in the OmeoneChain/Zesto system
 * Updated for Trust Score 2.0 with taste alignment and contextual intelligence
 * Based on Technical Specifications A.2.2 + Trust Score 2.0 Enhancement
 */

export enum VerificationLevel {
  BASIC = 'basic',
  VERIFIED = 'verified',
  EXPERT = 'expert'
}

export interface LedgerReference {
  /**
   * Object ID on the ledger
   */
  objectID: string;
  
  /**
   * Commit number
   */
  commitNumber: number;
}

// ============================================
// TRUST SCORE 2.0 NEW TYPES
// ============================================

/**
 * Taste alignment calculation result between two users
 * Core component of Trust Score 2.0 (50% weight)
 */
export interface TasteAlignmentResult {
  /**
   * User being compared from
   */
  user_id: string;
  
  /**
   * User being compared to
   */
  compared_user_id: string;
  
  /**
   * Overall similarity score (0-1)
   * 1.0 = perfect alignment, 0 = no correlation
   */
  similarity_score: number;
  
  /**
   * Confidence level in this calculation (0-1)
   * Based on number of data points available
   */
  confidence_level: number;
  
  /**
   * Cuisines both users enjoy
   */
  shared_preferences: string[];
  
  /**
   * Cuisines where preferences diverge
   */
  divergent_preferences: string[];
  
  /**
   * Detailed correlation breakdown
   */
  correlation_data: {
    /**
     * Cuisine preference correlation (-1 to 1)
     */
    cuisine_correlation: number;
    
    /**
     * Rating correlation (Pearson coefficient)
     */
    rating_correlation: number;
    
    /**
     * Contextual preference correlation
     * (Do they rate similarly in same contexts?)
     */
    context_correlation: number;
  };
  
  /**
   * Number of restaurants both have rated
   */
  shared_restaurants: number;
  
  /**
   * Number of cuisines both have tried
   */
  shared_cuisines: string[];
  
  /**
   * When this was last calculated
   */
  last_calculated: string;
  
  /**
   * Calculation version (for algorithm updates)
   */
  calculation_version: string;
}

/**
 * User's learned taste patterns and preferences
 * Replaces static preference profiles with behavioral learning
 */
export interface UserTastePattern {
  /**
   * User ID
   */
  user_id: string;
  
  /**
   * Cuisine preferences with frequency/rating scores
   * Format: { "italian": 0.85, "mexican": 0.72, ... }
   */
  cuisine_preferences: Record<string, number>;
  
  /**
   * Occasion patterns (when do they dine?)
   * Format: { "date_night": 0.3, "family_dinner": 0.5, ... }
   */
  occasion_patterns: Record<string, number>;
  
  /**
   * Price sensitivity (0-1)
   * 0 = very price-sensitive, 1 = price-insensitive
   */
  price_sensitivity: number;
  
  /**
   * Adventurousness score (0-1)
   * 0 = prefers familiar, 1 = seeks novel experiences
   */
  adventurousness_score: number;
  
  /**
   * Temporal patterns (when do they dine?)
   * Format: { "weekday_lunch": [...], "friday_dinner": [...] }
   */
  temporal_patterns: Record<string, any>;
  
  /**
   * Favorite dishes across all recommendations
   */
  favorite_dishes: string[];
  
  /**
   * Dietary restrictions or preferences
   */
  dietary_restrictions: string[];
  
  /**
   * Preferred ambiance level (0-10)
   */
  preferred_ambiance_level?: number;
  
  /**
   * Typical party size for dining
   */
  typical_party_size?: number;
  
  /**
   * Total recommendations made (for confidence)
   */
  recommendation_count: number;
  
  /**
   * When patterns were last updated
   */
  last_updated: string;
}

/**
 * Trust Score 2.0 calculation parameters
 * Replaces simple social distance with multi-factor intelligence
 */
export interface TrustScore2_0Params {
  /**
   * Social trust weight (default: 0.3)
   * How much to weight social graph relationships
   */
  social_weight: number;
  
  /**
   * Taste alignment weight (default: 0.5)
   * How much to weight preference correlation
   */
  taste_alignment_weight: number;
  
  /**
   * Contextual match weight (default: 0.2)
   * How much to weight situational relevance
   */
  contextual_weight: number;
  
  /**
   * Recency decay rate
   * How quickly old recommendations lose relevance
   */
  recency_decay_rate: number;
  
  /**
   * Minimum data points required for taste alignment
   */
  min_alignment_datapoints: number;
  
  /**
   * Minimum trust score to qualify for rewards
   */
  min_trust_threshold: number;
  
  /**
   * Maximum trust multiplier
   */
  max_trust_multiplier: number;
}

/**
 * Contextual match calculation for a recommendation
 * Determines how well a recommendation fits user's current context
 */
export interface ContextualMatch {
  /**
   * User ID
   */
  user_id: string;
  
  /**
   * Recommendation ID being evaluated
   */
  recommendation_id: string;
  
  /**
   * Overall contextual match score (0-1)
   */
  match_score: number;
  
  /**
   * Breakdown of contextual factors
   */
  factors: {
    /**
     * Does occasion match? (0-1)
     */
    occasion_match: number;
    
    /**
     * Does timing match? (0-1)
     */
    temporal_match: number;
    
    /**
     * Does party size match? (0-1)
     */
    party_size_match: number;
    
    /**
     * Does price range match? (0-1)
     */
    price_match: number;
    
    /**
     * Does location match? (0-1)
     */
    location_match: number;
  };
  
  /**
   * Human-readable explanation
   */
  explanation: string;
}

// ============================================
// ENHANCED REPUTATION INTERFACE
// ============================================

/**
 * Main UserReputation interface defining the structure of user reputation data
 * Enhanced with Trust Score 2.0 taste patterns and social intelligence
 */
export interface UserReputation {
  /**
   * Chain ID (e.g., "Rebased-testnet-001")
   */
  chainID: string;
  
  /**
   * Public key or identifier of the user
   */
  userId: string;
  
  /**
   * Total number of recommendations made by the user
   */
  totalRecommendations: number;
  
  /**
   * Total number of upvotes received across all recommendations
   */
  upvotesReceived: number;
  
  /**
   * Total number of downvotes received across all recommendations
   */
  downvotesReceived: number;
  
  /**
   * Calculated reputation score
   */
  reputationScore: number;
  
  /**
   * User's verification level
   */
  verificationLevel: VerificationLevel;
  
  /**
   * Categories in which the user has expertise
   */
  specializations: string[];
  
  /**
   * ISO8601 timestamp when the user joined
   */
  activeSince: string;
  
  /**
   * Total token rewards earned
   */
  tokenRewardsEarned: number;
  
  /**
   * Number of users following this user
   */
  followers: number;
  
  /**
   * Number of users this user is following
   */
  following: number;
  
  /**
   * Reference to on-chain storage
   */
  ledger: LedgerReference;
  
  /**
   * NEW: Learned taste patterns for this user
   */
  taste_pattern?: UserTastePattern;
  
  /**
   * NEW: Average Trust Score received from network
   */
  average_trust_score?: number;
  
  /**
   * NEW: Number of verified visits (QR code scans)
   */
  verified_visits_count?: number;
  
  /**
   * NEW: Dish-level contribution statistics
   */
  dish_ratings_contributed?: number;
  
  /**
   * NEW: Contextual data completion rate
   */
  context_completion_rate?: number;
}

/**
 * @deprecated Use TrustScore2_0Params instead
 * Legacy Trust Score calculation parameters (kept for backward compatibility)
 */
export interface TrustScoreParams {
  /**
   * Base weight for direct follower (default: 0.75)
   */
  directFollowerWeight: number;
  
  /**
   * Base weight for follower of follower (default: 0.25)
   */
  secondaryFollowerWeight: number;
  
  /**
   * Maximum trust multiplier (default: 3)
   */
  maxTrustMultiplier: number;
  
  /**
   * Minimum trust score to qualify for rewards (default: 0.25)
   */
  minTrustThreshold: number;
}

/**
 * Social graph relationship between users
 * Enhanced with taste alignment data
 */
export interface UserRelationship {
  /**
   * User who is following
   */
  followerId: string;
  
  /**
   * User being followed
   */
  followedId: string;
  
  /**
   * When the follow relationship was established
   */
  timestamp: string;
  
  /**
   * Social distance (1 = direct follow, 2 = follow of follow)
   */
  distance: number;
  
  /**
   * @deprecated Use taste_alignment_score for Trust Score 2.0
   * Trust weight based on the relationship (calculated)
   */
  trustWeight: number;
  
  /**
   * NEW: Taste alignment score between these users (0-1)
   */
  taste_alignment_score?: number;
  
  /**
   * NEW: Confidence in taste alignment calculation
   */
  taste_alignment_confidence?: number;
  
  /**
   * NEW: Number of shared restaurant visits
   */
  shared_experiences?: number;
}

/**
 * Filter parameters for retrieving reputation data
 * Enhanced with Trust Score 2.0 filters
 */
export interface ReputationFilter {
  /**
   * Optional user ID to filter by
   */
  userId?: string;
  
  /**
   * Optional minimum reputation threshold
   */
  minReputationScore?: number;
  
  /**
   * Optional verification level
   */
  verificationLevel?: VerificationLevel;
  
  /**
   * Optional specialization category
   */
  specialization?: string;
  
  /**
   * NEW: Filter by minimum taste alignment with requesting user
   */
  min_taste_alignment?: number;
  
  /**
   * NEW: Filter by cuisine expertise
   */
  cuisine_expertise?: string[];
  
  /**
   * NEW: Filter by adventurousness score range
   */
  adventurousness_range?: [number, number];
  
  /**
   * NEW: Filter by price sensitivity range
   */
  price_sensitivity_range?: [number, number];
  
  /**
   * NEW: Require verified visits
   */
  verified_users_only?: boolean;
  
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
}

/**
 * User reputation summary with taste intelligence
 * Used for profile displays and discovery
 */
export interface UserReputationSummary {
  /**
   * Basic user info
   */
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  
  /**
   * Reputation metrics
   */
  reputation_score: number;
  verification_level: VerificationLevel;
  total_recommendations: number;
  
  /**
   * Social metrics
   */
  followers_count: number;
  following_count: number;
  
  /**
   * Token metrics
   */
  tokens_earned: number;
  
  /**
   * NEW: Taste profile summary
   */
  taste_profile: {
    top_cuisines: Array<{ name: string; score: number }>;
    adventurousness_score: number;
    price_sensitivity: number;
    favorite_occasions: string[];
  };
  
  /**
   * NEW: Quality metrics
   */
  quality_metrics: {
    avg_dish_ratings_per_recommendation: number;
    context_completion_rate: number;
    verified_visits_count: number;
  };
  
  /**
   * NEW: Taste alignment with requesting user (if applicable)
   */
  taste_alignment_with_me?: {
    similarity_score: number;
    confidence: number;
    shared_cuisines: string[];
  };
}

/**
 * Expertise level in a specific category
 * Determined by quantity and quality of recommendations
 */
export interface CategoryExpertise {
  /**
   * User ID
   */
  user_id: string;
  
  /**
   * Category (e.g., "italian_cuisine", "fine_dining")
   */
  category: string;
  
  /**
   * Expertise score (0-1)
   */
  expertise_score: number;
  
  /**
   * Number of recommendations in this category
   */
  recommendation_count: number;
  
  /**
   * Average rating given in this category
   */
  average_rating: number;
  
  /**
   * Average Trust Score received in this category
   */
  average_trust_score: number;
  
  /**
   * Whether user is recognized expert in this category
   */
  is_expert: boolean;
}