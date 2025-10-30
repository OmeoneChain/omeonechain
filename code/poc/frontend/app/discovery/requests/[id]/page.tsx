// File: code/poc/frontend/app/discovery/requests/[id]/page.tsx
// Discovery Request Detail Page - View request and submit responses
// ✅ FIXED: Inline restaurant autocomplete (no navigation)

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useAuthenticatedFetch } from '../../../../hooks/useAuth';
import CleanHeader from '../../../../components/CleanHeader';
import RestaurantAutocomplete from '../../../../components/restaurant/RestaurantAutocomplete';
import { 
  HelpCircle, 
  MapPin, 
  Utensils, 
  Calendar, 
  DollarSign, 
  Clock,
  Users,
  MessageCircle,
  ThumbsUp,
  Award,
  CheckCircle,
  ArrowLeft,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface RequestCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface RestaurantRecommendation {
  restaurant_id: number;
  notes?: string;
  dish_recommendations?: string[];
  restaurant?: {
    id: number;
    name: string;
    address?: string;
    city?: string;
    category?: string;
  };
}

interface Response {
  id: string;
  response_text: string;
  restaurant_recommendations: RestaurantRecommendation[];
  upvotes_count: number;
  is_best_answer: boolean;
  is_helpful: boolean;
  created_at: string;
  responder: RequestCreator;
  user_has_upvoted: boolean;
}

interface DiscoveryRequest {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cuisine_type: string | null;
  occasion: string | null;
  budget_range: string | null;
  dietary_restrictions: string[] | null;
  status: 'open' | 'answered' | 'closed';
  response_count: number;
  view_count: number;
  created_at: string;
  creator: RequestCreator;
  is_bookmarked: boolean;
  is_creator: boolean;
}

interface SelectedRestaurant {
  restaurant_id: number;
  restaurant_name: string;
  restaurant_address: string;
  restaurant_city: string;
  notes: string;
}

const RequestDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  const [request, setRequest] = useState<DiscoveryRequest | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Response form state
  const [responseText, setResponseText] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<SelectedRestaurant[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  const requestId = params.id as string;

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      // Track view only once per session
      trackViewOnce();
    }
  }, [requestId, user]);

  // ✅ NEW: Track view count only once per user session
  const trackViewOnce = () => {
    if (typeof window === 'undefined') return;

    // Check if this request has been viewed in this session
    const viewedRequests = sessionStorage.getItem('viewed_requests');
    const viewedSet = viewedRequests ? new Set(JSON.parse(viewedRequests)) : new Set();

    // If not viewed yet, track it
    if (!viewedSet.has(requestId)) {
      viewedSet.add(requestId);
      sessionStorage.setItem('viewed_requests', JSON.stringify(Array.from(viewedSet)));
      
      // Increment view count on backend
      incrementViewCount();
    }
  };

  // ✅ NEW: Increment view count (called only once per session)
  const incrementViewCount = async () => {
    try {
      // This endpoint should already exist or needs to be created
      await fetch(`${API_BASE_URL}/api/discovery/requests/${requestId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`
        }
      });
    } catch (error) {
      console.error('Error tracking view:', error);
      // Silently fail - view counting is not critical
    }
  };

  const fetchRequestDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/discovery/requests/${requestId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();

      if (data.success) {
        setRequest(data.request);
        setResponses(data.responses || []);
      } else {
        throw new Error(data.error || 'Failed to load request');
      }
    } catch (err) {
      console.error('Error fetching request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Handle restaurant selection from inline autocomplete
  const handleRestaurantSelect = async (restaurant: any) => {
    console.log('Restaurant selected:', restaurant);

    // Check if already added
    if (selectedRestaurants.some(r => r.restaurant_id === restaurant.id)) {
      toast.error('Restaurant already added');
      return;
    }

    // Add to selected restaurants - use setTimeout to avoid race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newRestaurant: SelectedRestaurant = {
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      restaurant_address: restaurant.address || '',
      restaurant_city: restaurant.city || '',
      notes: ''
    };

    setSelectedRestaurants(prev => [...prev, newRestaurant]);
    setShowAutocomplete(false);
    toast.success(`${restaurant.name} added!`);
  };

  const removeRestaurant = (restaurantId: number) => {
    setSelectedRestaurants(selectedRestaurants.filter(r => r.restaurant_id !== restaurantId));
  };

  const updateRestaurantNotes = (restaurantId: number, notes: string) => {
    setSelectedRestaurants(selectedRestaurants.map(r =>
      r.restaurant_id === restaurantId ? { ...r, notes } : r
    ));
  };

  const handleSubmitResponse = async () => {
    if (!user) {
      toast.error('Please log in to submit a response');
      return;
    }

    if (!responseText.trim() || responseText.length < 20) {
      toast.error('Response must be at least 20 characters');
      return;
    }

    if (selectedRestaurants.length === 0) {
      toast.error('Please recommend at least one restaurant');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('omeone_auth_token');

      const response = await fetch(`${API_BASE_URL}/api/discovery/requests/${requestId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          response_text: responseText.trim(),
          restaurant_recommendations: selectedRestaurants.map(r => ({
            restaurant_id: r.restaurant_id,
            notes: r.notes.trim() || undefined
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit response');
      }

      toast.success('Response submitted successfully!');
      
      // Reset form
      setResponseText('');
      setSelectedRestaurants([]);
      setShowResponseForm(false);

      // Refresh request details
      await fetchRequestDetails();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (responseId: string) => {
    if (!user) {
      toast.error('Please log in to upvote');
      return;
    }

    try {
      const token = localStorage.getItem('omeone_auth_token');

      const response = await fetch(`${API_BASE_URL}/api/discovery/responses/${responseId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upvote');
      }

      // Update local state
      setResponses(responses.map(r => {
        if (r.id === responseId) {
          return {
            ...r,
            user_has_upvoted: data.action === 'added',
            upvotes_count: data.action === 'added' ? r.upvotes_count + 1 : Math.max(0, r.upvotes_count - 1)
          };
        }
        return r;
      }));

      toast.success(data.action === 'added' ? 'Upvoted!' : 'Upvote removed');
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    }
  };

  const handleMarkBestAnswer = async (responseId: string) => {
    if (!user || !request?.is_creator) {
      toast.error('Only the request creator can mark the best answer');
      return;
    }

    try {
      const token = localStorage.getItem('omeone_auth_token');

      const response = await fetch(`${API_BASE_URL}/api/discovery/requests/${requestId}/best-answer/${responseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark best answer');
      }

      toast.success('Best answer selected!');
      await fetchRequestDetails();
    } catch (error) {
      console.error('Error marking best answer:', error);
      toast.error('Failed to mark best answer');
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-50 border-green-200';
      case 'answered': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'This request does not exist or has been removed.'}</p>
            <button onClick={() => router.push('/discover')} className="btn-primary">
              Back to Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CleanHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/discover')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Discover</span>
        </button>

        {/* Request Card */}
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Discovery Request</span>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                {request.status === 'open' ? '🟢 Open' : request.status === 'answered' ? '✅ Answered' : '🔒 Closed'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>

            {/* Creator Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                {request.creator.avatar_url ? (
                  <Image
                    src={request.creator.avatar_url}
                    alt={request.creator.username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-purple-600 font-semibold">
                    {request.creator.display_name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">{request.creator.display_name || request.creator.username}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={12} />
                  <span>{formatTimeAgo(request.created_at)}</span>
                  {request.creator.reputation_score > 0 && (
                    <>
                      <span>•</span>
                      <Award size={12} />
                      <span>{request.creator.reputation_score} rep</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {request.description && (
              <p className="text-gray-700 leading-relaxed">{request.description}</p>
            )}

            {/* Context Tags */}
            <div className="flex flex-wrap gap-2">
              {request.location && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full font-medium">
                  <MapPin size={14} />
                  {request.location}
                </span>
              )}
              {request.cuisine_type && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-full font-medium">
                  <Utensils size={14} />
                  {request.cuisine_type}
                </span>
              )}
              {request.occasion && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
                  <Calendar size={14} />
                  {request.occasion.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              )}
              {request.budget_range && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full font-medium">
                  <DollarSign size={14} />
                  {request.budget_range}
                </span>
              )}
            </div>

            {/* Dietary Restrictions */}
            {request.dietary_restrictions && request.dietary_restrictions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Dietary Restrictions:</h3>
                <div className="flex flex-wrap gap-2">
                  {request.dietary_restrictions.map((restriction, idx) => (
                    <span key={idx} className="px-2 py-1 bg-pink-50 text-pink-700 text-xs rounded-full">
                      {restriction}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600 pt-4 border-t">
              <div className="flex items-center gap-1">
                <MessageCircle size={16} />
                <span>{request.response_count} responses</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{request.view_count} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Button */}
        {request.status === 'open' && user && !request.is_creator && (
          <div className="mb-6">
            {!showResponseForm ? (
              <button
                onClick={() => setShowResponseForm(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium"
              >
                Submit Your Recommendation
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Your Response</h3>
                  <button
                    onClick={() => {
                      setShowResponseForm(false);
                      setShowAutocomplete(false);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Response Text */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Recommendation
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Share your recommendation and why you think it's perfect for this request..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{responseText.length}/2000 (minimum 20 characters)</p>
                </div>

                {/* ✅ FIXED: Inline Restaurant Autocomplete Section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommended Restaurants *
                  </label>
                  
                  {!showAutocomplete ? (
                    <button
                      onClick={() => setShowAutocomplete(true)}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Utensils size={18} />
                      + Add Restaurant
                    </button>
                  ) : (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-blue-900">
                          Search for a restaurant
                        </h4>
                        <button
                          onClick={() => setShowAutocomplete(false)}
                          className="text-blue-700 hover:text-blue-900 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {/* ✅ Inline Autocomplete - Same as EditListModal */}
                      <RestaurantAutocomplete
                        onSelect={handleRestaurantSelect}
                        placeholder="Type restaurant name (e.g., Dom Francisco)"
                        userLocation={{ latitude: -15.7934, longitude: -47.8823 }}
                      />
                      
                      <p className="mt-2 text-xs text-blue-700">
                        Start typing to search. Select from suggestions to add to your response.
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Restaurants */}
                {selectedRestaurants.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Selected Restaurants ({selectedRestaurants.length})
                    </h4>
                    {selectedRestaurants.map((restaurant) => (
                      <div key={restaurant.restaurant_id} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 block">{restaurant.restaurant_name}</span>
                            {restaurant.restaurant_address && (
                              <span className="text-sm text-gray-500">{restaurant.restaurant_address}</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeRestaurant(restaurant.restaurant_id)}
                            className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            title="Remove restaurant"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={restaurant.notes}
                          onChange={(e) => updateRestaurantNotes(restaurant.restaurant_id, e.target.value)}
                          placeholder="Optional: Add notes about this recommendation..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting || responseText.length < 20 || selectedRestaurants.length === 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Response'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Responses Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            {responses.length} Response{responses.length !== 1 ? 's' : ''}
          </h2>

          {responses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No responses yet. Be the first to help!</p>
            </div>
          ) : (
            responses.map((response) => (
              <div key={response.id} className={`bg-white rounded-xl border shadow-sm p-6 ${response.is_best_answer ? 'border-green-400 bg-green-50/30' : 'border-gray-200'}`}>
                {/* Best Answer Badge */}
                {response.is_best_answer && (
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-4 pb-4 border-b border-green-200">
                    <CheckCircle size={20} className="fill-green-700" />
                    <span>Best Answer</span>
                  </div>
                )}

                {/* Responder Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100">
                      {response.responder.avatar_url ? (
                        <Image
                          src={response.responder.avatar_url}
                          alt={response.responder.username}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-purple-600 font-semibold">
                          {response.responder.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{response.responder.display_name || response.responder.username}</div>
                      <div className="text-sm text-gray-500">{formatTimeAgo(response.created_at)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpvote(response.id)}
                      disabled={!user}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                        response.user_has_upvoted
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ThumbsUp size={14} fill={response.user_has_upvoted ? 'currentColor' : 'none'} />
                      <span className="text-sm font-medium">{response.upvotes_count}</span>
                    </button>

                    {request.is_creator && !response.is_best_answer && request.status === 'open' && (
                      <button
                        onClick={() => handleMarkBestAnswer(response.id)}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Mark as Best
                      </button>
                    )}
                  </div>
                </div>

                {/* Response Text */}
                <p className="text-gray-700 mb-4 leading-relaxed">{response.response_text}</p>

                {/* Restaurant Recommendations */}
                {response.restaurant_recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recommended Restaurants:</h4>
                    {response.restaurant_recommendations.map((rec, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-gray-900">{rec.restaurant?.name || `Restaurant ${rec.restaurant_id}`}</div>
                        {rec.restaurant?.city && (
                          <div className="text-sm text-gray-500">{rec.restaurant.city}</div>
                        )}
                        {rec.notes && (
                          <p className="text-sm text-gray-600 mt-1">{rec.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;