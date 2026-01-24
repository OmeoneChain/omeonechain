// components/restaurant/RestaurantAddition.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Check, AlertCircle, Star, ExternalLink, Loader } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Updated Restaurant interface with integer ID
interface Restaurant {
  id: number; // Changed from string to number
  name: string;
  normalized_name?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
  // Computed fields from backend
  distance?: number;
  avgTrustScore?: number;
  totalRecommendations?: number;
  topRecommendation?: {
    excerpt: string;
    author: string;
  };
}

interface CreateRestaurantData {
  name: string;
  address: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
}

interface RestaurantSuggestion {
  restaurant: Restaurant;
  similarity: number;
  distance?: number;
}

interface EnhancedRestaurantAdditionProps {
  onRestaurantSelected: (restaurant: Restaurant) => void;
  userLocation?: { latitude: number; longitude: number };
  userWallet?: string;
  defaultCity?: string;
}

// Cuisine type keys for translation lookup
const CUISINE_TYPE_KEYS = [
  'brazilian', 'northeastern', 'mineira', 'italian', 'japanese', 'chinese',
  'french', 'mediterranean', 'seafood', 'steakhouse', 'fastFood',
  'cafe', 'vegetarian', 'vegan', 'international', 'arabic', 'indian', 'thai', 'other'
] as const;

const SUPPORTED_CITIES = [
  { name: 'Brasília', country: 'Brazil', state: 'DF' },
  { name: 'São Paulo', country: 'Brazil', state: 'SP' },
  { name: 'Lisbon', country: 'Portugal', state: '' }
];

export default function RestaurantAddition({ 
  onRestaurantSelected, 
  userLocation,
  userWallet,
  defaultCity = 'Brasília'
}: EnhancedRestaurantAdditionProps) {
  const t = useTranslations('common');
  const tCuisine = useTranslations('common.cuisineTypes');
  const tRest = useTranslations('common.restaurants.addition');

  const [searchMode, setSearchMode] = useState<'search' | 'add'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // New restaurant form
  const [newRestaurant, setNewRestaurant] = useState<Partial<CreateRestaurantData>>({
    city: defaultCity,
    country: 'Brazil',
    priceRange: 2,
  });
  
  // Form validation and UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // API Base URL - matches your Core Server
  const API_BASE_URL = 'https://omeonechain-production.up.railway.app';

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRestaurantSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (error) {
      console.warn('Could not load recent searches:', error);
    }
  }, []);

  // Save search to recent searches
  const saveToRecentSearches = (query: string) => {
    if (!query.trim()) return;
    
    try {
      const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentRestaurantSearches', JSON.stringify(newRecent));
    } catch (error) {
      console.warn('Could not save recent search:', error);
    }
  };

  // Enhanced search with backend API integration
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Searching restaurants with backend API:', query);
      
      // Search for existing restaurants using your Core Server API
      const searchParams = new URLSearchParams({
        q: query.trim(),
        city: defaultCity,
        ...(userLocation?.latitude && { lat: userLocation.latitude.toString() }),
        ...(userLocation?.longitude && { lng: userLocation.longitude.toString() })
      });

      const response = await fetch(`${API_BASE_URL}/api/restaurants/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Restaurant search results:', data);
        
        // Handle exact matches
        setSearchResults(data.restaurants || []);
        
        // Handle suggestions for similar restaurants
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
        
        saveToRecentSearches(query.trim());
      } else {
        console.warn('Restaurant search failed:', response.status);
        setSearchResults([]);
        setSuggestions([]);
        setErrors({ search: tRest('search.error') });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setSuggestions([]);
      setErrors({ search: tRest('search.error') });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Get current location for new restaurant
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors({ location: tRest('geolocation.notSupported') });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewRestaurant(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsGettingLocation(false);
        setErrors(prev => ({ ...prev, location: '' }));
      },
      (error) => {
        let errorMessage = tRest('geolocation.failed');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = tRest('geolocation.permissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = tRest('geolocation.unavailable');
            break;
          case error.TIMEOUT:
            errorMessage = tRest('geolocation.timeout');
            break;
        }
        setErrors({ location: errorMessage });
        setIsGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Enhanced form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newRestaurant.name?.trim()) {
      newErrors.name = tRest('validation.nameRequired');
    } else if (newRestaurant.name.length < 2) {
      newErrors.name = tRest('validation.nameTooShort');
    }
    
    if (!newRestaurant.address?.trim()) {
      newErrors.address = tRest('validation.addressRequired');
    } else if (newRestaurant.address.length < 10) {
      newErrors.address = tRest('validation.addressTooShort');
    }
    
    if (!newRestaurant.latitude || !newRestaurant.longitude) {
      newErrors.location = tRest('validation.locationRequired');
    }

    if (newRestaurant.website && newRestaurant.website.trim()) {
      try {
        new URL(newRestaurant.website);
      } catch {
        newErrors.website = tRest('validation.websiteInvalid');
      }
    }

    if (newRestaurant.phone && newRestaurant.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(newRestaurant.phone.replace(/\s/g, ''))) {
        newErrors.phone = tRest('validation.phoneInvalid');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit new restaurant with backend API integration
  const handleSubmitNewRestaurant = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      console.log('Creating new restaurant with backend API...');
      
      const restaurantData = {
        name: newRestaurant.name!.trim(),
        address: newRestaurant.address!.trim(),
        city: newRestaurant.city || defaultCity,
        country: newRestaurant.country || 'Brazil',
        category: newRestaurant.cuisineType?.trim() || undefined,
        latitude: newRestaurant.latitude,
        longitude: newRestaurant.longitude,
        phone: newRestaurant.phone?.trim() || undefined,
        website: newRestaurant.website?.trim() || undefined,
      };

      console.log('Restaurant creation payload:', restaurantData);

      const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        },
        body: JSON.stringify(restaurantData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create restaurant: ${response.status}`);
      }

      const result = await response.json();
      console.log('Restaurant created successfully:', result);

      const createdRestaurant = result.restaurant;
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      onRestaurantSelected(createdRestaurant);
      
      // Reset form
      setNewRestaurant({
        city: defaultCity,
        country: 'Brazil',
        priceRange: 2,
      });
      setSearchMode('search');
      setErrors({});
      
    } catch (error: any) {
      console.error('Error creating restaurant:', error);
      setErrors({ submit: tRest('apiError', { message: error.message }) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPriceRange = (range: number) => {
    const filled = '💰'.repeat(range);
    const empty = '🔲'.repeat(4 - range);
    return filled + empty;
  };

  const renderTrustScoreBadge = (score: number, count: number) => {
    if (score === 0 || count === 0) return null;
    
    let colorClass = 'bg-gray-100 text-gray-800';
    if (score >= 9) colorClass = 'bg-green-100 text-green-800';
    else if (score >= 7) colorClass = 'bg-blue-100 text-blue-800';
    else if (score >= 5) colorClass = 'bg-yellow-100 text-yellow-800';

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {tRest('search.trust', { score: score.toFixed(1) })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-900">{tRest('success.title')}</h3>
              <p className="text-sm text-green-700 mt-1">
                {tRest('success.message')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search/Add Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setSearchMode('search')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            searchMode === 'search'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="mr-2 h-4 w-4 inline" />
          {tRest('modeToggle.searchExisting')}
        </button>
        <button
          onClick={() => setSearchMode('add')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            searchMode === 'add'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="mr-2 h-4 w-4 inline" />
          {tRest('modeToggle.addNew')}
        </button>
      </div>

      {searchMode === 'search' ? (
        /* Enhanced Search Mode */
        <div className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder={tRest('search.placeholder', { city: defaultCity })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <Loader className="animate-spin h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Search State Messages */}
            {loading && (
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                {tRest('search.searching')}
              </p>
            )}
            
            {errors.search && (
              <p className="mt-2 text-sm text-red-600">{errors.search}</p>
            )}
          </div>

          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{tRest('search.recentSearches')}</h4>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions from Backend */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-orange-600">
                {tRest('search.didYouMean')}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`suggestion-${suggestion.restaurant.id}-${index}`}
                    onClick={() => {
                      onRestaurantSelected(suggestion.restaurant);
                      setShowSuggestions(false);
                    }}
                    className="w-full p-4 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 text-left transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{suggestion.restaurant.name}</h4>
                        <p className="text-gray-600 flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {suggestion.restaurant.address}
                          {suggestion.distance && (
                            <span className="ml-2 text-sm text-blue-600">
                              • {suggestion.distance.toFixed(1)}km
                            </span>
                          )}
                        </p>
                        <div className="flex items-center mt-2 text-sm">
                          {suggestion.restaurant.category && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                              {suggestion.restaurant.category}
                            </span>
                          )}
                          <span className="text-orange-600">
                            {tRest('search.similarity', { percent: Math.round(suggestion.similarity * 100) })}
                          </span>
                          <span className="ml-2 text-gray-500">{tRest('search.id', { id: suggestion.restaurant.id })}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Search Results */}
          <div className="space-y-3">
            {searchResults.map((restaurant) => (
              <div
                key={`restaurant-${restaurant.id}`}
                className="border rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-sm"
                onClick={() => onRestaurantSelected(restaurant)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{restaurant.name}</h3>
                      {restaurant.verified && (
                        <Check className="h-4 w-4 text-green-600" title={tRest('search.verified')} />
                      )}
                      {restaurant.website && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
                    
                    <div className="flex items-center gap-3 mb-2">
                      {restaurant.category && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {restaurant.category}
                        </span>
                      )}
                      {restaurant.priceRange && (
                        <span className="text-xs" title={`${restaurant.priceRange}/4`}>
                          {renderPriceRange(restaurant.priceRange)}
                        </span>
                      )}
                      {restaurant.distance && (
                        <span className="text-xs text-gray-500">
                          {restaurant.distance < 1 
                            ? `${Math.round(restaurant.distance * 1000)}m` 
                            : `${restaurant.distance.toFixed(1)}km`}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{tRest('search.id', { id: restaurant.id })}</span>
                    </div>

                    {restaurant.topRecommendation && (
                      <div className="bg-gray-50 rounded p-2 mt-2">
                        <p className="text-xs text-gray-700 line-clamp-2">
                          "{restaurant.topRecommendation.excerpt}"
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          — {restaurant.topRecommendation.author}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    {renderTrustScoreBadge(restaurant.avgTrustScore || 0, restaurant.totalRecommendations || 0)}
                    <p className="text-xs text-gray-500 mt-1">
                      {tRest('search.recommendations', { count: restaurant.totalRecommendations || 0 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* No Results State */}
            {searchQuery && !loading && searchResults.length === 0 && suggestions.length === 0 && !errors.search && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{tRest('search.noResults', { query: searchQuery })}</p>
                <button
                  onClick={() => {
                    setNewRestaurant(prev => ({ ...prev, name: searchQuery }));
                    setSearchMode('add');
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {tRest('search.addAsNew')}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Enhanced Add New Restaurant Mode */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Plus className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">{tRest('addMode.title')}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {tRest('addMode.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Error message for submission */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Restaurant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tRest('addMode.form.nameLabel')}
            </label>
            <input
              type="text"
              value={newRestaurant.name || ''}
              onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={tRest('addMode.form.namePlaceholder')}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tRest('addMode.form.addressLabel')}
            </label>
            <textarea
              value={newRestaurant.address || ''}
              onChange={(e) => setNewRestaurant(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder={tRest('addMode.form.addressPlaceholder')}
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {tRest('addMode.form.locationLabel')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <MapPin className="h-4 w-4" />
                {isGettingLocation ? (
                  <>
                    <Loader className="animate-spin h-4 w-4" />
                    {tRest('addMode.form.gettingLocation')}
                  </>
                ) : (
                  tRest('addMode.form.useGps')
                )}
              </button>
              {newRestaurant.latitude && newRestaurant.longitude && (
                <div className="flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                  <Check className="h-4 w-4 mr-2" />
                  {tRest('addMode.form.locationSet')} {tRest('addMode.form.coordinates', { lat: newRestaurant.latitude.toFixed(4), lng: newRestaurant.longitude.toFixed(4) })}
                </div>
              )}
            </div>
            {errors.location && (
              <p className="text-sm text-red-600 mt-1">{errors.location}</p>
            )}
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.cityLabel')}
              </label>
              <select
                value={newRestaurant.city || ''}
                onChange={(e) => {
                  const selectedCity = SUPPORTED_CITIES.find(c => c.name === e.target.value);
                  setNewRestaurant(prev => ({ 
                    ...prev, 
                    city: e.target.value,
                    country: selectedCity?.country || 'Brazil'
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SUPPORTED_CITIES.map((city) => (
                  <option key={`${city.name}-${city.country}`} value={city.name}>
                    {city.name}{city.state && `, ${city.state}`}, {city.country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.countryLabel')}
              </label>
              <input
                type="text"
                value={newRestaurant.country || ''}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          {/* Cuisine & Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.cuisineTypeLabel')}
              </label>
              <select
                value={newRestaurant.cuisineType || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, cuisineType: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{tRest('addMode.form.cuisineTypePlaceholder')}</option>
                {CUISINE_TYPE_KEYS.map((cuisineKey) => (
                  <option key={cuisineKey} value={cuisineKey}>{tCuisine(cuisineKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.priceRangeLabel')}
              </label>
              <select
                value={newRestaurant.priceRange || 2}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, priceRange: Number(e.target.value) as 1|2|3|4 }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>{tRest('addMode.priceRange.1')}</option>
                <option value={2}>{tRest('addMode.priceRange.2')}</option>
                <option value={3}>{tRest('addMode.priceRange.3')}</option>
                <option value={4}>{tRest('addMode.priceRange.4')}</option>
              </select>
            </div>
          </div>

          {/* Optional Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.phoneLabel')}
              </label>
              <input
                type="tel"
                value={newRestaurant.phone || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={tRest('addMode.form.phonePlaceholder')}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tRest('addMode.form.websiteLabel')}
              </label>
              <input
                type="url"
                value={newRestaurant.website || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, website: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={tRest('addMode.form.websitePlaceholder')}
              />
              {errors.website && (
                <p className="text-sm text-red-600 mt-1">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitNewRestaurant}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  {tRest('addMode.form.submitting')}
                </>
              ) : (
                tRest('addMode.form.submitButton')
              )}
            </button>
            <button
              onClick={() => {
                setSearchMode('search');
                setErrors({});
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {tRest('addMode.form.cancelButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}