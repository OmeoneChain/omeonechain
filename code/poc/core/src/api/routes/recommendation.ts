import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { RecommendationEngine } from '../../recommendation/engine';
import { AdapterFactory, AdapterType } from '../../adapters/adapter-factory';
import { IPFSStorageProvider } from '../../storage/ipfs-storage';
import { authenticateToken } from '../../middleware/auth';

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
}

// Type definitions matching the database schema
interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

interface RecommendationSubmission {
  title: string;
  content: string;
  category: string;
  restaurantName: string;
  restaurantAddress?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  tags?: string[];
  rating?: number;
}

// Initialize recommendation engine (singleton pattern for performance)
let recommendationEngine: RecommendationEngine | null = null;

async function getRecommendationEngine(): Promise<RecommendationEngine> {
  if (!recommendationEngine) {
    try {
      const factory = AdapterFactory.getInstance();
      const adapter = factory.createAdapterSimple(AdapterType.REBASED, {
        useProductionAdapter: true
      });
      const storage = new IPFSStorageProvider();
      recommendationEngine = new RecommendationEngine(adapter, storage);
      await recommendationEngine.initialize();
      console.log('✅ RecommendationEngine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RecommendationEngine:', error);
      throw new Error('Failed to initialize blockchain engine');
    }
  }
  return recommendationEngine;
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate Trust Score based on social connections
async function calculateTrustScore(
  supabase: any, 
  recommendationId: string, 
  userId?: string
): Promise<number> {
  try {
    // Base trust score calculation
    const { data: recommendation } = await supabase
      .from('recommendations')
      .select('trust_score, upvotes_count, saves_count, author_id')
      .eq('id', recommendationId)
      .single();

    if (!recommendation) return 0;

    let trustScore = recommendation.trust_score || 0;

    // If user is provided, calculate personalized trust score
    if (userId && userId !== recommendation.author_id) {
      // Check social connections for trust weighting
      const { data: socialConnections } = await supabase
        .from('social_connections')
        .select('trust_weight, connection_type')
        .eq('follower_id', userId)
        .eq('following_id', recommendation.author_id)
        .eq('is_active', true);

      if (socialConnections && socialConnections.length > 0) {
        const connection = socialConnections[0];
        // Apply social weighting: 0.75 for direct connections
        trustScore = trustScore * (connection.trust_weight || 0.75);
      }

      // Check for friend-of-friend connections (2-hop)
      if (!socialConnections || socialConnections.length === 0) {
        const { data: friendOfFriend } = await supabase
          .from('social_connections')
          .select(`
            following:social_connections!following_id (
              following_id,
              trust_weight
            )
          `)
          .eq('follower_id', userId)
          .eq('is_active', true);

        // Apply 0.25 weight for friend-of-friend connections
        if (friendOfFriend && friendOfFriend.length > 0) {
          trustScore = trustScore * 0.25;
        }
      }
    }

    // Factor in engagement metrics
    const engagementBoost = Math.min(0.2, (recommendation.upvotes_count * 0.1 + recommendation.saves_count * 0.05));
    trustScore = Math.min(1.0, trustScore + engagementBoost);

    return Math.round(trustScore * 1000) / 1000; // Round to 3 decimal places
  } catch (error) {
    console.error('Error calculating trust score:', error);
    return 0;
  }
}

/**
 * POST /api/recommendations
 * Create a new recommendation with hybrid blockchain + database storage
 * 🎯 FIXED: Now uses auto-increment restaurant IDs with smart matching
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // 🎯 FIXED: Use authenticated user data instead of anonymous creation
    const {
      title,
      content,
      category,
      restaurantName,
      restaurantAddress,
      latitude,
      longitude,
      photos = [],
      tags = [],
      rating
    } = req.body as RecommendationSubmission;

    // 🎯 FIXED: Get user info from authentication middleware
    const authorId = req.user!.id;
    const authorName = req.user!.display_name || req.user!.username || 'User';

    console.log('🔵 API Route received recommendation data:', {
      title,
      content,
      category,
      restaurantName,
      restaurantAddress,
      latitude,
      longitude,
      authorId,
      authorName,
      photos,
      tags,
      rating
    });

    console.log('🔐 Authenticated user:', {
      id: req.user!.id,
      address: req.user!.address,
      username: req.user!.username,
      display_name: req.user!.display_name
    });

    // Comprehensive validation
    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.length > 200) {
      return res.status(400).json({
        error: 'Title is required and must be between 3 and 200 characters'
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10 || content.length > 2000) {
      return res.status(400).json({
        error: 'Content is required and must be between 10 and 2000 characters'
      });
    }

    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        error: 'Category is required and must be a string'
      });
    }

    if (!restaurantName || typeof restaurantName !== 'string') {
      return res.status(400).json({
        error: 'Restaurant name is required'
      });
    }

    // Validate coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          error: 'Invalid coordinates provided'
        });
      }
    }

    // Validate rating if provided
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    // Validate tags
    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return res.status(400).json({
        error: 'Tags must be an array with maximum 10 items'
      });
    }

    console.log('✅ Required fields validated');

    // Step 1: 🎯 FIXED: Verify authenticated user exists in database
    console.log('🔵 Looking up authenticated user by ID:', authorId);
    let user;
    
    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authorId)
      .single();

    if (userLookupError) {
      console.log('🔍 User lookup error (may be expected if user not found):', userLookupError.message);
    }

    if (!existingUser) {
      console.log('🔵 Creating user record for authenticated user...');
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authorId,
          wallet_address: req.user!.address,
          display_name: authorName,
          username: req.user!.username || authorName.toLowerCase().replace(/\s+/g, '_'),
          location_city: 'Brasília',
          verification_status: req.user!.verification_status || 'basic'
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creating user record:', userError);
        return res.status(500).json({
          error: 'Failed to create user record: ' + userError.message
        });
      }
      user = newUser;
      console.log('✅ Created new user record:', user.display_name);
    } else {
      user = existingUser;
      console.log('✅ Found existing user:', user.display_name);
    }

    // Step 2: 🎯 FIXED: Search for existing restaurant or create new one
    console.log('🔍 Searching for restaurant:', restaurantName);
            
    // First, search for existing restaurants using the database function
    const { data: existingRestaurants, error: searchError } = await supabase
        .rpc('find_restaurants_by_name_and_location', {
            restaurant_name: restaurantName,
            lat: latitude || null,
            lng: longitude || null,
            radius_meters: 100
        });

    if (searchError) {
        console.error('❌ Restaurant search failed:', searchError);
        return res.status(500).json({
            error: 'Failed to search restaurants: ' + searchError.message
        });
    }

    let restaurantId: number;

    // Step 3: 🎯 FIXED: Use existing restaurant or create new one
    let restaurant;

    if (existingRestaurants && existingRestaurants.length > 0) {
        // Use existing restaurant
        restaurantId = existingRestaurants[0].id;
        console.log(`🏪 Found existing restaurant: ID ${restaurantId}, Name: "${existingRestaurants[0].name}"`);
        console.log(`📊 Match details: Distance: ${existingRestaurants[0].distance_meters}m, Similarity: ${existingRestaurants[0].similarity_score}`);
        
        // Fetch full restaurant record
        const { data: existingRestaurant, error: fetchError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();
            
        if (fetchError) {
            console.error('❌ Error fetching restaurant:', fetchError);
            return res.status(500).json({
                error: 'Failed to fetch restaurant: ' + fetchError.message
            });
        }
        restaurant = existingRestaurant;
        
    } else {
        // Create new restaurant
        console.log('🏪 Creating new restaurant:', restaurantName);
        const { data: newRestaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
                name: restaurantName,
                address: restaurantAddress || 'Address not provided',
                city: 'Brasília',
                latitude: latitude || null,
                longitude: longitude || null,
                category: category,
                created_by: user.id,
                verification_status: 'unverified'
            })
            .select()
            .single();

        if (restaurantError) {
            console.error('❌ Error creating restaurant:', restaurantError);
            return res.status(500).json({
                error: 'Failed to create restaurant: ' + restaurantError.message
            });
        }
        
        restaurantId = newRestaurant.id;
        restaurant = newRestaurant;
        console.log(`✅ Restaurant created successfully with ID: ${restaurantId}`);
    }

    // Step 4: Submit to blockchain via RecommendationEngine
    console.log('🔗 Submitting recommendation to blockchain...');
    let blockchainRecommendation;
    
    try {
      const engine = await getRecommendationEngine();
      
      // Prepare data for blockchain submission
      const recommendationData = {
        serviceId: restaurant.id.toString(), // Convert number to string for blockchain
        category,
        location: {
          latitude: latitude || 0,
          longitude: longitude || 0,
          address: restaurantAddress,
          city: 'Brasília'
        },
        rating: rating || 4,
        content: {
          title: title.trim(),
          body: content.trim(),
          media: photos.map(photo => ({
            type: 'image' as const,
            url: photo,
            description: ''
          }))
        },
        tags: tags || []
      };
      
      blockchainRecommendation = await engine.submitRecommendation(user.id, recommendationData);
      console.log('✅ Blockchain submission successful:', blockchainRecommendation.id);
      
    } catch (blockchainError) {
      console.error('⚠️ Blockchain submission failed:', blockchainError);
      // Continue with database-only operation
      blockchainRecommendation = null;
    }

    // Step 5: Create the recommendation in database (with blockchain reference if available)
    console.log('🔵 Creating recommendation in database...');
    
    const { data: recommendation, error: recommendationError } = await supabase
      .from('recommendations')
      .insert({
        restaurant_id: restaurant.id, // Now using integer ID
        author_id: user.id, // 🎯 FIXED: Using authenticated user ID
        title: title.trim(),
        content: content.trim(),
        category: category,
        photos: photos,
        tags: tags,
        trust_score: blockchainRecommendation ? 0.25 : 0.15, // Higher initial score for blockchain-verified
        base_reward: 1.0,
        location_data: {
          address: restaurantAddress,
          coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : null
        },
        verification_status: blockchainRecommendation ? 'blockchain_verified' : 'unverified',
        visit_date: new Date().toISOString().split('T')[0],
        // Blockchain integration fields
        blockchain_tx_id: blockchainRecommendation?.tangle?.objectId || null,
        content_hash: blockchainRecommendation?.contentHash || null,
        blockchain_status: blockchainRecommendation ? 'confirmed' : 'pending'
      })
      .select(`
        *,
        restaurants!inner(name, address, category, latitude, longitude),
        users!inner(display_name, username, wallet_address)
      `)
      .single();

    if (recommendationError) {
      console.error('❌ Error creating recommendation:', recommendationError);
      return res.status(500).json({
        error: 'Failed to create recommendation: ' + recommendationError.message
      });
    }

    // Step 6: Update restaurant metrics
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        total_recommendations: (restaurant.total_recommendations || 0) + 1,
        average_trust_score: await calculateAverageRestaurantTrustScore(supabase, restaurant.id)
      })
      .eq('id', restaurant.id);

    if (updateError) {
      console.warn('⚠️ Warning: Failed to update restaurant metrics:', updateError);
    }

    console.log('✅ Recommendation created successfully!');
    console.log('✅ Database ID:', recommendation.id);
    console.log('✅ Blockchain ID:', blockchainRecommendation?.id || 'N/A');
    console.log('✅ Restaurant:', restaurant.name);
    console.log('✅ Author:', user.display_name);
    console.log('✅ Authenticated User ID:', authorId);
    console.log('🎉 Authenticated recommendation creation complete!');

    return res.json({
      success: true,
      recommendation,
      restaurant,
      user,
      blockchain: blockchainRecommendation ? {
        id: blockchainRecommendation.id,
        txId: blockchainRecommendation.tangle?.objectId,
        contentHash: blockchainRecommendation.contentHash,
        trustScore: blockchainRecommendation.trust_score || 0.25
      } : null,
      message: `Authenticated recommendation creation complete! Database ID: ${recommendation.id}${blockchainRecommendation ? `, Blockchain ID: ${blockchainRecommendation.id}` : ''}`
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

/**
 * GET /api/recommendations
 * List recommendations with advanced filtering and Trust Score calculation
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = createClient();
    
    // Extract query parameters
    const author = req.query.author as string;
    const category = req.query.category as string;
    const restaurantId = req.query.restaurantId as string;
    const tags = req.query.tags as string;
    const minTrustScore = req.query.minTrustScore as string;
    const nearLat = req.query.nearLat as string;
    const nearLng = req.query.nearLng as string;
    const nearRadius = req.query.nearRadius as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const limit = Math.min(100, parseInt((req.query.limit as string) || '20', 10));
    const sort = (req.query.sort as string) || 'created_at';
    const direction = req.query.direction === 'asc' ? 'asc' : 'desc';
    const userId = req.query.userId as string;
    const search = req.query.q as string;

    console.log('Fetching recommendations with filters:', {
      category, limit, offset, sort, direction
    });

    // Build the query
    let query = supabase
      .from('recommendations')
      .select(`
        *,
        restaurants!inner(
          id, name, address, category, latitude, longitude, 
          average_trust_score, total_recommendations
        ),
        users!inner(
          id, display_name, username, wallet_address, 
          reputation_score, verification_level
        )
      `);

    // Apply filters
    if (author) {
      query = query.or(`users.wallet_address.eq.${author},users.id.eq.${author}`);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (restaurantId) {
      // Convert to number for integer comparison
      const numRestaurantId = parseInt(restaurantId, 10);
      if (!isNaN(numRestaurantId)) {
        query = query.eq('restaurant_id', numRestaurantId);
      }
    }

    if (minTrustScore) {
      const minScore = Math.max(0, Math.min(1, parseFloat(minTrustScore)));
      query = query.gte('trust_score', minScore);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    // Text search
    if (search && search.trim().length >= 2) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply sorting
    if (sort === 'trust_score') {
      query = query.order('trust_score', { ascending: direction === 'asc' });
    } else if (sort === 'created_at') {
      query = query.order('created_at', { ascending: direction === 'asc' });
    } else if (sort === 'upvotes_count') {
      query = query.order('upvotes_count', { ascending: direction === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: recommendations, error } = await query;

    if (error) {
      console.error('Error fetching recommendations:', error);
      return res.status(500).json({
        error: 'Failed to fetch recommendations: ' + error.message
      });
    }

    // Calculate personalized Trust Scores if userId provided
    const enhancedRecommendations = await Promise.all(
      (recommendations || []).map(async (rec) => {
        const personalizedTrustScore = userId 
          ? await calculateTrustScore(supabase, rec.id, userId)
          : rec.trust_score;

        // Apply location filtering if coordinates provided
        let distance = null;
        if (nearLat && nearLng && rec.restaurants.latitude && rec.restaurants.longitude) {
          distance = calculateDistance(
            parseFloat(nearLat),
            parseFloat(nearLng),
            rec.restaurants.latitude,
            rec.restaurants.longitude
          );
        }

        return {
          ...rec,
          personalizedTrustScore,
          distance,
          engagementScore: (rec.upvotes_count * 0.7) + (rec.saves_count * 0.3),
          isRecent: new Date(rec.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          // Blockchain status indicators
          isBlockchainVerified: !!rec.blockchain_tx_id,
          blockchainStatus: rec.blockchain_status || 'none'
        };
      })
    );

    // Filter by distance if location filter provided
    let filteredRecommendations = enhancedRecommendations;
    if (nearLat && nearLng && nearRadius) {
      const maxDistance = Math.max(0.1, Math.min(100, parseFloat(nearRadius)));
      filteredRecommendations = enhancedRecommendations.filter(rec => 
        rec.distance === null || rec.distance <= maxDistance
      );
    }

    console.log('Fetched recommendations:', filteredRecommendations.length);

    return res.json({
      success: true,
      recommendations: filteredRecommendations,
      total: filteredRecommendations.length,
      pagination: {
        offset,
        limit,
        hasMore: filteredRecommendations.length === limit
      },
      filters: {
        category,
        author,
        minTrustScore,
        search,
        nearLocation: nearLat && nearLng ? { lat: nearLat, lng: nearLng, radius: nearRadius } : null
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

/**
 * PUT /api/recommendations/:id
 * Update a recommendation (with blockchain integration)
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.status(501).json({
      error: 'Update functionality not yet implemented'
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/recommendations/:id
 * Delete a recommendation (with blockchain integration)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.status(501).json({
      error: 'Delete functionality not yet implemented'
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 🎯 FIXED: Helper function to calculate average restaurant trust score (now uses integer ID)
async function calculateAverageRestaurantTrustScore(supabase: any, restaurantId: number): Promise<number> {
  try {
    const { data } = await supabase
      .from('recommendations')
      .select('trust_score')
      .eq('restaurant_id', restaurantId)
      .eq('verification_status', 'verified');

    if (!data || data.length === 0) return 0;

    const average = data.reduce((sum: number, rec: any) => sum + (rec.trust_score || 0), 0) / data.length;
    return Math.round(average * 1000) / 1000;
  } catch (error) {
    console.error('Error calculating average trust score:', error);
    return 0;
  }
}

export default router;