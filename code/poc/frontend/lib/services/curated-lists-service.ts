// File: code/poc/frontend/lib/services/curated-lists-service.ts
// Service for managing curated lists and their restaurant items

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CuratedListAuthor {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  verification_level: string;
}

export interface CuratedListRestaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  notes?: string; // From curated_list_items
  sort_order?: number;
}

export interface CuratedList {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string;
  tags: string[];
  context_description: string | null;
  best_for: string | null;
  saves_count: number;
  view_count: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  author: CuratedListAuthor;
  restaurants: CuratedListRestaurant[];
  restaurant_count?: number;
}

export interface CuratedListsFilters {
  city?: string;
  category?: string;
  featured_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface CuratedListsResponse {
  lists: CuratedList[];
  totalCount: number;
  hasMore: boolean;
}

class CuratedListsService {
  
  // Get curated lists for discovery
  async getCuratedLists(filters: CuratedListsFilters = {}): Promise<CuratedListsResponse> {
    console.log('📋 Fetching curated lists with filters:', filters);
    
    try {
      let query = supabase
        .from('curated_lists')
        .select(`
          id,
          title,
          description,
          category,
          city,
          tags,
          context_description,
          best_for,
          saves_count,
          view_count,
          is_featured,
          is_public,
          created_at,
          updated_at,
          author:author_id(
            id,
            username,
            display_name,
            avatar_url,
            verification_level
          )
        `)
        .eq('is_public', true)
        .order('is_featured', { ascending: false })
        .order('saves_count', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.featured_only) {
        query = query.eq('is_featured', true);
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching curated lists:', error);
        return { lists: [], totalCount: 0, hasMore: false };
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No curated lists found');
        return { lists: [], totalCount: 0, hasMore: false };
      }

      console.log(`✅ Fetched ${data.length} curated lists`);

      // Get restaurant details for each list
      const listsWithRestaurants = await Promise.all(
        data.map(async (list) => await this.enrichListWithRestaurants(list))
      );

      return {
        lists: listsWithRestaurants,
        totalCount: count || data.length,
        hasMore: (count || 0) > (offset + limit)
      };

    } catch (error) {
      console.error('❌ Error in getCuratedLists:', error);
      return { lists: [], totalCount: 0, hasMore: false };
    }
  }

  // Get featured curated lists for discovery homepage
  async getFeaturedLists(limit: number = 5): Promise<CuratedList[]> {
    console.log('⭐ Fetching featured curated lists');
    
    const result = await this.getCuratedLists({
      featured_only: true,
      limit
    });

    return result.lists;
  }

  // Get single curated list by ID
  async getCuratedListById(id: string): Promise<CuratedList | null> {
    console.log('📋 Fetching curated list by ID:', id);
    
    try {
      const { data, error } = await supabase
        .from('curated_lists')
        .select(`
          id,
          title,
          description,
          category,
          city,
          tags,
          context_description,
          best_for,
          saves_count,
          view_count,
          is_featured,
          is_public,
          created_at,
          updated_at,
          author:author_id(
            id,
            username,
            display_name,
            avatar_url,
            verification_level
          )
        `)
        .eq('id', id)
        .eq('is_public', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Curated list not found:', id);
          return null;
        }
        console.error('❌ Error fetching curated list:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Increment view count
      await this.incrementViewCount(id);

      // Get restaurants for this list
      const enrichedList = await this.enrichListWithRestaurants(data);
      
      console.log('✅ Fetched curated list:', data.title);
      return enrichedList;

    } catch (error) {
      console.error('❌ Error in getCuratedListById:', error);
      return null;
    }
  }

  // Get curated lists by category for discovery filtering
  async getCuratedListsByCategory(category: string, limit: number = 10): Promise<CuratedList[]> {
    console.log('🏷️ Fetching curated lists by category:', category);
    
    const result = await this.getCuratedLists({
      category,
      limit
    });

    return result.lists;
  }

  // Private helper to enrich lists with restaurant data
  private async enrichListWithRestaurants(listData: any): Promise<CuratedList> {
    try {
      // Get restaurants for this list
      const { data: restaurantItems, error } = await supabase
        .from('curated_list_items')
        .select(`
          notes,
          sort_order,
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
        .eq('list_id', listData.id)
        .order('sort_order', { ascending: true })
        .order('added_at', { ascending: true });

      if (error) {
        console.warn('⚠️ Error fetching restaurants for list:', listData.id, error);
      }

      const restaurants: CuratedListRestaurant[] = (restaurantItems || [])
        .filter(item => item.restaurant) // Filter out items with null restaurants
        .map(item => ({
          id: item.restaurant.id,
          name: item.restaurant.name,
          address: item.restaurant.address,
          city: item.restaurant.city,
          category: item.restaurant.category,
          latitude: item.restaurant.latitude,
          longitude: item.restaurant.longitude,
          notes: item.notes,
          sort_order: item.sort_order
        }));

      // Build complete curated list object
      const curatedList: CuratedList = {
        id: listData.id,
        title: listData.title,
        description: listData.description,
        category: listData.category,
        city: listData.city,
        tags: listData.tags || [],
        context_description: listData.context_description,
        best_for: listData.best_for,
        saves_count: listData.saves_count || 0,
        view_count: listData.view_count || 0,
        is_featured: listData.is_featured || false,
        is_public: listData.is_public || true,
        created_at: listData.created_at,
        updated_at: listData.updated_at,
        author: {
          id: listData.author?.id || '',
          username: listData.author?.username || null,
          display_name: listData.author?.display_name || 'Anonymous',
          avatar_url: listData.author?.avatar_url || null,
          verification_level: listData.author?.verification_level || 'basic'
        },
        restaurants,
        restaurant_count: restaurants.length
      };

      return curatedList;

    } catch (error) {
      console.error('❌ Error enriching list with restaurants:', error);
      
      // Return basic list without restaurants if enrichment fails
      return {
        id: listData.id,
        title: listData.title,
        description: listData.description,
        category: listData.category,
        city: listData.city,
        tags: listData.tags || [],
        context_description: listData.context_description,
        best_for: listData.best_for,
        saves_count: listData.saves_count || 0,
        view_count: listData.view_count || 0,
        is_featured: listData.is_featured || false,
        is_public: listData.is_public || true,
        created_at: listData.created_at,
        updated_at: listData.updated_at,
        author: {
          id: listData.author?.id || '',
          username: listData.author?.username || null,
          display_name: listData.author?.display_name || 'Anonymous',
          avatar_url: listData.author?.avatar_url || null,
          verification_level: listData.author?.verification_level || 'basic'
        },
        restaurants: [],
        restaurant_count: 0
      };
    }
  }

  // Private helper to increment view count
  private async incrementViewCount(listId: string): Promise<void> {
    try {
      await supabase
        .from('curated_lists')
        .update({ 
          view_count: supabase.raw('view_count + 1') 
        })
        .eq('id', listId);
    } catch (error) {
      console.warn('⚠️ Failed to increment view count:', error);
      // Don't throw - this is not critical
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing curated lists connection...');
      const { data, error } = await supabase
        .from('curated_lists')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Curated lists connection test failed:', error);
        return false;
      }
      
      console.log('✅ Curated lists connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Curated lists connection test error:', error);
      return false;
    }
  }
}

export const curatedListsService = new CuratedListsService();
export default curatedListsService;