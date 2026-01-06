// File: code/poc/core/src/api/routes/restaurants.ts
// Express-based Restaurant API Routes with Tiered Recommendations

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { createRestaurantService } from '../../services/restaurant-service';
import { Pool } from 'pg';
import { getGooglePlacesCacheService } from '../../services/google-places-cache';

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Initialize restaurant service for Google Places integration
let restaurantService: ReturnType<typeof createRestaurantService> | null = null;

// Middleware to initialize service
router.use(async (req, res, next) => {
  if (!restaurantService && req.app.locals.db) {
    try {
      restaurantService = createRestaurantService(req.app.locals.db as Pool);
      console.log('✅ Restaurant service initialized for Google Places');
    } catch (error) {
      console.error('❌ Failed to initialize restaurant service:', error);
    }
  }
  next();
});

// =============================================================================
// INTERFACES
// =============================================================================

interface RestaurantPhoto {
  id: string;
  ipfsHash: string;
  tagType: string | null;
  dishName: string | null;
  caption: string | null;
  helpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatar?: string;
  };
  recommendationId: string;
  userHasMarkedHelpful?: boolean;
}

interface PopularDish {
  dishName: string;
  photoCount: number;
  recommendationCount: number;
  totalHelpful: number;
  thumbnailHash: string;
}

interface NetworkRecommendation {
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
  author: {
    id: string;
    displayName: string;
    username: string;
    avatar?: string;
  };
  // Relationship flags for frontend categorization
  is_friend: boolean;        // Mutual follow
  is_following: boolean;     // User follows this author
  is_followed_by: boolean;   // This author follows user
  taste_alignment: number;   // 0-1 scale
  // Additional metadata
  trust_score?: number;
  engagement?: {
    saves: number;
    comments: number;
    helpful: number;
  };
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

/**
 * Get BIDIRECTIONAL social connections for a user
 * Returns: { following: Set<userId>, followers: Set<userId>, mutuals: Set<userId> }
 */
async function getBidirectionalConnections(userId: string): Promise<{
  following: Set<string>;
  followers: Set<string>;
  mutuals: Set<string>;
}> {
  // Get who user follows
  const { data: followingData, error: followingError } = await supabase
    .from('social_connections')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('is_active', true);

  if (followingError) {
    console.error('Error fetching following:', followingError);
  }

  // Get who follows user
  const { data: followersData, error: followersError } = await supabase
    .from('social_connections')
    .select('follower_id')
    .eq('following_id', userId)
    .eq('is_active', true);

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  const following = new Set<string>(followingData?.map(c => c.following_id) || []);
  const followers = new Set<string>(followersData?.map(c => c.follower_id) || []);
  
  // Mutuals are intersection of following and followers
  const mutuals = new Set<string>();
  following.forEach(id => {
    if (followers.has(id)) {
      mutuals.add(id);
    }
  });

  console.log('📊 Bidirectional connections:', {
    following: following.size,
    followers: followers.size,
    mutuals: mutuals.size
  });

  return { following, followers, mutuals };
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

/**
 * GET /api/restaurants/autocomplete
 * Autocomplete restaurant names as user types
 */
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { input, lat, lng } = req.query;

    // Validation
    if (!input || typeof input !== 'string' || input.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Input must be at least 2 characters'
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude and longitude required'
      });
    }

    if (!restaurantService) {
      return res.status(500).json({
        success: false,
        error: 'Restaurant service not initialized'
      });
    }

    console.log(`🔍 Autocomplete: "${input}" near (${latitude}, ${longitude})`);

    const suggestions = await restaurantService.autocompleteRestaurants(
      input,
      latitude,
      longitude
    );

    return res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('❌ Autocomplete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to autocomplete restaurants',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/restaurants/from-external
 * Create restaurant in database from Google Place ID
 */
router.post('/from-external', async (req: Request, res: Response) => {
  try {
    const { external_id, city } = req.body;

    if (!external_id || typeof external_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'external_id is required'
      });
    }

    if (!restaurantService) {
      return res.status(500).json({
        success: false,
        error: 'Restaurant service not initialized'
      });
    }

    console.log(`🏪 Creating restaurant from Google Place ID: ${external_id}`);

    const restaurant = await restaurantService.findOrCreateFromExternalProvider(
      external_id,
      city
    );

    return res.json({
      success: true,
      restaurant,
      message: 'Restaurant created/retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Create from external error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create restaurant from external provider',
      message: (error as Error).message
    });
  }
});

// GET /api/restaurants/:id - Get restaurant details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.query.userId as string;

    console.log('🏪 Fetching restaurant details:', { restaurantId, userId });

    // Use the cache service to get restaurant with Google data
    const cacheService = getGooglePlacesCacheService();
    const restaurant = await cacheService.getRestaurantDetails(restaurantId.toString());

    if (!restaurant) {
      return res.status(404).json({
        error: 'Restaurant not found'
      });
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
      avgTrustScore = avgTrustScore * 10;
      avgTrustScore = Math.round(avgTrustScore * 10) / 10;
    }

    // Get recommendation count
    const { count: totalRecommendations } = await supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    // Get photo count from restaurant_photos
    const { count: totalPhotos } = await supabase
      .from('restaurant_photos')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    const formattedRestaurant = {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.formatted_address || restaurant.address,
      city: restaurant.city,
      cuisineType: restaurant.category,
      cuisineTypes: restaurant.cuisine_types,
      priceRange: restaurant.price_range,
      priceLevel: restaurant.price_level,
      phone: restaurant.phone,
      website: restaurant.website,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      avgTrustScore: avgTrustScore,
      totalRecommendations: totalRecommendations || 0,
      totalPhotos: totalPhotos || 0,
      googleRating: restaurant.google_rating,
      googleReviewCount: restaurant.google_review_count,
      // Metadata
      googleDataFetchedAt: restaurant.google_data_fetched_at,
      googlePlaceId: restaurant.google_place_id
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

// =============================================================================
// PHOTO GALLERY ENDPOINTS
// =============================================================================

/**
 * GET /api/restaurants/:id/photos
 * Get all community photos for a restaurant with user attribution
 * Query params:
 *   - limit (default 20)
 *   - offset (default 0)
 *   - dish_name (optional filter)
 *   - userId (optional - to check if user has marked photos helpful)
 */
router.get('/:id/photos', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const {
      limit = '20',
      offset = '0',
      dish_name,
      userId
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const offsetNum = parseInt(offset as string) || 0;

    console.log('📷 Fetching restaurant photos:', { 
      restaurantId, 
      limit: limitNum, 
      offset: offsetNum, 
      dish_name,
      userId 
    });

    // Build query
    let query = supabase
      .from('restaurant_photos')
      .select(`
        id,
        ipfs_hash,
        tag_type,
        dish_name,
        caption,
        helpful_count,
        created_at,
        recommendation_id,
        user_id,
        users!user_id(
          id,
          display_name,
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Apply dish name filter if provided
    if (dish_name && typeof dish_name === 'string') {
      query = query.eq('dish_name', dish_name);
    }

    const { data: photos, error: photosError, count } = await query;

    if (photosError) {
      console.error('❌ Error fetching photos:', photosError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch photos: ' + photosError.message
      });
    }

    // If userId provided, check which photos user has marked helpful
    let userHelpfulSet = new Set<string>();
    if (userId && typeof userId === 'string' && photos && photos.length > 0) {
      const photoIds = photos.map(p => p.id);
      const { data: helpfulMarks } = await supabase
        .from('restaurant_photo_helpful')
        .select('photo_id')
        .eq('user_id', userId)
        .in('photo_id', photoIds);

      if (helpfulMarks) {
        userHelpfulSet = new Set(helpfulMarks.map(h => h.photo_id));
      }
    }

    // Format response - ensure tagType is included
    const formattedPhotos: RestaurantPhoto[] = (photos || []).map(photo => ({
      id: photo.id,
      ipfsHash: photo.ipfs_hash,
      tagType: photo.tag_type || 'other',  // Include tag type with fallback
      dishName: photo.dish_name,
      caption: photo.caption,
      helpfulCount: photo.helpful_count || 0,
      createdAt: photo.created_at,
      recommendationId: photo.recommendation_id,
      user: {
        id: photo.users.id,
        displayName: photo.users.display_name || photo.users.username || 'BocaBoca Member',
        username: photo.users.username || '',
        avatar: photo.users.avatar_url
      },
      userHasMarkedHelpful: userId ? userHelpfulSet.has(photo.id) : undefined
    }));

    console.log(`✅ Fetched ${formattedPhotos.length} photos for restaurant ${restaurantId}`);

    return res.json({
      success: true,
      photos: formattedPhotos,
      total: count || 0,
      limit: limitNum,
      offset: offsetNum
    });

  } catch (error) {
    console.error('❌ Error in restaurant photos:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

/**
 * GET /api/restaurants/:id/popular-dishes
 * Get popular dishes with photo thumbnails for "Popular dishes" section
 * Uses the restaurant_popular_dishes view
 */
router.get('/:id/popular-dishes', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const { limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 20);

    console.log('🍽️ Fetching popular dishes with photos:', { restaurantId, limit: limitNum });

    const { data: dishes, error } = await supabase
      .from('restaurant_popular_dishes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('recommendation_count', { ascending: false })
      .limit(limitNum);

    if (error) {
      console.error('❌ Error fetching popular dishes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch popular dishes: ' + error.message
      });
    }

    // Format response
    const formattedDishes: PopularDish[] = (dishes || []).map(dish => ({
      dishName: dish.dish_name,
      photoCount: dish.photo_count || 0,
      recommendationCount: dish.recommendation_count || 0,
      totalHelpful: dish.total_helpful || 0,
      thumbnailHash: dish.thumbnail_hash
    }));

    console.log(`✅ Found ${formattedDishes.length} popular dishes for restaurant ${restaurantId}`);

    return res.json({
      success: true,
      dishes: formattedDishes
    });

  } catch (error) {
    console.error('❌ Error in popular dishes:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

/**
 * POST /api/restaurants/:id/photos/:photoId/helpful
 * Mark a photo as helpful (authenticated)
 */
router.post('/:id/photos/:photoId/helpful', authenticateToken, async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const photoId = req.params.photoId;
    const userId = req.user!.id;

    console.log('👍 Marking photo as helpful:', { restaurantId, photoId, userId });

    // Verify photo exists and belongs to this restaurant
    const { data: photo, error: photoError } = await supabase
      .from('restaurant_photos')
      .select('id')
      .eq('id', photoId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (photoError || !photo) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    // Insert helpful mark (will fail silently if already exists due to PK constraint)
    const { error: insertError } = await supabase
      .from('restaurant_photo_helpful')
      .upsert(
        { photo_id: photoId, user_id: userId },
        { onConflict: 'photo_id,user_id', ignoreDuplicates: true }
      );

    if (insertError) {
      console.error('❌ Error marking photo helpful:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark photo as helpful'
      });
    }

    // Get updated helpful count
    const { data: updatedPhoto } = await supabase
      .from('restaurant_photos')
      .select('helpful_count')
      .eq('id', photoId)
      .single();

    console.log('✅ Photo marked as helpful');

    return res.json({
      success: true,
      helpfulCount: updatedPhoto?.helpful_count || 0
    });

  } catch (error) {
    console.error('❌ Error in mark helpful:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

/**
 * DELETE /api/restaurants/:id/photos/:photoId/helpful
 * Remove helpful mark from a photo (authenticated)
 */
router.delete('/:id/photos/:photoId/helpful', authenticateToken, async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const photoId = req.params.photoId;
    const userId = req.user!.id;

    console.log('👎 Removing helpful mark:', { restaurantId, photoId, userId });

    // Delete helpful mark
    const { error: deleteError } = await supabase
      .from('restaurant_photo_helpful')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Error removing helpful mark:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove helpful mark'
      });
    }

    // Get updated helpful count
    const { data: updatedPhoto } = await supabase
      .from('restaurant_photos')
      .select('helpful_count')
      .eq('id', photoId)
      .single();

    console.log('✅ Helpful mark removed');

    return res.json({
      success: true,
      helpfulCount: updatedPhoto?.helpful_count || 0
    });

  } catch (error) {
    console.error('❌ Error removing helpful:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// =============================================================================
// END PHOTO GALLERY ENDPOINTS
// =============================================================================

// =============================================================================
// RECOMMENDATIONS ENDPOINT - UPDATED FOR FRONTEND COMPATIBILITY
// =============================================================================

/**
 * GET /api/restaurants/:id/recommendations
 * Get ALL recommendations with relationship flags for frontend categorization
 * 
 * Returns flat array with:
 *   - is_friend: boolean (mutual follow)
 *   - is_following: boolean (user follows author)
 *   - is_followed_by: boolean (author follows user)
 *   - taste_alignment: number (0-1 scale)
 * 
 * Frontend handles categorization:
 *   - Your Network: is_friend || is_following || is_followed_by
 *   - Similar Taste: !network && taste_alignment >= 0.70
 *   - All Reviews: everyone
 */
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const restaurantId = parseInt(req.params.id);
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'userId query parameter is required'
      });
    }

    console.log('🎯 Fetching recommendations with relationship flags:', { restaurantId, userId });

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
        trust_score,
        users!inner(
          id,
          display_name,
          username,
          avatar_url
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

    // Step 2: Get ALL other users' recommendations for this restaurant
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
        save_count,
        comment_count,
        users!inner(
          id,
          display_name,
          username,
          avatar_url
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
        all_network: [],
        totalCount: 0
      });
    }

    // Step 3: Get BIDIRECTIONAL social connections and taste alignments
    const [connections, tasteAlignments] = await Promise.all([
      getBidirectionalConnections(userId),
      getTasteAlignments(userId)
    ]);

    console.log('📊 User context:', {
      following: connections.following.size,
      followers: connections.followers.size,
      mutuals: connections.mutuals.size,
      tasteAlignments: tasteAlignments.size
    });

    // Step 4: Build flat array with relationship flags
    const allNetworkRecs: NetworkRecommendation[] = recommendations.map(rec => {
      const authorId = rec.author_id;
      
      // Determine relationship flags
      const is_following = connections.following.has(authorId);
      const is_followed_by = connections.followers.has(authorId);
      const is_friend = connections.mutuals.has(authorId); // mutual follow
      
      // Get taste alignment (0-1 scale)
      const taste_alignment = tasteAlignments.get(authorId) || 0;

      return {
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
        author: {
          id: authorId,
          displayName: rec.users.display_name || rec.users.username || 'BocaBoca Member',
          username: rec.users.username || '',
          avatar: rec.users.avatar_url
        },
        // Relationship flags for frontend categorization
        is_friend,
        is_following,
        is_followed_by,
        taste_alignment,
        // Additional metadata
        trust_score: rec.trust_score,
        engagement: {
          saves: rec.save_count || 0,
          comments: rec.comment_count || 0,
          helpful: 0 // Can be added if tracked
        }
      };
    });

    // Step 5: Sort by relevance (network first, then taste match, then date)
    allNetworkRecs.sort((a, b) => {
      // Priority 1: Network connections first
      const aInNetwork = a.is_friend || a.is_following || a.is_followed_by;
      const bInNetwork = b.is_friend || b.is_following || b.is_followed_by;
      if (aInNetwork && !bInNetwork) return -1;
      if (!aInNetwork && bInNetwork) return 1;
      
      // Priority 2: Higher taste alignment
      if (b.taste_alignment !== a.taste_alignment) {
        return b.taste_alignment - a.taste_alignment;
      }
      
      // Priority 3: More recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate summary stats for logging
    const networkCount = allNetworkRecs.filter(r => 
      r.is_friend || r.is_following || r.is_followed_by
    ).length;
    const similarTasteCount = allNetworkRecs.filter(r => 
      !r.is_friend && !r.is_following && !r.is_followed_by && r.taste_alignment >= 0.70
    ).length;

    console.log('✅ Recommendations with relationship flags:', {
      userOwnReviews: userOwnReviews ? userOwnReviews.totalReviews : 0,
      totalRecommendations: allNetworkRecs.length,
      inNetwork: networkCount,
      similarTaste: similarTasteCount,
      other: allNetworkRecs.length - networkCount - similarTasteCount
    });

    return res.json({
      success: true,
      userOwnReviews,
      all_network: allNetworkRecs,
      totalCount: allNetworkRecs.length
    });

  } catch (error) {
    console.error('❌ Error in recommendations:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// =============================================================================
// END RECOMMENDATIONS ENDPOINT
// =============================================================================

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