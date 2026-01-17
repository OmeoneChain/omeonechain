// File: code/poc/frontend/app/[locale]/community/page.tsx
// UPDATED: Dark mode support added
// UPDATED: BocaBoca Community Page with i18n translations
// UPDATED: Added Find Friends from Contacts feature

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import CleanHeader from '@/components/CleanHeader';
import { socialApi } from '@/src/services/api';
import Image from 'next/image';
import Link from 'next/link';
import FindFriendsSection from '@/components/community/FindFriendsSection';

// ============================================
// TYPES
// ============================================

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
}

interface DiscoverUser extends User {
  // is_following inherited from User
}

// ============================================
// COMPACT USER CARD (for horizontal scroll)
// ============================================

interface CompactUserCardProps {
  user: DiscoverUser;
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
  isLoading?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function CompactUserCard({ user, onFollow, onUnfollow, isLoading, t }: CompactUserCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isFollowing) {
        await onUnfollow(user.id);
        setIsFollowing(false);
      } else {
        await onFollow(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/profile/${user.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="flex-shrink-0 w-[140px] bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-3 cursor-pointer hover:shadow-md hover:border-[#FF644A]/30 dark:hover:border-[#FF644A]/50 transition-all duration-200"
    >
      {/* Avatar */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF644A] to-[#E65441] flex items-center justify-center">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.display_name || t('user.anonymous')}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <span className="text-white text-sm font-semibold">
              {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Name & Username */}
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-[#1F1E2A] dark:text-white truncate">
          {user.display_name || t('user.anonymous')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{user.username || 'user'}
        </p>
      </div>

      {/* Followers count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-2">
        {t('user.followerCount', { count: user.followers_count || 0 })}
      </p>

      {/* Follow Button */}
      <button
        onClick={handleFollowClick}
        disabled={isProcessing || isLoading}
        className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
          isFollowing
            ? 'bg-gray-100 dark:bg-[#353444] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#404050]'
            : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
        } ${(isProcessing || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isProcessing ? t('actions.processing') : isFollowing ? t('actions.following') : t('actions.follow')}
      </button>
    </div>
  );
}

// ============================================
// FULL USER CARD (for vertical list / search results)
// ============================================

interface UserCardProps {
  user: DiscoverUser;
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
  isLoading?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function UserCard({ user, onFollow, onUnfollow, isLoading, t }: UserCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isFollowing) {
        await onUnfollow(user.id);
        setIsFollowing(false);
      } else {
        await onFollow(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/profile/${user.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-4 cursor-pointer hover:shadow-md hover:border-[#FF644A]/30 dark:hover:border-[#FF644A]/50 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#FF644A] to-[#E65441] flex items-center justify-center flex-shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.display_name || t('user.anonymous')}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <span className="text-white text-lg font-semibold">
              {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1F1E2A] dark:text-white truncate">
              {user.display_name || t('user.anonymous')}
            </h3>
            {user.verification_status === 'verified' && (
              <span className="text-[#FF644A]" title={t('user.verified')}>✓</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{user.username || 'user'}
          </p>
          {user.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {user.bio}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{t('user.followerCount', { count: user.followers_count || 0 })}</span>
            <span>{t('user.recommendationCount', { count: user.recommendations_count || 0 })}</span>
            {user.location_city && <span>📍 {user.location_city}</span>}
          </div>
        </div>

        {/* Follow Button */}
        <button
          onClick={handleFollowClick}
          disabled={isProcessing || isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 ${
            isFollowing
              ? 'bg-gray-100 dark:bg-[#353444] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#404050]'
              : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
          } ${(isProcessing || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? t('actions.processing') : isFollowing ? t('actions.following') : t('actions.follow')}
        </button>
      </div>
    </div>
  );
}

// ============================================
// SEARCH DROPDOWN RESULT ITEM
// ============================================

interface SearchResultItemProps {
  user: DiscoverUser;
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
  onClick: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function SearchResultItem({ user, onFollow, onUnfollow, onClick, t }: SearchResultItemProps) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isFollowing) {
        await onUnfollow(user.id);
        setIsFollowing(false);
      } else {
        await onFollow(user.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#353444] cursor-pointer transition-colors"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF644A] to-[#E65441] flex items-center justify-center flex-shrink-0">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.display_name || t('user.anonymous')}
            width={40}
            height={40}
            className="object-cover"
          />
        ) : (
          <span className="text-white text-sm font-semibold">
            {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#1F1E2A] dark:text-white truncate text-sm">
          {user.display_name || t('user.anonymous')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{user.username} · {t('user.followerCount', { count: user.followers_count || 0 })}
        </p>
      </div>

      {/* Follow Button */}
      <button
        onClick={handleFollowClick}
        disabled={isProcessing}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          isFollowing
            ? 'bg-gray-100 dark:bg-[#353444] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#404050]'
            : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isProcessing ? t('actions.processing') : isFollowing ? t('actions.following') : t('actions.follow')}
      </button>
    </div>
  );
}

// ============================================
// COMING SOON TEASER CARD
// ============================================

interface ComingSoonCardProps {
  icon: string;
  title: string;
  description: string;
  badgeText: string;
}

function ComingSoonCard({ icon, title, description, badgeText }: ComingSoonCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#353444] dark:to-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] border-dashed p-6 opacity-75">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1F1E2A] dark:text-white">{title}</h3>
            <span className="px-2 py-0.5 bg-[#FF644A]/10 dark:bg-[#FF644A]/20 text-[#FF644A] text-xs font-medium rounded-full">
              {badgeText}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HORIZONTAL SCROLL SECTION
// ============================================

interface HorizontalUserScrollProps {
  users: DiscoverUser[];
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
  isLoading?: boolean;
  onSeeAll: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function HorizontalUserScroll({ users, onFollow, onUnfollow, isLoading, onSeeAll, t }: HorizontalUserScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">{t('discover.title')}</h2>
        <button 
          onClick={onSeeAll}
          className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium transition-colors"
        >
          {t('discover.seeAll')}
        </button>
      </div>

      {/* Scrollable container */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#FFF4E1] dark:from-[#1F1E2A] to-transparent z-10 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FFF4E1] dark:from-[#1F1E2A] to-transparent z-10 pointer-events-none" />

        {/* Scroll area */}
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {users.map((user) => (
            <CompactUserCard
              key={user.id}
              user={user}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
              isLoading={isLoading}
              t={t}
            />
          ))}
          
          {users.length === 0 && !isLoading && (
            <div className="flex-shrink-0 w-full py-8 text-center text-gray-400 dark:text-gray-500">
              {t('discover.empty.title')}
            </div>
          )}
          
          {isLoading && (
            <div className="flex-shrink-0 w-full py-8 text-center text-gray-400 dark:text-gray-500">
              {t('discover.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMMUNITY PAGE
// ============================================

export default function CommunityPage() {
  const router = useRouter();
  const t = useTranslations('community');
  
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    user: currentUser, 
    token 
  } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'discover' | 'following'>('discover');
  
  // Discover state
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [showAllDiscover, setShowAllDiscover] = useState(false);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(true);
  
  // Following state
  const [followingUsers, setFollowingUsers] = useState<DiscoverUser[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoverUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  // Fetch discover users (limit 20 for list, sorted by followers)
  const fetchDiscoverUsers = useCallback(async () => {
    setIsLoadingDiscover(true);
    try {
      const response = await socialApi.discoverUsers(20, undefined, 'followers_count');
      if (response.users) {
        // Filter out users already being followed
        const notFollowing = response.users.filter((u: DiscoverUser) => !u.is_following);
        setDiscoverUsers(notFollowing);
      }
    } catch (error) {
      console.error('Error fetching discover users:', error);
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  // Fetch following users
  const fetchFollowingUsers = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setIsLoadingFollowing(true);
    try {
      const response = await socialApi.getFollowing(currentUser.id);
      if (response.following) {
        setFollowingUsers(response.following);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [currentUser?.id]);

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);
      try {
        const response = await socialApi.searchUsers(searchQuery.trim());
        if (response.users) {
          setSearchResults(response.users);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Initial data fetch
  useEffect(() => {
    fetchDiscoverUsers();
    // Also fetch following count for the tab badge
    if (isAuthenticated) {
      fetchFollowingUsers();
    }
  }, [fetchDiscoverUsers, fetchFollowingUsers, isAuthenticated]);

  // Fetch following when tab changes
  useEffect(() => {
    if (activeTab === 'following' && isAuthenticated) {
      fetchFollowingUsers();
    }
  }, [activeTab, isAuthenticated, fetchFollowingUsers]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current && 
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // FOLLOW/UNFOLLOW HANDLERS
  // ============================================

  const handleFollow = async (userId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    try {
      const response = await socialApi.followUser(userId);
      if (response.success) {
        // Update local state
        setDiscoverUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_following: true } : u
        ));
        setSearchResults(prev => prev.map(u => 
          u.id === userId ? { ...u, is_following: true } : u
        ));
        // Refresh following list if on that tab
        if (activeTab === 'following') {
          fetchFollowingUsers();
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await socialApi.unfollowUser(userId);
      if (response.success) {
        // Update local state
        setDiscoverUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_following: false } : u
        ));
        setSearchResults(prev => prev.map(u => 
          u.id === userId ? { ...u, is_following: false } : u
        ));
        setFollowingUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  // ============================================
  // SEARCH RESULT CLICK
  // ============================================

  const handleSearchResultClick = (userId: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    router.push(`/profile/${userId}`);
  };

  // ============================================
  // RENDER
  // ============================================

  // Get users for horizontal scroll (max 5, not following)
  const horizontalUsers = discoverUsers.slice(0, 5);
  
  // Get all users for "See All" view
  const allDiscoverUsers = discoverUsers;

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      {/* Header */}
      <CleanHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1F1E2A] dark:text-white">{t('page.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
              placeholder={t('search.placeholder')}
              className="w-full px-4 py-3 pl-10 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={t('search.clear')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && (
            <div 
              ref={searchDropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-xl shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-50 max-h-80 overflow-y-auto"
            >
              {isSearching ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('search.searching')}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-[#3D3C4A]">
                  {searchResults.map((user) => (
                    <SearchResultItem
                      key={user.id}
                      user={user}
                      onFollow={handleFollow}
                      onUnfollow={handleUnfollow}
                      onClick={() => handleSearchResultClick(user.id)}
                      t={t}
                    />
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('search.noResults', { query: searchQuery })}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Find Friends from Contacts - NEW SECTION */}
        {isAuthenticated && (
          <FindFriendsSection
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTab('discover');
              setShowAllDiscover(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-[#FF644A] text-white'
                : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A]'
            }`}
          >
            {t('tabs.discover')}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'following'
                ? 'bg-[#FF644A] text-white'
                : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A]'
            }`}
          >
            {t('tabs.following', { count: followingUsers.length })}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' ? (
          <div className="space-y-6">
            
            {/* Horizontal Scroll or Full List */}
            {!showAllDiscover ? (
              <>
                {/* Horizontal Discover Section */}
                <HorizontalUserScroll
                  users={horizontalUsers}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  isLoading={isLoadingDiscover}
                  onSeeAll={() => setShowAllDiscover(true)}
                  t={t}
                />

                {/* Coming Soon Sections */}
                <div className="space-y-4 mt-8">
                  <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">{t('comingSoon.title')}</h2>
                  
                  <ComingSoonCard
                    icon="🎯"
                    title={t('comingSoon.tasteCircles.title')}
                    description={t('comingSoon.tasteCircles.description')}
                    badgeText={t('comingSoon.badge')}
                  />
                  
                  <ComingSoonCard
                    icon="📝"
                    title={t('comingSoon.collaborativeLists.title')}
                    description={t('comingSoon.collaborativeLists.description')}
                    badgeText={t('comingSoon.badge')}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Back button and full list */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">{t('discover.title')}</h2>
                  <button 
                    onClick={() => setShowAllDiscover(false)}
                    className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium transition-colors"
                  >
                    {t('discover.backToOverview')}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {isLoadingDiscover ? (
                    <div className="py-12 text-center text-gray-400 dark:text-gray-500">{t('discover.loading')}</div>
                  ) : allDiscoverUsers.length > 0 ? (
                    allDiscoverUsers.map((discoverUser) => (
                      <UserCard
                        key={discoverUser.id}
                        user={discoverUser}
                        onFollow={handleFollow}
                        onUnfollow={handleUnfollow}
                        t={t}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-gray-400 dark:text-gray-500">{t('discover.empty.title')}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('discover.empty.subtitle')}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Following Tab */
          <div className="space-y-3">
            {!isAuthenticated ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('following.signInRequired.message')}</p>
                <Link 
                  href="/login"
                  className="inline-block px-6 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors"
                >
                  {t('actions.signIn')}
                </Link>
              </div>
            ) : isLoadingFollowing ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500">{t('following.loading')}</div>
            ) : followingUsers.length > 0 ? (
              followingUsers.map((followedUser) => (
                <UserCard
                  key={followedUser.id}
                  user={{ ...followedUser, is_following: true }}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  t={t}
                />
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-400 dark:text-gray-500">{t('following.empty.title')}</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-6 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors"
                >
                  {t('following.empty.cta')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}