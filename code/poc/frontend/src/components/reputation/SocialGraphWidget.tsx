/**
 * SocialGraphWidget.tsx - Social Graph Management Component
 * 
 * Location: code/poc/frontend/src/components/reputation/SocialGraphWidget.tsx
 * 
 * Manages following/unfollowing and displays social connections
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  UsersIcon, 
  ChartBarIcon,
  MapPinIcon,
  TagIcon 
} from '@heroicons/react/24/outline';

interface SocialGraphProps {
  userId: string;
  currentUserId?: string; // For showing follow/unfollow buttons
  showAnalytics?: boolean;
  className?: string;
}

interface FollowRelationship {
  followerId: string;
  followedId: string;
  timestamp: string;
  distance: number;
  trustWeight: number;
}

interface SocialGraphAnalytics {
  networkSize: number;
  density: number;
  clusters: Array<{
    id: string;
    size: number;
    topic: string;
  }>;
  influenceScore: number;
  geographicDistribution: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  interestClusters: Array<{
    category: string;
    strength: number;
    connections: number;
  }>;
}

interface RelationshipResult {
  relationships: FollowRelationship[];
  total: number;
  pagination: {
    offset: number;
    limit: number;
  };
}

export const SocialGraphWidget: React.FC<SocialGraphProps> = ({
  userId,
  currentUserId,
  showAnalytics = false,
  className = ''
}) => {
  const [following, setFollowing] = useState<RelationshipResult | null>(null);
  const [followers, setFollowers] = useState<RelationshipResult | null>(null);
  const [analytics, setAnalytics] = useState<SocialGraphAnalytics | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'analytics'>('following');

  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        setLoading(true);

        // Fetch following
        const followingResponse = await fetch(`/api/v1/users/${userId}/following?limit=10`);
        if (followingResponse.ok) {
          const followingData = await followingResponse.json();
          setFollowing(followingData);
        }

        // Fetch followers
        const followersResponse = await fetch(`/api/v1/users/${userId}/followers?limit=10`);
        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          setFollowers(followersData);
        }

        // Fetch analytics if requested
        if (showAnalytics) {
          const analyticsResponse = await fetch(`/api/v1/users/${userId}/social-graph`);
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            setAnalytics(analyticsData);
          }
        }

        // Check if current user is following this user
        if (currentUserId && currentUserId !== userId) {
          const userFollowingResponse = await fetch(`/api/v1/users/${currentUserId}/following`);
          if (userFollowingResponse.ok) {
            const userFollowingData = await userFollowingResponse.json();
            const isAlreadyFollowing = userFollowingData.relationships.some(
              (rel: FollowRelationship) => rel.followedId === userId
            );
            setIsFollowing(isAlreadyFollowing);
          }
        }
      } catch (error) {
        console.error('Error fetching social data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialData();
  }, [userId, currentUserId, showAnalytics]);

  const handleFollow = async () => {
    if (!currentUserId || actionLoading) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Adjust based on your auth
        }
      });

      if (response.ok) {
        setIsFollowing(true);
        // Refresh followers count
        const followersResponse = await fetch(`/api/v1/users/${userId}/followers?limit=10`);
        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          setFollowers(followersData);
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId || actionLoading) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/v1/users/${userId}/unfollow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Adjust based on your auth
        }
      });

      if (response.ok) {
        setIsFollowing(false);
        // Refresh followers count
        const followersResponse = await fetch(`/api/v1/users/${userId}/followers?limit=10`);
        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          setFollowers(followersData);
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with Follow/Unfollow Button */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <UsersIcon className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Social Network</span>
            </div>
          </div>
          
          {currentUserId && currentUserId !== userId && (
            <button
              onClick={isFollowing ? handleUnfollow : handleFollow}
              disabled={actionLoading}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isFollowing
                  ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                  : 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100'
              } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : isFollowing ? (
                <UserMinusIcon className="w-4 h-4 mr-1" />
              ) : (
                <UserPlusIcon className="w-4 h-4 mr-1" />
              )}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="p-4 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {followers?.total.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {following?.total.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'following'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'followers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Followers
          </button>
          {showAnalytics && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'following' && following && (
          <div className="space-y-3">
            {following.relationships.slice(0, 5).map((relationship) => (
              <div key={relationship.followedId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {relationship.followedId.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      User {relationship.followedId.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Trust Weight: {(relationship.trustWeight * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {following.total > 5 && (
              <div className="text-center pt-2">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  View all {following.total} following
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && followers && (
          <div className="space-y-3">
            {followers.relationships.slice(0, 5).map((relationship) => (
              <div key={relationship.followerId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">
                      {relationship.followerId.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      User {relationship.followerId.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Trust Weight: {(relationship.trustWeight * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {followers.total > 5 && (
              <div className="text-center pt-2">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  View all {followers.total} followers
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-4">
            {/* Network Overview */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Network Overview</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Network Size:</span>
                  <span className="ml-2 font-medium">{analytics.networkSize}</span>
                </div>
                <div>
                  <span className="text-gray-500">Density:</span>
                  <span className="ml-2 font-medium">{(analytics.density * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Influence Score:</span>
                  <span className="ml-2 font-medium">{analytics.influenceScore.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Geographic Distribution */}
            {analytics.geographicDistribution.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <MapPinIcon className="w-4 h-4 mr-1" />
                  Geographic Distribution
                </h4>
                <div className="space-y-2">
                  {analytics.geographicDistribution.slice(0, 3).map((region) => (
                    <div key={region.region} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{region.region}</span>
                      <span className="font-medium">{region.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interest Clusters */}
            {analytics.interestClusters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <TagIcon className="w-4 h-4 mr-1" />
                  Interest Clusters
                </h4>
                <div className="space-y-2">
                  {analytics.interestClusters.slice(0, 3).map((cluster) => (
                    <div key={cluster.category} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{cluster.category}</span>
                      <span className="font-medium">{cluster.connections} connections</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialGraphWidget;