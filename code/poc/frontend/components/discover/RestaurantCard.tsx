// FILE PATH: components/discover/RestaurantCard.tsx
// Individual restaurant card for the discover page

"use client"

import React, { useState } from 'react';
import { MapPin, Star, Users, ExternalLink } from 'lucide-react';
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
  topRecommendation?: {
    id: string;
    title: string;
    author: string;
    excerpt: string;
    trustScore: number;
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

const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  viewMode, 
  searchQuery,
}) => {
  const t = useTranslations('restaurantCard');
  const [showTrustScoreTooltip, setShowTrustScoreTooltip] = useState(false);

  const getTrustScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 9) return t('trustScore.excellent');
    if (score >= 7) return t('trustScore.veryGood');
    if (score >= 5) return t('trustScore.good');
    return t('trustScore.average');
  };

  const renderPriceRange = (range: number) => {
    const euros = Array.from({ length: 4 }, (_, i) => (
      <span key={i} className={i < range ? 'text-gray-700' : 'text-gray-300'}>
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
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  // Use default image if none provided
  const restaurantImage = restaurant.photos?.[0] || '/api/placeholder/400/300';
  const restaurantUrl = generateRestaurantUrl(restaurant.id, restaurant.name);

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200">
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
                    <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {highlightSearchTerm(restaurant.name, searchQuery || '')}
                    </h3>
                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {highlightSearchTerm(restaurant.address, searchQuery || '')}
                      {restaurant.distance && (
                        <span className="ml-2 text-sm text-blue-600">
                          • {formatDistance(restaurant.distance)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Trust Score Badge */}
                  <div className="relative">
                    <div
                      className={`px-3 py-2 rounded-lg border-2 cursor-help ${getTrustScoreColor(restaurant.avgTrustScore || 0)}`}
                      onMouseEnter={() => setShowTrustScoreTooltip(true)}
                      onMouseLeave={() => setShowTrustScoreTooltip(false)}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold">{(restaurant.avgTrustScore || 0).toFixed(1)}/10</div>
                        <div className="text-xs font-medium">{t('trustScore.label')}</div>
                      </div>
                    </div>

                    {/* Tooltip */}
                    {showTrustScoreTooltip && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900 mb-1">
                            {t('trustScore.label')}: {getTrustScoreLabel(restaurant.avgTrustScore || 0)}
                          </div>
                          <div className="text-gray-600">
                            {t('trustScore.tooltipFull', { count: restaurant.totalRecommendations || 0 })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Restaurant Info */}
                <div className="flex items-center gap-4 mb-3">
                  {restaurant.cuisineType && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {restaurant.cuisineType}
                    </span>
                  )}
                  {restaurant.priceRange && (
                    <div className="flex items-center text-sm font-medium">
                      {renderPriceRange(restaurant.priceRange)}
                    </div>
                  )}
                  {restaurant.verified && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {t('badges.verified')}
                    </span>
                  )}
                  <span className="text-gray-600 flex items-center text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    {t('stats.recommendations', { count: formatEngagementCount(restaurant.totalRecommendations || 0) })}
                  </span>
                </div>

                {/* Top Recommendation Preview */}
                {restaurant.topRecommendation && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 mb-1">
                        "{restaurant.topRecommendation.title}"
                      </div>
                      <div className="text-gray-600 mb-2">
                        {restaurant.topRecommendation.excerpt}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {t('topRecommendation.by', { author: restaurant.topRecommendation.author })}
                        </span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="ml-1 text-sm font-medium">
                            {restaurant.topRecommendation.trustScore?.toFixed(1) || '0'}/10
                          </span>
                        </div>
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
                
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
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
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
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
          
          {/* Trust Score Badge Overlay */}
          <div className="absolute top-3 right-3">
            <div
              className={`px-3 py-2 rounded-lg border-2 backdrop-blur-sm cursor-help ${getTrustScoreColor(restaurant.avgTrustScore || 0)}`}
              onMouseEnter={() => setShowTrustScoreTooltip(true)}
              onMouseLeave={() => setShowTrustScoreTooltip(false)}
            >
              <div className="text-center">
                <div className="text-lg font-bold">{(restaurant.avgTrustScore || 0).toFixed(1)}/10</div>
                <div className="text-xs font-medium">{t('trustScore.label')}</div>
              </div>
            </div>

            {/* Tooltip */}
            {showTrustScoreTooltip && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                <div className="text-sm">
                  <div className="font-semibold text-gray-900 mb-1">
                    {t('trustScore.label')}: {getTrustScoreLabel(restaurant.avgTrustScore || 0)}
                  </div>
                  <div className="text-gray-600">
                    {t('trustScore.tooltipShort', { count: restaurant.totalRecommendations || 0 })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SaveButton - Replaces old bookmark button */}
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
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
              {highlightSearchTerm(restaurant.name, searchQuery || '')}
            </h3>
            <p className="text-gray-600 flex items-center mt-1 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">
                {highlightSearchTerm(restaurant.address, searchQuery || '')}
              </span>
              {restaurant.distance && (
                <span className="ml-2 text-blue-600 flex-shrink-0">
                  • {formatDistance(restaurant.distance)}
                </span>
              )}
            </p>
          </div>

          {/* Restaurant Meta */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {restaurant.cuisineType && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {restaurant.cuisineType}
                </span>
              )}
              {restaurant.priceRange && (
                <div className="flex items-center text-sm font-medium">
                  {renderPriceRange(restaurant.priceRange)}
                </div>
              )}
              {restaurant.verified && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  ✓
                </span>
              )}
            </div>
            <span className="text-gray-600 flex items-center text-xs">
              <Users className="h-3 w-3 mr-1" />
              {formatEngagementCount(restaurant.totalRecommendations || 0)}
            </span>
          </div>

          {/* Top Recommendation Preview */}
          {restaurant.topRecommendation && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="text-sm">
                <div className="font-semibold text-gray-900 mb-1 line-clamp-1">
                  "{restaurant.topRecommendation.title}"
                </div>
                <div className="text-gray-600 text-xs line-clamp-2 mb-2">
                  {restaurant.topRecommendation.excerpt}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {restaurant.topRecommendation.author}
                  </span>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="ml-1 text-xs font-medium">
                      {restaurant.topRecommendation.trustScore?.toFixed(1) || '0'}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
            {t('actions.viewRecommendations')}
          </button>
        </div>
      </Link>
    </div>
  );
};

export default RestaurantCard;