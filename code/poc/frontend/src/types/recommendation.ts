// File: code/frontend/src/types/recommendation.ts

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  cuisine?: string;
  priceRange?: '€' | '€€' | '€€€' | '€€€€';
  phoneNumber?: string;
  website?: string;
  hours?: string;
  // Blockchain fields
  objectId?: string; // IOTA Rebased object ID
  createdBy?: string; // Wallet address of who added the restaurant
  verificationStatus?: 'pending' | 'verified' | 'flagged';
}

export interface PhotoData {
  file: File;
  preview: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
  // IPFS fields (after upload)
  ipfsHash?: string;
  thumbnailHash?: string;
}

export interface RecommendationDraft {
  restaurant: Restaurant | null;
  title: string;
  body: string;
  category: string;
  photos: PhotoData[];
  rating?: number;
  tags?: string[];
  // Optional fields for enhanced functionality
  visitDate?: Date;
  pricePoint?: number;
  atmosphere?: string[];
  accessibility?: string[];
}

export interface Recommendation {
  // Core identification
  id: string;
  objectId: string; // IOTA Rebased object ID
  author: string; // Wallet address
  
  // Content and categorization
  title: string;
  body: string;
  category: string;
  tags: string[];
  
  // Restaurant reference
  restaurantId: string;
  restaurant?: Restaurant; // Populated when fetched
  
  // Location and context
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  };
  visitDate?: Date;
  pricePoint?: number;
  
  // Media
  photos: {
    ipfsHash: string;
    thumbnailHash?: string;
    caption?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  }[];
  
  // Trust and verification
  trustScore: number; // 0-1 calculated score
  verificationStatus: 'verified' | 'unverified' | 'flagged';
  contentHash: string; // IPFS hash of content
  
  // Engagement metrics
  upvotes: number;
  saves: number;
  comments?: number;
  shares?: number;
  
  // Blockchain metadata
  chainId: string;
  commitNumber: number; // Ledger height
  transactionHash: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Token economics
  tokensEarned: number;
  rewardMultiplier: number;
  
  // Social context
  endorsements: {
    userId: string;
    trustWeight: number;
    socialDistance: number; // 1 = direct, 2 = friend-of-friend
    timestamp: Date;
  }[];
}

export interface CreateRecommendationRequest {
  restaurant: Restaurant;
  title: string;
  body: string;
  category: string;
  photos: PhotoData[];
  tags?: string[];
  visitDate?: Date;
  pricePoint?: number;
  // Derived fields
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  };
}

export interface CreateRecommendationResponse {
  recommendation: Recommendation;
  transactionHash: string;
  estimatedReward: {
    baseReward: number;
    potentialMultiplier: number;
    estimatedTotal: number;
  };
  trustScoreImpact: {
    previousScore: number;
    newScore: number;
    change: number;
  };
}

// Category definitions
export const RECOMMENDATION_CATEGORIES = [
  'Breakfast & Brunch',
  'Lunch', 
  'Dinner',
  'Coffee & Drinks',
  'Desserts',
  'Special Occasion',
  'Quick Bite',
  'Late Night',
  'Takeout & Delivery',
  'Street Food'
] as const;

export type RecommendationCategory = typeof RECOMMENDATION_CATEGORIES[number];

// Price ranges
export const PRICE_RANGES = [
  { value: '€', label: '€ - Budget (under €15)', description: 'Affordable, casual dining' },
  { value: '€€', label: '€€ - Moderate (€15-30)', description: 'Mid-range, good value' },
  { value: '€€€', label: '€€€ - Expensive (€30-60)', description: 'Upscale, special occasion' },
  { value: '€€€€', label: '€€€€ - Very Expensive (€60+)', description: 'Fine dining, luxury' }
] as const;

export type PriceRange = typeof PRICE_RANGES[number]['value'];

// Validation schemas (you can use with zod or similar)
export interface RecommendationValidation {
  title: {
    minLength: 5;
    maxLength: 100;
    required: true;
  };
  body: {
    minLength: 20;
    maxLength: 2000;
    required: true;
  };
  category: {
    required: true;
    enum: typeof RECOMMENDATION_CATEGORIES;
  };
  photos: {
    minCount: 0;
    maxCount: 5;
    maxSizeBytes: 5 * 1024 * 1024; // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'];
  };
}