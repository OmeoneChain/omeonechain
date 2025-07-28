// User Profile Component - displays user info with social stats and follow button

import React, { useState, useEffect } from 'react';
import { User, Users, Star, MapPin, Calendar, Settings, Share2 } from 'lucide-react';
import type { SocialUser, SocialStats } from '../types/social-types';

interface UserProfileProps {
  userId: string;
  currentUserId?: string;
}

interface UserProfileData extends SocialUser {
  bio?: string;
  location?: string;
  website?: string;
  joined_date: string;
  verification_status: 'basic' | 'verified' | 'expert';
  stats: SocialStats;
}

export function UserProfile({ userId, currentUserId }: UserProfileProps) {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'followers' | 'following'>('recommendations');

  useEffect(() => {
    loadUserProfile();
    if (currentUserId && currentUserId !== userId) {
      checkFollowStatus();
    }
  }, [userId, currentUserId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Load user data and stats in parallel
      const [userResponse, statsResponse] = await Promise.all([
        fetch(`/api/social/users/${userId}`),
        fetch(`/api/social/users/${userId}/stats`)
      ]);

      if (userResponse.ok && statsResponse.ok) {
        const userData = await userResponse.json();
        const statsData = await statsResponse.json();
        
        setUser({
          ...userData,
          stats: statsData
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/social/follow/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.is_following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return;

    try {
      setFollowLoading(true);
      
      const method = isFollowing ? 'DELETE' : 'POST';
      const url = isFollowing 
        ? `/api/social/follow/${userId}`
        : '/api/social/follow';

      const body = isFollowing ? undefined : JSON.stringify({ following_id: userId });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
        
        // Update user stats
        if (user && data.following_stats) {
          setUser({
            ...user,
            followers_count: data.following_stats.followers_count,
            stats: {
              ...user.stats,
              followers_count: data.following_stats.followers_count
            }
          });
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Star className="w-3 h-3 text-white" />
        </div>;
      case 'expert':
        return <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <Star className="w-3 h-3 text-white" />
        </div>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
          <p className="text-gray-500">The user you're looking for doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                alt={user.display_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
              {user.verification_status !== 'basic' && (
                <div className="absolute -bottom-1 -right-1">
                  {getVerificationIcon(user.verification_status)}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
              </div>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              
              {user.bio && (
                <p className="text-gray-700 mb-3">{user.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                {user.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.joined_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : currentUserId ? (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Users className="w-4 h-4" />
                <span>{followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            ) : null}
            
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{user.stats.recommendations_count}</div>
          <div className="text-sm text-gray-600">Recommendations</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab('followers')}
        >
          <div className="text-2xl font-bold text-gray-900">{user.stats.followers_count}</div>
          <div className="text-sm text-gray-600">Followers</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab('following')}
        >
          <div className="text-2xl font-bold text-gray-900">{user.stats.following_count}</div>
          <div className="text-sm text-gray-600">Following</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {user.stats.avg_trust_score.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Trust Score</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex">
            {[
              { key: 'recommendations', label: 'Recommendations' },
              { key: 'followers', label: 'Followers' },
              { key: 'following', label: 'Following' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'recommendations' && (
            <div>
              <p className="text-gray-500 text-center py-8">
                Recommendations content will be integrated with existing recommendation components
              </p>
            </div>
          )}
          
          {activeTab === 'followers' && (
            <div>
              <p className="text-gray-500 text-center py-8">
                Followers list component will be implemented next
              </p>
            </div>
          )}
          
          {activeTab === 'following' && (
            <div>
              <p className="text-gray-500 text-center py-8">
                Following list component will be implemented next
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}