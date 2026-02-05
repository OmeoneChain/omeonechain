// File: code/poc/core/src/api/routes/guides.ts
// List routes: CRUD operations, interactions, and user profile integration
// COMPLETE: All list functionality consolidated from server.ts
// FIXED: Response field names match frontend expectations
// UPDATED: 2026-02-05 - Added cover image auto-population from Google Places

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getRewardService } from '../../services/reward-service';
import { getGooglePlacesCacheService } from '../../services/google-places-cache';

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
      restaurants: restaurants  // FIXED: renamed from list_restaurants
    };

    console.log(`✅ Sending response with ${restaurants.length} restaurants`);

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching list details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list details'
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