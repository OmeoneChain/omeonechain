// File: code/poc/frontend/components/notifications/NotificationBell.tsx
// Notification bell icon with dropdown panel

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Show only recent notifications in dropdown (up to 5)
  const recentNotifications = notifications.slice(0, 5);
  const hasUnread = unreadCount > 0;

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      refresh(); // Refresh when opening
    }
  };

  const handleNotificationClick = () => {
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-trust-600 transition-colors"
        aria-label={t('bell.ariaLabel')}
      >
        <Bell size={20} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">{t('header.title')}</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('header.unreadCount', { count: unreadCount })}
                    </p>
                  )}
                </div>
                
                {hasUnread && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Check size={14} />
                    {t('actions.markAllRead')}
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {isLoading && notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trust-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">{t('status.loading')}</p>
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('empty.title')}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {t('empty.description')}
                    </p>
                  </div>
                ) : (
                  <div>
                    {recentNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onClick={handleNotificationClick}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <button
                    onClick={handleViewAll}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
                  >
                    {t('actions.viewAll')}
                    <ExternalLink size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}