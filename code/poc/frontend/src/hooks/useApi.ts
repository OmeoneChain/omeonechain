// code/poc/frontend/src/hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  governanceApi, 
  userApi, 
  tokenApi, 
  recommendationApi, 
  healthApi,
  wsService 
} from '../services/api';

// Generic hook for API calls
export function useApiCall<T>(apiCall: () => Promise<any>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Governance hooks
export function useProposals() {
  const { data, loading, error, refetch } = useApiCall(
    () => governanceApi.getProposals(),
    []
  );

  // Listen for real-time updates
  useEffect(() => {
    const handleProposalCreated = () => refetch();
    window.addEventListener('proposalCreated', handleProposalCreated);
    return () => window.removeEventListener('proposalCreated', handleProposalCreated);
  }, [refetch]);

  return { proposals: data, loading, error, refetch };
}

export function useProposal(id: string) {
  const { data, loading, error, refetch } = useApiCall(
    () => governanceApi.getProposal(id),
    [id]
  );

  // Listen for vote updates
  useEffect(() => {
    const handleVoteCast = (event: any) => {
      if (event.detail.proposalId === id) {
        refetch();
      }
    };
    window.addEventListener('voteCast', handleVoteCast);
    return () => window.removeEventListener('voteCast', handleVoteCast);
  }, [id, refetch]);

  return { proposal: data, loading, error, refetch };
}

export function useVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (proposalId: string, support: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const response = await governanceApi.vote(proposalId, support);
      if (!response.success) {
        setError(response.error || 'Failed to vote');
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { vote, loading, error };
}

export function useCreateProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = async (proposal: {
    title: string;
    description: string;
    category: string;
    executionParams?: any;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await governanceApi.createProposal(proposal);
      if (!response.success) {
        setError(response.error || 'Failed to create proposal');
        return null;
      }
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createProposal, loading, error };
}

export function useStaking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = async (amount: number, duration: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await governanceApi.stake(amount, duration);
      if (!response.success) {
        setError(response.error || 'Failed to stake');
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const { data: stakingInfo, loading: stakingLoading, error: stakingError, refetch } = useApiCall(
    () => governanceApi.getStakingInfo(),
    []
  );

  return { 
    stake, 
    loading, 
    error, 
    stakingInfo, 
    stakingLoading, 
    stakingError,
    refetchStaking: refetch
  };
}

// User hooks
export function useCurrentUser() {
  const { data, loading, error, refetch } = useApiCall(
    () => userApi.getCurrentUser(),
    []
  );

  // Listen for token rewards
  useEffect(() => {
    const handleTokenReward = () => refetch();
    window.addEventListener('tokenReward', handleTokenReward);
    return () => window.removeEventListener('tokenReward', handleTokenReward);
  }, [refetch]);

  return { user: data, loading, error, refetch };
}

export function useTrustScore(userId?: string) {
  const { data, loading, error, refetch } = useApiCall(
    () => userId ? userApi.getTrustScore(userId) : Promise.resolve({ success: false }),
    [userId]
  );

  return { trustScore: data, loading, error, refetch };
}

// Token hooks
export function useTokenBalance() {
  const { data, loading, error, refetch } = useApiCall(
    () => tokenApi.getBalance(),
    []
  );

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = () => refetch();
    window.addEventListener('tokenReward', handleBalanceUpdate);
    window.addEventListener('tokenTransfer', handleBalanceUpdate);
    return () => {
      window.removeEventListener('tokenReward', handleBalanceUpdate);
      window.removeEventListener('tokenTransfer', handleBalanceUpdate);
    };
  }, [refetch]);

  return { balance: data?.balance, loading, error, refetch };
}

export function useTokenTransfer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = async (to: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await tokenApi.transfer(to, amount);
      if (!response.success) {
        setError(response.error || 'Failed to transfer tokens');
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { transfer, loading, error };
}

// Recommendations hooks
export function useRecommendations(filters?: {
  category?: string;
  location?: string;
  limit?: number;
}) {
  const { data, loading, error, refetch } = useApiCall(
    () => recommendationApi.getRecommendations(filters),
    [filters?.category, filters?.location, filters?.limit]
  );

  return { recommendations: data, loading, error, refetch };
}

export function useCreateRecommendation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRecommendation = async (recommendation: {
    serviceId: string;
    rating: number;
    content: string;
    tags?: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await recommendationApi.createRecommendation(recommendation);
      if (!response.success) {
        setError(response.error || 'Failed to create recommendation');
        return null;
      }
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createRecommendation, loading, error };
}

// Health check hook
export function useHealthCheck() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await healthApi.check();
        setHealth(result);
      } catch (error) {
        setHealth({ status: 'unhealthy', error: 'Failed to connect to API' });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { health, loading };
}

// WebSocket connection hook
export function useWebSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect WebSocket when component mounts
    wsService.connect();

    // Listen for connection status
    const handleOpen = () => setConnected(true);
    const handleClose = () => setConnected(false);

    // Note: These would need to be implemented in the WebSocket service
    // For now, we'll simulate connection status
    setConnected(true);

    return () => {
      wsService.disconnect();
      setConnected(false);
    };
  }, []);

  return { connected };
}