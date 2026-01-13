// FILE PATH: components/discover/RestaurantCard.tsx
// Individual restaurant card for the discover page
// UPDATED: Dark mode support
// UPDATED: Replaced numerical scores with social trust indicators (network, similar tastes, community)

"use client"

import React, { useState } from 'react';
import { MapPin, Star, Users, ExternalLink, UserCheck, Heart, Globe } from 'lucide-react';
import Link from 'next/link';
import { generateRestaurantUrl, formatEngagementCount } from '@/lib/utils';
import SaveButton from '@/components/saved-lists/SaveButton';
import { useTranslations } from 'next-intl';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
  addedBy?: string;
  verified?: boolean;
  totalRecommendations?: number;
  avgTrustScore?: number;
  // New social trust fields
  networkRecommendations?: number;      // From user's direct network
  similarTasteRecommendations?: number; // From users with similar preferences
  communityRecommendations?: number;    // From broader community
  topRecommendation?: {
    id: string;
    title: string;
    author: string;
    excerpt: string;
    trustScore: number;
    isFromNetwork?: boolean;
  };
  distance?: number;
  photos?: string[];
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  viewMode: 'grid' | 'list';
  searchQuery?: string;
  onBookmark?: (restaurantId: string) => void;
  isBookmarked?: boolean;
}

// Trust tier configuration
type TrustTier = 'network' | 'similarTaste' | 'community' | 'none';

const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  viewMode, 
  searchQuery,
}) => {
  const t = useTranslations('restaurantCard');
  const [showTrustTooltip, setShowTrustTooltip] = useState(false);

  // Determine the trust tier based on recommendations
  const getTrustTier = (): TrustTier => {
    if (restaurant.networkRecommendations && restaurant.networkRecommendations > 0) return 'network';
    if (restaurant.similarTasteRecommendations && restaurant.similarTasteRecommendations > 0) return 'similarTaste';
    if (restaurant.communityRecommendations && restaurant.communityRecommendations > 0) return 'community';
    if (restaurant.totalRecommendations && restaurant.totalRecommendations > 0) return 'community';
    return 'none';
  };

  const trustTier = getTrustTier();

  // Trust tier styling
  const getTrustTierStyles = (tier: TrustTier) => {
    switch (tier) {
      case 'network':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          border: 'border-red-300 dark:border-red-700',
          text: 'text-red-700 dark:text-red-400',
          icon: <UserCheck className="w-4 h-4" />,
          dotColor: 'bg-red-500'
        };
      case 'similarTaste':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          border: 'border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: <Heart className="w-4 h-4" />,
          dotColor: 'bg-emerald-500'
        };
      case 'community':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          border: 'border-blue-300 dark:border-blue-700',
          text: 'text-blue-700 dark:text-blue-400',
          icon: <Globe className="w-4 h-4" />,
          dotColor: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          border: 'border-gray-300 dark:border-gray-600',
          text: 'text-gray-600 dark:text-gray-400',
          icon: <Users className="w-4 h-4" />,
          dotColor: 'bg-gray-400'
        };
    }
  };

  // Get recommendation count and label for display
  const getTrustDisplay = () => {
    if (restaurant.networkRecommendations && restaurant.networkRecommendations > 0) {
      return {
        count: restaurant.networkRecommendations,
        label: t('trust.fromNetwork'),
        tier: 'network' as TrustTier
      };
    }
    if (restaurant.similarTasteRecommendations && restaurant.similarTasteRecommendations > 0) {
      return {
        count: restaurant.similarTasteRecommendations,
        label: t('trust.similarTastes'),
        tier: 'similarTaste' as TrustTier
      };
    }
    const communityCount = restaurant.communityRecommendations || restaurant.totalRecommendations || 0;
    if (communityCount > 0) {
      return {
        count: communityCount,
        label: t('trust.fromCommunity'),
        tier: 'community' as TrustTier
      };
    }
    return {
      count: 0,
      label: t('trust.beFirst'),
      tier: 'none' as TrustTier
    };
  };

  const trustDisplay = getTrustDisplay();
  const tierStyles = getTrustTierStyles(trustDisplay.tier);

  const renderPriceRange = (range: number) => {
    const euros = Array.from({ length: 4 }, (_, i) => (
      <span key={i} className={i < range ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>
        €
      </span>
    ));
    return euros;
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  // Use default image if none provided
  const restaurantImage = restaurant.photos?.[0] || '/api/placeholder/400/300';
  const restaurantUrl = generateRestaurantUrl(restaurant.id, restaurant.name);

  // Trust Badge Component
  const TrustBadge = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`relative ${compact ? 'inline-flex' : ''}`}
      onMouseEnter={() => setShowTrustTooltip(true)}
      onMouseLeave={() => setShowTrustTooltip(false)}
    >
      <div className={`px-3 py-2 rounded-lg border-2 cursor-help ${tierStyles.bg} ${tierStyles.border}`}>
        <div className={`flex items-center gap-2 ${tierStyles.text}`}>
          <span className={`w-2 h-2 rounded-full ${tierStyles.dotColor}`}></span>
          {trustDisplay.count > 0 ? (
            <div className={compact ? 'text-sm' : ''}>
              <span className="font-bold">{trustDisplay.count}</span>
              {!compact && <span className="text-xs ml-1">{trustDisplay.label}</span>}
            </div>
          ) : (
            <span className="text-xs font-medium">{trustDisplay.label}</span>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTrustTooltip && trustDisplay.count > 0 && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-3 z-10">
          <div className="text-sm">
            <div className={`font-semibold mb-1 ${tierStyles.text}`}>
              {trustDisplay.label}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {t('trust.tooltip', { count: trustDisplay.count })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
        <Link href={restaurantUrl} className="block">
          <div className="p-6">
            <div className="flex gap-6">
              {/* Restaurant Image */}
              <div className="w-32 h-32 flex-shrink-0">
                <img
                  src={restaurantImage}
                  alt={restaurant.name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/400/300';
                  }}
                />
              </div>

              {/* Main Content */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors">
                      {highlightSearchTerm(restaurant.name, searchQuery || '')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {highlightSearchTerm(restaurant.address, searchQuery || '')}
                      {restaurant.distance && (
                        <span className="ml-2 text-sm text-[#FF644A]">
                          • {formatDistance(restaurant.distance)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Trust Badge */}
                  <TrustBadge />
                </div>

                {/* Restaurant Info */}
                <div className="flex items-center gap-4 mb-3">
                  {restaurant.cuisineType && (
                    <span className="bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#1F1E2A] dark:text-white px-3 py-1 rounded-full text-sm font-medium">
                      {restaurant.cuisineType}
                    </span>
                  )}
                  {restaurant.priceRange && (
                    <div className="flex items-center text-sm font-medium">
                      {renderPriceRange(restaurant.priceRange)}
                    </div>
                  )}
                  {restaurant.verified && (
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-medium">
                      {t('badges.verified')}
                    </span>
                  )}
                </div>

                {/* Top Recommendation Preview */}
                {restaurant.topRecommendation && (
                  <div className="bg-gray-50 dark:bg-[#353444] rounded-lg p-3">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {restaurant.topRecommendation.isFromNetwork && (
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          "{restaurant.topRecommendation.title}"
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mb-2">
                        {restaurant.topRecommendation.excerpt}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {t('topRecommendation.by', { author: restaurant.topRecommendation.author })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <SaveButton
                  itemType="restaurant"
                  itemId={restaurant.id}
                  compact
                />
                
                <div className="p-2 bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A] rounded-lg hover:bg-[#FF644A]/20 dark:hover:bg-[#FF644A]/30 transition-colors">
                  <ExternalLink className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden">
      <Link href={restaurantUrl} className="block">
        {/* Restaurant Image */}
        <div className="relative h-48">
          <img
            src={restaurantImage}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/api/placeholder/400/300';
            }}
          />
          
          {/* Trust Badge Overlay */}
          <div className="absolute top-3 right-3">
            <TrustBadge compact />
          </div>

          {/* SaveButton */}
          <div className="absolute top-3 left-3">
            <SaveButton
              itemType="restaurant"
              itemId={restaurant.id}
              compact
            />
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Restaurant Header */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors line-clamp-1">
              {highlightSearchTerm(restaurant.name, searchQuery || '')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">
                {highlightSearchTerm(restaurant.address, searchQuery || '')}
              </span>
              {restaurant.distance && (
                <span className="ml-2 text-[#FF644A] flex-shrink-0">
                  • {formatDistance(restaurant.distance)}
                </span>
              )}
            </p>
          </div>

          {/* Restaurant Meta */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {restaurant.cuisineType && (
                <span className="bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#1F1E2A] dark:text-white px-2 py-1 rounded-full text-xs font-medium">
                  {restaurant.cuisineType}
                </span>
              )}
              {restaurant.priceRange && (
                <div className="flex items-center text-sm font-medium">
                  {renderPriceRange(restaurant.priceRange)}
                </div>
              )}
              {restaurant.verified && (
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-medium">
                  ✓
                </span>
              )}
            </div>
          </div>

          {/* Top Recommendation Preview */}
          {restaurant.topRecommendation && (
            <div className="bg-gray-50 dark:bg-[#353444] rounded-lg p-3 mb-3">
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  {restaurant.topRecommendation.isFromNetwork && (
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                    "{restaurant.topRecommendation.title}"
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2 mb-2">
                  {restaurant.topRecommendation.excerpt}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {restaurant.topRecommendation.author}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button className="w-full px-4 py-2 bg-[#FF644A] hover:bg-[#E65441] text-white rounded-lg transition-colors text-sm font-medium">
            {t('actions.viewRecommendations')}
          </button>
        </div>
      </Link>
    </div>
  );
};

export default RestaurantCard;