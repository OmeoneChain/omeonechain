// File: code/poc/frontend/components/discover/TrendingWidget.tsx
// Trending Widget - Shows mixed content types (recommendations, guides, requests)
// based on engagement metrics

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, MessageCircle, Heart, Users, MapPin, HelpCircle, BookOpen, Utensils } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type TrendingItemType = 'recommendation' | 'guide' | 'request';

interface TrendingItem {
  id: string;
  type: TrendingItemType;
  title: string;
  subtitle?: string; // Restaurant name, request location, guide author
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
  engagement: {
    likes?: number;
    comments?: number;
    responses?: number; // For requests
    saves?: number; // For guides
    views?: number;
  };
  created_at: string;
  // Optional metadata
  restaurant_name?: string; // For recommendations
  location?: string; // For requests
  restaurant_count?: number; // For guides
  has_bounty?: boolean; // For requests
  bounty_amount?: number; // For requests
}

interface TrendingWidgetProps {
  itemCount?: number;
  onItemClick?: (item: TrendingItem) => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app/api';

const TYPE_CONFIG: Record<TrendingItemType, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  recommendation: {
    icon: Utensils,
    color: 'text-[#FF644A]',
    bgColor: 'bg-[#FF644A]/10',
    label: 'Rec',
  },
  guide: {
    icon: BookOpen,
    color: 'text-[#2D7A5F]',
    bgColor: 'bg-[#BFE2D9]/30',
    label: 'Guide',
  },
  request: {
    icon: HelpCircle,
    color: 'text-[#6366F1]',
    bgColor: 'bg-[#6366F1]/10',
    label: 'Ask',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
};

const formatEngagement = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

const isImageUrl = (avatar: string | undefined | null): boolean => {
  if (!avatar) return false;
  return avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:');
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function TrendingWidget({
  itemCount = 5,
  onItemClick,
  className = '',
}: TrendingWidgetProps) {
  const t = useTranslations('discover');
  const { token } = useAuth();
  
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trending data from backend
  const fetchTrendingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch from unified trending endpoint
      const response = await fetch(
        `${API_BASE_URL}/trending?limit=${itemCount}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items) {
            setTrendingItems(data.items);
            setIsLoading(false);  // ✅ Add this line
            console.log(`[TrendingWidget] Loaded ${data.items.length} trending items`);
            return;
        }
    }

      // Fallback: fetch from individual endpoints and merge
      console.log('[TrendingWidget] Unified endpoint not available, fetching from individual sources...');
      await fetchFromIndividualSources();

    } catch (err) {
      console.error('[TrendingWidget] Error fetching trending data:', err);
      // Try fallback
      await fetchFromIndividualSources();
    }
  }, [token, itemCount]);

  // Fallback: Fetch from individual endpoints and merge/sort by engagement
  const fetchFromIndividualSources = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const results: TrendingItem[] = [];

      // Fetch recommendations
      try {
        const recResponse = await fetch(
          `${API_BASE_URL}/recommendations/trending?limit=${itemCount}`,
          { headers }
        );
        if (recResponse.ok) {
          const recData = await recResponse.json();
          if (recData.success && recData.recommendations) {
            recData.recommendations.forEach((rec: any) => {
              results.push({
                id: rec.id,
                type: 'recommendation',
                title: rec.title,
                subtitle: rec.restaurant?.name || rec.restaurant_name,
                author: {
                  id: rec.author?.id || rec.author_id,
                  username: rec.author?.username || 'user',
                  display_name: rec.author?.display_name || rec.author?.username || 'User',
                  avatar_url: rec.author?.avatar_url,
                },
                engagement: {
                  likes: rec.likes_count || 0,
                  comments: rec.comments_count || 0,
                },
                created_at: rec.created_at,
                restaurant_name: rec.restaurant?.name || rec.restaurant_name,
              });
            });
          }
        }
      } catch (e) {
        console.log('[TrendingWidget] Could not fetch recommendations');
      }

      // Fetch guides/lists
      try {
        const listResponse = await fetch(
          `${API_BASE_URL}/lists?limit=${itemCount}&sort=popular`,
          { headers }
        );
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.success && listData.lists) {
            listData.lists.forEach((list: any) => {
              results.push({
                id: list.id,
                type: 'guide',
                title: list.title,
                subtitle: `${list.restaurant_count || 0} places`,
                author: {
                  id: list.created_by || list.author?.id,
                  username: list.author?.username || 'user',
                  display_name: list.author?.display_name || list.author?.username || 'User',
                  avatar_url: list.author?.avatar_url || list.author?.avatar,
                },
                engagement: {
                  likes: list.likes_count || 0,
                  saves: list.saves_count || 0,
                },
                created_at: list.created_at,
                restaurant_count: list.restaurant_count,
              });
            });
          }
        }
      } catch (e) {
        console.log('[TrendingWidget] Could not fetch lists');
      }

      // Fetch discovery requests
      try {
        const reqResponse = await fetch(
          `${API_BASE_URL}/discovery/requests?limit=${itemCount}&status=open`,
          { headers }
        );
        if (reqResponse.ok) {
          const reqData = await reqResponse.json();
          if (reqData.success && reqData.requests) {
            reqData.requests.forEach((req: any) => {
              results.push({
                id: req.id,
                type: 'request',
                title: req.title,
                subtitle: req.location || req.cuisine_type,
                author: {
                  id: req.creator?.id || req.creator_id,
                  username: req.creator?.username || 'user',
                  display_name: req.creator?.display_name || req.creator?.username || 'User',
                  avatar_url: req.creator?.avatar_url,
                },
                engagement: {
                  responses: req.response_count || 0,
                  comments: req.comments_count || 0,
                },
                created_at: req.created_at,
                location: req.location,
                has_bounty: (req.stake_amount || req.bounty_amount || 0) > 0,
                bounty_amount: req.stake_amount || req.bounty_amount || 0,
              });
            });
          }
        }
      } catch (e) {
        console.log('[TrendingWidget] Could not fetch requests');
      }

      // Sort by total engagement (likes + comments + responses + saves)
      results.sort((a, b) => {
        const aEngagement = (a.engagement.likes || 0) + (a.engagement.comments || 0) + 
                          (a.engagement.responses || 0) + (a.engagement.saves || 0);
        const bEngagement = (b.engagement.likes || 0) + (b.engagement.comments || 0) + 
                          (b.engagement.responses || 0) + (b.engagement.saves || 0);
        
        // If engagement is equal, sort by recency
        if (bEngagement === aEngagement) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return bEngagement - aEngagement;
      });

      // Take top items
      setTrendingItems(results.slice(0, itemCount));
      setIsLoading(false);

      if (results.length === 0) {
        setError('No trending content available');
      }

    } catch (err) {
      console.error('[TrendingWidget] Error in fallback fetch:', err);
      setError('Failed to load trending content');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingData();
  }, [fetchTrendingData]);

  // Get link for item based on type
  const getItemLink = (item: TrendingItem): string => {
    switch (item.type) {
      case 'recommendation':
        return `/recommendations/${item.id}`;
      case 'guide':
        return `/lists/${item.id}`;
      case 'request':
        return `/requests/${item.id}`;
      default:
        return '#';
    }
  };

  // Get primary engagement metric to display
  const getPrimaryEngagement = (item: TrendingItem): { icon: React.ElementType; count: number } => {
    switch (item.type) {
      case 'recommendation':
        return { icon: Heart, count: item.engagement.likes || 0 };
      case 'guide':
        return { icon: Heart, count: item.engagement.likes || 0 };
      case 'request':
        return { icon: MessageCircle, count: item.engagement.responses || 0 };
      default:
        return { icon: Heart, count: 0 };
    }
  };

  // Handle item click
  const handleItemClick = (item: TrendingItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  // Loading State
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm border border-gray-200 dark:border-[#3D3C4A] p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#FF644A]" />
          <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
            {t('sidebar.trending.title', { defaultValue: 'Trending' })}
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(itemCount)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-[#353444] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-[#353444] rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-[#353444] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error/Empty State
  if (error || trendingItems.length === 0) {
    return (
      <div className={`bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm border border-gray-200 dark:border-[#3D3C4A] p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#FF644A]" />
          <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
            {t('sidebar.trending.title', { defaultValue: 'Trending' })}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t('sidebar.trending.empty', { defaultValue: 'No trending content yet' })}
        </p>
      </div>
    );
  }

  // Main Render
  return (
    <div className={`bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm border border-gray-200 dark:border-[#3D3C4A] p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#FF644A]" />
        <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
          {t('sidebar.trending.title', { defaultValue: 'Trending' })}
        </h3>
      </div>

      {/* Trending Items */}
      <div className="space-y-3">
        {trendingItems.map((item) => {
          const typeConfig = TYPE_CONFIG[item.type];
          const TypeIcon = typeConfig.icon;
          const engagementInfo = getPrimaryEngagement(item);
          const EngagementIcon = engagementInfo.icon;

          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={getItemLink(item)}
              onClick={() => handleItemClick(item)}
              className="block border border-gray-100 dark:border-[#3D3C4A] rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {isImageUrl(item.author.avatar_url) ? (
                      <img
                        src={item.author.avatar_url!}
                        alt={item.author.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : item.author.avatar_url ? (
                      <span className="text-lg">{item.author.avatar_url}</span>
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {item.author.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Type Badge */}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${typeConfig.bgColor} flex items-center justify-center border-2 border-white dark:border-[#2D2C3A]`}>
                    <TypeIcon className={`w-2.5 h-2.5 ${typeConfig.color}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[#1F1E2A] dark:text-white text-sm line-clamp-1">
                    {item.title}
                  </h4>
                  
                  {item.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}

                  {/* Meta Row */}
                  <div className="flex items-center gap-2 mt-1">
                    {/* Engagement */}
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <EngagementIcon className="w-3 h-3" />
                      {formatEngagement(engagementInfo.count)}
                    </span>

                    {/* Bounty Badge for Requests */}
                    {item.type === 'request' && item.has_bounty && (
                      <span className="px-1.5 py-0.5 bg-[#FFD700]/20 text-[#B8860B] dark:text-[#FFD700] text-xs font-medium rounded">
                        🪙 {item.bounty_amount}
                      </span>
                    )}

                    {/* Time */}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}