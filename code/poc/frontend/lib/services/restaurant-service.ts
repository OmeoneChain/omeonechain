// lib/services/restaurant-service.ts
export interface Restaurant {
  id: number; // Changed from string to number
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
  addedBy?: string;
  verified?: boolean;
  totalRecommendations?: number;
  avgTrustScore?: number;
  topRecommendation?: {
    id: string;
    title: string;
    author: string;
    excerpt: string;
    trustScore: number;
  };
  distance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RestaurantSearchParams {
  query?: string;
  city?: string;
  cuisineType?: string;
  priceRange?: number[];
  minTrustScore?: number;
  userLocation?: { latitude: number; longitude: number };
  limit?: number;
  offset?: number;
}

export interface CreateRestaurantData {
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

class RestaurantService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }

  // Search restaurants with filters
  async searchRestaurants(params: RestaurantSearchParams): Promise<Restaurant[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.query) searchParams.append('query', params.query);
      if (params.city) searchParams.append('city', params.city);
      if (params.cuisineType) searchParams.append('cuisineType', params.cuisineType);
      if (params.priceRange) searchParams.append('priceRange', params.priceRange.join(','));
      if (params.minTrustScore) searchParams.append('minTrustScore', params.minTrustScore.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());
      
      // Add user location for distance calculation
      if (params.userLocation) {
        searchParams.append('userLat', params.userLocation.latitude.toString());
        searchParams.append('userLng', params.userLocation.longitude.toString());
      }

      const response = await fetch(`${this.baseUrl}/restaurants?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search restaurants: ${response.statusText}`);
      }

      const data = await response.json();
      return data.restaurants || [];
    } catch (error) {
      console.error('Error searching restaurants:', error);
      
      // Return mock data for development
      return this.getMockRestaurants(params);
    }
  }

  // Get restaurant by ID - now accepts integer ID
  async getRestaurant(id: number): Promise<Restaurant | null> {
    // Validate ID parameter
    if (!Number.isInteger(id) || id <= 0) {
      console.warn(`Invalid restaurant ID: ${id}. Must be a positive integer.`);
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/restaurants/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get restaurant: ${response.statusText}`);
      }

      const restaurant = await response.json();
      
      // Ensure returned restaurant has integer ID (backend compatibility)
      if (restaurant && typeof restaurant.id === 'string') {
        restaurant.id = parseInt(restaurant.id, 10);
      }

      return restaurant;
    } catch (error) {
      console.error('Error getting restaurant:', error);
      
      // Return mock data for development
      return this.getMockRestaurant(id);
    }
  }

  // Create new restaurant - returns restaurant with integer ID
  async createRestaurant(data: CreateRestaurantData, userWallet?: string): Promise<Restaurant> {
    try {
      const response = await fetch(`${this.baseUrl}/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userWallet && { 'Authorization': `Bearer ${userWallet}` })
        },
        body: JSON.stringify({
          ...data,
          addedBy: userWallet
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create restaurant: ${response.statusText}`);
      }

      const restaurant = await response.json();
      
      // Ensure returned restaurant has integer ID (backend compatibility)
      if (restaurant && typeof restaurant.id === 'string') {
        restaurant.id = parseInt(restaurant.id, 10);
      }

      return restaurant;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      
      // Return mock creation for development with integer ID
      return {
        ...data,
        id: Math.floor(Math.random() * 10000) + 1000, // Generate mock integer ID
        addedBy: userWallet || 'mock-user',
        verified: false,
        totalRecommendations: 0,
        avgTrustScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  // Get restaurants by city (for initial discovery page)
  async getRestaurantsByCity(city: string, limit: number = 20): Promise<Restaurant[]> {
    return this.searchRestaurants({ city, limit });
  }

  // Get trending restaurants
  async getTrendingRestaurants(city?: string, limit: number = 10): Promise<Restaurant[]> {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      params.append('limit', limit.toString());
      params.append('sortBy', 'trending');

      const response = await fetch(`${this.baseUrl}/restaurants/trending?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get trending restaurants: ${response.statusText}`);
      }

      const data = await response.json();
      return data.restaurants || [];
    } catch (error) {
      console.error('Error getting trending restaurants:', error);
      return this.getMockTrendingRestaurants(city);
    }
  }

  // Verify restaurant (admin function) - now accepts integer ID
  async verifyRestaurant(id: number, verified: boolean): Promise<boolean> {
    // Validate ID parameter
    if (!Number.isInteger(id) || id <= 0) {
      console.warn(`Invalid restaurant ID for verification: ${id}. Must be a positive integer.`);
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/restaurants/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified })
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying restaurant:', error);
      return false;
    }
  }

  // Mock data for development - updated with integer IDs
  private getMockRestaurants(params: RestaurantSearchParams): Restaurant[] {
    const mockRestaurants: Restaurant[] = [
      {
        id: 1, // Changed from "1" to 1
        name: "Restaurante Mangai",
        address: "SCLS 109, Bloco A, Loja 2/4",
        city: "Brasília",
        country: "Brazil",
        latitude: -15.8267,
        longitude: -47.9218,
        cuisineType: "Nordestina",
        priceRange: 3,
        verified: true,
        totalRecommendations: 23,
        avgTrustScore: 8.7,
        topRecommendation: {
          id: "rec-1",
          title: "Melhor comida nordestina de Brasília",
          author: "Ana Silva",
          excerpt: "Experiência incrível! O baião de dois estava perfeito e o atendimento foi excepcional...",
          trustScore: 9.2
        }
      },
      {
        id: 2, // Changed from "2" to 2
        name: "Coco Bambu",
        address: "SCES Trecho 2, Conjunto 31",
        city: "Brasília",
        country: "Brazil",
        latitude: -15.7901,
        longitude: -47.8829,
        cuisineType: "Frutos do Mar",
        priceRange: 4,
        verified: true,
        totalRecommendations: 18,
        avgTrustScore: 8.3,
        topRecommendation: {
          id: "rec-2",
          title: "Frutos do mar fresquíssimos",
          author: "Carlos Mendes",
          excerpt: "Camarão grelhado estava divino, ambiente agradável para ocasiões especiais...",
          trustScore: 8.8
        }
      },
      {
        id: 3, // Changed from "3" to 3
        name: "Parrilla Madrid",
        address: "SCLS 210, Bloco C, Loja 50",
        city: "Brasília", 
        country: "Brazil",
        latitude: -15.8301,
        longitude: -47.9234,
        cuisineType: "Steakhouse",
        priceRange: 3,
        verified: true,
        totalRecommendations: 15,
        avgTrustScore: 7.9,
        topRecommendation: {
          id: "rec-3",
          title: "Carnes premium",
          author: "Maria Costa",
          excerpt: "Picanha estava no ponto perfeito, acompanhamentos deliciosos...",
          trustScore: 8.1
        }
      },
      {
        id: 4, // Additional mock restaurant for testing
        name: "Vila do Conde",
        address: "SCLS 306, Bloco B, Loja 34",
        city: "Brasília",
        country: "Brazil",
        latitude: -15.8178,
        longitude: -47.9011,
        cuisineType: "Brasileira",
        priceRange: 2,
        verified: false,
        totalRecommendations: 8,
        avgTrustScore: 7.2,
        topRecommendation: {
          id: "rec-4",
          title: "Comida caseira deliciosa",
          author: "Pedro Santos",
          excerpt: "Ambiente familiar, pratos generosos e preço justo...",
          trustScore: 7.8
        }
      }
    ];

    // Filter mock data based on search params
    let filtered = mockRestaurants;

    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.address.toLowerCase().includes(query) ||
        r.cuisineType?.toLowerCase().includes(query)
      );
    }

    if (params.city) {
      filtered = filtered.filter(r => r.city === params.city);
    }

    if (params.cuisineType) {
      filtered = filtered.filter(r => r.cuisineType === params.cuisineType);
    }

    if (params.minTrustScore) {
      filtered = filtered.filter(r => (r.avgTrustScore || 0) >= params.minTrustScore!);
    }

    if (params.priceRange && params.priceRange.length > 0) {
      filtered = filtered.filter(r => 
        r.priceRange && params.priceRange!.includes(r.priceRange)
      );
    }

    // Calculate distance if user location provided
    if (params.userLocation) {
      filtered = filtered.map(restaurant => ({
        ...restaurant,
        distance: this.calculateDistance(
          params.userLocation!.latitude,
          params.userLocation!.longitude,
          restaurant.latitude,
          restaurant.longitude
        )
      }));
    }

    return filtered.slice(0, params.limit || 20);
  }

  // Updated to accept integer ID
  private getMockRestaurant(id: number): Restaurant | null {
    const restaurants = this.getMockRestaurants({});
    return restaurants.find(r => r.id === id) || null;
  }

  private getMockTrendingRestaurants(city?: string): Restaurant[] {
    return this.getMockRestaurants({ city, limit: 10 })
      .sort((a, b) => (b.avgTrustScore || 0) - (a.avgTrustScore || 0));
  }

  // Calculate distance between two points in kilometers
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const restaurantService = new RestaurantService();