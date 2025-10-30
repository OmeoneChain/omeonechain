// File: code/poc/core/src/api/routes/discovery.ts
// Discovery Requests Routes: Bounty-based Q&A for restaurant recommendations
// MVP Version: Core flow without blockchain (defer bounty/token mechanics to later)

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase configuration required for discovery routes');
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

const getRequestsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['open', 'answered', 'closed', 'all']).optional(),
  location: z.string().optional(),
  cuisine_type: z.string().optional(),
  occasion: z.string().optional(),
  search: z.string().optional()
});

const createRequestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).optional(),
  location: z.string().max(200).optional(),
  cuisine_type: z.string().max(100).optional(),
  occasion: z.enum(['date_night', 'family', 'business', 'casual', 'celebration', 'group', 'solo']).optional(),
  budget_range: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  bounty_amount: z.number().min(0).default(0) // MVP: Always 0, add bounty logic later
});

const createResponseSchema = z.object({
  response_text: z.string().min(20).max(2000),
  restaurant_recommendations: z.array(z.object({
    restaurant_id: z.number(),
    notes: z.string().optional(),
    dish_recommendations: z.array(z.string()).optional()
  })).min(1).max(10)
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
// ROUTES: DISCOVERY REQUESTS
// =============================================================================

/**
 * GET /api/discovery/requests
 * Get all discovery requests with optional filtering
 */
router.get('/requests', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 GET /api/discovery/requests - Fetching requests:', req.query);
    
    const validation = getRequestsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      console.error('❌ Query validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.errors
      });
    }

    const { limit, status, location, cuisine_type, occasion, search } = validation.data;
    const currentUserId = req.user?.id;

    console.log('🔍 Query params:', { limit, status, location, cuisine_type, occasion, search });

    // Build query
    let query = supabase
      .from('discovery_requests')
      .select(`
        id,
        title,
        description,
        location,
        cuisine_type,
        occasion,
        budget_range,
        dietary_restrictions,
        bounty_amount,
        status,
        response_count,
        view_count,
        created_at,
        updated_at,
        creator_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      // Default to open requests if no status specified
      query = query.eq('status', 'open');
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (cuisine_type) {
      query = query.eq('cuisine_type', cuisine_type);
    }

    if (occasion) {
      query = query.eq('occasion', occasion);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('❌ Error fetching requests:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch requests',
        details: error.message
      });
    }

    // Fetch creator information for each request
    const requestsWithCreators = await Promise.all(
      (requests || []).map(async (request) => {
        const { data: creator } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, reputation_score')
          .eq('id', request.creator_id)
          .single();

        return {
          ...request,
          creator: creator || {
            id: request.creator_id,
            username: 'user',
            display_name: 'Anonymous',
            avatar_url: null,
            reputation_score: 0
          }
        };
      })
    );

    console.log(`✅ Found ${requestsWithCreators.length} requests`);

    res.json({
      success: true,
      requests: requestsWithCreators,
      count: requestsWithCreators.length,
      filters: { limit, status, location, cuisine_type, occasion, search }
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch discovery requests'
    });
  }
});

/**
 * GET /api/discovery/requests/:id
 * Get single discovery request with all responses
 */
router.get('/requests/:id', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    console.log(`📋 GET /api/discovery/requests/${id} - Fetch request details`);

    // Increment view count - fetch current count and increment
    const { data: currentRequest } = await supabase
      .from('discovery_requests')
      .select('view_count')
      .eq('id', id)
      .single();
    
    if (currentRequest) {
      await supabase
        .from('discovery_requests')
        .update({ view_count: (currentRequest.view_count || 0) + 1 })
        .eq('id', id);
    }

    // Fetch request
    const { data: request, error: requestError } = await supabase
      .from('discovery_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      console.error('❌ Request not found:', requestError);
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    // Fetch creator
    const { data: creator } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, reputation_score')
      .eq('id', request.creator_id)
      .single();

    // Fetch responses
    const { data: responses, error: responsesError } = await supabase
      .from('discovery_responses')
      .select('*')
      .eq('request_id', id)
      .order('is_best_answer', { ascending: false })
      .order('upvotes_count', { ascending: false })
      .order('created_at', { ascending: true });

    if (responsesError) {
      console.error('❌ Error fetching responses:', responsesError);
    }

    // Fetch responders for each response
    const responsesWithData = await Promise.all(
      (responses || []).map(async (response) => {
        const { data: responder } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, reputation_score')
          .eq('id', response.responder_id)
          .single();

        // Fetch restaurant details for recommendations
        const restaurantIds = (response.restaurant_recommendations as any[])?.map(r => r.restaurant_id) || [];
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id, name, address, city, category')
          .in('id', restaurantIds);

        // Merge restaurant data with recommendations
        const enrichedRecommendations = (response.restaurant_recommendations as any[])?.map(rec => {
          const restaurant = restaurants?.find(r => r.id === rec.restaurant_id);
          return {
            ...rec,
            restaurant: restaurant || { id: rec.restaurant_id, name: 'Restaurant' }
          };
        });

        // Check if current user has upvoted this response
        let hasUpvoted = false;
        if (currentUserId) {
          const { data: vote } = await supabase
            .from('discovery_response_votes')
            .select('id')
            .eq('response_id', response.id)
            .eq('user_id', currentUserId)
            .single();
          
          hasUpvoted = !!vote;
        }

        return {
          ...response,
          responder: responder || {
            id: response.responder_id,
            username: 'user',
            display_name: 'Food Expert',
            avatar_url: null,
            reputation_score: 0
          },
          restaurant_recommendations: enrichedRecommendations,
          user_has_upvoted: hasUpvoted
        };
      })
    );

    // Check if current user has bookmarked this request
    let isBookmarked = false;
    if (currentUserId) {
      const { data: bookmark } = await supabase
        .from('discovery_bookmarks')
        .select('id')
        .eq('request_id', id)
        .eq('user_id', currentUserId)
        .single();
      
      isBookmarked = !!bookmark;
    }

    console.log(`✅ Request fetched with ${responsesWithData.length} responses`);

    res.json({
      success: true,
      request: {
        ...request,
        creator: creator || {
          id: request.creator_id,
          username: 'user',
          display_name: 'Anonymous',
          avatar_url: null,
          reputation_score: 0
        },
        is_bookmarked: isBookmarked,
        is_creator: currentUserId === request.creator_id
      },
      responses: responsesWithData
    });

  } catch (error) {
    console.error('❌ Error fetching request details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request details'
    });
  }
});

/**
 * POST /api/discovery/requests
 * Create new discovery request
 */
router.post('/requests', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 POST /api/discovery/requests - Create new request');
    console.log('Request body:', req.body);

    const validation = createRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Request validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const validatedData = validation.data;
    const currentUser = req.user as { id: string; address: string };

    const requestData = {
      title: validatedData.title,
      description: validatedData.description || null,
      location: validatedData.location || null,
      cuisine_type: validatedData.cuisine_type || null,
      occasion: validatedData.occasion || null,
      budget_range: validatedData.budget_range || null,
      dietary_restrictions: validatedData.dietary_restrictions || [],
      bounty_amount: 0, // MVP: Always 0, add bounty logic later
      bounty_status: 'none',
      status: 'open',
      creator_id: currentUser.id,
      response_count: 0,
      view_count: 0,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating request with data:', requestData);

    const { data: newRequest, error: requestError } = await supabase
      .from('discovery_requests')
      .insert(requestData)
      .select('*')
      .single();

    if (requestError) {
      console.error('❌ Database error creating request:', requestError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create request',
        details: requestError.message
      });
    }

    console.log(`✅ Request created successfully with ID: ${newRequest.id}`);

    res.status(201).json({
      success: true,
      request: newRequest,
      message: `Request "${newRequest.title}" created successfully`
    });

  } catch (error) {
    console.error('❌ Unexpected error creating request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating request'
    });
  }
});

/**
 * POST /api/discovery/requests/:id/responses
 * Submit response to a discovery request
 */
router.post('/requests/:id/responses', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { id: requestId } = req.params;
    const currentUser = req.user as { id: string; address: string };

    console.log(`📋 POST /api/discovery/requests/${requestId}/responses - Submit response`);
    console.log('Response body:', req.body);

    const validation = createResponseSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Response validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid response data',
        details: validation.error.errors
      });
    }

    const validatedData = validation.data;

    // Check if request exists and is still open
    const { data: request, error: requestError } = await supabase
      .from('discovery_requests')
      .select('id, status, creator_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Cannot respond to a closed request'
      });
    }

    // Verify restaurants exist
    const restaurantIds = validatedData.restaurant_recommendations.map(r => r.restaurant_id);
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
      
      return res.status(400).json({
        success: false,
        error: 'Some restaurants do not exist',
        missing_restaurants: missingIds
      });
    }

    const responseData = {
      request_id: requestId,
      responder_id: currentUser.id,
      response_text: validatedData.response_text,
      restaurant_recommendations: validatedData.restaurant_recommendations,
      upvotes_count: 0,
      tips_received: 0,
      is_best_answer: false,
      is_helpful: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newResponse, error: responseError } = await supabase
      .from('discovery_responses')
      .insert(responseData)
      .select('*')
      .single();

    if (responseError) {
      console.error('❌ Database error creating response:', responseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create response',
        details: responseError.message
      });
    }

    console.log(`✅ Response created successfully with ID: ${newResponse.id}`);

    // TODO: Award tokens to responder (future blockchain integration)
    // TODO: Notify request creator of new response

    res.status(201).json({
      success: true,
      response: newResponse,
      message: 'Response submitted successfully'
    });

  } catch (error) {
    console.error('❌ Unexpected error creating response:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while submitting response'
    });
  }
});

/**
 * PATCH /api/discovery/requests/:requestId/best-answer/:responseId
 * Mark a response as the best answer (only request creator can do this)
 */
router.patch('/requests/:requestId/best-answer/:responseId', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { requestId, responseId } = req.params;
    const currentUser = req.user as { id: string; address: string };

    console.log(`📋 PATCH /api/discovery/requests/${requestId}/best-answer/${responseId}`);

    // Verify request exists and user is creator
    const { data: request, error: requestError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, status')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    if (request.creator_id !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the request creator can select the best answer'
      });
    }

    // Verify response exists
    const { data: response, error: responseError } = await supabase
      .from('discovery_responses')
      .select('id, request_id')
      .eq('id', responseId)
      .eq('request_id', requestId)
      .single();

    if (responseError || !response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found'
      });
    }

    // Remove best_answer flag from other responses
    await supabase
      .from('discovery_responses')
      .update({ is_best_answer: false })
      .eq('request_id', requestId);

    // Mark this response as best answer
    const { error: updateError } = await supabase
      .from('discovery_responses')
      .update({ 
        is_best_answer: true,
        is_helpful: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId);

    if (updateError) {
      console.error('❌ Error marking best answer:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark best answer'
      });
    }

    // Update request with best answer and status
    await supabase
      .from('discovery_requests')
      .update({
        best_answer_id: responseId,
        status: 'answered',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    console.log(`✅ Response ${responseId} marked as best answer`);

    // TODO: Award bounty tokens to responder (future blockchain integration)
    // TODO: Notify responder of best answer selection

    res.json({
      success: true,
      message: 'Best answer selected successfully'
    });

  } catch (error) {
    console.error('❌ Error selecting best answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select best answer'
    });
  }
});

/**
 * POST /api/discovery/responses/:id/upvote
 * Toggle upvote on a response
 */
router.post('/responses/:id/upvote', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { id: responseId } = req.params;
    const currentUser = req.user as { id: string; address: string };

    console.log(`📋 POST /api/discovery/responses/${responseId}/upvote`);

    // Check if already upvoted
    const { data: existingVote } = await supabase
      .from('discovery_response_votes')
      .select('id')
      .eq('response_id', responseId)
      .eq('user_id', currentUser.id)
      .single();

    if (existingVote) {
      // Remove upvote
      const { error: deleteError } = await supabase
        .from('discovery_response_votes')
        .delete()
        .eq('response_id', responseId)
        .eq('user_id', currentUser.id);

      if (deleteError) {
        console.error('❌ Error removing upvote:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove upvote'
        });
      }

      res.json({
        success: true,
        action: 'removed',
        message: 'Upvote removed'
      });
    } else {
      // Add upvote
      const { error: insertError } = await supabase
        .from('discovery_response_votes')
        .insert({
          response_id: responseId,
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error adding upvote:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to add upvote'
        });
      }

      res.json({
        success: true,
        action: 'added',
        message: 'Upvoted successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error toggling upvote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle upvote'
    });
  }
});

/**
 * POST /api/discovery/requests/:id/bookmark
 * Toggle bookmark on a request
 */
router.post('/requests/:id/bookmark', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { id: requestId } = req.params;
    const currentUser = req.user as { id: string; address: string };

    console.log(`📋 POST /api/discovery/requests/${requestId}/bookmark`);

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('discovery_bookmarks')
      .select('id')
      .eq('request_id', requestId)
      .eq('user_id', currentUser.id)
      .single();

    if (existingBookmark) {
      // Remove bookmark
      const { error: deleteError } = await supabase
        .from('discovery_bookmarks')
        .delete()
        .eq('request_id', requestId)
        .eq('user_id', currentUser.id);

      if (deleteError) {
        console.error('❌ Error removing bookmark:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove bookmark'
        });
      }

      res.json({
        success: true,
        action: 'removed',
        message: 'Bookmark removed'
      });
    } else {
      // Add bookmark
      const { error: insertError } = await supabase
        .from('discovery_bookmarks')
        .insert({
          request_id: requestId,
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error adding bookmark:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to add bookmark'
        });
      }

      res.json({
        success: true,
        action: 'added',
        message: 'Bookmarked successfully'
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

/**
 * PATCH /api/discovery/requests/:id/close
 * Close a request (only creator can do this)
 */
router.patch('/requests/:id/close', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { id: requestId } = req.params;
    const currentUser = req.user as { id: string; address: string };

    console.log(`📋 PATCH /api/discovery/requests/${requestId}/close`);

    // Verify request exists and user is creator
    const { data: request, error: requestError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, status')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    if (request.creator_id !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the request creator can close the request'
      });
    }

    if (request.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Request is already closed'
      });
    }

    // Close the request
    const { error: updateError } = await supabase
      .from('discovery_requests')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ Error closing request:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to close request'
      });
    }

    console.log(`✅ Request ${requestId} closed`);

    res.json({
      success: true,
      message: 'Request closed successfully'
    });

  } catch (error) {
    console.error('❌ Error closing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close request'
    });
  }
});

export default router;