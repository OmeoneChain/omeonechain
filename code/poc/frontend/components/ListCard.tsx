"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Bookmark, 
  Share2, 
  MapPin, 
  Clock, 
  Users,
  ChevronRight,
  MoreHorizontal,
  Flag,
  Utensils,
  ExternalLink,
  List as ListIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ListAuthor {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  followers: number;
  socialDistance?: 1 | 2;
}

interface RestaurantPreview {
  id?: number;
  name: string;
  image?: string;
  cuisine?: string;
  rating?: number;
  location?: string;
}

interface CuratedList {
  id: string | number;
  title: string;
  description: string;
  author: ListAuthor;
  restaurantCount: number;
  saves: number;
  likes?: number;
  category?: string;
  neighborhood?: string;
  isNew?: boolean;
  timeAgo?: string;
  createdAt?: string;
  preview: RestaurantPreview[];
  tags?: string[];
  isBookmarked?: boolean;
  hasLiked?: boolean;
  coverImage?: string;  // User-uploaded or Google Places cover image
  coverImageSource?: 'google_places' | 'user_upload' | null;
}

interface ListCardProps {
  list: CuratedList;
  variant?: 'default' | 'compact' | 'feed' | 'hero';
  showAuthor?: boolean;
  showActions?: boolean;
  onSave?: (id: string | number) => void;
  onLike?: (id: string | number) => void;
  onShare?: (id: string | number) => void;
  onAuthorClick?: (authorId: string) => void;
  onReport?: (id: string | number) => void;
  className?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Safe timeAgo function with fallback
 * Handles invalid dates gracefully
 */
const safeTimeAgo = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 0) return '';
    if (diffInSeconds < 60) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y`;
  } catch {
    return '';
  }
};

// Get gradient colors based on category/cuisine
const getCategoryGradient = (category?: string): string => {
  const categoryLower = (category || '').toLowerCase();
  
  if (categoryLower.includes('italian') || categoryLower.includes('pizza') || categoryLower.includes('pasta')) {
    return 'from-amber-600 via-orange-500 to-red-500';
  }
  if (categoryLower.includes('japanese') || categoryLower.includes('sushi') || categoryLower.includes('asian')) {
    return 'from-teal-600 via-cyan-500 to-blue-500';
  }
  if (categoryLower.includes('mexican') || categoryLower.includes('latin') || categoryLower.includes('brazilian')) {
    return 'from-yellow-500 via-orange-500 to-red-600';
  }
  if (categoryLower.includes('french') || categoryLower.includes('fine') || categoryLower.includes('wine')) {
    return 'from-purple-600 via-pink-500 to-rose-500';
  }
  if (categoryLower.includes('indian') || categoryLower.includes('curry')) {
    return 'from-orange-600 via-red-500 to-yellow-500';
  }
  if (categoryLower.includes('seafood') || categoryLower.includes('fish') || categoryLower.includes('beach')) {
    return 'from-blue-500 via-cyan-500 to-teal-400';
  }
  if (categoryLower.includes('vegan') || categoryLower.includes('vegetarian') || categoryLower.includes('healthy')) {
    return 'from-green-500 via-emerald-500 to-teal-500';
  }
  if (categoryLower.includes('breakfast') || categoryLower.includes('brunch') || categoryLower.includes('cafe')) {
    return 'from-yellow-400 via-amber-400 to-orange-400';
  }
  if (categoryLower.includes('bar') || categoryLower.includes('drinks') || categoryLower.includes('cocktail')) {
    return 'from-indigo-600 via-purple-500 to-pink-500';
  }
  // Default - brand coral gradient
  return 'from-[#FFB3AB] via-[#FF8A7A] to-[#FF644A]';
};

// Get emoji for category
const getCategoryEmoji = (category?: string): string => {
  const categoryLower = (category || '').toLowerCase();
  
  if (categoryLower.includes('italian') || categoryLower.includes('pizza')) return '🍝';
  if (categoryLower.includes('japanese') || categoryLower.includes('sushi')) return '🍱';
  if (categoryLower.includes('mexican')) return '🌮';
  if (categoryLower.includes('brazilian') || categoryLower.includes('churrasco')) return '🥩';
  if (categoryLower.includes('french')) return '🥐';
  if (categoryLower.includes('indian')) return '🍛';
  if (categoryLower.includes('seafood') || categoryLower.includes('beach')) return '🦐';
  if (categoryLower.includes('vegan') || categoryLower.includes('vegetarian')) return '🥗';
  if (categoryLower.includes('breakfast') || categoryLower.includes('brunch')) return '🍳';
  if (categoryLower.includes('cafe') || categoryLower.includes('coffee')) return '☕';
  if (categoryLower.includes('bar') || categoryLower.includes('drinks')) return '🍸';
  if (categoryLower.includes('dessert') || categoryLower.includes('bakery')) return '🧁';
  return '🍽️';
};

const ListCard: React.FC<ListCardProps> = ({
  list,
  variant = 'default',
  showAuthor = true,
  showActions = true,
  onSave,
  onLike,
  onShare,
  onAuthorClick,
  onReport,
  className
}) => {
  const t = useTranslations('feed');
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(list.id);
  };
  
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(list.id);
  };
  
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(list.id);
  };

  // ============================================
  // TRANSLATION HELPERS (using feed.listCard namespace)
  // ============================================
  const getSocialConnectionText = (distance?: number): string | null => {
    if (distance === 1) return t('listCard.social.friend');
    if (distance === 2) return t('listCard.social.friendOfFriend');
    return null;
  };

  const getTimeRecentText = (): string => t('listCard.time.recent');
  const getReportText = (): string => t('listCard.actions.report');
  const getMoreText = (): string => t('listCard.more');

  const getSocialConnectionColor = (distance?: number) => {
    if (distance === 1) return "text-coral bg-[#FFE8E4] dark:bg-[#FF644A]/20";
    if (distance === 2) return "text-[#E65441] bg-[#FFF0ED] dark:bg-[#FF644A]/15";
    return "";
  };

  // Check if avatar is an image URL
  const isImageUrl = (avatar: string | undefined): boolean => {
    if (!avatar) return false;
    return avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:');
  };

  // Get display timestamp - use safeTimeAgo for robustness
  const getDisplayTime = (): string => {
    if (list.timeAgo) return list.timeAgo;
    const computed = safeTimeAgo(list.createdAt);
    return computed || getTimeRecentText();
  };

  // Get the cover image: prioritize coverImage, then first restaurant image
  const coverImage = list.coverImage || list.preview.find(r => r.image)?.image;
  const gradient = getCategoryGradient(list.category);
  const emoji = getCategoryEmoji(list.category);

  // ============================================
  // IMPROVED GRADIENT FALLBACK COMPONENT
  // A clean, premium placeholder when no photo is available
  // ============================================
  const GradientFallback: React.FC<{ 
    height?: string; 
  }> = ({ height = 'h-32 sm:h-36' }) => (
    <div className={cn(
      "relative overflow-hidden",
      height,
      `bg-gradient-to-br ${gradient}`
    )}>
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Decorative circles for visual interest */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-black/10 blur-3xl" />
      
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    </div>
  );

  // ============================================
  // FEED VARIANT - Optimized for mixed content feeds
  // Author at top-left matching recommendation cards
  // ============================================
  
  // Generate initials from name (matching recommendation card style)
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    // Single word - take first 2 chars or first char repeated
    return name.length >= 2 
      ? (name[0] + name[1]).toUpperCase()
      : name[0].toUpperCase();
  };

  if (variant === 'feed') {
    return (
      <motion.div
        className={cn(
          "bg-white dark:bg-[#2D2C3A] rounded-2xl overflow-hidden transition-all duration-300",
          "border border-gray-100 dark:border-[#3D3C4A] hover:border-coral/30 dark:hover:border-coral/50",
          "shadow-sm hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Author Header - Outside gradient, matching recommendation cards exactly */}
        {showAuthor && (
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAuthorClick?.(list.author.id);
                }}
              >
                {/* Avatar - Initials style matching recommendation cards exactly */}
                <div className="relative flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FF644A 0%, #E65441 100%)' }}
                  >
                    {isImageUrl(list.author.avatar) ? (
                      <Image
                        src={list.author.avatar}
                        alt={list.author.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {getInitials(list.author.name)}
                      </span>
                    )}
                  </div>
                  {list.author.verified && (
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#2D2C3A]"
                      style={{ backgroundColor: '#FF644A' }}
                    >
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </div>
                
                {/* Name, badge, timestamp - matching recommendation cards */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy dark:text-white text-sm hover:text-coral transition-colors">
                      {list.author.name}
                    </span>
                    {list.author.socialDistance && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        getSocialConnectionColor(list.author.socialDistance)
                      )}>
                        {getSocialConnectionText(list.author.socialDistance)}
                      </span>
                    )}
                    <span className="text-gray-400 dark:text-gray-500">·</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getDisplayTime()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Menu button */}
              {showActions && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-full transition-colors"
                  >
                    <MoreHorizontal size={18} className="text-gray-400 dark:text-gray-500" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {showMenu && (
                    <div className="absolute right-0 top-9 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-20 min-w-[120px]">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onReport?.(list.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
                      >
                        <Flag size={14} className="mr-2" />
                        {getReportText()}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <Link href={`/list/${list.id}`} className="block">
          {/* Hero Section - Image or Gradient Fallback */}
          <div className="relative">
            {coverImage ? (
              /* Photo-based hero */
              <div className="relative h-32 sm:h-36 overflow-hidden">
                <Image
                  src={coverImage}
                  alt={list.title}
                  fill
                  className="object-cover"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* List type indicator - small badge top-left */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-white/90 dark:bg-white/95 backdrop-blur-sm text-navy text-xs font-medium rounded-full shadow-sm flex items-center gap-1">
                    <ListIcon size={11} />
                    List
                  </span>
                </div>
                
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg sm:text-xl leading-tight mb-1 drop-shadow-lg">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <span className="flex items-center gap-1">
                      <Utensils size={13} />
                      {list.restaurantCount} {list.restaurantCount === 1 ? 'restaurant' : 'restaurants'}
                    </span>
                    {list.neighborhood && (
                      <>
                        <span className="text-white/50">•</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {list.neighborhood}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Improved gradient fallback */
              <div className="relative">
                <GradientFallback height="h-32 sm:h-36" />
                
                {/* List type indicator - small badge top-left */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-white/90 dark:bg-white/95 backdrop-blur-sm text-navy text-xs font-medium rounded-full shadow-sm flex items-center gap-1">
                    <ListIcon size={11} />
                    List
                  </span>
                </div>
                
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg sm:text-xl leading-tight mb-1 drop-shadow-lg">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <span className="flex items-center gap-1">
                      <Utensils size={13} />
                      {list.restaurantCount} {list.restaurantCount === 1 ? 'restaurant' : 'restaurants'}
                    </span>
                    {list.neighborhood && (
                      <>
                        <span className="text-white/50">•</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {list.neighborhood}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 pt-3">
            {/* Tags */}
            {list.tags && list.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {list.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions Footer */}
            {showActions && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#3D3C4A]">
                {/* Stats */}
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm">
                  <button
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      list.hasLiked ? "text-red-500" : "hover:text-red-500"
                    )}
                  >
                    <Heart size={16} fill={list.hasLiked ? "currentColor" : "none"} />
                    <span>{list.likes || 0}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      list.isBookmarked ? "text-coral" : "hover:text-coral"
                    )}
                  >
                    <Bookmark size={16} fill={list.isBookmarked ? "currentColor" : "none"} />
                    <span>{list.saves}</span>
                  </button>
                </div>

                {/* View List + Share */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-full transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                  <span className="flex items-center gap-1 text-coral font-medium text-sm hover:text-[#E65441] transition-colors">
                    View List
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  // ============================================
  // HERO VARIANT - Full photo-forward design (for Discover)
  // ============================================
  if (variant === 'hero') {
    return (
      <motion.div
        className={cn(
          "bg-white dark:bg-[#2D2C3A] rounded-2xl overflow-hidden transition-all duration-300",
          "border border-gray-100 dark:border-[#3D3C4A] hover:border-gray-200 dark:hover:border-[#4D4C5A]",
          "shadow-sm hover:shadow-xl dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href={`/list/${list.id}`} className="block">
          {/* Hero Section */}
          <div className="relative">
            {coverImage ? (
              /* Photo-based hero */
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <Image
                  src={coverImage}
                  alt={list.title}
                  fill
                  className="object-cover"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Category badge */}
                {list.category && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-white/90 dark:bg-white/95 backdrop-blur-sm text-navy text-xs font-semibold rounded-full shadow-sm">
                      {emoji} {list.category}
                    </span>
                  </div>
                )}
                
                {/* Menu button */}
                {showActions && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }}
                      className="p-2 bg-white/90 dark:bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
                    >
                      <MoreHorizontal size={16} className="text-gray-600" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-20 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReport?.(list.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
                        >
                          <Flag size={14} className="mr-2" />
                          {getReportText()}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2 drop-shadow-lg">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-3 text-white/90 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Utensils size={14} />
                      {list.restaurantCount} {list.restaurantCount === 1 ? 'restaurant' : 'restaurants'}
                    </span>
                    {list.neighborhood && (
                      <>
                        <span className="text-white/50">•</span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} />
                          {list.neighborhood}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Improved gradient fallback */
              <div className="relative">
                <GradientFallback height="h-48 sm:h-56" />
                
                {/* Category badge */}
                {list.category && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-white/90 dark:bg-white/95 backdrop-blur-sm text-navy text-xs font-semibold rounded-full shadow-sm">
                      {emoji} {list.category}
                    </span>
                  </div>
                )}
                
                {/* Menu button */}
                {showActions && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }}
                      className="p-2 bg-white/90 dark:bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
                    >
                      <MoreHorizontal size={16} className="text-gray-600" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-20 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReport?.(list.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
                        >
                          <Flag size={14} className="mr-2" />
                          {getReportText()}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2 drop-shadow-lg">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-3 text-white/90 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Utensils size={14} />
                      {list.restaurantCount} {list.restaurantCount === 1 ? 'restaurant' : 'restaurants'}
                    </span>
                    {list.neighborhood && (
                      <>
                        <span className="text-white/50">•</span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} />
                          {list.neighborhood}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-5">
            {/* Author Section - Prominent! */}
            {showAuthor && (
              <div 
                className="flex items-center gap-3 mb-4 -mt-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAuthorClick?.(list.author.id);
                }}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-coral to-[#E65441] flex items-center justify-center ring-2 ring-white dark:ring-[#2D2C3A] shadow-md">
                    {isImageUrl(list.author.avatar) ? (
                      <Image
                        src={list.author.avatar}
                        alt={list.author.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    ) : list.author.avatar ? (
                      <span className="text-xl">{list.author.avatar}</span>
                    ) : (
                      <span className="text-white font-semibold">
                        {list.author.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {list.author.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-coral rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#2D2C3A]">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy dark:text-white text-sm hover:text-coral transition-colors cursor-pointer">
                      {list.author.name}
                    </span>
                    {list.author.socialDistance && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        getSocialConnectionColor(list.author.socialDistance)
                      )}>
                        {getSocialConnectionText(list.author.socialDistance)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getDisplayTime()}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {list.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
                {list.description}
              </p>
            )}

            {/* Tags */}
            {list.tags && list.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-[#3D3C4A]">
                {list.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mb-4 pb-4 border-b border-gray-100 dark:border-[#3D3C4A]" />
            )}

            {/* Actions Footer */}
            {showActions && (
              <div className="flex items-center justify-between">
                {/* Stats */}
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm">
                  <button
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      list.hasLiked ? "text-red-500" : "hover:text-red-500"
                    )}
                  >
                    <Heart size={16} fill={list.hasLiked ? "currentColor" : "none"} />
                    <span>{list.likes || 0}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      list.isBookmarked ? "text-coral" : "hover:text-coral"
                    )}
                  >
                    <Bookmark size={16} fill={list.isBookmarked ? "currentColor" : "none"} />
                    <span>{list.saves}</span>
                  </button>
                </div>

                {/* View List Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-full transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                  <span className="flex items-center gap-1 text-coral font-medium text-sm hover:text-[#E65441] transition-colors">
                    View List
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  // ============================================
  // COMPACT VARIANT - For carousels
  // ============================================
  const isCompact = variant === 'compact';
  const displayedRestaurants = list.preview.slice(0, isCompact ? 4 : 3);
  const remainingCount = Math.max(0, list.restaurantCount - (isCompact ? 4 : 3));

  if (isCompact) {
    return (
      <motion.div
        className={cn(
          "bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] overflow-hidden transition-all duration-200",
          "hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-coral dark:hover:border-coral cursor-pointer",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header with Sunset Gradient */}
        <div className="relative bg-gradient-to-r from-[#FFB3AB] to-[#FF644A] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white flex-1 min-w-0">
              <span className="text-lg">{emoji}</span>
              <span className="font-semibold text-base truncate">{list.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {list.category && (
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  {list.category}
                </span>
              )}
              {showActions && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-0.5 hover:bg-white/20 rounded transition-colors"
                >
                  <MoreHorizontal size={14} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        <Link href={`/list/${list.id}`} className="block">
          <div className="p-3.5 space-y-2.5">
            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {list.description}
            </p>

            {/* Horizontal Restaurant Carousel */}
            {displayedRestaurants.length > 0 && (
              <div className="py-1">
                <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  {displayedRestaurants.map((restaurant, index) => (
                    <div key={index} className="flex-shrink-0 w-24 group">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mb-1 border border-gray-200 dark:border-[#3D3C4A] group-hover:border-coral transition-colors">
                        {restaurant.image ? (
                          <Image
                            src={restaurant.image}
                            alt={restaurant.name}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-gray-50 dark:from-gray-700 to-gray-100 dark:to-gray-800">
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-navy dark:text-white line-clamp-2 leading-tight">
                        {restaurant.name}
                      </div>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="flex-shrink-0 w-24">
                      <div className="w-24 h-24 rounded-lg bg-gray-50 dark:bg-[#353444] border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-1">
                        <div className="text-center">
                          <div className="text-xl font-semibold text-gray-400 dark:text-gray-500">+{remainingCount}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{getMoreText()}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Single compact meta row */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-gray-100 dark:border-[#3D3C4A]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Author */}
                {showAuthor && (
                  <>
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {isImageUrl(list.author.avatar) ? (
                        <Image
                          src={list.author.avatar}
                          alt={list.author.name}
                          width={20}
                          height={20}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px]">
                          {list.author.avatar}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-navy dark:text-white truncate text-xs">
                      {list.author.name}
                    </span>
                    {list.author.verified && (
                      <div className="w-2.5 h-2.5 bg-coral rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[7px]">✓</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats - compact */}
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Utensils size={11} />
                  <span>{list.restaurantCount}</span>
                </div>
                {list.neighborhood && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[60px]">{list.neighborhood}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Actions Footer */}
        {showActions && (
          <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-gray-100 dark:border-[#3D3C4A] bg-[#FFF8F0] dark:bg-[#353444]">
            {/* Engagement Stats */}
            <div className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Heart size={11} />
                <span>{list.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bookmark size={11} />
                <span>{list.saves}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span>{getDisplayTime()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5">
              {onLike && (
                <motion.button
                  onClick={handleLike}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    list.hasLiked 
                      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30" 
                      : "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Heart size={14} fill={list.hasLiked ? "currentColor" : "none"} />
                </motion.button>
              )}
              <motion.button
                onClick={handleSave}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  list.isBookmarked 
                    ? "text-coral bg-[#FFE8E4] dark:bg-[#FF644A]/20" 
                    : "text-gray-500 dark:text-gray-400 hover:text-coral hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={14} fill={list.isBookmarked ? "currentColor" : "none"} />
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#404050] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={14} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReport?.(list.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
            >
              <Flag size={14} className="mr-2" />
              {getReportText()}
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ============================================
  // DEFAULT VARIANT - Original with fixes
  // ============================================
  return (
    <motion.div
      className={cn(
        "bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] overflow-hidden transition-all duration-200",
        "hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-coral dark:hover:border-coral",
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sunset Gradient Header */}
      <div className="relative bg-gradient-to-r from-[#FFB3AB] to-[#FF644A] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg">{emoji}</span>
            <span className="font-medium text-sm">{list.category || 'Curated'}</span>
          </div>
          {list.isNew && (
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              New
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header with Title and Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-navy dark:text-white text-lg leading-tight mb-1">
              {list.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {list.description}
            </p>
          </div>

          {showActions && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
              >
                <MoreHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onReport?.(list.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
                  >
                    <Flag size={14} className="mr-2" />
                    {getReportText()}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Author Info */}
        {showAuthor && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAuthorClick?.(list.author.id)}
              className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#353444] rounded-lg p-1 -m-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
                {isImageUrl(list.author.avatar) ? (
                  <Image
                    src={list.author.avatar}
                    alt={list.author.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {list.author.avatar}
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-navy dark:text-white">
                    {list.author.name}
                  </span>
                  {list.author.verified && (
                    <div className="w-4 h-4 bg-coral rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                {list.author.socialDistance && (
                  <div className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    getSocialConnectionColor(list.author.socialDistance)
                  )}>
                    {getSocialConnectionText(list.author.socialDistance)}
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Tags */}
        {list.tags && list.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {list.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-[#FFE8E4] dark:bg-[#FF644A]/20 text-coral text-xs rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Restaurant Count & Location */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Utensils size={12} />
            <span>{list.restaurantCount} restaurants</span>
          </div>
          {list.neighborhood && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{list.neighborhood}</span>
            </div>
          )}
        </div>

        {/* Restaurant Previews */}
        <div className="border border-gray-200 dark:border-[#3D3C4A] rounded-lg p-3 bg-[#FFF8F0] dark:bg-[#353444] space-y-2">
          {displayedRestaurants.map((restaurant, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A]"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                {restaurant.image ? (
                  <Image
                    src={restaurant.image}
                    alt={restaurant.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    🍽️
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-navy dark:text-white truncate">
                  {restaurant.name}
                </h4>
                {restaurant.cuisine && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">{restaurant.cuisine}</span>
                )}
              </div>
            </div>
          ))}

          {remainingCount > 0 && (
            <Link
              href={`/list/${list.id}`}
              className="flex items-center justify-center gap-1 p-2 text-coral hover:text-[#E65441] text-sm font-medium transition-colors"
            >
              <span>+{remainingCount} more restaurants</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* View Full List Button */}
        <Link
          href={`/list/${list.id}`}
          className="block w-full px-4 py-2 bg-gradient-to-r from-[#FFB3AB] to-[#FF644A] text-white rounded-lg hover:opacity-90 transition-all text-sm font-medium text-center"
        >
          View Full List
        </Link>

        {/* Actions Footer */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#3D3C4A]">
            {/* Engagement Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Bookmark size={12} />
                <span>{list.saves}</span>
              </div>
              {list.likes !== undefined && (
                <div className="flex items-center gap-1">
                  <Heart size={12} />
                  <span>{list.likes}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{getDisplayTime()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {onLike && (
                <motion.button
                  onClick={handleLike}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    list.hasLiked 
                      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30" 
                      : "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Heart size={16} fill={list.hasLiked ? "currentColor" : "none"} />
                </motion.button>
              )}

              <motion.button
                onClick={handleSave}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  list.isBookmarked 
                    ? "text-coral bg-[#FFE8E4] dark:bg-[#FF644A]/20" 
                    : "text-gray-500 dark:text-gray-400 hover:text-coral hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={16} fill={list.isBookmarked ? "currentColor" : "none"} />
              </motion.button>

              <motion.button
                onClick={handleShare}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#353444] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={16} />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ListCard;