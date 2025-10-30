// File: code/poc/core/src/api/routes/restaurants.ts
// Express-based Restaurant API Routes with Tiered Recommendations

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../../middleware/auth';

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// =============================================================================
// INTERFACES
// =============================================================================

interface TieredRecommendation {
  id: string;
  rating: number;
  reviewText: string;
  dishRecommendations: Array<{
    dishName: string;
    rating: number;
    notes?: string;
  }>;
  contextTags: string[];
  createdAt: string;
  recommender: {
    id: string;
    displayName: string;
    avatar?: string;
    isAnonymized: boolean;
    tasteMatch?: number;
    socialDistance?: number;
    credibility?: {
      totalRecommendations: number;
      avgTrustScore: number;
      specialties: string[];
    };
  };
  tier: 1 | 2 | 3;
}

interface DishRating {
  dishName: string;
  avgRating: number;
  recommendationCount: number;
  topRecommenders: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper: Get user's social connections
async function getUserSocialConnections(userId: string): Promise<Set<string>> {
  const { data: connections, error } = await supabase
    .from('social_connections')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching social connections:', error);
    return new Set();
  }

  return new Set(connections?.map(c => c.following_id) || []);
}

// Helper: Get taste alignments for a user
async function getTasteAlignments(userId: string): Promise<Map<string, number>> {
  const { data: alignments, error } = await supabase
    .from('taste_alignments')
    .select('compared_user_id, similarity_score')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching taste alignments:', error);
    return new Map();
  }

  const alignmentMap = new Map<string, number>();
  alignments?.forEach(a => {
    alignmentMap.set(a.compared_user_id, a.similarity_score);
  });

  return alignmentMap;
}

// Helper: Get user's credibility stats
async function getUserCredibility(userId: string) {
  const { data: recommendations, error: recError } = await supabase
    .from('recommendations')
    .select('trust_score, cuisine_type')
    .eq('author_id', userId);

  if (recError || !recommendations) {
    return {
      totalRecommendations: 0,
      avgTrustScore: 0,
      specialties: []
    };
  }

  // Calculate average trust score
  const avgTrustScore = recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + (r.trust_score || 0), 0) / recommendations.length
    : 0;

  // Get top 3 cuisine specialties
  const cuisineCounts = recommendations.reduce((acc, r) => {
    if (r.cuisine_type) {
      acc[r.cuisine_type] = (acc[r.cuisine_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const specialties = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  return {
    totalRecommendations: recommendations.length,
    avgTrustScore: Math.round(avgTrustScore * 10) / 10,
    specialties
  };
}

// =============================================================================
// ROUTES
// =============================================================================

// Helper: Fetch Google Places data
async function fetchGooglePlacesData(restaurantName: string, address: string, latitude: number, longitude: number) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('⚠️ Google Places API key not configured');
    return null;
  }

  try {
    // Use Nearby Search to find the place
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50&keyword=${encodeURIComponent(restaurantName)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log('📍 No Google Places results found for:', restaurantName);
      return null;
    }

    const place = searchData.results[0];

    // Get place details for more info
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=rating,user_ratings_total,formatted_phone_number,website,opening_hours&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return {
        rating: place.rating || null,
        reviewCount: place.user_ratings_total || null,
        placeId: place.place_id
      };
    }

    return {
      rating: detailsData.result.rating || null,
      reviewCount: detailsData.result.user_ratings_total || null,
      phone: detailsData.result.formatted_phone_number || null,
      website: detailsData.result.website || null,
      placeId: place.place_id
    };

  } catch (error) {
    console.error('❌ Error fetching Google Places data:', error);
    return null;
  }
}

// GET /api/restaurants/:id - Get restaurant details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.query.userId as string;

    console.log('🏪 Fetching restaurant details:', { restaurantId, userId });

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:recommendations(count)
      `)
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      return res.status(404).json({
        error: 'Restaurant not found'
      });
    }

    // Fetch Google Places data if coordinates available
    let googleData = null;
    if (restaurant.latitude && restaurant.longitude) {
      googleData = await fetchGooglePlacesData(
        restaurant.name,
        restaurant.address,
        restaurant.latitude,
        restaurant.longitude
      );
    }

    // Calculate average trust score from all recommendations
    const { data: recTrustScores, error: trustError } = await supabase
      .from('recommendations')
      .select('trust_score')
      .eq('restaurant_id', restaurantId)
      .not('trust_score', 'is', null);

    let avgTrustScore = 0;
    if (!trustError && recTrustScores && recTrustScores.length > 0) {
      const totalTrustScore = recTrustScores.reduce((sum, rec) => sum + (rec.trust_score || 0), 0);
      avgTrustScore = totalTrustScore / recTrustScores.length;
      // Convert from 0-1 scale to 0-10 scale for display
      avgTrustScore = avgTrustScore * 10;
      avgTrustScore = Math.round(avgTrustScore * 10) / 10; // Round to 1 decimal place
    }

    const formattedRestaurant = {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      cuisineType: restaurant.category,
      priceRange: undefined, // Add when schema supports it
      phone: restaurant.phone || googleData?.phone,
      website: restaurant.website || googleData?.website,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      avgTrustScore: avgTrustScore,
      totalRecommendations: restaurant.recommendations?.[0]?.count || 0,
      googleRating: googleData?.rating || null,
      googleReviewCount: googleData?.reviewCount || null
    };

    console.log('✅ Restaurant fetched with avgTrustScore:', avgTrustScore, '(from', recTrustScores?.length, 'recommendations)');

    return res.json({
      success: true,
      restaurant: formattedRestaurant
    });

  } catch (error) {
    console.error('❌ Error fetching restaurant:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// GET /api/restaurants/:id/recommendations - Get tiered recommendations
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'userId query parameter is required'
      });
    }

    console.log('🎯 Fetching tiered recommendations:', { restaurantId, userId });

    // Step 1: Get user's own recommendations for this restaurant
    const { data: userRecommendations, error: userRecError } = await supabase
      .from('recommendations')
      .select(`
        id,
        overall_rating,
        content,
        context_tags,
        created_at,
        author_id,
        users!inner(
          id,
          display_name,
          username
        ),
        dishes(
          name,
          rating,
          notes
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (userRecError) {
      console.error('Error fetching user recommendations:', userRecError);
    }

    console.log('📝 User own recommendations:', {
      found: userRecommendations?.length || 0,
      userId,
      restaurantId
    });

    // Format user's own reviews
    let userOwnReviews = null;
    if (userRecommendations && userRecommendations.length > 0) {
      const mostRecent = userRecommendations[0];
      const olderReviews = userRecommendations.slice(1);

      userOwnReviews = {
        mostRecent: {
          id: mostRecent.id,
          rating: mostRecent.overall_rating || 0,
          reviewText: mostRecent.content || '',
          dishRecommendations: (mostRecent.dishes || []).map((d: any) => ({
            dishName: d.name,
            rating: d.rating,
            notes: d.notes
          })),
          contextTags: mostRecent.context_tags || [],
          createdAt: mostRecent.created_at
        },
        totalReviews: userRecommendations.length,
        olderReviews: olderReviews.map(review => ({
          id: review.id,
          rating: review.overall_rating || 0,
          createdAt: review.created_at
        }))
      };
    }

    // Step 2: Get all OTHER users' recommendations for this restaurant
    const { data: recommendations, error: recError } = await supabase
      .from('recommendations')
      .select(`
        id,
        overall_rating,
        content,
        context_tags,
        created_at,
        author_id,
        trust_score,
        users!inner(
          id,
          display_name,
          username
        ),
        dishes(
          name,
          rating,
          notes
        )
      `)
      .eq('restaurant_id', restaurantId)
      .neq('author_id', userId) // Exclude user's own recommendations
      .order('created_at', { ascending: false });

    if (recError) {
      console.error('Error fetching recommendations:', recError);
      return res.status(500).json({
        error: 'Failed to fetch recommendations: ' + recError.message
      });
    }

    if (!recommendations || recommendations.length === 0) {
      return res.json({
        success: true,
        userOwnReviews,
        tier1: [],
        tier2: [],
        tier3: [],
        totalCount: 0
      });
    }

    // Step 3: Get user's social connections and taste alignments
    const [socialConnections, tasteAlignments] = await Promise.all([
      getUserSocialConnections(userId),
      getTasteAlignments(userId)
    ]);

    console.log('📊 User context:', {
      connectionsCount: socialConnections.size,
      alignmentsCount: tasteAlignments.size
    });

    // Step 4: Categorize recommendations into tiers
    const tier1: TieredRecommendation[] = [];
    const tier2: TieredRecommendation[] = [];
    const tier3: TieredRecommendation[] = [];

    for (const rec of recommendations) {
      const isFriend = socialConnections.has(rec.author_id);
      const tasteMatch = tasteAlignments.get(rec.author_id);
      const tasteMatchPercent = tasteMatch ? Math.round(tasteMatch * 100) : 0;

      // Determine tier
      let tier: 1 | 2 | 3;
      let isAnonymized = false;

      if (isFriend && tasteMatchPercent >= 70) {
        // Tier 1: Friends with good taste alignment
        tier = 1;
      } else if (!isFriend && tasteMatchPercent >= 80) {
        // Tier 2: High taste match strangers (anonymized)
        tier = 2;
        isAnonymized = true;
      } else if (isFriend) {
        // Tier 3: Friends with lower taste match
        tier = 3;
      } else {
        // Skip: strangers with low taste match
        continue;
      }

      // Get user credibility for tier 2
      let credibility;
      if (tier === 2) {
        credibility = await getUserCredibility(rec.author_id);
      }

      // Build recommendation object
      const tieredRec: TieredRecommendation = {
        id: rec.id,
        rating: rec.overall_rating || 0,
        reviewText: rec.content || '',
        dishRecommendations: (rec.dishes || []).map((d: any) => ({
          dishName: d.name,
          rating: d.rating,
          notes: d.notes
        })),
        contextTags: rec.context_tags || [],
        createdAt: rec.created_at,
        recommender: {
          id: isAnonymized ? 'anonymous' : rec.author_id,
          displayName: isAnonymized 
            ? `Anonymous user with ${tasteMatchPercent}% taste match`
            : (rec.users.display_name || rec.users.username || 'User'),
          isAnonymized,
          tasteMatch: tasteMatchPercent,
          socialDistance: isFriend ? 1 : undefined,
          credibility
        },
        tier
      };

      // Add to appropriate tier
      if (tier === 1) tier1.push(tieredRec);
      else if (tier === 2) tier2.push(tieredRec);
      else tier3.push(tieredRec);
    }

    // Step 5: Sort each tier by taste match
    const sortByTasteMatch = (a: TieredRecommendation, b: TieredRecommendation) => {
      return (b.recommender.tasteMatch || 0) - (a.recommender.tasteMatch || 0);
    };

    tier1.sort(sortByTasteMatch);
    tier2.sort(sortByTasteMatch);
    tier3.sort(sortByTasteMatch);

    console.log('✅ Tiered recommendations:', {
      userOwnReviews: userOwnReviews ? userOwnReviews.totalReviews : 0,
      tier1: tier1.length,
      tier2: tier2.length,
      tier3: tier3.length,
      total: tier1.length + tier2.length + tier3.length
    });

    return res.json({
      success: true,
      userOwnReviews,
      tier1,
      tier2,
      tier3,
      totalCount: tier1.length + tier2.length + tier3.length
    });

  } catch (error) {
    console.error('❌ Error in tiered recommendations:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// GET /api/restaurants/:id/dishes - Get aggregated dish ratings by taste similarity
router.get('/:id/dishes', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.query.userId as string;

    console.log('🍽️ Fetching dish ratings:', { restaurantId, userId });

    // Step 1: Get all recommendations with dishes for this restaurant
    const { data: recommendations, error: recError } = await supabase
      .from('recommendations')
      .select(`
        id,
        author_id,
        users!inner(display_name, username),
        dishes!inner(name, rating)
      `)
      .eq('restaurant_id', restaurantId);

    if (recError) {
      console.error('Error fetching dishes:', recError);
      return res.status(500).json({
        error: 'Failed to fetch dishes: ' + recError.message
      });
    }

    if (!recommendations || recommendations.length === 0) {
      return res.json({
        success: true,
        dishes: []
      });
    }

    // Step 2: Get taste alignments if userId provided
    let tasteAlignments = new Map<string, number>();
    if (userId) {
      tasteAlignments = await getTasteAlignments(userId);
    }

    // Step 3: Aggregate dish ratings
    const dishMap = new Map<string, {
      ratings: number[];
      recommenders: Set<string>;
      totalRating: number;
      count: number;
    }>();

    for (const rec of recommendations) {
      // Skip user's own recommendations
      if (userId && rec.author_id === userId) continue;

      // If userId provided, only include recommendations from users with taste alignment
      if (userId && !tasteAlignments.has(rec.author_id)) continue;

      const dishes = rec.dishes || [];
      for (const dish of dishes) {
        if (!dishMap.has(dish.name)) {
          dishMap.set(dish.name, {
            ratings: [],
            recommenders: new Set(),
            totalRating: 0,
            count: 0
          });
        }

        const dishData = dishMap.get(dish.name)!;
        dishData.ratings.push(dish.rating);
        dishData.recommenders.add(rec.users.display_name || rec.users.username || 'User');
        dishData.totalRating += dish.rating;
        dishData.count += 1;
      }
    }

    // Step 4: Format response
    const dishRatings: DishRating[] = Array.from(dishMap.entries()).map(([dishName, data]) => {
      const avgRating = data.totalRating / data.count;
      const topRecommenders = Array.from(data.recommenders).slice(0, 3);
      
      // Add "X others" if more recommenders exist
      const remainingCount = data.recommenders.size - 3;
      if (remainingCount > 0) {
        topRecommenders.push(`${remainingCount} other${remainingCount > 1 ? 's' : ''}`);
      }

      return {
        dishName,
        avgRating: Math.round(avgRating * 10) / 10,
        recommendationCount: data.count,
        topRecommenders
      };
    });

    // Sort by average rating (highest first)
    dishRatings.sort((a, b) => b.avgRating - a.avgRating);

    console.log('✅ Dish ratings aggregated:', dishRatings.length);

    return res.json({
      success: true,
      dishes: dishRatings
    });

  } catch (error) {
    console.error('❌ Error aggregating dishes:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// POST /api/restaurants - Create new restaurant (authenticated)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      latitude,
      longitude,
      category,
      description
    } = req.body;

    const userId = req.user!.id;

    // Validation
    if (!name || !address || !city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, address, city, latitude, longitude'
      });
    }

    console.log('🏪 Creating restaurant:', { name, city, userId });

    // Check for nearby duplicates (within 100m)
    const { data: nearbyRestaurants } = await supabase
      .rpc('find_restaurants_by_name_and_location', {
        restaurant_name: name,
        lat: latitude,
        lng: longitude,
        radius_meters: 100
      });

    if (nearbyRestaurants && nearbyRestaurants.length > 0) {
      return res.status(409).json({
        error: 'A similar restaurant already exists nearby',
        existing: nearbyRestaurants[0]
      });
    }

    // Create restaurant
    const { data: newRestaurant, error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        category: category?.trim(),
        description: description?.trim(),
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating restaurant:', insertError);
      return res.status(500).json({
        error: 'Failed to create restaurant: ' + insertError.message
      });
    }

    console.log('✅ Restaurant created:', newRestaurant.id);

    return res.json({
      success: true,
      restaurant: newRestaurant
    });

  } catch (error) {
    console.error('❌ Error creating restaurant:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// GET /api/restaurants - Search restaurants
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      city,
      category,
      limit = '20',
      offset = '0'
    } = req.query;

    console.log('🔍 Searching restaurants:', { search, city, category });

    let query = supabase
      .from('restaurants')
      .select('*, recommendations:recommendations(count)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    if (city && typeof city === 'string') {
      query = query.eq('city', city);
    }

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    // Pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: restaurants, error, count } = await query;

    if (error) {
      console.error('Error searching restaurants:', error);
      return res.status(500).json({
        error: 'Failed to search restaurants: ' + error.message
      });
    }

    console.log(`✅ Found ${restaurants?.length || 0} restaurants`);

    return res.json({
      success: true,
      restaurants: restaurants || [],
      total: count || 0,
      limit: limitNum,
      offset: offsetNum
    });

  } catch (error) {
    console.error('❌ Error searching restaurants:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

export default router;