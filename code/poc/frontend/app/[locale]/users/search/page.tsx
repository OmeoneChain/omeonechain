'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Users, TrendingUp, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

// Mock data (keeping it brief for the fix)
const mockSearchResults = [
  { id: '20', username: 'lisa_travels', display_name: 'Lisa Anderson', avatar_url: null, followers_count: 432, recommendations_count: 67, avg_trust_score: 0.82, verification_status: 'verified', is_following: false, bio: 'Travel blogger specializing in food tourism' },
  { id: '21', username: 'mike_local', display_name: 'Mike Chen', avatar_url: null, followers_count: 234, recommendations_count: 89, avg_trust_score: 0.76, verification_status: 'basic', is_following: false, bio: 'Local foodie and restaurant enthusiast' }
];

const mockSuggestions = [
  { id: '30', username: 'sarah_chef', display_name: 'Chef Sarah Wilson', avatar_url: null, followers_count: 1567, recommendations_count: 234, avg_trust_score: 0.93, verification_status: 'expert', is_following: false, bio: 'Executive Chef at award-winning restaurant', mutual_connections: 3 },
  { id: '31', username: 'david_wine', display_name: 'David Rodriguez', avatar_url: null, followers_count: 876, recommendations_count: 156, avg_trust_score: 0.88, verification_status: 'verified', is_following: false, bio: 'Wine expert and sommelier', mutual_connections: 1 }
];

const mockTrending = [
  { id: '40', username: 'trending_foodie', display_name: 'Emma Thompson', avatar_url: null, followers_count: 2345, recommendations_count: 445, avg_trust_score: 0.91, verification_status: 'expert', is_following: false, bio: 'Food critic and cookbook author', recent_activity: 'Posted 5 new recommendations this week' }
];

function UserSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'trending'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>(mockSuggestions);
  const [trending, setTrending] = useState<any[]>(mockTrending);
  const [isLoading, setIsLoading] = useState(false);
  
  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api/social/users/discover?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || data || []);
      } else {
        const filtered = mockSearchResults.filter(user => 
          user.display_name.toLowerCase().includes(query.toLowerCase()) ||
          user.username.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      const filtered = mockSearchResults.filter(user => 
        user.display_name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = (userId: string) => {
    const updateUser = (user: any) => user.id === userId ? { ...user, is_following: !user.is_following } : user;
    setSearchResults(prev => prev.map(updateUser));
    setSuggestions(prev => prev.map(updateUser));
    setTrending(prev => prev.map(updateUser));
  };

  const getVerificationBadge = (status: string) => {
    if (status === 'verified') return <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">✓</span></div>;
    if (status === 'expert') return <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center"><span className="text-white text-xs">★</span></div>;
    return null;
  };

  const UserCard = ({ user, showMutualConnections = false, showRecentActivity = false }: any) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      <div className="relative">
        <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
        {user.verification_status && user.verification_status !== 'basic' && <div className="absolute -bottom-0.5 -right-0.5">{getVerificationBadge(user.verification_status)}</div>}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{user.display_name || user.username}</h3>
        <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
        {user.bio && <p className="text-sm text-gray-500 mb-1 line-clamp-2">{user.bio}</p>}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{user.followers_count || 0} followers</span>
          <span>{user.recommendations_count || 0} recs</span>
        </div>
        {showMutualConnections && user.mutual_connections > 0 && <p className="text-xs text-blue-600 mt-1">{user.mutual_connections} mutual</p>}
        {showRecentActivity && user.recent_activity && <p className="text-xs text-green-600 mt-1">{user.recent_activity}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => router.push(`/users/${user.id}`)} className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">View</button>
        <button onClick={() => handleFollow(user.id)} className={`px-3 py-1 text-sm rounded-lg ${user.is_following ? 'bg-gray-100 text-gray-700' : 'bg-blue-500 text-white'}`}>
          {user.is_following ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );

  const tabs = [
    { key: 'search' as const, label: 'Search', icon: Search },
    { key: 'suggestions' as const, label: 'Suggestions', icon: UserPlus },
    { key: 'trending' as const, label: 'Trending', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-5 h-5" /><span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Discover Users</h1>
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <Icon className="w-4 h-4" /><span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && performSearch(searchQuery)}
                    placeholder="Search users..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => performSearch(searchQuery)} disabled={isLoading} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
            {searchQuery && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Results ({searchResults.length})</h2>
                {isLoading ? <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
                  : searchResults.length === 0 ? <div className="text-center py-8 bg-white rounded-lg border"><Users className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p>No users found</p></div>
                  : searchResults.map((user) => <UserCard key={user.id} user={user} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Suggested for You</h2>
            {suggestions.map((user) => <UserCard key={user.id} user={user} showMutualConnections={true} />)}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Trending Users</h2>
            {trending.map((user) => <UserCard key={user.id} user={user} showRecentActivity={true} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <UserSearchContent />
    </Suspense>
  );
}
