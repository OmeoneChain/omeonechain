'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { socialApi, type User } from '@/services/api';

interface FollowersPageClientProps {
  userId: string;
}

export default function FollowersPageClient({ userId }: FollowersPageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    console.log('Loading followers for user:', userId);
    loadFollowers();
  }, [userId, page]);

  const loadFollowers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching followers for user ${userId}, page ${page}`);
      
      const response = await socialApi.getFollowers(userId, page, 20);
      
      console.log('API Response:', response);
      
      if (page === 1) {
        setFollowers(response.followers || []);
      } else {
        setFollowers(prev => [...prev, ...(response.followers || [])]);
      }
      
      setTotalCount(response.total_count || 0);
      setHasMore((response.followers || []).length === 20);

    } catch (err) {
      console.error('Error loading followers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load followers');
      
      // Don't fall back to mock data - show the error
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/users/${userId}`);
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      console.log(`${isCurrentlyFollowing ? 'Unfollowing' : 'Following'} user ${targetUserId}`);
      
      if (isCurrentlyFollowing) {
        await socialApi.unfollowUser(targetUserId);
      } else {
        await socialApi.followUser(targetUserId);
      }

      // Update the local state optimistically
      setFollowers(followers.map(user => 
        user.id === targetUserId 
          ? { 
              ...user, 
              is_following: !isCurrentlyFollowing,
              followers_count: user.followers_count + (isCurrentlyFollowing ? -1 : 1)
            }
          : user
      ));

      console.log(`Successfully ${isCurrentlyFollowing ? 'unfollowed' : 'followed'} user`);
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Show error to user but don't revert optimistic update
      // In a production app, you might want to revert the change and show a toast
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
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

  if (loading && page === 1) {
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
                {totalCount} {totalCount === 1 ? 'follower' : 'followers'}
              </p>
            </div>
            
            {/* Real API indicator */}
            <div className="text-sm">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Real API
              </span>
            </div>
          </div>
          
          {/* Error message if any */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
              <button 
                onClick={() => loadFollowers()}
                className="text-sm text-red-600 hover:text-red-800 underline mt-1"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {followers.length === 0 && !loading ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
            <p className="text-gray-500">
              {error ? 'Could not load followers.' : 'This user doesn\'t have any followers yet.'}
            </p>
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
                    src={follower.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${follower.username || follower.id}`}
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
                    {follower.display_name || follower.username || 'Unknown User'}
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

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}