'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Users, TrendingUp, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

// Mock user data for different categories
const mockSearchResults = [
  {
    id: '20',
    username: 'lisa_travels',
    display_name: 'Lisa Anderson',
    avatar_url: null,
    followers_count: 432,
    recommendations_count: 67,
    avg_trust_score: 0.82,
    verification_status: 'verified',
    is_following: false,
    bio: 'Travel blogger specializing in food tourism'
  },
  {
    id: '21',
    username: 'mike_local',
    display_name: 'Mike Chen',
    avatar_url: null,
    followers_count: 234,
    recommendations_count: 89,
    avg_trust_score: 0.76,
    verification_status: 'basic',
    is_following: false,
    bio: 'Local foodie and restaurant enthusiast'
  }
];

const mockSuggestions = [
  {
    id: '30',
    username: 'sarah_chef',
    display_name: 'Chef Sarah Wilson',
    avatar_url: null,
    followers_count: 1567,
    recommendations_count: 234,
    avg_trust_score: 0.93,
    verification_status: 'expert',
    is_following: false,
    bio: 'Executive Chef at award-winning restaurant',
    mutual_connections: 3
  },
  {
    id: '31',
    username: 'david_wine',
    display_name: 'David Rodriguez',
    avatar_url: null,
    followers_count: 876,
    recommendations_count: 156,
    avg_trust_score: 0.88,
    verification_status: 'verified',
    is_following: false,
    bio: 'Wine expert and sommelier',
    mutual_connections: 1
  }
];

const mockTrending = [
  {
    id: '40',
    username: 'trending_foodie',
    display_name: 'Emma Thompson',
    avatar_url: null,
    followers_count: 2345,
    recommendations_count: 445,
    avg_trust_score: 0.91,
    verification_status: 'expert',
    is_following: false,
    bio: 'Food critic and cookbook author',
    recent_activity: 'Posted 5 new recommendations this week'
  }
];

export default function UserSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'trending'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useRealAPI, setUseRealAPI] = useState(true);
  
  // Get initial search query from URL params
  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    }
    loadSuggestions();
    loadTrending();
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      if (!useRealAPI) {
        // Use mock data
        setTimeout(() => {
          const filtered = mockSearchResults.filter(user => 
            user.display_name.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.bio.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(filtered);
          setIsLoading(false);
        }, 800);
        return;
      }

      // Real API call
      const response = await fetch(`https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api/social/users/discover?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search API Response:', data);
        
        if (data.users && Array.isArray(data.users)) {
          setSearchResults(data.users);
        } else if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          console.log('Unexpected API response structure:', data);
          setSearchResults([]);
        }
      } else {
        console.error('Search API Error:', response.status, response.statusText);
        // Fallback to mock data
        const filtered = mockSearchResults.filter(user => 
          user.display_name.toLowerCase().includes(query.toLowerCase()) ||
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.bio.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Search Error:', err);
      // Fallback to mock data
      const filtered = mockSearchResults.filter(user => 
        user.display_name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.bio.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      if (!useRealAPI) {
        setSuggestions(mockSuggestions);
        return;
      }

      const response = await fetch('/api/social/users/suggestions');
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.users || data || []);
      } else {
        setSuggestions(mockSuggestions);
      }
    } catch (err) {
      console.error('Suggestions Error:', err);
      setSuggestions(mockSuggestions);
    }
  };

  const loadTrending = async () => {
    try {
      if (!useRealAPI) {
        setTrending(mockTrending);
        return;
      }

      const response = await fetch('/api/social/users/trending');
      
      if (response.ok) {
        const data = await response.json();
        setTrending(data.users || data || []);
      } else {
        setTrending(mockTrending);
      }
    } catch (err) {
      console.error('Trending Error:', err);
      setTrending(mockTrending);
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleBack = () => {
    router.back();
  };

  const handleFollow = (userId: string) => {
    // Update the follow status in all arrays
    const updateUser = (user: any) => user.id === userId ? { ...user, is_following: !user.is_following } : user;
    
    setSearchResults(prev => prev.map(updateUser));
    setSuggestions(prev => prev.map(updateUser));
    setTrending(prev => prev.map(updateUser));
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        );
      case 'expert':
        return (
          <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">★</span>
          </div>
        );
      default:
        return null;
    }
  };

  const UserCard = ({ user, showMutualConnections = false, showRecentActivity = false }: any) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      {/* Avatar */}
      <div className="relative">
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
          alt={user.display_name}
          className="w-12 h-12 rounded-full object-cover"
        />
        {user.verification_status && user.verification_status !== 'basic' && (
          <div className="absolute -bottom-0.5 -right-0.5">
            {getVerificationBadge(user.verification_status)}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">
          {user.display_name || user.username}
        </h3>
        <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
        
        {user.bio && (
          <p className="text-sm text-gray-500 mb-1 line-clamp-2">{user.bio}</p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{user.followers_count || 0} followers</span>
          <span>{user.recommendations_count || 0} recommendations</span>
          {user.avg_trust_score > 0 && (
            <span>★ {user.avg_trust_score.toFixed(1)} trust</span>
          )}
        </div>

        {showMutualConnections && user.mutual_connections > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            {user.mutual_connections} mutual connection{user.mutual_connections !== 1 ? 's' : ''}
          </p>
        )}

        {showRecentActivity && user.recent_activity && (
          <p className="text-xs text-green-600 mt-1">{user.recent_activity}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleUserClick(user.id)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          View
        </button>
        <button
          onClick={() => handleFollow(user.id)}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            user.is_following
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {user.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );

  const tabs = [
    {
      key: 'search' as const,
      label: 'Search',
      icon: Search,
      description: 'Find users by name or username'
    },
    {
      key: 'suggestions' as const,
      label: 'Suggestions',
      icon: UserPlus,
      description: 'Discover people you might want to follow'
    },
    {
      key: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      description: 'Popular users with recent activity'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            {/* API Mode Toggle */}
            <button
              onClick={() => setUseRealAPI(!useRealAPI)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                useRealAPI 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {useRealAPI ? 'Real API' : 'Mock Data'}
            </button>
          </div>

          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Discover Users</h1>
            <p className="text-gray-600">Find people to follow and connect with</p>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                    ${activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Tab description */}
        <div className="mb-6">
          <p className="text-gray-600">
            {tabs.find(tab => tab.key === activeTab)?.description}
          </p>
        </div>

        {/* Tab content */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Input */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && performSearch(searchQuery)}
                    placeholder="Search for users by name or username..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => performSearch(searchQuery)}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </h2>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-600">Searching users...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-600">Try searching with different keywords</p>
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Suggested for You</h2>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No suggestions available
                </h3>
                <p className="text-gray-600">
                  Follow more users to get personalized suggestions
                </p>
              </div>
            ) : (
              suggestions.map((user) => (
                <UserCard key={user.id} user={user} showMutualConnections={true} />
              ))
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Trending Users</h2>
            {trending.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Coming Soon
                </h3>
                <p className="text-gray-600">
                  Trending users feature will be available soon
                </p>
              </div>
            ) : (
              trending.map((user) => (
                <UserCard key={user.id} user={user} showRecentActivity={true} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick actions section */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/users/1')}
              className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              <Users className="w-4 h-4" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => router.push('/users/1/followers')}
              className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              <Users className="w-4 h-4" />
              <span>My Followers</span>
            </button>
            <button
              onClick={() => router.push('/users/1/following')}
              className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>People I Follow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}