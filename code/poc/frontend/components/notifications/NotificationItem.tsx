// File: code/poc/frontend/components/notifications/NotificationItem.tsx
// Component for rendering individual notification items
// UPDATED: Dark mode support throughout

'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  UserPlus, 
  AtSign,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
  compact?: boolean;
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onClick,
  compact = false 
}: NotificationItemProps) {
  const t = useTranslations('notifications');
  
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  // Get icon based on notification type
  const getIcon = () => {
    const iconProps = { size: compact ? 18 : 20, className: 'flex-shrink-0' };
    
    switch (notification.type) {
      case 'comment':
        return <MessageCircle {...iconProps} className={`${iconProps.className} text-blue-500`} />;
      case 'comment_reply':
      case 'reply':
        return <MessageSquare {...iconProps} className={`${iconProps.className} text-green-500`} />;
      case 'like':
        return <Heart {...iconProps} className={`${iconProps.className} text-red-500`} />;
      case 'comment_like':
        return <ThumbsUp {...iconProps} className={`${iconProps.className} text-pink-500`} />;
      case 'reshare':
        return <Share2 {...iconProps} className={`${iconProps.className} text-purple-500`} />;
      case 'follow':
        return <UserPlus {...iconProps} className={`${iconProps.className} text-indigo-500`} />;
      case 'mention':
        return <AtSign {...iconProps} className={`${iconProps.className} text-orange-500`} />;
      default:
        return <MessageCircle {...iconProps} className={`${iconProps.className} text-gray-500 dark:text-gray-400`} />;
    }
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return t('time.justNow');
    if (seconds < 3600) return t('time.minutesAgo', { count: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('time.hoursAgo', { count: Math.floor(seconds / 3600) });
    if (seconds < 604800) return t('time.daysAgo', { count: Math.floor(seconds / 86400) });
    return date.toLocaleDateString();
  };

  // Get link for notification
  const getLink = () => {
    switch (notification.type) {
      case 'comment':
      case 'like':
      case 'reshare':
        return `/recommendations/${notification.target_id}`;
      case 'comment_reply':
      case 'reply':
      case 'comment_like':
        return `/recommendations/${notification.target_id}`;
      case 'follow':
        return `/users/${notification.actor_id}`;
      case 'mention':
        return `/recommendations/${notification.target_id}`;
      default:
        return '/notifications';
    }
  };

  // Get default message based on notification type
  const getDefaultMessage = () => {
    switch (notification.type) {
      case 'comment': return t('messages.comment');
      case 'comment_reply':
      case 'reply': return t('messages.reply');
      case 'like': return t('messages.like');
      case 'comment_like': return t('messages.commentLike');
      case 'reshare': return t('messages.reshare');
      case 'follow': return t('messages.follow');
      case 'mention': return t('messages.mention');
      default: return t('messages.default');
    }
  };

  const actor = notification.actor;
  const actorName = actor?.display_name || actor?.username || t('fallback.someone');

  // Format grouped actors text
  const getGroupedActorsText = () => {
    if (!notification.grouped_actors || notification.grouped_actors.length === 0) {
      return null;
    }
    const count = notification.grouped_actors.length;
    return count === 1 
      ? t('groupedActors.singular', { count }) 
      : t('groupedActors.plural', { count });
  };

  return (
    <Link
      href={getLink()}
      onClick={handleClick}
      className={`
        block border-b border-gray-100 dark:border-[#3D3C4A] hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors
        ${!notification.read 
          ? 'bg-blue-50 dark:bg-blue-900/20' 
          : 'bg-white dark:bg-[#2D2C3A]'
        }
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar */}
        <div className="flex-shrink-0">
          {actor?.avatar_url ? (
            <img
              src={actor.avatar_url}
              alt={actorName}
              className={`rounded-full object-cover ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
            />
          ) : (
            <div className={`
              rounded-full bg-gradient-to-br from-[#FF644A] to-[#E65441] 
              flex items-center justify-center text-white font-semibold
              ${compact ? 'w-8 h-8 text-sm' : 'w-10 h-10'}
            `}>
              {actorName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Notification Icon */}
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-gray-900 dark:text-white ${compact ? 'text-sm' : ''}`}>
            <span className="font-semibold">{actorName}</span>
            {getGroupedActorsText() && (
              <span className="text-gray-600 dark:text-gray-400">
                {' '}{getGroupedActorsText()}
              </span>
            )}
            {' '}
            <span className="text-gray-700 dark:text-gray-300">
              {notification.message || getDefaultMessage()}
            </span>
          </p>

          {/* Preview content */}
          {notification.content.comment_preview && (
            <p className={`text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
              "{notification.content.comment_preview}"
            </p>
          )}
          {notification.content.reply_preview && (
            <p className={`text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
              "{notification.content.reply_preview}"
            </p>
          )}
          {notification.content.recommendation_title && (
            <p className={`text-gray-600 dark:text-gray-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              {t('content.onRecommendation', { title: notification.content.recommendation_title })}
            </p>
          )}

          {/* Timestamp */}
          <p className={`text-gray-400 dark:text-gray-500 mt-1 ${compact ? 'text-xs' : 'text-xs'}`}>
            {getTimeAgo(notification.created_at)}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="w-2 h-2 bg-[#FF644A] rounded-full flex-shrink-0 mt-2"></div>
        )}
      </div>
    </Link>
  );
}