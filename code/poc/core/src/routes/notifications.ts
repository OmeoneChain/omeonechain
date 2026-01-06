// File: code/poc/core/src/routes/notifications.ts
// Notifications API Routes - Phase 1 Social Features
// FIXED: Changed table name from 'user_notifications' to 'notifications'
// Handles: List, Mark Read, Delete notifications + Unread count

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for notifications routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getNotificationsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 50) : 20),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
  unread_only: z.string().optional().transform((val) => val === 'true')
});

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address?: string;
    email?: string;
    accountTier: 'email_basic' | 'wallet_full';
    authMethod: string;
  };
}

type NotificationType = 
  | 'comment' 
  | 'comment_reply'
  | 'reply' 
  | 'like' 
  | 'comment_like'
  | 'reshare' 
  | 'follow'
  | 'mention';

interface NotificationContent {
  comment_preview?: string;
  recommendation_title?: string;
  user_count?: number;
  [key: string]: any;
}

interface NotificationWithDetails {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  target_type: string | null;
  target_id: string | null;
  content: NotificationContent;
  read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  grouped_actors?: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format notification with actor details and grouping
 */
async function formatNotification(notification: any): Promise<NotificationWithDetails> {
  let actor = null;
  let groupedActors = undefined;

  // Get actor info if present
  if (notification.actor_id) {
    const { data: actorData } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', notification.actor_id)
      .maybeSingle();

    actor = actorData || {
      id: notification.actor_id,
      username: 'deleted_user',
      display_name: 'Deleted User',
      avatar_url: null
    };
  }

  // Check for grouped notifications (multiple people doing same action)
  if (notification.content?.user_count && notification.content.user_count > 1) {
    // Get similar recent notifications for grouping
    const { data: similarNotifications } = await supabase
      .from('notifications')
      .select('actor_id')
      .eq('user_id', notification.user_id)
      .eq('type', notification.type)
      .eq('target_id', notification.target_id)
      .neq('actor_id', notification.actor_id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (similarNotifications && similarNotifications.length > 0) {
      // Get details for grouped actors
      const actorIds = similarNotifications
        .map(n => n.actor_id)
        .filter(id => id !== null);

      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', actorIds)
          .limit(3);

        groupedActors = actors || [];
      }
    }
  }

  return {
    id: notification.id,
    user_id: notification.user_id,
    actor_id: notification.actor_id,
    type: notification.type,
    target_type: notification.target_type,
    target_id: notification.target_id,
    content: notification.content || {},
    read: notification.read,
    read_at: notification.read_at,
    created_at: notification.created_at,
    actor,
    grouped_actors: groupedActors
  };
}

/**
 * Generate notification message based on type
 */
function getNotificationMessage(notification: NotificationWithDetails): string {
  const actorName = notification.actor?.display_name || 'Someone';
  const groupCount = notification.content?.user_count || 0;
  const others = groupCount > 1 ? ` and ${groupCount - 1} other${groupCount > 2 ? 's' : ''}` : '';

  switch (notification.type) {
    case 'comment':
      return `${actorName}${others} commented on your recommendation`;
    
    case 'reply':
    case 'comment_reply':
      return `${actorName}${others} replied to your comment`;
    
    case 'like':
      return `${actorName}${others} liked your recommendation`;
    
    case 'comment_like':
      return `${actorName}${others} liked your comment`;
    
    case 'reshare':
      return `${actorName}${others} reshared your recommendation`;
    
    case 'follow':
      return `${actorName}${others} started following you`;
    
    case 'mention':
      return `${actorName}${others} mentioned you`;
    
    default:
      return `${actorName} interacted with your content`;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/notifications
 * Get user's notifications with optional filtering
 */
router.get(
  '/notifications',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🔔 GET notifications for user: ${userId}`);

      // Validate query params
      const validation = getNotificationsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors
        });
      }

      const { limit, offset, unread_only } = validation.data;

      // Build query - FIXED: Use 'notifications' table
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      // Filter by read status if requested
      if (unread_only) {
        query = query.eq('read', false);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: notifications, error: notificationsError } = await query;

      if (notificationsError) {
        console.error('❌ Error fetching notifications:', notificationsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch notifications'
        });
      }

      // Format all notifications with details
      const formattedNotifications = await Promise.all(
        (notifications || []).map(async (notification) => {
          const formatted = await formatNotification(notification);
          return {
            ...formatted,
            message: getNotificationMessage(formatted)
          };
        })
      );

      // Get total unread count - FIXED: Use 'notifications' table
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      // Get total count for pagination - FIXED: Use 'notifications' table
      const { count: totalCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      console.log(`✅ Retrieved ${formattedNotifications.length} notifications (${unreadCount} unread)`);

      res.json({
        success: true,
        notifications: formattedNotifications,
        unread_count: unreadCount || 0,
        total_count: totalCount || 0,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < (totalCount || 0)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications (for badge)
 */
router.get(
  '/notifications/unread-count',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🔢 GET unread count for user: ${userId}`);

      // Get unread count - FIXED: Use 'notifications' table
      const { count: unreadCount, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (countError) {
        console.error('❌ Error fetching unread count:', countError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch unread count'
        });
      }

      console.log(`✅ Unread count: ${unreadCount}`);

      res.json({
        success: true,
        unread_count: unreadCount || 0
      });

    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread count'
      });
    }
  }
);

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch(
  '/notifications/:notificationId/read',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`✅ PATCH mark notification ${notificationId} as read by user ${userId}`);

      // Get notification to verify ownership - FIXED: Use 'notifications' table
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, user_id, read')
        .eq('id', notificationId)
        .maybeSingle();

      if (fetchError || !notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Check ownership
      if (notification.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only mark your own notifications as read'
        });
      }

      // Already read? Just return success
      if (notification.read) {
        return res.json({
          success: true,
          message: 'Notification already marked as read',
          notification_id: notificationId
        });
      }

      // Mark as read - FIXED: Use 'notifications' table and set read_at
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (updateError) {
        console.error('❌ Error marking notification as read:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to mark notification as read',
          details: updateError.message
        });
      }

      console.log(`✅ Notification marked as read: ${notificationId}`);

      res.json({
        success: true,
        message: 'Notification marked as read',
        notification_id: notificationId
      });

    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  }
);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch(
  '/notifications/read-all',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`✅ PATCH mark all notifications as read for user ${userId}`);

      // Mark all unread notifications as read - FIXED: Use 'notifications' table and set read_at
      const { data: updatedNotifications, error: updateError } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select('id');

      if (updateError) {
        console.error('❌ Error marking all notifications as read:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to mark all notifications as read',
          details: updateError.message
        });
      }

      const count = updatedNotifications?.length || 0;

      console.log(`✅ Marked ${count} notifications as read`);

      res.json({
        success: true,
        message: `Marked ${count} notification${count !== 1 ? 's' : ''} as read`,
        count
      });

    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/notifications/:notificationId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🗑️ DELETE notification ${notificationId} by user ${userId}`);

      // Get notification to verify ownership - FIXED: Use 'notifications' table
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, user_id')
        .eq('id', notificationId)
        .maybeSingle();

      if (fetchError || !notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Check ownership
      if (notification.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own notifications'
        });
      }

      // Delete notification - FIXED: Use 'notifications' table
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) {
        console.error('❌ Error deleting notification:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete notification',
          details: deleteError.message
        });
      }

      console.log(`✅ Notification deleted: ${notificationId}`);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        notification_id: notificationId
      });

    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification'
      });
    }
  }
);

/**
 * DELETE /api/notifications/clear-all
 * Delete all read notifications (cleanup)
 */
router.delete(
  '/notifications/clear-all',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🗑️ DELETE all read notifications for user ${userId}`);

      // Delete only read notifications (keep unread) - FIXED: Use 'notifications' table
      const { data: deletedNotifications, error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true)
        .select('id');

      if (deleteError) {
        console.error('❌ Error clearing notifications:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to clear notifications',
          details: deleteError.message
        });
      }

      const count = deletedNotifications?.length || 0;

      console.log(`✅ Cleared ${count} read notifications`);

      res.json({
        success: true,
        message: `Cleared ${count} read notification${count !== 1 ? 's' : ''}`,
        count
      });

    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear notifications'
      });
    }
  }
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;