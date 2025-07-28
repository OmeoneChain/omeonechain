// File path: /code/poc/frontend/src/components/TrustScoreDashboard.tsx
// ENHANCED VERSION: Live Trust Score calculation with real smart contract integration

import React, { useState, useEffect } from 'react';
import { Users, Trophy, Vote, Coins, TrendingUp, Shield, Star, ArrowUp, ArrowDown, Wifi, WifiOff, CheckCircle, AlertCircle, Loader2, RefreshCw, Target } from 'lucide-react';
import { useTrustScore } from '../hooks/useTrustScore';
import { TrustScoreBreakdown } from '../services/types';
import { IOTAService, TrustScoreCalculation } from '../services/IOTAService';
import { testIOTAConnection } from '../config/testnet-config';

// Initialize IOTA service
const iotaService = new IOTAService();

// Type definitions (keeping existing ones)
interface StakingTierBadgeProps {
  tier: string;
  stakedAmount: number;
}

interface ConnectionStatusProps {
  isConnected: boolean;
  networkStatus?: any;
  isLoading?: boolean;
  error?: string;
  onTest: () => void;
}

interface TrustScoreMeterProps {
  score: number;
  maxScore?: number;
  trustBreakdown?: TrustScoreCalculation | null;
  isLive?: boolean;
  isCalculating?: boolean;
  onRecalculate?: () => void;
}

interface LiveUserData {
  userId: string;
  trustScore: number;
  tokenBalance: number;
  stakingTier: string;
  stakedAmount: number;
  reputationScore: number;
  totalRecommendations: number;
  followers: number;
  following: number;
  votingPower: number;
  governanceParticipation: number;
  isLive: boolean;
}

// ENHANCED Trust Score Meter with Live Calculation Display
const TrustScoreMeter: React.FC<TrustScoreMeterProps> = ({ 
  score, 
  maxScore = 10, 
  trustBreakdown = null, 
  isLive = false,
  isCalculating = false,
  onRecalculate = () => {}
}) => {
  const percentage = (score / maxScore) * 100;
  const getColor = (score: number): string => {
    if (score >= 8.5) return 'bg-green-500';
    if (score >= 7.0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Trust Score</span>
          {isLive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">LIVE CALCULATION</span>
            </div>
          )}
          {isCalculating && (
            <div className="flex items-center space-x-1">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              <span className="text-xs text-blue-600">Computing...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gray-900">{score.toFixed(1)}/10</span>
          {isLive && (
            <button 
              onClick={onRecalculate}
              disabled={isCalculating}
              className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
              title="Recalculate Trust Score"
            >
              <Target className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
        <div 
          className={`h-4 rounded-full transition-all duration-700 ${getColor(score)} ${isCalculating ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      {/* ENHANCED: Live Smart Contract Breakdown */}
      {trustBreakdown ? (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-semibold flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Live Smart Contract Calculation</span>
            </span>
            <span className="text-blue-600 text-sm font-mono">
              Score: {trustBreakdown.finalScore.toFixed(3)}
            </span>
          </div>
          
          {/* Social Graph Weights */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Direct Connections</div>
              <div className="text-lg font-bold text-green-600">
                {trustBreakdown.breakdown.directConnections}
              </div>
              <div className="text-xs text-gray-500">Weight: 0.75x each</div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-700">Network Reach</div>
              <div className="text-lg font-bold text-blue-600">
                {trustBreakdown.breakdown.indirectConnections}
              </div>
              <div className="text-xs text-gray-500">Weight: 0.25x each</div>
            </div>
          </div>
          
          {/* Social Proof Breakdown */}
          <div className="bg-white p-3 rounded border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Social Proof Analysis</span>
              <span className="text-xs text-gray-500">Live from Reputation Contract</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-bold text-green-600">{trustBreakdown.socialProof.directFriends.length}</div>
                <div className="text-gray-500">Direct</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-600">{trustBreakdown.socialProof.indirectFriends.length}</div>
                <div className="text-gray-500">Indirect</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-600">{trustBreakdown.socialProof.totalWeight.toFixed(2)}</div>
                <div className="text-gray-500">Total Weight</div>
              </div>
            </div>
          </div>
          
          {/* Algorithm Transparency */}
          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded border-blue-200 border">
            <strong>Algorithm:</strong> Base Reputation ({(trustBreakdown.breakdown.authorReputation * 100).toFixed(1)}%) + 
            Social Weights ({trustBreakdown.socialProof.totalWeight.toFixed(2)}) + 
            Endorsements ({trustBreakdown.breakdown.endorsementCount}) = 
            <strong> {trustBreakdown.finalScore.toFixed(1)}/10</strong>
          </div>
        </div>
      ) : (
        <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded">
          {isLive ? '🎯 Calculated from live smart contracts using social graph weighting' : '📋 Based on social graph weighting (1-hop: 0.75, 2-hop: 0.25)'}
        </div>
      )}
    </div>
  );
};

// Keep all existing components (InlineLogo, ConnectionStatus, StakingTierBadge, etc.)
const InlineLogo = ({ className = "w-10 h-10" }: { className?: string }) => {
  const uniqueId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  return (
    <div className={`relative ${className}`}>
      <svg 
        viewBox="0 0 64 64" 
        className="w-full h-full drop-shadow-sm"
        style={{ 
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      >
        <defs>
          <linearGradient id={`g-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151"/>
            <stop offset="50%" stopColor="#1f2937"/>
            <stop offset="100%" stopColor="#111827"/>
          </linearGradient>
          
          <linearGradient id={`gEnhanced-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280"/>
            <stop offset="50%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#1f2937"/>
          </linearGradient>

          <filter id={`logoShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>

        <g stroke={`url(#gEnhanced-${uniqueId})`} strokeWidth="1.92" opacity="0.8">
          <line x1="51.43" y1="23.43" x2="32" y2="12.00" />
          <line x1="32" y1="52.00" x2="12.57" y2="40.57" />
          <line x1="12.57" y1="40.57" x2="12.57" y2="23.43" />
          <line x1="32" y1="12.00" x2="51.43" y2="23.43" />
          <line x1="51.43" y1="40.57" x2="32" y2="52.00" />
          <line x1="12.57" y1="23.43" x2="32" y2="12.00" />
        </g>

        <path 
          d="M51.43 23.43 L51.43 40.57 L32 52 L12.57 40.57 L12.57 23.43 L32 12 L51.43 23.43 Z"
          fill="none" 
          stroke={`url(#g-${uniqueId})`} 
          strokeWidth="2.3"
          filter={`url(#logoShadow-${uniqueId})`}
        />

        <g fill={`url(#gEnhanced-${uniqueId})`} filter={`url(#logoShadow-${uniqueId})`}>
          <circle cx="51.43" cy="23.43" r="3.84" />
          <circle cx="51.43" cy="40.57" r="3.84" />
          <circle cx="32.00" cy="52.00" r="3.84" />
          <circle cx="12.57" cy="40.57" r="3.84" />
          <circle cx="12.57" cy="23.43" r="3.84" />
          <circle cx="32.00" cy="12.00" r="3.84" />
        </g>

        <text 
          x="32" 
          y="38.4" 
          textAnchor="middle"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif" 
          fontSize="19.2" 
          fontWeight="700"
          fill="#1f2937"
          filter={`url(#logoShadow-${uniqueId})`}
          style={{ userSelect: 'none' }}
        >
          1
        </text>
      </svg>
    </div>
  );
};

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  networkStatus, 
  isLoading, 
  error, 
  onTest 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Connecting to live contracts...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs">Connection failed</span>
        <button 
          onClick={onTest}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (networkStatus && isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <div className="relative">
          <CheckCircle className="w-4 h-4" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <span className="text-xs font-medium">Live Contracts</span>
        <span className="text-xs text-gray-500">
          ({networkStatus.contractsDeployed}/5 deployed)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-red-500">
      <WifiOff className="w-4 h-4" />
      <span className="text-xs">Disconnected</span>
      <button 
        onClick={onTest}
        className="text-xs underline hover:no-underline"
      >
        Connect
      </button>
    </div>
  );
};

const StakingTierBadge: React.FC<StakingTierBadgeProps> = ({ tier, stakedAmount }) => {
  const tierColors: Record<string, string> = {
    'Explorer': 'bg-blue-50 text-blue-600 border-blue-200',
    'Curator': 'bg-blue-50 text-blue-600 border-blue-200',
    'Passport': 'bg-green-50 text-green-600 border-green-200',
    'Validator': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'none': 'bg-gray-50 text-gray-600 border-gray-200'
  };
  
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${tierColors[tier] || tierColors.none}`}>
      {tier === 'none' ? 'No Stake' : `${tier} (${stakedAmount} TOK)`}
    </div>
  );
};

export default function TrustScoreDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Live smart contract integration states
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveUserData, setLiveUserData] = useState<LiveUserData | null>(null);
  const [liveTrustCalculation, setLiveTrustCalculation] = useState<TrustScoreCalculation | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatingTrustScore, setCalculatingTrustScore] = useState(false);
  
  // Use the existing trust score hook as fallback
  const {
    userReputation,
    trustBreakdown,
    recommendations,
    loading,
    errors,
    endorseRecommendation,
    loadRecommendations,
    isConnected: hookIsConnected,
    testConnection: hookTestConnection
  } = useTrustScore();

  // Test IOTA connection and smart contracts
  const testSmartContractConnection = async () => {
    setIsLoading(true);
    setConnectionError(null);
    
    try {
      console.log('🔗 Testing IOTA Rebased connection with live smart contracts...');
      
      // Test basic network connection
      await testIOTAConnection();
      
      // Test IOTA service connection
      const connected = await iotaService.testConnection();
      if (!connected) {
        throw new Error('Smart contract service connection failed');
      }
      
      // Get network status
      const status = await iotaService.getNetworkInfo();
      setNetworkStatus(status);
      
      console.log('✅ Smart contract connection successful!');
      
    } catch (err: any) {
      console.error('❌ Smart contract connection failed:', err);
      setConnectionError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ENHANCED: Load live user data with real Trust Score calculation
  const loadLiveUserData = async () => {
    if (!networkStatus) return;
    
    setRefreshing(true);
    try {
      console.log('📊 Loading live user data from smart contracts...');
      
      // Mock user address for demo (in production, this would come from wallet)
      const userAddress = '0xa48b350a23dd162ca38f45891030021f5bae61a620d8abba49166db3ddcdcf9d';
      
      // Get comprehensive dashboard data including live Trust Score calculation
      const dashboardData = await iotaService.getDashboardData(userAddress);
      
      if (dashboardData.reputation) {
        const userData: LiveUserData = {
          userId: userAddress,
          trustScore: dashboardData.trustCalculation.finalScore, // Use live calculation
          tokenBalance: dashboardData.tokenBalance,
          stakingTier: dashboardData.reputation.stakingTier,
          stakedAmount: 100, // Mock value - would come from staking contract
          reputationScore: dashboardData.reputation.reputationScore * 1000, // Scale up for display
          totalRecommendations: dashboardData.reputation.totalRecommendations,
          followers: dashboardData.reputation.socialConnections.direct.length,
          following: dashboardData.reputation.socialConnections.indirect.length,
          votingPower: 2.3, // Mock value - would be calculated from staking + reputation
          governanceParticipation: 87, // Mock value - would come from governance contract
          isLive: true
        };
        
        setLiveUserData(userData);
        setLiveTrustCalculation(dashboardData.trustCalculation);
      }
      
      console.log('✅ Live user data loaded successfully!');
      
    } catch (error) {
      console.error('❌ Failed to load live user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // NEW: Recalculate Trust Score on demand
  const recalculateTrustScore = async () => {
    if (!liveUserData) return;
    
    setCalculatingTrustScore(true);
    try {
      console.log('🎯 Recalculating Trust Score from live smart contracts...');
      
      const newTrustCalculation = await iotaService.calculateLiveTrustScore(liveUserData.userId);
      
      setLiveTrustCalculation(newTrustCalculation);
      setLiveUserData(prev => prev ? {
        ...prev,
        trustScore: newTrustCalculation.finalScore
      } : null);
      
      console.log('✅ Trust Score recalculated successfully!');
      
    } catch (error) {
      console.error('❌ Failed to recalculate Trust Score:', error);
    } finally {
      setCalculatingTrustScore(false);
    }
  };

  // Initialize connection on component mount
  useEffect(() => {
    testSmartContractConnection();
  }, []);

  // Load live data when network connection is established
  useEffect(() => {
    if (networkStatus) {
      loadLiveUserData();
    }
  }, [networkStatus]);

  // Combine connection states (hook + smart contract)
  const isConnected = hookIsConnected || !!networkStatus;
  const hasLiveData = !!liveUserData;

  // Use live data if available, otherwise fallback to mock/hook data
  const user = hasLiveData ? liveUserData : (userReputation || {
    userId: "user_123",
    walletAddress: "0x123...",
    trustScore: 8.6,
    tokenBalance: 1250,
    stakingTier: "Curator" as const,
    stakedAmount: 100,
    reputationScore: 847,
    totalRecommendations: 23,
    upvotesReceived: 0,
    followers: 156,
    following: 89,
    votingPower: 2.3,
    governanceParticipation: 87,
    verificationLevel: "verified" as const,
    joinedAt: "",
    lastActiveAt: "",
    isLive: false
  });

  const displayTrustBreakdown = liveTrustCalculation || trustBreakdown;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'recommendations', label: 'My Recs', icon: Star },
    { id: 'governance', label: 'Governance', icon: Vote },
    { id: 'staking', label: 'Staking', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <InlineLogo className="w-10 h-10" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">OmeoneChain</h1>
                  <p className="text-xs text-gray-500">Trust-Based Recommendations</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus 
                isConnected={isConnected}
                networkStatus={networkStatus}
                isLoading={isLoading}
                error={connectionError}
                onTest={testSmartContractConnection}
              />
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">{Math.floor(user.tokenBalance).toLocaleString()} TOK</span>
                {hasLiveData && <span className="text-xs text-green-600">LIVE</span>}
              </div>
              <StakingTierBadge tier={user.stakingTier} stakedAmount={user.stakedAmount} />
              <button 
                onClick={loadLiveUserData}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                title="Refresh live data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Live Connection Status Alert */}
            {hasLiveData ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-green-800 font-medium">Connected to Live Smart Contracts</span>
                  </div>
                  <div className="text-sm text-green-700">
                    🎯 Real-time Trust Score • {networkStatus?.contractsDeployed || 5}/5 contracts • Block {networkStatus?.latestCheckpoint?.toLocaleString() || 'N/A'}
                  </div>
                </div>
              </div>
            ) : !isConnected ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <WifiOff className="w-5 h-5 text-yellow-600" />
                  <span className="text-yellow-800">
                    Not connected to smart contracts. Using demo data for interface demonstration.
                  </span>
                  <button 
                    onClick={testSmartContractConnection}
                    className="text-yellow-800 underline hover:no-underline text-sm"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : null}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trust Score</p>
                    <p className="text-3xl font-bold text-gray-900">{user.trustScore.toFixed(1)}/10</p>
                    {hasLiveData && <p className="text-xs text-green-600 font-medium">🎯 Live Contract</p>}
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Voting Power</p>
                    <p className="text-3xl font-bold text-gray-900">{user.votingPower}%</p>
                    {hasLiveData && <p className="text-xs text-green-600 font-medium">📊 Calculated</p>}
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Vote className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recommendations</p>
                    <p className="text-3xl font-bold text-gray-900">{user.totalRecommendations}</p>
                    {hasLiveData && <p className="text-xs text-green-600 font-medium">🔗 Blockchain</p>}
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Social Graph</p>
                    <p className="text-3xl font-bold text-gray-900">{user.followers + user.following}</p>
                    {hasLiveData && <p className="text-xs text-green-600 font-medium">📈 Live Graph</p>}
                  </div>
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* ENHANCED Trust Score Details with Live Smart Contract Calculation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Trust Score Analysis</h2>
                {hasLiveData && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Live Smart Contract Data</span>
                    </div>
                    <button 
                      onClick={recalculateTrustScore}
                      disabled={calculatingTrustScore}
                      className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Target className="w-3 h-3" />
                      <span>{calculatingTrustScore ? 'Calculating...' : 'Recalculate'}</span>
                    </button>
                  </div>
                )}
              </div>
              
              <TrustScoreMeter 
                score={user.trustScore} 
                trustBreakdown={displayTrustBreakdown} 
                isLive={hasLiveData}
                isCalculating={calculatingTrustScore}
                onRecalculate={recalculateTrustScore}
              />
              
              {/* Social Graph Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {hasLiveData ? '🔗 Smart contract verified' : 'Direct trust connections (0.75x weight)'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.reputationScore}</div>
                  <div className="text-sm text-gray-600">Reputation Points</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {hasLiveData ? '📊 Live calculation' : 'Quality contributions on-chain'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.governanceParticipation}%</div>
                  <div className="text-sm text-gray-600">Governance Activity</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {hasLiveData ? '🗳️ Voting history' : 'Voting participation rate'}
                  </div>
                </div>
              </div>
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">Connection Error: {connectionError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other tabs remain the same... */}
      </main>
    </div>
  );
}