// File: components/profile/UserProfile.tsx
// Refactored: Map-first profile with 4-tab structure (Taste Map | Activity | Network | Settings [own only])
// Preserves: all data fetching, rewards/onboarding/attribution, cards, follow/unfollow, profile editor, i18n
//
// =============================================================================
// DARK MODE PATTERNS USED IN THIS FILE:
// =============================================================================
// Page/Card background:   bg-white dark:bg-[#2D2C3A]
// Elevated surface:       bg-gray-50 dark:bg-[#353444]
// Borders:                border-gray-200 dark:border-[#3D3C4A]
// Light borders:          border-gray-100 dark:border-[#3D3C4A]
// Primary text:           text-gray-900 dark:text-gray-100
// Secondary text:         text-gray-600 dark:text-gray-400
// Muted text:             text-gray-500 dark:text-gray-500
// Faint text:             text-gray-400 dark:text-gray-500
// Hover states:           hover:bg-gray-50 dark:hover:bg-[#353444]
// Active sub-tabs:        bg-white dark:bg-[#2D2C3A] shadow-sm
// Skeleton loaders:       bg-gray-200 dark:bg-gray-700
// Gradient cards:         Light gradients → dark solid surfaces with accent borders
// Error backgrounds:      bg-red-50 dark:bg-red-900/20
// Success backgrounds:    bg-green-50 dark:bg-green-900/20
// Info backgrounds:       bg-blue-50 dark:bg-blue-900/20
// =============================================================================

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  Star,
  MapPin,
  Calendar,
  Settings,
  Share2,
  Loader2,
  Heart,
  MessageCircle,
  Bookmark,
  List,
  CheckCircle,
  Wallet,
  Mail,
  Award,
  Shield,
  Gift,
  Map as MapIcon,
  FileText,
  Repeat2
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import tokenBalanceService from '../../src/services/TokenBalanceService';
import onboardingService from '../../src/services/OnboardingService';
import { recommendationApi, AttributionRewardsResponse } from '../../src/services/api';

// NOTE: These imports assume you have these components.
// If your paths differ, only adjust these imports (rest of file should be drop-in).
import { ProfileEditor } from '../profile/ProfileEditor';
import ProfileMapView from '../profile/ProfileMapView';

interface UserProfileProps {
  userId: string;
  currentUserId?: string;
}

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

  // possible backend variants
  trust_score?: number;
  upvotes_count?: number;
  saves_count?: number;
  created_at?: string;
  updated_at?: string;
  content?: string;
}

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

interface ResharedRecommendation {
  reshare: {
    id: string;
    user_id: string;
    comment: string | null;
    created_at: string;
  };
  recommendation: UserRecommendation;
}

// ---- API base URL normalization (supports base with or without /api suffix) ----
const FALLBACK_BACKEND_URL =
  'https://omeonechain-production.up.railway.app';

function buildApiUrl(base: string, path: string) {
  // path should be like "/api/users/123" OR "/users/123" depending on base
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;

  const baseHasApi = /\/api$/.test(trimmedBase);
  const pathHasApi = /^\/api(\/|$)/.test(trimmedPath);

  if (baseHasApi && pathHasApi) {
    // base already ends with /api; path already starts with /api -> remove one
    return `${trimmedBase}${trimmedPath.replace(/^\/api/, '')}`;
  }
  if (baseHasApi && !pathHasApi) {
    return `${trimmedBase}${trimmedPath}`;
  }
  if (!baseHasApi && pathHasApi) {
    return `${trimmedBase}${trimmedPath}`;
  }
  // neither has /api -> add it
  return `${trimmedBase}/api${trimmedPath}`;
}

// ---- Profile completion ----
const calculateProfileCompletion = (user: UserProfileData): number => {
  let score = 0;
  const maxScore = 100;

  if (user.username && user.username !== user.userId && user.username.trim() !== '') score += 10;
  if (user.displayName && user.displayName !== user.username && user.displayName.trim() !== '') score += 10;
  if (user.bio && user.bio.length >= 10) score += 15;
  if (user.avatarUrl && !user.avatarUrl.includes('dicebear')) score += 15;

  if (user.locationCity && user.locationCity.trim() !== '') score += 10;
  if (user.locationCountry && user.locationCountry.trim() !== '') score += 10;

  if (user.walletAddress && user.walletAddress.trim() !== '' && user.walletAddress !== '0x') score += 10;
  if (user.verificationLevel !== 'basic') score += 10;

  if (user.totalRecommendations > 0) score += 5;
  if (user.followers > 0 || user.following > 0) score += 5;

  return Math.min(score, maxScore);
};

// ---- Tab model (4-tab design + sub-tabs) ----
type MainTab = 'tastemap' | 'activity' | 'network' | 'settings';
type ActivitySubTab = 'recommendations' | 'reshares' | 'lists' | 'likes' | 'bookmarks';
type NetworkSubTab = 'followers' | 'following';
type SettingsSubTab = 'rewards' | 'security';

export function UserProfile({ userId, currentUserId }: UserProfileProps) {
  const t = useTranslations();
  const router = useRouter();

  const { user: currentUser, updateUser, token } = useAuth();

  const API_BASE = useMemo(() => {
    // If you already set NEXT_PUBLIC_API_URL, this will use it.
    // Works whether you set it as "https://host" or "https://host/api".
    return process.env.NEXT_PUBLIC_API_URL || FALLBACK_BACKEND_URL;
  }, []);

  // ---- Core state ----
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Tab state (default to Taste Map)
  const [activeTab, setActiveTab] = useState<MainTab>('tastemap');
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('recommendations');
  const [networkSubTab, setNetworkSubTab] = useState<NetworkSubTab>('followers');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('rewards');

  // Profile editor
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Profile completion
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Rewards / onboarding
  const [attributionRewards, setAttributionRewards] = useState<AttributionRewardsResponse | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(false);

  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenBalanceLoading, setTokenBalanceLoading] = useState(false);

  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Social data
  const [followersData, setFollowersData] = useState<SocialUser[]>([]);
  const [followingData, setFollowingData] = useState<SocialUser[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Recommendations tab data
  const [recommendationsData, setRecommendationsData] = useState<UserRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Activity content (lists/likes/bookmarks/reshares)
  const [listsData, setListsData] = useState<UserList[]>([]);
  const [likesData, setLikesData] = useState<LikedRecommendation[]>([]);
  const [savedListsData, setSavedListsData] = useState<SavedListData[]>([]);
  const [resharesData, setResharesData] = useState<ResharedRecommendation[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [savedListsLoaded, setSavedListsLoaded] = useState(false);
  const [resharesLoaded, setResharesLoaded] = useState(false);

  const isOwnProfile = useMemo(() => {
    if (currentUser?.id) return currentUser.id === userId;
    if (currentUserId) return currentUserId === userId;
    return false;
  }, [currentUser?.id, currentUserId, userId]);

  // -------------------------------
  // Normalizers (handles snake_case payloads gracefully)
  // -------------------------------
  const normalizeUserProfile = useCallback((raw: any): UserProfileData => {
    const u = raw?.user || raw;

    return {
      userId: u.userId || u.id || u.user_id || userId,
      walletAddress: u.walletAddress || u.wallet_address || u.wallet || '0x',
      username: u.username || u.handle || u.user_name || u.id || userId,
      displayName: u.displayName || u.display_name || u.name || u.username || u.id || userId,
      bio: u.bio ?? undefined,
      avatarUrl: u.avatarUrl || u.avatar_url || u.avatar,
      reputationScore: Number(u.reputationScore ?? u.reputation_score ?? 0),
      trustScore: Number(u.trustScore ?? u.trust_score ?? 0),
      verificationLevel:
        (u.verificationLevel || u.verification_level || u.verification_status || 'basic') as
          | 'basic'
          | 'verified'
          | 'expert',
      specializations: Array.isArray(u.specializations) ? u.specializations : [],
      activeSince: u.activeSince || u.active_since || '',
      totalRecommendations: Number(u.totalRecommendations ?? u.total_recommendations ?? u.recommendations_count ?? 0),
      upvotesReceived: Number(u.upvotesReceived ?? u.upvotes_received ?? 0),
      tokensEarned: Number(u.tokensEarned ?? u.tokens_earned ?? 0),
      stakingBalance: Number(u.stakingBalance ?? u.staking_balance ?? 0),
      stakingTier: u.stakingTier || u.staking_tier || '',
      followers: Number(u.followers ?? u.followers_count ?? 0),
      following: Number(u.following ?? u.following_count ?? 0),
      locationCity: u.locationCity || u.location_city || undefined,
      locationCountry: u.locationCountry || u.location_country || undefined,
      email: u.email || undefined,
      createdAt: u.createdAt || u.created_at || new Date().toISOString(),
      updatedAt: u.updatedAt || u.updated_at || new Date().toISOString()
    };
  }, [userId]);

  const normalizeRecommendation = useCallback((rec: any): UserRecommendation => {
    const body = rec.body ?? rec.content ?? rec.description ?? '';
    return {
      ...rec,
      body,
      trustScore: Number(rec.trustScore ?? rec.trust_score ?? 0),
      upvotes: Number(rec.upvotes ?? rec.upvotes_count ?? 0),
      saves: Number(rec.saves ?? rec.saves_count ?? 0),
      createdAt: rec.createdAt ?? rec.created_at ?? '',
      updatedAt: rec.updatedAt ?? rec.updated_at ?? ''
    };
  }, []);

  // -------------------------------
  // Fetching functions (preserved 11)
  // -------------------------------
  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);

      const url = buildApiUrl(API_BASE, `/users/${userId}`);
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const normalized = normalizeUserProfile(data);
        setUser(normalized);
      } else if (response.status === 404) {
        setUser(null);
      } else {
        // keep old behavior: just log and show null-safe UI
        console.error('Failed to load user profile:', response.status);
      }
    } catch (e) {
      console.error('Network error loading user profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, normalizeUserProfile, token, userId]);

  const loadRecommendations = useCallback(async () => {
    try {
      setRecommendationsLoading(true);
      setRecommendationsError(null);

      // Preserve original endpoint shape: /api/recommendations?author=...
      const url = buildApiUrl(API_BASE, `/recommendations?author=${encodeURIComponent(userId)}`);

      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        let recs: any[] = [];
        if (Array.isArray(data)) recs = data;
        else if (Array.isArray(data?.recommendations)) recs = data.recommendations;
        else if (Array.isArray(data?.results)) recs = data.results;

        const normalized = recs.map(normalizeRecommendation);
        setRecommendationsData(normalized);
      } else {
        setRecommendationsError(`${t('profile.errors.loadingRecommendations')} (${response.status})`);
        setRecommendationsData([]);
      }
    } catch (e) {
      console.error('Error loading recommendations:', e);
      setRecommendationsError(`${t('profile.errors.network')} - ${t('profile.errors.loadingRecommendations')}`);
      setRecommendationsData([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [API_BASE, normalizeRecommendation, t, token, userId]);

  const loadUserReshares = useCallback(async () => {
    try {
      setContentLoading(true);
      setContentError(null);

      const url = buildApiUrl(API_BASE, `/users/${userId}/reshares`);
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        const rawItems: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.reshares)
            ? data.reshares
            : Array.isArray(data?.results)
              ? data.results
              : [];

        const mapped: ResharedRecommendation[] = rawItems.map((item: any) => {
          const recRaw = item.recommendation || item.recommendation_data || item;
          const rec = normalizeRecommendation({
            id: recRaw?.id || item?.recommendation_id || 'unknown',
            title: recRaw?.title || recRaw?.restaurantName || '[No Title]',
            body: recRaw?.body ?? recRaw?.content ?? recRaw?.description ?? '',
            category: recRaw?.category || 'General',
            location: recRaw?.location || undefined,
            trust_score: recRaw?.trust_score,
            trustScore: recRaw?.trustScore,
            upvotes_count: recRaw?.upvotes_count,
            upvotes: recRaw?.upvotes,
            saves_count: recRaw?.saves_count,
            saves: recRaw?.saves,
            created_at: recRaw?.created_at || item?.created_at,
            updated_at: recRaw?.updated_at || item?.created_at
          });

          return {
            reshare: {
              id: item?.id || item?.reshare_id || `${rec.id}-reshare`,
              user_id: item?.user_id || item?.userId || userId,
              comment: item?.comment ?? null,
              created_at: item?.created_at || item?.createdAt || rec.createdAt || new Date().toISOString()
            },
            recommendation: rec
          };
        });

        setResharesData(mapped);
      } else {
        setContentError(`${t('profile.errors.loadingReshares')} (${response.status})`);
        setResharesData([]);
      }
    } catch (e) {
      console.error('Error loading reshares:', e);
      setContentError(`${t('profile.errors.network')} - ${t('profile.errors.loadingReshares')}`);
      setResharesData([]);
    } finally {
      setContentLoading(false);
    }
  }, [API_BASE, normalizeRecommendation, t, token, userId]);

  const loadUserLists = useCallback(async () => {
    try {
      setContentLoading(true);
      setContentError(null);

      const url = buildApiUrl(API_BASE, `/lists?author=${encodeURIComponent(userId)}`);
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        let lists: UserList[] = [];
        if (Array.isArray(data)) lists = data;
        else if (Array.isArray(data?.lists)) lists = data.lists;
        else if (Array.isArray(data?.results)) lists = data.results;

        setListsData(lists);
      } else {
        setContentError(`${t('profile.errors.loadingLists')} (${response.status})`);
        setListsData([]);
      }
    } catch (e) {
      console.error('Error loading lists:', e);
      setContentError(`${t('profile.errors.network')} - ${t('profile.errors.loadingLists')}`);
      setListsData([]);
    } finally {
      setContentLoading(false);
      setListsLoaded(true);
    }
  }, [API_BASE, t, token, userId]);

  const loadUserLikes = useCallback(async () => {
    try {
      setContentLoading(true);
      setContentError(null);

      const url = buildApiUrl(API_BASE, `/users/${userId}/likes`);
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        const rawLikes: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.recommendations)
            ? data.recommendations
            : Array.isArray(data?.likes)
              ? data.likes
              : Array.isArray(data?.results)
                ? data.results
                : [];

        const normalized = rawLikes.map((r: any) => ({
          ...(normalizeRecommendation(r) as any),
          liked_at: r.liked_at || r.created_at || new Date().toISOString()
        }));

        setLikesData(normalized);
      } else {
        setContentError(`${t('profile.errors.loadingLikes')} (${response.status})`);
        setLikesData([]);
      }
    } catch (e) {
      console.error('Error loading likes:', e);
      setContentError(`${t('profile.errors.network')} - ${t('profile.errors.loadingLikes')}`);
      setLikesData([]);
    } finally {
      setContentLoading(false);
      setLikesLoaded(true);
    }
  }, [API_BASE, normalizeRecommendation, t, token, userId]);

  const loadUserSavedLists = useCallback(async () => {
    try {
      setContentLoading(true);
      setContentError(null);

      const url = buildApiUrl(API_BASE, `/saved-lists`);
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        let lists: SavedListData[] = [];
        if (Array.isArray(data)) lists = data;
        else if (Array.isArray(data?.lists)) lists = data.lists;
        else if (Array.isArray(data?.results)) lists = data.results;

        setSavedListsData(lists);
      } else {
        setContentError(`${t('profile.errors.loadingSavedLists')} (${response.status})`);
        setSavedListsData([]);
      }
    } catch (e) {
      console.error('Error loading saved lists:', e);
      setContentError(`${t('profile.errors.network')} - ${t('profile.errors.loadingSavedLists')}`);
      setSavedListsData([]);
    } finally {
      setContentLoading(false);
      setSavedListsLoaded(true);
    }
  }, [API_BASE, t, token, userId]);

  const loadFollowers = useCallback(async () => {
    try {
      setSocialLoading(true);
      setSocialError(null);

      // Preserve original social endpoint used in long file
      const url = buildApiUrl(API_BASE, `/social/users/${userId}/followers`);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        let users: SocialUser[] = [];
        if (Array.isArray(data)) users = data;
        else if (Array.isArray(data?.followers)) users = data.followers;
        else if (Array.isArray(data?.users)) users = data.users;
        else if (Array.isArray(data?.results)) users = data.results;

        setFollowersData(users);
      } else {
        setSocialError(`${t('profile.errors.loadingFollowers')} (${response.status})`);
        setFollowersData([]);
      }
    } catch (e) {
      console.error('Error loading followers:', e);
      setSocialError(`${t('profile.errors.network')} - ${t('profile.errors.loadingFollowers')}`);
      setFollowersData([]);
    } finally {
      setSocialLoading(false);
    }
  }, [API_BASE, t, userId]);

  const loadFollowing = useCallback(async () => {
    try {
      setSocialLoading(true);
      setSocialError(null);

      const url = buildApiUrl(API_BASE, `/social/users/${userId}/following`);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        let users: SocialUser[] = [];
        if (Array.isArray(data)) users = data;
        else if (Array.isArray(data?.following)) users = data.following;
        else if (Array.isArray(data?.users)) users = data.users;
        else if (Array.isArray(data?.results)) users = data.results;

        setFollowingData(users);
      } else {
        setSocialError(`${t('profile.errors.loadingFollowing')} (${response.status})`);
        setFollowingData([]);
      }
    } catch (e) {
      console.error('Error loading following:', e);
      setSocialError(`${t('profile.errors.network')} - ${t('profile.errors.loadingFollowing')}`);
      setFollowingData([]);
    } finally {
      setSocialLoading(false);
    }
  }, [API_BASE, t, userId]);

  const loadTokenBalance = useCallback(async () => {
    try {
      setTokenBalanceLoading(true);
      const result = await tokenBalanceService.getRealTokenBalance(userId);
      setTokenBalance(result.balance);
    } catch (e) {
      console.error('❌ Failed to load token balance:', e);
    } finally {
      setTokenBalanceLoading(false);
    }
  }, [userId]);

  const loadOnboardingProgress = useCallback(async () => {
    try {
      setOnboardingLoading(true);
      const progress = await onboardingService.getOnboardingProgress(userId);
      setOnboardingProgress(progress);
    } catch (e) {
      console.error('❌ Failed to load onboarding progress:', e);
    } finally {
      setOnboardingLoading(false);
    }
  }, [userId]);

  const loadAttributionRewards = useCallback(async () => {
    try {
      setAttributionLoading(true);
      const rewards = await recommendationApi.getAttributionRewards(userId);
      setAttributionRewards(rewards);
    } catch (e) {
      console.error('❌ Failed to load attribution rewards:', e);
    } finally {
      setAttributionLoading(false);
    }
  }, [userId]);

  // -------------------------------
  // Follow status + follow/unfollow (preserved)
  // -------------------------------
  const checkFollowStatus = useCallback(async () => {
    if (!token || isOwnProfile) return;

    // Try a couple of plausible endpoints; fail silently to false.
    try {
      // Attempt: /api/social/following/:userId/check
      const url1 = buildApiUrl(API_BASE, `/social/following/${userId}/check`);
      const res1 = await fetch(url1, { headers: { Authorization: `Bearer ${token}` } });
      if (res1.ok) {
        const data = await res1.json();
        setIsFollowing(Boolean(data?.isFollowing));
        return;
      }
    } catch {
      // ignore
    }

    try {
      // Fallback: no check endpoint known -> default false
      setIsFollowing(false);
    } catch (e) {
      console.error('Error checking follow status:', e);
      setIsFollowing(false);
    }
  }, [API_BASE, isOwnProfile, token, userId]);

  const handleFollow = useCallback(async () => {
    if (!token || followLoading || isOwnProfile) return;

    try {
      setFollowLoading(true);

      // Primary behavior preserved from long version:
      // POST /api/social/follow  { following_id }
      // DELETE /api/social/follow/:userId
      if (isFollowing) {
        const url = buildApiUrl(API_BASE, `/social/follow/${userId}`);
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          setIsFollowing(false);
          setUser((prev) => (prev ? { ...prev, followers: Math.max(0, prev.followers - 1) } : prev));
          return;
        }
      } else {
        const url = buildApiUrl(API_BASE, `/social/follow`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: userId })
        });

        if (res.ok) {
          setIsFollowing(true);
          setUser((prev) => (prev ? { ...prev, followers: prev.followers + 1 } : prev));
          return;
        }
      }

      // Optional fallback (short-version style): POST /social/follow or /social/unfollow with {userId}
      const fallbackUrl = buildApiUrl(API_BASE, `/social/${isFollowing ? 'unfollow' : 'follow'}`);
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (fallbackRes.ok) {
        setIsFollowing((v) => !v);
        setUser((prev) =>
          prev
            ? { ...prev, followers: prev.followers + (isFollowing ? -1 : 1) }
            : prev
        );
      }
    } catch (e) {
      console.error('Network error during follow operation:', e);
    } finally {
      setFollowLoading(false);
    }
  }, [API_BASE, followLoading, isFollowing, isOwnProfile, token, userId]);

  // -------------------------------
  // Save profile (preserved)
  // -------------------------------
  const handleProfileSave = useCallback(
    async (profileData: any) => {
      try {
        if (user) {
          const updatedUser = {
            ...user,
            username: profileData.username || user.username,
            displayName: profileData.display_name || profileData.displayName || user.displayName,
            bio: profileData.bio || user.bio,
            avatarUrl: profileData.avatar_url || profileData.avatarUrl || user.avatarUrl,
            locationCity: profileData.location_city || profileData.locationCity || user.locationCity,
            locationCountry: profileData.location_country || profileData.locationCountry || user.locationCountry
          };

          setUser(updatedUser);

          if (currentUser && (currentUser.id === userId || currentUserId === userId)) {
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
      } catch (e) {
        console.error('Error updating profile:', e);
      }
    },
    [currentUser, currentUserId, loadUserProfile, updateUser, user, userId]
  );

  // -------------------------------
  // Helpers (preserved + share)
  // -------------------------------
  const getAuthenticationDisplay = (u: UserProfileData) => {
    if (u.walletAddress && u.walletAddress.trim() !== '' && u.walletAddress !== '0x') {
      return {
        type: 'wallet' as const,
        icon: <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />,
        display: `${u.walletAddress.substring(0, 6)}...${u.walletAddress.substring(u.walletAddress.length - 4)}`
      };
    }
    return {
      type: 'email' as const,
      icon: <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      display: u.email || t('header.emailAccount')
    };
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-3 h-3 text-white" />
          </div>
        );
      case 'expert':
        return (
          <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <Star className="w-3 h-3 text-white" />
          </div>
        );
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
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleShare = useCallback(async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/users/${user?.userId || userId}`
        : '';

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: `${user?.displayName || user?.username || 'User'} on BocaBoca`,
          url: shareUrl
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        // If you have a toast system, hook it up here.
      }
    } catch {
      // user cancelled or share failed; no-op
    }
  }, [user?.displayName, user?.userId, user?.username, userId]);

  // -------------------------------
  // Effects
  // -------------------------------
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (!user) return;
    setProfileCompletion(calculateProfileCompletion(user));
  }, [user]);

  useEffect(() => {
    if (!userId) return;
    // Preserved: load token + onboarding for the profile user (used in rewards/settings)
    // You can restrict to isOwnProfile if you prefer, but this preserves old behavior.
    loadTokenBalance();
    loadOnboardingProgress();
  }, [loadOnboardingProgress, loadTokenBalance, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!isOwnProfile) {
      checkFollowStatus();
    }
  }, [checkFollowStatus, isOwnProfile, userId]);

  // Lazy load content on tab/sub-tab activation (per refactor spec)
  useEffect(() => {
    if (!userId || !user) return;

    if (activeTab === 'activity') {
      if (activitySubTab === 'recommendations' && recommendationsData.length === 0 && !recommendationsLoading) {
        loadRecommendations();
      } else if (activitySubTab === 'reshares' && resharesData.length === 0 && !contentLoading) {
        loadUserReshares();
      } else if (activitySubTab === 'lists' && !listsLoaded && !contentLoading) {
        loadUserLists();
      } else if (activitySubTab === 'likes' && !likesLoaded && !contentLoading) {
        loadUserLikes();
      } else if (activitySubTab === 'bookmarks' && !savedListsLoaded && !contentLoading) {
        loadUserSavedLists();
      }
    } else if (activeTab === 'network') {
      if (networkSubTab === 'followers' && followersData.length === 0 && !socialLoading) {
        loadFollowers();
      } else if (networkSubTab === 'following' && followingData.length === 0 && !socialLoading) {
        loadFollowing();
      }
    } else if (activeTab === 'settings' && isOwnProfile) {
      // Ensure rewards content is up to date when opening settings
      if (!attributionRewards && !attributionLoading) loadAttributionRewards();
    }
  }, [
    activeTab,
    activitySubTab,
    attributionLoading,
    attributionRewards,
    followersData.length,
    followingData.length,
    isOwnProfile,
    likesLoaded,
    listsLoaded,
    loadAttributionRewards,
    loadFollowers,
    loadFollowing,
    loadRecommendations,
    loadUserLikes,
    loadUserLists,
    loadUserReshares,
    loadUserSavedLists,
    recommendationsData.length,
    recommendationsLoading,
    resharesData.length,
    savedListsLoaded,
    socialLoading,
    contentLoading,
    user,
    userId
  ]);

  useEffect(() => {
    if (isOwnProfile) {
      loadAttributionRewards();
    }
  }, [isOwnProfile, loadAttributionRewards]);

  // -------------------------------
  // Cards (preserved with dark mode)
  // -------------------------------
  const SocialUserCard = ({ user: socialUser }: { user: SocialUser }) => (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A] hover:shadow-sm dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-shadow">
      <div className="relative">
        <img
          src={socialUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${socialUser.username || socialUser.id}`}
          alt={socialUser.display_name}
          className="w-12 h-12 rounded-full object-cover cursor-pointer"
          onClick={() => router.push(`/users/${socialUser.id}`)}
        />
        {socialUser.verification_status && socialUser.verification_status !== 'basic' && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h3
          className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
          onClick={() => router.push(`/users/${socialUser.id}`)}
        >
          {socialUser.display_name || socialUser.username || 'Unknown User'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">@{socialUser.username || socialUser.id}</p>

        {socialUser.bio && <p className="text-sm text-gray-500 dark:text-gray-500 mb-1 line-clamp-2">{socialUser.bio}</p>}

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
          <span>{socialUser.followers_count || 0} {t('profile.stats.followers').toLowerCase()}</span>
          <span>{socialUser.recommendations_count || 0} {t('profile.stats.recommendations').toLowerCase()}</span>
          {socialUser.avg_trust_score > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {socialUser.avg_trust_score.toFixed(1)}
            </span>
          )}
          {socialUser.location_city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {socialUser.location_city}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/users/${socialUser.id}`)}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-[#4D4C5A] rounded-lg hover:bg-gray-50 dark:hover:bg-[#353444]"
        >
          {t('profile.cards.viewProfile')}
        </button>
      </div>
    </div>
  );

  const RecommendationCard = ({ recommendation }: { recommendation: UserRecommendation }) => (
    <div className="bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A] p-4 hover:shadow-sm dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{recommendation.title}</h3>
          {recommendation.category && (
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
              {recommendation.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-700 dark:text-gray-300">{Number(recommendation.trustScore || 0).toFixed(1)}</span>
        </div>
      </div>

      {recommendation.body && <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{recommendation.body}</p>}

      {recommendation.location && (
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-500 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{recommendation.location.address || recommendation.location.city}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
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
          onClick={() => router.push(`/recommendations/${recommendation.id}`)}
          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          {t('profile.cards.viewDetails')}
        </button>
      </div>
    </div>
  );

  const ListCard = ({ list }: { list: UserList }) => (
    <div className="bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A] p-4 hover:shadow-sm dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{list.title}</h3>
          {list.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{list.description}</p>}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-2 py-1 text-xs rounded-full ${
                list.is_public 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}
            >
              {list.is_public ? t('profile.cards.public') : t('profile.cards.private')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <List className="w-4 h-4" />
            {t('profile.cards.items', { count: list.item_count })}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {list.likes_count}
          </span>
          <span>{formatDate(list.created_at)}</span>
        </div>

        <button
          onClick={() => router.push(`/lists/${list.id}`)}
          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          {t('profile.cards.viewList')}
        </button>
      </div>
    </div>
  );

  const SavedListCard = ({ list }: { list: SavedListData }) => (
    <div className="bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A] p-4 hover:shadow-sm dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{list.icon || '📚'}</div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{list.name}</h3>
            {list.description && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{list.description}</p>}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  list.listType === 'places'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    : list.listType === 'bookmarks'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                }`}
              >
                {list.listType === 'places'
                  ? t('profile.cards.placesToTry')
                  : list.listType === 'bookmarks'
                    ? t('profile.cards.bookmarks')
                    : t('profile.cards.mixed')}
              </span>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  list.isPublic 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}
              >
                {list.isPublic ? t('profile.cards.public') : t('profile.cards.private')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <List className="w-4 h-4" />
            {t('profile.cards.items', { count: list.itemCount })}
          </span>
          <span>{formatDate(list.createdAt)}</span>
        </div>

        <button
          onClick={() => router.push(`/saved-lists/${list.id}`)}
          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          {t('profile.cards.viewList')}
        </button>
      </div>
    </div>
  );

  const ResharedRecommendationCard = ({ item }: { item: ResharedRecommendation }) => (
    <div className="space-y-0">
      {item.reshare.comment && (
        <div className="bg-stone-50 dark:bg-[#353444] border border-stone-200 dark:border-[#3D3C4A] rounded-t-lg px-4 py-3">
          <p className="text-xs text-stone-500 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">
            {isOwnProfile ? t('profile.cards.yourCommentary') : t('profile.cards.theirCommentary')}
          </p>
          <p className="text-stone-900 dark:text-gray-100 text-sm leading-relaxed">{item.reshare.comment}</p>
          <p className="text-xs text-stone-400 dark:text-gray-500 mt-2">
            {t('profile.cards.resharedOn', { date: formatDate(item.reshare.created_at) })}
          </p>
        </div>
      )}

      <div className={item.reshare.comment ? '' : 'mt-0'}>
        <RecommendationCard recommendation={item.recommendation} />
      </div>
    </div>
  );

  // -------------------------------
  // Render: Tabs content
  // -------------------------------
  const renderRecommendationsTab = () => {
    if (recommendationsLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      );
    }

    if (recommendationsError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-400 mb-2">{recommendationsError}</p>
            <button onClick={loadRecommendations} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline">
              {t('profile.actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (recommendationsData.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isOwnProfile ? t('profile.empty.recommendations.own') : t('profile.empty.recommendations.other')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {isOwnProfile ? t('profile.empty.recommendations.ownDescription') : t('profile.empty.recommendations.otherDescription')}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => router.push('/create')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('profile.empty.recommendations.cta')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('profile.tabs.recommendationsFull')} ({recommendationsData.length})
          </h3>
          <button onClick={loadRecommendations} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            {t('profile.actions.refresh')}
          </button>
        </div>

        <div className="space-y-4">
          {recommendationsData.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      </div>
    );
  };

  const renderResharesTab = () => {
    if (contentLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-400 mb-2">{contentError}</p>
            <button onClick={loadUserReshares} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline">
              {t('profile.actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (resharesData.length === 0) {
      return (
        <div className="text-center py-12">
          <Share2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isOwnProfile ? t('profile.empty.reshares.own') : t('profile.empty.reshares.other')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {isOwnProfile ? t('profile.empty.reshares.ownDescription') : t('profile.empty.reshares.otherDescription')}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => router.push('/feed')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('profile.empty.reshares.cta')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('profile.tabs.reshares')} ({resharesData.length})
          </h3>
          <button onClick={loadUserReshares} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            {t('profile.actions.refresh')}
          </button>
        </div>

        <div className="space-y-6">
          {resharesData.map((item) => (
            <ResharedRecommendationCard key={item.reshare.id} item={item} />
          ))}
        </div>
      </div>
    );
  };

  const renderContentTab = (type: 'lists' | 'likes' | 'bookmarks') => {
    if (contentLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-400 mb-2">{contentError}</p>
            <button
              onClick={() => {
                if (type === 'lists') loadUserLists();
                else if (type === 'likes') loadUserLikes();
                else loadUserSavedLists();
              }}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
            >
              {t('profile.actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    const data = type === 'lists' ? listsData : type === 'likes' ? likesData : savedListsData;
    const emptyIcon = type === 'lists' ? List : type === 'likes' ? Heart : Bookmark;

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          {React.createElement(emptyIcon, { className: 'w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4' })}
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {type === 'lists'
              ? isOwnProfile
                ? t('profile.empty.lists.own')
                : t('profile.empty.lists.other')
              : type === 'likes'
                ? isOwnProfile
                  ? t('profile.empty.likes.own')
                  : t('profile.empty.likes.other')
                : isOwnProfile
                  ? t('profile.empty.bookmarks.own')
                  : t('profile.empty.bookmarks.other')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {type === 'lists'
              ? isOwnProfile
                ? t('profile.empty.lists.ownDescription')
                : t('profile.empty.lists.otherDescription')
              : type === 'likes'
                ? isOwnProfile
                  ? t('profile.empty.likes.ownDescription')
                  : t('profile.empty.likes.otherDescription')
                : isOwnProfile
                  ? t('profile.empty.bookmarks.ownDescription')
                  : t('profile.empty.bookmarks.otherDescription')}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {type === 'lists'
                ? t('profile.empty.lists.cta')
                : type === 'bookmarks'
                  ? t('profile.empty.bookmarks.cta')
                  : t('profile.empty.likes.cta')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {type === 'lists'
              ? t('profile.tabs.guides')
              : type === 'likes'
                ? t('profile.tabs.likes')
                : t('profile.tabs.myLists')}{' '}
            ({data.length})
          </h3>
          <button
            onClick={() => {
              if (type === 'lists') loadUserLists();
              else if (type === 'likes') loadUserLikes();
              else loadUserSavedLists();
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {t('profile.actions.refresh')}
          </button>
        </div>

        <div className="space-y-4">
          {type === 'lists' && listsData.map((list) => <ListCard key={list.id} list={list} />)}
          {type === 'likes' && likesData.map((rec) => <RecommendationCard key={rec.id} recommendation={rec} />)}
          {type === 'bookmarks' && savedListsData.map((list) => <SavedListCard key={list.id} list={list} />)}
        </div>
      </div>
    );
  };

  const renderNetworkTab = (type: 'followers' | 'following') => {
    const data = type === 'followers' ? followersData : followingData;

    if (socialLoading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      );
    }

    if (socialError) {
      return (
        <div className="text-center py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-400 mb-2">{socialError}</p>
            <button
              onClick={() => (type === 'followers' ? loadFollowers() : loadFollowing())}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
            >
              {t('profile.actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {type === 'followers'
              ? isOwnProfile
                ? t('profile.empty.followers.own')
                : t('profile.empty.followers.other')
              : isOwnProfile
                ? t('profile.empty.following.own')
                : t('profile.empty.following.other')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {type === 'followers'
              ? isOwnProfile
                ? t('profile.empty.followers.ownDescription')
                : t('profile.empty.followers.otherDescription')
              : isOwnProfile
                ? t('profile.empty.following.ownDescription')
                : t('profile.empty.following.otherDescription')}
          </p>
          {isOwnProfile && type === 'following' && (
            <button
              onClick={() => router.push('/community')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {t('profile.empty.following.cta')}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {type === 'followers' ? t('profile.tabs.followers') : t('profile.tabs.following')} ({data.length})
          </h3>
          <button
            onClick={() => (type === 'followers' ? loadFollowers() : loadFollowing())}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {t('profile.actions.refresh')}
          </button>
        </div>

        <div className="space-y-3">
          {data.map((su) => (
            <SocialUserCard key={su.id} user={su} />
          ))}
        </div>
      </div>
    );
  };

  const renderRewardsPanel = () => {
    if (!isOwnProfile) {
      return (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('profile.rewardsTab.title')}</h3>
          <p className="text-gray-500 dark:text-gray-500">{t('profile.rewardsTab.private')}</p>
        </div>
      );
    }

    if (onboardingLoading || tokenBalanceLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">{t('profile.rewardsTab.loading')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Token Balance Card - gradient in light, solid surface with accent border in dark */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-[#353444] dark:to-[#353444] border border-orange-200 dark:border-[#FF644A]/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-600 dark:text-[#FF644A]" />
              {t('profile.rewardsTab.balance.title')}
            </h3>
            <button
              onClick={() => {
                loadTokenBalance();
                loadOnboardingProgress();
                loadAttributionRewards();
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {t('profile.actions.refresh')}
            </button>
          </div>
          <div className="text-4xl font-bold text-orange-600 dark:text-[#FF644A] mb-2">{tokenBalance.toFixed(2)} BOCA</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.rewardsTab.balance.description')}</p>
        </div>

        {/* Attribution Rewards Card */}
        {attributionLoading ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-green-600 dark:text-green-400 mr-2" />
              <span className="text-gray-600 dark:text-gray-400">{t('common.loading')}</span>
            </div>
          </div>
        ) : attributionRewards && attributionRewards.total_count > 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                {t('profile.rewardsTab.attribution.title')}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {attributionRewards.total_earned_boca.toFixed(2)} BOCA
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {attributionRewards.total_count === 1
                    ? t('profile.rewardsTab.attribution.fromReshares', { count: attributionRewards.total_count })
                    : t('profile.rewardsTab.attribution.fromResharesPlural', { count: attributionRewards.total_count })}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('profile.rewardsTab.attribution.description')}</p>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {attributionRewards.attributions.map((attr) => (
                <div
                  key={attr.id}
                  className="bg-white dark:bg-[#2D2C3A] rounded-lg p-3 border border-green-100 dark:border-green-800/30 hover:border-green-200 dark:hover:border-green-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {attr.resharer.display_name || attr.resharer.username}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">{t('profile.rewardsTab.attribution.reshared')}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">"{attr.recommendation_title}"</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(attr.created_at)}</p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">+{attr.bonus_boca.toFixed(2)} BOCA</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {attributionRewards.pagination?.has_more && (
              <button
                onClick={() => {
                  // pagination intentionally preserved as "load more" placeholder
                  console.log('Load more attributions');
                }}
                className="w-full mt-4 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                {t('profile.rewardsTab.attribution.loadMore')}
              </button>
            )}
          </div>
        ) : null}

        {/* Onboarding Progress Card */}
        {onboardingProgress && !onboardingProgress.isComplete && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('profile.rewardsTab.onboarding.title')}</h3>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {onboardingProgress.completionPercentage}% {t('profile.rewardsTab.onboarding.complete')}
              </span>
            </div>

            <div className="space-y-4">
              {/* Follow Milestone */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    onboardingProgress.milestones.followUsers.isComplete 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {onboardingProgress.milestones.followUsers.isComplete ? '✓' : '👥'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('profile.rewardsTab.onboarding.milestones.followUsers.name')}</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{onboardingProgress.milestones.followUsers.displayReward}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('profile.rewardsTab.onboarding.milestones.followUsers.description')}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((onboardingProgress.milestones.followUsers.current / onboardingProgress.milestones.followUsers.requirement) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {onboardingProgress.milestones.followUsers.current}/{onboardingProgress.milestones.followUsers.requirement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations Milestone */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    onboardingProgress.milestones.createRecommendations.isComplete 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {onboardingProgress.milestones.createRecommendations.isComplete ? '✓' : '📝'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('profile.rewardsTab.onboarding.milestones.createRecommendations.name')}</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {onboardingProgress.milestones.createRecommendations.displayReward}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('profile.rewardsTab.onboarding.milestones.createRecommendations.description')}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((onboardingProgress.milestones.createRecommendations.current / onboardingProgress.milestones.createRecommendations.requirement) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {onboardingProgress.milestones.createRecommendations.current}/{onboardingProgress.milestones.createRecommendations.requirement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engagement Milestone */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    onboardingProgress.milestones.engageWithPosts.isComplete 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {onboardingProgress.milestones.engageWithPosts.isComplete ? '✓' : '💬'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('profile.rewardsTab.onboarding.milestones.engageWithPosts.name')}</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{onboardingProgress.milestones.engageWithPosts.displayReward}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('profile.rewardsTab.onboarding.milestones.engageWithPosts.description')}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((onboardingProgress.milestones.engageWithPosts.current / onboardingProgress.milestones.engageWithPosts.requirement) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {onboardingProgress.milestones.engageWithPosts.current}/{onboardingProgress.milestones.engageWithPosts.requirement}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {onboardingProgress.nextStep && (
              <div className="mt-4 p-3 bg-white dark:bg-[#2D2C3A] rounded-lg border border-blue-200 dark:border-blue-800/50">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{t('profile.rewardsTab.onboarding.nextStep')}</span>{' '}
                  {onboardingProgress.nextStep === 'follow' && t('profile.rewardsTab.onboarding.milestones.followUsers.name')}
                  {onboardingProgress.nextStep === 'recommend' && t('profile.rewardsTab.onboarding.milestones.createRecommendations.name')}
                  {onboardingProgress.nextStep === 'engage' && t('profile.rewardsTab.onboarding.milestones.engageWithPosts.name')}
                  {!['follow', 'recommend', 'engage'].includes(onboardingProgress.nextStep) && onboardingProgress.nextStep}
                </p>
              </div>
            )}
          </div>
        )}

        {onboardingProgress && onboardingProgress.isComplete && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('profile.rewardsTab.onboarding.completeTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {t('profile.rewardsTab.onboarding.completeDescription', { amount: onboardingProgress.displayTotalEarned })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">{t('profile.rewardsTab.onboarding.keepEngaging')}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSecurityPanel = () => {
    if (!isOwnProfile) {
      return (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('profile.activity.title')}</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">{t('profile.activity.description')}</p>
          <div className="bg-gray-50 dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.activity.comingSoon')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('profile.activity.security.title')}</h3>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" />
            {t('profile.activity.security.status')}
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('profile.activity.security.profileCompletion')}</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">{profileCompletion}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('profile.activity.security.accountStatus')}</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('profile.activity.security.active')}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('profile.activity.security.securityFeatures')}</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('profile.activity.security.basic')}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4" />
            {t('profile.activity.security.backup.title')}
          </h4>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('profile.activity.security.backup.description')}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="text-gray-700 dark:text-gray-300">{t('profile.activity.security.backup.emailVerification')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded" />
              <span className="text-gray-500 dark:text-gray-500">{t('profile.activity.security.backup.accountBackup')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded" />
              <span className="text-gray-500 dark:text-gray-500">{t('profile.activity.security.backup.twoFactor')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------
  // Loading / not found (preserved with dark mode)
  // -------------------------------
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
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
          <User className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('profile.header.userNotFound')}</h3>
          <p className="text-gray-500 dark:text-gray-500">{t('profile.header.userNotFoundDescription')}</p>
        </div>
      </div>
    );
  }

  // -------------------------------
  // Header + Tabs (4-tab)
  // -------------------------------
  const userLocation = formatLocation(user.locationCity, user.locationCountry);
  const authInfo = getAuthenticationDisplay(user);

  const mainTabs: { key: MainTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { key: 'tastemap', label: t('profile.tabs.tasteMap') ?? 'Taste Map', icon: <MapIcon className="w-4 h-4" />, visible: true },
    { key: 'activity', label: t('profile.tabs.activity') ?? 'Activity', icon: <FileText className="w-4 h-4" />, visible: true },
    { key: 'network', label: t('profile.tabs.network') ?? 'Network', icon: <Users className="w-4 h-4" />, visible: true },
    { key: 'settings', label: t('profile.tabs.settings') ?? 'Settings', icon: <Settings className="w-4 h-4" />, visible: isOwnProfile }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Compact Profile Header */}
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-[#3D3C4A] p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username || user.userId}`}
              alt={user.displayName}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border border-gray-200 dark:border-[#3D3C4A]"
            />
            {user.verificationLevel !== 'basic' && (
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#2D2C3A] rounded-full p-0.5">
                {getVerificationIcon(user.verificationLevel) || <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            )}
          </div>

          {/* Info & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {user.displayName || user.username}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-500 truncate">@{user.username}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowProfileEditor(true)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
                    title={t('profile.header.editProfile')}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                ) : currentUserId || currentUser?.id ? (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      isFollowing 
                        ? 'bg-gray-100 dark:bg-[#353444] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3D3C4A]' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Users className="w-4 h-4" />
                    {followLoading ? t('common.loading') : isFollowing ? t('profile.header.following') : t('profile.header.follow')}
                  </button>
                ) : null}

                <button
                  onClick={handleShare}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
                  title={t('profile.actions.share')}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bio */}
            {user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{user.bio}</p>}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1">
                {authInfo.icon}
                {authInfo.display}
              </span>

              {userLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {userLocation}
                </span>
              )}

              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {t('profile.header.joined', { date: new Date(user.createdAt).toLocaleDateString() })}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Stats Row (clickable -> tab routing) */}
        <div className="flex items-center justify-around mt-4 pt-4 border-t border-gray-100 dark:border-[#3D3C4A]">
          <button
            onClick={() => {
              setActiveTab('activity');
              setActivitySubTab('recommendations');
            }}
            className="text-center hover:bg-gray-50 dark:hover:bg-[#353444] px-4 py-2 rounded-lg transition-colors"
          >
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.totalRecommendations}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{t('profile.stats.recommendations')}</div>
          </button>

          <button
            onClick={() => {
              setActiveTab('network');
              setNetworkSubTab('followers');
            }}
            className="text-center hover:bg-gray-50 dark:hover:bg-[#353444] px-4 py-2 rounded-lg transition-colors"
          >
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.followers}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{t('profile.stats.followers')}</div>
          </button>

          <button
            onClick={() => {
              setActiveTab('network');
              setNetworkSubTab('following');
            }}
            className="text-center hover:bg-gray-50 dark:hover:bg-[#353444] px-4 py-2 rounded-lg transition-colors"
          >
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.following}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{t('profile.stats.following')}</div>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => {
                setActiveTab('settings');
                setSettingsSubTab('rewards');
              }}
              className="text-center hover:bg-gray-50 dark:hover:bg-[#353444] px-4 py-2 rounded-lg transition-colors"
            >
              <div className="text-lg font-bold text-orange-600 dark:text-[#FF644A]">
                {tokenBalanceLoading ? '...' : tokenBalance.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">{t('profile.stats.tokensEarned')}</div>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-[#3D3C4A] overflow-hidden">
        {/* Main Tab Nav */}
        <div className="flex border-b border-gray-200 dark:border-[#3D3C4A]">
          {mainTabs
            .filter((x) => x.visible)
            .map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
              </button>
            ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[420px]">
          {/* Taste Map */}
          {activeTab === 'tastemap' && (
            <ProfileMapView
              userId={userId}
              username={user.username}
              isOwnProfile={isOwnProfile}
              onReviewClick={(id: string) => router.push(`/recommendations/${id}`)}
              onRestaurantClick={(restaurantId: number) => router.push(`/restaurants/${restaurantId}`)}
            />
          )}

          {/* Activity */}
          {activeTab === 'activity' && (
            <div>
              <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-[#353444] border-b border-gray-100 dark:border-[#3D3C4A]">
                <button
                  onClick={() => setActivitySubTab('recommendations')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activitySubTab === 'recommendations' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('profile.tabs.recommendations')}
                </button>

                <button
                  onClick={() => setActivitySubTab('reshares')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activitySubTab === 'reshares' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Repeat2 className="w-4 h-4" />
                  {t('profile.tabs.reshares')}
                </button>

                <button
                  onClick={() => setActivitySubTab('lists')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activitySubTab === 'lists' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                  {t('profile.tabs.guides')}
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => setActivitySubTab('likes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activitySubTab === 'likes' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {t('profile.tabs.likes')}
                </button>

                <button
                  onClick={() => setActivitySubTab('bookmarks')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activitySubTab === 'bookmarks' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  {t('profile.tabs.myLists')}
                </button>
              </div>

              <div className="p-6">
                {activitySubTab === 'recommendations' && renderRecommendationsTab()}
                {activitySubTab === 'reshares' && renderResharesTab()}
                {activitySubTab === 'lists' && renderContentTab('lists')}
                {activitySubTab === 'likes' && renderContentTab('likes')}
                {activitySubTab === 'bookmarks' && renderContentTab('bookmarks')}
              </div>
            </div>
          )}

          {/* Network */}
          {activeTab === 'network' && (
            <div>
              <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-[#353444] border-b border-gray-100 dark:border-[#3D3C4A]">
                <button
                  onClick={() => setNetworkSubTab('followers')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    networkSubTab === 'followers' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('profile.tabs.followers')}
                  <span className="text-xs text-gray-400 dark:text-gray-500">({user.followers})</span>
                </button>
                <button
                  onClick={() => setNetworkSubTab('following')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    networkSubTab === 'following' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t('profile.tabs.following')}
                  <span className="text-xs text-gray-400 dark:text-gray-500">({user.following})</span>
                </button>
              </div>

              <div className="p-6">
                {networkSubTab === 'followers' && renderNetworkTab('followers')}
                {networkSubTab === 'following' && renderNetworkTab('following')}
              </div>
            </div>
          )}

          {/* Settings (own only) */}
          {activeTab === 'settings' && isOwnProfile && (
            <div>
              <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-[#353444] border-b border-gray-100 dark:border-[#3D3C4A]">
                <button
                  onClick={() => setSettingsSubTab('rewards')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    settingsSubTab === 'rewards' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {t('profile.tabs.rewards')}
                </button>
                <button
                  onClick={() => setSettingsSubTab('security')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    settingsSubTab === 'security' 
                      ? 'bg-white dark:bg-[#2D2C3A] shadow-sm text-gray-900 dark:text-gray-100' 
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {t('profile.tabs.security')}
                </button>
              </div>

              <div className="p-6">
                {settingsSubTab === 'rewards' && renderRewardsPanel()}
                {settingsSubTab === 'security' && renderSecurityPanel()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Editor Modal (preserved) */}
      <ProfileEditor
        isOpen={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        onSave={handleProfileSave}
      />
    </div>
  );
}

export default UserProfile;