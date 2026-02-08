'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Users,
  RefreshCw,
  ChefHat,
  Coffee,
  Search,
  TrendingUp,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// Using 'feed' namespace - loads from locales/{locale}/feed.json
import CleanHeader from '@/components/CleanHeader';
import RecommendationCard from '@/components/RecommendationCard';
import ListCard from '@/components/ListCard';
import ReshareHeader from '@/components/ReshareHeader';
import RequestCard from '@/components/discover/RequestCard';
import { useAuth } from '@/hooks/useAuth';
import tokenBalanceService from '@/services/TokenBalanceService';
import toast from 'react-hot-toast';
import { useCapacitor } from '@/hooks/useCapacitor';

// Recommendation interface (same as before)
interface Recommendation {
  id: string;
  title: string;
  content: string;
  photos?: Array<{
    url: string;
    ipfsHash?: string;
    caption?: string;
    hasLocation?: boolean;
  }>;
  image?: string;
  category: string;
  location: {
    restaurant_id?: number;
    name: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    isFollowing: boolean;
    socialDistance: 1 | 2;
    verificationLevel?: 'basic' | 'verified' | 'expert';
  };
  overall_rating: number;
  dishes?: Array<{
    id: string;
    name: string;
    rating: number;
    notes?: string;
    would_order_again: boolean;
  }>;
  aspects?: {
    ambiance: number;
    service: number;
    value_for_money: number;
    noise_level?: 'quiet' | 'moderate' | 'loud';
  };
  context?: {
    occasion: 'date_night' | 'family_dinner' | 'quick_lunch' | 'celebration' | 'business_lunch' | 'casual';
    party_size: number;
    meal_type?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
    time_of_visit?: string;
    total_spent?: number;
  };
  context_tags?: string[];
  engagement: {
    saves: number;
    upvotes: number;
    comments: number;
    shares?: number;
    reshares?: number;
    views?: number;
  };
  tokenRewards?: {
    amount: number;
    usdValue: number;
    earnedFrom: 'upvotes' | 'saves' | 'trust_bonus' | 'creation' | 'social_multiplier';
  };
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  isBookmarked: boolean;
  hasUpvoted: boolean;
  hasReshared?: boolean;
  objectId?: string;
  transactionHash?: string;
  contentHash?: string;
  verificationStatus?: 'verified' | 'unverified' | 'flagged';
  canEdit?: boolean;
  canDelete?: boolean;
}

// List interface (same as before)
interface CuratedList {
  id: string | number;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    followers: number;
    socialDistance?: 1 | 2;
  };
  restaurantCount: number;
  saves: number;
  likes?: number;
  category?: string;
  neighborhood?: string;
  isNew?: boolean;
  timeAgo?: string;
  createdAt?: string;
  preview: Array<{
    id?: number;
    name: string;
    image?: string;
    cuisine?: string;
    rating?: number;
    location?: string;
  }>;
  tags?: string[];
  isBookmarked?: boolean;
  hasLiked?: boolean;
  coverImage?: string;
}

// NEW: Reshare interface
interface ReshareItem {
  type: 'reshare';
  reshare_id: string;
  reshare_user_id: string;
  reshare_comment: string | null;
  reshare_created_at: string;
  resharer: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    reputation_score?: number;
  };
  // The reshared recommendation data
  data: Recommendation;
}

// NEW: Discovery Request interface for feed
interface DiscoveryRequestItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cuisine_type: string | null;
  occasion: string | null;
  budget_range: string[] | null;
  dietary_restrictions: string[] | null;
  bounty_amount: number;
  status: 'open' | 'answered' | 'closed';
  response_count: number;
  view_count: number;
  created_at: string;
  expires_at: string | null;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    reputation_score: number;
  };
  is_bookmarked?: boolean;
}

// Updated union type for feed items
type FeedItem = 
  | { type: 'recommendation'; data: Recommendation }
  | { type: 'list'; data: CuratedList }
  | { type: 'request'; data: DiscoveryRequestItem }
  | ReshareItem;

const MainFeed: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('feed');
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [trendingItems, setTrendingItems] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isCapacitor } = useCapacitor();

  const BACKEND_URL = 'https://omeonechain-production.up.railway.app';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const calculateTimeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('timeAgo.now');
    if (diffInSeconds < 3600) return t('timeAgo.minutes', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('timeAgo.hours', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('timeAgo.days', { count: Math.floor(diffInSeconds / 86400) });
    return t('timeAgo.weeks', { count: Math.floor(diffInSeconds / 604800) });
  }, [t]);

  // Transform feed data including recommendations, lists, AND reshares
  const transformMixedFeed = useCallback((feedData: any[]): FeedItem[] => {
    return feedData.map(item => {
      // Handle reshares (NEW)
      if (item.type === 'reshare') {
        const restaurant = item.restaurants || {};
        const originalAuthor = item.users || {};
        // FIXED: Backend now returns 'aspects' directly as formatted object
        const contextArray = item.contextual_factors || [];
        const contextData = contextArray.length > 0 ? contextArray[0] : undefined;

        const recData: Recommendation = {
          id: item.id,
          title: item.title,
          content: item.content || '',
          photos: item.photos?.map((url: string) => ({ url })) || [],
          category: item.category || restaurant.category || 'Restaurant',
          location: {
            restaurant_id: item.restaurant_id,
            name: restaurant.name || t('unknownRestaurant'),
            address: restaurant.address || '',
            city: '',
            latitude: restaurant.latitude,
            longitude: restaurant.longitude
          },
          author: {
            id: originalAuthor.id || item.author_id,
            name: originalAuthor.display_name || originalAuthor.username || t('unknownUser'),
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${originalAuthor.username || originalAuthor.display_name || 'User'}`,
            reputation: originalAuthor.reputation_score || 0,
            isFollowing: true,
            socialDistance: 1,
            verificationLevel: originalAuthor.verification_level || 'basic'
          },
          overall_rating: item.overall_rating || 7,
          dishes: item.dishes?.map((dish: any) => ({
            id: dish.id,
            name: dish.name,
            rating: dish.rating,
            notes: dish.notes,
            would_order_again: dish.would_order_again !== false
          })) || [],
          // FIXED: Use item.aspects directly (backend formats it)
          aspects: item.aspects,
          context: contextData ? {
            occasion: contextData.occasion || 'casual',
            party_size: contextData.party_size || 2,
            meal_type: contextData.meal_type,
            time_of_visit: item.visit_date,
            total_spent: contextData.total_spent
          } : undefined,
          context_tags: item.context_tags || [],
          engagement: {
            saves: item.saves_count || 0,
            upvotes: item.likes_count || 0,
            comments: item.comments_count || 0,
            reshares: item.reshares_count || 0
          },
          createdAt: item.created_at || new Date().toISOString(),
          tags: item.tags || [],
          isBookmarked: item.isBookmarked || false,
          hasUpvoted: item.hasUpvoted || false,
          hasReshared: item.hasReshared || false,
          canEdit: false, // User can't edit reshared content
          canDelete: false
        };

        return {
          type: 'reshare',
          reshare_id: item.reshare_id,
          reshare_user_id: item.reshare_user_id,
          reshare_comment: item.reshare_comment,
          reshare_created_at: item.reshare_created_at,
          resharer: item.resharer || {},
          data: recData
        } as ReshareItem;
      }
      
      // Handle discovery requests (NEW)
      if (item.type === 'request') {
        const requestData: DiscoveryRequestItem = {
          id: item.id,
          title: item.title,
          description: item.description,
          location: item.location,
          cuisine_type: item.cuisine_type,
          occasion: item.occasion,
          budget_range: item.budget_range,
          dietary_restrictions: item.dietary_restrictions,
          bounty_amount: item.bounty_amount || 0,
          status: item.status || 'open',
          response_count: item.response_count || 0,
          view_count: item.view_count || 0,
          created_at: item.created_at,
          expires_at: item.expires_at,
          creator: item.creator ? {
            id: item.creator.id,
            username: item.creator.username || '',
            display_name: item.creator.display_name || item.creator.username || t('unknownUser'),
            avatar_url: item.creator.avatar_url,
            reputation_score: item.creator.reputation_score || 0
          } : {
            id: '',
            username: '',
            display_name: t('unknownUser'),
            avatar_url: null,
            reputation_score: 0
          },
          is_bookmarked: item.is_bookmarked || false
        };
        
        return { type: 'request', data: requestData };
      }

      // Handle lists
      if (item.type === 'list') {
        const listData: CuratedList = {
          id: item.id,
          title: item.title,
          description: item.content || item.description || '',
          author: {
            id: item.creator?.id || 'unknown',
            name: item.creator?.display_name || item.creator?.username || t('foodExpert'),
            avatar: item.creator?.avatar_url || '👨‍🍳',
            verified: false,
            followers: 0,
            socialDistance: item.creator?.id === user?.id ? undefined : 1
          },
          restaurantCount: item.restaurant_count || 0,
          saves: item.save_count || 0,
          likes: item.like_count || 0,
          category: item.category,
          neighborhood: item.city,
          timeAgo: calculateTimeAgo(item.created_at || item.createdAt),
          createdAt: item.created_at || item.createdAt,
          preview: (item.restaurants || []).slice(0, 3).map((r: any) => ({
            id: r.id,
            name: r.name || 'Restaurant',
            image: r.image_url,
            cuisine: r.cuisine_type,
            rating: r.average_rating,
            location: r.location
          })),
          tags: item.tags || [],
          isBookmarked: item.isBookmarked || false,
          hasLiked: item.is_liked || false,
          coverImage: item.cover_image_url || null
        };
        
        return { type: 'list', data: listData };
      }
      
      // Handle regular recommendations
      // FIXED: Backend now returns 'aspects' directly as formatted object
      const recData: Recommendation = {
        id: item.id,
        title: item.title,
        content: item.content || item.description || '',
        photos: item.photos || [],
        category: item.category || '',
        location: item.location || {
          restaurant_id: undefined,
          name: t('unknownRestaurant'),
          address: '',
          city: ''
        },
        author: item.author || {
          id: '',
          name: t('unknownUser'),
          avatar: '/default-avatar.png',
          reputation: 5,
          isFollowing: false,
          socialDistance: 1
        },
        overall_rating: item.overall_rating || 0,
        dishes: item.dishes || [],
        // FIXED: Use item.aspects directly (backend formats it)
        aspects: item.aspects,
        context: item.context,
        context_tags: item.tags || [],
        engagement: item.engagement || {
          saves: 0,
          upvotes: 0,
          comments: 0,
          reshares: 0
        },
        createdAt: item.createdAt,
        tags: item.tags || [],
        isBookmarked: item.isBookmarked || false,
        hasUpvoted: item.hasUpvoted || false,
        hasReshared: item.hasReshared || false
      };
      return { type: 'recommendation', data: recData };
    });
  }, [calculateTimeAgo, t, user?.id]);

  // Transform recommendations-only endpoint data (fallback)
  // NOTE: This fallback endpoint might still return array format, so keep extraction logic
  const transformRecommendationsData = useCallback((recommendations: any[]): FeedItem[] => {
    return recommendations.map(rec => {
      const restaurant = rec.restaurants || {};
      const author = rec.users || {};
      // Fallback: check for both formats (array or object)
      const aspects = Array.isArray(rec.aspects) 
        ? (rec.aspects.length > 0 ? rec.aspects[0] : undefined)
        : rec.aspects;
      const contextArray = rec.contextual_factors || [];
      const contextData = contextArray.length > 0 ? contextArray[0] : undefined;
      
      const recData: Recommendation = {
        id: rec.id,
        title: rec.title,
        content: rec.content || '',
        photos: rec.photos?.map((url: string) => ({ url })) || [],
        category: rec.category || restaurant.category || 'Restaurant',
        location: {
          restaurant_id: rec.restaurant_id,
          name: restaurant.name || t('unknownRestaurant'),
          address: restaurant.address || '',
          city: '',
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        },
        author: {
          id: rec.author_id,
          name: author.display_name || author.username || t('unknownUser'),
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${author.username || author.display_name || 'User'}`,
          reputation: author.reputation_score || 0,
          isFollowing: true,
          socialDistance: 1,
          verificationLevel: author.verification_level || 'basic'
        },
        overall_rating: rec.overall_rating || 7,
        dishes: rec.dishes?.map((dish: any) => ({
          id: dish.id,
          name: dish.name,
          rating: dish.rating,
          notes: dish.notes,
          would_order_again: dish.would_order_again !== false
        })) || [],
        aspects: aspects ? {
          ambiance: aspects.ambiance,
          service: aspects.service,
          value_for_money: aspects.value_for_money,
          noise_level: aspects.noise_level
        } : undefined,
        context: contextData ? {
          occasion: contextData.occasion || 'casual',
          party_size: contextData.party_size || 2,
          meal_type: contextData.meal_type,
          time_of_visit: rec.visit_date,
          total_spent: contextData.total_spent
        } : undefined,
        context_tags: rec.context_tags || [],
        engagement: {
          saves: rec.saves_count || 0,
          upvotes: rec.upvotes_count || 0,
          comments: 0,
          reshares: rec.reshares_count || 0
        },
        createdAt: rec.created_at || new Date().toISOString(),
        tags: rec.tags || [],
        isBookmarked: false,
        hasUpvoted: false,
        hasReshared: false,
        canEdit: rec.author_id === user?.id,
        canDelete: rec.author_id === user?.id
      };
      return { type: 'recommendation', data: recData };
    });
  }, [user?.id, t]);

  // NEW: Fetch trending content when feed is empty
  const loadTrendingContent = useCallback(async () => {
    try {
      setIsLoadingTrending(true);
      const token = localStorage.getItem('omeone_auth_token');
      
      if (!token) {
        console.log('❌ No token for trending fetch');
        return;
      }

      console.log('🔥 Fetching trending content for empty feed...');

      // Try discover endpoint first (public recommendations)
      const response = await fetch(`${BACKEND_URL}/api/discover?limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded trending content:', data);
        
        if (data.success && data.recommendations) {
          const transformedItems = transformRecommendationsData(data.recommendations);
          setTrendingItems(transformedItems);
        }
      } else {
        console.warn('⚠️ Discover endpoint failed, trying recommendations...');
        
        // Fallback to general recommendations
        const recResponse = await fetch(`${BACKEND_URL}/api/recommendations?limit=10`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (recResponse.ok) {
          const recData = await recResponse.json();
          const transformedItems = transformRecommendationsData(recData.recommendations || []);
          setTrendingItems(transformedItems);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load trending content:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  }, [BACKEND_URL, transformRecommendationsData]);

  // Fetch user's interaction status for recommendations
  const fetchUserInteractionStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('omeone_auth_token');
      if (!token) {
        console.log('❌ No token found');
        return;
      }

      console.log('📊 Fetching recommendation interaction status...');

      const response = await fetch(`${BACKEND_URL}/api/recommendations/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch interaction status:', errorText);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Interaction status loaded:', data);

      // Update feed items with user's interaction state
      setFeedItems(items => 
        items.map(item => {
          if (item.type === 'recommendation') {
            return {
              ...item,
              data: {
                ...item.data,
                isBookmarked: data.bookmarked?.includes(item.data.id) || false,
                hasUpvoted: data.liked?.includes(item.data.id) || false,
                hasReshared: data.reshared?.includes(item.data.id) || false
              }
            };
          } else if (item.type === 'reshare') {
            return {
              ...item,
              data: {
                ...item.data,
                isBookmarked: data.bookmarked?.includes(item.data.id) || false,
                hasUpvoted: data.liked?.includes(item.data.id) || false,
                hasReshared: data.reshared?.includes(item.data.id) || false
              }
            };
          }
          return item;
        })
      );

      // Also update trending items if they exist
      setTrendingItems(items => 
        items.map(item => {
          if (item.type === 'recommendation') {
            return {
              ...item,
              data: {
                ...item.data,
                isBookmarked: data.bookmarked?.includes(item.data.id) || false,
                hasUpvoted: data.liked?.includes(item.data.id) || false,
                hasReshared: data.reshared?.includes(item.data.id) || false
              }
            };
          }
          return item;
        })
      );

    } catch (error) {
      console.error('❌ Failed to fetch interaction status:', error);
    }
  }, [BACKEND_URL]);

  const loadFeedData = useCallback(async () => {
    try {
      setIsLoadingFeed(true);
      
      const token = localStorage.getItem('omeone_auth_token');
      
      if (!token) {
        console.error('❌ No auth token found');
        setIsLoadingFeed(false);
        return;
      }

      console.log('🔍 Fetching mixed feed from backend');

      const response = await fetch(`${BACKEND_URL}/api/feed/mixed`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ Mixed feed failed, trying recommendations endpoint...');
        
        const recResponse = await fetch(`${BACKEND_URL}/api/recommendations`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!recResponse.ok) {
          throw new Error('Failed to load recommendations');
        }

        const recData = await recResponse.json();
        console.log('✅ Loaded recommendations fallback:', recData);
        
        const transformedItems = transformRecommendationsData(recData.recommendations || []);
        setFeedItems(transformedItems);
        
        // If feed is empty, load trending content
        if (transformedItems.length === 0) {
          await loadTrendingContent();
        }
        
      } else {
        const data = await response.json();
        console.log('✅ Loaded mixed feed:', data);
        
        if (data.success && data.feed) {
          const transformedItems = transformMixedFeed(data.feed);
          setFeedItems(transformedItems);
          console.log(`📊 Feed contains ${transformedItems.filter(i => i.type === 'recommendation').length} recommendations, ${transformedItems.filter(i => i.type === 'reshare').length} reshares, ${transformedItems.filter(i => i.type === 'list').length} lists, and ${transformedItems.filter(i => i.type === 'request').length} requests`);
          
          // If feed is empty, load trending content
          if (transformedItems.length === 0) {
            await loadTrendingContent();
          }
        } else {
          setFeedItems([]);
          // Load trending content for empty feed
          await loadTrendingContent();
        }
      }

      // Load user's interaction status after feed loads
      // Interaction status (hasUpvoted, isBookmarked, hasReshared) is already
      // included in each feed item by the /api/feed/mixed endpoint.
      // No separate fetch needed here.

    } catch (error) {
      console.error('❌ Failed to load feed:', error);
      setFeedItems([]);
      // Load trending content even on error
      await loadTrendingContent();
    } finally {
      setIsLoadingFeed(false);
    }
  }, [BACKEND_URL, transformMixedFeed, transformRecommendationsData, fetchUserInteractionStatus, loadTrendingContent]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFeedData();
    }
  }, [isAuthenticated, user, loadFeedData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFeedData();
    setIsRefreshing(false);
  };

  // Recommendation interactions (same as before)
  const handleSaveRecommendation = async (id: string) => {
    // Update both feed items and trending items
    const updateItems = (items: FeedItem[]) => 
      items.map(item => {
        if ((item.type === 'recommendation' || item.type === 'reshare') && item.data.id === id) {
          return {
            ...item,
            data: {
              ...item.data,
              isBookmarked: !item.data.isBookmarked,
              engagement: {
                ...item.data.engagement,
                saves: item.data.isBookmarked ? item.data.engagement.saves - 1 : item.data.engagement.saves + 1
              }
            }
          };
        }
        return item;
      });

    setFeedItems(updateItems);
    setTrendingItems(updateItems);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/recommendations/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to bookmark');
      
      // 💰 Get tokens earned from response
      const data = await response.json();
      if (data.tokens_earned && data.tokens_earned > 0) {
        toast.success(t('toast.saved', { tokens: data.tokens_earned.toFixed(2) }));

        // 🚀 NEW: Trigger optimistic balance update
        if (user?.id) {
          await tokenBalanceService.optimisticUpdate(user.id, data.tokens_earned);
        }
      }
    } catch (error) {
      console.error('❌ Failed to save recommendation:', error);
      // Revert on error
      const revertItems = (items: FeedItem[]) => 
        items.map(item => {
          if ((item.type === 'recommendation' || item.type === 'reshare') && item.data.id === id) {
            return {
              ...item,
              data: {
                ...item.data,
                isBookmarked: !item.data.isBookmarked,
                engagement: {
                  ...item.data.engagement,
                  saves: item.data.isBookmarked ? item.data.engagement.saves + 1 : item.data.engagement.saves - 1
                }
              }
            };
          }
          return item;
        });
      
      setFeedItems(revertItems);
      setTrendingItems(revertItems);
    }
  };

  const handleUpvoteRecommendation = async (id: string) => {
    // Update both feed items and trending items
    const updateItems = (items: FeedItem[]) => 
      items.map(item => {
        if ((item.type === 'recommendation' || item.type === 'reshare') && item.data.id === id) {
          return {
            ...item,
            data: {
              ...item.data,
              hasUpvoted: !item.data.hasUpvoted,
              engagement: {
                ...item.data.engagement,
                upvotes: item.data.hasUpvoted ? item.data.engagement.upvotes - 1 : item.data.engagement.upvotes + 1
              }
            }
          };
        }
        return item;
      });

    setFeedItems(updateItems);
    setTrendingItems(updateItems);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/recommendations/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to like');
      
      // 💰 Get tokens earned from response
      const data = await response.json();
      if (data.tokens_earned && data.tokens_earned > 0) {
        toast.success(t('toast.liked', { tokens: data.tokens_earned.toFixed(2) }));

        // 🚀 NEW: Trigger optimistic balance update
        if (user?.id) {
          await tokenBalanceService.optimisticUpdate(user.id, data.tokens_earned);
        }
      }
    } catch (error) {
      console.error('❌ Failed to like recommendation:', error);
      // Revert on error
      const revertItems = (items: FeedItem[]) => 
        items.map(item => {
          if ((item.type === 'recommendation' || item.type === 'reshare') && item.data.id === id) {
            return {
              ...item,
              data: {
                ...item.data,
                hasUpvoted: !item.data.hasUpvoted,
                engagement: {
                  ...item.data.engagement,
                  upvotes: item.data.hasUpvoted ? item.data.engagement.upvotes + 1 : item.data.engagement.upvotes - 1
                }
              }
            };
          }
          return item;
        });
      
      setFeedItems(revertItems);
      setTrendingItems(revertItems);
    }
  };

  // ADD THIS NEW FUNCTION HERE:
  const handleReshare = async (id: string, comment?: string) => {
    // Backend already awards tokens (0.2 BOCA to resharer + 0.1 BOCA attribution)
    // Just refresh balance to show the update
    if (user?.id) {
      await tokenBalanceService.forceRefreshBalance(user.id);
    }
  };

  // Request interactions (NEW)
  const handleBookmarkRequest = async (id: string) => {
    setFeedItems(items =>
      items.map(item => {
        if (item.type === 'request' && item.data.id === id) {
          return {
            ...item,
            data: {
              ...item.data,
              is_bookmarked: !item.data.is_bookmarked
            }
          };
        }
        return item;
      })
    );

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/discovery/requests/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to bookmark request');
      toast.success(t('toast.saved'));
    } catch (error) {
      console.error('❌ Failed to bookmark request:', error);
      // Revert on error
      setFeedItems(items =>
        items.map(item => {
          if (item.type === 'request' && item.data.id === id) {
            return {
              ...item,
              data: {
                ...item.data,
                is_bookmarked: !item.data.is_bookmarked
              }
            };
          }
          return item;
        })
      );
      toast.error(t('toast.bookmarkFailed'));
    }
  };

  // List interactions (same as before)
  const handleSaveList = async (listId: string | number) => {
    const id = listId.toString();
    
    setFeedItems(items => 
      items.map(item => {
        if (item.type === 'list' && item.data.id.toString() === id) {
          return {
            ...item,
            data: {
              ...item.data,
              isBookmarked: !item.data.isBookmarked,
              saves: item.data.isBookmarked ? item.data.saves - 1 : item.data.saves + 1
            }
          };
        }
        return item;
      })
    );

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/lists/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to bookmark list');
    } catch (error) {
      console.error('❌ Failed to bookmark list:', error);
      toast.error(t('toast.bookmarkFailed'));
    }
  };

  const handleLikeList = async (listId: string | number) => {
    const id = listId.toString();
    
    setFeedItems(items => 
      items.map(item => {
        if (item.type === 'list' && item.data.id.toString() === id) {
          return {
            ...item,
            data: {
              ...item.data,
              hasLiked: !item.data.hasLiked,
              likes: (item.data.likes || 0) + (item.data.hasLiked ? -1 : 1)
            }
          };
        }
        return item;
      })
    );

    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(`${BACKEND_URL}/api/lists/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to like list');
    } catch (error) {
      console.error('❌ Failed to like list:', error);
      toast.error(t('toast.likeFailed'));
    }
  };

  const handleShareList = (listId: string | number) => {
    toast.success(t('toast.linkCopied'));
  };

  const handleShare = (id: string) => {
    toast.success(t('toast.linkCopied'));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const recommendationCount = feedItems.filter(i => i.type === 'recommendation' || i.type === 'reshare').length;
  const listCount = feedItems.filter(i => i.type === 'list').length;
  const isFeedEmpty = feedItems.length === 0;

  // ============================================================================
  // EMPTY FEED CTA BOX COMPONENT
  // ============================================================================
  const EmptyFeedCTA = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6 mb-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#FFE8E4] dark:bg-[#FF644A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-coral" />
        </div>
        <h3 className="text-xl font-semibold text-navy dark:text-white mb-2">
          {t('emptyFeed.title') || 'Your feed is empty!'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t('emptyFeed.subtitle') || 'Follow people to see their recommendations here, or explore what\'s trending.'}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3">
        {/* Primary: Discover */}
        <button
          onClick={() => router.push('/discover')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium transition-colors"
        >
          <Search className="w-5 h-5" />
          {t('emptyFeed.discover') || 'Discover Recommendations'}
        </button>

        {/* Secondary row: Find Friends + Create */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/community')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FFE8E4] dark:bg-[#FF644A]/20 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 text-coral rounded-xl font-medium transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">{t('emptyFeed.findFriends') || 'Find Friends'}</span>
          </button>
          <button
            onClick={() => router.push('/create')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FFE8E4] dark:bg-[#FF644A]/20 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 text-coral rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">{t('emptyFeed.share') || 'Share a Place'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );

  // ============================================================================
  // TRENDING SECTION HEADER
  // ============================================================================
  const TrendingSectionHeader = () => (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <div className="flex items-center gap-2 text-coral">
        <TrendingUp className="w-5 h-5" />
        <span className="font-semibold">{t('emptyFeed.trendingTitle') || 'Trending in Your Area'}</span>
      </div>
      <div className="flex-1 h-px bg-gray-200 dark:bg-[#3D3C4A]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1F1E2A]">
      <CleanHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-navy dark:text-white">{t('title')}</h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-coral transition-colors"
              title={t('refresh')}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Create Recommendation Button */}
          <button
            onClick={() => router.push('/create/recommendation')}
            className="flex items-center gap-2 bg-coral text-white px-4 py-2 rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('create')}
          </button>
        </div>

        {/* Main Content Grid */}
        <div className={`grid gap-6 ${isCapacitor ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          {/* Feed Column */}
          <div className={`${isCapacitor ? '' : 'lg:col-span-8'} space-y-6`}>
            {isLoadingFeed ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A] animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                </div>
              ))
            ) : isFeedEmpty ? (
              // ================================================================
              // EMPTY FEED: Show CTA Box + Trending Content
              // ================================================================
              <>
                <EmptyFeedCTA />
                
                {/* Trending Section */}
                {isLoadingTrending ? (
                  <div className="space-y-4">
                    <TrendingSectionHeader />
                    {[1, 2].map(i => (
                      <div key={i} className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A] animate-pulse">
                        <div className="flex gap-3 mb-4">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                          </div>
                        </div>
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : trendingItems.length > 0 ? (
                  <>
                    <TrendingSectionHeader />
                    {trendingItems.map((item, index) => {
                      if (item.type === 'recommendation') {
                        return (
                          <RecommendationCard
                            key={`trending-${item.data.id}-${index}`}
                            recommendation={item.data}
                            currentUserId={user?.id}
                            variant="default"
                            showAuthor={true}
                            showTokenRewards={false}
                            showBlockchainInfo={false}
                            showActions={true}
                            onSave={handleSaveRecommendation}
                            onUpvote={handleUpvoteRecommendation}
                            onShare={handleShare}
                            onAuthorClick={(authorId) => router.push(`/users/${authorId}`)}
                            onLocationClick={(location) => {
                              if (location.restaurant_id) {
                                router.push(`/restaurant/${location.restaurant_id}`);
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                  </>
                ) : (
                  // No trending content either - show simple message
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">{t('emptyFeed.noTrending') || 'Be the first to share a recommendation!'}</p>
                  </div>
                )}
              </>
            ) : (
              // ================================================================
              // NORMAL FEED: Show user's feed items
              // ================================================================
              feedItems.map((item, index) => {
                if (item.type === 'reshare') {
                  return (
                    <div key={`reshare-${item.reshare_id}-${index}`} className="relative">
                      <ReshareHeader
                        resharer={item.resharer}
                        comment={item.reshare_comment}
                        createdAt={item.reshare_created_at}
                      />
                      <RecommendationCard
                        recommendation={item.data}
                        currentUserId={user?.id}
                        variant="default"
                        showAuthor={true}
                        showTokenRewards={false}
                        showBlockchainInfo={false}
                        showActions={true}
                        onSave={handleSaveRecommendation}
                        onUpvote={handleUpvoteRecommendation}
                        onShare={handleShare}
                        onAuthorClick={(authorId) => router.push(`/users/${authorId}`)}
                        onLocationClick={(location) => {
                          if (location.restaurant_id) {
                            router.push(`/restaurant/${location.restaurant_id}`);
                          }
                        }}
                      />
                    </div>
                  );
                }
                
                if (item.type === 'recommendation') {
                  return (
                    <RecommendationCard
                      key={`rec-${item.data.id}-${index}`}
                      recommendation={item.data}
                      currentUserId={user?.id}
                      variant="default"
                      showAuthor={true}
                      showTokenRewards={false}
                      showBlockchainInfo={false}
                      showActions={true}
                      onSave={handleSaveRecommendation}
                      onUpvote={handleUpvoteRecommendation}
                      onShare={handleShare}
                      onAuthorClick={(authorId) => router.push(`/users/${authorId}`)}
                      onLocationClick={(location) => {
                        if (location.restaurant_id) {
                          router.push(`/restaurant/${location.restaurant_id}`);
                        }
                      }}
                    />
                  );
                }
                
                if (item.type === 'request') {
                  return (
                    <RequestCard
                      key={`request-${item.data.id}-${index}`}
                      request={item.data}
                      variant="compact"
                      onBookmark={() => handleBookmarkRequest(item.data.id)}
                      onReport={() => toast.success(t('toast.reportSubmitted'))}
                    />
                  );
                }

                return (
                  <ListCard
                    key={`list-${item.data.id}-${index}`}
                    list={item.data}
                    variant="feed"
                    showAuthor={true}
                    showActions={true}
                    onSave={handleSaveList}
                    onLike={handleLikeList}
                    onShare={handleShareList}
                    onAuthorClick={(authorId) => router.push(`/users/${authorId}`)}
                    onReport={(listId) => toast.success(t('toast.reportSubmitted'))}
                  />
                );
              })
            )}
          </div>

          {/* Sidebar */}
          {!isCapacitor && (
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
                <h3 className="font-semibold text-navy dark:text-white mb-4">{t('quickActions.title')}</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/create/recommendation')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#FFE8E4] dark:bg-[#FF644A]/20 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 text-coral rounded-lg transition-colors"
                  >
                    <ChefHat className="w-5 h-5" />
                    <span className="font-medium">{t('quickActions.createRecommendation')}</span>
                  </button>
                  <button
                    onClick={() => router.push('/create?action=list')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#FFE8E4] dark:bg-[#FF644A]/20 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 text-coral rounded-lg transition-colors"
                  >
                    <Coffee className="w-5 h-5" />
                    <span className="font-medium">{t('quickActions.createList')}</span>
                  </button>
                  <button
                    onClick={() => router.push('/create?action=request')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#FFE8E4] dark:bg-[#FF644A]/20 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 text-coral rounded-lg transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span className="font-medium">{t('quickActions.request') || 'Request'}</span>
                  </button>
                </div>
              </div>

            {/* Trending Now */}
            <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy dark:text-white">{t('trending.title')}</h3>
                <svg className="w-5 h-5 text-coral" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('trending.empty')}
              </div>
            </div>

            {/* Your Dining Memory - Gradient card stays the same */}
            <div className="bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-xl border border-coral p-6">
              <h3 className="font-semibold text-white mb-4">{t('diningMemory.title')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{t('diningMemory.recentRecommendations')}</span>
                  <span className="font-semibold text-white">
                    {feedItems.filter(i => i.type === 'recommendation').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{t('diningMemory.savedLists')}</span>
                  <span className="font-semibold text-white">0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{t('diningMemory.following')}</span>
                  <span className="font-semibold text-white">{t('diningMemory.foodExperts', { count: 2 })}</span>
                </div>
                <button
                  onClick={() => router.push(`/users/${user?.id}`)}
                  className="w-full mt-4 px-4 py-2 text-white border border-white/30 bg-white/10 rounded-lg hover:bg-white/20 font-medium text-sm transition-colors"
                >
                  {t('diningMemory.viewHistory')}
                </button>
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
              <h3 className="font-semibold text-navy dark:text-white mb-4">{t('communityStats.title')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFE8E4] dark:bg-[#FF644A]/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('communityStats.activeMembers')}</p>
                    <p className="font-semibold text-navy dark:text-white">{t('communityStats.growingDaily')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('communityStats.recommendations')}</p>
                    <p className="font-semibold text-navy dark:text-white">
                      {t('communityStats.inFeed', { count: recommendationCount })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFE8E4] dark:bg-[#FF644A]/20 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('communityStats.curatedLists')}</p>
                    <p className="font-semibold text-navy dark:text-white">
                      {t('communityStats.available', { count: listCount })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainFeed;