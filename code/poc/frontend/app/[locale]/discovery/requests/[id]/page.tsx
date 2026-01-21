// File: code/poc/frontend/app/[locale]/discovery/requests/[id]/page.tsx
// Discovery Request Detail Page - COMPLETE FIXED VERSION
// UPDATED: Dark mode support added
// UPDATED: Fixed translation namespace from 'discovery' to 'discover'
// UPDATED: Full i18n for all hardcoded strings
// All issues resolved: translations, autocomplete, amber colors, response submission

"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Trophy,
  Gift,
  Flame,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ExternalLink,
  Star,
  Send,
  Search,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  Award,
  X,
  Plus,
  Check
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations, useLocale } from 'next-intl';
import { formatRelativeTime, formatDistanceToNowLocalized } from '@/lib/utils/dateLocale';

// Import CleanHeader for BocaBoca navigation
import CleanHeader from '@/components/CleanHeader';

// Import modular components
import AwardBountyModal from '@/components/discover/AwardBountyModal';
import TipResponseModal from '@/components/discover/TipResponseModal';
import ResponseCard from '@/components/discover/ResponseCard';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

// Constants
const MAX_RESTAURANTS_PER_RESPONSE = 5;
const DEFAULT_LAT = -15.7942;
const DEFAULT_LNG = -47.8822;

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string | null;
  location: string | null;
  image_url?: string | null;
  address?: string;
  external_id?: string;
}

interface Recommendation {
  id: string;
  title: string;
  restaurant: Restaurant;
}

export interface DiscoveryResponse {
  id: string;
  comment: string | null;
  created_at: string;
  is_winner: boolean;
  tokens_earned: number;
  upvotes: number;
  is_best_answer: boolean;
  responder: User;
  recommendation: Recommendation;
  user_has_upvoted?: boolean;
}

interface DiscoveryRequest {
  id: string;
  title: string;
  description: string;
  location: string | null;
  cuisine_preferences: string[] | null;
  occasion: string | null;
  budget_range: string | null;
  created_at: string;
  expires_at: string;
  status: 'open' | 'closed' | 'expired';
  stake_amount: number;
  bounty_amount?: number;
  bounty_status: 'pending' | 'awarded' | 'refunded' | 'expired';
  response_count: number;
  view_count: number;
  creator: User;
  responses: DiscoveryResponse[];
  winning_restaurant_id: string | null;
  is_bookmarked?: boolean;
}

interface RestaurantSearchResult {
  id: string | null;
  name: string;
  address?: string;
  cuisine_type?: string;
  external_id?: string;
  is_existing?: boolean;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const StatusBadge: React.FC<{ status: string; type?: 'request' | 'bounty'; t: any }> = ({ status, type = 'request', t }) => {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; labelKey: string }> = {
    open: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: <CheckCircle2 size={14} />, labelKey: 'status.open' },
    closed: { bg: 'bg-stone-100 dark:bg-stone-800/50', text: 'text-stone-600 dark:text-stone-400', icon: <XCircle size={14} />, labelKey: 'status.closed' },
    expired: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: <Timer size={14} />, labelKey: 'status.expired' },
    pending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: <Clock size={14} />, labelKey: 'detail.bountyStatus.active' },
    awarded: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: <Trophy size={14} />, labelKey: 'detail.bountyStatus.awarded' },
    refunded: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: <RefreshCw size={14} />, labelKey: 'detail.bountyStatus.refunded' },
  };

  // For bounty type, treat 'open' same as 'pending'
  const effectiveStatus = type === 'bounty' && status === 'open' ? 'pending' : status;
  const config = configs[effectiveStatus] || configs.pending;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
      config?.bg, config?.text
    )}>
      {config?.icon}
      {t(config?.labelKey ?? "") || status}
    </span>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuth();
  // FIXED: Changed from 'discovery' to 'discover' to match translation file
  const t = useTranslations('discover');
  const locale = useLocale();
  const requestId = params.id as string;

  // State
  const [request, setRequest] = useState<DiscoveryRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedResponseForTip, setSelectedResponseForTip] = useState<DiscoveryResponse | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [responseText, setResponseText] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<RestaurantSearchResult[]>([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isCreator = user?.id === request?.creator.id;
  
  // Determine bounty status - API may return 'open' or 'pending' for active bounties
  const effectiveBountyStatus = useMemo(() => {
    if (!request) return 'pending';
    
    // If bounty_status is explicitly set, use it
    if (request.bounty_status) return request.bounty_status;
    
    // Fallback: infer from request status and stake
    const hasStake = (request.stake_amount || request.bounty_amount || 0) > 0;
    if (!hasStake) return 'none';
    
    if (request.status === 'closed' && request.winning_restaurant_id) return 'awarded';
    if (request.status === 'expired') return 'expired';
    if (request.status === 'open') return 'pending';
    
    return 'pending';
  }, [request]);
  
  // Check if bounty can be awarded - accepts both 'open' and 'pending' as valid statuses
  const isBountyAwaitingAward = 
    ['pending', 'open'].includes(effectiveBountyStatus) || 
    (request?.status === 'expired' && !['awarded', 'refunded'].includes(effectiveBountyStatus));
  
  // Debug logging for award button visibility
  useEffect(() => {
    if (request && user) {
      console.log('[Award Debug] User ID:', user.id);
      console.log('[Award Debug] Creator ID:', request.creator.id);
      console.log('[Award Debug] Is Creator:', user.id === request.creator.id);
      console.log('[Award Debug] Request Status:', request.status);
      console.log('[Award Debug] Bounty Status (raw):', request.bounty_status);
      console.log('[Award Debug] Bounty Status (effective):', effectiveBountyStatus);
      console.log('[Award Debug] Is Bounty Awaiting Award:', isBountyAwaitingAward);
      console.log('[Award Debug] Response Count:', request.responses?.length);
      console.log('[Award Debug] Stake Amount:', request.stake_amount || request.bounty_amount);
      console.log('[Award Debug] canAward:', isCreator && isBountyAwaitingAward && (request.responses?.length ?? 0) > 0);
    }
  }, [request, user, effectiveBountyStatus, isBountyAwaitingAward, isCreator]);

  const canAward = isCreator && isBountyAwaitingAward && (request?.responses?.length ?? 0) > 0;
  const canRefund = isCreator && isBountyAwaitingAward && request?.status === 'expired';
  const canTip = isCreator && effectiveBountyStatus === 'awarded';
  const canRespond = isAuthenticated && !isCreator && request?.status === 'open';
  const hasUserResponded = request?.responses?.some(r => r.responder.id === user?.id);

  // Computed bounty values
  const stakeAmount = request?.stake_amount || request?.bounty_amount || 0;
  const hasBounty = stakeAmount > 0;
  const winnerEarnings = stakeAmount * 0.9;

  // Auth headers helper
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Header color based on status
  const getHeaderColorClass = () => {
    if (request?.status === 'open' && hasBounty) {
      return "bg-gradient-to-r from-amber-500 to-orange-500";
    } else if (request?.status === 'open') {
      return "bg-gradient-to-r from-[#FF644A] to-[#E65441]";
    } else if (request?.bounty_status === 'awarded') {
      return "bg-gradient-to-r from-[#BFE2D9] to-[#9DD4C5]";
    } else {
      return "bg-gradient-to-r from-stone-400 to-stone-500 dark:from-stone-600 dark:to-stone-700";
    }
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch request');
      }

      const data = await response.json();
      console.log('Fetched request data:', data);
      
      const rawResponses = data.responses || (data.request || data)?.responses || [];
      
      const normalizedResponses = rawResponses.map((r: any) => ({
        ...r,
        recommendation: r.recommendation || (r.restaurant_recommendations?.[0] ? {
          id: r.restaurant_recommendations[0].restaurant_id,
          restaurant: r.restaurant_recommendations[0].restaurant || {
            id: r.restaurant_recommendations[0].restaurant_id,
            name: 'Restaurant'
          }
        } : null),
        restaurant_recommendations: r.restaurant_recommendations,
        upvotes: r.upvotes_count || r.upvotes || 0,
        tokens_earned: r.tips_received || r.tokens_earned || 0,
        comment: r.response_text || r.comment,
      }));
      
      const normalizedRequest = {
        ...(data.request || data),
        responses: normalizedResponses,
      };
      
      console.log('Normalized request with responses:', normalizedRequest.responses?.length);
      setRequest(normalizedRequest);
    } catch (err) {
      console.error('Error fetching request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, getAuthHeaders]);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.user?.tokens_earned || data.tokens_earned || 0);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [isAuthenticated, token, getAuthHeaders]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  useEffect(() => {
    if (canTip) {
      fetchBalance();
    }
  }, [canTip, fetchBalance]);

  // ============================================================================
  // RESTAURANT SEARCH
  // ============================================================================

  const searchRestaurants = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/restaurants/autocomplete?input=${encodeURIComponent(query)}&lat=${DEFAULT_LAT}&lng=${DEFAULT_LNG}`,
        {
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Autocomplete raw response:', data);

        const mappedResults = (data.suggestions || []).map((s: any) => {
          const externalId = s.place_id || s.placeId || s.external_id || s.externalId || s.google_place_id || s.id;
          return {
            id: s.restaurant_id ? String(s.restaurant_id) : null,
            external_id: externalId,
            name: s.name,
            address: s.address || s.formatted_address,
            cuisine_type: s.cuisine_type || s.categories?.[0],
            is_existing: s.exists_in_db === true || !!s.restaurant_id,
          };
        });

        console.log('Mapped results:', mappedResults);
        setSearchResults(mappedResults);
      }
    } catch (err) {
      console.error('Restaurant search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (restaurantSearch.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchRestaurants(restaurantSearch);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [restaurantSearch, searchRestaurants]);

  // ============================================================================
  // RESPONSE HANDLERS
  // ============================================================================

  const selectRestaurant = (restaurant: RestaurantSearchResult) => {
    if (selectedRestaurants.length >= MAX_RESTAURANTS_PER_RESPONSE) return;
    if (!selectedRestaurants.find(r => r.id === restaurant.id || r.external_id === restaurant.external_id)) {
      setSelectedRestaurants(prev => [...prev, restaurant]);
    }
    setRestaurantSearch('');
    setSearchResults([]);
  };

  const removeRestaurant = (id: string) => {
    setSelectedRestaurants(prev => prev.filter(r => r.id !== id && r.external_id !== id));
  };

  // ============================================================================
  // SUBMIT RESPONSE
  // ============================================================================

  const handleSubmitResponse = async () => {
    if (selectedRestaurants.length === 0) return;

    setIsSubmittingResponse(true);
    
    try {
      const restaurantIds: number[] = [];
      
      for (const restaurant of selectedRestaurants) {
        console.log('Processing restaurant:', restaurant);
        
        if (restaurant.is_existing && restaurant.id) {
          const numId = parseInt(restaurant.id, 10);
          if (!isNaN(numId)) {
            console.log('Using existing restaurant ID:', numId);
            restaurantIds.push(numId);
            continue;
          }
        }
        
        if (restaurant.external_id) {
          console.log('Creating restaurant from external ID:', restaurant.external_id);
          
          const createResponse = await fetch(`${API_BASE_URL}/restaurants/from-external`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              external_id: restaurant.external_id,
              city: request?.location || undefined,
            }),
          });

          if (createResponse.ok) {
            const data = await createResponse.json();
            console.log('Created restaurant data:', data);
            const newId = data.restaurant?.id;
            if (newId !== undefined && newId !== null) {
              const numId = typeof newId === 'string' ? parseInt(newId, 10) : newId;
              if (!isNaN(numId)) {
                restaurantIds.push(numId);
              }
            }
          } else {
            const errorData = await createResponse.json().catch(() => ({}));
            console.error('Failed to create restaurant:', createResponse.status, errorData);
          }
        }
      }

      console.log('Final restaurant IDs:', restaurantIds);

      if (restaurantIds.length === 0) {
        alert(t('detail.errors.restaurantProcessFailed') || 'Could not process restaurants. Please try selecting a different restaurant.');
        setIsSubmittingResponse(false);
        return;
      }

      const requestBody = {
        response_text: responseText.trim() || '',
        restaurant_recommendations: restaurantIds.map(id => ({
          restaurant_id: id
        }))
      };

      console.log('=== SUBMITTING REQUEST ===');
      console.log('Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}/responses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit response');
      }

      setResponseText('');
      setSelectedRestaurants([]);
      setShowResponseForm(false);
      await fetchRequest();
      
    } catch (err) {
      console.error('Error in handleSubmitResponse:', err);
      alert(err instanceof Error ? err.message : t('detail.errors.submitFailed') || 'Failed to submit response');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // ============================================================================
  // OTHER HANDLERS
  // ============================================================================

  const handleUpvote = async (responseId: string) => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`${API_BASE_URL}/discovery/responses/${responseId}/upvote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        setRequest(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            responses: prev.responses.map(r => 
              r.id === responseId ? { ...r, upvotes: r.upvotes + 1, user_has_upvoted: true } : r
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleMarkBestAnswer = async (responseId: string) => {
    if (!isCreator) return;
    try {
      const response = await fetch(`${API_BASE_URL}/discovery/responses/${responseId}/best-answer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        await fetchRequest();
      }
    } catch (err) {
      console.error('Failed to mark best answer:', err);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) return;
    setIsBookmarking(true);
    try {
      const method = request?.is_bookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`${API_BASE_URL}/discovery/requests/${requestId}/bookmark`, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        setRequest(prev => prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : prev);
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleAward = async (restaurantId: string, firstResponseId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bounty/award`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ 
          bounty_id: requestId,
          restaurant_id: restaurantId 
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to award bounty');
      }
      await fetchRequest();
      setShowAwardModal(false);
    } catch (err) {
      throw err;
    }
  };

  const handleTip = async (responseId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bounty/tip`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ 
          bounty_id: requestId,
          response_id: responseId, 
          amount 
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send tip');
      }
      setUserBalance(prev => prev - amount);
      setShowTipModal(false);
      setSelectedResponseForTip(null);
    } catch (err) {
      throw err;
    }
  };

  const handleRefund = async () => {
    setIsRefunding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bounty/refund`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ bounty_id: requestId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to refund bounty');
      }
      await fetchRequest();
      setShowRefundDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund');
    } finally {
      setIsRefunding(false);
    }
  };

  const openTipModal = (response: DiscoveryResponse) => {
    setSelectedResponseForTip(response);
    setShowTipModal(true);
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF644A] mx-auto mb-4" />
            <p className="text-stone-600 dark:text-gray-400">{t('detail.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1F1E2A] dark:text-white mb-2">
              {t('detail.error.title')}
            </h2>
            <p className="text-stone-600 dark:text-gray-400 mb-4">
              {error || t('detail.error.notFound')}
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF644A] text-white rounded-lg font-medium hover:bg-[#E65441] transition-colors"
            >
              <ArrowLeft size={18} />
              {t('detail.backToDiscover')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const timeRemaining = new Date(request.expires_at) > new Date()
    ? formatDistanceToNowLocalized(new Date(request.expires_at), locale, { addSuffix: false })
    : t('detail.expired') || 'Expired';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      <CleanHeader />

      {/* Page Header */}
      <header className={cn("z-40 text-white shadow-md", getHeaderColorClass())}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">{t('detail.back')}</span>
            </button>
            
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <motion.button
                  onClick={handleBookmark}
                  disabled={isBookmarking}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    request.is_bookmarked ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/80"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bookmark size={20} fill={request.is_bookmarked ? "currentColor" : "none"} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Request Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-stone-200 dark:border-[#3D3C4A] overflow-hidden shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        >
          {/* Request Header */}
          <div className={cn("px-6 py-4", getHeaderColorClass())}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">{t('detail.requestLabel')}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasBounty && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full border border-white/30 bg-white/20 text-white flex items-center gap-1.5">
                    <Sparkles size={14} />
                    {stakeAmount} BOCA
                  </span>
                )}
                <StatusBadge status={request.status} type="request" t={t} />
              </div>
            </div>
          </div>

          {/* Request Content */}
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold text-[#1F1E2A] dark:text-white">{request.title}</h1>
            
            {request.description && (
              <p className="text-stone-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{request.description}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {request.location && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 dark:bg-[#353444] rounded-full text-sm text-stone-600 dark:text-gray-300">
                  <MapPin size={14} />
                  {request.location}
                </span>
              )}
              {request.cuisine_preferences?.map((cuisine) => (
                <span key={cuisine} className="px-3 py-1 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-full text-sm text-[#1F1E2A] dark:text-white">
                  {cuisine}
                </span>
              ))}
              {request.occasion && (
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-sm text-purple-700 dark:text-purple-400">
                  {request.occasion}
                </span>
              )}
              {request.budget_range && (
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm text-emerald-700 dark:text-emerald-400">
                  {request.budget_range}
                </span>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100 dark:border-[#3D3C4A]">
              <Link href={`/users/${request.creator.id}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 dark:bg-[#353444]">
                  {request.creator.avatar_url ? (
                    <Image
                      src={request.creator.avatar_url}
                      alt={request.creator.username}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                      {request.creator.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1">
                <Link 
                  href={`/users/${request.creator.id}`} 
                  className="font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors"
                >
                  {request.creator.display_name || request.creator.username}
                </Link>
                <p className="text-sm text-stone-500 dark:text-gray-400">
                  {t('detail.postedAgo', { time: formatRelativeTime(request.created_at, locale) })}
                </p>
              </div>
              <div className="text-right text-sm text-stone-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  {t('detail.responseCount', { count: request.response_count })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {request.status === 'expired' 
                    ? t('detail.expired') 
                    : t('detail.expiresIn', { time: timeRemaining }) || `Expires ${timeRemaining}`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Bounty Info */}
          {hasBounty && (
            <div className={cn(
              "px-6 py-4 border-t",
              isBountyAwaitingAward 
                ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800/50"
                : effectiveBountyStatus === 'awarded'
                  ? "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-stone-50 dark:bg-[#353444] border-stone-200 dark:border-[#3D3C4A]"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isBountyAwaitingAward ? "bg-amber-100 dark:bg-amber-900/30" :
                    effectiveBountyStatus === 'awarded' ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-stone-100 dark:bg-[#404050]"
                  )}>
                    {effectiveBountyStatus === 'awarded' ? (
                      <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-stone-600 dark:text-gray-400">
                      {effectiveBountyStatus === 'awarded' 
                        ? t('detail.bountyAwarded') 
                        : t('detail.bounty')
                      }
                    </p>
                    <p className="text-xl font-bold text-[#1F1E2A] dark:text-white">
                      {stakeAmount.toFixed(2)} BOCA
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={isBountyAwaitingAward ? 'pending' : effectiveBountyStatus} type="bounty" t={t} />
                  {isBountyAwaitingAward && (
                    <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                      {t('detail.bountyWinnerInfo', { amount: winnerEarnings.toFixed(2) })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Creator Actions */}
          {isCreator && (canAward || canRefund || canTip) && (
            <div className="px-6 py-4 bg-stone-50 dark:bg-[#353444] border-t border-stone-200 dark:border-[#3D3C4A]">
              <div className="flex items-center gap-3">
                {canAward && (
                  <motion.button
                    onClick={() => setShowAwardModal(true)}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trophy className="w-4 h-4" />
                    {t('detail.awardBounty')}
                  </motion.button>
                )}
                {canRefund && (
                  <button
                    onClick={() => setShowRefundDialog(true)}
                    className="px-4 py-2.5 border border-stone-300 dark:border-[#4D4C5A] text-stone-600 dark:text-gray-300 rounded-lg font-medium hover:bg-stone-100 dark:hover:bg-[#404050]"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    {t('detail.refund')}
                  </button>
                )}
                {canTip && (
                  <p className="text-sm text-stone-500 dark:text-gray-400">
                    💡 {t('detail.tipHint')}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Response Form */}
        {canRespond && !hasUserResponded && (
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-stone-200 dark:border-[#3D3C4A] overflow-hidden shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            {!showResponseForm ? (
              <button
                onClick={() => setShowResponseForm(true)}
                className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-stone-50 dark:hover:bg-[#353444] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#FFF4E1] dark:bg-[#FF644A]/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#FF644A]" />
                </div>
                <span className="font-medium text-stone-600 dark:text-gray-300">
                  {t('detail.addResponse')}
                </span>
                {hasBounty && isBountyAwaitingAward && (
                  <span className="ml-auto text-sm text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                    <Sparkles size={12} />
                    {t('detail.winBounty', { amount: winnerEarnings.toFixed(1) })}
                  </span>
                )}
              </button>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
                    {t('detail.yourRecommendation')}
                  </h3>
                  <button
                    onClick={() => setShowResponseForm(false)}
                    className="p-1 hover:bg-stone-100 dark:hover:bg-[#353444] rounded-lg"
                  >
                    <X className="w-5 h-5 text-stone-400 dark:text-gray-500" />
                  </button>
                </div>

                {/* Restaurant Search */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700 dark:text-gray-300">
                    {t('detail.recommendRestaurants')}
                    <span className="text-stone-400 dark:text-gray-500 font-normal ml-1">
                      ({selectedRestaurants.length}/{MAX_RESTAURANTS_PER_RESPONSE})
                    </span>
                  </label>
                  
                  {selectedRestaurants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedRestaurants.map((restaurant) => (
                        <span
                          key={restaurant.id || restaurant.external_id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-full text-sm text-[#1F1E2A] dark:text-white"
                        >
                          {restaurant.name}
                          <button
                            onClick={() => removeRestaurant(restaurant.id || restaurant.external_id!)}
                            className="p-0.5 hover:bg-[#FF644A]/10 dark:hover:bg-[#FF644A]/30 rounded-full"
                          >
                            <X size={14} className="text-stone-500 dark:text-gray-400" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedRestaurants.length < MAX_RESTAURANTS_PER_RESPONSE && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={restaurantSearch}
                        onChange={(e) => setRestaurantSearch(e.target.value)}
                        placeholder={t('detail.searchRestaurantPlaceholder')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#353444] border border-stone-200 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] outline-none"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-stone-400 dark:text-gray-500" />
                      )}
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="border border-stone-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-white dark:bg-[#2D2C3A] max-h-48 overflow-y-auto">
                      {searchResults.map((restaurant) => (
                        <button
                          key={restaurant.id || restaurant.external_id}
                          onClick={() => selectRestaurant(restaurant)}
                          className="w-full px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-[#353444] border-b border-stone-100 dark:border-[#3D3C4A] last:border-b-0"
                        >
                          <p className="font-medium text-[#1F1E2A] dark:text-white">{restaurant.name}</p>
                          {restaurant.address && (
                            <p className="text-sm text-stone-500 dark:text-gray-400 truncate">{restaurant.address}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedRestaurants.length === 0 && (
                    <p className="text-sm text-stone-500 dark:text-gray-400">
                      {t('detail.searchRestaurantHelp')}
                    </p>
                  )}
                </div>

                {/* Comment - Optional */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700 dark:text-gray-300">
                    {t('detail.yourResponse')}{' '}
                    <span className="text-stone-400 dark:text-gray-500 font-normal">({t('detail.optional')})</span>
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={t('detail.responsePlaceholder')}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-4 py-3 bg-white dark:bg-[#353444] border border-stone-200 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] outline-none resize-none"
                  />
                  <p className="text-xs text-stone-500 dark:text-gray-400 text-right">
                    {responseText.length}/2000 {t('detail.characters')}
                  </p>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-[#3D3C4A]">
                  <div className="text-sm">
                    {selectedRestaurants.length === 0 && (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {t('detail.selectRestaurantRequired')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowResponseForm(false);
                        setSelectedRestaurants([]);
                        setResponseText('');
                      }}
                      className="px-4 py-2 text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-[#353444] rounded-lg"
                    >
                      {t('detail.cancel')}
                    </button>
                    <motion.button
                      onClick={handleSubmitResponse}
                      disabled={isSubmittingResponse || selectedRestaurants.length === 0}
                      className={cn(
                        "px-6 py-2 rounded-lg font-semibold flex items-center gap-2",
                        isSubmittingResponse || selectedRestaurants.length === 0
                          ? "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white"
                      )}
                      whileHover={!isSubmittingResponse && selectedRestaurants.length > 0 ? { scale: 1.02 } : {}}
                      whileTap={!isSubmittingResponse && selectedRestaurants.length > 0 ? { scale: 0.98 } : {}}
                    >
                      {isSubmittingResponse ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('detail.submitting')}
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          {t('detail.submit')}
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Already responded notice */}
        {canRespond && hasUserResponded && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {t('detail.alreadyResponded')}
            </p>
          </div>
        )}

        {/* Responses Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-[#FF644A]" />
            {t('detail.responses', { count: request.response_count })}
          </h2>

          {request.responses.length === 0 ? (
            <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-stone-200 dark:border-[#3D3C4A] p-8 text-center">
              <Users className="w-12 h-12 text-stone-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-stone-600 dark:text-gray-400">{t('detail.noResponses')}</p>
              <p className="text-sm text-stone-500 dark:text-gray-500 mt-1">{t('detail.beFirst')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {request.responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  isCreator={isCreator}
                  canTip={canTip}
                  onTip={openTipModal}
                  onUpvote={handleUpvote}
                  onMarkBestAnswer={handleMarkBestAnswer}
                  winningRestaurantId={request.winning_restaurant_id}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AwardBountyModal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        onAward={handleAward}
        responses={request.responses}
        stakeAmount={stakeAmount}
        requestTitle={request.title}
      />

      <TipResponseModal
        isOpen={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          setSelectedResponseForTip(null);
        }}
        onTip={handleTip}
        response={selectedResponseForTip}
        userBalance={userBalance}
        bountyId={requestId}
      />

      <AnimatePresence>
        {showRefundDialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowRefundDialog(false)}
            />
            <motion.div
              className="relative bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] max-w-md w-full p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-[#1F1E2A] dark:text-white mb-2">
                {t('detail.refundDialog.title')}
              </h3>
              <p className="text-stone-600 dark:text-gray-400 mb-4">
                {t('detail.refundDialog.description', { amount: stakeAmount.toFixed(2) })}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRefundDialog(false)}
                  className="px-4 py-2 text-stone-600 dark:text-gray-300 hover:text-stone-800 dark:hover:text-white font-medium"
                  disabled={isRefunding}
                >
                  {t('detail.cancel')}
                </button>
                <button
                  onClick={handleRefund}
                  disabled={isRefunding}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center gap-2"
                >
                  {isRefunding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('detail.refundDialog.refunding')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('detail.refundDialog.confirm')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}