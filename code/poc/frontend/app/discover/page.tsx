'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Grid3X3, List, MapPin, Star, Users, Heart, Clock, TrendingUp, Sparkles, ChevronDown, Map } from 'lucide-react';
import Link from 'next/link';
import { restaurantService, Restaurant } from '@/lib/services/restaurant-service';
import { generateRestaurantUrl, formatEngagementCount, timeAgo } from '@/lib/utils';

// Lists Section Component
const DiscoverListsSection = () => {
  const mockLists = [
    {
      id: 1,
      title: "Melhores Brunches da Asa Sul",
      description: "Lugares perfeitos para um brunch de fim de semana com amigos",
      author: {
        name: "Ana Gastronômica",
        avatar: "👩‍🍳",
        verified: true,
        followers: 2340
      },
      restaurantCount: 8,
      trustScore: 8.7,
      saves: 156,
      category: "Brunch",
      neighborhood: "Asa Sul",
      isNew: true,
      timeAgo: "15 jan",
      preview: [
        { name: "Café Daniel Briand", image: "🥐" },
        { name: "Bendito Benedito", image: "🧇" },
        { name: "Café com Letra", image: "☕" }
      ]
    },
    {
      id: 2,
      title: "Rodízio de Pizza Autêntico",
      description: "Os verdadeiros rodízios que todo brasiliense precisa conhecer",
      author: {
        name: "Pedro Foodie",
        avatar: "👨‍🍳",
        verified: false,
        followers: 890
      },
      restaurantCount: 5,
      trustScore: 9.2,
      saves: 89,
      category: "Pizza",
      neighborhood: "Asa Norte",
      isNew: false,
      timeAgo: "14 jan",
      preview: [
        { name: "Mama Mia", image: "🍕" },
        { name: "Villa Borghese", image: "🍕" },
        { name: "Fratelli", image: "🍕" }
      ]
    }
  ];

  const [activeTab, setActiveTab] = useState('trending');

  const getTrustScoreBadge = (score) => {
    if (score >= 9) return { color: 'bg-green-500', label: 'Excelente' };
    if (score >= 7) return { color: 'bg-blue-500', label: 'Muito Bom' };
    return { color: 'bg-yellow-500', label: 'Bom' };
  };

  const filteredLists = mockLists.filter(list => {
    if (activeTab === 'new') return list.isNew;
    if (activeTab === 'trending') return list.saves > 100;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Listas Curadas</h2>
            <p className="text-xs text-gray-600">Descobertas organizadas por especialistas</p>
          </div>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'trending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔥 Em Alta
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'new'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ✨ Novidades
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {filteredLists.map((list) => {
          const trustBadge = getTrustScoreBadge(list.trustScore);
          
          return (
            <div
              key={list.id}
              className="group bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200 min-w-[280px] flex-shrink-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {list.title}
                    </h3>
                    {list.isNew && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Novo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                    {list.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <div className={`w-2 h-2 rounded-full ${trustBadge.color}`}></div>
                  <span className="text-xs font-medium text-gray-700">{list.trustScore}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{list.author.avatar}</span>
                <span className="text-xs font-medium text-gray-700 truncate">
                  {list.author.name}
                </span>
                {list.author.verified && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex -space-x-1">
                  {list.preview.slice(0, 3).map((restaurant, index) => (
                    <div
                      key={index}
                      className="w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xs"
                      title={restaurant.name}
                    >
                      {restaurant.image}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  {list.restaurantCount} locais
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{list.saves}</span>
                  </div>
                  <span>{list.neighborhood}</span>
                </div>
                
                <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                  {list.category}
                </span>
              </div>
            </div>
          );
        })}
        
        <div className="min-w-[280px] flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 p-3 flex flex-col justify-center items-center text-center cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900 mb-1">Crie sua lista</h3>
          <p className="text-xs text-gray-600 mb-2">
            Ganhe tokens compartilhando suas descobertas
          </p>
          <button className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors">
            + Criar
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Filters Component
const AdvancedFilters = ({ filters, setFilters, onClose }) => {
  const renderPriceRange = (range) => {
    return '💰'.repeat(range) + '⚪'.repeat(4 - range);
  };

  return (
    <div className="mt-4 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
          <select
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas as Cidades</option>
            <option value="Brasília">Brasília</option>
            <option value="São Paulo">São Paulo</option>
            <option value="Lisbon">Lisboa</option>
          </select>
        </div>

        {/* Cuisine Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Culinária</label>
          <select
            value={filters.cuisineType}
            onChange={(e) => setFilters(prev => ({ ...prev, cuisineType: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas as Culinárias</option>
            <option value="Brasileira">Brasileira</option>
            <option value="Nordestina">Nordestina</option>
            <option value="Italiana">Italiana</option>
            <option value="Japonesa">Japonesa</option>
            <option value="Frutos do Mar">Frutos do Mar</option>
            <option value="Steakhouse">Steakhouse</option>
            <option value="Fine Dining">Fine Dining</option>
          </select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Preço</label>
          <div className="space-y-1">
            {[1, 2, 3, 4].map(price => (
              <label key={price} className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={filters.priceRange.includes(price)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters(prev => ({ ...prev, priceRange: [...prev.priceRange, price] }));
                    } else {
                      setFilters(prev => ({ ...prev, priceRange: prev.priceRange.filter(p => p !== price) }));
                    }
                  }}
                  className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                />
                {renderPriceRange(price)} {price === 1 ? '(até R$30)' : price === 2 ? '(R$30-60)' : price === 3 ? '(R$60-120)' : '(R$120+)'}
              </label>
            ))}
          </div>
        </div>

        {/* Trust Score Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trust Score Mínimo: {filters.minTrustScore}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={filters.minTrustScore}
            onChange={(e) => setFilters(prev => ({ ...prev, minTrustScore: Number(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar Por</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="trustScore">Trust Score</option>
              <option value="distance">Distância</option>
              <option value="recent">Recentemente Recomendado</option>
              <option value="recommendations">Mais Recomendados</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({
                search: '',
                city: '',
                cuisineType: '',
                priceRange: [1, 2, 3, 4],
                minTrustScore: 0,
                sortBy: 'trustScore'
              })}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Discovery Page Component
const EnhancedDiscoverPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bookmarkedRestaurants, setBookmarkedRestaurants] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    cuisineType: '',
    priceRange: [1, 2, 3, 4],
    minTrustScore: 0,
    sortBy: 'trustScore'
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Default to Brasília center
          setUserLocation({
            latitude: -15.7801,
            longitude: -47.8829
          });
        }
      );
    }
  }, []);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bookmarkedRestaurants');
      if (saved) {
        setBookmarkedRestaurants(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.warn('Could not load bookmarks:', error);
    }
  }, []);

  // Load restaurants initially
  useEffect(() => {
    loadRestaurants();
  }, [userLocation]);

  // Search restaurants with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRestaurants();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, userLocation]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const data = await restaurantService.searchRestaurants({
        city: 'Brasília',
        userLocation: userLocation || undefined,
        limit: 50
      });
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await restaurantService.searchRestaurants({
        query: filters.search.trim() || undefined,
        city: filters.city || 'Brasília',
        cuisineType: filters.cuisineType || undefined,
        priceRange: filters.priceRange.length > 0 ? filters.priceRange : undefined,
        minTrustScore: filters.minTrustScore > 0 ? filters.minTrustScore : undefined,
        userLocation: userLocation || undefined,
        limit: 50
      });
      setRestaurants(data);
    } catch (error) {
      console.error('Error searching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bookmark toggle
  const handleBookmark = async (restaurantId: string) => {
    const newBookmarks = new Set(bookmarkedRestaurants);
    if (newBookmarks.has(restaurantId)) {
      newBookmarks.delete(restaurantId);
    } else {
      newBookmarks.add(restaurantId);
    }
    setBookmarkedRestaurants(newBookmarks);
    
    try {
      localStorage.setItem('bookmarkedRestaurants', JSON.stringify([...newBookmarks]));
    } catch (error) {
      console.warn('Could not save bookmarks:', error);
    }
  };

  const getTrustScoreBadge = (score) => {
    if (score >= 9) return { color: 'text-green-600 bg-green-100', label: 'Excelente' };
    if (score >= 7) return { color: 'text-blue-600 bg-blue-100', label: 'Muito Bom' };
    return { color: 'text-yellow-600 bg-yellow-100', label: 'Bom' };
  };

  const renderPriceRange = (range) => {
    return '€'.repeat(range);
  };

  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 font-medium">{part}</mark>
      ) : part
    );
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants;

    // Apply client-side sorting if needed
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (filters.sortBy) {
          case 'trustScore':
            return (b.avgTrustScore || 0) - (a.avgTrustScore || 0);
          case 'distance':
            return (a.distance || 0) - (b.distance || 0);
          case 'recommendations':
            return (b.totalRecommendations || 0) - (a.totalRecommendations || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [restaurants, filters.sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Descobrir Restaurantes</h1>
          
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar restaurantes, bairros, tipos de comida..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                Filtros
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={() => setShowMapView(!showMapView)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                  showMapView ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showMapView ? <Grid3X3 className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                {showMapView ? 'Lista' : 'Mapa'}
              </button>
              
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <AdvancedFilters 
              filters={filters} 
              setFilters={setFilters} 
              onClose={() => setShowFilters(false)} 
            />
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Lists Section */}
        <DiscoverListsSection />

        {/* Map View */}
        {showMapView ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">Vista do Mapa</p>
                <p className="text-sm text-gray-500">Integração com serviço de mapas em desenvolvimento</p>
              </div>
            </div>
          </div>
        ) : (
          /* Restaurants Section */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Restaurantes ({loading ? '...' : filteredRestaurants.length})
              </h2>
              <div className="text-sm text-gray-600">
                {userLocation && (
                  <span className="text-green-600 mr-4">📍 Localização detectada</span>
                )}
                Ordenado por {filters.sortBy === 'trustScore' ? 'Trust Score' : 
                            filters.sortBy === 'distance' ? 'Distância' :
                            filters.sortBy === 'recent' ? 'Mais Recentes' : 'Mais Recomendados'}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Restaurants Grid/List */}
            {!loading && (
              <>
                {filteredRestaurants.length > 0 ? (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                    {filteredRestaurants.map((restaurant) => {
                      const trustBadge = getTrustScoreBadge(restaurant.avgTrustScore || 0);
                      const restaurantUrl = generateRestaurantUrl(restaurant.id, restaurant.name);
                      
                      const handleBookmarkClick = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBookmark(restaurant.id);
                      };
                      
                      if (viewMode === 'list') {
                        return (
                          <Link key={restaurant.id} href={restaurantUrl} className="block">
                            <div className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                      {highlightSearchTerm(restaurant.name, filters.search)}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <MapPin className="w-4 h-4" />
                                      {highlightSearchTerm(restaurant.address, filters.search)}
                                      {restaurant.distance && (
                                        <span>• {formatDistance(restaurant.distance)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${trustBadge.color}`}>
                                      Trust {(restaurant.avgTrustScore || 0).toFixed(1)}
                                    </span>
                                    <button
                                      onClick={handleBookmarkClick}
                                      className={`p-1 rounded transition-colors ${
                                        bookmarkedRestaurants.has(restaurant.id)
                                          ? 'text-red-500 hover:text-red-600'
                                          : 'text-gray-400 hover:text-red-500'
                                      }`}
                                    >
                                      <Heart className={`w-5 h-5 ${bookmarkedRestaurants.has(restaurant.id) ? 'fill-current' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {formatEngagementCount(restaurant.totalRecommendations || 0)} recomendações
                                  </span>
                                  {restaurant.cuisineType && (
                                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                      {restaurant.cuisineType}
                                    </span>
                                  )}
                                  {restaurant.priceRange && (
                                    <span className="font-medium">{renderPriceRange(restaurant.priceRange)}</span>
                                  )}
                                  {restaurant.verified && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                      Verificado
                                    </span>
                                  )}
                                </div>
                                
                                {restaurant.topRecommendation && (
                                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                                    <p className="text-sm text-gray-700 italic">
                                      "{restaurant.topRecommendation.excerpt}"
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      — {restaurant.topRecommendation.author}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      }
                      
                      return (
                        <Link key={restaurant.id} href={restaurantUrl} className="block">
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-1">
                                    {highlightSearchTerm(restaurant.name, filters.search)}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate">
                                      {highlightSearchTerm(restaurant.address, filters.search)}
                                    </span>
                                  </div>
                                  {restaurant.distance && (
                                    <div className="text-sm text-gray-500 mt-1">
                                      {formatDistance(restaurant.distance)}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={handleBookmarkClick}
                                  className={`p-1 rounded transition-colors ${
                                    bookmarkedRestaurants.has(restaurant.id)
                                      ? 'text-red-500 hover:text-red-600'
                                      : 'text-gray-400 hover:text-red-500'
                                  }`}
                                >
                                  <Heart className={`w-6 h-6 ${bookmarkedRestaurants.has(restaurant.id) ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${trustBadge.color}`}>
                                  Trust {(restaurant.avgTrustScore || 0).toFixed(1)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {formatEngagementCount(restaurant.totalRecommendations || 0)} recomendações
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-4">
                                {restaurant.cuisineType && (
                                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                                    {restaurant.cuisineType}
                                  </span>
                                )}
                                {restaurant.priceRange && (
                                  <span className="text-sm font-medium text-gray-700">
                                    {renderPriceRange(restaurant.priceRange)}
                                  </span>
                                )}
                                {restaurant.verified && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                    Verificado
                                  </span>
                                )}
                              </div>
                              
                              {restaurant.topRecommendation && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm text-gray-700 italic">
                                    "{restaurant.topRecommendation.excerpt}"
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    — {restaurant.topRecommendation.author}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum restaurante encontrado</h3>
                    <p className="text-gray-600">Tente ajustar seus filtros ou termos de busca</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDiscoverPage;