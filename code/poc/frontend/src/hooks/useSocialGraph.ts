/**
 * useSocialGraph.ts - Specialized Social Graph Hook
 * 
 * Location: code/poc/frontend/src/hooks/useSocialGraph.ts
 * 
 * Specialized hook for advanced social graph operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReputationAPI, { 
  SocialGraphAnalytics, 
  FollowRelationship,
  RelationshipResult,
  ReputationAPIError 
} from '../services/reputation-api';

// Extended social graph state
interface SocialGraphState {
  analytics: SocialGraphAnalytics | null;
  following: RelationshipResult | null;
  followers: RelationshipResult | null;
  loading: boolean;
  error: string | null;
  actionLoading: string | null;
}

// Social connection with enhanced data
interface EnhancedConnection extends FollowRelationship {
  isDirectConnection: boolean;
  trustLevel: 'high' | 'medium' | 'low' | 'none';
  connectionStrength: number;
}

// Network insights computed from social graph data
interface NetworkInsights {
  strongConnections: number;
  weekConnections: number;
  topRegions: Array<{ region: string; percentage: number }>;
  topInterests: Array<{ category: string; connections: number }>;
  networkHealth: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  recommendations: string[];
}

export const useSocialGraph = (userId: string | null, options: {
  autoFetch?: boolean;
  includeAnalytics?: boolean;
  paginationLimit?: number;
} = {}) => {
  const {
    autoFetch = true,
    includeAnalytics = true,
    paginationLimit = 20
  } = options;

  const [state, setState] = useState<SocialGraphState>({
    analytics: null,
    following: null,
    followers: null,
    loading: false,
    error: null,
    actionLoading: null,
  });

  // Cache for follow status checks
  const [followStatusCache, setFollowStatusCache] = useState<Map<string, boolean>>(new Map());

  // Fetch all social graph data
  const fetchSocialData = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const promises: Promise<any>[] = [
        ReputationAPI.getFollowing(userId, { limit: paginationLimit }),
        ReputationAPI.getFollowers(userId, { limit: paginationLimit }),
      ];

      if (includeAnalytics) {
        promises.push(ReputationAPI.getSocialGraphAnalytics(userId));
      }

      const results = await Promise.all(promises);
      
      setState(prev => ({
        ...prev,
        following: results[0],
        followers: results[1],
        analytics: includeAnalytics ? results[2] : prev.analytics,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load social graph data';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
    }
  }, [userId, includeAnalytics, paginationLimit]);

  // Follow a user with optimistic updates
  const followUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;

    setState(prev => ({ ...prev, actionLoading: 'follow' }));

    try {
      // Optimistic update
      setFollowStatusCache(prev => new Map(prev).set(targetUserId, true));
      
      await ReputationAPI.followUser(targetUserId);
      
      // Refresh data
      await fetchSocialData();
      
      setState(prev => ({ ...prev, actionLoading: null }));
      return true;
    } catch (error) {
      // Revert optimistic update
      setFollowStatusCache(prev => new Map(prev).set(targetUserId, false));
      
      setState(prev => ({ ...prev, actionLoading: null }));
      console.error('Error following user:', error);
      return false;
    }
  }, [userId, fetchSocialData]);

  // Unfollow a user with optimistic updates
  const unfollowUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;

    setState(prev => ({ ...prev, actionLoading: 'unfollow' }));

    try {
      // Optimistic update
      setFollowStatusCache(prev => new Map(prev).set(targetUserId, false));
      
      await ReputationAPI.unfollowUser(targetUserId);
      
      // Refresh data
      await fetchSocialData();
      
      setState(prev => ({ ...prev, actionLoading: null }));
      return true;
    } catch (error) {
      // Revert optimistic update
      setFollowStatusCache(prev => new Map(prev).set(targetUserId, true));
      
      setState(prev => ({ ...prev, actionLoading: null }));
      console.error('Error unfollowing user:', error);
      return false;
    }
  }, [userId, fetchSocialData]);

  // Check if current user is following target user
  const isFollowing = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;

    // Check cache first
    if (followStatusCache.has(targetUserId)) {
      return followStatusCache.get(targetUserId)!;
    }

    try {
      const result = await ReputationAPI.isFollowing(userId, targetUserId);
      setFollowStatusCache(prev => new Map(prev).set(targetUserId, result));
      return result;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }, [userId, followStatusCache]);

  // Load more following/followers with pagination
  const loadMoreFollowing = useCallback(async () => {
    if (!userId || !state.following) return;

    try {
      const nextOffset = state.following.relationships.length;
      const moreData = await ReputationAPI.getFollowing(userId, {
        offset: nextOffset,
        limit: paginationLimit
      });

      setState(prev => ({
        ...prev,
        following: prev.following ? {
          ...moreData,
          relationships: [...prev.following.relationships, ...moreData.relationships]
        } : moreData
      }));
    } catch (error) {
      console.error('Error loading more following:', error);
    }
  }, [userId, state.following, paginationLimit]);

  const loadMoreFollowers = useCallback(async () => {
    if (!userId || !state.followers) return;

    try {
      const nextOffset = state.followers.relationships.length;
      const moreData = await ReputationAPI.getFollowers(userId, {
        offset: nextOffset,
        limit: paginationLimit
      });

      setState(prev => ({
        ...prev,
        followers: prev.followers ? {
          ...moreData,
          relationships: [...prev.followers.relationships, ...moreData.relationships]
        } : moreData
      }));
    } catch (error) {
      console.error('Error loading more followers:', error);
    }
  }, [userId, state.followers, paginationLimit]);

  // Enhanced connections with trust analysis
  const enhancedFollowing = useMemo((): EnhancedConnection[] => {
    if (!state.following) return [];

    return state.following.relationships.map(rel => {
      const trustLevel = rel.trustWeight >= 0.75 ? 'high' :
                        rel.trustWeight >= 0.5 ? 'medium' :
                        rel.trustWeight >= 0.25 ? 'low' : 'none';

      return {
        ...rel,
        isDirectConnection: rel.distance === 1,
        trustLevel,
        connectionStrength: rel.trustWeight * (rel.distance === 1 ? 1 : 0.5),
      };
    });
  }, [state.following]);

  const enhancedFollowers = useMemo((): EnhancedConnection[] => {
    if (!state.followers) return [];

    return state.followers.relationships.map(rel => {
      const trustLevel = rel.trustWeight >= 0.75 ? 'high' :
                        rel.trustWeight >= 0.5 ? 'medium' :
                        rel.trustWeight >= 0.25 ? 'low' : 'none';

      return {
        ...rel,
        isDirectConnection: rel.distance === 1,
        trustLevel,
        connectionStrength: rel.trustWeight * (rel.distance === 1 ? 1 : 0.5),
      };
    });
  }, [state.followers]);

  // Compute network insights
  const networkInsights = useMemo((): NetworkInsights => {
    const strongConnections = enhancedFollowing.filter(c => c.trustLevel === 'high').length;
    const weekConnections = enhancedFollowing.filter(c => c.trustLevel === 'low').length;
    
    const topRegions = state.analytics?.geographicDistribution.slice(0, 3) || [];
    const topInterests = state.analytics?.interestClusters.slice(0, 3) || [];
    
    // Network health calculation
    const totalConnections = enhancedFollowing.length;
    const healthScore = totalConnections > 0 ? strongConnections / totalConnections : 0;
    
    const networkHealth = healthScore >= 0.6 ? 'excellent' :
                         healthScore >= 0.4 ? 'good' :
                         healthScore >= 0.2 ? 'fair' : 'needs_improvement';

    // Generate recommendations
    const recommendations: string[] = [];
    if (strongConnections < 5) {
      recommendations.push('Follow more users to build stronger connections');
    }
    if (topRegions.length === 0) {
      recommendations.push('Add location tags to connect with local users');
    }
    if (topInterests.length < 2) {
      recommendations.push('Engage with diverse content categories');
    }
    if (state.analytics?.density && state.analytics.density < 0.1) {
      recommendations.push('Your network could benefit from more interconnected users');
    }

    return {
      strongConnections,
      weekConnections,
      topRegions,
      topInterests,
      networkHealth,
      recommendations,
    };
  }, [enhancedFollowing, state.analytics]);

  // Network statistics
  const networkStats = useMemo(() => {
    const totalFollowing = state.following?.total || 0;
    const totalFollowers = state.followers?.total || 0;
    const networkSize = state.analytics?.networkSize || 0;
    const influence = state.analytics?.influenceScore || 0;

    return {
      totalFollowing,
      totalFollowers,
      networkSize,
      influence,
      ratio: totalFollowing > 0 ? totalFollowers / totalFollowing : 0,
      isInfluencer: totalFollowers > 100 && totalFollowers > totalFollowing * 2,
      isConnector: networkSize > 50 && influence > 0.5,
    };
  }, [state.following, state.followers, state.analytics]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && userId) {
      fetchSocialData();
    }
  }, [autoFetch, userId, fetchSocialData]);

  return {
    // Raw state
    ...state,
    
    // Enhanced data
    enhancedFollowing,
    enhancedFollowers,
    networkInsights,
    networkStats,
    
    // Actions
    followUser,
    unfollowUser,
    isFollowing,
    loadMoreFollowing,
    loadMoreFollowers,
    
    // Utilities
    refetch: fetchSocialData,
    
    // Computed flags
    hasMoreFollowing: state.following ? state.following.relationships.length < state.following.total : false,
    hasMoreFollowers: state.followers ? state.followers.relationships.length < state.followers.total : false,
    
    // Cache management
    clearFollowCache: () => setFollowStatusCache(new Map()),
  };
};

export default useSocialGraph;