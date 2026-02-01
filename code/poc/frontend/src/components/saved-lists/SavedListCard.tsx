// components/saved-lists/SavedListCard.tsx
// V6: Compact card — no hero, no author row, no counters
// Row-style: icon + name/description + restaurant count + menu
// Clean, scannable, works in single-column layout
// Dark mode + i18n
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Trash2,
  Share2,
  Utensils,
  FolderHeart,
  Bookmark,
  Layers,
  List,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// INTERFACES
// ============================================

interface Restaurant {
  id: string | number;
  name: string;
  image?: string;
  cuisine?: string;
  location?: string;
}

interface SavedList {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  restaurant_count?: number;
  items?: Restaurant[];
}

interface SavedListCardProps {
  list: SavedList;
  onDelete?: (listId: string) => void;
  onShare?: (list: SavedList) => void;
}

// ============================================
// ICON HELPERS
// ============================================

const TYPE_ICONS: Record<string, LucideIcon> = {
  places: FolderHeart,
  bookmarks: Bookmark,
  mixed: Layers,
};

const getTypeIcon = (listType: string): LucideIcon => {
  return TYPE_ICONS[listType] || List;
};

// ============================================
// COMPONENT
// ============================================

export default function SavedListCard({
  list,
  onDelete,
  onShare,
}: SavedListCardProps) {
  const router = useRouter();
  const t = useTranslations('savedLists');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const restaurantCount = list.restaurant_count || list.itemCount || 0;
  const previewItems = list.items?.slice(0, 3) || [];
  const TypeIcon = getTypeIcon(list.listType);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Format relative time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return t('time.justNow');
    if (diffInHours < 24) return t('time.hoursAgo', { hours: diffInHours });
    if (diffInHours < 48) return t('time.yesterday');
    if (diffInHours < 168) return t('time.daysAgo', { days: Math.floor(diffInHours / 24) });
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCardClick = () => {
    router.push(`/saved-lists/${list.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (window.confirm(t('deleteConfirm', { name: list.name }))) {
      onDelete?.(list.id);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onShare?.(list);
  };

  return (
    <motion.div
      className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] overflow-hidden shadow-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] hover:shadow-md dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all cursor-pointer active:scale-[0.99]"
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4">
        {/* Top row: icon + name + count + menu */}
        <div className="flex items-start gap-3">
          {/* Type icon badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] flex items-center justify-center shadow-sm">
            <TypeIcon size={20} className="text-white" strokeWidth={1.8} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1F1E2A] dark:text-white text-base truncate">
                {list.name}
              </h3>
              <ChevronRight
                size={16}
                className="flex-shrink-0 text-gray-300 dark:text-gray-600"
              />
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Utensils size={12} />
                {t('restaurantCount', { count: restaurantCount })}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>{formatDate(list.updatedAt)}</span>
            </div>
          </div>

          {/* Menu dots */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#353444] transition-colors"
              aria-label="List options"
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#2D2C3A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-[#3D3C4A] py-1 min-w-[140px] z-20">
                <button
                  onClick={handleShare}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20 flex items-center gap-2"
                >
                  <Share2 size={14} />
                  {t('actions.share')}
                </button>
                <hr className="my-1 border-gray-100 dark:border-[#3D3C4A]" />
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  {t('actions.delete')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description — one line max */}
        {list.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-1 pl-[52px]">
            {list.description}
          </p>
        )}

        {/* Restaurant preview strip — only if there are items */}
        {previewItems.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pl-[52px]">
            <div className="flex -space-x-1.5">
              {previewItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="w-7 h-7 rounded-md border-2 border-white dark:border-[#2D2C3A] bg-[#FFE8E4] dark:bg-[#FF644A]/20 flex items-center justify-center overflow-hidden"
                  style={{ zIndex: 3 - idx }}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Utensils size={12} className="text-[#E65441]" />
                  )}
                </div>
              ))}
              {restaurantCount > 3 && (
                <div
                  className="w-7 h-7 rounded-md border-2 border-white dark:border-[#2D2C3A] bg-gray-100 dark:bg-[#353444] flex items-center justify-center text-[10px] font-medium text-gray-500 dark:text-gray-400"
                  style={{ zIndex: 0 }}
                >
                  +{restaurantCount - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {previewItems.map((r) => r.name).join(', ')}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}