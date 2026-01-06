/**
 * Restaurant Details & Photo Routes
 * 
 * Handles:
 * - Restaurant details with Google Places caching
 * - Photo submissions and voting
 * - Header photo selection with BOCA rewards
 * 
 * Location: code/poc/core/src/api/routes/restaurant-details.ts
 */

import express, { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { getGooglePlacesService } from '../../services/google-places';

const router: Router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

// ============================================================================
// RESTAURANT DETAILS ENDPOINTS
// ============================================================================

/**
 * GET /api/restaurants/:id/details
 * 
 * Get full restaurant details with Google Places data.
 * Automatically fetches from Google if data is missing or expired.
 * 
 * Query params:
 * - refresh=true: Force refresh from Google Places API
 */
router.get('/:id/details', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    const googlePlacesService = getGooglePlacesService();
    const restaurant = await googlePlacesService.getRestaurantDetails(id, forceRefresh);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Get additional stats
    const { data: stats } = await supabase
      .from('recommendations')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', id);

    const { data: headerPhoto } = await supabase
      .from('restaurant_photos')
      .select('photo_url, user_id, caption')
      .eq('restaurant_id', id)
      .eq('is_header_photo', true)
      .single();

    // Get top photos (for carousel)
    const { data: photos } = await supabase
      .from('restaurant_photos')
      .select(`
        id,
        photo_url,
        thumbnail_url,
        caption,
        photo_type,
        vote_count,
        user_id,
        users:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('restaurant_id', id)
      .eq('status', 'approved')
      .order('vote_count', { ascending: false })
      .limit(10);

    return res.json({
      success: true,
      restaurant: {
        ...restaurant,
        recommendation_count: stats?.length || 0,
        header_photo: headerPhoto,
        photos: photos || [],
      }
    });

  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant details'
    });
  }
});

/**
 * POST /api/restaurants/:id/refresh
 * 
 * Manually refresh Google Places data for a restaurant.
 * Useful for admins or if data seems stale.
 */
router.post('/:id/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const googlePlacesService = getGooglePlacesService();
    const restaurant = await googlePlacesService.refreshRestaurant(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or has no Google Place ID'
      });
    }

    return res.json({
      success: true,
      message: 'Restaurant data refreshed from Google Places',
      restaurant
    });

  } catch (error) {
    console.error('Error refreshing restaurant:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh restaurant data'
    });
  }
});

// ============================================================================
// PHOTO SUBMISSION ENDPOINTS
// ============================================================================

/**
 * POST /api/restaurants/:id/photos
 * 
 * Submit a photo for a restaurant.
 * Photos go into 'pending' status for moderation.
 */
router.post('/:id/photos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id: restaurantId } = req.params;
    const userId = (req as any).user.id;
    const { 
      photo_url, 
      thumbnail_url, 
      caption, 
      photo_type = 'general',
      width,
      height,
      file_size 
    } = req.body;

    if (!photo_url) {
      return res.status(400).json({
        success: false,
        error: 'photo_url is required'
      });
    }

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Check if user already has a pending/approved photo for this restaurant
    // (Optional: remove this check if you want unlimited submissions)
    const { data: existingPhoto } = await supabase
      .from('restaurant_photos')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingPhoto) {
      return res.status(400).json({
        success: false,
        error: 'You already have a photo submission for this restaurant'
      });
    }

    // Create photo submission
    const { data: photo, error: insertError } = await supabase
      .from('restaurant_photos')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        photo_url,
        thumbnail_url,
        caption,
        photo_type,
        width,
        height,
        file_size,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting photo:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit photo'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Photo submitted successfully! It will be reviewed shortly.',
      photo
    });

  } catch (error) {
    console.error('Error submitting photo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit photo'
    });
  }
});

/**
 * GET /api/restaurants/:id/photos
 * 
 * Get all approved photos for a restaurant.
 */
router.get('/:id/photos', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id: restaurantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: photos, error, count } = await supabase
      .from('restaurant_photos')
      .select(`
        id,
        photo_url,
        thumbnail_url,
        caption,
        photo_type,
        vote_count,
        is_header_photo,
        created_at,
        user_id,
        users:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .in('status', ['approved', 'featured'])
      .order('is_header_photo', { ascending: false })
      .order('vote_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      photos: photos || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Error fetching photos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch photos'
    });
  }
});

/**
 * POST /api/photos/:photoId/vote
 * 
 * Vote for a photo (for header selection contests).
 */
router.post('/photos/:photoId/vote', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = (req as any).user.id;

    // Check if photo exists and is approved
    const { data: photo, error: photoError } = await supabase
      .from('restaurant_photos')
      .select('id, status')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    if (photo.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Can only vote for approved photos'
      });
    }

    // Try to insert vote (will fail if already voted due to unique constraint)
    const { error: voteError } = await supabase
      .from('restaurant_photo_votes')
      .insert({
        photo_id: photoId,
        user_id: userId
      });

    if (voteError) {
      if (voteError.code === '23505') { // Unique violation
        return res.status(400).json({
          success: false,
          error: 'You have already voted for this photo'
        });
      }
      throw voteError;
    }

    // Get updated vote count
    const { data: updated } = await supabase
      .from('restaurant_photos')
      .select('vote_count')
      .eq('id', photoId)
      .single();

    return res.json({
      success: true,
      message: 'Vote recorded!',
      vote_count: updated?.vote_count || 0
    });

  } catch (error) {
    console.error('Error voting for photo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

/**
 * DELETE /api/photos/:photoId/vote
 * 
 * Remove vote from a photo.
 */
router.delete('/photos/:photoId/vote', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = (req as any).user.id;

    const { error } = await supabase
      .from('restaurant_photo_votes')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Get updated vote count
    const { data: updated } = await supabase
      .from('restaurant_photos')
      .select('vote_count')
      .eq('id', photoId)
      .single();

    return res.json({
      success: true,
      message: 'Vote removed',
      vote_count: updated?.vote_count || 0
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove vote'
    });
  }
});

// ============================================================================
// ADMIN/MODERATION ENDPOINTS
// ============================================================================

/**
 * PATCH /api/photos/:photoId/status
 * 
 * Update photo status (approve/reject).
 * Also handles selecting as header photo and awarding BOCA.
 * 
 * TODO: Add admin role check
 */
router.patch('/photos/:photoId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { photoId } = req.params;
    const { status, is_header_photo, reward_amount } = req.body;

    // TODO: Check if user is admin
    // For now, anyone authenticated can moderate (remove in production!)

    const updateData: any = { status };

    if (is_header_photo !== undefined) {
      updateData.is_header_photo = is_header_photo;
      if (is_header_photo) {
        updateData.featured_at = new Date().toISOString();
      }
    }

    if (reward_amount !== undefined && reward_amount > 0) {
      updateData.reward_amount = reward_amount;
      updateData.reward_status = 'awarded';
      updateData.reward_awarded_at = new Date().toISOString();
    }

    // If setting as header, first unset any existing header photo
    if (is_header_photo) {
      const { data: photo } = await supabase
        .from('restaurant_photos')
        .select('restaurant_id')
        .eq('id', photoId)
        .single();

      if (photo) {
        await supabase
          .from('restaurant_photos')
          .update({ is_header_photo: false })
          .eq('restaurant_id', photo.restaurant_id)
          .eq('is_header_photo', true);
      }
    }

    const { data: updated, error } = await supabase
      .from('restaurant_photos')
      .update(updateData)
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If reward was given, update user's token balance
    if (reward_amount && reward_amount > 0 && updated) {
      await supabase.rpc('award_photo_reward', {
        p_user_id: updated.user_id,
        p_photo_id: photoId,
        p_amount: reward_amount
      });
    }

    return res.json({
      success: true,
      photo: updated
    });

  } catch (error) {
    console.error('Error updating photo status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update photo'
    });
  }
});

/**
 * GET /api/photos/pending
 * 
 * Get all pending photos for moderation.
 * TODO: Add admin role check
 */
router.get('/photos/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const { data: photos, error } = await supabase
      .from('restaurant_photos')
      .select(`
        *,
        restaurant:restaurant_id (
          id,
          name,
          city
        ),
        user:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      photos: photos || []
    });

  } catch (error) {
    console.error('Error fetching pending photos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending photos'
    });
  }
});

export default router;