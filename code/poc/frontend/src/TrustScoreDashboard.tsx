import React, { useState, useEffect, useCallback } from 'react';
import { Star, Users, Award, TrendingUp, Vote, Coins, Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api/v1';

// API Client
class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'x-user-id': 'user1'
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: { ...this.headers, ...options.headers },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

const apiClient = new ApiClient();

// Custom Hooks
function useApiCall<T>(apiCall: () => Promise<any>, deps: any[] = []) {
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

function useCurrentUser() {
  return useApiCall(() => apiClient.get('/users/me'), []);
}

function useProposals() {
  const { data, loading, error, refetch } = useApiCall(
    () => apiClient.get('/governance/proposals'),
    []
  );
  return { proposals: data, loading, error, refetch };
}

function useVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (proposalId: string, support: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post(`/governance/proposals/${proposalId}/vote`, {
        userId: 'user1',
        support
      });
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

function useCreateProposal() {
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
      const response = await apiClient.post('/governance/proposals', {
        ...proposal,
        userId: 'user1'
      });
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

function useStaking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = async (amount: number, duration: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post('/governance/stake', {
        userId: 'user1',
        amount,
        duration
      });
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
    () => apiClient.get('/governance/staking/user1'),
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

function useTokenBalance() {
  const { data, loading, error, refetch } = useApiCall(
    () => apiClient.get('/tokens/balance/user1'),
    []
  );
  return { balance: data?.balance, loading, error, refetch };
}

function useHealthCheck() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const result = await response.json();
        setHealth(result);
      } catch (error) {
        setHealth({ status: 'unhealthy', error: 'Failed to connect to API' });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return { health, loading };
}

function useWebSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(true);
    return () => setConnected(false);
  }, []);

  return { connected };
}

const TrustScoreDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'PARAMETER_CHANGE'
  });

  // API hooks
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const { proposals, loading: proposalsLoading, error: proposalsError, refetch: refetchProposals } = useProposals();
  const { vote, loading: voteLoading } = useVote();
  const { createProposal, loading: createLoading } = useCreateProposal();
  const { stake, stakingInfo, loading: stakingLoading } = useStaking();
  const { balance: tokenBalance, loading: balanceLoading } = useTokenBalance();
  const { health } = useHealthCheck();
  const { connected: wsConnected } = useWebSocket();

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading OmeoneChain...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (userError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <XCircle size={20} />
            <span className="font-medium">Connection Error</span>
          </div>
          <p className="text-red-700">{userError}</p>
          <p className="text-sm text-red-600 mt-2">
            Make sure the API server is running on port 3001
          </p>
        </div>
      </div>
    );
  }

  const handleVote = async (proposalId: string, support: boolean) => {
    const success = await vote(proposalId, support);
    if (success) {
      refetchProposals();
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposal.title || !newProposal.description) return;

    const result = await createProposal(newProposal);
    if (result) {
      setNewProposal({ title: '', description: '', category: 'PARAMETER_CHANGE' });
      refetchProposals();
    }
  };

  const handleStake = async (amount: number, duration: number) => {
    const success = await stake(amount, duration);
    if (success) {
      window.location.reload();
    }
  };

  const getStakingTier = (stakingInfo: any) => {
    if (!stakingInfo?.totalStaked) return 'No Stake';
    const amount = stakingInfo.totalStaked;
    if (amount >= 1000) return 'Validator Delegate';
    if (amount >= 100) return 'Curator';
    if (amount >= 25) return 'Explorer';
    return 'No Stake';
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className={`flex items-center space-x-1 ${health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
            {health?.status === 'healthy' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="text-sm capitalize">{health?.status || 'checking...'}</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">API Connection:</span>
            <span className={health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
              {health?.status === 'healthy' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">WebSocket:</span>
            <span className={wsConnected ? 'text-green-600' : 'text-yellow-600'}>
              {wsConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Trust Score Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Trust Score</h3>
          <div className="bg-blue-600 text-white rounded-full p-2">
            <Star size={20} fill="currentColor" />
          </div>
        </div>
        <div className="text-3xl font-bold text-blue-600 mb-2">
          {user?.reputation?.overallScore?.toFixed(1) || '8.6'}/10
        </div>
        <div className="text-sm text-gray-600 mb-3">
          Based on {user?.reputation?.totalRecommendations || 23} recommendations
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Quality Score:</span>
            <span className="text-blue-600 font-medium">
              {user?.reputation?.qualityScore?.toFixed(1) || '9.2'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Consistency:</span>
            <span className="text-blue-600 font-medium">
              {user?.reputation?.consistencyScore?.toFixed(1) || '8.8'}
            </span>
          </div>
        </div>
      </div>

      {/* Token Balance */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-sm border border-green-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Token Balance</h3>
          <div className="bg-green-600 text-white rounded-full p-2">
            <Coins size={20} />
          </div>
        </div>
        <div className="text-3xl font-bold text-green-600 mb-2">
          {balanceLoading ? '...' : (tokenBalance || user?.tokenBalance || 1250)} TOK
        </div>
        <div className="text-sm text-gray-600 mb-3">
          Earned from {user?.reputation?.totalRecommendations || 23} contributions
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Staked:</span>
            <span className="text-green-600 font-medium">
              {stakingInfo?.totalStaked || user?.stakingInfo?.totalStaked || 100} TOK
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tier:</span>
            <span className="text-green-600 font-medium">
              {getStakingTier(stakingInfo || user?.stakingInfo)}
            </span>
          </div>
        </div>
      </div>

      {/* Governance Participation */}
      <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-sm border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Governance Power</h3>
          <div className="bg-purple-600 text-white rounded-full p-2">
            <Vote size={20} />
          </div>
        </div>
        <div className="text-3xl font-bold text-purple-600 mb-2">
          {stakingInfo?.votingPower?.toFixed(1) || user?.stakingInfo?.votingPower?.toFixed(1) || '2.3'}%
        </div>
        <div className="text-sm text-gray-600 mb-3">
          of total voting power
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Proposals Created:</span>
            <span className="text-purple-600 font-medium">3</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Votes Cast:</span>
            <span className="text-purple-600 font-medium">12</span>
          </div>
        </div>
      </div>

      {/* Social Impact */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-sm border border-orange-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Social Impact</h3>
          <div className="bg-orange-600 text-white rounded-full p-2">
            <Users size={20} />
          </div>
        </div>
        <div className="text-3xl font-bold text-orange-600 mb-2">
          {user?.reputation?.socialImpact || 147}
        </div>
        <div className="text-sm text-gray-600 mb-3">
          people helped by your recommendations
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Followers:</span>
            <span className="text-orange-600 font-medium">34</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network Reach:</span>
            <span className="text-orange-600 font-medium">2.1k</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className="bg-gray-600 text-white rounded-full p-2">
            <Clock size={20} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Voted on "Fee Reduction Proposal"</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Earned 15 TOK for helpful tip</p>
              <p className="text-xs text-gray-500">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">Staked 25 TOK for Explorer tier</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGovernance = () => (
    <div className="space-y-6">
      {/* Create Proposal Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Proposal</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={newProposal.title}
              onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter proposal title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newProposal.description}
              onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your proposal..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={newProposal.category}
              onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PARAMETER_CHANGE">Parameter Change</option>
              <option value="TREASURY_SPEND">Treasury Spend</option>
              <option value="UPGRADE">System Upgrade</option>
              <option value="POLICY">Policy Change</option>
            </select>
          </div>
          <button
            onClick={handleCreateProposal}
            disabled={createLoading || !newProposal.title || !newProposal.description}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {createLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Vote size={16} />
                <span>Create Proposal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Proposals */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Proposals</h3>
        {proposalsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : proposalsError ? (
          <div className="text-red-600 text-center py-4">{proposalsError}</div>
        ) : !proposals || proposals.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No active proposals</div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal: any) => (
              <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{proposal.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    proposal.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    proposal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {proposal.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{proposal.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Votes: {proposal.totalVotes || 0}</span>
                    <span>Support: {proposal.supportPercentage?.toFixed(1) || '0'}%</span>
                  </div>
                  {proposal.status === 'ACTIVE' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={voteLoading}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Support
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={voteLoading}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Oppose
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staking Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Staking</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { tier: 'Explorer', amount: 25, duration: 1, benefits: 'Basic governance rights' },
            { tier: 'Curator', amount: 100, duration: 3, benefits: 'Proposal creation rights' },
            { tier: 'Passport', amount: 50, duration: 6, benefits: 'Premium features discount' },
            { tier: 'Validator', amount: 1000, duration: 12, benefits: 'Enhanced voting power' }
          ].map((tier) => (
            <div key={tier.tier} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{tier.tier}</h4>
              <p className="text-2xl font-bold text-blue-600 mb-1">{tier.amount} TOK</p>
              <p className="text-sm text-gray-600 mb-2">{tier.duration} month(s)</p>
              <p className="text-xs text-gray-500 mb-3">{tier.benefits}</p>
              <button
                onClick={() => handleStake(tier.amount, tier.duration)}
                disabled={stakingLoading}
                className="w-full bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Stake
              </button>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          Current stake: {stakingInfo?.totalStaked || 0} TOK | 
          Tier: {getStakingTier(stakingInfo)} | 
          Voting power: {stakingInfo?.votingPower?.toFixed(2) || '0.00'}%
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OmeoneChain</h1>
                <p className="text-sm text-gray-500">Trust Score Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-1 ${wsConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm">{wsConnected ? 'Live' : 'Connecting'}</span>
              </div>
              <div className="text-sm text-gray-600">
                User: {user?.id || 'user1'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'governance', label: 'Governance', icon: Vote }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'governance' && renderGovernance()}
      </main>
    </div>
  );
};

export default TrustScoreDashboard;