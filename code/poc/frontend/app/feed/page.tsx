'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Users,
  RefreshCw,
  ChefHat,
  Coffee
} from 'lucide-react';
import CleanHeader from '@/components/CleanHeader';
import RecommendationCard from '@/components/RecommendationCard';
import ListCard from '@/components/ListCard';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

// Recommendation interface
interface Recommendation {
  id: string;
  title: string;
  description: string;
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
  objectId?: string;
  transactionHash?: string;
  contentHash?: string;
  verificationStatus?: 'verified' | 'unverified' | 'flagged';
  canEdit?: boolean;
  canDelete?: boolean;
}

// List interface
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
}

// Union type for feed items
type FeedItem = 
  | { type: 'recommendation'; data: Recommendation }
  | { type: 'list'; data: CuratedList };

const MainFeed: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const calculateTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  // Transform feed data including both recommendations and lists
  const transformMixedFeed = useCallback((feedData: any[]): FeedItem[] => {
    return feedData.map(item => {
      if (item.type === 'list') {
        const listData: CuratedList = {
          id: item.id,
          title: item.title,
          description: item.description || '',
          author: {
            id: item.creator?.id || 'unknown',
            name: item.creator?.display_name || item.creator?.username || 'Food Expert',
            avatar: item.creator?.avatar_url || '👨‍🍳',
            verified: false,
            followers: 0,
            socialDistance: 1
          },
          restaurantCount: item.restaurant_count || 0,
          saves: item.save_count || 0,
          likes: item.like_count || 0,
          category: item.category,
          neighborhood: item.city,
          timeAgo: calculateTimeAgo(item.createdAt),
          createdAt: item.createdAt,
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
          hasLiked: item.is_liked || false
        };
        
        return { type: 'list', data: listData };
      } else {
        const recData: Recommendation = {
          id: item.id,
          title: item.title,
          description: item.description || '',
          photos: item.photos || [],
          category: item.category || '',
          location: item.location || {
            restaurant_id: undefined,
            name: 'Unknown Restaurant',
            address: '',
            city: ''
          },
          author: item.author || {
            id: '',
            name: 'Unknown User',
            avatar: '/default-avatar.png',
            reputation: 5,
            isFollowing: false,
            socialDistance: 1
          },
          overall_rating: item.overall_rating || 0,
          dishes: item.dishes || [],
          aspects: item.aspects,
          context: item.context,
          context_tags: item.tags || [],
          engagement: item.engagement || {
            saves: 0,
            upvotes: 0,
            comments: 0
          },
          createdAt: item.createdAt,
          tags: item.tags || [],
          isBookmarked: item.isBookmarked || false,
          hasUpvoted: item.hasUpvoted || false
        };
        return { type: 'recommendation', data: recData };
      }
    });
  }, []);

  // Transform recommendations-only endpoint data
  const transformRecommendationsData = useCallback((recommendations: any[]): FeedItem[] => {
    return recommendations.map(rec => {
      const restaurant = rec.restaurants || {};
      const author = rec.users || {};
      const aspectsArray = rec.restaurant_aspects || [];
      const aspects = aspectsArray.length > 0 ? aspectsArray[0] : undefined;
      const contextArray = rec.contextual_factors || [];
      const contextData = contextArray.length > 0 ? contextArray[0] : undefined;
      
      const recData: Recommendation = {
        id: rec.id,
        title: rec.title,
        description: rec.content || '',
        photos: rec.photos?.map((url: string) => ({ url })) || [],
        category: rec.category || restaurant.category || 'Restaurant',
        location: {
          restaurant_id: rec.restaurant_id,
          name: restaurant.name || 'Unknown Restaurant',
          address: restaurant.address || '',
          city: '',
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        },
        author: {
          id: rec.author_id,
          name: author.display_name || author.username || 'Unknown User',
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
          comments: 0
        },
        createdAt: rec.created_at || new Date().toISOString(),
        tags: rec.tags || [],
        isBookmarked: false,
        hasUpvoted: false,
        canEdit: rec.author_id === user?.id,
        canDelete: rec.author_id === user?.id
      };
      return { type: 'recommendation', data: recData };
    });
  }, [user?.id]);

  // NEW: Fetch user's interaction status for recommendations
  const fetchUserInteractionStatus = useCallback(async () => {
      try {
        const token = localStorage.getItem('omeone_auth_token');
        if (!token) {
          console.log('❌ No token found');
          return;
        }

        console.log('📊 Fetching recommendation interaction status...');
        console.log('🔑 Token exists:', token ? 'YES' : 'NO');
        console.log('🌐 Calling URL:', `${BACKEND_URL}/api/recommendations/status`);

        const response = await fetch(`${BACKEND_URL}/api/recommendations/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);

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
                hasUpvoted: data.liked?.includes(item.data.id) || false
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
        
      } else {
        const data = await response.json();
        console.log('✅ Loaded mixed feed:', data);
        
        if (data.success && data.feed) {
          const transformedItems = transformMixedFeed(data.feed);
          setFeedItems(transformedItems);
          console.log(`📊 Feed contains ${transformedItems.filter(i => i.type === 'recommendation').length} recommendations and ${transformedItems.filter(i => i.type === 'list').length} lists`);
        } else {
          setFeedItems([]);
        }
      }

      // NEW: Load user's interaction status after feed loads
      await fetchUserInteractionStatus();

    } catch (error) {
      console.error('❌ Failed to load feed:', error);
      setFeedItems([]);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [BACKEND_URL, transformMixedFeed, transformRecommendationsData, fetchUserInteractionStatus]);

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

  // Recommendation interactions
  const handleSaveRecommendation = async (id: string) => {
    setFeedItems(items => 
      items.map(item => {
        if (item.type === 'recommendation' && item.data.id === id) {
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
      })
    );

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
    } catch (error) {
      console.error('❌ Failed to save recommendation:', error);
      // Revert optimistic update
      setFeedItems(items => 
        items.map(item => {
          if (item.type === 'recommendation' && item.data.id === id) {
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
        })
      );
    }
  };

  const handleUpvoteRecommendation = async (id: string) => {
    setFeedItems(items => 
      items.map(item => {
        if (item.type === 'recommendation' && item.data.id === id) {
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
      })
    );

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
    } catch (error) {
      console.error('❌ Failed to like recommendation:', error);
      // Revert optimistic update
      setFeedItems(items => 
        items.map(item => {
          if (item.type === 'recommendation' && item.data.id === id) {
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
        })
      );
    }
  };

  // List interactions
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
      toast.error('Failed to bookmark list');
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
      toast.error('Failed to like list');
    }
  };

  const handleShareList = (listId: string | number) => {
    toast.success('Share link copied to clipboard!');
  };

  const handleShare = (id: string) => {
    toast.success('Share link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <CleanHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh feed"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>

            <AnimatePresence>
              {showCreateMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
                >
                  <button
                    onClick={() => {
                      router.push('/create');
                      setShowCreateMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ChefHat className="w-4 h-4" />
                    Recommendation
                  </button>
                  <button
                    onClick={() => {
                      router.push('/lists/create');
                      setShowCreateMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Coffee className="w-4 h-4" />
                    List
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {isLoadingFeed ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                </div>
              ))
            ) : feedItems.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Your feed is empty
                </h3>
                <p className="text-gray-500 mb-6">
                  Follow some food experts to see their recommendations here
                </p>
                <button
                  onClick={() => router.push('/community')}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Discover People
                </button>
              </div>
            ) : (
              feedItems.map((item) => (
                item.type === 'recommendation' ? (
                  <RecommendationCard
                    key={`rec-${item.data.id}`}
                    recommendation={item.data}
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
                ) : (
                  <ListCard
                    key={`list-${item.data.id}`}
                    list={item.data}
                    variant="feed"
                    showAuthor={true}
                    showActions={true}
                    onSave={handleSaveList}
                    onLike={handleLikeList}
                    onShare={handleShareList}
                    onAuthorClick={(authorId) => router.push(`/users/${authorId}`)}
                    onReport={(listId) => toast.success('Report submitted')}
                  />
                )
              ))
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/create')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                >
                  <ChefHat className="w-5 h-5" />
                  <span className="font-medium">Create Recommendation</span>
                </button>
                <button
                  onClick={() => router.push('/lists/create')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                >
                  <Coffee className="w-5 h-5" />
                  <span className="font-medium">Create List</span>
                </button>
                <button
                  onClick={() => router.push('/discover')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="font-medium">Discover</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Trending Now</h3>
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="text-sm text-gray-500 text-center py-4">
                No trending content yet
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Dining Memory</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Recent recommendations:</span>
                  <span className="font-semibold text-gray-900">
                    {feedItems.filter(i => i.type === 'recommendation').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Saved lists:</span>
                  <span className="font-semibold text-gray-900">0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Following:</span>
                  <span className="font-semibold text-gray-900">2 food experts</span>
                </div>
                <button
                  onClick={() => router.push(`/users/${user?.id}`)}
                  className="w-full mt-4 px-4 py-2 bg-white hover:bg-gray-50 text-blue-600 rounded-lg font-medium text-sm border border-blue-200 transition-colors"
                >
                  View All History
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active Members</p>
                    <p className="font-semibold text-gray-900">Growing Daily</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Recommendations</p>
                    <p className="font-semibold text-gray-900">
                      {feedItems.filter(i => i.type === 'recommendation').length} in feed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Curated Lists</p>
                    <p className="font-semibold text-gray-900">
                      {feedItems.filter(i => i.type === 'list').length} available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainFeed;