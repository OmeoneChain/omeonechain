// Social User List Component - displays followers, following, or user search results

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { User, Star, MapPin, Search, Filter, Users } from 'lucide-react';
import { FollowButton, QuickFollowButton } from './FollowButton';
import type { SocialUser, UserSearchFilters } from '../types/social-types';

interface SocialUserListProps {
  userId?: string; // For followers/following lists
  listType: 'followers' | 'following' | 'search' | 'suggestions';
  currentUserId: string;
  searchFilters?: UserSearchFilters;
  showSearch?: boolean;
  showFilters?: boolean;
  onUserClick?: (userId: string) => void;
}

export function SocialUserList({
  userId,
  listType,
  currentUserId,
  searchFilters,
  showSearch = false,
  showFilters = false,
  onUserClick
}: SocialUserListProps) {
  const t = useTranslations('common');
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchFilters?.query || '');
  const [filters, setFilters] = useState<UserSearchFilters>(searchFilters || {});
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    loadUsers(1, true);
  }, [userId, listType, filters]);

  const loadUsers = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setIsLoading(true);
      
      let url = '';
      let queryParams = new URLSearchParams({
        page: pageNum.toString(),
        per_page: '20'
      });

      switch (listType) {
        case 'followers':
          url = `/api/social/users/${userId}/followers`;
          break;
        case 'following':
          url = `/api/social/users/${userId}/following`;
          break;
        case 'suggestions':
          url = '/api/social/suggestions';
          queryParams.append('limit', '20');
          break;
        case 'search':
          url = '/api/social/users/search';
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              queryParams.append(key, value.toString());
            }
          });
          break;
      }

      const response = await fetch(`${url}?${queryParams}`, {
        headers: currentUserId ? {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        } : {}
      });

      if (response.ok) {
        const data = await response.json();
        
        let newUsers: SocialUser[] = [];
        if (listType === 'followers' || listType === 'following') {
          newUsers = data[listType].map((connection: any) => connection.user);
        } else if (listType === 'suggestions') {
          newUsers = data.suggestions;
        } else {
          newUsers = data.users;
        }

        setUsers(reset ? newUsers : [...users, ...newUsers]);
        setHasMore(data.has_more || false);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...filters, query: searchQuery };
    setFilters(newFilters);
    setPage(1);
  };

  const handleFilterChange = (newFilters: Partial<UserSearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPage(1);
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { 
            ...user, 
            is_following: isFollowing,
            followers_count: user.followers_count + (isFollowing ? 1 : -1)
          }
        : user
    ));
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-white" />
          </div>
        );
      case 'expert':
        return (
          <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const getListTitle = () => {
    switch (listType) {
      case 'followers':
        return t('social.userList.titles.followers');
      case 'following':
        return t('social.userList.titles.following');
      case 'suggestions':
        return t('social.userList.titles.suggestions');
      case 'search':
        return t('social.userList.titles.searchResults');
      default:
        return t('social.userList.titles.users');
    }
  };

  const getEmptyStateTitle = () => {
    if (listType === 'search') {
      return t('social.userList.empty.noUsersFound');
    }
    return t('social.userList.empty.noListTypeYet', { listType: t(`social.userList.listTypes.${listType}`) });
  };

  const getEmptyStateDescription = () => {
    if (listType === 'search') {
      return t('social.userList.empty.adjustCriteria');
    }
    return t('social.userList.empty.userHasNoListType', { listType: t(`social.userList.listTypes.${listType}`) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{getListTitle()}</h2>
        
        {showFilters && (
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>{t('social.userList.filters.button')}</span>
          </button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('social.userList.search.placeholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('social.userList.search.button')}
          </button>
        </form>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('social.userList.filters.minReputation')}
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={filters.min_reputation || ''}
                onChange={(e) => handleFilterChange({ min_reputation: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('social.userList.filters.verification')}
              </label>
              <select
                value={filters.verification_status || ''}
                onChange={(e) => handleFilterChange({ verification_status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">{t('social.userList.filters.options.all')}</option>
                <option value="verified">{t('social.userList.filters.options.verified')}</option>
                <option value="expert">{t('social.userList.filters.options.expert')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('social.userList.filters.sortBy')}
              </label>
              <select
                value={filters.sort_by || 'reputation'}
                onChange={(e) => handleFilterChange({ sort_by: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="reputation">{t('social.userList.filters.sortOptions.reputation')}</option>
                <option value="followers">{t('social.userList.filters.sortOptions.followers')}</option>
                <option value="recommendations">{t('social.userList.filters.sortOptions.recommendations')}</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.has_recommendations || false}
                  onChange={(e) => handleFilterChange({ has_recommendations: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>{t('social.userList.filters.hasRecommendations')}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="space-y-3">
        {isLoading && users.length === 0 ? (
          // Loading skeleton
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white rounded-lg border">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getEmptyStateTitle()}
            </h3>
            <p className="text-gray-500">
              {getEmptyStateDescription()}
            </p>
          </div>
        ) : (
          // User cards
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
            >
              {/* Avatar */}
              <div 
                className="relative cursor-pointer"
                onClick={() => onUserClick?.(user.id)}
              >
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
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onUserClick?.(user.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">{user.display_name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{t('social.userList.stats.followers', { count: user.followers_count })}</span>
                  <span>{t('social.userList.stats.recommendations', { count: user.recommendations_count })}</span>
                  {user.avg_trust_score > 0 && (
                    <span>{t('social.userList.stats.trust', { score: user.avg_trust_score.toFixed(1) })}</span>
                  )}
                </div>
              </div>

              {/* Follow Button */}
              <div className="flex-shrink-0">
                <QuickFollowButton
                  user={user}
                  currentUserId={currentUserId}
                  onFollowChange={handleFollowChange}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => loadUsers(page + 1, false)}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoading ? t('social.userList.loading') : t('social.userList.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

// Followers List Component
interface FollowersListProps {
  userId: string;
  currentUserId: string;
  onUserClick?: (userId: string) => void;
}

export function FollowersList({ userId, currentUserId, onUserClick }: FollowersListProps) {
  return (
    <SocialUserList
      userId={userId}
      listType="followers"
      currentUserId={currentUserId}
      onUserClick={onUserClick}
    />
  );
}

// Following List Component
interface FollowingListProps {
  userId: string;
  currentUserId: string;
  onUserClick?: (userId: string) => void;
}

export function FollowingList({ userId, currentUserId, onUserClick }: FollowingListProps) {
  return (
    <SocialUserList
      userId={userId}
      listType="following"
      currentUserId={currentUserId}
      onUserClick={onUserClick}
    />
  );
}

// User Search Component
interface UserSearchProps {
  currentUserId: string;
  initialFilters?: UserSearchFilters;
  onUserClick?: (userId: string) => void;
}

export function UserSearch({ currentUserId, initialFilters, onUserClick }: UserSearchProps) {
  const t = useTranslations('common');
  
  return (
    <SocialUserList
      listType="search"
      currentUserId={currentUserId}
      searchFilters={initialFilters}
      showSearch={true}
      showFilters={true}
      onUserClick={onUserClick}
    />
  );
}

// Follow Suggestions Component
interface FollowSuggestionsProps {
  currentUserId: string;
  onUserClick?: (userId: string) => void;
}

export function FollowSuggestions({ currentUserId, onUserClick }: FollowSuggestionsProps) {
  const t = useTranslations('common');
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('social.userList.suggestedForYou')}
      </h2>
      <SocialUserList
        listType="suggestions"
        currentUserId={currentUserId}
        onUserClick={onUserClick}
      />
    </div>
  );
}