'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Loader2, Users } from 'lucide-react';

interface FollowingPageProps {
  params: {
    id: string;
  };
}

// Mock following data for testing
const mockFollowing = [
  {
    id: '10',
    username: 'chef_marco',
    display_name: 'Chef Marco Rodriguez',
    avatar_url: null,
    followers_count: 1234,
    recommendations_count: 187,
    avg_trust_score: 0.91,
    verification_status: 'expert',
    is_following: true,
    bio: 'Head chef at Michelin starred restaurant'
  },
  {
    id: '11',
    username: 'foodie_jenny',
    display_name: 'Jenny Kim',
    avatar_url: null,
    followers_count: 567,
    recommendations_count: 89,
    avg_trust_score: 0.78,
    verification_status: 'verified',
    is_following: true,
    bio: 'Food blogger and restaurant reviewer'
  },
  {
    id: '12',
    username: 'local_guide_sam',
    display_name: 'Sam Thompson',
    avatar_url: null,
    followers_count: 892,
    recommendations_count: 234,
    avg_trust_score: 0.85,
    verification_status: 'basic',
    is_following: true,
    bio: 'Local guide specializing in hidden gems'
  }
];

export default function FollowingPage({ params }: FollowingPageProps) {
  const router = useRouter();
  const userId = params.id;
  
  const [userInfo, setUserInfo] = useState<any>(null);
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRealAPI, setUseRealAPI] = useState(true);

  useEffect(() => {
    console.log('Loading following for user:', userId);
    loadData();
  }, [userId, useRealAPI]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!useRealAPI) {
        // Use mock data
        console.log('Using mock following data');
        setTimeout(() => {
          setUserInfo({
            id: userId,
            username: 'alice_foodie',
            display_name: 'Alice Chen',
            avatar_url: null,
            following_count: mockFollowing.length
          });
          setFollowing(mockFollowing);
          setIsLoading(false);
        }, 1000);
        return;
      }

      // Try to load user info first
      const userResponse = await fetch(`/api/social/users/${userId}/stats`);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);
      } else {
        console.error('User API Error:', userResponse.status);
        setError('User API not available yet');
      }

      // Try to load following data
      const followingResponse = await fetch(`/api/social/users/${userId}/following?page=1&per_page=20`);
      
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        console.log('Following API Response:', followingData);
        
        if (followingData.following && Array.isArray(followingData.following)) {
          setFollowing(followingData.following);
        } else if (Array.isArray(followingData)) {
          setFollowing(followingData);
        } else {
          console.log('Unexpected following data structure:', followingData);
          setFollowing([]);
        }
      } else {
        console.error('Following API Error:', followingResponse.status);
        setError('Following API not available yet');
        
        // Fallback to mock data
        setTimeout(() => {
          setUserInfo({
            id: userId,
            username: 'alice_foodie',
            display_name: 'Alice Chen',
            avatar_url: null,
            following_count: mockFollowing.length
          });
          setFollowing(mockFollowing);
          setIsLoading(false);
        }, 500);
        return;
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError('Network error - using mock data');
      
      // Fallback to mock data on error
      setTimeout(() => {
        setUserInfo({
          id: userId,
          username: 'alice_foodie',
          display_name: 'Alice Chen',
          avatar_url: null,
          following_count: mockFollowing.length
        });
        setFollowing(mockFollowing);
        setIsLoading(false);
      }, 500);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (clickedUserId: string) => {
    router.push(`/users/${clickedUserId}`);
  };

  const handleBackToProfile = () => {
    router.push(`/users/${userId}`);
  };

  const handleUnfollow = (targetUserId: string) => {
    setFollowing(following.filter(user => user.id !== targetUserId));
    // Update user info following count
    if (userInfo) {
      setUserInfo({
        ...userInfo,
        following_count: userInfo.following_count - 1
      });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading following...</p>
          <p className="text-sm text-gray-400 mt-2">User ID: {userId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToProfile}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Profile</span>
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
          
          {/* User info header */}
          {userInfo && (
            <div className="flex items-center gap-4">
              <img
                src={userInfo.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userInfo.username}`}
                alt={userInfo.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {userId === '1' ? 'People you follow' : `${userInfo.display_name} follows`}
                </h1>
                <p className="text-gray-600">
                  {following.length} {following.length === 1 ? 'person' : 'people'}
                </p>
              </div>
            </div>
          )}

          {/* Error message if any */}
          {error && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{error} - Showing mock data instead</p>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto p-6">
        {following.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Not following anyone yet</h3>
            <p className="text-gray-500 mb-4">Start following people to see their recommendations in your feed.</p>
            <button
              onClick={() => router.push('/users/search')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Discover Users
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((user, index) => (
              <div
                key={user.id || index}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
              >
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
                    {user.display_name || user.name || user.username || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    @{user.username || user.id}
                  </p>
                  
                  {user.bio && (
                    <p className="text-sm text-gray-500 mb-1 line-clamp-1">{user.bio}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{user.followers_count || 0} followers</span>
                    <span>{user.recommendations_count || 0} recommendations</span>
                    {user.avg_trust_score > 0 && (
                      <span>★ {user.avg_trust_score.toFixed(1)} trust</span>
                    )}
                  </div>
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
                    onClick={() => handleUnfollow(user.id)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Following
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Discover more users section */}
        {following.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <UserPlus className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Discover More People
            </h3>
            <p className="text-blue-700 mb-4">
              Find more interesting people to follow and get better recommendations
            </p>
            <button
              onClick={() => router.push('/users/search')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Discover Users
            </button>
          </div>
        )}
      </div>
    </div>
  );
}