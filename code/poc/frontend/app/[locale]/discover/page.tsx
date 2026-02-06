// File: code/poc/frontend/app/[locale]/discover/page.tsx
// UPDATED: Added dark mode support throughout
// UPDATED: Added ListSearch component to Curated Lists tab
// UPDATED: Added RequestSearch component to Requests tab
// UPDATED: Requests tab header with prominent Create Request button
// UPDATED: Context-aware Quick Actions sidebar - primary button changes based on active tab
// UPDATED: Sort discovery requests - Open first (newest), then by bounty, then answered/closed
// UPDATED: Mobile-specific layout - hide Quick Actions and Dining Memory on native mobile (Capacitor)
// 
// TAB TRANSLATION KEYS (update in locales/*/discover.json):
//   - tabs.map: "Mapa" (PT-BR) / "Map" (EN) - keeping as-is for now
//   - tabs.curated: "Roteiros" (PT-BR) / "Guides" (EN)
//   - tabs.requests: "Peça Dicas" (PT-BR) / "Questions" (EN)

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth, useAuthenticatedFetch } from '@/hooks/useAuth';
import { useCapacitor } from '@/hooks/useCapacitor';
import CleanHeader from '@/components/CleanHeader';
import ListCard from '@/components/ListCard';
import ListSearch from '@/components/discover/ListSearch';
import RequestSearch, { RequestFilters } from '@/components/discover/RequestSearch';
import CreateListFlow from '@/components/lists/CreateListFlow';
import MapView from '@/components/discover/MapView';
import RequestCard from '@/components/discover/RequestCard';
import CreateRequestModal from '@/components/discover/CreateRequestModal';
import toast from 'react-hot-toast';
import { MapIcon, List } from 'lucide-react';
import TrendingWidget from '@/components/discover/TrendingWidget';

const DiscoverPage = () => {
  const t = useTranslations('discover');
  const locale = useLocale();
  const { user, isLoading } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const router = useRouter();
  
  // Detect native mobile environment (Capacitor)
  const { isCapacitor } = useCapacitor();
  
  const [activeTab, setActiveTab] = useState('map');
  const [mapViewMode, setMapViewMode] = useState<'map' | 'list'>('map');
  
  const [curatedLists, setCuratedLists] = useState<any[]>([]);
  const [discoveryRequests, setDiscoveryRequests] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state for Curated Lists
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [isSearchingLists, setIsSearchingLists] = useState(false);

  // Search/filter state for Requests
  const [requestFilters, setRequestFilters] = useState<RequestFilters>({
    query: '',
    status: 'all',
    hasBounty: null,
    budget: 'all',
  });
  const [isSearchingRequests, setIsSearchingRequests] = useState(false);

  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [likedLists, setLikedLists] = useState<Set<string>>(new Set());
  const [bookmarkedLists, setBookmarkedLists] = useState<Set<string>>(new Set());
  const [bookmarkedRequests, setBookmarkedRequests] = useState<Set<string>>(new Set());

  const [userStats, setUserStats] = useState<{
    recommendations_count: number;
    following_count: number;
    followers_count: number;
  } | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app/api';

  // Filter function for searching lists
  const filterListsByQuery = useCallback((lists: any[], query: string): any[] => {
    if (!query.trim()) return lists;
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    return lists.filter(list => {
      const searchableFields = [
        list.title || '',
        list.description || '',
        list.best_for || '',
        list.author?.display_name || '',
        list.author?.username || '',
        ...(list.restaurants || []).map((r: any) => [
          r.name || '',
          r.city || '',
          r.category || '',
          r.cuisine_types || '',
          r.address || ''
        ].join(' ')),
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableFields.includes(term));
    });
  }, []);

  // Memoized filtered lists based on search query
  const filteredLists = useMemo(() => {
    return filterListsByQuery(curatedLists, listSearchQuery);
  }, [curatedLists, listSearchQuery, filterListsByQuery]);

  // Filter function for requests
  const filterRequests = useCallback((requests: any[], filters: RequestFilters): any[] => {
    return requests.filter(req => {
      // Text search across multiple fields
      if (filters.query.trim()) {
        const searchTerms = filters.query.toLowerCase().trim().split(/\s+/);
        const searchableText = [
          req.title || '',
          req.description || '',
          req.location || '',
          req.cuisine_type || '',
          req.occasion || '',
          req.creator?.display_name || '',
          req.creator?.username || '',
        ].join(' ').toLowerCase();
        
        if (!searchTerms.every(term => searchableText.includes(term))) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        const reqStatus = req.status?.toLowerCase();
        if (filters.status === 'open' && reqStatus !== 'open') return false;
        if (filters.status === 'answered' && reqStatus !== 'answered') return false;
        if (filters.status === 'closed' && reqStatus !== 'closed' && reqStatus !== 'expired') return false;
      }

      // Bounty filter
      if (filters.hasBounty === true) {
        const bountyAmount = req.stake_amount || req.bounty_amount || 0;
        if (bountyAmount <= 0) return false;
      }
      if (filters.hasBounty === false) {
        const bountyAmount = req.stake_amount || req.bounty_amount || 0;
        if (bountyAmount > 0) return false;
      }

      // Budget filter
      if (filters.budget !== 'all') {
        const reqBudget = req.budget || req.price_range || '';
        if (reqBudget !== filters.budget) return false;
      }

      return true;
    });
  }, []);

  // Memoized filtered requests based on filters
  const filteredRequests = useMemo(() => {
    return filterRequests(discoveryRequests, requestFilters);
  }, [discoveryRequests, requestFilters, filterRequests]);

  // Search handler for lists
  const handleListSearch = useCallback((query: string) => {
    setIsSearchingLists(true);
    setListSearchQuery(query);
    setTimeout(() => setIsSearchingLists(false), 150);
  }, []);

  // Clear search handler for lists
  const handleClearListSearch = useCallback(() => {
    setListSearchQuery('');
    setIsSearchingLists(false);
  }, []);

  // Filter handler for requests
  const handleRequestFilterChange = useCallback((filters: RequestFilters) => {
    setIsSearchingRequests(true);
    setRequestFilters(filters);
    setTimeout(() => setIsSearchingRequests(false), 150);
  }, []);

  const handleCreateRecommendation = () => {
    router.push('/create');
  };

  const handleCreateList = () => {
    if (!user) {
      toast.error(t('toast.loginRequired', { action: t('actions.createList') }));
      return;
    }
    setShowCreateListModal(true);
  };

  const handleCreateRequest = () => {
    if (!user) {
      toast.error(t('toast.loginRequired', { action: t('actions.createRequest') }));
      return;
    }
    setShowCreateRequestModal(true);
  };

  const handleCreateListSuccess = async (listId: string) => {
    toast.success(t('toast.listCreated'));
    await fetchCuratedListsFromAPI();
    setShowCreateListModal(false);
  };

  const handleCreateRequestSuccess = async (requestId: string) => {
    toast.success(t('toast.requestCreated'));
    await fetchDiscoveryRequests();
    setShowCreateRequestModal(false);
  };

  const handleLikeList = async (listId: string | number) => {
    const id = listId.toString();
    
    if (!user) {
      toast.error(t('toast.loginRequired', { action: t('actions.likeLists') }));
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/lists/${id}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action === 'liked') {
          setLikedLists(prev => new Set([...prev, id]));
        } else {
          setLikedLists(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }

        setCuratedLists(prev => prev.map(list => 
          list.id === id 
            ? { ...list, likes_count: data.action === 'liked' ? (list.likes_count + 1) : Math.max(0, list.likes_count - 1) }
            : list
        ));
      }
    } catch (error) {
      console.error('Error liking list:', error);
      toast.error(t('toast.likeFailed'));
    }
  };

  const handleBookmarkList = async (listId: string | number) => {
    const id = listId.toString();
    
    if (!user) {
      toast.error(t('toast.loginRequired', { action: t('actions.bookmarkLists') }));
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/lists/${id}/bookmark`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action === 'bookmarked') {
          setBookmarkedLists(prev => new Set([...prev, id]));
        } else {
          setBookmarkedLists(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error bookmarking list:', error);
      toast.error(t('toast.bookmarkFailed'));
    }
  };

  const handleBookmarkRequest = async (requestId: string) => {
    if (!user) {
      toast.error(t('toast.loginRequired', { action: t('actions.bookmarkRequests') }));
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/discovery/requests/${requestId}/bookmark`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action === 'added') {
          setBookmarkedRequests(prev => new Set([...prev, requestId]));
          toast.success(t('toast.bookmarkAdded'));
        } else {
          setBookmarkedRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(requestId);
            return newSet;
          });
          toast.success(t('toast.bookmarkRemoved'));
        }

        setDiscoveryRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, is_bookmarked: data.action === 'added' }
            : req
        ));
      }
    } catch (error) {
      console.error('Error bookmarking request:', error);
      toast.error(t('toast.bookmarkRequestFailed'));
    }
  };

  const handleShareList = (listId: string | number) => {
    toast.success(t('toast.shareCopied'));
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/users/${authorId}`);
  };

  const handleReportList = (listId: string | number) => {
    toast.success(t('toast.reportSubmitted'));
  };

  const handleReportRequest = (requestId: string) => {
    toast.success(t('toast.reportSubmitted'));
  };

  const handleViewHistory = () => {
    if (user) {
      router.push(`/users/${user.id}/history`);
    } else {
      router.push('/login');
    }
  };

  const handleRestaurantClick = (restaurantId: number) => {
    router.push(`/restaurant/${restaurantId}`);
  };

  const fetchUserInteractionStatus = async () => {
    if (!user) return;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/lists/status`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setLikedLists(new Set(data.likes));
          setBookmarkedLists(new Set(data.bookmarks));
        }
      }
    } catch (error) {
      console.log('Error fetching interaction status:', error);
    }
  };

  // Helper function to sort discovery requests
  // Priority: Open first (newest), then by bounty amount, then answered/closed
  const sortDiscoveryRequests = (requests: any[]): any[] => {
    return [...requests].sort((a, b) => {
      // Status priority: open > answered > closed/expired
      const statusPriority: Record<string, number> = { 
        'open': 0, 
        'answered': 1, 
        'closed': 2, 
        'expired': 2 
      };
      const aPriority = statusPriority[a.status?.toLowerCase()] ?? 2;
      const bPriority = statusPriority[b.status?.toLowerCase()] ?? 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same status, sort by bounty amount (higher first)
      const aBounty = a.stake_amount || a.bounty_amount || 0;
      const bBounty = b.stake_amount || b.bounty_amount || 0;
      if (aBounty !== bBounty) {
        return bBounty - aBounty;
      }
      
      // Then by created_at (newest first)
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
  };

  const fetchDiscoveryRequests = async () => {
    try {
      console.log('Fetching discovery requests from API...');
      const response = await authenticatedFetch(`${API_BASE_URL}/discovery/requests?limit=20&status=all`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Discovery requests response:', data);
      
      if (data.success && data.requests) {
        // Sort requests: Open first (newest), then by bounty, then other statuses
        const sortedRequests = sortDiscoveryRequests(data.requests);
        setDiscoveryRequests(sortedRequests);
        console.log(`Loaded ${sortedRequests.length} discovery requests (sorted: open first, then by bounty)`);
      } else {
        console.log('No requests in API response');
        setDiscoveryRequests([]);
      }
      
    } catch (error) {
      console.error('Failed to fetch discovery requests:', error);
      setDiscoveryRequests([]);
    }
  };

  const transformListForCard = (list: any) => {
    return {
      id: list.id,
      title: list.title,
      description: list.description || '',
      author: {
        id: list.author?.id || 'unknown',
        name: list.author?.display_name || 'Food Expert',
        avatar: list.author?.avatar || '👨‍🍳',
        verified: list.author?.verified || false,
        followers: list.author?.followers || 0,
        socialDistance: list.author?.socialDistance as 1 | 2 | undefined
      },
      restaurantCount: list.restaurant_count || 0,
      saves: list.saves_count || 0,
      likes: list.likes_count || 0,
      category: list.best_for?.split(',')[0]?.trim() || 'Food',
      neighborhood: list.restaurants?.[0]?.city || 'Brasília',
      isNew: false,
      timeAgo: list.created_at ? calculateTimeAgo(list.created_at) : 'Recent',
      createdAt: list.created_at,
      tags: list.best_for?.split(',').map((t: string) => t.trim()).slice(0, 3) || [],
      preview: (list.restaurants || []).slice(0, 3).map((r: any) => ({
        id: r.id,
        name: r.name || 'Restaurant',
        image: undefined,
        cuisine: r.category || 'Restaurant',
        rating: r.rating || undefined,
        location: r.city || 'Brasília'
      })),
      isBookmarked: bookmarkedLists.has(list.id.toString()),
      hasLiked: likedLists.has(list.id.toString()),
      coverImage: list.cover_image_url || null
    };
  };

  const calculateTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('timeAgo.now');
    if (diffInSeconds < 3600) return t('timeAgo.minutes', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('timeAgo.hours', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('timeAgo.days', { count: Math.floor(diffInSeconds / 86400) });
    return t('timeAgo.weeks', { count: Math.floor(diffInSeconds / 604800) });
  };

  const fetchCuratedListsFromAPI = async () => {
    try {
      if (!user) {
        console.log('User not authenticated, skipping list fetch');
        setCuratedLists([]);
        return;
      }

      console.log('Fetching lists from API...');
      const response = await authenticatedFetch(`${API_BASE_URL}/lists?limit=50`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && data.lists) {
        const listsWithUserInfo = await Promise.all(
          data.lists.map(async (list: any) => {
            let authorInfo = {
              id: list.created_by,
              display_name: 'Food Expert',
              username: 'user',
              avatar: '👨‍🍳',
              verified: false,
              followers: 0
            };

            if (list.created_by) {
              try {
                const userResponse = await authenticatedFetch(`${API_BASE_URL}/users/${list.created_by}`);
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  if (userData.success && userData.user) {
                    authorInfo = {
                      id: userData.user.id,
                      display_name: userData.user.display_name || userData.user.username || 'Food Expert',
                      username: userData.user.username || 'user',
                      avatar: userData.user.avatar || '👨‍🍳',
                      verified: userData.user.verified || false,
                      followers: userData.user.followers || 0
                    };
                  }
                }
              } catch (error) {
                console.log('Could not fetch user info for list author');
              }
            }

            return {
              id: list.id,
              title: list.title,
              description: list.description || '',
              author: authorInfo,
              restaurant_count: list.restaurant_count || 0,
              restaurants: list.restaurants || [],
              likes_count: list.likes_count || 0,
              saves_count: list.saves_count || 0,
              is_featured: false,
              best_for: list.tags?.join(',') || 'dining,food,restaurants',
              created_at: list.created_at,
              cover_image_url: list.cover_image_url || null
            };
          })
        );
        
        console.log(`Loaded ${listsWithUserInfo.length} lists from API`);
        setCuratedLists(listsWithUserInfo);
      } else {
        console.log('No lists in API response');
        setCuratedLists([]);
      }
      
    } catch (error) {
      console.error('Failed to fetch lists from API:', error);
      setCuratedLists([]);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/users/${user.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setUserStats({
            recommendations_count: data.stats.recommendations_count || 0,
            following_count: data.stats.following_count || 0,
            followers_count: data.stats.followers_count || 0
          });
        }
      }
    } catch (error) {
      console.log('Error fetching user stats:', error);
    }
  };

  const fetchData = async (isInitialLoad = false) => {
    // Only show loading spinner on initial load, not on background refreshes
    if (isInitialLoad) {
      setIsLoadingData(true);
    }
    setError(null);
    
    try {
      const [trendingResult] = await Promise.all([
        fetchCuratedListsFromAPI().catch(() => {}),
        fetchDiscoveryRequests().catch(() => {}),
        fetchUserInteractionStatus().catch(() => {}),
        fetchUserStats().catch(() => {})
      ]);
      
    } catch (err) {
      console.error('Error loading discover data:', err);
      setError('Failed to load content. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    // Only show loading state on first load when we have no data yet
    const isInitialLoad = curatedLists.length === 0 && discoveryRequests.length === 0;
    fetchData(isInitialLoad);
  }, [user]);

  // Context-aware Quick Actions (only used on web/desktop)
  const quickActions = useMemo(() => {
    const actions = [
      {
        key: 'createRecommendation',
        label: t('sidebar.quickActions.createRecommendation'),
        onClick: handleCreateRecommendation,
        primary: activeTab === 'map',
      },
      {
        key: 'createList',
        label: t('sidebar.quickActions.createList'),
        onClick: handleCreateList,
        primary: activeTab === 'curated',
      },
      {
        key: 'askRecommendations',
        label: t('sidebar.quickActions.askRecommendations'),
        onClick: handleCreateRequest,
        primary: activeTab === 'requests',
      },
    ];

    return [...actions].sort((a, b) => {
      if (a.primary) return -1;
      if (b.primary) return 1;
      return 0;
    });
  }, [activeTab, t]);

  // Check if any request filters are active
  const hasActiveRequestFilters = requestFilters.query.trim() !== '' || 
    requestFilters.status !== 'all' || 
    requestFilters.hasBounty !== null || 
    requestFilters.budget !== 'all';

  // Loading State
  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-[#353444] rounded w-64 mb-6"></div>
            <div className="h-12 bg-gray-200 dark:bg-[#353444] rounded w-full mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-gray-200 dark:bg-[#353444] rounded"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-[#353444] rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && curatedLists.length === 0 && trendingRecommendations.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-[#1F1E2A] dark:text-white mb-2">{t('loading.error.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button onClick={fetchData} className="px-6 py-2 bg-[#FF644A] hover:bg-[#E65441] text-white rounded-lg transition-colors">
              {t('loading.error.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      <CleanHeader />
      <div className={`max-w-7xl mx-auto px-4 py-6 ${isCapacitor ? 'pb-24' : ''}`}>
        
        {/* Page Header - Hidden on native mobile for cleaner look */}
        {!isCapacitor && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1F1E2A] dark:text-white mb-2">
              {t('page.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('page.subtitle')}
            </p>
          </div>
        )}

        <div className={`grid gap-8 ${isCapacitor ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
          {/* Main Content */}
          <div className={isCapacitor ? '' : 'lg:col-span-3'}>
            
            {/* Tabs */}
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'map'
                    ? 'bg-[#FF644A] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white hover:bg-white dark:hover:bg-[#2D2C3A]'
                }`}
              >
                {t('tabs.map')}
              </button>
              <button
                onClick={() => setActiveTab('curated')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'curated'
                    ? 'bg-[#FF644A] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white hover:bg-white dark:hover:bg-[#2D2C3A]'
                }`}
              >
                {t('tabs.curated')}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-[#FF644A] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white hover:bg-white dark:hover:bg-[#2D2C3A]'
                }`}
              >
                {t('tabs.requests')}
              </button>
            </div>
            
            {/* Map Tab */}
            {activeTab === 'map' && (
              <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-4 border border-gray-200 dark:border-[#3D3C4A]">
                {/* Map/List Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">
                    {t('tabs.mapSection.title', { defaultValue: 'Nearby Restaurants' })}
                  </h2>
                  <div className="flex bg-white dark:bg-[#353444] rounded-lg p-1 shadow-sm border border-gray-200 dark:border-[#3D3C4A]">
                    <button
                      onClick={() => setMapViewMode('map')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mapViewMode === 'map'
                          ? 'bg-[#FF644A] text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white'
                      }`}
                    >
                      <MapIcon className="w-4 h-4" />
                      {t('tabs.mapSection.mapView', { defaultValue: 'Map' })}
                    </button>
                    <button
                      onClick={() => setMapViewMode('list')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mapViewMode === 'list'
                        ? 'bg-[#FF644A] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      {t('tabs.mapSection.listView', { defaultValue: 'List' })}
                    </button>
                  </div>
                </div>

                {/* MapView */}
                <MapView 
                  onRestaurantClick={handleRestaurantClick}
                  onCreateRecommendation={(restaurantId, restaurantName) => {
                    router.push(`/create?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurantName)}`);
                  }}
                  initialCenter={{ lat: -15.7934, lng: -47.8823 }}
                  initialZoom={12}
                  showMap={mapViewMode === 'map'}
                  showList={mapViewMode === 'list'}
                />
              </div>
            )}

            {/* Curated Lists Tab */}
            {activeTab === 'curated' && (
              <div className="space-y-6">
                {/* Search Bar */}
                <ListSearch
                  onSearch={handleListSearch}
                  onClear={handleClearListSearch}
                  resultCount={listSearchQuery ? filteredLists.length : undefined}
                  isSearching={isSearchingLists}
                />

                {/* List Results */}
                {filteredLists.length > 0 ? (
                  filteredLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={transformListForCard(list)}
                      variant="hero"
                      showAuthor={true}
                      showActions={true}
                      onSave={handleBookmarkList}
                      onLike={handleLikeList}
                      onShare={handleShareList}
                      onAuthorClick={handleAuthorClick}
                      onReport={handleReportList}
                    />
                  ))
                ) : listSearchQuery ? (
                  // No results for search
                  <div className="text-center py-12 bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A]">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-[#1F1E2A] dark:text-white mb-2">
                        {t('lists.search.noResults.title')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {t('lists.search.noResults.description', { query: listSearchQuery })}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button 
                        onClick={handleClearListSearch} 
                        className="px-6 py-2 border border-gray-300 dark:border-[#3D3C4A] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors"
                      >
                        {t('lists.search.noResults.clearSearch')}
                      </button>
                      <button onClick={handleCreateList} className="px-6 py-2 bg-[#FF644A] hover:bg-[#E65441] text-white rounded-lg transition-colors">
                        {t('lists.search.noResults.createList')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // No lists at all (empty state)
                  <div className="text-center py-12 bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A]">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="text-lg font-medium text-[#1F1E2A] dark:text-white mb-2">{t('lists.empty.title')}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{t('lists.empty.description')}</p>
                    </div>
                    <button onClick={handleCreateList} className="px-6 py-2 bg-[#FF644A] hover:bg-[#E65441] text-white rounded-lg transition-colors">
                      {t('lists.empty.cta')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Requests Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                      {t('requests.title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('requests.subtitle')}
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRequest}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('requests.createButton')}
                  </button>
                </div>

                {/* Request Search & Filters */}
                <RequestSearch
                  onFilterChange={handleRequestFilterChange}
                  resultCount={hasActiveRequestFilters ? filteredRequests.length : undefined}
                  totalCount={discoveryRequests.length}
                  isSearching={isSearchingRequests}
                />

                {/* Request Cards or Empty State */}
                {filteredRequests.length > 0 ? (
                  <div className={`grid gap-4 ${
                    filteredRequests.length === 1 
                      ? 'grid-cols-1' 
                      : 'grid-cols-1 md:grid-cols-2'
                  }`}>
                    {filteredRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        variant="compact"
                        onBookmark={handleBookmarkRequest}
                        onReport={handleReportRequest}
                      />
                    ))}
                  </div>
                ) : hasActiveRequestFilters ? (
                  /* No results for filters */
                  <div className="text-center py-12 bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A]">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[#353444] flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-[#1F1E2A] dark:text-white mb-2">
                      {t('requestSearch.noResults')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {t('requests.search.noResults.description')}
                    </p>
                    <button
                      onClick={() => setRequestFilters({ query: '', status: 'all', hasBounty: null, budget: 'all' })}
                      className="px-4 py-2 text-[#FF644A] hover:text-[#E65441] font-medium"
                    >
                      {t('requestSearch.clearAll')}
                    </button>
                  </div>
                ) : (
                  /* Empty State - No requests at all */
                  <div className="text-center py-16 bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A]">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FFF4E1] dark:bg-[#FF644A]/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-[#FF644A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[#1F1E2A] dark:text-white mb-2">
                      {t('requests.empty.title')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      {t('requests.empty.description')}
                    </p>
                    <button
                      onClick={handleCreateRequest}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('requests.empty.cta')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Actions - Hidden on native mobile (accessible via bottom nav) */}
            {!isCapacitor && (
              <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm border border-gray-200 dark:border-[#3D3C4A] p-4">
                <h3 className="font-semibold text-[#1F1E2A] dark:text-white mb-4">{t('sidebar.quickActions.title')}</h3>
                <div className="space-y-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      onClick={action.onClick}
                      className={`w-full px-4 py-2.5 font-medium rounded-lg transition-colors text-center ${
                        action.primary
                          ? 'bg-[#FF644A] hover:bg-[#E65441] text-white'
                          : 'border-2 border-gray-200 dark:border-[#3D3C4A] hover:border-[#FF644A] hover:text-[#FF644A] text-[#1F1E2A] dark:text-white'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                  <button 
                    onClick={handleViewHistory}
                    className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-[#FF644A] font-medium transition-colors text-center"
                  >
                    {t('sidebar.quickActions.viewHistory')}
                  </button>
                </div>
              </div>
            )}

            {/* Trending Now - Always visible (including mobile) */}
            <TrendingWidget itemCount={5} />

            {/* Dining Memory - Hidden on native mobile */}
            {!isCapacitor && user && (
              <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-[#3D3C4A]">
                <h3 className="font-semibold text-[#1F1E2A] dark:text-white mb-4 flex items-center gap-2">
                  <span>🧠</span>
                  {t("sidebar.diningMemory.title")}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("sidebar.diningMemory.recentRecommendations", {
                      count: userStats?.recommendations_count || 0,
                    })}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("sidebar.diningMemory.savedLists", {
                      count: bookmarkedLists.size,
                    })}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("sidebar.diningMemory.following", {
                      count: userStats?.following_count || 0,
                    })}
                  </p>
                </div>
                {(userStats?.recommendations_count || 0) > 0 && (
                  <Link
                    href={`/${locale}/profile`}
                    className="mt-4 block text-center text-sm text-[#FF644A] hover:text-[#E65441] font-medium"
                  >
                    {t("sidebar.diningMemory.viewAll")}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateListFlow
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onSuccess={handleCreateListSuccess}
      />

      <CreateRequestModal
        isOpen={showCreateRequestModal}
        onClose={() => setShowCreateRequestModal(false)}
        onSuccess={handleCreateRequestSuccess}
      />
    </div>
  );
};

export default DiscoverPage;