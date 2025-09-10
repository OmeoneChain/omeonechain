// User Profile Component - displays user info with social stats and follow button
// FIXED: Simplified recommendations loading to use fixed API route directly

import React, { useState, useEffect } from 'react';
import { User, Users, Star, MapPin, Calendar, Settings, Share2, Loader2, Heart, MessageCircle, Bookmark } from 'lucide-react';
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

interface SocialUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  followers_count: number;
  recommendations_count: number;
  avg_trust_score: number;
  verification_status: string;
  bio?: string;
  location_city?: string;
}

// Recommendation interface to match backend
interface UserRecommendation {
  id: string;
  title: string;
  body: string;
  category: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  };
  trustScore: number;
  upvotes: number;
  saves: number;
  createdAt: string;
  updatedAt: string;
  // Backend might return these fields
  trust_score?: number;
  upvotes_count?: number;
  saves_count?: number;
  created_at?: string;
  updated_at?: string;
}

// FIXED: Use correct backend URL that matches working Community page
const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

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

  // Social tab data
  const [followersData, setFollowersData] = useState<SocialUser[]>([]);
  const [followingData, setFollowingData] = useState<SocialUser[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Recommendations tab data
  const [recommendationsData, setRecommendationsData] = useState<UserRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

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

  // Load tab data when tabs are clicked
  useEffect(() => {
    if (activeTab === 'followers') {
      loadFollowers();
    } else if (activeTab === 'following') {
      loadFollowing();
    } else if (activeTab === 'recommendations') {
      loadRecommendations();
    }
  }, [activeTab, userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log(`Loading user profile for ID: ${userId}`);
      
      // FIXED: Try the backend URL that works for Community page
      const fullUrl = `${BACKEND_URL}/api/users/${userId}`;
      console.log(`Calling API: GET ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      console.log(`API Response status: ${response.status}`);

      if (response.ok) {
        const userData = await response.json();
        console.log('Loaded user data:', userData);
        setUser(userData);
      } else {
        console.error('Failed to load user profile:', response.status);
        if (response.status === 404) {
          console.log('User not found');
          setUser(null);
        } else if (response.status === 401) {
          console.log('Authentication required');
        } else {
          console.log('Other API error');
          try {
            const errorData = await response.json();
            console.error('Error details:', errorData);
          } catch (e) {
            console.error('Could not parse error response');
          }
        }
      }
    } catch (error) {
      console.error('Network error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Simplified recommendations loading - use Next.js API route directly
  const loadRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      
      console.log(`Loading recommendations for user: ${userId}`);
      
      // FIXED: Use the fixed Next.js API route that now handles userId directly
      const endpoint = `/api/recommendations?author=${userId}`;
      console.log(`Calling endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Recommendations API Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Recommendations API Response:', data);
        
        let recommendations: UserRecommendation[] = [];
        if (data.recommendations && Array.isArray(data.recommendations)) {
          recommendations = data.recommendations;
        } else if (Array.isArray(data)) {
          recommendations = data;
        }

        // Normalize the data structure (backend might use different field names)
        const normalizedRecommendations = recommendations.map(rec => ({
          ...rec,
          trustScore: rec.trustScore || rec.trust_score || 0,
          upvotes: rec.upvotes || rec.upvotes_count || 0,
          saves: rec.saves || rec.saves_count || 0,
          createdAt: rec.createdAt || rec.created_at || '',
          updatedAt: rec.updatedAt || rec.updated_at || ''
        }));

        setRecommendationsData(normalizedRecommendations);
        console.log(`✅ Loaded ${normalizedRecommendations.length} recommendations for user ${userId}`);
      } else {
        console.error('Recommendations API Error:', response.status, response.statusText);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
          setRecommendationsError(`Failed to load recommendations: ${errorData.details || response.statusText}`);
        } catch (e) {
          setRecommendationsError(`Failed to load recommendations (${response.status})`);
        }
        
        setRecommendationsData([]);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendationsError('Network error loading recommendations');
      setRecommendationsData([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const loadFollowers = async () => {
    try {
      setSocialLoading(true);
      setSocialError(null);
      
      console.log(`Loading followers for user: ${userId}`);
      const response = await fetch(`${BACKEND_URL}/api/social/users/${userId}/followers`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Followers API Response:', data);
        
        let users: SocialUser[] = [];
        if (data.followers && Array.isArray(data.followers)) {
          users = data.followers;
        } else if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else if (Array.isArray(data)) {
          users = data;
        }

        setFollowersData(users);
        console.log(`Loaded ${users.length} followers`);
      } else {
        console.error('Followers API Error:', response.status, response.statusText);
        setSocialError(`Failed to load followers (${response.status})`);
        setFollowersData([]);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
      setSocialError('Network error loading followers');
      setFollowersData([]);
    } finally {
      setSocialLoading(false);
    }
  };

  const loadFollowing = async () => {
    try {
      setSocialLoading(true);
      setSocialError(null);
      
      console.log(`Loading following for user: ${userId}`);
      const response = await fetch(`${BACKEND_URL}/api/social/users/${userId}/following`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Following API Response:', data);
        
        let users: SocialUser[] = [];
        if (data.following && Array.isArray(data.following)) {
          users = data.following;
        } else if (data.users && Array.isArray(data.users)) {
          users = data.users;
        } else if (Array.isArray(data)) {
          users = data;
        }

        setFollowingData(users);
        console.log(`Loaded ${users.length} following users`);
      } else {
        console.error('Following API Error:', response.status, response.statusText);
        setSocialError(`Failed to load following (${response.status})`);
        setFollowingData([]);
      }
    } catch (error) {
      console.error('Error loading following:', error);
      setSocialError('Network error loading following');
      setFollowingData([]);
    } finally {
      setSocialLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!token || !currentUserId) {
      console.log('No token or current user, skipping follow status check');
      return;
    }
    
    try {
      console.log(`Checking follow status for user ${userId}`);
      
      // For now, assume not following
      setIsFollowing(false);
      console.log('Follow status check: assuming not following (endpoint not implemented yet)');
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || !token || followLoading) {
      console.log('Cannot follow: missing requirements');
      return;
    }

    try {
      setFollowLoading(true);
      console.log(`${isFollowing ? 'Unfollowing' : 'Following'} user ${userId}`);
      
      // Use the same endpoints as Community page
      let requestUrl: string;
      let requestBody: any = null;
      let method: string;

      if (isFollowing) {
        requestUrl = `${BACKEND_URL}/api/social/follow/${userId}`;
        method = 'DELETE';
      } else {
        requestUrl = `${BACKEND_URL}/api/social/follow`;
        method = 'POST';
        requestBody = { following_id: userId };
      }
      
      console.log(`Calling: ${method} ${requestUrl}`);
      
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

      console.log(`Follow API Response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json();
        console.log('Follow operation successful:', responseData);
        
        setIsFollowing(!isFollowing);
        
        // Update local follower count optimistically
        if (user) {
          setUser({
            ...user,
            followers: isFollowing ? user.followers - 1 : user.followers + 1
          });
        }
        
        console.log(`Updated follow status: ${!isFollowing ? 'Now following' : 'No longer following'}`);
      } else {
        console.error('Follow operation failed:', response.status);
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
    } catch (error) {
      console.error('Network error during follow operation:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleProfileSave = async (profileData: any) => {
    try {
      console.log('Saving profile data:', profileData);
      
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
      console.log('Reloading user profile after save...');
      await loadUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const SocialUserCard = ({ user }: { user: SocialUser }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
      <div className="relative">
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username || user.id}`}
          alt={user.display_name}
          className="w-12 h-12 rounded-full object-cover cursor-pointer"
          onClick={() => window.location.href = `/users/${user.id}`}
        />
        {user.verification_status && user.verification_status !== 'basic' && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h3 
          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
          onClick={() => window.location.href = `/users/${user.id}`}
        >
          {user.display_name || user.username || 'Unknown User'}
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          @{user.username || user.id}
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

      <div className="flex gap-2">
        <button
          onClick={() => window.location.href = `/users/${user.id}`}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          View Profile
        </button>
      </div>
    </div>
  );

  // Recommendation card component
  const RecommendationCard = ({ recommendation }: { recommendation: UserRecommendation }) => (
    <div className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{recommendation.title}</h3>
          {recommendation.category && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {recommendation.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-700">{recommendation.trustScore.toFixed(1)}</span>
        </div>
      </div>

      {recommendation.body && (
        <p className="text-gray-700 mb-3 line-clamp-3">{recommendation.body}</p>
      )}

      {recommendation.location && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{recommendation.location.address || recommendation.location.city}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {recommendation.upvotes}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-4 h-4" />
            {recommendation.saves}
          </span>
          <span>{formatDate(recommendation.createdAt)}</span>
        </div>
        
        <button
          onClick={() => window.location.href = `/recommendations/${recommendation.id}`}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          View Details
        </button>
      </div>
    </div>
  );

  const renderSocialTab = (type: 'followers' | 'following') => {
    const data = type === 'followers' ? followersData : followingData;
    const isOwn = currentUserId === userId;
    
    if (socialLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading {type}...</p>
        </div>
      );
    }

    if (socialError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 mb-2">{socialError}</p>
            <button 
              onClick={() => type === 'followers' ? loadFollowers() : loadFollowing()}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {type === 'followers' 
              ? (isOwn ? "You don't have any followers yet" : "No followers")
              : (isOwn ? "You're not following anyone yet" : "Not following anyone")
            }
          </h3>
          <p className="text-gray-500 mb-4">
            {type === 'followers'
              ? (isOwn ? "Share great recommendations to attract followers" : "This user hasn't gained any followers yet")
              : (isOwn ? "Start following food experts to see their recommendations" : "This user hasn't followed anyone yet")
            }
          </p>
          {isOwn && type === 'following' && (
            <button
              onClick={() => window.location.href = '/community'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Discover People
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {type === 'followers' ? 'Followers' : 'Following'} ({data.length})
          </h3>
          <button
            onClick={() => type === 'followers' ? loadFollowers() : loadFollowing()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        
        <div className="space-y-3">
          {data.map((socialUser) => (
            <SocialUserCard key={socialUser.id} user={socialUser} />
          ))}
        </div>
      </div>
    );
  };

  // Render recommendations tab
  const renderRecommendationsTab = () => {
    const isOwn = currentUserId === userId;
    
    if (recommendationsLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading recommendations...</p>
        </div>
      );
    }

    if (recommendationsError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 mb-2">{recommendationsError}</p>
            <button 
              onClick={loadRecommendations}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
            <div className="mt-2 text-xs text-gray-600">
              <p>Debug: Trying endpoint /api/recommendations?author={userId}</p>
            </div>
          </div>
        </div>
      );
    }

    if (recommendationsData.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isOwn ? "You haven't created any recommendations yet" : "No recommendations yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {isOwn 
              ? "Share your favorite places and experiences to build your reputation"
              : "This user hasn't shared any recommendations yet"
            }
          </p>
          {isOwn && (
            <button
              onClick={() => window.location.href = '/create'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create Your First Recommendation
            </button>
          )}
          <div className="mt-4 text-xs text-gray-500">
            <p>Debug: Searched for recommendations with author={userId}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recommendations ({recommendationsData.length})
          </h3>
          <button
            onClick={loadRecommendations}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        
        <div className="space-y-4">
          {recommendationsData.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </div>
    );
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
              <strong>API URL:</strong> {BACKEND_URL}/api/users/{userId}
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
            <strong>Debug:</strong> Successfully loaded user {user.userId} via {BACKEND_URL}/api/users endpoint
          </p>
          <p className="text-sm text-blue-800">
            <strong>Recommendations API:</strong> Using fixed Next.js route /api/recommendations?author={userId}
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
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => setActiveTab('recommendations')}
        >
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
          {activeTab === 'recommendations' && renderRecommendationsTab()}
          
          {activeTab === 'followers' && renderSocialTab('followers')}
          
          {activeTab === 'following' && renderSocialTab('following')}
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