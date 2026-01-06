import { RestaurantSearchProvider, RestaurantSearchResult } from './restaurant-provider.interface';

/**
 * Google Places API (New) Provider
 * 
 * Implements restaurant search using Google's Places API (New)
 * API Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
 * 
 * Critical: This provider NEVER returns rating data to align with Zesto's
 * "verified social trust beats anonymous crowds" philosophy.
 */

interface GoogleAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface GooglePlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
  priceLevel?: string;
  businessStatus?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  addressComponents?: GoogleAddressComponent[];
}

interface GoogleAutocompleteResult {
  placePrediction: {
    placeId: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText: { text: string };
    };
  };
}

export class GooglePlacesProvider implements RestaurantSearchProvider {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Places API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Search for restaurants by text query
   */
  async search(
    query: string,
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<RestaurantSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.priceLevel,places.businessStatus,places.websiteUri,places.internationalPhoneNumber'
        },
        body: JSON.stringify({
          textQuery: `${query} restaurant`,
          locationBias: {
            circle: {
              center: {
                latitude,
                longitude
              },
              radius
            }
          },
          languageCode: 'pt-BR'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Places API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return this.mapGoogleResults(data.places || []);
    } catch (error) {
      console.error('Google Places search error:', error);
      throw error;
    }
  }

  /**
   * Autocomplete restaurant names as user types
   */
  async autocomplete(
    input: string,
    latitude: number,
    longitude: number
  ): Promise<Array<{ id: string; name: string; address: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          input,
          locationBias: {
            circle: {
              center: {
                latitude,
                longitude
              },
              radius: 5000
            }
          },
          includedPrimaryTypes: ['restaurant', 'cafe', 'bar', 'bakery'],
          languageCode: 'pt-BR'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Autocomplete API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const suggestions: GoogleAutocompleteResult[] = data.suggestions || [];

      return suggestions.map(suggestion => ({
        id: suggestion.placePrediction.placeId,
        name: suggestion.placePrediction.structuredFormat.mainText.text,
        address: suggestion.placePrediction.structuredFormat.secondaryText.text
      }));
    } catch (error) {
      console.error('Google Places autocomplete error:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific place
   * Now includes addressComponents to extract city, state, country
   */
  async getDetails(placeId: string): Promise<RestaurantSearchResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/places/${placeId}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          // Added addressComponents to field mask for city/state/country extraction
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location,types,priceLevel,businessStatus,websiteUri,internationalPhoneNumber'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`Google Places Details API error (${response.status}): ${errorText}`);
      }

      const place: GooglePlaceResult = await response.json();
      const mapped = this.mapGoogleResults([place]);
      return mapped.length > 0 ? mapped[0] : null;
    } catch (error) {
      console.error('Google Places details error:', error);
      throw error;
    }
  }

  /**
   * Search for restaurants near a location
   */
  async getNearby(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<RestaurantSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.priceLevel,places.businessStatus,places.websiteUri,places.internationalPhoneNumber'
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: {
                latitude,
                longitude
              },
              radius
            }
          },
          includedTypes: ['restaurant', 'cafe', 'bar', 'bakery'],
          maxResultCount: 20,
          languageCode: 'pt-BR'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Places Nearby API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return this.mapGoogleResults(data.places || []);
    } catch (error) {
      console.error('Google Places nearby search error:', error);
      throw error;
    }
  }

  /**
   * Extract a specific address component by type
   * Google Places API (New) uses types like 'locality', 'administrative_area_level_1', 'country'
   */
  private getAddressComponent(
    components: GoogleAddressComponent[] | undefined,
    type: string,
    useShortText: boolean = false
  ): string | undefined {
    if (!components) return undefined;
    
    const component = components.find(c => c.types.includes(type));
    return component ? (useShortText ? component.shortText : component.longText) : undefined;
  }

  /**
   * Map Google Places response to our standard interface
   * CRITICAL: No rating data is included
   */
  private mapGoogleResults(places: GooglePlaceResult[]): RestaurantSearchResult[] {
    return places.map(place => {
      // Extract city, state, country from addressComponents
      const city = this.getAddressComponent(place.addressComponents, 'locality') 
                || this.getAddressComponent(place.addressComponents, 'administrative_area_level_2')
                || this.getAddressComponent(place.addressComponents, 'sublocality_level_1');
      
      const state = this.getAddressComponent(place.addressComponents, 'administrative_area_level_1');
      const stateShort = this.getAddressComponent(place.addressComponents, 'administrative_area_level_1', true);
      
      const country = this.getAddressComponent(place.addressComponents, 'country');
      const countryShort = this.getAddressComponent(place.addressComponents, 'country', true);

      return {
        external_id: place.id,
        name: place.displayName?.text || 'Unknown Restaurant',
        address: place.formattedAddress || '',
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0,
        categories: this.mapGoogleTypes(place.types || []),
        priceLevel: this.mapPriceLevel(place.priceLevel),
        phone: place.internationalPhoneNumber,
        website: place.websiteUri,
        // Location details extracted from addressComponents
        city,
        state,
        stateShort,
        country,
        countryShort,
        // NEVER include rating data - core Zesto principle
        // rating: OMITTED
        // userRatingsTotal: OMITTED
      };
    });
  }

  /**
   * Map Google's types to simple category strings
   */
  private mapGoogleTypes(types: string[]): string[] {
    const categoryMap: Record<string, string> = {
      restaurant: 'Restaurant',
      cafe: 'Cafe',
      bar: 'Bar',
      bakery: 'Bakery',
      meal_takeaway: 'Takeaway',
      meal_delivery: 'Delivery',
      food: 'Food',
      italian_restaurant: 'Italian',
      chinese_restaurant: 'Chinese',
      japanese_restaurant: 'Japanese',
      mexican_restaurant: 'Mexican',
      brazilian_restaurant: 'Brazilian',
      french_restaurant: 'French',
      indian_restaurant: 'Indian',
      thai_restaurant: 'Thai',
      pizza_restaurant: 'Pizza',
      seafood_restaurant: 'Seafood',
      steak_house: 'Steakhouse',
      sushi_restaurant: 'Sushi',
      vegan_restaurant: 'Vegan',
      vegetarian_restaurant: 'Vegetarian',
      fast_food_restaurant: 'Fast Food'
    };

    return types
      .map(type => categoryMap[type])
      .filter(Boolean) as string[];
  }

  /**
   * Map Google's price level to numeric tier
   * Google uses PRICE_LEVEL_FREE, PRICE_LEVEL_INEXPENSIVE, etc.
   */
  private mapPriceLevel(priceLevel?: string): number {
    if (!priceLevel) return 2; // Default to moderate

    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 1,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4
    };

    return priceLevelMap[priceLevel] || 2;
  }
}

/**
 * Factory function to create provider from environment variables
 */
export function createGooglePlacesProvider(): GooglePlacesProvider {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
  }

  return new GooglePlacesProvider(apiKey);
}