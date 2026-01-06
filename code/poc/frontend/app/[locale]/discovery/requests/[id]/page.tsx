// File: app/[locale]/discovery/requests/[id]/page.tsx
// Discovery Request Detail Page - Updated with Restaurant Selection
// Features: Full request view, responses list, response submission with restaurant linking, upvotes, best answer

"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft,
  HelpCircle,
  MapPin,
  Utensils,
  Calendar,
  DollarSign,
  Clock,
  MessageCircle,
  Users,
  ThumbsUp,
  Award,
  CheckCircle,
  Send,
  Loader2,
  AlertCircle,
  Bookmark,
  Share2,
  Flag,
  Star,
  ExternalLink,
  Search,
  X,
  Store
} from 'lucide-react';
import { useTranslations, useFormatter } from 'next-intl';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import CleanHeader from '@/components/CleanHeader';

// BocaBoca Brand Colors
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
};

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface RestaurantRecommendation {
  id?: string;
  name: string;
  address?: string;
  cuisine_type?: string;
  google_place_id?: string;
}

interface DiscoveryResponse {
  id: string;
  request_id: string;
  responder_id: string;
  response_text: string;
  restaurant_recommendations: RestaurantRecommendation[];
  upvotes_count: number;
  tips_received: number;
  is_best_answer: boolean;
  is_helpful: boolean;
  created_at: string;
  updated_at: string;
  responder: User;
  user_has_upvoted?: boolean;
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
  bounty_amount: number;
  bounty_status: string;
  status: 'open' | 'answered' | 'closed';
  best_answer_id: string | null;
  response_count: number;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  closed_at: string | null;
  creator: User;
  responses: DiscoveryResponse[];
  is_bookmarked?: boolean;
}

// Restaurant search result from autocomplete
interface RestaurantSearchResult {
  place_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

// Selected restaurant for response
interface SelectedRestaurant {
  restaurant_id: number;
  name: string;
  address?: string;
  place_id?: string;
  notes?: string;
  dish_recommendations?: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

// Default coordinates (São Paulo) - used when geolocation unavailable
const DEFAULT_COORDS = { lat: -23.5505, lng: -46.6333 };

export default function DiscoveryRequestDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const t = useTranslations();
  const format = useFormatter();
  const requestId = params?.id as string;

  const [request, setRequest] = useState<DiscoveryRequest | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Response form state
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  
  // Restaurant search state
  const [selectedRestaurants, setSelectedRestaurants] = useState<SelectedRestaurant[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userCoords, setUserCoords] = useState(DEFAULT_COORDS);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Keep default coords if geolocation denied
          console.log('Geolocation denied, using default coordinates');
        }
      );
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track view count (prevent duplicates per session)
  useEffect(() => {
    if (requestId) {
      const viewedKey = `request_viewed_${requestId}`;
      if (!sessionStorage.getItem(viewedKey)) {
        // Record view
        fetch(`${API_BASE_URL}/discovery/requests/${requestId}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(console.error);
        sessionStorage.setItem(viewedKey, 'true');
      }
    }
  }, [requestId]);

  // Fetch request data
  const fetchRequest = useCallback(async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request not found');
        }
        throw new Error('Failed to load request');
      }

      const data = await response.json();
      setRequest(data.request);
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  // Fetch current user
  useEffect(() => {
    const token = localStorage.getItem('omeone_auth_token');
    if (token) {
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setCurrentUser(data.user);
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Restaurant autocomplete search
  const searchRestaurants = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/restaurants/autocomplete?input=${encodeURIComponent(query)}&lat=${userCoords.lat}&lng=${userCoords.lng}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.suggestions) {
          setSearchResults(data.suggestions);
          setShowSearchResults(true);
        }
      }
    } catch (err) {
      console.error('Restaurant search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [userCoords]);

  // Debounced search
  const handleSearchInputChange = (value: string) => {
    setRestaurantSearch(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchRestaurants(value);
    }, 300);
  };

  // Add restaurant to selection
  const handleSelectRestaurant = async (result: RestaurantSearchResult) => {
    console.log('Selected restaurant result:', result);
    console.log('Available keys:', Object.keys(result));
  
    // Get place_id from various possible property names
    const placeId = result.place_id || (result as any).placeId || (result as any).google_place_id || (result as any).id;
  
    // Check if already selected
    const existingPlaceId = placeId || result.name; // fallback to name if no place_id
    if (selectedRestaurants.some(r => (r.place_id || r.name) === existingPlaceId)) {
      toast.error(t('discovery.detail.restaurantAlreadyAdded') || 'Restaurant already added');
      return;
    }

    // Check max limit
    if (selectedRestaurants.length >= 10) {
      toast.error(t('discovery.detail.maxRestaurantsReached') || 'Maximum 10 restaurants allowed');
      return;
    }

    // Check if restaurant already has a database ID (meaning it's already in our system)
    const existingDbId = (result as any).restaurant_id || (result as any).db_id || (result as any).id;
  
    // If the result already has a numeric database ID, use it directly
    if (typeof existingDbId === 'number' && existingDbId > 0) {
      const newRestaurant: SelectedRestaurant = {
        restaurant_id: existingDbId,
        name: result.name,
        address: result.address,
        place_id: placeId,
        notes: ''
      };
      setSelectedRestaurants(prev => [...prev, newRestaurant]);
      setRestaurantSearch('');
      setSearchResults([]);
      setShowSearchResults(false);
      toast.success(t('discovery.detail.restaurantAdded') || 'Restaurant added');
      return;
    }

    // Extract city from address (e.g., "Asa Sul, Brasília - DF, Brasil" → "Brasília")
    const extractCity = (address: string | undefined): string => {
      if (!address) return 'São Paulo'; // fallback
    
      // Try to find city pattern: "City - State" or ", City -"
      const patterns = [
        /,\s*([^,-]+)\s*-\s*[A-Z]{2}\s*,/i,  // ", Brasília - DF,"
        /,\s*([^,-]+)\s*-\s*[A-Z]{2}$/i,      // ", Brasília - DF" at end
        /,\s*([^,]+),\s*[^,]+$/,               // second to last segment
      ];
    
      for (const pattern of patterns) {
        const match = address.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    
      return 'São Paulo'; // fallback if no pattern matches
    };

    // Only call from-external if we have a place_id
    if (!placeId) {
      console.error('No place_id found in result:', result);
      toast.error('Unable to identify restaurant. Please try another.');
      return;
    }

    // Create the restaurant in our database from the external place
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const city = extractCity(result.address);
    
      const requestBody = {
        external_id: placeId,
        name: result.name,
        address: result.address,
        city: city,
        lat: result.latitude || (result as any).lat,
        lng: result.longitude || (result as any).lng || (result as any).lon
      };
    
      console.log('Sending to from-external:', requestBody);
    
      const createResponse = await fetch(`${API_BASE_URL}/restaurants/from-external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(requestBody)
      });

      const data = await createResponse.json();
      console.log('from-external response:', data);

      if (createResponse.ok && data.restaurant) {
        const newRestaurant: SelectedRestaurant = {
          restaurant_id: data.restaurant.id,
          name: result.name,
          address: result.address,
          place_id: placeId,
          notes: ''
        };
        setSelectedRestaurants(prev => [...prev, newRestaurant]);
        toast.success(t('discovery.detail.restaurantAdded') || 'Restaurant added');
      } else {
        // Log the error for debugging
        console.error('from-external failed:', data);
        toast.error(data.error || 'Unable to link restaurant. Please try again.');
      }
    } catch (err) {
      console.error('Error creating restaurant:', err);
      toast.error('Unable to link restaurant. Please try again.');
    }

    setRestaurantSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Remove restaurant from selection
  const handleRemoveRestaurant = (index: number) => {
    setSelectedRestaurants(prev => prev.filter((_, i) => i !== index));
  };

  // Update restaurant notes
  const handleUpdateNotes = (index: number, notes: string) => {
    setSelectedRestaurants(prev => prev.map((r, i) => 
      i === index ? { ...r, notes } : r
    ));
  };

  // Handle upvote
  const handleUpvote = async (responseId: string) => {
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      toast.error(t('discovery.detail.loginToUpvote'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/discovery/responses/${responseId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upvote');
      }

      // Refresh data
      fetchRequest();
      toast.success(t('discovery.detail.upvoteSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upvote');
    }
  };

  // Handle mark as best answer
  const handleMarkBestAnswer = async (responseId: string) => {
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/discovery/responses/${responseId}/best-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as best answer');
      }

      fetchRequest();
      toast.success(t('discovery.detail.bestAnswerSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as best answer');
    }
  };

  // Handle submit response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      toast.error(t('discovery.detail.loginToRespond'));
      return;
    }

    if (!responseText.trim() || responseText.length < 20) {
      toast.error(t('discovery.detail.responseTooShort'));
      return;
    }

    if (selectedRestaurants.length === 0) {
      toast.error(t('discovery.detail.selectAtLeastOneRestaurant') || 'Please select at least one restaurant');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format restaurant recommendations for API
      const restaurant_recommendations = selectedRestaurants
        .filter(r => r.restaurant_id > 0) // Only include restaurants with valid IDs
        .map(r => ({
          restaurant_id: r.restaurant_id,
          notes: r.notes || undefined,
          dish_recommendations: r.dish_recommendations || undefined
        }));

      // If no valid restaurant IDs, show error
      if (restaurant_recommendations.length === 0) {
        toast.error('Unable to link restaurants. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          response_text: responseText.trim(),
          restaurant_recommendations
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit response');
      }

      // Reset form
      setResponseText('');
      setSelectedRestaurants([]);
      setShowResponseForm(false);
      fetchRequest();
      toast.success(t('discovery.detail.responseSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bookmark
  const handleBookmark = async () => {
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      toast.error(t('discovery.detail.loginToBookmark'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}/bookmark`, {
        method: request?.is_bookmarked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchRequest();
        toast.success(request?.is_bookmarked ? t('discovery.detail.unbookmarked') : t('discovery.detail.bookmarked'));
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  // Format helpers
  const formatTimeAgo = (date: string) => {
    return format.relativeTime(new Date(date), new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'answered': return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'closed': return 'text-stone-600 bg-stone-100 border-stone-300';
      default: return 'text-stone-600 bg-stone-100 border-stone-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return t('discovery.status.open');
      case 'answered': return t('discovery.status.answered');
      case 'closed': return t('discovery.status.closed');
      default: return status;
    }
  };

  const getOccasionDisplay = (occasion: string | null) => {
    if (!occasion) return null;
    return occasion.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isCreator = currentUser?.id === request?.creator?.id;
  const canRespond = request?.status === 'open' && currentUser && !isCreator;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1]/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF644A]" />
          <p className="text-stone-600">{t('discovery.detail.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#FFF4E1]/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-[#E65441] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1F1E2A] mb-2">
            {t('discovery.detail.error.title')}
          </h2>
          <p className="text-stone-600 mb-6">{error || t('discovery.detail.error.notFound')}</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors"
          >
            <ArrowLeft size={16} />
            {t('discovery.detail.backToDiscover')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4E1]/30">
      <CleanHeader />
      {/* Header - BocaBoca Coral Gradient */}
      <header className="z-40 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">{t('discovery.detail.back')}</span>
            </button>

            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleBookmark}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  request.is_bookmarked 
                    ? "bg-white/20 text-white" 
                    : "hover:bg-white/10 text-white/80"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={20} fill={request.is_bookmarked ? "currentColor" : "none"} />
              </motion.button>
              
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80">
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Request Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm"
        >
          {/* Request Header */}
          <div className="bg-gradient-to-r from-[#FF644A] to-[#E65441] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">{t('discovery.detail.requestLabel')}</span>
              </div>
              <span className={cn(
                "px-3 py-1 text-sm font-medium rounded-full border",
                getStatusColor(request.status)
              )}>
                {getStatusText(request.status)}
              </span>
            </div>
          </div>

          {/* Request Content */}
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold text-[#1F1E2A]">{request.title}</h1>
            
            {request.description && (
              <p className="text-stone-600 leading-relaxed">{request.description}</p>
            )}

            {/* Context Tags */}
            <div className="flex flex-wrap gap-2">
              {request.location && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF4E1] text-[#FF644A] text-sm rounded-full font-medium">
                  <MapPin size={14} />
                  {request.location}
                </span>
              )}
              {request.cuisine_type && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-full font-medium">
                  <Utensils size={14} />
                  {request.cuisine_type}
                </span>
              )}
              {request.occasion && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 text-sm rounded-full font-medium">
                  <Calendar size={14} />
                  {getOccasionDisplay(request.occasion)}
                </span>
              )}
              {request.budget_range && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-full font-medium">
                  <DollarSign size={14} />
                  {request.budget_range}
                </span>
              )}
              {request.dietary_restrictions && request.dietary_restrictions.map((restriction, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm rounded-full font-medium">
                  {restriction}
                </span>
              ))}
            </div>

            {/* Creator Info */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFF4E1]">
                  {request.creator.avatar_url ? (
                    <Image
                      src={request.creator.avatar_url}
                      alt={request.creator.username}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg text-[#FF644A] font-semibold">
                      {request.creator.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-[#1F1E2A]">
                    {request.creator.display_name || request.creator.username}
                  </p>
                  {request.creator.reputation_score > 0 && (
                    <div className="flex items-center gap-1 text-xs text-stone-500">
                      <Award size={12} />
                      <span>{t('discovery.detail.reputation', { score: request.creator.reputation_score })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-stone-500">
                <div className="flex items-center gap-1">
                  <MessageCircle size={14} />
                  <span>{request.response_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{request.view_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{formatTimeAgo(request.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add Response Button (for non-creators when request is open) */}
        {canRespond && !showResponseForm && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowResponseForm(true)}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-xl hover:from-[#E65441] hover:to-[#d14a38] transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageCircle size={20} />
            {t('discovery.detail.addResponse')}
          </motion.button>
        )}

        {/* Response Form */}
        <AnimatePresence>
          {showResponseForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm"
            >
              <div className="bg-[#FFF4E1] px-6 py-3 border-b border-stone-200">
                <h3 className="font-semibold text-[#1F1E2A]">{t('discovery.detail.yourResponse')}</h3>
              </div>
              
              <form onSubmit={handleSubmitResponse} className="p-6 space-y-6">
                {/* Response Text */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#1F1E2A]">
                    {t('discovery.detail.yourRecommendation') || 'Your Recommendation'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={t('discovery.detail.responsePlaceholder')}
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent resize-none transition-shadow"
                    rows={4}
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-stone-500 text-right">
                    {responseText.length}/2000 {t('discovery.detail.characters')}
                  </p>
                </div>

                {/* Restaurant Search Section */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#1F1E2A]">
                    <Store className="inline w-4 h-4 mr-1.5" />
                    {t('discovery.detail.recommendRestaurants') || 'Recommend Restaurants'}
                    <span className="text-stone-500 font-normal ml-1">
                      ({selectedRestaurants.length}/10)
                    </span>
                  </label>
                  
                  {/* Search Input */}
                  <div ref={searchContainerRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <input
                        type="text"
                        value={restaurantSearch}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                        placeholder={t('discovery.detail.searchRestaurantPlaceholder') || 'Search for a restaurant...'}
                        className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
                        disabled={selectedRestaurants.length >= 10}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FF644A] animate-spin" />
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                      {showSearchResults && searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {searchResults.map((result, idx) => (
                            <button
                              key={result.place_id || idx}
                              type="button"
                              onClick={() => handleSelectRestaurant(result)}
                              className="w-full px-4 py-3 text-left hover:bg-[#FFF4E1] transition-colors border-b border-stone-100 last:border-b-0"
                            >
                              <div className="font-medium text-[#1F1E2A]">{result.name}</div>
                              {result.address && (
                                <div className="text-sm text-stone-500 flex items-center gap-1 mt-0.5">
                                  <MapPin size={12} />
                                  {result.address}
                                </div>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selected Restaurants */}
                  {selectedRestaurants.length > 0 && (
                    <div className="space-y-3">
                      {selectedRestaurants.map((restaurant, idx) => (
                        <motion.div
                          key={restaurant.place_id || idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-[#FFF4E1]/50 border border-[#FF644A]/20 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-[#FF644A]" />
                                <span className="font-medium text-[#1F1E2A]">{restaurant.name}</span>
                              </div>
                              {restaurant.address && (
                                <p className="text-sm text-stone-500 mt-1 ml-6">{restaurant.address}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRestaurant(idx)}
                              className="p-1.5 text-stone-400 hover:text-[#E65441] hover:bg-white rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* Notes for this restaurant */}
                          <div className="mt-3 ml-6">
                            <input
                              type="text"
                              value={restaurant.notes || ''}
                              onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                              placeholder={t('discovery.detail.restaurantNotesPlaceholder') || 'Add a note (e.g., "Try the carbonara!")'}
                              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent bg-white"
                              maxLength={200}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Help text */}
                  {selectedRestaurants.length === 0 && (
                    <p className="text-sm text-stone-500">
                      {t('discovery.detail.searchRestaurantHelp') || 'Search and add at least one restaurant to recommend'}
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <div className="text-sm text-stone-500">
                    {selectedRestaurants.length === 0 && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {t('discovery.detail.selectRestaurantRequired') || 'At least 1 restaurant required'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseForm(false);
                        setSelectedRestaurants([]);
                        setResponseText('');
                      }}
                      className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      {t('discovery.detail.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || responseText.length < 20 || selectedRestaurants.length === 0}
                      className="px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('discovery.detail.submitting')}
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          {t('discovery.detail.submit')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Responses Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1F1E2A] flex items-center gap-2">
            <MessageCircle size={20} className="text-[#FF644A]" />
            {t('discovery.detail.responses', { count: responses.length || request.response_count })}
          </h2>

          {responses && responses.length > 0 ? (
            <div className="space-y-4">
              {responses.map((response) => (
                <motion.div
                  key={response.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white rounded-xl border overflow-hidden shadow-sm",
                    response.is_best_answer 
                      ? "border-[#FF644A] ring-2 ring-[#FF644A]/20" 
                      : "border-stone-200"
                  )}
                >
                  {/* Best Answer Badge */}
                  {response.is_best_answer && (
                    <div className="bg-gradient-to-r from-[#FF644A] to-[#E65441] px-4 py-2 flex items-center gap-2 text-white">
                      <CheckCircle size={16} />
                      <span className="font-medium text-sm">{t('discovery.detail.bestAnswer')}</span>
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    {/* Responder Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FFF4E1]">
                          {response.responder.avatar_url ? (
                            <Image
                              src={response.responder.avatar_url}
                              alt={response.responder.username}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-[#FF644A] font-semibold">
                              {response.responder.display_name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[#1F1E2A] text-sm">
                            {response.responder.display_name || response.responder.username}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatTimeAgo(response.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Mark as Best Answer (only for creator) */}
                      {isCreator && request.status === 'open' && !response.is_best_answer && (
                        <button
                          onClick={() => handleMarkBestAnswer(response.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#FF644A] hover:bg-[#FFF4E1] rounded-lg transition-colors"
                        >
                          <Star size={14} />
                          {t('discovery.detail.markBest')}
                        </button>
                      )}
                    </div>

                    {/* Response Text */}
                    <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                      {response.response_text}
                    </p>

                    {/* Restaurant Recommendations */}
                    {response.restaurant_recommendations && response.restaurant_recommendations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#1F1E2A]">
                          {t('discovery.detail.recommendedPlaces')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {response.restaurant_recommendations.map((rec, idx) => (
                            <Link 
                              key={idx}
                              href={`/${locale}/restaurant/${rec.restaurant?.id || rec.restaurant_id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF4E1] text-[#FF644A] text-sm rounded-lg font-medium hover:bg-[#FFE8C8] transition-colors cursor-pointer"
                            >
                            <Utensils size={12} />
                            {rec.restaurant?.name || rec.name}
                            <ExternalLink size={10} className="ml-1 opacity-60" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <div className="flex items-center gap-4">
                        {/* Upvote Button */}
                        <motion.button
                          onClick={() => handleUpvote(response.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm",
                            response.user_has_upvoted
                              ? "bg-[#FFF4E1] text-[#FF644A]"
                              : "text-stone-500 hover:text-[#FF644A] hover:bg-[#FFF4E1]"
                          )}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ThumbsUp size={14} fill={response.user_has_upvoted ? "currentColor" : "none"} />
                          <span>{response.upvotes_count}</span>
                        </motion.button>

                        {/* Helpful Badge */}
                        {response.is_helpful && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-[#BFE2D9] text-emerald-800 text-xs rounded-full">
                            <CheckCircle size={12} />
                            {t('discovery.detail.helpful')}
                          </span>
                        )}
                      </div>

                      {/* Report Button */}
                      <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg transition-colors">
                        <Flag size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600 mb-4">{t('discovery.detail.noResponses')}</p>
              {canRespond && (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors"
                >
                  <MessageCircle size={16} />
                  {t('discovery.detail.beFirst')}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}