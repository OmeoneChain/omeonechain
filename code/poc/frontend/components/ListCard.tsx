"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Bookmark, 
  Share2, 
  MapPin, 
  Clock, 
  Star,
  Users,
  ChevronRight,
  MoreHorizontal,
  Flag,
  Sparkles,
  Utensils
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, timeAgo } from '@/lib/utils';

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
}

interface ListCardProps {
  list: CuratedList;
  variant?: 'default' | 'compact' | 'feed';
  showAuthor?: boolean;
  showActions?: boolean;
  onSave?: (id: string | number) => void;
  onLike?: (id: string | number) => void;
  onShare?: (id: string | number) => void;
  onAuthorClick?: (authorId: string) => void;
  onReport?: (id: string | number) => void;
  className?: string;
}

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
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => onSave?.(list.id);
  const handleLike = () => onLike?.(list.id);
  const handleShare = () => onShare?.(list.id);

  const getSocialConnectionText = (distance?: number) => {
    if (distance === 1) return "Your friend";
    if (distance === 2) return "Friend-of-friend";
    return null;
  };

  const getSocialConnectionColor = (distance?: number) => {
    if (distance === 1) return "text-social-600 bg-social-50";
    if (distance === 2) return "text-network-600 bg-network-50";
    return "";
  };

  const isCompact = variant === 'compact';
  const displayedRestaurants = list.preview.slice(0, isCompact ? 4 : 3);
  const remainingCount = Math.max(0, list.restaurantCount - (isCompact ? 4 : 3));

  // Ultra-compact variant - maximum space efficiency
  if (isCompact) {
    return (
      <motion.div
        className={cn(
          "bg-white rounded-xl border border-network-200 overflow-hidden transition-all duration-200",
          "hover:shadow-soft hover:border-network-300 cursor-pointer",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header with Title */}
        <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white flex-1 min-w-0">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-base truncate">{list.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                Curated List
              </span>
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
            {/* Description - better readability */}
            <p className="text-sm text-network-600 line-clamp-2 leading-relaxed">
              {list.description}
            </p>

            {/* Horizontal Restaurant Carousel - more compact */}
            {displayedRestaurants.length > 0 && (
              <div className="py-1">
                <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {displayedRestaurants.map((restaurant, index) => (
                    <div key={index} className="flex-shrink-0 w-24 group">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mb-1 border border-gray-200 group-hover:border-purple-300 transition-colors">
                        {restaurant.image ? (
                          <Image
                            src={restaurant.image}
                            alt={restaurant.name}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                        {restaurant.name}
                      </div>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="flex-shrink-0 w-24">
                      <div className="w-24 h-24 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center mb-1">
                        <div className="text-center">
                          <div className="text-xl font-semibold text-gray-400">+{remainingCount}</div>
                          <div className="text-xs text-gray-500">more</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Single compact meta row - everything in one line */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-gray-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Author */}
                {showAuthor && (
                  <>
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-network-200 flex-shrink-0">
                      {list.author.avatar.startsWith('http') ? (
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
                    <span className="font-medium text-network-900 truncate text-xs">
                      {list.author.name}
                    </span>
                    {list.author.verified && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[7px]">✓</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats - compact */}
              <div className="flex items-center gap-2 text-xs text-network-600 flex-shrink-0">
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

        {/* Actions Footer - comfortable padding */}
        {showActions && (
          <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-network-100 bg-gray-50">
            {/* Engagement Stats */}
            <div className="flex items-center gap-2.5 text-xs text-network-500">
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
                <span>{list.timeAgo || (list.createdAt ? timeAgo(list.createdAt) : 'Recent')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5">
              {onLike && (
                <motion.button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLike();
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    list.hasLiked 
                      ? "text-red-600 bg-red-50" 
                      : "text-network-500 hover:text-red-600 hover:bg-red-50"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Heart size={14} fill={list.hasLiked ? "currentColor" : "none"} />
                </motion.button>
              )}
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  list.isBookmarked 
                    ? "text-trust-600 bg-trust-50" 
                    : "text-network-500 hover:text-trust-600 hover:bg-trust-50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={14} fill={list.isBookmarked ? "currentColor" : "none"} />
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare();
                }}
                className="p-1.5 rounded-lg text-network-500 hover:text-network-700 hover:bg-network-50 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={14} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-white border border-network-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReport?.(list.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-network-50 flex items-center text-red-600"
            >
              <Flag size={14} className="mr-2" />
              Report
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Default/Full variant - (keeping original)
  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-network-200 overflow-hidden transition-all duration-200",
        "hover:shadow-soft hover:border-network-300",
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-sm">Curated List</span>
          </div>
          {list.category && (
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {list.category}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header with Title and Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-network-900 text-lg leading-tight mb-1">
              {list.title}
            </h3>
            <p className="text-sm text-network-600 line-clamp-2">
              {list.description}
            </p>
          </div>

          {showActions && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-network-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={16} className="text-network-500" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-network-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onReport?.(list.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-network-50 flex items-center text-red-600"
                  >
                    <Flag size={14} className="mr-2" />
                    Report
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
              className="flex items-center gap-2 hover:bg-network-50 rounded-lg p-1 -m-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-network-200 relative">
                {list.author.avatar.startsWith('http') ? (
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
                  <span className="text-sm font-medium text-network-900">
                    {list.author.name}
                  </span>
                  {list.author.verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
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
                className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Restaurant Count & Location */}
        <div className="flex items-center justify-between text-xs text-network-600">
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
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          {displayedRestaurants.map((restaurant, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-gray-900 truncate">
                    {restaurant.name}
                  </h4>
                  {restaurant.rating && (
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium text-gray-700">
                        {restaurant.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                {restaurant.cuisine && (
                  <span className="text-xs text-gray-600">{restaurant.cuisine}</span>
                )}
              </div>
            </div>
          ))}

          {remainingCount > 0 && (
            <Link
              href={`/list/${list.id}`}
              className="flex items-center justify-center gap-1 p-2 text-purple-700 hover:text-purple-800 text-sm font-medium transition-colors"
            >
              <span>+ {remainingCount} more restaurant{remainingCount !== 1 ? 's' : ''}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* View Full List Button */}
        <Link
          href={`/list/${list.id}`}
          className="block w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors text-sm font-medium text-center"
        >
          View Full List
        </Link>

        {/* Actions Footer */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-network-100">
            {/* Engagement Stats */}
            <div className="flex items-center gap-4 text-xs text-network-500">
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
                <span>{list.timeAgo || (list.createdAt ? timeAgo(list.createdAt) : 'Recent')}</span>
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
                      ? "text-red-600 bg-red-50" 
                      : "text-network-500 hover:text-red-600 hover:bg-red-50"
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
                    ? "text-trust-600 bg-trust-50" 
                    : "text-network-500 hover:text-trust-600 hover:bg-trust-50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={16} fill={list.isBookmarked ? "currentColor" : "none"} />
              </motion.button>

              <motion.button
                onClick={handleShare}
                className="p-2 rounded-lg text-network-500 hover:text-network-700 hover:bg-network-50 transition-colors"
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