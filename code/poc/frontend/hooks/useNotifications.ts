// File: code/poc/frontend/hooks/useNotifications.ts
// Custom hook for managing notifications with real-time updates
// Updated for i18n support

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'react-hot-toast';

const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: 'comment' | 'comment_reply' | 'reply' | 'like' | 'comment_like' | 'reshare' | 'follow' | 'mention';
  target_type: string | null;
  target_id: string | null;
  content: {
    comment_preview?: string;
    recommendation_title?: string;
    reply_preview?: string;
    user_count?: number;
    recommendation_id?: string;
    [key: string]: any;
  };
  read: boolean;
  read_at: string | null;
  created_at: string;
  message?: string;
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

// i18n: Toast messages interface for translations
export interface NotificationToastMessages {
  markAllReadSuccess?: string;
  deletedSuccess?: string;
  clearedSuccess?: string;
  markReadError?: string;
  markAllReadError?: string;
  deleteError?: string;
  clearError?: string;
}

// Default English messages (fallback)
const DEFAULT_MESSAGES: Required<NotificationToastMessages> = {
  markAllReadSuccess: 'All notifications marked as read',
  deletedSuccess: 'Notification deleted',
  clearedSuccess: 'Read notifications cleared',
  markReadError: 'Failed to mark notification as read',
  markAllReadError: 'Failed to mark all as read',
  deleteError: 'Failed to delete notification',
  clearError: 'Failed to clear notifications',
};

interface UseNotificationsOptions {
  messages?: NotificationToastMessages;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllRead: () => Promise<void>;
  // Helpers
  getNotificationLink: (notification: Notification) => string;
  refresh: () => Promise<void>;
}

export function useNotifications(options?: UseNotificationsOptions): UseNotificationsReturn {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge provided messages with defaults
  const messages: Required<NotificationToastMessages> = {
    ...DEFAULT_MESSAGES,
    ...options?.messages,
  };

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (unreadOnly: boolean = false) => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const url = `${BACKEND_URL}/api/notifications${unreadOnly ? '?unread_only=true' : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  // Fetch just the unread count (lighter API call)
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unread_count || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [isAuthenticated, token]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, read: true, read_at: new Date().toISOString() } 
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        throw new Error('Failed to mark notification as read');
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      toast.error(messages.markReadError);
    }
  }, [isAuthenticated, token, messages.markReadError]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ 
            ...n, 
            read: true, 
            read_at: new Date().toISOString() 
          }))
        );
        setUnreadCount(0);
        toast.success(messages.markAllReadSuccess);
      } else {
        throw new Error('Failed to mark all as read');
      }
    } catch (err: any) {
      console.error('Error marking all as read:', err);
      toast.error(messages.markAllReadError);
    }
  }, [isAuthenticated, token, messages.markAllReadSuccess, messages.markAllReadError]);

  // Delete a single notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Capture current notification before deletion for unread check
    const targetNotification = notifications.find(n => n.id === notificationId);

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (targetNotification && !targetNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        toast.success(messages.deletedSuccess);
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      toast.error(messages.deleteError);
    }
  }, [isAuthenticated, token, notifications, messages.deletedSuccess, messages.deleteError]);

  // Clear all read notifications
  const clearAllRead = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.read));
        toast.success(messages.clearedSuccess);
      } else {
        throw new Error('Failed to clear notifications');
      }
    } catch (err: any) {
      console.error('Error clearing notifications:', err);
      toast.error(messages.clearError);
    }
  }, [isAuthenticated, token, messages.clearedSuccess, messages.clearError]);

  // Get the link for a notification based on its type and target
  const getNotificationLink = useCallback((notification: Notification): string => {
    console.log('🔗 Getting link for notification:', {
      type: notification.type,
      target_type: notification.target_type,
      target_id: notification.target_id,
      actor_id: notification.actor_id,
      content: notification.content
    });
    
    switch (notification.type) {
      case 'comment':
      case 'like':
      case 'reshare':
        console.log('→ Linking to recommendation:', notification.target_id);
        return `/recommendations/${notification.target_id}`;
      
      case 'comment_reply':
      case 'reply':
      case 'comment_like':
        if (notification.content?.recommendation_id) {
          console.log('→ Linking to recommendation from content:', notification.content.recommendation_id);
          return `/recommendations/${notification.content.recommendation_id}`;
        }
        console.warn('⚠️ No recommendation_id in notification content, linking to feed');
        return '/feed';
      
      case 'follow':
        console.log('→ Linking to user profile:', notification.actor_id);
        return `/users/${notification.actor_id}`;
      
      case 'mention':
        if (notification.target_type === 'recommendation') {
          return `/recommendations/${notification.target_id}`;
        } else if (notification.target_type === 'comment') {
          if (notification.content?.recommendation_id) {
            return `/recommendations/${notification.content.recommendation_id}`;
          }
          return `/notifications`;
        }
        return '/notifications';
      
      default:
        return '/notifications';
    }
  }, []);

  // Refresh all notification data
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount()
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Auto-fetch on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isAuthenticated, token, fetchNotifications, fetchUnreadCount]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllRead,
    getNotificationLink,
    refresh,
  };
}