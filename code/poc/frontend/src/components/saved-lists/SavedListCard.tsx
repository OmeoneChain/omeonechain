// components/saved-lists/SavedListCard.tsx
// V5: Added i18n translations and dark mode support
// Deep Terracotta gradient (#E65441 → #C94232)
// Clean, premium look matching BocaBoca brand palette
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  MapPin, 
  Lock, 
  Globe,
  MoreHorizontal,
  Edit,
  Trash2,
  Share2,
  Utensils,
  Bookmark,
  Heart,
  List,
  FolderHeart,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onEdit?: (list: SavedList) => void;
  onDelete?: (listId: string) => void;
  onShare?: (list: SavedList) => void;
  variant?: 'default' | 'compact';
}

export default function SavedListCard({ 
  list, 
  onEdit, 
  onDelete, 
  onShare,
  variant = 'default'
}: SavedListCardProps) {
  const router = useRouter();
  const t = useTranslations('savedLists');
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const restaurantCount = list.restaurant_count || list.itemCount || 0;
  const previewItems = list.items?.slice(0, 4) || [];
  
  // Get the first restaurant with an image for hero
  const heroImage = previewItems.find(item => item.image)?.image;
  
  // Format date with translations
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('time.justNow');
    if (diffInHours < 24) return t('time.hoursAgo', { hours: diffInHours });
    if (diffInHours < 48) return t('time.yesterday');
    if (diffInHours < 168) return t('time.daysAgo', { days: Math.floor(diffInHours / 24) });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get list type label and icon (NO EMOJI - Lucide only)
  const getListTypeInfo = (listType: string) => {
    switch (listType) {
      case 'places':
        return { 
          label: t('listTypes.places'), 
          Icon: FolderHeart,
        };
      case 'bookmarks':
        return { 
          label: t('listTypes.bookmarks'), 
          Icon: Bookmark,
        };
      case 'mixed':
        return { 
          label: t('listTypes.collection'), 
          Icon: Layers,
        };
      default:
        return { 
          label: t('listTypes.list'), 
          Icon: List,
        };
    }
  };

  const typeInfo = getListTypeInfo(list.listType);
  const TypeIcon = typeInfo.Icon;

  const handleCardClick = () => {
    router.push(`/saved-lists/${list.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.(list);
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
      className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] overflow-hidden shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-md dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all cursor-pointer group"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Hero Image Area */}
      <div className="relative h-48 overflow-hidden">
        {heroImage ? (
          // If we have a restaurant image, show it
          <Image
            src={heroImage}
            alt={list.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // Deep Terracotta gradient placeholder (135deg diagonal)
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #E65441 0%, #C94232 100%)'
            }}
          >
            {/* Subtle decorative pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Subtle centered icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                <TypeIcon size={40} className="text-white/70" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {/* List type badge - NO EMOJI */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-[#2D2C3A]/90 backdrop-blur-sm text-[#1F1E2A] dark:text-white text-xs font-medium rounded-full shadow-sm">
            <TypeIcon size={14} className="text-[#E65441]" />
            <span>{typeInfo.label}</span>
          </span>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="p-1.5 bg-white/90 dark:bg-[#2D2C3A]/90 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-[#2D2C3A] transition-colors shadow-sm"
            >
              <MoreHorizontal size={16} className="text-gray-700 dark:text-gray-300" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#2D2C3A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-[#3D3C4A] py-1 min-w-[140px] z-20">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20 flex items-center gap-2"
                >
                  <Edit size={14} />
                  {t('actions.edit')}
                </button>
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

        {/* Bottom content on image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
            {list.name}
          </h3>
          <div className="flex items-center gap-3 text-white/90 text-sm">
            <span className="flex items-center gap-1">
              <Utensils size={14} />
              {t('restaurantCount', { count: restaurantCount })}
            </span>
            {previewItems[0]?.location && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {previewItems[0].location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, #E65441 0%, #C94232 100%)'
              }}
            >
              Y
            </div>
            <div>
              <p className="text-sm font-medium text-[#1F1E2A] dark:text-white">{t('byYou')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(list.updatedAt)}</p>
            </div>
          </div>
          
          {/* Privacy badge */}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
            list.isPublic 
              ? "bg-[#FFE8E4] dark:bg-[#FF644A]/20 text-[#C94232] dark:text-[#FF644A]" 
              : "bg-[#FFF4E1] dark:bg-[#FF644A]/10 text-[#E65441]"
          )}>
            {list.isPublic ? (
              <>
                <Globe size={12} />
                {t('privacy.public')}
              </>
            ) : (
              <>
                <Lock size={12} />
                {t('privacy.private')}
              </>
            )}
          </span>
        </div>

        {/* Description if exists */}
        {list.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {list.description}
          </p>
        )}

        {/* Restaurant preview strip - NO EMOJI */}
        {previewItems.length > 0 && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-[#3D3C4A]">
            <div className="flex -space-x-2">
              {previewItems.slice(0, 4).map((item, idx) => (
                <div 
                  key={item.id} 
                  className="w-8 h-8 rounded-lg border-2 border-white dark:border-[#2D2C3A] bg-[#FFE8E4] dark:bg-[#FF644A]/20 flex items-center justify-center text-sm overflow-hidden"
                  style={{ zIndex: 4 - idx }}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Utensils size={14} className="text-[#E65441]" />
                  )}
                </div>
              ))}
              {restaurantCount > 4 && (
                <div 
                  className="w-8 h-8 rounded-lg border-2 border-white dark:border-[#2D2C3A] bg-gray-100 dark:bg-[#353444] flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400"
                  style={{ zIndex: 0 }}
                >
                  +{restaurantCount - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {previewItems.map(r => r.name).join(', ')}
            </span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <button className="flex items-center gap-1 hover:text-[#E65441] transition-colors">
              <Heart size={16} />
              <span className="text-sm">0</span>
            </button>
            <button className="flex items-center gap-1 hover:text-[#E65441] transition-colors">
              <Bookmark size={16} />
              <span className="text-sm">0</span>
            </button>
          </div>
          
          <button 
            onClick={handleCardClick}
            className="flex items-center gap-1 text-[#E65441] font-medium text-sm hover:text-[#C94232] hover:underline transition-colors"
          >
            {t('viewList')} →
          </button>
        </div>
      </div>
    </motion.div>
  );
}