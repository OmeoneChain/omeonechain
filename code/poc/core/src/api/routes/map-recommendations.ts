/**
 * Map Recommendations Route (UPDATED)
 * Location: code/poc/core/src/api/routes/map-recommendations.ts
 * 
 * GET /api/recommendations/map
 * Returns restaurants with recommendations for map visualization
 * 
 * Now uses correct tables:
 * - social_connections (not 'follows')
 * - taste_alignments (for similar_tastes tier)
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Similarity threshold for "similar tastes" tier (70%)
const SIMILAR_TASTES_THRESHOLD = 0.7;

/**
 * GET /map
 * Returns restaurants classified into tiers:
 * - my_network: User follows the author OR user is the author
 * - similar_tastes: Author has 70%+ taste alignment with user
 * - community: Other BocaBoca users have rated this
 * - unrated: No recommendations yet
 */
router.get('/map', async (req: Request, res: Response) => {
  try {
    // Try to get user ID if authenticated (but don't require it)
    const userId = (req as any).user?.id || null;
    const isAuthenticated = !!userId;

    console.log(`[Map API] Request received. Authenticated: ${isAuthenticated}, userId: ${userId}`);

    const { limit = '500' } = req.query;

    // Initialize social data sets
    let followedUserIds = new Set<string>();
    let similarUserIds = new Map<string, { similarity_score: number; confidence_level: number }>();

    // 1. Get user's followed users (only if authenticated)
    if (isAuthenticated && userId) {
      try {
        const { data: socialData, error: socialError } = await supabase
          .from('social_connections')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('is_active', true);
        
        if (socialError) {
          console.warn('[Map API] Social connections query error:', socialError.message);
        } else {
          followedUserIds = new Set((socialData || []).map(f => f.following_id));
          console.log(`[Map API] User follows ${followedUserIds.size} people`);
        }
      } catch (e: any) {
        console.warn('[Map API] Could not fetch social connections:', e.message);
      }

      // 2. Get users with similar taste (70%+ similarity)
      try {
        const { data: tasteData, error: tasteError } = await supabase
          .from('taste_alignments')
          .select('compared_user_id, similarity_score, confidence_level')
          .eq('user_id', userId)
          .gte('similarity_score', SIMILAR_TASTES_THRESHOLD);
        
        if (tasteError) {
          console.warn('[Map API] Taste alignments query error:', tasteError.message);
        } else {
          (tasteData || []).forEach(t => {
            similarUserIds.set(t.compared_user_id, {
              similarity_score: t.similarity_score,
              confidence_level: t.confidence_level || 0
            });
          });
          console.log(`[Map API] Found ${similarUserIds.size} users with similar taste (>= ${SIMILAR_TASTES_THRESHOLD * 100}%)`);
        }
      } catch (e: any) {
        console.warn('[Map API] Could not fetch taste alignments:', e.message);
      }
    }

    // 3. Get ALL restaurants with location data
    console.log('[Map API] Fetching restaurants...');
    const { data: allRestaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select(`
        id, 
        name, 
        latitude, 
        longitude, 
        address, 
        city, 
        cuisine_type,
        cuisine_types, 
        price_range,
        google_place_id,
        average_overall_rating,
        total_recommendations
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(Number(limit));

    if (restaurantsError) {
      console.error('[Map API] Restaurants query error:', restaurantsError);
      throw restaurantsError;
    }

    console.log(`[Map API] Found ${allRestaurants?.length || 0} restaurants with coordinates`);

    if (!allRestaurants || allRestaurants.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          tier_counts: { my_network: 0, similar_tastes: 0, community: 0, unrated: 0 },
          total: 0,
          is_personalized: isAuthenticated
        }
      });
    }

    // 4. Get recommendations for these restaurants with author info
    const restaurantIds = allRestaurants.map(r => r.id);
    
    console.log('[Map API] Fetching recommendations with author info...');
    const { data: recommendations, error: recsError } = await supabase
      .from('recommendations')
      .select(`
        id, 
        title, 
        overall_rating, 
        created_at, 
        restaurant_id, 
        author_id,
        trust_score
      `)
      .in('restaurant_id', restaurantIds)
      .order('created_at', { ascending: false });

    if (recsError) {
      console.error('[Map API] Recommendations query error:', recsError);
      throw recsError;
    }

    console.log(`[Map API] Found ${recommendations?.length || 0} recommendations`);

    // 5. Get author details for all recommendations
    const authorIds = [...new Set((recommendations || []).map(r => r.author_id).filter(Boolean))];
    let authorsMap = new Map<string, { username: string; avatar_url: string | null }>();
    
    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', authorIds);
      
      if (!authorsError && authors) {
        authors.forEach(a => {
          authorsMap.set(a.id, { username: a.username, avatar_url: a.avatar_url });
        });
      }
    }

    // 6. Group recommendations by restaurant
    const recsByRestaurant = new Map<number, any[]>();
    (recommendations || []).forEach(rec => {
      const existing = recsByRestaurant.get(rec.restaurant_id) || [];
      existing.push(rec);
      recsByRestaurant.set(rec.restaurant_id, existing);
    });

    // 7. Helper function to determine tier for a given author
    const determineTier = (authorId: string | null): {
      tier: 'my_network' | 'similar_tastes' | 'community';
      tierData: {
        social_distance?: number;
        similarity_score?: number;
        confidence_level?: number;
        trust_score: number;
      };
    } => {
      if (!authorId || !isAuthenticated) {
        return { 
          tier: 'community', 
          tierData: { trust_score: 5.0 } 
        };
      }

      // Check if it's the user's own recommendation
      if (authorId === userId) {
        return { 
          tier: 'my_network', 
          tierData: { social_distance: 0, trust_score: 10.0 } 
        };
      }

      // Check if user follows this author
      if (followedUserIds.has(authorId)) {
        return { 
          tier: 'my_network', 
          tierData: { social_distance: 1, trust_score: 8.0 } 
        };
      }

      // Check if author has similar taste
      const similarData = similarUserIds.get(authorId);
      if (similarData) {
        return { 
          tier: 'similar_tastes', 
          tierData: { 
            similarity_score: similarData.similarity_score,
            confidence_level: similarData.confidence_level,
            trust_score: 6.0 + (similarData.similarity_score * 2) // 6.0 - 8.0 based on similarity
          } 
        };
      }

      // Default to community
      return { 
        tier: 'community', 
        tierData: { trust_score: 5.0 } 
      };
    };

    // 8. Build results - one entry per restaurant
    const results: any[] = [];
    const tierCounts = {
      my_network: 0,
      similar_tastes: 0,
      community: 0,
      unrated: 0
    };

    allRestaurants.forEach(restaurant => {
      const recs = recsByRestaurant.get(restaurant.id) || [];
      
      // Determine cuisine_type (handle both single and array formats)
      const cuisineType = restaurant.cuisine_type || 
        (restaurant.cuisine_types && restaurant.cuisine_types[0]) || 
        null;

      if (recs.length === 0) {
        // Unrated restaurant
        tierCounts.unrated++;
        results.push({
          id: `unrated-${restaurant.id}`,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          google_place_id: restaurant.google_place_id,
          latitude: parseFloat(restaurant.latitude),
          longitude: parseFloat(restaurant.longitude),
          address: restaurant.address,
          city: restaurant.city,
          cuisine_type: cuisineType,
          price_range: restaurant.price_range,
          author_id: null,
          author_username: null,
          author_avatar: null,
          rating: null,
          title: null,
          created_at: null,
          tier: 'unrated' as const,
          tier_data: { trust_score: 0 },
          recommendations: []
        });
      } else {
        // Has recommendations - classify each one and determine restaurant's primary tier
        const classifiedRecs = recs.map(rec => {
          const author = authorsMap.get(rec.author_id);
          const { tier, tierData } = determineTier(rec.author_id);
          
          return {
            id: rec.id,
            author_id: rec.author_id,
            author_username: author?.username || null,
            author_avatar: author?.avatar_url || null,
            rating: rec.overall_rating,
            title: rec.title,
            created_at: rec.created_at,
            tier,
            tier_data: tierData
          };
        });

        // Restaurant's tier is the highest priority tier among its recommendations
        // Priority: my_network > similar_tastes > community
        const tierPriority = { my_network: 1, similar_tastes: 2, community: 3 };
        const bestRec = classifiedRecs.reduce((best, current) => {
          return tierPriority[current.tier] < tierPriority[best.tier] ? current : best;
        }, classifiedRecs[0]);

        tierCounts[bestRec.tier]++;

        const primaryRec = recs[0];
        const primaryAuthor = authorsMap.get(primaryRec.author_id);

        results.push({
          id: primaryRec.id,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          google_place_id: restaurant.google_place_id,
          latitude: parseFloat(restaurant.latitude),
          longitude: parseFloat(restaurant.longitude),
          address: restaurant.address,
          city: restaurant.city,
          cuisine_type: cuisineType,
          price_range: restaurant.price_range,
          author_id: primaryRec.author_id,
          author_username: primaryAuthor?.username || null,
          author_avatar: primaryAuthor?.avatar_url || null,
          rating: primaryRec.overall_rating,
          title: primaryRec.title,
          created_at: primaryRec.created_at,
          tier: bestRec.tier,
          tier_data: bestRec.tier_data,
          recommendations: classifiedRecs
        });
      }
    });

    // Sort by tier priority (my_network first, then similar_tastes, then community, then unrated)
    const finalTierPriority = { my_network: 1, similar_tastes: 2, community: 3, unrated: 4 };
    results.sort((a, b) => finalTierPriority[a.tier] - finalTierPriority[b.tier]);

    console.log(`[Map API] Returning ${results.length} restaurants. Tier breakdown:`, tierCounts);

    res.json({
      success: true,
      data: {
        recommendations: results,
        tier_counts: tierCounts,
        total: results.length,
        is_personalized: isAuthenticated
      }
    });

  } catch (error: any) {
    console.error('[Map API] Error:', error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch map data',
      details: error?.message || 'Unknown error'
    });
  }
});

export default router;