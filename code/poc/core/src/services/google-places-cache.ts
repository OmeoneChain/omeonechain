/**
 * Google Places Caching Service
 * 
 * Adds a caching layer on top of the existing GooglePlacesProvider.
 * - Fetches details on first view (lazy loading)
 * - Caches in database for 6 months
 * - Auto-refreshes when expired
 * 
 * Location: code/poc/core/src/services/google-places-cache.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GooglePlacesProvider, createGooglePlacesProvider } from './google-places-provider';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedRestaurantDetails {
  id: string;
  google_place_id: string;
  name: string;
  formatted_address: string;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  price_level?: number;
  price_range?: string;
  category?: string;
  cuisine_types?: string[];
  latitude?: number;
  longitude?: number;
  google_data_fetched_at?: string;
  google_data_expires_at?: string;
  needs_refresh: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Cache duration: 6 months in milliseconds
const CACHE_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~180 days

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert numeric price level (1-4) to readable price range
 */
function priceToRange(priceLevel: number | undefined): string {
  switch (priceLevel) {
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$'; // Default to moderate
  }
}

/**
 * Parse address to extract city (simple version)
 */
function extractCity(formattedAddress: string): string {
  const parts = formattedAddress.split(',').map(p => p.trim());
  // City is usually the second part
  return parts[1] || parts[0] || '';
}

/**
 * Check if cached data needs refresh
 */
function needsRefresh(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class GooglePlacesCacheService {
  private supabase: SupabaseClient;
  private provider: GooglePlacesProvider;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.provider = createGooglePlacesProvider();
  }

  /**
   * Update restaurant in database with Google data
   */
  private async cacheGoogleData(
    restaurantId: string, 
    googleData: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      categories: string[];
      priceLevel: number;
      phone?: string;
      website?: string;
    }
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

    const updateData = {
      // Address
      formatted_address: googleData.address,
      address: googleData.address.split(',')[0]?.trim() || googleData.address,
      city: extractCity(googleData.address),
      
      // Contact
      phone: googleData.phone,
      website: googleData.website,
      
      // Category & Price
      price_level: googleData.priceLevel,
      price_range: priceToRange(googleData.priceLevel),
      category: googleData.categories[0] || 'Restaurant',
      cuisine_types: googleData.categories,
      
      // Location
      latitude: googleData.latitude,
      longitude: googleData.longitude,
      
      // Cache metadata
      google_data_fetched_at: now.toISOString(),
      google_data_expires_at: expiresAt.toISOString(),
    };

    const { error } = await this.supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId);

    if (error) {
      console.error('Failed to cache Google data:', error);
      throw error;
    }

    console.log(`✅ Cached Google Places data for restaurant ${restaurantId}`);
  }

  /**
   * Get restaurant details with automatic Google fetch if needed
   * This is the main method to call from routes
   */
  async getRestaurantDetails(
    restaurantId: string, 
    forceRefresh: boolean = false
  ): Promise<CachedRestaurantDetails | null> {
    // 1. Fetch current restaurant data from DB
    const { data: restaurant, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      console.error('Restaurant not found:', restaurantId);
      return null;
    }

    // 2. Check if we need to fetch/refresh from Google
    const shouldFetch = forceRefresh || 
      !restaurant.google_data_fetched_at ||
      needsRefresh(restaurant.google_data_expires_at);

    if (shouldFetch && restaurant.google_place_id) {
      console.log(`📡 Fetching Google Places data for ${restaurant.name}...`);
      
      try {
        // Use the existing provider's getDetails method
        const googleData = await this.provider.getDetails(restaurant.google_place_id);
        
        if (googleData) {
          await this.cacheGoogleData(restaurantId, googleData);
          
          // Re-fetch the updated restaurant
          const { data: updated } = await this.supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();
          
          if (updated) {
            return {
              ...updated,
              needs_refresh: false,
            } as CachedRestaurantDetails;
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch from Google Places:', fetchError);
        // Return existing data even if refresh failed
      }
    }

    // 3. Return current data with refresh status
    return {
      ...restaurant,
      needs_refresh: needsRefresh(restaurant.google_data_expires_at),
    } as CachedRestaurantDetails;
  }

  /**
   * Manually trigger refresh for a restaurant
   */
  async refreshRestaurant(restaurantId: string): Promise<CachedRestaurantDetails | null> {
    return this.getRestaurantDetails(restaurantId, true);
  }

  /**
   * Batch refresh restaurants that are expired
   * Useful for a background job (optional)
   */
  async refreshExpiredRestaurants(limit: number = 50): Promise<number> {
    const now = new Date().toISOString();
    
    const { data: expiredRestaurants, error } = await this.supabase
      .from('restaurants')
      .select('id, google_place_id, name')
      .not('google_place_id', 'is', null)
      .lt('google_data_expires_at', now)
      .limit(limit);

    if (error || !expiredRestaurants) {
      console.error('Failed to fetch expired restaurants:', error);
      return 0;
    }

    let refreshed = 0;
    for (const restaurant of expiredRestaurants) {
      try {
        await this.refreshRestaurant(restaurant.id);
        refreshed++;
        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Failed to refresh ${restaurant.name}:`, err);
      }
    }

    console.log(`🔄 Refreshed ${refreshed}/${expiredRestaurants.length} restaurants`);
    return refreshed;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cacheService: GooglePlacesCacheService | null = null;

export function getGooglePlacesCacheService(): GooglePlacesCacheService {
  if (!cacheService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    cacheService = new GooglePlacesCacheService(supabaseUrl, supabaseKey);
  }
  return cacheService;
}

export default GooglePlacesCacheService;