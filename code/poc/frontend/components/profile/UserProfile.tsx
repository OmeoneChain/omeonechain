// User Profile Component - Complete with database integration for wallet progression
// UPDATED: Saved Lists tab now shows user_saved_lists instead of recommendation_bookmarks

import React, { useState, useEffect } from 'react';
import { User, Users, Star, MapPin, Calendar, Settings, Share2, Loader2, Heart, MessageCircle, Bookmark, List, ChevronDown, ChevronUp, CheckCircle, Wallet, Mail, Award, Shield, Gift } from 'lucide-react';
import { ProfileEditor } from '../profile/ProfileEditor';
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

// NEW: Wallet progression data structure
interface WalletProgressionData {
  user_id: string;
  onboarding_stage: 'social_signup' | 'basic_engagement' | 'reward_awareness' | 'crypto_curious' | 'advanced_user';
  show_crypto_features: boolean;
  wallet_education_completed: boolean;
  advanced_mode_enabled: boolean;
  progression_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// NEW: Virtual asset data structure
interface VirtualAsset {
  id: string;
  user_id: string;
  asset_type: 'reward_points' | 'loyalty_card' | 'achievement_badge' | 'vip_status' | 'access_token';
  display_name: string;
  user_description?: string;
  blockchain_metadata: Record<string, any>;
  blockchain_token_id?: string;
  blockchain_contract_address?: string;
  is_minted: boolean;
  token_balance: number;
  is_active: boolean;
  is_visible_to_user: boolean;
  associated_restaurant_id?: number;
  rarity_tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  expires_at?: string;
  created_at: string;
  updated_at: string;
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

// New interfaces for additional content types
interface UserList {
  id: string;
  title: string;
  description?: string;
  item_count: number;
  likes_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface LikedRecommendation extends UserRecommendation {
  liked_at: string;
}

// UPDATED: Saved Lists interface
interface SavedListData {
  id: string;
  userId: string;
  name: string;
  description?: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  icon: string;
  itemCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// FIXED: Use correct backend URL that matches working Community page
const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

// HIDDEN: Profile completion calculation kept for future token rewards
const calculateProfileCompletion = (user: UserProfileData): number => {
  let score = 0;
  const maxScore = 100;
  
  // Basic information (50 points total)
  if (user.username && user.username !== user.userId && user.username.trim() !== '') score += 10;
  if (user.displayName && user.displayName !== user.username && user.displayName.trim() !== '') score += 10;
  if (user.bio && user.bio.length >= 10) score += 15;
  if (user.avatarUrl && !user.avatarUrl.includes('dicebear')) score += 15;
  
  // Location information (20 points total)
  if (user.locationCity && user.locationCity.trim() !== '') score += 10;
  if (user.locationCountry && user.locationCountry.trim() !== '') score += 10;
  
  // Account verification and connection (20 points total)
  if (user.walletAddress && user.walletAddress.trim() !== '') score += 10;
  if (user.verificationLevel !== 'basic') score += 10;
  
  // Social activity (10 points total)
  if (user.totalRecommendations > 0) score += 5;
  if (user.followers > 0 || user.following > 0) score += 5;
  
  return Math.min(score, maxScore);
};

// NEW: Determine onboarding stage based on profile completion and activity
const determineOnboardingStage = (user: UserProfileData, profileCompletion: number): WalletProgressionData['onboarding_stage'] => {
  if (profileCompletion >= 80 && user.totalRecommendations >= 3) return 'reward_awareness';
  if (profileCompletion >= 60 && user.totalRecommendations >= 1) return 'basic_engagement';
  return 'social_signup';
};

// Enhanced Tab Type with new sections
type ContentTab = 'recommendations' | 'lists' | 'likes' | 'bookmarks' | 'followers' | 'following' | 'rewards' | 'activity';

export function UserProfile({ userId, currentUserId }: UserProfileProps) {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('recommendations');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // HIDDEN: Keep profile completion tracking for future use
  const [profileCompletion, setProfileCompletion] = useState(0);

  // NEW: Wallet progression state
  const [walletProgression, setWalletProgression] = useState<WalletProgressionData | null>(null);
  const [virtualAssets, setVirtualAssets] = useState<VirtualAsset[]>([]);

  // Social tab data
  const [followersData, setFollowersData] = useState<SocialUser[]>([]);
  const [followingData, setFollowingData] = useState<SocialUser[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Recommendations tab data
  const [recommendationsData, setRecommendationsData] = useState<UserRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Additional content tab data
  const [listsData, setListsData] = useState<UserList[]>([]);
  const [likesData, setLikesData] = useState<LikedRecommendation[]>([]);
  const [savedListsData, setSavedListsData] = useState<SavedListData[]>([]); // UPDATED: Changed from bookmarksData
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const { user: currentUser, updateUser, token } = useAuth();

  useEffect(() => {
    loadUserProfile();
    if (currentUserId && currentUserId !== userId) {
      checkFollowStatus();
    }
  }, [userId, currentUserId]);

  // NEW: Enhanced profile completion effect with database integration
  useEffect(() => {
    if (user) {
      const completion = calculateProfileCompletion(user);
      setProfileCompletion(completion);
      
      // Load or create wallet progression data (only for own profile)
      if (currentUserId === userId) {
        loadWalletProgression(completion);
        loadVirtualAssets();
      }
    }
  }, [user, currentUserId, userId]);

  // Load tab data when tabs are clicked
  useEffect(() => {
    if (activeTab === 'followers') {
      loadFollowers();
    } else if (activeTab === 'following') {
      loadFollowing();
    } else if (activeTab === 'recommendations') {
      loadRecommendations();
    } else if (activeTab === 'lists') {
      loadUserLists();
    } else if (activeTab === 'likes') {
      loadUserLikes();
    } else if (activeTab === 'bookmarks') {
      loadUserSavedLists(); // UPDATED: Changed from loadUserBookmarks
    }
  }, [activeTab, userId]);

  // NEW: Real API integration for wallet progression
  const loadWalletProgression = async (profileCompletion: number) => {
    if (!user || !token) return;
  
    try {
      console.log('Loading wallet progression for user:', userId);
      
      const response = await fetch(`/api/users/${userId}/wallet-progression`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletProgression(data);
        console.log('Loaded existing wallet progression:', data);
      } else if (response.status === 404) {
        console.log('Creating new wallet progression record');
        await createWalletProgression(profileCompletion);
      } else {
        console.error('Failed to load wallet progression:', response.status);
        setWalletProgression(null);
      }
    } catch (error) {
      console.error('Error loading wallet progression:', error);
      setWalletProgression(null);
    }
  };

  // NEW: Create wallet progression
  const createWalletProgression = async (profileCompletion: number) => {
    if (!user || !token) return;

    try {
      const onboardingStage = determineOnboardingStage(user, profileCompletion);
    
      const progressionData = {
        onboarding_stage: onboardingStage,
        show_crypto_features: false,
        wallet_education_completed: false,
        advanced_mode_enabled: false,
        progression_metadata: {
          profile_completion: profileCompletion,
          initial_stage: onboardingStage,
          created_from: 'user_profile'
        }
      };
    
      const response = await fetch(`/api/users/${userId}/wallet-progression`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressionData)
      });
    
      if (response.ok) {
        const data = await response.json();
        setWalletProgression(data);
        console.log('Created wallet progression:', data);
      
        if (profileCompletion >= 50) {
          await awardProfileCompletionAssets(profileCompletion);
        }
      } else {
        console.error('Failed to create wallet progression:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error creating wallet progression:', error);
    }
  };

  // NEW: Award virtual assets for profile completion
  const awardProfileCompletionAssets = async (profileCompletion: number) => {
    if (!token) return;

    const assetsToAward = [];

    if (profileCompletion >= 50) {
      assetsToAward.push({
        asset_type: 'achievement_badge',
        display_name: 'Profile Builder',
        user_description: 'Awarded for completing 50% of your profile',
        token_balance: 1,
        rarity_tier: 'common'
      });
    }

    if (profileCompletion >= 80) {
      assetsToAward.push({
        asset_type: 'reward_points',
        display_name: 'Completion Bonus',
        user_description: 'Bonus points for completing most of your profile',
        token_balance: 25,
        rarity_tier: 'uncommon'
      });
    }

    if (profileCompletion >= 100) {
      assetsToAward.push({
        asset_type: 'achievement_badge',
        display_name: 'Profile Master',
        user_description: 'Awarded for 100% profile completion',
        token_balance: 1,
        rarity_tier: 'rare'
      });
    }

    for (const asset of assetsToAward) {
      try {
        const response = await fetch(`/api/users/${userId}/virtual-assets`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(asset)
        });

        if (response.ok) {
          const createdAsset = await response.json();
          console.log('Awarded virtual asset:', createdAsset);
        } else {
          console.error('Failed to award virtual asset:', response.status);
        }
      } catch (error) {
        console.error('Error awarding virtual asset:', error);
      }
    }

    await loadVirtualAssets();
  };

  // NEW: Load virtual assets with real API integration
  const loadVirtualAssets = async () => {
    if (!token) return;
    
    try {
      console.log('Loading virtual assets for user:', userId);
      
      const response = await fetch(`/api/users/${userId}/virtual-assets?active=true&visible=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVirtualAssets(data.assets || []);
        console.log('Loaded virtual assets:', data);
      } else {
        console.error('Failed to load virtual assets:', response.status);
        loadMockVirtualAssets();
      }
    } catch (error) {
      console.error('Error loading virtual assets:', error);
      loadMockVirtualAssets();
    }
  };

  // Fallback mock data for development
  const loadMockVirtualAssets = () => {
    const mockAssets: VirtualAsset[] = [];
    
    if (profileCompletion >= 50) {
      mockAssets.push({
        id: 'badge-1',
        user_id: userId,
        asset_type: 'achievement_badge',
        display_name: 'Profile Builder',
        user_description: 'Awarded for completing 50% of your profile',
        blockchain_metadata: {},
        is_minted: false,
        token_balance: 1,
        is_active: true,
        is_visible_to_user: true,
        rarity_tier: 'common',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    if (profileCompletion >= 80) {
      mockAssets.push({
        id: 'points-1',
        user_id: userId,
        asset_type: 'reward_points',
        display_name: 'Completion Bonus',
        user_description: 'Bonus points for completing most of your profile',
        blockchain_metadata: {},
        is_minted: false,
        token_balance: 25,
        is_active: true,
        is_visible_to_user: true,
        rarity_tier: 'uncommon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    if (profileCompletion >= 100) {
      mockAssets.push({
        id: 'badge-2',
        user_id: userId,
        asset_type: 'achievement_badge',
        display_name: 'Profile Master',
        user_description: 'Awarded for 100% profile completion',
        blockchain_metadata: {},
        is_minted: false,
        token_balance: 1,
        is_active: true,
        is_visible_to_user: true,
        rarity_tier: 'rare',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    setVirtualAssets(mockAssets);
  };

  // NEW: Check for stage advancement
  const checkForStageAdvancement = async () => {
    if (!user || !walletProgression) return;

    const currentCompletion = calculateProfileCompletion(user);
    const currentStage = walletProgression.onboarding_stage;
    const newStage = determineOnboardingStage(user, currentCompletion);

    if (newStage !== currentStage) {
      console.log(`Advancing user from ${currentStage} to ${newStage}`);
      await updateWalletStage(newStage, {
        previous_stage: currentStage,
        advancement_trigger: 'profile_completion',
        profile_completion_at_advancement: currentCompletion
      });

      await awardProfileCompletionAssets(currentCompletion);
    }
  };

  // NEW: Update wallet stage
  const updateWalletStage = async (newStage: string, additionalData?: any) => {
    if (!token) return;

    try {
      const updateData = {
        onboarding_stage: newStage,
        progression_metadata: {
          ...additionalData,
          stage_updated_at: new Date().toISOString(),
          updated_from: 'user_profile'
        }
      };

      const response = await fetch(`/api/users/${userId}/wallet-progression`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedProgression = await response.json();
        setWalletProgression(updatedProgression);
        console.log('Updated wallet progression stage:', updatedProgression);
        return updatedProgression;
      } else {
        console.error('Failed to update wallet stage:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating wallet stage:', error);
      return null;
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      console.log(`Loading user profile for ID: ${userId}`);
      
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
        }
      }
    } catch (error) {
      console.error('Network error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      
      console.log(`Loading recommendations for user: ${userId}`);
      
      const endpoint = `/api/recommendations?author=${userId}`;
      
      const response = await fetch(endpoint, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let recommendations: UserRecommendation[] = [];
        if (data.recommendations && Array.isArray(data.recommendations)) {
          recommendations = data.recommendations;
        } else if (Array.isArray(data)) {
          recommendations = data;
        }

        const normalizedRecommendations = recommendations.map(rec => ({
          ...rec,
          trustScore: rec.trustScore || rec.trust_score || 0,
          upvotes: rec.upvotes || rec.upvotes_count || 0,
          saves: rec.saves || rec.saves_count || 0,
          createdAt: rec.createdAt || rec.created_at || '',
          updatedAt: rec.updatedAt || rec.updated_at || ''
        }));

        setRecommendationsData(normalizedRecommendations);
        console.log(`✅ Loaded ${normalizedRecommendations.length} recommendations`);
      } else {
        setRecommendationsError(`Failed to load recommendations (${response.status})`);
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

  const loadUserLists = async () => {
    try {
      setContentLoading(true);
      setContentError(null);
      
      console.log(`Loading lists for user: ${userId}`);
      const endpoint = `/api/lists?author=${userId}`;
      
      const response = await fetch(endpoint, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let lists: UserList[] = [];
        if (data.lists && Array.isArray(data.lists)) {
          lists = data.lists;
        } else if (Array.isArray(data)) {
          lists = data;
        }

        setListsData(lists);
        console.log(`✅ Loaded ${lists.length} lists`);
      } else {
        setContentError(`Failed to load lists (${response.status})`);
        setListsData([]);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
      setContentError('Network error loading lists');
      setListsData([]);
    } finally {
      setContentLoading(false);
    }
  };

  const loadUserLikes = async () => {
    try {
      setContentLoading(true);
      setContentError(null);
      
      console.log(`Loading likes for user: ${userId}`);
      const endpoint = `/api/users/${userId}/likes`;
      
      const response = await fetch(endpoint, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let likes: LikedRecommendation[] = [];
        if (data.likes && Array.isArray(data.likes)) {
          likes = data.likes;
        } else if (Array.isArray(data)) {
          likes = data;
        }

        setLikesData(likes);
        console.log(`✅ Loaded ${likes.length} likes`);
      } else {
        setContentError(`Failed to load likes (${response.status})`);
        setLikesData([]);
      }
    } catch (error) {
      console.error('Error loading likes:', error);
      setContentError('Network error loading likes');
      setLikesData([]);
    } finally {
      setContentLoading(false);
    }
  };

  // UPDATED: New function to load saved lists instead of bookmarks
  const loadUserSavedLists = async () => {
    try {
      setContentLoading(true);
      setContentError(null);
      
      console.log(`Loading saved lists for user: ${userId}`);
      
      const endpoint = `/api/saved-lists`;
      
      const response = await fetch(endpoint, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Saved Lists API Response:', data);
        
        let lists: SavedListData[] = [];
        if (Array.isArray(data)) {
          lists = data;
        } else if (data.lists && Array.isArray(data.lists)) {
          lists = data.lists;
        }

        setSavedListsData(lists);
        console.log(`✅ Loaded ${lists.length} saved lists for user ${userId}`);
      } else {
        console.error('Saved Lists API Error:', response.status, response.statusText);
        setContentError(`Failed to load saved lists (${response.status})`);
        setSavedListsData([]);
      }
    } catch (error) {
      console.error('Error loading saved lists:', error);
      setContentError('Network error loading saved lists');
      setSavedListsData([]);
    } finally {
      setContentLoading(false);
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
    if (!token || !currentUserId) return;
    
    try {
      setIsFollowing(false);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || !token || followLoading) return;

    try {
      setFollowLoading(true);
      
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

      if (response.ok) {
        setIsFollowing(!isFollowing);
        
        if (user) {
          setUser({
            ...user,
            followers: isFollowing ? user.followers - 1 : user.followers + 1
          });
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
      
      await loadUserProfile();
      await checkForStageAdvancement();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const getAuthenticationDisplay = (user: UserProfileData) => {
    if (user.walletAddress && user.walletAddress.trim() !== '' && user.walletAddress !== '0x') {
      return {
        type: 'wallet' as const,
        icon: <Wallet className="w-4 h-4" />,
        display: `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
      };
    }
    return {
      type: 'email' as const,
      icon: <Mail className="w-4 h-4" />,
      display: user.email || 'Email Account'
    };
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Star className="w-3 h-3 text-white" />
        </div>;
      case 'expert':
        return <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
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

  // NEW: Enhanced Rewards tab with real database integration
  const renderRewardsTab = () => {
    const isOwn = currentUserId === userId;
    
    if (!isOwn) {
      return (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Rewards & Achievements</h3>
          <p className="text-gray-500 mb-4">
            View this user's platform achievements and recognition
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              User reward information is private
            </p>
          </div>
        </div>
      );
    }

    if (virtualAssets.length === 0) {
      return (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your Rewards & Achievements</h3>
          <p className="text-gray-500 mb-4">
            Complete your profile and engage with the platform to earn rewards
          </p>
          {profileCompletion < 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Complete your profile ({profileCompletion}% done) to earn your first rewards!
              </p>
            </div>
          )}
        </div>
      );
    }

    const groupedAssets = virtualAssets.reduce((groups, asset) => {
      if (!groups[asset.asset_type]) {
        groups[asset.asset_type] = [];
      }
      groups[asset.asset_type].push(asset);
      return groups;
    }, {} as Record<string, VirtualAsset[]>);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Rewards & Achievements ({virtualAssets.length})
          </h3>
          <button
            onClick={loadVirtualAssets}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>

        {groupedAssets.achievement_badge && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Achievement Badges
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedAssets.achievement_badge.map((asset) => (
                <div key={asset.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      asset.rarity_tier === 'rare' ? 'bg-purple-500' : 
                      asset.rarity_tier === 'uncommon' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{asset.display_name}</h5>
                      <p className="text-sm text-gray-600">{asset.user_description}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        asset.rarity_tier === 'rare' ? 'bg-purple-100 text-purple-800' :
                        asset.rarity_tier === 'uncommon' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {asset.rarity_tier}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedAssets.reward_points && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Reward Points
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedAssets.reward_points.map((asset) => (
                <div key={asset.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{asset.display_name}</h5>
                      <p className="text-sm text-gray-600">{asset.user_description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{asset.token_balance}</div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileCompletion < 100 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Next Milestone</h4>
            <p className="text-sm text-gray-600 mb-3">
              Complete your profile to unlock more rewards
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {profileCompletion}% complete
            </div>
          </div>
        )}
      </div>
    );
  };

  // NEW: Enhanced Security/Activity tab with wallet progression info
  const renderActivityTab = () => {
    const isOwn = currentUserId === userId;
    
    if (!isOwn) {
      return (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Activity</h3>
          <p className="text-gray-500 mb-4">
            View this user's recent platform activity and interactions
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              Activity tracking features coming soon
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Account Security & Settings</h3>
        </div>

        {walletProgression && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" />
                Account Security Status
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Profile Completion</span>
                  <span className="text-sm font-medium text-green-600">{profileCompletion}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Account Stage</span>
                  <span className="text-sm font-medium text-blue-600 capitalize">
                    {walletProgression.onboarding_stage.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Security Features</span>
                  <span className="text-sm font-medium text-gray-600">
                    {walletProgression.wallet_education_completed ? 'Completed' : 'Basic'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4" />
                Account Backup & Recovery
              </h4>
              
              <p className="text-sm text-gray-600 mb-3">
                Secure your account with backup options and recovery settings
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Email verification active</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-500">Account backup (coming soon)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-500">Two-factor authentication (coming soon)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!walletProgression && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Loading account security information...
            </p>
          </div>
        )}
      </div>
    );
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

  const ListCard = ({ list }: { list: UserList }) => (
    <div className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{list.title}</h3>
          {list.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{list.description}</p>
          )}
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              list.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {list.is_public ? 'Public' : 'Private'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <List className="w-4 h-4" />
            {list.item_count} items
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {list.likes_count}
          </span>
          <span>{formatDate(list.created_at)}</span>
        </div>
        
        <button
          onClick={() => window.location.href = `/lists/${list.id}`}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          View List
        </button>
      </div>
    </div>
  );

  // UPDATED: New SavedListCard component
  const SavedListCard = ({ list }: { list: SavedListData }) => (
    <div className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{list.icon || '📚'}</div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">{list.name}</h3>
            {list.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{list.description}</p>
            )}
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                list.listType === 'places' ? 'bg-blue-100 text-blue-800' :
                list.listType === 'bookmarks' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {list.listType === 'places' ? 'Places to Try' :
                 list.listType === 'bookmarks' ? 'Bookmarks' : 'Mixed'}
              </span>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                list.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {list.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <List className="w-4 h-4" />
            {list.itemCount} items
          </span>
          <span>{formatDate(list.createdAt)}</span>
        </div>
        
        <button
          onClick={() => window.location.href = `/saved-lists/${list.id}`}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          View List
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

  // UPDATED: renderContentTab now handles saved lists properly
  const renderContentTab = (type: 'lists' | 'likes' | 'bookmarks') => {
    const isOwn = currentUserId === userId;
    
    if (contentLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading {type}...</p>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 mb-2">{contentError}</p>
            <button 
              onClick={() => {
                if (type === 'lists') loadUserLists();
                else if (type === 'likes') loadUserLikes();
                else if (type === 'bookmarks') loadUserSavedLists(); // UPDATED
              }}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    const data = type === 'lists' ? listsData : type === 'likes' ? likesData : savedListsData; // UPDATED
    const emptyIcon = type === 'lists' ? List : type === 'likes' ? Heart : Bookmark;
    
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          {React.createElement(emptyIcon, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" })}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {type === 'lists' 
              ? (isOwn ? "You haven't created any guides yet" : "No guides yet")
              : type === 'likes'
              ? (isOwn ? "You haven't liked any recommendations yet" : "No likes yet")
              : (isOwn ? "You haven't created any lists yet" : "No lists yet") // UPDATED
            }
          </h3>
          <p className="text-gray-500 mb-4">
            {type === 'lists'
              ? (isOwn ? "Create curated guides to share with others" : "This user hasn't created any guides yet")
              : type === 'likes'
              ? (isOwn ? "Like recommendations you find helpful" : "This user hasn't liked any recommendations yet")
              : (isOwn ? "Save recommendations to organized lists" : "This user hasn't created any lists yet") // UPDATED
            }
          </p>
          {isOwn && (
            <button
              onClick={() => {
                if (type === 'bookmarks') window.location.href = '/discover';
                else window.location.href = '/discover';
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {type === 'lists' ? 'Create a Guide' : type === 'bookmarks' ? 'Start Saving' : 'Discover Content'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {type === 'lists' ? 'Guides' : type === 'likes' ? 'Likes' : 'Saved Lists'} ({data.length}) 
          </h3>
          <button
            onClick={() => {
              if (type === 'lists') loadUserLists();
              else if (type === 'likes') loadUserLikes();
              else if (type === 'bookmarks') loadUserSavedLists(); // UPDATED
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        
        <div className="space-y-4">
          {type === 'lists' && listsData.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
          {type === 'likes' && likesData.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
          {type === 'bookmarks' && savedListsData.map((list) => ( // UPDATED
            <SavedListCard key={list.id} list={list} />
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
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const userLocation = formatLocation(user.locationCity, user.locationCountry);
  const authInfo = getAuthenticationDisplay(user);

  return (
    <div className="max-w-4xl mx-auto p-6">
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
              
              {/* Authentication display */}
              <div className="flex items-center gap-2 mb-2">
                {authInfo.icon}
                <span className="text-sm text-gray-500">{authInfo.display}</span>
              </div>
              
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
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
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

      {/* Stats Grid with enhanced color accents */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all"
          onClick={() => setActiveTab('recommendations')}
        >
          <div className="text-2xl font-bold text-blue-600">{user.totalRecommendations}</div>
          <div className="text-sm text-gray-600">Recommendations</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-green-50 hover:border-green-200 transition-all"
          onClick={() => setActiveTab('followers')}
        >
          <div className="text-2xl font-bold text-green-600">{user.followers}</div>
          <div className="text-sm text-gray-600">Followers</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition-all"
          onClick={() => setActiveTab('following')}
        >
          <div className="text-2xl font-bold text-purple-600">{user.following}</div>
          <div className="text-sm text-gray-600">Following</div>
        </div>
        
        <div 
          className="bg-white rounded-lg shadow-sm border p-4 text-center cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all"
          onClick={() => setActiveTab('rewards')}
        >
          <div className="text-2xl font-bold text-orange-600">{user.tokensEarned || 0}</div>
          <div className="text-sm text-gray-600">Tokens Earned</div>
        </div>
      </div>

      {/* Enhanced Tabs - UPDATED with new labels */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex overflow-x-auto scrollbar-hide pb-0">
            {[
              { key: 'recommendations', label: 'Recs', fullLabel: 'Recommendations', icon: MessageCircle, color: 'blue' },
              { key: 'lists', label: 'Guides', fullLabel: 'Guides', icon: List, color: 'indigo' },
              { key: 'likes', label: 'Likes', fullLabel: 'Likes', icon: Heart, color: 'pink' },
              { key: 'bookmarks', label: 'My Lists', fullLabel: 'My Lists', icon: Bookmark, color: 'green' },
              { key: 'followers', label: 'Followers', fullLabel: 'Followers', icon: Users, color: 'purple' },
              { key: 'following', label: 'Following', fullLabel: 'Following', icon: Users, color: 'teal' },
              { key: 'rewards', label: 'Rewards', fullLabel: 'Rewards', icon: Award, color: 'orange' },
              { key: 'activity', label: 'Security', fullLabel: 'Security', icon: Shield, color: 'gray' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ContentTab)}
                className={`flex items-center gap-1 px-2 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={tab.fullLabel}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'recommendations' && renderRecommendationsTab()}
          {activeTab === 'lists' && renderContentTab('lists')}
          {activeTab === 'likes' && renderContentTab('likes')}
          {activeTab === 'bookmarks' && renderContentTab('bookmarks')}
          {activeTab === 'followers' && renderSocialTab('followers')}
          {activeTab === 'following' && renderSocialTab('following')}
          {activeTab === 'rewards' && renderRewardsTab()}
          {activeTab === 'activity' && renderActivityTab()}
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