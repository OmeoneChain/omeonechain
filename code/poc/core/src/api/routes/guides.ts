// File: code/poc/core/src/api/routes/guides.ts
// List routes: CRUD operations, interactions, and user profile integration
// COMPLETE: All list functionality consolidated from server.ts
// FIXED: Response field names match frontend expectations
// UPDATED: 2026-02-05 - Added cover image auto-population from Google Places
// UPDATED: 2026-02-06 - Added PATCH /:listId/cover endpoint for user-uploaded covers

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import multer from 'multer';
import { getRewardService } from '../../services/reward-service';
import { getGooglePlacesCacheService } from '../../services/google-places-cache';

// =============================================================================
// IPFS GATEWAY FOR PHOTO URLS
// =============================================================================

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// =============================================================================
// RESTAURANT PHOTO HELPERS FOR GUIDES (Phase 2)
// =============================================================================

interface RestaurantPhotoInfo {
  photo_url: string | null;
  photo_source: 'creator_recommendation' | 'community_recommendation' | 'google_places' | null;
  photo_contributor?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  photo_recommendation_id?: string;
}

/**
 * Check if a recommendation has a valid photo
 */
function hasValidPhoto(rec: any): boolean {
  if (rec.photos && Array.isArray(rec.photos) && rec.photos.length > 0) {
    return true;
  }
  if (rec.image_url && typeof rec.image_url === 'string' && rec.image_url.length > 0) {
    return true;
  }
  return false;
}

/**
 * Extract the first photo URL from a recommendation
 */
function extractPhotoUrl(rec: any): string | null {
  // Check photos array first
  if (rec.photos && Array.isArray(rec.photos) && rec.photos.length > 0) {
    const firstPhoto = rec.photos[0];
    
    // If it's already a full URL
    if (typeof firstPhoto === 'string' && firstPhoto.startsWith('http')) {
      return firstPhoto;
    }
    
    // If it's an object with url property
    if (typeof firstPhoto === 'object' && firstPhoto.url) {
      return firstPhoto.url;
    }
    
    // If it's an IPFS hash
    if (typeof firstPhoto === 'string') {
      return `${IPFS_GATEWAY}${firstPhoto}`;
    }
  }
  
  // Fallback to image_url
  if (rec.image_url) {
    if (rec.image_url.startsWith('http')) {
      return rec.image_url;
    }
    return `${IPFS_GATEWAY}${rec.image_url}`;
  }
  
  return null;
}

/**
 * Get the best photo for a restaurant in a guide context
 * 
 * Priority order:
 * 1. Guide creator's own photo (from restaurant_photos table)
 * 2. Most helpful community photo (highest helpful_count)
 * 3. Most recent community photo
 * 4. Google Places photo (from restaurants.google_photo_url)
 * 5. null (frontend will show gradient fallback)
 */
async function getRestaurantPhotoForGuide(
  restaurantId: number,
  guideCreatorId: string,
  supabaseClient: any
): Promise<RestaurantPhotoInfo> {
  try {
    // Step 1: Check if guide creator has a photo for this restaurant
    const { data: creatorPhoto, error: creatorError } = await supabaseClient
      .from('restaurant_photos')
      .select(`
        id,
        ipfs_hash,
        user_id,
        recommendation_id,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('user_id', guideCreatorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!creatorError && creatorPhoto?.ipfs_hash) {
      return {
        photo_url: `${IPFS_GATEWAY}${creatorPhoto.ipfs_hash}`,
        photo_source: 'creator_recommendation',
        photo_contributor: {
          id: creatorPhoto.users?.id || guideCreatorId,
          username: creatorPhoto.users?.username || 'Unknown',
          display_name: creatorPhoto.users?.display_name || null,
          avatar_url: creatorPhoto.users?.avatar_url || null
        },
        photo_recommendation_id: creatorPhoto.recommendation_id
      };
    }

    // Step 2: Get most helpful community photo (highest helpful_count)
    const { data: helpfulPhoto, error: helpfulError } = await supabaseClient
      .from('restaurant_photos')
      .select(`
        id,
        ipfs_hash,
        user_id,
        recommendation_id,
        helpful_count,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('helpful_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!helpfulError && helpfulPhoto?.ipfs_hash) {
      return {
        photo_url: `${IPFS_GATEWAY}${helpfulPhoto.ipfs_hash}`,
        photo_source: 'community_recommendation',
        photo_contributor: {
          id: helpfulPhoto.users?.id || helpfulPhoto.user_id,
          username: helpfulPhoto.users?.username || 'Unknown',
          display_name: helpfulPhoto.users?.display_name || null,
          avatar_url: helpfulPhoto.users?.avatar_url || null
        },
        photo_recommendation_id: helpfulPhoto.recommendation_id
      };
    }

    // Step 3: Try Google Places photo from restaurants table
    const { data: restaurant } = await supabaseClient
      .from('restaurants')
      .select('google_photo_url')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restaurant?.google_photo_url) {
      return {
        photo_url: restaurant.google_photo_url,
        photo_source: 'google_places',
        photo_contributor: undefined,
        photo_recommendation_id: undefined
      };
    }

    // Step 4: No photo found - frontend will show gradient fallback
    return {
      photo_url: null,
      photo_source: null
    };

  } catch (error) {
    console.error(`Error fetching photo for restaurant ${restaurantId}:`, error);
    return {
      photo_url: null,
      photo_source: null
    };
  }
}

// =============================================================================
// MULTER CONFIGURATION FOR COVER IMAGE UPLOADS
// =============================================================================

const uploadCoverImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Cover image must be JPEG, PNG, or WebP'));
    }
  }
});

// =============================================================================
// PINATA CONFIGURATION FOR IPFS UPLOADS
// =============================================================================

const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Helper function to upload to Pinata
async function uploadCoverToPinata(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const FormData = (await import('form-data')).default;
  const axios = (await import('axios')).default;

  const formData = new FormData();
  formData.append('file', buffer, {
    filename: filename,
    contentType: mimeType
  });

  const pinataMetadata = JSON.stringify({
    name: filename,
    keyvalues: {
      platform: 'bocaboca',
      type: 'guide-cover',
      uploadedAt: new Date().toISOString(),
      ...metadata
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append('pinataOptions', pinataOptions);

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      }
    }
  );

  return response.data.IpfsHash;
}

/**
 * Check and award list/guide milestone rewards
 * White Paper v1.02:
 * - List reaches 10 saves: +10.0 BOCA
 * - List reaches 50 saves: +20.0 BOCA
 */
async function checkGuideMilestoneRewards(
  guideId: string, 
  ownerId: string, 
  currentSaves: number,
  itemCount?: number
): Promise<void> {
  try {
    const rewardService = getRewardService();
    
    // Get current reward status
    const { data: guide } = await supabase
      .from('food_guides')
      .select('reward_5_items_awarded, reward_10_saves_awarded, reward_50_saves_awarded, title')
      .eq('id', guideId)
      .single();
    
    if (!guide) return;
    
    // Check 5+ items milestone (NEW)
    if (itemCount && itemCount >= 5 && !guide.reward_5_items_awarded) {
      console.log(`🏆 [GUIDE REWARD] Guide "${guide.title}" has 5+ items! Awarding 5.0 BOCA...`);
      
      const result = await rewardService.awardListCreation(ownerId, guideId);
      
      if (result.success) {
        await supabase
          .from('food_guides')
          .update({ reward_5_items_awarded: true })
          .eq('id', guideId);
        console.log(`✅ [GUIDE REWARD] 5-items bonus: ${result.displayAmount} BOCA`);
        if (result.txDigest) {
          console.log(`   TX: ${result.txDigest}`);
        }
      } else {
        console.error(`❌ [GUIDE REWARD] 5-items failed: ${result.error}`);
      }
    }
    
    // Check 10 saves milestone
    if (currentSaves >= 10 && !guide.reward_10_saves_awarded) {
      console.log(`🏆 [GUIDE REWARD] Guide "${guide.title}" reached 10 saves! Awarding +10.0 BOCA...`);
      
      const result = await rewardService.awardList10Saves(ownerId, guideId);
      
      if (result.success) {
        await supabase
          .from('food_guides')
          .update({ reward_10_saves_awarded: true })
          .eq('id', guideId);
        console.log(`✅ [GUIDE REWARD] 10-saves bonus: ${result.displayAmount} BOCA`);
        if (result.txDigest) {
          console.log(`   TX: ${result.txDigest}`);
        }
      } else {
        console.error(`❌ [GUIDE REWARD] 10-saves failed: ${result.error}`);
      }
    }
    
    // Check 50 saves milestone
    if (currentSaves >= 50 && !guide.reward_50_saves_awarded) {
      console.log(`🏆 [GUIDE REWARD] Guide "${guide.title}" reached 50 saves! Awarding +20.0 BOCA...`);
      
      const result = await rewardService.awardList50Saves(ownerId, guideId);
      
      if (result.success) {
        await supabase
          .from('food_guides')
          .update({ reward_50_saves_awarded: true })
          .eq('id', guideId);
        console.log(`✅ [GUIDE REWARD] 50-saves bonus: ${result.displayAmount} BOCA`);
        if (result.txDigest) {
          console.log(`   TX: ${result.txDigest}`);
        }
      } else {
        console.error(`❌ [GUIDE REWARD] 50-saves failed: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Error checking guide milestone rewards:', error);
  }
}

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase configuration required for lists routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT utilities
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface JWTPayload {
  userId: string;
  address: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        address?: string;
      };
    }
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getListsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  visibility: z.enum(['public', 'private', 'all']).optional(),
  author: z.string().uuid().optional(),
  author_id: z.string().uuid().optional(),
  search: z.string().optional()
});

const createListSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  restaurant_ids: z.array(z.number()).min(1).max(50),
  visibility: z.enum(['public', 'private']).default('public')
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      id: payload.userId,
      address: payload.address
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = {
        id: payload.userId,
        address: payload.address
      };
    } catch (error) {
      req.user = undefined;
    }
  }
  
  next();
};

// =============================================================================
// COLLECTION ROUTES (no :id parameter)
// =============================================================================

// GET / - Get all lists with filtering (Enhanced with User Profile Integration)
router.get('/', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 GET /api/lists - Enhanced with User Profile Integration:', req.query);
    console.log('🔍 Lists API: Starting lists retrieval with author filtering...');
    
    const validation = getListsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      console.error('❌ Lists query validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.errors
      });
    }

    const { limit, visibility, author, author_id, search } = validation.data;
    const currentUserId = req.user?.id;
    const targetAuthorId = author || author_id;
    
    console.log('🔍 Enhanced Lists API Query:', { 
      limit, 
      visibility, 
      targetAuthorId, 
      search, 
      currentUserId,
      isAuthenticated: !!currentUserId 
    });

    let query = supabase
      .from('food_guides')
      .select(`
        id,
        title,
        description,
        is_public,
        author_id,
        likes_count,
        bookmarks_count,
        cover_image_url,
        cover_image_source,
        created_at,
        updated_at,
        guide_items (
          restaurant_id,
          restaurants (
            id,
            name,
            address,
            city,
            category
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply author filtering with privacy handling
    if (targetAuthorId) {
      console.log(`🔍 Filtering by author: ${targetAuthorId}`);
      query = query.eq('author_id', targetAuthorId);
      
      if (currentUserId === targetAuthorId) {
        console.log('✅ User viewing own lists - showing all visibility levels');
        if (visibility === 'public') {
          query = query.eq('is_public', true);
        } else if (visibility === 'private') {
          query = query.eq('is_public', false);
        }
      } else {
        console.log('🔒 User viewing another\'s lists - showing only public');
        query = query.eq('is_public', true);
      }
    } else {
      if (visibility === 'public') {
        query = query.eq('is_public', true);
      } else if (visibility === 'private') {
        if (!currentUserId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required to view private lists'
          });
        }
        query = query.eq('is_public', false).eq('author_id', currentUserId);
      } else {
        query = query.eq('is_public', true);
      }
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: lists, error } = await query;

    if (error) {
      console.error('❌ Enhanced Lists API Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch lists',
        details: error.message || 'Unknown error'
      });
    }

    console.log(`📋 Raw lists data: ${lists?.length || 0} lists found`);

    const transformedLists = (lists || []).map((list, index) => {
      console.log(`🔄 Transforming list ${index}: ${list.title}`);
      
      return {
        id: list.id,
        title: list.title,
        description: list.description || '',
        visibility: list.is_public ? 'public' : 'private',
        created_by: list.author_id,
        author_id: list.author_id,
        cover_image_url: list.cover_image_url || null,
        cover_image_source: list.cover_image_source || null,
        created_at: list.created_at,
        updated_at: list.updated_at,
        restaurant_count: list.guide_items?.length || 0,
        restaurants: (list.guide_items || [])
          .map((item: any) => item.restaurants)
          .filter(Boolean),
        likes_count: list.likes_count || 0,
        bookmarks_count: list.bookmarks_count || 0
      };
    });

    console.log(`✅ Enhanced Lists API Success: ${transformedLists.length} lists retrieved`);

    res.json({
      success: true,
      lists: transformedLists,
      count: transformedLists.length,
      filters: { limit, visibility, author: targetAuthorId, search },
      user_context: {
        authenticated: !!currentUserId,
        viewing_own_lists: !!targetAuthorId && currentUserId === targetAuthorId
      }
    });

  } catch (error) {
    console.error('❌ Enhanced Lists API Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lists',
      details: 'Unexpected server error'
    });
  }
});

// POST / - Create new curated list
router.post('/', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 POST /api/lists - Create new list');
    console.log('Request body:', req.body);

    const validation = createListSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ List validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid list data',
        details: validation.error.errors
      });
    }

    const validatedData = validation.data;
    const currentUser = req.user as { id: string; address: string };

    console.log(`🔍 Verifying ${validatedData.restaurant_ids.length} restaurants exist`);
    
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', validatedData.restaurant_ids);

    if (restaurantsError) {
      console.error('❌ Error verifying restaurants:', restaurantsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify restaurants',
        details: restaurantsError.message
      });
    }

    if (!restaurants || restaurants.length !== validatedData.restaurant_ids.length) {
      const foundIds = restaurants?.map(r => r.id) || [];
      const missingIds = validatedData.restaurant_ids.filter(id => !foundIds.includes(id));
      
      console.error('❌ Some restaurants not found:', missingIds);
      return res.status(400).json({
        success: false,
        error: 'Some restaurants do not exist',
        missing_restaurants: missingIds
      });
    }

    const listData = {
      title: validatedData.title,
      description: validatedData.description || null,
      author_id: currentUser.id,
      is_public: validatedData.visibility === 'public',
      is_featured: false,
      saves_count: 0,
      view_count: 0,
      category: 'dining',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating list with data:', listData);

    const { data: newList, error: listError } = await supabase
      .from('food_guides')
      .insert(listData)
      .select('*')
      .single();

    if (listError) {
      console.error('❌ Database error creating list:', listError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create list',
        details: listError.message
      });
    }

    console.log(`✅ List created successfully with ID: ${newList.id}`);

    const listItems = validatedData.restaurant_ids.map((restaurantId: number, index: number) => ({
      list_id: newList.id,
      restaurant_id: restaurantId,
      sort_order: index + 1,
      added_at: new Date().toISOString()
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('guide_items')
      .insert(listItems)
      .select('*');

    if (itemsError) {
      console.error('❌ Error adding restaurants to list:', itemsError);
      
      try {
        await supabase.from('food_guides').delete().eq('id', newList.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup list after items error:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to add restaurants to list',
        details: itemsError.message
      });
    }

    console.log(`✅ Added ${createdItems.length} restaurants to list`);

    // Check for 5+ items milestone reward
    await checkGuideMilestoneRewards(newList.id, newList.author_id, 0, createdItems.length);

    // Auto-populate cover image from first restaurant's Google Places photo
    let coverImageUrl: string | null = null;
    try {
      const cacheService = getGooglePlacesCacheService();
      const coverResult = await cacheService.setGuideCoverImage(newList.id);
      if (coverResult.success && coverResult.coverImageUrl) {
        coverImageUrl = coverResult.coverImageUrl;
        console.log(`🖼️ Auto-set cover image for guide "${newList.title}" from ${coverResult.restaurantName}`);
      }
    } catch (coverError) {
      console.warn('⚠️ Failed to auto-set cover image:', coverError);
      // Non-fatal error, continue with guide creation
    }

    res.status(201).json({
      success: true,
      list: {
        id: newList.id,
        title: newList.title,
        description: newList.description,
        visibility: newList.is_public ? 'public' : 'private',
        created_by: newList.author_id,
        created_at: newList.created_at,
        updated_at: newList.updated_at,
        restaurant_count: createdItems.length,
        cover_image_url: coverImageUrl
      },
      restaurant_ids: validatedData.restaurant_ids,
      message: `List "${newList.title}" created successfully with ${createdItems.length} restaurants`
    });

  } catch (error) {
    console.error('❌ Unexpected error creating list:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating list'
    });
  }
});

// POST /from-saved-list - Convert a saved list into a public food guide
router.post('/from-saved-list', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 POST /api/lists/from-saved-list - Convert saved list to guide');
    console.log('Request body:', req.body);

    const { 
      listId, 
      title, 
      description, 
      category, 
      city, 
      bestFor, 
      tags,
      visibility,
      contentType 
    } = req.body;

    // Validate required fields
    if (!listId) {
      return res.status(400).json({
        success: false,
        error: 'listId is required'
      });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }

    const currentUser = req.user as { id: string; address: string };

    // 1. FIXED: Query PostgreSQL instead of Supabase for saved list
    console.log(`🔍 Verifying saved list ${listId} for user ${currentUser.id} in PostgreSQL`);
    
    // Get database pool from app.locals
    const pool = req.app.locals.db;
    
    // DEBUG: First check if list exists at all
    const debugListCheck = await pool.query(
      `SELECT id, name, user_id FROM user_saved_lists WHERE id = $1`,
      [listId]
    );
    console.log('🔍 DEBUG - List exists?', debugListCheck.rows.length > 0);
    if (debugListCheck.rows.length > 0) {
      console.log('🔍 DEBUG - List data:', debugListCheck.rows[0]);
      console.log('🔍 DEBUG - User match?', debugListCheck.rows[0].user_id === currentUser.id);
    }
    
    // DEBUG: Check what lists this user has
    const debugUserLists = await pool.query(
      `SELECT id, name FROM user_saved_lists WHERE user_id = $1 LIMIT 5`,
      [currentUser.id]
    );
    console.log('🔍 DEBUG - User has these lists:', debugUserLists.rows);
    
    const savedListResult = await pool.query(
      `SELECT id, name, description, user_id 
       FROM user_saved_lists 
       WHERE id = $1 AND user_id = $2`,
      [listId, currentUser.id]
    );

    if (savedListResult.rows.length === 0) {
      console.error('❌ Saved list not found in PostgreSQL');
      console.error('   List ID:', listId);
      console.error('   User ID:', currentUser.id);
      return res.status(404).json({
        success: false,
        error: 'Saved list not found or you do not have permission to publish it'
      });
    }

    const savedList = savedListResult.rows[0];
    console.log(`✅ Saved list verified: "${savedList.name}"`);

    // 2. FIXED: Get restaurants from PostgreSQL saved_list_items
    console.log(`🔍 Fetching restaurants from saved list ${listId} in PostgreSQL`);
    
    const savedItemsResult = await pool.query(
      `SELECT id, item_id, item_type, added_at
       FROM saved_list_items
       WHERE list_id = $1 AND item_type IN ('restaurant', 'recommendation')
       ORDER BY added_at ASC`,
      [listId]
    );

    const restaurantItems = savedItemsResult.rows;

    if (restaurantItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish an empty guide. Add at least one restaurant to your list first.'
      });
    }

    console.log(`📍 Found ${restaurantItems.length} restaurants in saved list`);

    // Get restaurant IDs - handle both direct restaurants and recommendations
    const restaurantIds: number[] = [];

    for (const item of restaurantItems) {
      if (item.item_type === 'restaurant') {
        restaurantIds.push(parseInt(item.item_id));
      } else if (item.item_type === 'recommendation') {
        // Look up restaurant_id from recommendation
        const recResult = await pool.query(
          'SELECT restaurant_id FROM recommendations WHERE id = $1',
          [item.item_id]
        );
        if (recResult.rows[0]?.restaurant_id) {
          restaurantIds.push(recResult.rows[0].restaurant_id);
        }
      }
    }

    // 3. Verify all restaurants exist in Supabase
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', restaurantIds);

    if (restaurantsError) {
      console.error('❌ Error verifying restaurants:', restaurantsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify restaurants'
      });
    }

    if (!restaurants || restaurants.length !== restaurantIds.length) {
      const foundIds = restaurants?.map(r => r.id) || [];
      const missingIds = restaurantIds.filter(id => !foundIds.includes(id));
      
      console.error('❌ Some restaurants not found:', missingIds);
      return res.status(400).json({
        success: false,
        error: 'Some restaurants from your list no longer exist',
        missing_restaurants: missingIds
      });
    }

    // 4. Create the food guide in Supabase
    const guideData = {
      title: title.trim(),
      description: description?.trim() || null,
      context_description: description?.trim() || null,
      author_id: currentUser.id,
      is_public: visibility === 'public',
      is_featured: false,
      saves_count: 0,
      view_count: 0,
      likes_count: 0,
      bookmarks_count: 0,
      category: category || 'dining',
      city: city || null,
      tags: tags || [],
      best_for: bestFor?.trim() || null,
      content_type: contentType || 'guide',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating food guide with data:', guideData);

    const { data: newGuide, error: guideError } = await supabase
      .from('food_guides')
      .insert(guideData)
      .select('*')
      .single();

    if (guideError) {
      console.error('❌ Database error creating guide:', guideError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create guide',
        details: guideError.message
      });
    }

    console.log(`✅ Food guide created successfully with ID: ${newGuide.id}`);

    // 5. Add restaurants to the guide (preserving order from saved list)
    const guideItems = restaurantIds.map((restaurantId: number, index: number) => ({
      list_id: newGuide.id,
      restaurant_id: restaurantId,
      sort_order: index + 1,
      added_at: new Date().toISOString()
    }));

    const { data: createdItems, error: guideItemsError } = await supabase
      .from('guide_items')
      .insert(guideItems)
      .select('*');

    if (guideItemsError) {
      console.error('❌ Error adding restaurants to guide:', guideItemsError);
      
      // Cleanup: Delete the guide if we failed to add restaurants
      try {
        await supabase.from('food_guides').delete().eq('id', newGuide.id);
        console.log('🧹 Cleaned up guide after error');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup guide after items error:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to add restaurants to guide',
        details: guideItemsError.message
      });
    }

    console.log(`✅ Added ${createdItems.length} restaurants to guide`);

    // Auto-populate cover image from first restaurant's Google Places photo
    let coverImageUrl: string | null = null;
    try {
      const cacheService = getGooglePlacesCacheService();
      const coverResult = await cacheService.setGuideCoverImage(newGuide.id);
      if (coverResult.success && coverResult.coverImageUrl) {
        coverImageUrl = coverResult.coverImageUrl;
        console.log(`🖼️ Auto-set cover image for guide "${newGuide.title}" from ${coverResult.restaurantName}`);
      }
    } catch (coverError) {
      console.warn('⚠️ Failed to auto-set cover image:', coverError);
      // Non-fatal error, continue with guide creation
    }

    // 6. Return success response
    res.status(201).json({
      success: true,
      guide: {
        id: newGuide.id,
        title: newGuide.title,
        description: newGuide.description,
        category: newGuide.category,
        city: newGuide.city,
        tags: newGuide.tags,
        best_for: newGuide.best_for,
        visibility: newGuide.is_public ? 'public' : 'private',
        created_by: newGuide.author_id,
        created_at: newGuide.created_at,
        updated_at: newGuide.updated_at,
        restaurant_count: createdItems.length,
        cover_image_url: coverImageUrl,
        likes_count: 0,
        bookmarks_count: 0
      },
      restaurant_ids: restaurantIds,
      message: `Guide "${newGuide.title}" published successfully with ${createdItems.length} restaurants`,
      original_list: {
        id: savedList.id,
        name: savedList.name
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error converting saved list to guide:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while publishing guide'
    });
  }
});

// GET /status - Get user's like/bookmark status for all lists
router.get('/status', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user!.id;
    console.log(`GET /api/lists/status - user: ${userId}`);

    const [likesResult, bookmarksResult] = await Promise.all([
      supabase
        .from('list_likes')
        .select('list_id')
        .eq('user_id', userId),
      supabase
        .from('list_bookmarks')
        .select('list_id')
        .eq('user_id', userId)
    ]);

    if (likesResult.error) {
      console.error('❌ Error fetching likes:', likesResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch like status'
      });
    }

    if (bookmarksResult.error) {
      console.error('❌ Error fetching bookmarks:', bookmarksResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bookmark status'
      });
    }

    const likedListIds = (likesResult.data || []).map(like => like.list_id);
    const bookmarkedListIds = (bookmarksResult.data || []).map(bookmark => bookmark.list_id);

    console.log(`✅ Status fetched: ${likedListIds.length} likes, ${bookmarkedListIds.length} bookmarks`);

    res.json({
      success: true,
      likes: likedListIds,
      bookmarks: bookmarkedListIds,
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching list status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list status'
    });
  }
});

// =============================================================================
// INDIVIDUAL LIST ROUTES (with :listId parameter)
// IMPORTANT: Specific routes like /:listId/status must come BEFORE /:listId
// =============================================================================

// GET /:listId/status - Get user's like/bookmark status for a specific list
router.get('/:listId/status', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const userId = req.user!.id;

    console.log(`GET /api/lists/${listId}/status - user: ${userId}`);

    const [likeResult, bookmarkResult] = await Promise.all([
      supabase
        .from('list_likes')
        .select('id')
        .eq('list_id', listId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('list_bookmarks')
        .select('id')
        .eq('list_id', listId)
        .eq('user_id', userId)
        .single()
    ]);

    const isLiked = !!(likeResult.data && !likeResult.error);
    const isBookmarked = !!(bookmarkResult.data && !bookmarkResult.error);

    console.log(`✅ Status for list ${listId}: liked=${isLiked}, bookmarked=${isBookmarked}`);

    res.json({
      success: true,
      list_id: listId,
      is_liked: isLiked,
      is_bookmarked: isBookmarked,
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching list status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list status'
    });
  }
});

// GET /:listId - Get complete list details with all restaurants
router.get('/:listId', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const currentUserId = req.user?.id;
    
    console.log(`📋 GET /api/lists/${listId} - Fetch complete list details`);

    const { data: list, error: listError } = await supabase
      .from('food_guides')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      console.error('❌ List not found:', listError);
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    console.log(`✅ List found: "${list.title}", author_id: ${list.author_id}`);

    let creatorData = null;
    if (list.author_id) {
      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, reputation_score')
        .eq('id', list.author_id)
        .single();
      
      if (creator && !creatorError) {
        creatorData = creator;
        console.log(`✅ Creator found: ${creator.username}`);
      } else {
        console.warn(`⚠️ Creator not found for author_id: ${list.author_id}`);
      }
    }

    if (!list.is_public && (!currentUserId || currentUserId !== list.author_id)) {
      return res.status(403).json({
        success: false,
        error: 'This list is private'
      });
    }

    const { data: listItems, error: itemsError } = await supabase
      .from('guide_items')
      .select(`
        sort_order,
        restaurants (
          id,
          name,
          address,
          city,
          category
        )
      `)
      .eq('list_id', listId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('❌ Error fetching restaurants:', itemsError);
    }

    const restaurants = (listItems || []).map((item) => ({
      id: item.restaurants.id,
      name: item.restaurants.name,
      cuisine_type: item.restaurants.category || 'Restaurant',
      neighborhood: item.restaurants.city || '',
      address: item.restaurants.address || ''
    }));

    console.log(`📍 Found ${restaurants.length} restaurants`);

    // Phase 2: Fetch photos for each restaurant with attribution
    console.log(`📸 Fetching photos for ${restaurants.length} restaurants...`);
    const restaurantIds = restaurants.map(r => r.id);
    
    const photoPromises = restaurantIds.map(async (restaurantId: number) => {
      const photoInfo = await getRestaurantPhotoForGuide(restaurantId, list.author_id, supabase);
      return { restaurantId, photoInfo };
    });
    
    const photoResults = await Promise.all(photoPromises);
    const photoMap = new Map<number, RestaurantPhotoInfo>();
    for (const { restaurantId, photoInfo } of photoResults) {
      photoMap.set(restaurantId, photoInfo);
    }

    // Enhance restaurants with photo data
    const restaurantsWithPhotos = restaurants.map(restaurant => {
      const photoInfo = photoMap.get(restaurant.id);
      return {
        ...restaurant,
        photo_url: photoInfo?.photo_url || null,
        photo_source: photoInfo?.photo_source || null,
        photo_contributor: photoInfo?.photo_contributor || null,
        photo_recommendation_id: photoInfo?.photo_recommendation_id || null
      };
    });

    console.log(`📸 Photos fetched: ${photoResults.filter(p => p.photoInfo.photo_url).length}/${restaurants.length} have photos`);

    let hasLiked = false;
    let isBookmarked = false;

    if (currentUserId) {
      const [likeResult, bookmarkResult] = await Promise.all([
        supabase
          .from('list_likes')
          .select('id')
          .eq('list_id', listId)
          .eq('user_id', currentUserId)
          .single(),
        supabase
          .from('list_bookmarks')
          .select('id')
          .eq('list_id', listId)
          .eq('user_id', currentUserId)
          .single()
      ]);

      hasLiked = !!(likeResult.data && !likeResult.error);
      isBookmarked = !!(bookmarkResult.data && !bookmarkResult.error);
    }

    // FIXED: Match frontend field names exactly
    const response = {
      id: list.id,
      title: list.title,
      description: list.description || '',
      content: list.context_description || list.description || '',
      category: list.category || '',
      tags: list.tags || [],
      neighborhood: list.city || '',
      visibility: list.visibility || (list.is_public ? 'public' : 'private'),
      cover_image_url: list.cover_image_url || null,
      cover_image_source: list.cover_image_source || null,
      likes_count: list.likes_count || 0,
      bookmarks_count: list.bookmarks_count || 0,
      user_has_liked: hasLiked,           // FIXED: renamed from hasLiked
      user_has_bookmarked: isBookmarked,  // FIXED: renamed from isBookmarked
      created_at: list.created_at,
      updated_at: list.updated_at,
      creator: {
        id: creatorData?.id || list.author_id || 'unknown',
        username: creatorData?.username || 'Food Expert',
        display_name: creatorData?.display_name || null,  // FIXED: added display_name
        avatar: creatorData?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=foodexpert`,  // FIXED: added avatar field
        profile_photo_url: creatorData?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=foodexpert`,
        reputation_score: creatorData?.reputation_score || 0
      },
      restaurants: restaurantsWithPhotos  // Phase 2: includes photo_url, photo_source, photo_contributor
    };

    console.log(`✅ Sending response with ${restaurantsWithPhotos.length} restaurants`);

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching list details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list details'
    });
  }
});

// =============================================================================
// COVER IMAGE UPLOAD ENDPOINT
// =============================================================================

/**
 * PATCH /:listId/cover - Upload a new cover image for a guide (owner only)
 * 
 * Request: multipart/form-data with 'cover' field containing image file
 * Response: { success: true, cover_image_url: "https://...", cover_image_source: "user_upload" }
 */
router.patch('/:listId/cover', authenticate, uploadCoverImage.single('cover'), async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Check if Pinata is configured
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      console.error('🖼️ Cover upload error: Pinata not configured');
      return res.status(500).json({
        success: false,
        error: 'Image storage not configured'
      });
    }

    // Verify the user owns this guide
    const { data: guide, error: guideError } = await supabase
      .from('food_guides')
      .select('id, author_id, title')
      .eq('id', listId)
      .single();

    if (guideError || !guide) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }

    if (guide.author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the guide owner can update the cover image' });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    console.log(`🖼️ Uploading cover image for guide "${guide.title}" (${listId})...`);

    // Upload to Pinata
    const filename = `bocaboca-guide-cover-${listId}-${Date.now()}.${file.mimetype.split('/')[1] || 'jpg'}`;
    
    const startTime = Date.now();
    const cid = await uploadCoverToPinata(
      file.buffer,
      filename,
      file.mimetype,
      {
        guideId: listId,
        userId: userId
      }
    );
    const duration = Date.now() - startTime;

    const coverImageUrl = `${PINATA_GATEWAY}${cid}`;

    // Update the guide with the new cover image
    const { error: updateError } = await supabase
      .from('food_guides')
      .update({
        cover_image_url: coverImageUrl,
        cover_image_source: 'user_upload',
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (updateError) {
      console.error('🖼️ Error updating guide cover:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update guide' });
    }

    console.log(`🖼️ Cover image uploaded: ${cid} (${duration}ms) -> ${coverImageUrl}`);

    res.json({
      success: true,
      cover_image_url: coverImageUrl,
      cover_image_source: 'user_upload',
      cid: cid
    });

  } catch (error: any) {
    console.error('🖼️ Cover image upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload cover image'
    });
  }
});

/**
 * DELETE /:listId/cover - Reset cover image to auto-generated (Google Places photo)
 * 
 * This removes the user-uploaded cover and reverts to the automatically
 * selected photo from the first restaurant in the guide.
 */
router.delete('/:listId/cover', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Verify the user owns this guide
    const { data: guide, error: guideError } = await supabase
      .from('food_guides')
      .select('id, author_id, title, cover_image_source')
      .eq('id', listId)
      .single();

    if (guideError || !guide) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }

    if (guide.author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the guide owner can reset the cover image' });
    }

    console.log(`🖼️ Resetting cover image for guide "${guide.title}" (${listId}) to auto-generated...`);

    // IMPORTANT: First clear the cover_image_source so setGuideCoverImage won't skip it
    // (that function respects user_upload and won't override it)
    const { error: clearError } = await supabase
      .from('food_guides')
      .update({
        cover_image_url: null,
        cover_image_source: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (clearError) {
      console.error('🖼️ Error clearing cover before reset:', clearError);
      return res.status(500).json({ success: false, error: 'Failed to reset cover image' });
    }

    // Now use the existing service to re-fetch from Google Places
    const cacheService = getGooglePlacesCacheService();
    const coverResult = await cacheService.setGuideCoverImage(listId);

    if (coverResult.success && coverResult.coverImageUrl) {
      console.log(`🖼️ Cover reset to Google Places photo from ${coverResult.restaurantName}: ${coverResult.coverImageUrl}`);
      
      res.json({
        success: true,
        cover_image_url: coverResult.coverImageUrl,
        cover_image_source: 'google_places',
        restaurant_name: coverResult.restaurantName,
        message: 'Cover image reset to auto-generated photo'
      });
    } else {
      // If no Google Places photo available, cover is already cleared
      console.log(`🖼️ Cover cleared (no Google Places photo available)`);
      
      res.json({
        success: true,
        cover_image_url: null,
        cover_image_source: null,
        message: 'Cover image cleared (no auto-generated photo available)'
      });
    }

  } catch (error: any) {
    console.error('🖼️ Cover reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset cover image'
    });
  }
});

// POST /:listId/like - Toggle like on a list
router.post('/:listId/like', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const userId = req.user!.id;

    console.log(`POST /api/lists/${listId}/like - user: ${userId}`);

    const { data: existingLike } = await supabase
      .from('list_likes')
      .select('id')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('list_likes')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error unliking:', deleteError);
        throw deleteError;
      }

      const { error: decrementError } = await supabase
        .rpc('decrement_list_likes', { p_list_id: listId });

      if (decrementError) {
        console.error('⚠️ Warning: Failed to decrement like count:', decrementError);
      }

      const { data: listData } = await supabase
        .from('food_guides')
        .select('likes_count')
        .eq('id', listId)
        .single();

      console.log(`✅ List unliked, new count: ${listData?.likes_count || 0}`);

      res.json({
        success: true,
        action: 'unliked',
        list_id: listId,
        new_count: listData?.likes_count || 0,
        message: 'List unliked successfully'
      });
    } else {
      const { error: insertError } = await supabase
        .from('list_likes')
        .insert({
          list_id: listId,
          user_id: userId
        });

      if (insertError) {
        console.error('❌ Error liking:', insertError);
        throw insertError;
      }

      const { error: incrementError } = await supabase
        .rpc('increment_list_likes', { p_list_id: listId });

      if (incrementError) {
        console.error('⚠️ Warning: Failed to increment like count:', incrementError);
      }

      const { data: listData } = await supabase
        .from('food_guides')
        .select('likes_count')
        .eq('id', listId)
        .single();

      console.log(`✅ List liked, new count: ${listData?.likes_count || 0}`);

      res.json({
        success: true,
        action: 'liked',
        list_id: listId,
        new_count: listData?.likes_count || 0,
        message: 'List liked successfully'
      });
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle like'
    });
  }
});

// POST /:listId/bookmark - Toggle bookmark on a list
router.post('/:listId/bookmark', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { listId } = req.params;
    const userId = req.user!.id;

    console.log(`POST /api/lists/${listId}/bookmark - user: ${userId}`);

    const { data: existingBookmark } = await supabase
      .from('list_bookmarks')
      .select('id')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .single();

    if (existingBookmark) {
      const { error: deleteError } = await supabase
        .from('list_bookmarks')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error unbookmarking:', deleteError);
        throw deleteError;
      }

      const { error: decrementError } = await supabase
        .rpc('decrement_list_bookmarks', { p_list_id: listId });

      if (decrementError) {
        console.error('⚠️ Warning: Failed to decrement bookmark count:', decrementError);
      }

      const { data: listData } = await supabase
        .from('food_guides')
        .select('bookmarks_count')
        .eq('id', listId)
        .single();

      console.log(`✅ List unbookmarked, new count: ${listData?.bookmarks_count || 0}`);

      res.json({
        success: true,
        action: 'unbookmarked',
        list_id: listId,
        new_count: listData?.bookmarks_count || 0,
        message: 'List removed from bookmarks'
      });
    } else {
      const { error: insertError } = await supabase
        .from('list_bookmarks')
        .insert({
          list_id: listId,
          user_id: userId
        });

      if (insertError) {
        console.error('❌ Error bookmarking:', insertError);
        throw insertError;
      }

      const { error: incrementError } = await supabase
        .rpc('increment_list_bookmarks', { p_list_id: listId });

      if (incrementError) {
        console.error('⚠️ Warning: Failed to increment bookmark count:', incrementError);
      }

      const { data: listData } = await supabase
        .from('food_guides')
        .select('bookmarks_count, user_id')
        .eq('id', listId)
        .single();
      
      // Check for guide milestone rewards (10 saves, 50 saves)
      // Only award if someone else is bookmarking (not the owner)
      if (listData?.user_id && listData.user_id !== userId) {
        const newCount = listData.bookmarks_count || 0;
        await checkGuideMilestoneRewards(listId, listData.user_id, newCount);
      }

      console.log(`✅ List bookmarked, new count: ${listData?.bookmarks_count || 0}`);

      res.json({
        success: true,
        action: 'bookmarked',
        list_id: listId,
        new_count: listData?.bookmarks_count || 0,
        message: 'List added to bookmarks'
      });
    }
  } catch (error) {
    console.error('❌ Error toggling bookmark:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle bookmark'
    });
  }
});

export default router;