/**
 * useReputation.ts - React Hooks for Reputation Features
 * 
 * Location: code/poc/frontend/src/hooks/useReputation.ts
 * 
 * Custom hooks that integrate with the ReputationAPI service
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReputationAPI, { 
  UserReputation, 
  TrustScore, 
  SocialGraphAnalytics,
  DiscoveryScore,
  UserVerifications,
  RelationshipResult,
  ReputationAPIError,
  ClaimBonusRequest,
  VerificationSubmission
} from '../services/reputation-api';

// Generic hook state interface
interface HookState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook for managing user reputation data
export const useUserReputation = (userId: string | null) => {
  const [state, setState] = useState<HookState<UserReputation>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchReputation = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getUserReputation(userId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load reputation data';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId]);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  const updateProfile = useCallback(async (updates: {
    pseudonym?: string;
    specializations?: string[];
  }) => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.updateUserProfile(userId, updates);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to update profile';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [userId]);

  return {
    ...state,
    refetch: fetchReputation,
    updateProfile,
  };
};

// Hook for managing trust scores between users
export const useTrustScore = (sourceId: string | null, targetId: string | null) => {
  const [state, setState] = useState<HookState<TrustScore>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchTrustScore = useCallback(async () => {
    if (!sourceId || !targetId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getTrustScore(sourceId, targetId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load trust score';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [sourceId, targetId]);

  useEffect(() => {
    fetchTrustScore();
  }, [fetchTrustScore]);

  // Memoized trust level calculation
  const trustLevel = useMemo(() => {
    if (!state.data) return null;
    
    const score = state.data.trustScore;
    if (score >= 0.75) return { level: 'high', color: 'green', label: 'High Trust' };
    if (score >= 0.5) return { level: 'medium', color: 'blue', label: 'Medium Trust' };
    if (score >= 0.25) return { level: 'low', color: 'yellow', label: 'Low Trust' };
    return { level: 'none', color: 'gray', label: 'No Trust' };
  }, [state.data]);

  return {
    ...state,
    trustLevel,
    refetch: fetchTrustScore,
  };
};

// Hook for managing social graph data and relationships
export const useSocialGraph = (userId: string | null) => {
  const [analyticsState, setAnalyticsState] = useState<HookState<SocialGraphAnalytics>>({
    data: null,
    loading: false,
    error: null,
  });

  const [followingState, setFollowingState] = useState<HookState<RelationshipResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [followersState, setFollowersState] = useState<HookState<RelationshipResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch social graph analytics
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;

    setAnalyticsState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getSocialGraphAnalytics(userId);
      setAnalyticsState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load social graph analytics';
      setAnalyticsState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId]);

  // Fetch following relationships
  const fetchFollowing = useCallback(async (pagination = {}) => {
    if (!userId) return;

    setFollowingState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getFollowing(userId, pagination);
      setFollowingState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load following data';
      setFollowingState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId]);

  // Fetch followers
  const fetchFollowers = useCallback(async (pagination = {}) => {
    if (!userId) return;

    setFollowersState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getFollowers(userId, pagination);
      setFollowersState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load followers data';
      setFollowersState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId]);

  // Follow a user
  const followUser = useCallback(async (targetUserId: string) => {
    setActionLoading('follow');
    
    try {
      await ReputationAPI.followUser(targetUserId);
      // Refresh following and followers data
      await Promise.all([fetchFollowing(), fetchFollowers()]);
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    } finally {
      setActionLoading(null);
    }
  }, [fetchFollowing, fetchFollowers]);

  // Unfollow a user
  const unfollowUser = useCallback(async (targetUserId: string) => {
    setActionLoading('unfollow');
    
    try {
      await ReputationAPI.unfollowUser(targetUserId);
      // Refresh following and followers data
      await Promise.all([fetchFollowing(), fetchFollowers()]);
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    } finally {
      setActionLoading(null);
    }
  }, [fetchFollowing, fetchFollowers]);

  // Check if user is following another user
  const isFollowing = useCallback(async (currentUserId: string, targetUserId: string) => {
    try {
      return await ReputationAPI.isFollowing(currentUserId, targetUserId);
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
      fetchFollowing();
      fetchFollowers();
    }
  }, [userId, fetchAnalytics, fetchFollowing, fetchFollowers]);

  return {
    analytics: analyticsState,
    following: followingState,
    followers: followersState,
    actionLoading,
    followUser,
    unfollowUser,
    isFollowing,
    refetchAnalytics: fetchAnalytics,
    refetchFollowing: fetchFollowing,
    refetchFollowers: fetchFollowers,
  };
};

// Hook for managing discovery incentives
export const useDiscoveryIncentives = (
  userId: string | null, 
  filters: { region?: string; category?: string } = {}
) => {
  const [state, setState] = useState<HookState<DiscoveryScore>>({
    data: null,
    loading: false,
    error: null,
  });

  const [claimLoading, setClaimLoading] = useState<string | null>(null);

  const fetchDiscoveryScore = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getDiscoveryScore(userId, filters);
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load discovery incentives';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId, filters]);

  const claimBonus = useCallback(async (claimData: ClaimBonusRequest) => {
    if (!userId) return;

    setClaimLoading(claimData.campaignId);
    
    try {
      const result = await ReputationAPI.claimDiscoveryBonus(userId, claimData);
      // Refresh discovery data after claiming
      await fetchDiscoveryScore();
      return result;
    } catch (error) {
      console.error('Error claiming bonus:', error);
      throw error;
    } finally {
      setClaimLoading(null);
    }
  }, [userId, fetchDiscoveryScore]);

  // Compute claimable bonuses
  const claimableBonuses = useMemo(() => {
    if (!state.data) return [];
    
    return state.data.activeIncentives.filter(
      incentive => incentive.currentProgress >= incentive.targetRecommendations
    ).map(incentive => ({
      campaignId: incentive.campaignId,
      bonusAmount: incentive.bonusMultiplier * incentive.currentProgress,
      recommendationIds: [], // Would need to be fetched from backend
      eligibleAt: new Date().toISOString(),
    }));
  }, [state.data]);

  useEffect(() => {
    fetchDiscoveryScore();
  }, [fetchDiscoveryScore]);

  return {
    ...state,
    claimableBonuses,
    claimLoading,
    claimBonus,
    refetch: fetchDiscoveryScore,
  };
};

// Hook for managing user verifications
export const useUserVerifications = (userId: string | null) => {
  const [state, setState] = useState<HookState<UserVerifications>>({
    data: null,
    loading: false,
    error: null,
  });

  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchVerifications = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getUserVerifications(userId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load verifications';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [userId]);

  const submitVerification = useCallback(async (
    targetUserId: string, 
    verification: VerificationSubmission
  ) => {
    setSubmitLoading(true);
    
    try {
      const result = await ReputationAPI.submitVerification(targetUserId, verification);
      // Refresh verifications after submission
      await fetchVerifications();
      return result;
    } catch (error) {
      console.error('Error submitting verification:', error);
      throw error;
    } finally {
      setSubmitLoading(false);
    }
  }, [fetchVerifications]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  return {
    ...state,
    submitLoading,
    submitVerification,
    refetch: fetchVerifications,
  };
};

// Hook for batch trust score operations
export const useBatchTrustScores = (sourceId: string | null, targetIds: string[]) => {
  const [state, setState] = useState<HookState<Array<TrustScore | null>>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchBatchTrustScores = useCallback(async () => {
    if (!sourceId || targetIds.length === 0) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.batchGetTrustScores(sourceId, targetIds);
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load trust scores';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [sourceId, targetIds]);

  useEffect(() => {
    fetchBatchTrustScores();
  }, [fetchBatchTrustScores]);

  return {
    ...state,
    refetch: fetchBatchTrustScores,
  };
};

// Hook for recommendation mode statistics (for Trust Mode toggle)
export const useRecommendationModeStats = () => {
  const [state, setState] = useState<HookState<{
    trustRecommendations: number;
    globalRecommendations: number;
    averageTrustScore: number;
    socialConnections: number;
  }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await ReputationAPI.getRecommendationModeStats();
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof ReputationAPIError 
        ? error.message 
        : 'Failed to load recommendation stats';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...state,
    refetch: fetchStats,
  };
};