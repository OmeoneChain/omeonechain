// File: code/poc/frontend/app/community/page.tsx
// FIXED: Added CleanHeader to Community page for consistent navigation

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, Loader2, MapPin, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import CleanHeader from '../../components/CleanHeader'; // Add this import

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followers_count: number;
  recommendations_count: number;
  avg_trust_score: number;
  verification_status: string;
  is_following: boolean;
  bio?: string;
  location_city?: string;
  mutual_connections?: number;
  recent_activity?: string;
}

export default function CommunityPage() {
  const router = useRouter();
  
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    user: currentUser, 
    token 
  } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<User[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'following' | 'discover'>('discover');
  
  const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  // FIXED: Filter discover users to exclude already following
  const filteredDiscoverUsers = useMemo(() => {
    if (!discoverUsers || !following) return discoverUsers || [];
    
    // Create a Set of user IDs that the current user is already following
    const followingIds = new Set(following.map(user => user.id));
    
    console.log('🔍 Following user IDs:', Array.from(followingIds));
    
    // Filter out users that are already being followed
    const filtered = discoverUsers.filter(user => !followingIds.has(user.id));
    
    console.log(`🎯 Filtered discover users: ${filtered.length} (was ${discoverUsers.length})`);
    console.log('🔍 Filtered out users:', discoverUsers.filter(user => followingIds.has(user.id)).map(u => u.display_name));
    
    return filtered;
  }, [discoverUsers, following]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, isAuthenticated, currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Auth state:', { 
        isAuthenticated, 
        hasCurrentUser: !!currentUser, 
        hasToken: !!token,
        userId: currentUser?.id 
      });
      
      if (isAuthenticated && currentUser && token) {
        try {
          console.log('✅ User is authenticated, loading following list...');
          await loadFollowing(currentUser.id);
        } catch (authError) {
          console.warn('Failed to load following (this is OK):', authError);
        }
      } else {
        console.log('❌ User not authenticated or no token available');
      }

      // Load discover users
      await loadDiscoverUsers();

    } catch (err) {
      console.error('Error loading community data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load community data');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoverUsers = async () => {
    try {
      console.log('🔍 Loading discover users...');
      const response = await fetch(`${BACKEND_URL}/api/social/users/discover?limit=20&currentUserId=${currentUser?.id || ''}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Discover API Response:', data);
        
        let users: User[] = [];
        if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else if (Array.isArray(data)) {
          users = data;
        } else {
          console.log('⚠️ Unexpected discover API response structure:', data);
          users = [];
        }

        // DEBUG: Log user IDs to identify mismatch
        console.log('🔍 DEBUG: Users from discover API:', users.map(u => ({ 
          id: u.id, 
          display_name: u.display_name,
          id_length: u.id.length,
          id_format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u.id) ? 'UUID' : 'NOT_UUID'
        })));

        // VALIDATION: Check for invalid UUIDs
        const invalidUsers = users.filter(u => 
          !u.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u.id)
        );
        
        if (invalidUsers.length > 0) {
          console.error('🚨 FOUND INVALID USER IDs:', invalidUsers);
        }

        setDiscoverUsers(users);
        console.log('✅ Loaded', users.length, 'discover users');
      } else {
        console.error('❌ Discover API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        setDiscoverUsers([]);
      }
    } catch (error) {
      console.error('❌ Error loading discover users:', error);
      setDiscoverUsers([]);
    }
  };

  const loadFollowing = async (userId: string) => {
    try {
      console.log('🔍 Loading following for user:', userId);
      const response = await fetch(`${BACKEND_URL}/api/social/users/${userId}/following`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Following API Response:', data);
        
        let users: User[] = [];
        if (data.following && Array.isArray(data.following)) {
          users = data.following;
        } else if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else {
          console.log('⚠️ No following data or unexpected format:', data);
          users = [];
        }

        // FIXED: Ensure all users in following list have is_following = true
        const followingUsers = users.map(user => ({
          ...user,
          is_following: true // Mark all users in following list as being followed
        }));

        setFollowing(followingUsers);
        console.log('✅ Loaded', followingUsers.length, 'following users');
      } else {
        console.error('❌ Following API Error:', response.status, response.statusText);
        setFollowing([]);
      }
    } catch (error) {
      console.error('❌ Error loading following:', error);
      setFollowing([]);
    }
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!isAuthenticated || !currentUser || !token) {
      console.log('❌ Authentication required to follow users');
      return;
    }

    try {
      console.log(`🔄 ${isCurrentlyFollowing ? 'Unfollowing' : 'Following'} user ${targetUserId}`);
      
      // FIXED: Updated API routes to match server.ts
      let requestUrl: string;
      let requestBody: any = null;
      let method: string;

      if (isCurrentlyFollowing) {
        // Unfollow: DELETE /api/social/follow/${userId}
        requestUrl = `${BACKEND_URL}/api/social/follow/${targetUserId}`;
        method = 'DELETE';
      } else {
        // Follow: POST /api/social/follow with following_id in body
        requestUrl = `${BACKEND_URL}/api/social/follow`;
        method = 'POST';
        requestBody = { following_id: targetUserId };
      }
      
      console.log('🔍 DEBUG: Follow request details:', {
        url: requestUrl,
        method: method,
        body: requestBody,
        targetUserId,
        isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(targetUserId),
        currentUserId: currentUser.id,
        isSelfFollow: targetUserId === currentUser.id
      });

      const fetchOptions: RequestInit = {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (requestBody) {
        fetchOptions.body = JSON.stringify(requestBody);
      }

      const response = await fetch(requestUrl, fetchOptions);

      console.log('🔍 DEBUG: Follow response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Follow success:', responseData);

        // Update both following and discover lists
        const updateUser = (user: User) => 
          user.id === targetUserId 
            ? { 
                ...user, 
                is_following: !isCurrentlyFollowing,
                followers_count: user.followers_count + (isCurrentlyFollowing ? -1 : 1)
              }
            : user;

        // FIXED: Properly manage following list without duplicates
        if (!isCurrentlyFollowing) {
          // Add to following list only if not already there
          const followedUser = discoverUsers.find(u => u.id === targetUserId);
          if (followedUser) {
            setFollowing(prev => {
              // Check if user is already in following list to prevent duplicates
              const isAlreadyInFollowing = prev.some(u => u.id === targetUserId);
              if (isAlreadyInFollowing) {
                console.log('⚠️ User already in following list, not adding duplicate');
                return prev;
              }
              return [...prev, { ...followedUser, is_following: true }];
            });
          }
        } else {
          // Remove from following list
          setFollowing(prev => prev.filter(u => u.id !== targetUserId));
        }

        setDiscoverUsers(discoverUsers.map(updateUser));

        console.log(`✅ Successfully ${isCurrentlyFollowing ? 'unfollowed' : 'followed'} user`);
      } else {
        console.error('❌ Follow API Error:', response.status);
        
        // ENHANCED ERROR LOGGING
        try {
          const errorData = await response.json();
          console.error('❌ Follow error details (JSON):', errorData);
        } catch {
          const errorText = await response.text();
          console.error('❌ Follow error details (TEXT):', errorText);
        }
      }
      
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
    }
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

  // ENHANCED: Show user ID in debug mode
  const UserCard = ({ user }: { user: User }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      {/* Avatar */}
      <div className="relative">
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username || user.id}`}
          alt={user.display_name}
          className="w-12 h-12 rounded-full object-cover cursor-pointer"
          onClick={() => router.push(`/users/${user.id}`)}
        />
        {user.verification_status && user.verification_status !== 'basic' && (
          <div className="absolute -bottom-0.5 -right-0.5">
            {getVerificationBadge(user.verification_status)}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1">
        <h3 
          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
          onClick={() => router.push(`/users/${user.id}`)}
        >
          {user.display_name || user.username || 'Unknown User'}
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          @{user.username || user.id}
        </p>
        
        {/* DEBUG: Show partial user ID for verification */}
        <p className="text-xs text-gray-400 mb-1">
          ID: {user.id.substring(0, 8)}...{user.id.substring(user.id.length - 4)}
        </p>
        
        {user.bio && (
          <p className="text-sm text-gray-500 mb-1 line-clamp-2">{user.bio}</p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{user.followers_count || 0} followers</span>
          <span>{user.recommendations_count || 0} recommendations</span>
          {user.avg_trust_score > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {user.avg_trust_score.toFixed(1)}
            </span>
          )}
          {user.location_city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {user.location_city}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/users/${user.id}`)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          View
        </button>
        {currentUser && currentUser.id !== user.id && (
          <button
            onClick={() => handleFollowToggle(user.id, user.is_following)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              user.is_following
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {user.is_following ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">
              {authLoading ? 'Checking authentication...' : 'Loading community...'}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ADD: CleanHeader component for consistent navigation */}
      <CleanHeader />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Community</h1>
                <p className="text-gray-600">
                  {currentUser 
                    ? `Welcome back, ${currentUser.display_name || currentUser.name || currentUser.username || 'User'}!` 
                    : 'Discover trusted food experts in your area'
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Live Data ✓
                </span>
                {isAuthenticated && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Authenticated ✓
                  </span>
                )}
                {/* DEBUG: Show debug mode indicator */}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  Debug Mode ⚡
                </span>
              </div>
            </div>
            
            {/* Tab Navigation - FIXED: Use filteredDiscoverUsers for count */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('discover')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'discover'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Discover ({filteredDiscoverUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Following ({following.length})
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
                <button 
                  onClick={() => loadData()}
                  className="text-sm text-red-600 hover:text-red-800 underline mt-1"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content - FIXED: Use filteredDiscoverUsers */}
        <div className="max-w-4xl mx-auto p-6">
          {activeTab === 'discover' ? (
            <div>
              {filteredDiscoverUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {discoverUsers.length === 0 ? 'No users found' : 'No new users to discover'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {discoverUsers.length === 0 
                      ? 'Check the console for API errors and debug information'
                      : 'You\'re already following everyone, or try again later'
                    }
                  </p>
                  <button
                    onClick={() => loadData()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Reload
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Discover People ({filteredDiscoverUsers.length})
                    {discoverUsers.length !== filteredDiscoverUsers.length && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({discoverUsers.length - filteredDiscoverUsers.length} already following)
                      </span>
                    )}
                  </h2>
                  {filteredDiscoverUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!isAuthenticated ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to see who you follow</h3>
                  <p className="text-gray-500 mb-4">Connect your wallet to view your social network</p>
                  <button
                    onClick={() => router.push('/auth')}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Sign In
                  </button>
                </div>
              ) : following.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No one followed yet</h3>
                  <p className="text-gray-500 mb-4">Start following food experts to see their recommendations</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Discover People
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    People You Follow ({following.length})
                  </h2>
                  {following.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}