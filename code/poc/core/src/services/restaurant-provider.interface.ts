// File: code/poc/core/src/services/restaurant-provider.interface.ts

/**
 * Restaurant Provider Interface
 * 
 * Abstraction layer for restaurant data sources (Foursquare, Google, etc.)
 * Allows easy switching between providers without changing application code
 */

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface RestaurantSuggestion {
  external_id: string;  // provider's ID (e.g., foursquare_place_id)
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  distance?: number;  // meters from search location
}

export interface RestaurantDetails extends RestaurantSuggestion {
  phone?: string;
  website?: string;
  hours?: any;  // Provider-specific format
  photos?: string[];
  // NOTE: External ratings NOT included - we don't want them
}

export interface RestaurantSearchProvider {
  /**
   * Search for restaurants by text query and location
   */
  search(
    query: string, 
    location: Location,
    options?: {
      radius?: number;  // meters
      limit?: number;
    }
  ): Promise<RestaurantSuggestion[]>;

  /**
   * Autocomplete restaurant names as user types
   */
  autocomplete(
    input: string,
    location: Location,
    options?: {
      limit?: number;
    }
  ): Promise<RestaurantSuggestion[]>;

  /**
   * Get detailed information about a specific restaurant
   */
  getDetails(externalId: string): Promise<RestaurantDetails>;

  /**
   * Search for nearby restaurants within a map bounds
   */
  nearbySearch(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    options?: {
      category?: string;
      limit?: number;
    }
  ): Promise<RestaurantSuggestion[]>;
}