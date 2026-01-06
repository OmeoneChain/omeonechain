// FILE PATH: app/[locale]/restaurant/[id]/[slug]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Star, Users, Heart, ExternalLink, Phone, Globe, Share2, Clock, Award, Utensils } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { restaurantService, Restaurant } from '@/lib/services/restaurant-service';
import { TrustScoreBadge } from '@/components/ui/trust-score-badge';
import { formatEngagementCount, timeAgo, formatDistance } from '@/lib/utils';

// Mock recommendation data for the restaurant detail page
interface Recommendation {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
    trustScore: number;
  };
  trustScore: number;
  socialDistance: 1 | 2;
  timestamp: string;
  likes: number;
  tags: string[];
  personalRating?: number;
  photos?: string[];
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const restaurantIdParam = params?.id as string;
  const slug = params?.slug as string;
  
  const t = useTranslations('common.restaurants.detailPage');

  // Parse and validate restaurant ID as integer
  const restaurantId = restaurantIdParam ? parseInt(restaurantIdParam, 10) : null;
  const isValidId = restaurantId !== null && !isNaN(restaurantId) && restaurantId > 0;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'recent'>('all');
  const [sortBy, setSortBy] = useState<'trustScore' | 'recent' | 'social'>('trustScore');

  // Debug information in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Restaurant Detail Page Debug:', {
        restaurantIdParam,
        restaurantId,
        isValidId,
        slug
      });
    }
  }, [restaurantIdParam, restaurantId, isValidId, slug]);

  // Load restaurant data
  useEffect(() => {
    if (!isValidId) {
      setError(t('errors.invalidId'));
      setLoading(false);
      return;
    }

    loadRestaurant();
    loadRecommendations();
    checkBookmarkStatus();
  }, [restaurantId, isValidId]);

  const loadRestaurant = async () => {
    if (!isValidId || restaurantId === null) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await restaurantService.getRestaurant(restaurantId);
      
      if (!data) {
        setError(t('errors.notFound'));
        return;
      }
      
      setRestaurant(data);
    } catch (err) {
      console.error('Error loading restaurant:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Replace the loadRecommendations function content with:
const loadRecommendations = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/restaurants/${restaurantId}/recommendations?sort=trust_score`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!response.ok) throw new Error('Failed to load recommendations');
    
    const data = await response.json();
    setRecommendations(data.recommendations || []);
  } catch (error) {
    console.error('Error loading recommendations:', error);
    setRecommendations([]);
  }
};

  const checkBookmarkStatus = () => {
    if (!isValidId || restaurantId === null) return;

    try {
      const saved = localStorage.getItem('bookmarkedRestaurants');
      if (saved) {
        const bookmarks = new Set(JSON.parse(saved));
        // Convert to string for localStorage compatibility but maintain integer logic
        setIsBookmarked(bookmarks.has(restaurantId.toString()));
      }
    } catch (error) {
      console.warn('Could not load bookmarks:', error);
    }
  };

  const handleBookmark = () => {
    if (!isValidId || restaurantId === null) return;

    try {
      const saved = localStorage.getItem('bookmarkedRestaurants');
      const bookmarks = new Set(saved ? JSON.parse(saved) : []);
      
      // Use string representation for localStorage compatibility
      const restaurantIdStr = restaurantId.toString();
      
      if (isBookmarked) {
        bookmarks.delete(restaurantIdStr);
      } else {
        bookmarks.add(restaurantIdStr);
      }
      
      localStorage.setItem('bookmarkedRestaurants', JSON.stringify([...bookmarks]));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.warn('Could not save bookmark:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share && restaurant) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: t('share.text', { name: restaurant.name }),
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  const renderPriceRange = (range: number) => {
    return Array.from({ length: 4 }, (_, i) => (
      <span key={i} className={i < range ? 'text-gray-700' : 'text-gray-300'}>
        €
      </span>
    ));
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-100';
    if (score >= 7) return 'text-blue-600 bg-blue-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getSocialDistanceIcon = (distance: 1 | 2) => {
    if (distance === 1) return '👤'; // Direct friend
    return '👥'; // Friend of friend
  };

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(rec => {
      if (activeTab === 'friends') return rec.socialDistance === 1;
      if (activeTab === 'recent') return new Date(rec.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'trustScore':
          return b.trustScore - a.trustScore;
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'social':
          return a.socialDistance - b.socialDistance;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-400 mt-2">
              Debug: Loading restaurant ID {restaurantId} (valid: {isValidId ? 'yes' : 'no'})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('errors.invalidIdTitle')}
          </h1>
          <p className="text-gray-600 mb-4">
            {t('errors.invalidIdDescription', { id: restaurantIdParam })}
          </p>
          <Link 
            href="/discover"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToDiscover')}
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg text-left text-xs">
              <strong>Debug Info:</strong><br />
              URL Param: {restaurantIdParam}<br />
              Parsed ID: {restaurantId}<br />
              Is Valid: {isValidId ? 'true' : 'false'}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || t('errors.notFound')}
          </h1>
          <p className="text-gray-600 mb-4">
            {error === t('errors.notFound') 
              ? t('errors.notFoundDescription', { id: restaurantId })
              : t('errors.loadFailedDescription')
            }
          </p>
          <Link 
            href="/discover"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToDiscover')}
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-red-100 rounded-lg text-left text-xs">
              <strong>Debug Info:</strong><br />
              Restaurant ID: {restaurantId}<br />
              Error: {error}<br />
              Restaurant Data: {restaurant ? 'Found' : 'Not found'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/discover"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              {t('back')}
            </Link>
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-gray-400">
                Restaurant ID: {restaurantId} | Slug: {slug}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Restaurant Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {restaurant.name}
                  </h1>
                  
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{restaurant.address}</span>
                    {restaurant.distance && (
                      <span className="ml-2 text-blue-600">
                        • {formatDistance(restaurant.distance)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    {restaurant.cuisineType && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <Utensils className="h-3 w-3 mr-1" />
                        {restaurant.cuisineType}
                      </span>
                    )}
                    
                    {restaurant.priceRange && (
                      <div className="flex items-center text-sm font-medium">
                        {renderPriceRange(restaurant.priceRange)}
                      </div>
                    )}
                    
                    {restaurant.verified && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Award className="h-3 w-3 mr-1" />
                        {t('verified')}
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {restaurant.phone && (
                      <a 
                        href={`tel:${restaurant.phone}`}
                        className="flex items-center hover:text-blue-600"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        {restaurant.phone}
                      </a>
                    )}
                    
                    {restaurant.website && (
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-blue-600"
                      >
                        <Globe className="h-4 w-4 mr-1" />
                        {t('website')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Score & Actions */}
            <div className="md:w-64">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <TrustScoreBadge 
                  score={restaurant.avgTrustScore || 0}
                  variant="detailed"
                  socialContext={{
                    directFriends: Math.floor((restaurant.totalRecommendations || 0) * 0.6),
                    friendsOfFriends: Math.floor((restaurant.totalRecommendations || 0) * 0.4)
                  }}
                />
                
                <div className="mt-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>{t('totalRecommendations')}</span>
                    <span className="font-medium">{formatEngagementCount(restaurant.totalRecommendations || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleBookmark}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isBookmarked
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? t('actions.saved') : t('actions.save')}
                </button>
                
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  aria-label={t('actions.share')}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('tabs.all', { count: recommendations.length })}
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👤 {t('tabs.friends', { count: recommendations.filter(r => r.socialDistance === 1).length })}
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🕐 {t('tabs.recent')}
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label={t('sort.label')}
          >
            <option value="trustScore">{t('sort.trustScore')}</option>
            <option value="recent">{t('sort.recent')}</option>
            <option value="social">{t('sort.socialProximity')}</option>
          </select>
        </div>

        {/* Recommendations List */}
        <div className="space-y-6">
          {filteredRecommendations.map((recommendation) => (
            <div key={recommendation.id} className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Recommendation Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{recommendation.author.avatar}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{recommendation.author.name}</h3>
                      {recommendation.author.verified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                      <span className="text-sm">{getSocialDistanceIcon(recommendation.socialDistance)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{t('recommendation.trustScore', { score: recommendation.author.trustScore })}</span>
                      <span>•</span>
                      <span>{timeAgo(recommendation.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreColor(recommendation.trustScore)}`}>
                    {recommendation.trustScore.toFixed(1)}
                  </span>
                  {recommendation.personalRating && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                      {t('recommendation.rating', { rating: recommendation.personalRating })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendation Content */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{recommendation.title}</h4>
                <p className="text-gray-700 leading-relaxed">{recommendation.content}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {recommendation.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Recommendation Footer */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{t('recommendation.likes', { count: recommendation.likes })}</span>
                </div>
                
                {recommendation.photos && recommendation.photos.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>{t('recommendation.photos', { count: recommendation.photos.length })}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRecommendations.length === 0 && (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('emptyState.title')}
            </h3>
            <p className="text-gray-600">
              {t('emptyState.description')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}