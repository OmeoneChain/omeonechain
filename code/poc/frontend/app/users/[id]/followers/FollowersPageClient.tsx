'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FollowersPageClientProps {
  userId: string;
}

// Mock data for testing
const mockFollowers = [
  {
    id: '1',
    username: 'alice_foodie',
    display_name: 'Alice Chen',
    avatar_url: null,
    followers_count: 245,
    recommendations_count: 89,
    avg_trust_score: 0.85,
    verification_status: 'verified',
    is_following: false
  },
  {
    id: '2',
    username: 'bob_explorer',
    display_name: 'Bob Martinez',
    avatar_url: null,
    followers_count: 156,
    recommendations_count: 34,
    avg_trust_score: 0.72,
    verification_status: 'basic',
    is_following: true
  },
  {
    id: '3',
    username: 'chef_sarah',
    display_name: 'Sarah Thompson',
    avatar_url: null,
    followers_count: 892,
    recommendations_count: 156,
    avg_trust_score: 0.94,
    verification_status: 'expert',
    is_following: false
  }
];

export default function FollowersPageClient({ userId }: FollowersPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [useRealAPI, setUseRealAPI] = useState(true);

  useEffect(() => {
    console.log('Loading followers for user:', userId);
    loadData();
  }, [userId, useRealAPI]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!useRealAPI) {
        // Use mock data for now
        console.log('Using mock data');
        setTimeout(() => {
          setFollowers(mockFollowers);
          setLoading(false);
        }, 1000); // Simulate loading time
        return;
      }

      // Real API call
      const response = await fetch(`/api/social/users/${userId}/followers?page=1&per_page=20`);
      
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        
        if (data.followers && Array.isArray(data.followers)) {
          setFollowers(data.followers);
        } else if (Array.isArray(data)) {
          setFollowers(data);
        } else {
          console.log('Unexpected data structure:', data);
          setFollowers([]);
        }
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`API Error: ${response.status} - The followers endpoint doesn't exist yet`);
      }
    } catch (err) {
      console.error('Network Error:', err);
      setError('Network error - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/users/${userId}`);
  };

  const handleFollowToggle = (targetUserId: string, isCurrentlyFollowing: boolean) => {
    setFollowers(followers.map(user => 
      user.id === targetUserId 
        ? { 
            ...user, 
            is_following: !isCurrentlyFollowing,
            followers_count: user.followers_count + (isCurrentlyFollowing ? -1 : 1)
          }
        : user
    ));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading followers...</p>
          <p className="text-sm text-gray-400 mt-2">User ID: {userId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">API Not Ready</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => {
                setUseRealAPI(false);
                loadData();
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Use Mock Data
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Try Real API
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Followers</h1>
              <p className="text-gray-600">
                {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
              </p>
            </div>
            
            {/* API Mode Toggle */}
            <div className="text-sm">
              <button
                onClick={() => setUseRealAPI(!useRealAPI)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  useRealAPI 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {useRealAPI ? 'Real API (404)' : 'Mock Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {followers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
            <p className="text-gray-500">This user doesn't have any followers yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers.map((follower, index) => (
              <div
                key={follower.id || index}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={follower.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${follower.username}`}
                    alt={follower.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {follower.verification_status && follower.verification_status !== 'basic' && (
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {getVerificationBadge(follower.verification_status)}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {follower.display_name || follower.name || follower.username || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    @{follower.username || follower.id}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{follower.followers_count || 0} followers</span>
                    <span>{follower.recommendations_count || 0} recommendations</span>
                    {follower.avg_trust_score > 0 && (
                      <span>★ {follower.avg_trust_score.toFixed(1)} trust</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/users/${follower.id}`)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleFollowToggle(follower.id, follower.is_following)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      follower.is_following
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {follower.is_following ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}