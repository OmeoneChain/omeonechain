// File: code/poc/frontend/lib/services/recommendation-service.ts
// FIXED: Schema alignment with new INTEGER restaurant_id and correct field mappings

import { createClient } from '@supabase/supabase-js';

// Create Supabase client - adjust these if your supabase.ts file exports differently
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RecommendationAuthor {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  verification_level: string;
  wallet_address: string;
  reputation_score: number;
}

export interface RecommendationRestaurant {
  id: number; // FIXED: INTEGER type to match schema
  name: string;
  address: string;
  city: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Recommendation {
  id: string;
  title: string;
  content: string; // FIXED: Changed from description to content
  trust_score: number;
  upvotes_count: number; // FIXED: Added _count suffix
  saves_count: number; // FIXED: Added _count suffix  
  tags: string[];
  photos: string[] | null;
  tokens_earned: number; // FIXED: Field name from schema
  verification_status: string;
  created_at: string;
  updated_at: string;
  // Joined data
  author: RecommendationAuthor;
  restaurant: RecommendationRestaurant;
  // Computed fields
  timeAgo?: string;
  distance?: number;
  socialConnection?: 'direct' | 'friend_of_friend' | 'none';
  personalizedTrustScore?: number;
}

export interface DiscoveryFilters {
  query?: string;
  city?: string;
  category?: string;
  authorId?: string;
  minTrustScore?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  userLocation?: { latitude: number; longitude: number };
  currentUserId?: string;
  includeFollowing?: boolean;
}

export interface DiscoveryResponse {
  recommendations: Recommendation[];
  totalCount: number;
  hasMore: boolean;
}

class RecommendationService {
  // Get recommendations for discovery feed
  async getDiscoveryRecommendations(filters: DiscoveryFilters = {}): Promise<DiscoveryResponse> {
    console.log('🔍 Fetching discovery recommendations with filters:', filters);
    
    try {
      // FIXED: Corrected foreign key references and field selections
      let query = supabase
        .from('recommendations')
        .select(`
          id,
          title,
          content,
          trust_score,
          upvotes_count,
          saves_count,
          tags,
          photos,
          total_tokens_earned,
          verification_status,
          created_at,
          updated_at,
          author:author_id(
            id,
            username,
            display_name,
            avatar_url,
            verification_level,
            wallet_address,
            reputation_score
          ),
          restaurant:restaurant_id(
            id,
            name,
            address,
            city,
            category,
            latitude,
            longitude
          )
        `)
        .eq('is_archived', false) // Only active recommendations
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,content.ilike.%${filters.query}%`);
      }

      if (filters.minTrustScore) {
        query = query.gte('trust_score', filters.minTrustScore);
      }

      if (filters.authorId) {
        query = query.eq('author_id', filters.authorId);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Supabase error fetching recommendations:', error);
        throw new Error(`Failed to fetch recommendations: ${error.message}`);
      }

      if (!data) {
        console.log('ℹ️ No recommendations found');
        return { recommendations: [], totalCount: 0, hasMore: false };
      }

      console.log(`✅ Successfully fetched ${data.length} recommendations`);

      // Process recommendations with proper field mapping
      const processedRecommendations = this.processRecommendations(data, filters);

      return {
        recommendations: processedRecommendations,
        totalCount: count || data.length,
        hasMore: (count || 0) > (offset + limit)
      };

    } catch (error) {
      console.error('❌ Error in getDiscoveryRecommendations:', error);
      // Return empty result instead of throwing to prevent UI crashes
      return { recommendations: [], totalCount: 0, hasMore: false };
    }
  }

  // Get single recommendation by ID
  async getRecommendationById(id: string): Promise<Recommendation | null> {
    console.log('🔍 Fetching recommendation by ID:', id);
    
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id,
          title,
          content,
          trust_score,
          upvotes_count,
          saves_count,
          tags,
          photos,
          total_tokens_earned,
          verification_status,
          created_at,
          updated_at,
          author:author_id(
            id,
            username,
            display_name,
            avatar_url,
            verification_level,
            wallet_address,
            reputation_score
          ),
          restaurant:restaurant_id(
            id,
            name,
            address,
            city,
            category,
            latitude,
            longitude
          )
        `)
        .eq('id', id)
        .eq('is_archived', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Recommendation not found:', id);
          return null;
        }
        console.error('❌ Error fetching recommendation:', error);
        return null; // Return null instead of throwing
      }

      if (!data) {
        return null;
      }

      console.log('✅ Fetched recommendation:', data.title);
      
      // Process single recommendation
      const processed = this.processRecommendations([data], {});
      return processed[0] || null;

    } catch (error) {
      console.error('❌ Error in getRecommendationById:', error);
      return null; // Return null instead of throwing
    }
  }

  // Get trending recommendations
  async getTrendingRecommendations(limit: number = 10): Promise<Recommendation[]> {
    console.log('🔥 Fetching trending recommendations');
    
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id,
          title,
          content,
          trust_score,
          upvotes_count,
          saves_count,
          tags,
          photos,
          total_tokens_earned,
          verification_status,
          created_at,
          updated_at,
          author:author_id(
            id,
            username,
            display_name,
            avatar_url,
            verification_level,
            wallet_address,
            reputation_score
          ),
          restaurant:restaurant_id(
            id,
            name,
            address,
            city,
            category,
            latitude,
            longitude
          )
        `)
        .eq('is_archived', false)
        .gte('trust_score', 5.0) // Moderate quality threshold
        .gte('upvotes_count', 1) // At least some engagement
        .order('upvotes_count', { ascending: false })
        .order('trust_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching trending recommendations:', error);
        return []; // Return empty array instead of throwing
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No trending recommendations found');
        return [];
      }

      console.log(`✅ Fetched ${data.length} trending recommendations`);
      
      // Process recommendations
      const processed = this.processRecommendations(data, {});
      return processed;

    } catch (error) {
      console.error('❌ Error in getTrendingRecommendations:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Private helper methods
  private processRecommendations(data: any[], filters: DiscoveryFilters): Recommendation[] {
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ Invalid data provided to processRecommendations');
      return [];
    }

    return data.map(item => {
      // Handle potential null/undefined values gracefully
      const recommendation: Recommendation = {
        id: item.id,
        title: item.title || 'Untitled Recommendation',
        content: item.content || '',
        trust_score: item.trust_score || 0,
        upvotes_count: item.upvotes_count || 0,
        saves_count: item.saves_count || 0,
        tags: item.tags || [],
        photos: item.photos || [],
        tokens_earned: item.total_tokens_earned || 0,
        verification_status: item.verification_status || 'unverified',
        created_at: item.created_at,
        updated_at: item.updated_at,
        author: {
          id: item.author?.id || '',
          username: item.author?.username || null,
          display_name: item.author?.display_name || 'Anonymous',
          avatar_url: item.author?.avatar_url || null,
          verification_level: item.author?.verification_level || 'basic',
          wallet_address: item.author?.wallet_address || '',
          reputation_score: item.author?.reputation_score || 0
        },
        restaurant: {
          id: item.restaurant?.id || 0,
          name: item.restaurant?.name || 'Unknown Restaurant',
          address: item.restaurant?.address || '',
          city: item.restaurant?.city || '',
          category: item.restaurant?.category || null,
          latitude: item.restaurant?.latitude || null,
          longitude: item.restaurant?.longitude || null
        },
        timeAgo: this.formatTimeAgo(item.created_at)
      };

      // Calculate distance if user location provided
      if (filters.userLocation && item.restaurant?.latitude && item.restaurant?.longitude) {
        recommendation.distance = this.calculateDistance(
          filters.userLocation.latitude,
          filters.userLocation.longitude,
          item.restaurant.latitude,
          item.restaurant.longitude
        );
      }

      return recommendation;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private formatTimeAgo(dateString: string): string {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h`;
      } else if (diffInDays < 30) {
        return `${diffInDays}d`;
      } else {
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      }
    } catch (error) {
      console.warn('⚠️ Error formatting time ago:', error);
      return 'Unknown';
    }
  }

  // Test connection method for debugging
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Supabase connection...');
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        return false;
      }
      
      console.log('✅ Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return false;
    }
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;