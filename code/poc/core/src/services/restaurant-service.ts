// File: code/poc/core/src/services/restaurant-service.ts

import { Pool } from 'pg';
import { GooglePlacesProvider, createGooglePlacesProvider } from './google-places-provider';
import { RestaurantSearchProvider, RestaurantSearchResult } from './restaurant-provider.interface';

interface Restaurant {
  id: number;
  foursquare_place_id?: string; // TODO: Rename to external_place_id in future migration
  name: string;
  normalized_name?: string;
  address?: string;
  city: string;
  state_province?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  data_source: 'user_created' | 'foursquare' | 'google_places' | 'owner_verified';
  created_at: Date;
  updated_at: Date;
}

export class RestaurantService {
  private db: Pool;
  private searchProvider: RestaurantSearchProvider;

  constructor(db: Pool) {
    this.db = db;
    this.searchProvider = createGooglePlacesProvider();
  }

  /**
   * Search for restaurants using external provider (Google Places)
   * Returns results that can be used to create restaurants in our DB
   */
  async searchRestaurants(
    query: string, 
    latitude: number,
    longitude: number,
    radius?: number
  ): Promise<RestaurantSearchResult[]> {
    return this.searchProvider.search(query, latitude, longitude, radius);
  }

  /**
   * Autocomplete restaurant names as user types
   */
  async autocompleteRestaurants(
    input: string,
    latitude: number,
    longitude: number
  ): Promise<Array<{ id: string; name: string; address: string }>> {
    return this.searchProvider.autocomplete(input, latitude, longitude);
  }

  /**
   * Find restaurant in our DB by external provider ID (Google Place ID)
   * Returns null if not found
   */
  async findByExternalId(externalId: string): Promise<Restaurant | null> {
    const result = await this.db.query(
      'SELECT * FROM restaurants WHERE foursquare_place_id = $1',
      [externalId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create restaurant from external provider data (Google Places)
   * Called when user selects a restaurant from search/autocomplete
   */
  async createFromExternalProvider(
    externalId: string,
    city?: string
  ): Promise<Restaurant> {
    // Get detailed information from provider
    const details = await this.searchProvider.getDetails(externalId);

    if (!details) {
      throw new Error(`Restaurant not found: ${externalId}`);
    }

    // Check if already exists
    const existing = await this.findByExternalId(externalId);
    if (existing) {
      return existing;
    }

    // Create in our database
    const result = await this.db.query(
      `INSERT INTO restaurants (
        foursquare_place_id,
        name,
        normalized_name,
        address,
        city,
        country,
        latitude,
        longitude,
        category,
        data_source,
        foursquare_data,
        last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        externalId,
        details.name,
        this.normalizeName(details.name),
        details.address,
        city || this.extractCity(details.address) || 'Brasília',
        'BR',
        details.latitude,
        details.longitude,
        details.categories?.[0] || 'Restaurant',
        'google_places',
        JSON.stringify(details), // Cache full response (no ratings included)
      ]
    );

    return result.rows[0];
  }

  /**
   * Find or create restaurant from external provider
   * This is the main function used during recommendation creation
   */
  async findOrCreateFromExternalProvider(
    externalId: string,
    city?: string
  ): Promise<Restaurant> {
    // Check if we already have this restaurant
    const existing = await this.findByExternalId(externalId);
    if (existing) {
      return existing;
    }

    // Create new restaurant from external provider data
    return this.createFromExternalProvider(externalId, city);
  }

  /**
   * Get restaurants within map bounds (for map view)
   */
  async getRestaurantsInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<Restaurant[]> {
    // First, check our database for cached restaurants in this area
    const cached = await this.db.query(
      `SELECT * FROM restaurants 
       WHERE latitude BETWEEN $1 AND $2 
       AND longitude BETWEEN $3 AND $4
       AND latitude IS NOT NULL 
       AND longitude IS NOT NULL
       LIMIT 100`,
      [bounds.south, bounds.north, bounds.west, bounds.east]
    );

    // If we have good coverage, return cached results
    if (cached.rows.length >= 10) {
      return cached.rows;
    }

    // Otherwise, fetch from provider and cache
    // Calculate center point and radius from bounds
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    const radius = this.calculateRadius(bounds);

    const providerResults = await this.searchProvider.getNearby(
      centerLat,
      centerLng,
      radius
    );

    // Cache new restaurants in our database
    for (const result of providerResults) {
      try {
        await this.findOrCreateFromExternalProvider(result.id);
      } catch (error) {
        console.error('Error caching restaurant:', error);
        // Continue with other restaurants
      }
    }

    // Return all restaurants in bounds from our DB (now includes new ones)
    const updated = await this.db.query(
      `SELECT * FROM restaurants 
       WHERE latitude BETWEEN $1 AND $2 
       AND longitude BETWEEN $3 AND $4
       AND latitude IS NOT NULL 
       AND longitude IS NOT NULL
       LIMIT 100`,
      [bounds.south, bounds.north, bounds.west, bounds.east]
    );

    return updated.rows;
  }

  /**
   * Get restaurant by ID (our internal ID)
   */
  async getRestaurantById(id: number): Promise<Restaurant | null> {
    const result = await this.db.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Normalize restaurant name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  /**
   * Extract city from address string (simple heuristic)
   */
  private extractCity(address: string): string | null {
    if (!address) return null;
    
    // Very simple extraction - just look for known cities
    const knownCities = ['Brasília', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte'];
    for (const city of knownCities) {
      if (address.includes(city)) {
        return city;
      }
    }
    
    return null;
  }

  /**
   * Calculate approximate radius in meters from map bounds
   */
  private calculateRadius(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): number {
    // Simple approximation: average distance from center to corners
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    // Very rough calculation: 111km per degree latitude, varies by longitude
    const latDistance = latDiff * 111000; // meters
    const lngDistance = lngDiff * 111000 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);
    
    // Return diagonal distance / 2 (radius to cover the bounds)
    return Math.sqrt(latDistance * latDistance + lngDistance * lngDistance) / 2;
  }
}

/**
 * Factory function to create restaurant service
 */
export function createRestaurantService(db: Pool): RestaurantService {
  return new RestaurantService(db);
}