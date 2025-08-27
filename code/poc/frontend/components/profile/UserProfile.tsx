// User Profile Component - displays user info with social stats and follow button
// FIXED: Updated to use full API URLs that match environment configuration

import React, { useState, useEffect } from 'react';
import { User, Users, Star, MapPin, Calendar, Settings, Share2 } from 'lucide-react';
import { ProfileEditor } from '../profile/ProfileEditor';
import { ProfileCompletion } from '../profile/ProfileCompletion';
import { useAuth } from '../../hooks/useAuth';

interface UserProfileProps {
  userId: string;
  currentUserId?: string;
}

// Updated to match backend response structure
interface UserProfileData {
  userId: string;
  walletAddress: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  reputationScore: number;
  trustScore: number;
  verificationLevel: 'basic' | 'verified' | 'expert';
  specializations: string[];
  activeSince: string;
  totalRecommendations: number;
  upvotesReceived: number;
  tokensEarned: number;
  stakingBalance: number;
  stakingTier: string;
  followers: number;
  following: number;
  locationCity?: string;
  locationCountry?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// FIXED: Get API base URL from environment (same pattern as other files)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to calculate profile completion
const calculateProfileCompletion = (user: UserProfileData): number => {
  let score = 0;
  
  // Basic information (40 points)
  if (user.username && user.username !== user.userId) score += 10;
  if (user.displayName && user.displayName !== user.username) score += 10;
  if (user.bio && user.bio.length > 10) score += 10;
  if (user.avatarUrl && !user.avatarUrl.includes('dicebear')) score += 10;
  
  // Location (20 points)
  if (user.locationCity) score += 10;
  if (user.locationCountry) score += 10;
  
  // Social activity (30 points)
  if (user.totalRecommendations > 0) score += 15;
  if (user.followers > 0 || user.following > 0) score += 15;
  
  // Verification (10 points)
  if (user.verificationLevel !== 'basic') score += 10;
  
  return Math.min(score, 100);
};

export function UserProfile({ userId, currentUserId }: UserProfileProps) {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'followers' | 'following'>('recommendations');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const { user: currentUser, updateUser, token } = useAuth();

  useEffect(() => {
    loadUserProfile();
    if (currentUserId && currentUserId !== userId) {
      checkFollowStatus();
    }
  }, [userId, currentUserId]);

  // Calculate profile completion when user data changes
  useEffect(() => {
    if (user) {
      const completion = calculateProfileCompletion(user);
      setProfileCompletion(completion);
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log(`🔍 Loading user profile for ID: ${userId}`);
      
      // FIXED: Use full API URL with proper base URL
      const fullUrl = `${API_BASE_URL}/api/v1/users/${userId}`;
      console.log(`📡 Calling API: GET ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 API Response status: ${response.status}`);

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Loaded user data:', userData);
        setUser(userData);
      } else {
        console.error('❌ Failed to load user profile:', response.status);
        if (response.status === 404) {
          console.log('👤 User not found');
          setUser(null);
        } else if (response.status === 401) {
          console.log('🔒 Authentication required');
        } else {
          console.log('⚠️ Other API error');
          // Try to get error details
          try {
            const errorData = await response.json();
            console.error('Error details:', errorData);
          } catch (e) {
            console.error('Could not parse error response');
          }
        }
      }
    } catch (error) {
      console.error('💥 Network error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!token || !currentUserId) {
      console.log('🔒 No token or current user, skipping follow status check');
      return;
    }
    
    try {
      console.log(`🔍 Checking follow status for user ${userId}`);
      
      // FIXED: Use full API URL
      // For now, we'll implement this as a separate endpoint check
      // You may need to add this endpoint to your backend or check via social connections
      
      // TODO: Once you add GET /api/v1/users/:id/follow-status endpoint:
      // const fullUrl = `${API_BASE_URL}/api/v1/users/${userId}/follow-status`;
      // const response = await fetch(fullUrl, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // if (response.ok) {
      //   const data = await response.json();
      //   setIsFollowing(data.isFollowing);
      // }
      
      // For now, assume not following
      setIsFollowing(false);
      console.log('📝 Follow status check: assuming not following (endpoint not implemented yet)');
    } catch (error) {
      console.error('💥 Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || !token || followLoading) {
      console.log('🚫 Cannot follow: missing requirements');
      return;
    }

    try {
      setFollowLoading(true);
      console.log(`${isFollowing ? '👋' : '🤝'} ${isFollowing ? 'Unfollowing' : 'Following'} user ${userId}`);
      
      // FIXED: Use full API URL
      const endpoint = isFollowing 
        ? `${API_BASE_URL}/api/v1/users/${userId}/unfollow` 
        : `${API_BASE_URL}/api/v1/users/${userId}/follow`;
      
      console.log(`📡 Calling: POST ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📡 Follow API Response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Follow operation successful:', responseData);
        
        setIsFollowing(!isFollowing);
        
        // Update local follower count optimistically
        if (user) {
          setUser({
            ...user,
            followers: isFollowing ? user.followers - 1 : user.followers + 1
          });
        }
        
        console.log(`✨ Updated follow status: ${!isFollowing ? 'Now following' : 'No longer following'}`);
      } else {
        console.error('❌ Follow operation failed:', response.status);
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    } catch (error) {
      console.error('💥 Network error during follow operation:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleProfileSave = async (profileData: any) => {
    try {
      console.log('💾 Saving profile data:', profileData);
      
      // Update the local user state immediately for better UX
      if (user) {
        const updatedUser = {
          ...user,
          username: profileData.username || user.username,
          displayName: profileData.display_name || user.displayName,
          bio: profileData.bio || user.bio,
          avatarUrl: profileData.avatar_url || user.avatarUrl,
          locationCity: profileData.location_city || user.locationCity,
          locationCountry: profileData.location_country || user.locationCountry
        };
        
        setUser(updatedUser);
        
        // Update auth context if this is the current user
        if (currentUser && currentUser.id === userId) {
          updateUser({
            username: profileData.username,
            display_name: profileData.display_name,
            bio: profileData.bio,
            location_city: profileData.location_city,
            location_country: profileData.location_country,
            avatar: profileData.avatar_url
          });
        }
      }
      
      // Reload user profile to get fresh data from server
      console.log('🔄 Reloading user profile after save...');
      await loadUserProfile();
    } catch (error) {
      console.error('💥 Error updating profile:', error);
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

  const formatLocation = (city?: string, country?: string) => {
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return null;
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
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Debug Info:</strong> Tried to load user ID: {userId}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Check browser console for detailed API response information.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              <strong>API URL:</strong> {API_BASE_URL}/api/v1/users/{userId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const userLocation = formatLocation(user.locationCity, user.locationCountry);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Debug Info (only show in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Debug:</strong> Successfully loaded user {user.userId} via {API_BASE_URL}/api/v1/users endpoint
          </p>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                alt={user.displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
              {user.verificationLevel !== 'basic' && (
                <div className="absolute -bottom-1 -right-1">
                  {getVerificationIcon(user.verificationLevel)}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
              </div>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              
              {user.bio && (
                <p className="text-gray-700 mb-3">{user.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                {userLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{userLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.activeSince).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowProfileEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
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

      {/* Profile Completion Widget (only for own profile if incomplete) */}
      {isOwnProfile && profileCompletion < 100 && (
        <div className="mb-6">
          <ProfileCompletion
            user={currentUser}
            completionScore={profileCompletion}
            onEditProfile={() => setShowProfileEditor(true)}
            showDetails={true}
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{user.totalRecommendations}</div>
          <div className="text-sm text-gray-600">Recommendations</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab('followers')}
        >
          <div className="text-2xl font-bold text-gray-900">{user.followers}</div>
          <div className="text-sm text-gray-600">Followers</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab('following')}
        >
          <div className="text-2xl font-bold text-gray-900">{user.following}</div>
          <div className="text-sm text-gray-600">Following</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {user.trustScore ? user.trustScore.toFixed(1) : '0.0'}
          </div>
          <div className="text-sm text-gray-600">Trust Score</div>
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
                <br />
                <span className="text-xs text-gray-400 mt-2 block">
                  API endpoint: GET {API_BASE_URL}/api/v1/users/{user.userId}/recommendations
                </span>
              </p>
            </div>
          )}
          
          {activeTab === 'followers' && (
            <div>
              <p className="text-gray-500 text-center py-8">
                Followers list component will be implemented next
                <br />
                <span className="text-xs text-gray-400 mt-2 block">
                  API endpoint: GET {API_BASE_URL}/api/v1/users/{user.userId}/followers
                </span>
              </p>
            </div>
          )}
          
          {activeTab === 'following' && (
            <div>
              <p className="text-gray-500 text-center py-8">
                Following list component will be implemented next
                <br />
                <span className="text-xs text-gray-400 mt-2 block">
                  API endpoint: GET {API_BASE_URL}/api/v1/users/{user.userId}/following
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Editor Modal */}
      <ProfileEditor
        isOpen={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        onSave={handleProfileSave}
      />
    </div>
  );
}