/**
 * Restaurant Detail Page - Enhanced with Progressive Trust Score Display
 * 
 * Shows three-state trust score system:
 * 1. Cold Start: Community average with CTA to follow users
 * 2. Network Only: Network average with CTA to rate more places
 * 3. Personalized: Full Trust Score 2.0 with taste alignment
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, MapPin, DollarSign, Users, Info } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface TrustScoreDisplay {
  score: number;
  label: string;
  icon: string;
  basis: string;
  cta?: string;
  explanation?: string;
  state: 'cold_start' | 'network_only' | 'personalized';
  confidence?: number;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  priceRange: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  googleRating?: number;
  googleReviewCount?: number;
  trustScoreDisplay: TrustScoreDisplay;
  recommendations: any[];
  totalRecommendations: number;
}

// ============================================
// PROGRESSIVE TRUST SCORE COMPONENT
// ============================================

interface TrustScoreCardProps {
  trustScoreDisplay: TrustScoreDisplay;
}

function TrustScoreCard({ trustScoreDisplay }: TrustScoreCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine color scheme based on state and score
  const getColorScheme = () => {
    switch (trustScoreDisplay.state) {
      case 'personalized':
        if (trustScoreDisplay.score >= 8) return 'bg-green-50 border-green-200 text-green-900';
        if (trustScoreDisplay.score >= 6) return 'bg-blue-50 border-blue-200 text-blue-900';
        return 'bg-gray-50 border-gray-200 text-gray-900';
      
      case 'network_only':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      
      case 'cold_start':
      default:
        return 'bg-orange-50 border-orange-200 text-orange-900';
    }
  };

  const getScoreColor = () => {
    switch (trustScoreDisplay.state) {
      case 'personalized':
        if (trustScoreDisplay.score >= 8) return 'text-green-600';
        if (trustScoreDisplay.score >= 6) return 'text-blue-600';
        return 'text-gray-600';
      
      case 'network_only':
        return 'text-purple-600';
      
      case 'cold_start':
      default:
        return 'text-orange-600';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getColorScheme()}`}>
      {/* Header with icon and label */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{trustScoreDisplay.icon}</span>
          <div>
            <h3 className="font-semibold text-lg">{trustScoreDisplay.label}</h3>
            <p className="text-sm opacity-75">{trustScoreDisplay.basis}</p>
          </div>
        </div>

        {/* Info tooltip button */}
        {trustScoreDisplay.explanation && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              aria-label="More information"
            >
              <Info className="w-5 h-5" />
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute right-0 top-8 z-10 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
                <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>
                {trustScoreDisplay.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score display */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-5xl font-bold ${getScoreColor()}`}>
          {trustScoreDisplay.score.toFixed(1)}
        </span>
        <span className="text-2xl text-gray-500">/10</span>
        
        {/* Confidence indicator for personalized scores */}
        {trustScoreDisplay.state === 'personalized' && trustScoreDisplay.confidence && (
          <span className="ml-2 text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
            {Math.round(trustScoreDisplay.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Call to action (if present) */}
      {trustScoreDisplay.cta && (
        <div className="flex items-start gap-2 p-3 bg-white bg-opacity-50 rounded-md">
          <span className="text-lg">💡</span>
          <p className="text-sm font-medium">{trustScoreDisplay.cta}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN RESTAURANT PAGE COMPONENT
// ============================================

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurant() {
      try {
        setLoading(true);
        const response = await fetch(`/api/restaurants/${restaurantId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch restaurant details');
        }

        const data = await response.json();
        setRestaurant(data);
      } catch (err) {
        console.error('Error fetching restaurant:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Restaurant not found'}</p>
          <button
            onClick={() => router.push('/discover')}
            className="text-blue-600 hover:underline"
          >
            Return to Discover
          </button>
        </div>
      </div>
    );
  }

  // Render Google star rating
  const renderGoogleStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-4 h-4">
          <Star className="absolute w-4 h-4 text-yellow-400" />
          <div className="absolute overflow-hidden w-2 h-4">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Restaurant Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {restaurant.name}
          </h1>

          <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
            {/* Cuisine */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{restaurant.cuisine}</span>
            </div>

            {/* Price range */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>{restaurant.priceRange}</span>
            </div>

            {/* Address */}
            {restaurant.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{restaurant.address}</span>
              </div>
            )}
          </div>

          {/* Google Rating */}
          {restaurant.googleRating && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Google Rating:</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {renderGoogleStars(restaurant.googleRating)}
                </div>
                <span className="text-sm text-gray-600">
                  {restaurant.googleRating.toFixed(1)}
                  {restaurant.googleReviewCount && (
                    <span className="ml-1">({restaurant.googleReviewCount.toLocaleString()} reviews)</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Progressive Trust Score Display - THE NEW FEATURE */}
        <TrustScoreCard trustScoreDisplay={restaurant.trustScoreDisplay} />

        {/* Recommendations Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recommendations ({restaurant.totalRecommendations})
          </h2>

          {restaurant.recommendations.length > 0 ? (
            <div className="space-y-4">
              {restaurant.recommendations.map((rec) => (
                <div key={rec.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      User {rec.userId}
                    </span>
                    <span className="text-sm text-gray-600">
                      Rating: {rec.rating}/10
                    </span>
                  </div>
                  {rec.comment && (
                    <p className="text-gray-700">{rec.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recommendations yet. Be the first to recommend this place!</p>
          )}
        </div>

        {/* Add Recommendation Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push(`/create?restaurant=${restaurantId}`)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Your Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}