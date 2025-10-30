// File: code/poc/frontend/app/restaurant/[id]/page.tsx
// Anti-Restaurant / Network Recommendations Page - With Real API Integration
// Shows what YOUR network + people with YOUR taste say about this restaurant

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useAuthenticatedFetch } from '../../../hooks/useAuth';
import CleanHeader from '../../../components/CleanHeader';
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  DollarSign,
  Star,
  Users,
  Utensils,
  Heart,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  cuisineType?: string;
  priceRange?: number;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
  avgTrustScore?: number;
  totalRecommendations?: number;
  googleRating?: number;
  googleReviewCount?: number;
}

interface Recommender {
  id: string;
  displayName: string;
  avatar?: string;
  isAnonymized: boolean;
  tasteMatch?: number;
  socialDistance?: number;
  credibility?: {
    totalRecommendations: number;
    avgTrustScore: number;
    specialties: string[];
  };
}

interface DishRating {
  dishName: string;
  avgRating: number;
  recommendationCount: number;
  topRecommenders: string[];
}

interface Recommendation {
  id: string;
  rating: number;
  reviewText: string;
  dishRecommendations: Array<{
    dishName: string;
    rating: number;
    notes?: string;
  }>;
  contextTags: string[];
  createdAt: string;
  recommender: Recommender;
  tier: 1 | 2 | 3;
}

interface UserOwnReview {
  mostRecent: {
    id: string;
    rating: number;
    reviewText: string;
    dishRecommendations: Array<{
      dishName: string;
      rating: number;
      notes?: string;
    }>;
    contextTags: string[];
    createdAt: string;
  };
  totalReviews: number;
  olderReviews: Array<{
    id: string;
    rating: number;
    createdAt: string;
  }>;
}

const RestaurantNetworkPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recommendations, setRecommendations] = useState<{
    tier1: Recommendation[];
    tier2: Recommendation[];
    tier3: Recommendation[];
  }>({ tier1: [], tier2: [], tier3: [] });
  const [userOwnReview, setUserOwnReview] = useState<UserOwnReview | null>(null);
  const [dishRatings, setDishRatings] = useState<DishRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showAllTier2, setShowAllTier2] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const restaurantId = parseInt(params.id as string);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId, user]);

  const fetchRestaurantData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch restaurant basic info
      const restaurantResponse = await fetch(`${API_BASE_URL}/api/restaurants/${restaurantId}`);
      
      if (!restaurantResponse.ok) {
        throw new Error('Restaurant not found');
      }

      const restaurantData = await restaurantResponse.json();
      setRestaurant(restaurantData.restaurant);

      // Fetch tiered recommendations if user is logged in
      if (user) {
        try {
          const recommendationsResponse = await authenticatedFetch(
            `${API_BASE_URL}/api/restaurants/${restaurantId}/recommendations?userId=${user.id}`
          );

          if (recommendationsResponse.ok) {
            const recommendationsData = await recommendationsResponse.json();
            setRecommendations({
              tier1: recommendationsData.tier1 || [],
              tier2: recommendationsData.tier2 || [],
              tier3: recommendationsData.tier3 || []
            });
            setUserOwnReview(recommendationsData.userOwnReviews || null);
          } else {
            console.error('Failed to fetch recommendations');
            setRecommendations({ tier1: [], tier2: [], tier3: [] });
            setUserOwnReview(null);
          }
        } catch (recError) {
          console.error('Error fetching recommendations:', recError);
          setRecommendations({ tier1: [], tier2: [], tier3: [] });
          setUserOwnReview(null);
        }

        // Fetch dish ratings
        try {
          const dishesResponse = await authenticatedFetch(
            `${API_BASE_URL}/api/restaurants/${restaurantId}/dishes?userId=${user.id}`
          );

          if (dishesResponse.ok) {
            const dishesData = await dishesResponse.json();
            setDishRatings(dishesData.dishes || []);
          } else {
            console.error('Failed to fetch dishes');
            setDishRatings([]);
          }
        } catch (dishError) {
          console.error('Error fetching dishes:', dishError);
          setDishRatings([]);
        }
      } else {
        // For non-logged-in users, show empty state
        setRecommendations({ tier1: [], tier2: [], tier3: [] });
        setDishRatings([]);
      }

    } catch (err) {
      console.error('Error fetching restaurant data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRestaurant = async () => {
    if (!user) {
      toast.error('Please log in to save restaurants');
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/saved-lists/quick-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'restaurant',
          itemId: restaurantId
        })
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        toast.success(isSaved ? 'Removed from saved' : 'Saved to your list!');
      }
    } catch (error) {
      console.error('Error saving restaurant:', error);
      toast.error('Failed to save restaurant');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return "💎 From Friends with Your Taste";
      case 2: return "✨ From People with Your Taste";
      case 3: return "🤝 From Your Network";
      default: return "Recommendations";
    }
  };

  const getTierDescription = (tier: number) => {
    switch (tier) {
      case 1: return "Friends who share your taste preferences";
      case 2: return "Anonymized recommendations from users with similar taste profiles";
      case 3: return "People you follow (different taste preferences)";
      default: return "";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Utensils className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'This restaurant does not exist.'}</p>
            <button onClick={() => router.push('/discover')} className="btn-primary">
              Back to Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalRecommendations = recommendations.tier1.length + recommendations.tier2.length + recommendations.tier3.length;
  const visibleTier2 = showAllTier2 ? recommendations.tier2 : recommendations.tier2.slice(0, 2);

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Restaurant Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
              {restaurant.cuisineType && (
                <span className="flex items-center gap-1">
                  <Utensils size={16} />
                  {restaurant.cuisineType}
                </span>
              )}
              {restaurant.priceRange && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <DollarSign size={16} />
                    {'$'.repeat(restaurant.priceRange)}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin size={16} />
                {restaurant.city}
              </span>
            </div>
          </div>

          {/* Login Prompt */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              See Personalized Recommendations
            </h3>
            <p className="text-gray-600 mb-6">
              Log in to see what your friends and people with similar taste say about this restaurant
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary"
            >
              Log In to See Recommendations
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CleanHeader />
      
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Restaurant Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                {restaurant.cuisineType && (
                  <span className="flex items-center gap-1">
                    <Utensils size={16} />
                    {restaurant.cuisineType}
                  </span>
                )}
                {restaurant.priceRange && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <DollarSign size={16} />
                      {'$'.repeat(restaurant.priceRange)}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {restaurant.city}
                </span>
              </div>

              {/* Trust Score */}
              {restaurant.avgTrustScore && totalRecommendations > 0 && (
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    <span className="text-2xl font-bold text-gray-900">
                      {restaurant.avgTrustScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on {recommendations.tier1.length} {recommendations.tier1.length === 1 ? 'friend' : 'friends'} + {recommendations.tier2.length} people with your taste
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRestaurant}
                className={`p-2 rounded-lg transition-colors ${
                  isSaved 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save restaurant'}
              >
                <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                title="Share restaurant"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <MapPin size={18} />
              Get Directions
            </a>
            <button
              onClick={() => router.push(`/create?restaurant=${restaurantId}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Star size={18} />
              Write Recommendation
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* User's Own Review - Shown at top if exists */}
            {userOwnReview && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">📝 Your Review</h2>
                    {userOwnReview.totalReviews > 1 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {userOwnReview.totalReviews} visits
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/recommendations/${userOwnReview.mostRecent.id}/edit`)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit Review
                  </button>
                </div>

                {userOwnReview.totalReviews > 1 && (
                  <p className="text-sm text-blue-700 mb-3">
                    💡 You've reviewed this place {userOwnReview.totalReviews} times
                  </p>
                )}

                <div className="bg-white rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">Most Recent:</span>
                    {userOwnReview.mostRecent.rating > 0 ? (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-gray-900">{userOwnReview.mostRecent.rating}/10</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-sm text-gray-500">{formatTimeAgo(userOwnReview.mostRecent.createdAt)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{formatTimeAgo(userOwnReview.mostRecent.createdAt)}</span>
                        <span className="text-xs text-gray-400">(No rating provided)</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {userOwnReview.mostRecent.reviewText}
                  </p>

                  {/* User's Dish Recommendations */}
                  {userOwnReview.mostRecent.dishRecommendations.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Dishes you rated:</p>
                      <div className="space-y-1">
                        {userOwnReview.mostRecent.dishRecommendations.map((dish, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-900">• {dish.dishName}</span>
                            <span className="text-green-600 font-medium">{dish.rating}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context Tags */}
                  {userOwnReview.mostRecent.contextTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {userOwnReview.mostRecent.contextTags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Previous Reviews Summary */}
                {userOwnReview.olderReviews.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Previous visits: </span>
                    {userOwnReview.olderReviews.map((review, idx) => (
                      <span key={review.id}>
                        {review.rating > 0 ? `${review.rating}/10` : 'No rating'} ({formatTimeAgo(review.createdAt)})
                        {idx < userOwnReview.olderReviews.length - 1 && ' · '}
                      </span>
                    ))}
                    <button
                      onClick={() => router.push(`/profile?tab=recommendations&restaurant=${restaurantId}`)}
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      View history
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Tier 1: Friends with Taste */}
            {recommendations.tier1.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{getTierLabel(1)}</h2>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    {recommendations.tier1.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{getTierDescription(1)}</p>
                
                <div className="space-y-4">
                  {recommendations.tier1.map(rec => (
                    <div key={rec.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      {/* Recommender Info */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {rec.recommender.displayName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{rec.recommender.displayName}</span>
                            {rec.recommender.tasteMatch && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {rec.recommender.tasteMatch}% taste match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{rec.rating}/10</span>
                            <span>•</span>
                            <span>{formatTimeAgo(rec.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Text */}
                      <p className="text-gray-700 mb-3 leading-relaxed">{rec.reviewText}</p>

                      {/* Dish Recommendations */}
                      {rec.dishRecommendations.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommended Dishes:</p>
                          <div className="space-y-1">
                            {rec.dishRecommendations.map((dish, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-900">{dish.dishName}</span>
                                <span className="text-green-600 font-medium">{dish.rating}/10</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context Tags */}
                      {rec.contextTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {rec.contextTags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                              {tag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier 2: Taste Matches (Anonymized) */}
            {recommendations.tier2.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{getTierLabel(2)}</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {recommendations.tier2.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{getTierDescription(2)}</p>
                
                <div className="space-y-4">
                  {visibleTier2.map(rec => (
                    <div key={rec.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      {/* Anonymized Recommender */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl flex-shrink-0">
                          🎭
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{rec.recommender.displayName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{rec.rating}/10</span>
                            <span>•</span>
                            <span>{formatTimeAgo(rec.createdAt)}</span>
                          </div>
                          {/* Credibility Signals */}
                          {rec.recommender.credibility && (
                            <div className="text-xs text-gray-500 mt-1">
                              {rec.recommender.credibility.totalRecommendations} recommendations • 
                              {rec.recommender.credibility.avgTrustScore.toFixed(1)} avg score
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 leading-relaxed">{rec.reviewText}</p>

                      {rec.dishRecommendations.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommended Dishes:</p>
                          <div className="space-y-1">
                            {rec.dishRecommendations.map((dish, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-900">{dish.dishName}</span>
                                <span className="text-green-600 font-medium">{dish.rating}/10</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Show More Button */}
                  {recommendations.tier2.length > 2 && (
                    <button
                      onClick={() => setShowAllTier2(!showAllTier2)}
                      className="w-full py-2 text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      {showAllTier2 ? (
                        <>
                          <ChevronUp size={16} />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} />
                          Show {recommendations.tier2.length - 2} More
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tier 3: Network Only */}
            {recommendations.tier3.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{getTierLabel(3)}</h2>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                    {recommendations.tier3.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{getTierDescription(3)}</p>
                
                <div className="space-y-4">
                  {recommendations.tier3.map(rec => (
                    <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                          {rec.recommender.displayName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{rec.recommender.displayName}</span>
                            {rec.recommender.tasteMatch && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                {rec.recommender.tasteMatch}% taste match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{rec.rating}/10</span>
                            <span>•</span>
                            <span>{formatTimeAgo(rec.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700">{rec.reviewText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Recommendations - Cold Start */}
            {totalRecommendations === 0 && !userOwnReview && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Personalized Recommendations Yet</h3>
                <p className="text-gray-600 mb-4">Be the first from your network to recommend this place!</p>
                <button
                  onClick={() => router.push(`/create?restaurant=${restaurantId}`)}
                  className="btn-primary"
                >
                  Write First Recommendation
                </button>
              </div>
            )}

            {/* User has reviewed but no network recommendations yet */}
            {totalRecommendations === 0 && userOwnReview && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Network Recommendations Yet</h3>
                <p className="text-gray-600 mb-4">
                  Share this restaurant with friends to see their opinions!
                </p>
                <button
                  onClick={handleShare}
                  className="btn-primary"
                >
                  Share Restaurant
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            
            {/* Top Dishes */}
            {dishRatings.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Top Dishes
                </h3>
                <p className="text-xs text-gray-500 mb-4">From people with similar taste</p>
                
                <div className="space-y-3">
                  {dishRatings.map((dish, idx) => (
                    <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{dish.dishName}</span>
                        <span className="text-green-600 font-bold text-sm">{dish.avgRating.toFixed(1)}/10</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {dish.recommendationCount} {dish.recommendationCount === 1 ? 'recommendation' : 'recommendations'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact & Location */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{restaurant.address}<br />{restaurant.city}</span>
                </div>
                
                {restaurant.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">
                      {restaurant.phone}
                    </a>
                  </div>
                )}
                
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>

              {/* Mini Map Placeholder */}
              <div className="mt-4 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                <MapPin className="w-5 h-5 mr-2" />
                Map View
              </div>
            </div>

            {/* Google Reference (Only if limited Zesto data) */}
            {restaurant.googleRating && totalRecommendations < 5 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">For Reference</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-gray-900">{restaurant.googleRating}</span>
                  <Star className="w-5 h-5 text-gray-400 fill-gray-400" />
                </div>
                <p className="text-xs text-gray-500">
                  Google average ({restaurant.googleReviewCount?.toLocaleString()} reviews)
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  💡 Unlock personalized recommendations by rating places you know
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantNetworkPage;