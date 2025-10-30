// File: code/poc/frontend/app/discover/page.tsx
// UPDATED: Added Requests tab for Discovery Requests feature
// Integration: RequestCard and CreateRequestModal components

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthenticatedFetch } from '../../hooks/useAuth';
import CleanHeader from '../../components/CleanHeader';
import ListCard from '../../components/ListCard';
import CreateListFlow from '../../src/components/lists/CreateListFlow';
import MapView from '../../components/discover/MapView';
import RequestCard from '../../components/discover/RequestCard';
import CreateRequestModal from '../../components/discover/CreateRequestModal';
import { recommendationService, type Recommendation } from '../../lib/services/recommendation-service';
import toast from 'react-hot-toast';

const DiscoverPage = () => {
  const { user, isLoading } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('curated');
  
  const [curatedLists, setCuratedLists] = useState<any[]>([]);
  const [discoveryRequests, setDiscoveryRequests] = useState<any[]>([]);
  const [trendingRecommendations, setTrendingRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<{
    lists: any[];
    restaurants: any[];
  }>({ lists: [], restaurants: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [likedLists, setLikedLists] = useState<Set<string>>(new Set());
  const [bookmarkedLists, setBookmarkedLists] = useState<Set<string>>(new Set());
  const [bookmarkedRequests, setBookmarkedRequests] = useState<Set<string>>(new Set());

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  const handleCreateRecommendation = () => {
    router.push('/create');
  };

  const handleCreateList = () => {
    if (!user) {
      toast.error('Please log in to create a list');
      return;
    }
    setShowCreateListModal(true);
  };

  const handleCreateRequest = () => {
    if (!user) {
      toast.error('Please log in to create a request');
      return;
    }
    setShowCreateRequestModal(true);
  };

  const handleCreateListSuccess = async (listId: string) => {
    toast.success('List created successfully!');
    await fetchCuratedListsFromAPI();
    setShowCreateListModal(false);
  };

  const handleCreateRequestSuccess = async (requestId: string) => {
    toast.success('Request created successfully!');
    await fetchDiscoveryRequests();
    setShowCreateRequestModal(false);
    // Optionally redirect to the request detail page
    // router.push(`/discovery/requests/${requestId}`);
  };

  const handleLikeList = async (listId: string | number) => {
    const id = listId.toString();
    
    if (!user) {
      toast.error('Please log in to like lists');
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/lists/${id}/like`, {
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
      toast.error('Failed to like list');
    }
  };

  const handleBookmarkList = async (listId: string | number) => {
    const id = listId.toString();
    
    if (!user) {
      toast.error('Please log in to bookmark lists');
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/lists/${id}/bookmark`, {
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
      toast.error('Failed to bookmark list');
    }
  };

  const handleBookmarkRequest = async (requestId: string) => {
    if (!user) {
      toast.error('Please log in to bookmark requests');
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/discovery/requests/${requestId}/bookmark`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action === 'added') {
          setBookmarkedRequests(prev => new Set([...prev, requestId]));
          toast.success('Request bookmarked');
        } else {
          setBookmarkedRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(requestId);
            return newSet;
          });
          toast.success('Bookmark removed');
        }

        // Update the request in state
        setDiscoveryRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, is_bookmarked: data.action === 'added' }
            : req
        ));
      }
    } catch (error) {
      console.error('Error bookmarking request:', error);
      toast.error('Failed to bookmark request');
    }
  };

  const handleShareList = (listId: string | number) => {
    toast.success('Share link copied to clipboard!');
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/users/${authorId}`);
  };

  const handleReportList = (listId: string | number) => {
    toast.success('Report submitted. Thank you!');
  };

  const handleReportRequest = (requestId: string) => {
    toast.success('Report submitted. Thank you!');
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
      const response = await authenticatedFetch(`${API_BASE_URL}/api/lists/status`);
      
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

  const fetchDiscoveryRequests = async () => {
    try {
      console.log('Fetching discovery requests from API...');
      const response = await authenticatedFetch(`${API_BASE_URL}/api/discovery/requests?limit=20&status=open`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('Discovery requests response:', data);
      
      if (data.success && data.requests) {
        setDiscoveryRequests(data.requests);
        console.log(`Loaded ${data.requests.length} discovery requests`);
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
      hasLiked: likedLists.has(list.id.toString())
    };
  };

  const calculateTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const fetchCuratedListsFromAPI = async () => {
    try {
      if (!user) {
        console.log('User not authenticated, skipping list fetch');
        setCuratedLists([]);
        return;
      }

      console.log('Fetching lists from API...');
      const response = await authenticatedFetch(`${API_BASE_URL}/api/lists?limit=10`);
      
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
                const userResponse = await authenticatedFetch(`${API_BASE_URL}/api/users/${list.created_by}`);
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
              created_at: list.created_at
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

  const fetchData = async () => {
    setIsLoadingData(true);
    setError(null);
    
    try {
      const [trendingResult] = await Promise.all([
        recommendationService.getTrendingRecommendations(8).catch(() => []),
        fetchCuratedListsFromAPI().catch(() => {}),
        fetchDiscoveryRequests().catch(() => {}),
        fetchUserInteractionStatus().catch(() => {})
      ]);

      setTrendingRecommendations(trendingResult);
      
    } catch (err) {
      console.error('Error loading discover data:', err);
      setError('Failed to load content. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const searchSuggestions = [
    'Restaurantes românticos',
    'Pizzarias autênticas', 
    'Brunch da Asa Sul',
    'Happy hour downtown'
  ];

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    
    if (!query.trim()) {
      setSearchResults({ lists: [], restaurants: [] });
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=20`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
        
        if (data.total === 0) {
          setSearchError(`No results found for "${query}"`);
        }
      } else {
        throw new Error('Search request failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchResults({ lists: [], restaurants: [] });
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="h-12 bg-gray-200 rounded w-full mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && curatedLists.length === 0 && trendingRecommendations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Content Loading Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={fetchData} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CleanHeader />
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Great Food
          </h1>
          <p className="text-gray-600">
            Curated recommendations from trusted food experts in Brasília
          </p>
        </div>

        <div className="relative mb-8">
          <div className="flex">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search for restaurants, cuisines, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-3 pl-10 pr-4 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {showSuggestions && !isSearching && searchResults.lists.length === 0 && searchResults.restaurants.length === 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3">
            
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('curated')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'curated'
                    ? 'bg-blue-100 text-blue-700 border-blue-200 border'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Curated Lists
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-purple-100 text-purple-700 border-purple-200 border'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Requests
                {discoveryRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full">
                    {discoveryRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'map'
                    ? 'bg-blue-100 text-blue-700 border-blue-200 border'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Map View
              </button>
            </div>

            {activeTab === 'curated' && (
              <div className="space-y-6">
                {curatedLists.length > 0 ? (
                  curatedLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={transformListForCard(list)}
                      variant="compact"
                      showAuthor={true}
                      showActions={true}
                      onSave={handleBookmarkList}
                      onLike={handleLikeList}
                      onShare={handleShareList}
                      onAuthorClick={handleAuthorClick}
                      onReport={handleReportList}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No curated lists yet</h3>
                      <p className="text-gray-600 mb-4">Be the first to create a curated list of great restaurants!</p>
                    </div>
                    <button onClick={handleCreateList} className="btn-primary">
                      Create First List
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-6">
                {discoveryRequests.length > 0 ? (
                  discoveryRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      variant="compact"
                      onBookmark={handleBookmarkRequest}
                      onReport={handleReportRequest}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-purple-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                      <p className="text-gray-600 mb-4">Be the first to ask the community for restaurant recommendations!</p>
                    </div>
                    <button onClick={handleCreateRequest} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium">
                      Ask for Recommendations
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <MapView 
                onRestaurantClick={handleRestaurantClick}
                initialCenter={{ lat: -15.7934, lng: -47.8823 }}
                initialZoom={12}
              />
            )}
          </div>

          <div className="space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Trending Now
              </h3>
              <div className="space-y-3">
                {trendingRecommendations.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {rec.author.display_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{rec.title}</h4>
                        <p className="text-xs text-gray-500 mb-2">{rec.restaurant.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1 trust-high px-2 py-1 rounded-full text-xs border">
                            {rec.trust_score.toFixed(1)}
                          </span>
                          <span>{rec.upvotes_count} upvotes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {trendingRecommendations.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No trending content yet</p>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleCreateRecommendation}
                  className="btn-primary w-full hover:bg-blue-700 transition-colors"
                >
                  Create Recommendation
                </button>
                <button 
                  onClick={handleCreateList}
                  className="btn-secondary w-full hover:bg-gray-300 transition-colors"
                >
                  Create List
                </button>
                <button 
                  onClick={handleCreateRequest}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  Ask for Recommendations
                </button>
                <button 
                  onClick={handleViewHistory}
                  className="btn-ghost w-full hover:bg-gray-100 transition-colors"
                >
                  View My History
                </button>
              </div>
            </div>

            {user && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                <h3 className="font-semibold text-blue-900 mb-4">Your Dining Memory</h3>
                <div className="space-y-3">
                  <div className="text-sm text-blue-700">
                    <p>Recent recommendations: 0</p>
                    <p>Saved lists: {bookmarkedLists.size}</p>
                    <p>Following: 0 food experts</p>
                  </div>
                  <button 
                    onClick={handleViewHistory}
                    className="w-full px-4 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    View All History
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Total recommendations: {trendingRecommendations.length}</p>
                <p>Curated lists: {curatedLists.length}</p>
                <p>Open requests: {discoveryRequests.filter(r => r.status === 'open').length}</p>
                <p>Active food experts: {new Set(curatedLists.map(l => l.author?.id).filter(Boolean)).size}</p>
              </div>
            </div>
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