import React, { useState, useEffect } from 'react';
import { Users, Trophy, Vote, Coins, TrendingUp, Shield, Star, ArrowUp, ArrowDown } from 'lucide-react';

// Mock data that matches your backend implementation
const mockUserData = {
  userId: "user_123",
  trustScore: 8.6,
  tokenBalance: 1250,
  stakingTier: "Curator",
  stakedAmount: 100,
  reputation: 847,
  totalRecommendations: 23,
  followers: 156,
  following: 89,
  votingPower: 2.3,
  governanceParticipation: 87
};

const mockRecommendations = [
  {
    id: 1,
    title: "Amazing pasta at Nonna's Kitchen",
    trustScore: 9.2,
    endorsements: 8,
    location: "Little Italy, NYC",
    category: "Restaurant",
    socialProof: "3 direct friends, 5 friends-of-friends",
    rewards: 15
  },
  {
    id: 2,
    title: "Hidden gem coffee shop on 5th",
    trustScore: 8.7,
    endorsements: 12,
    location: "East Village, NYC",
    category: "Café",
    socialProof: "2 direct friends, 8 friends-of-friends",
    rewards: 22
  },
  {
    id: 3,
    title: "Best tacos outside Mexico City",
    trustScore: 9.5,
    endorsements: 15,
    location: "Brooklyn, NYC",
    category: "Food Truck",
    socialProof: "5 direct friends, 3 friends-of-friends",
    rewards: 31
  }
];

const mockProposals = [
  {
    id: 1,
    title: "Adjust Trust Score calculation weights",
    status: "Active",
    votesFor: 1247,
    votesAgainst: 321,
    timeLeft: "5 days",
    requiredStake: "Curator",
    description: "Proposal to increase 1-hop weight from 0.75 to 0.8"
  },
  {
    id: 2,
    title: "New reward tier for power users",
    status: "Executed",
    votesFor: 2156,
    votesAgainst: 432,
    timeLeft: "Completed",
    requiredStake: "Passport",
    description: "Add 5x multiplier for users with Trust Score > 9.0"
  }
];

const StakingTierBadge = ({ tier, stakedAmount }) => {
  const tierColors = {
    'Explorer': 'bg-blue-100 text-blue-800 border-blue-200',
    'Curator': 'bg-purple-100 text-purple-800 border-purple-200',
    'Passport': 'bg-green-100 text-green-800 border-green-200',
    'Validator': 'bg-gold-100 text-yellow-800 border-yellow-200'
  };
  
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${tierColors[tier] || tierColors.Explorer}`}>
      {tier} ({stakedAmount} TOK)
    </div>
  );
};

const TrustScoreMeter = ({ score, maxScore = 10 }) => {
  const percentage = (score / maxScore) * 100;
  const getColor = (score) => {
    if (score >= 8.5) return 'bg-green-500';
    if (score >= 7.0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Trust Score</span>
        <span className="text-2xl font-bold text-gray-900">{score}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Based on social graph weighting (1-hop: 0.75, 2-hop: 0.25)
      </div>
    </div>
  );
};

const RecommendationCard = ({ rec }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
        <div className="flex items-center space-x-2">
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
            Trust {rec.trustScore}/10
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-2">
        <span className="font-medium">{rec.location}</span> • {rec.category}
      </div>
      
      <div className="text-sm text-gray-500 mb-3">
        {rec.socialProof}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <ArrowUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">{rec.endorsements}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-gray-600">+{rec.rewards} TOK</span>
          </div>
        </div>
        
        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
          <ArrowUp className="w-4 h-4" />
          <span>Endorse</span>
        </button>
      </div>
    </div>
  );
};

const ProposalCard = ({ proposal }) => {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const approvalRate = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{proposal.title}</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          proposal.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {proposal.status}
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{proposal.description}</p>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Approval Rate</span>
            <span className="font-medium">{approvalRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${approvalRate}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>For: {proposal.votesFor.toLocaleString()}</span>
          <span>Against: {proposal.votesAgainst.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-gray-500">
            Min. Stake: {proposal.requiredStake} • {proposal.timeLeft}
          </span>
          {proposal.status === 'Active' && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Vote
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function OmeoneChainDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user] = useState(mockUserData);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'recommendations', label: 'My Recs', icon: Star },
    { id: 'governance', label: 'Governance', icon: Vote },
    { id: 'staking', label: 'Staking', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
                <h1 className="text-xl font-bold text-gray-900">OmeoneChain</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">{user.tokenBalance.toLocaleString()} TOK</span>
              </div>
              <StakingTierBadge tier={user.stakingTier} stakedAmount={user.stakedAmount} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
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
                      ? 'border-blue-500 text-blue-600'
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trust Score</p>
                    <p className="text-3xl font-bold text-gray-900">{user.trustScore}/10</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Voting Power</p>
                    <p className="text-3xl font-bold text-gray-900">{user.votingPower}%</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Vote className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recommendations</p>
                    <p className="text-3xl font-bold text-gray-900">{user.totalRecommendations}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Social Graph</p>
                    <p className="text-3xl font-bold text-gray-900">{user.followers + user.following}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Score Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Trust Score Analysis</h2>
              <TrustScoreMeter score={user.trustScore} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                  <div className="text-xs text-gray-500 mt-1">Direct trust connections</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.reputation}</div>
                  <div className="text-sm text-gray-600">Reputation Points</div>
                  <div className="text-xs text-gray-500 mt-1">Quality contributions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{user.governanceParticipation}%</div>
                  <div className="text-sm text-gray-600">Governance Activity</div>
                  <div className="text-xs text-gray-500 mt-1">Voting participation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Recommendations</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                Add Recommendation
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Governance Proposals</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                Create Proposal
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Governance Power</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-blue-900">{user.votingPower}%</div>
                  <div className="text-sm text-blue-700">Voting Weight</div>
                  <div className="text-xs text-blue-600 mt-1">
                    √(staked tokens × trust score) capped at 3%
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-purple-900">{user.stakedAmount} TOK</div>
                  <div className="text-sm text-purple-700">Staked Amount</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {user.stakingTier} tier privileges
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-xl font-bold text-green-900">{user.trustScore}/10</div>
                  <div className="text-sm text-green-700">Trust Score</div>
                  <div className="text-xs text-green-600 mt-1">
                    Influences proposal weight
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staking' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Staking Management</h2>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Staking Status</h3>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <StakingTierBadge tier={user.stakingTier} stakedAmount={user.stakedAmount} />
                  <p className="text-sm text-gray-600 mt-2">
                    Voting weight: {user.votingPower}% • Governance privileges active
                  </p>
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
                  Increase Stake
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Explorer', min: 25, features: ['Submit comments', 'Trust cap +0.1'] },
                { name: 'Curator', min: 100, features: ['Create proposals', '25% list royalty', 'Trust cap +0.3'] },
                { name: 'Passport', min: 500, features: ['50% AI discount', 'Premium features'] },
                { name: 'Validator', min: 1000, features: ['Run indexer node', '1.5x vote weight'] }
              ].map((tier) => (
                <div key={tier.name} className={`p-4 rounded-lg border-2 ${
                  user.stakingTier === tier.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}>
                  <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{tier.min} TOK minimum</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {tier.features.map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}