/**
 * Google Places Caching Service
 * 
 * Adds a caching layer on top of the existing GooglePlacesProvider.
 * - Fetches details on first view (lazy loading)
 * - Caches in database for 6 months
 * - Auto-refreshes when expired
 * 
 * UPDATED: 2026-02-05 - Added photo caching and guide cover image support
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
  google_photo_url?: string;
  needs_refresh: boolean;
}

export interface GuideCoverImageResult {
  success: boolean;
  coverImageUrl: string | null;
  source: 'google_places' | 'cached' | null;
  restaurantId?: number;
  restaurantName?: string;
  error?: string;
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
   * Get and cache a restaurant's photo from Google Places
   * 
   * This method:
   * 1. Checks if the restaurant already has a cached photo URL
   * 2. If not, fetches from Google Places API
   * 3. Caches the URL in the database for future use
   * 
   * Cost: $7 per 1,000 requests (only charged on cache miss)
   * 
   * @param restaurantId - The database ID of the restaurant
   * @param forceRefresh - If true, fetch a new photo even if one is cached
   * @returns The photo URL or null if not available
   */
  async getRestaurantPhoto(
    restaurantId: number | string,
    forceRefresh: boolean = false
  ): Promise<string | null> {
    try {
      // 1. Fetch restaurant from DB
      const { data: restaurant, error } = await this.supabase
        .from('restaurants')
        .select('id, name, google_place_id, google_photo_url')
        .eq('id', restaurantId)
        .single();

      if (error || !restaurant) {
        console.error(`📷 Restaurant not found: ${restaurantId}`);
        return null;
      }

      // 2. Return cached photo if available and not forcing refresh
      if (restaurant.google_photo_url && !forceRefresh) {
        console.log(`📷 Using cached photo for ${restaurant.name}`);
        return restaurant.google_photo_url;
      }

      // 3. Check if we have a Google Place ID to fetch from
      if (!restaurant.google_place_id) {
        console.log(`📷 No Google Place ID for ${restaurant.name}, cannot fetch photo`);
        return null;
      }

      // 4. Fetch photo from Google Places API
      console.log(`📷 Fetching photo from Google Places for ${restaurant.name}...`);
      const photoUrl = await this.provider.getPlacePhoto(restaurant.google_place_id);

      if (!photoUrl) {
        console.log(`📷 No photo available from Google Places for ${restaurant.name}`);
        return null;
      }

      // 5. Cache the photo URL in the database
      const { error: updateError } = await this.supabase
        .from('restaurants')
        .update({ google_photo_url: photoUrl })
        .eq('id', restaurantId);

      if (updateError) {
        console.error(`📷 Failed to cache photo URL for ${restaurant.name}:`, updateError);
        // Still return the photo URL even if caching failed
      } else {
        console.log(`📷 Cached photo URL for ${restaurant.name}`);
      }

      return photoUrl;

    } catch (error) {
      console.error(`📷 Error getting restaurant photo:`, error);
      return null;
    }
  }

  /**
   * Set cover image for a food guide from its first restaurant
   * 
   * This method:
   * 1. Gets the first restaurant in the guide
   * 2. Fetches/caches its photo
   * 3. Updates the guide's cover_image_url field
   * 
   * @param guideId - The food guide ID
   * @returns Result object with success status and cover image URL
   */
  async setGuideCoverImage(guideId: string): Promise<GuideCoverImageResult> {
    try {
      console.log(`🖼️ Setting cover image for guide ${guideId}...`);

      // 1. Check if guide already has a cover image
      const { data: guide, error: guideError } = await this.supabase
        .from('food_guides')
        .select('id, title, cover_image_url, cover_image_source')
        .eq('id', guideId)
        .single();

      if (guideError || !guide) {
        return {
          success: false,
          coverImageUrl: null,
          source: null,
          error: 'Guide not found'
        };
      }

      // If guide already has a user-uploaded cover, don't override it
      if (guide.cover_image_url && guide.cover_image_source === 'user_upload') {
        console.log(`🖼️ Guide ${guide.title} already has user-uploaded cover, skipping`);
        return {
          success: true,
          coverImageUrl: guide.cover_image_url,
          source: 'cached'
        };
      }

      // 2. Get the first restaurant in the guide
      const { data: guideItems, error: itemsError } = await this.supabase
        .from('guide_items')
        .select(`
          restaurant_id,
          restaurants (
            id,
            name,
            google_place_id,
            google_photo_url
          )
        `)
        .eq('list_id', guideId)
        .order('sort_order', { ascending: true })
        .limit(1);

      if (itemsError || !guideItems || guideItems.length === 0) {
        console.log(`🖼️ No restaurants in guide ${guideId}`);
        return {
          success: false,
          coverImageUrl: null,
          source: null,
          error: 'No restaurants in guide'
        };
      }

      const firstRestaurant = guideItems[0].restaurants as any;
      
      if (!firstRestaurant) {
        return {
          success: false,
          coverImageUrl: null,
          source: null,
          error: 'First restaurant not found'
        };
      }

      // 3. Get the restaurant's photo (from cache or Google)
      const photoUrl = await this.getRestaurantPhoto(firstRestaurant.id);

      if (!photoUrl) {
        console.log(`🖼️ No photo available for first restaurant in guide ${guide.title}`);
        return {
          success: false,
          coverImageUrl: null,
          source: null,
          restaurantId: firstRestaurant.id,
          restaurantName: firstRestaurant.name,
          error: 'No photo available for first restaurant'
        };
      }

      // 4. Update the guide's cover image
      const { error: updateError } = await this.supabase
        .from('food_guides')
        .update({
          cover_image_url: photoUrl,
          cover_image_source: 'google_places'
        })
        .eq('id', guideId);

      if (updateError) {
        console.error(`🖼️ Failed to update guide cover image:`, updateError);
        return {
          success: false,
          coverImageUrl: photoUrl, // Still return the URL even if save failed
          source: 'google_places',
          restaurantId: firstRestaurant.id,
          restaurantName: firstRestaurant.name,
          error: 'Failed to save cover image to guide'
        };
      }

      console.log(`🖼️ Successfully set cover image for guide "${guide.title}" from ${firstRestaurant.name}`);
      
      return {
        success: true,
        coverImageUrl: photoUrl,
        source: 'google_places',
        restaurantId: firstRestaurant.id,
        restaurantName: firstRestaurant.name
      };

    } catch (error) {
      console.error(`🖼️ Error setting guide cover image:`, error);
      return {
        success: false,
        coverImageUrl: null,
        source: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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

  /**
   * Batch fetch photos for restaurants that don't have them
   * Useful for a background job to pre-populate photos
   * 
   * @param limit - Maximum number of restaurants to process
   * @returns Number of photos successfully fetched
   */
  async batchFetchMissingPhotos(limit: number = 50): Promise<number> {
    const { data: restaurants, error } = await this.supabase
      .from('restaurants')
      .select('id, name, google_place_id')
      .not('google_place_id', 'is', null)
      .is('google_photo_url', null)
      .limit(limit);

    if (error || !restaurants) {
      console.error('📷 Failed to fetch restaurants needing photos:', error);
      return 0;
    }

    console.log(`📷 Fetching photos for ${restaurants.length} restaurants...`);

    let fetched = 0;
    for (const restaurant of restaurants) {
      try {
        const photoUrl = await this.getRestaurantPhoto(restaurant.id);
        if (photoUrl) {
          fetched++;
        }
        // Rate limiting: wait 200ms between requests to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`📷 Failed to fetch photo for ${restaurant.name}:`, err);
      }
    }

    console.log(`📷 Fetched ${fetched}/${restaurants.length} photos`);
    return fetched;
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