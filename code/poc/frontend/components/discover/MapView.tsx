'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { useTranslations } from 'next-intl';

// =============================================================================
// TYPES
// =============================================================================

type TierType = 'my_network' | 'similar_tastes' | 'community' | 'unrated';

// BocaBoca recommendation data from API
interface BocaBocaRestaurant {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  google_place_id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  cuisine_type?: string;
  price_range?: number;
  author_id: string | null;
  author_username: string | null;
  author_avatar?: string;
  rating: number | null;
  title?: string;
  created_at: string | null;
  tier: TierType;
  tier_data: {
    social_distance?: number;
    similarity_score?: number;
    confidence_level?: number;
    trust_score: number;
  };
  recommendations?: Array<{
    id: string;
    author_id: string;
    author_username: string;
    author_avatar?: string;
    rating: number;
    title?: string;
    created_at: string;
    tier: TierType;
    tier_data: {
      social_distance?: number;
      similarity_score?: number;
      confidence_level?: number;
      trust_score: number;
    };
  }>;
}

// Restaurant for map display
interface MapRestaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  cuisine_type?: string;
  price_level?: number;
  tier: TierType;
  tier_data: {
    social_distance?: number;
    similarity_score?: number;
    confidence_level?: number;
    trust_score: number;
  };
  bocaboca_data?: BocaBocaRestaurant;
  google_place_id?: string;
  is_open?: boolean;
  photo_url?: string;
  recommendation_count?: number;
}

interface MapViewProps {
  userId?: string;
  onRestaurantClick?: (restaurantId: string) => void;
  onCreateRecommendation?: (restaurantId: string, restaurantName: string) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  showMap?: boolean;
  showList?: boolean;
}

interface Filters {
  cuisines: string[];
  priceRange: number[];
  minTrustScore: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Google Maps libraries to load
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

// 4-Tier color system following BocaBoca brand guidelines
const TIER_COLORS: Record<TierType, string> = {
  my_network: '#FF644A',    // Warm Coral - people you follow
  similar_tastes: '#BFE2D9', // Mint Breeze - 70%+ taste alignment
  community: '#9CA3AF',      // Stone Gray - other BocaBoca users
  unrated: '#D1D5DB',        // Light Gray - no BocaBoca data yet
};

const TIER_LABELS: Record<TierType, string> = {
  my_network: 'My Network',
  similar_tastes: 'Similar Tastes',
  community: 'Community',
  unrated: 'Unrated',
};

const TIER_DESCRIPTIONS: Record<TierType, string> = {
  my_network: 'Recommended by people you follow',
  similar_tastes: 'Recommended by users with similar taste (70%+)',
  community: 'Recommended by other BocaBoca users',
  unrated: 'No BocaBoca recommendations yet - be the first!',
};

const TIER_ICONS: Record<TierType, string> = {
  my_network: '👥',
  similar_tastes: '✨',
  community: '🌍',
  unrated: '➕',
};

// Marker sizes by tier priority (larger = more relevant to user)
const TIER_MARKER_SIZES: Record<TierType, number> = {
  my_network: 14,
  similar_tastes: 12,
  community: 10,
  unrated: 8,
};

// Tier priority for sorting (lower = higher priority)
const TIER_PRIORITY: Record<TierType, number> = {
  my_network: 1,
  similar_tastes: 2,
  community: 3,
  unrated: 4,
};

const mapContainerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '12px',
};

const DEFAULT_CENTER = { lat: -15.7801, lng: -47.9292 }; // Brasília
const DEFAULT_ZOOM = 13;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Calculate distance between two points in kilometers using Haversine formula
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format distance for display
const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MapView({
  userId,
  onRestaurantClick,
  onCreateRecommendation,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  showMap = true,
  showList = true,
}: MapViewProps) {
  const t = useTranslations('discover');

  // Google Maps loader with Places library
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // State - Data
  const [bocabocaRestaurants, setBocabocaRestaurants] = useState<BocaBocaRestaurant[]>([]);
  const [mapRestaurants, setMapRestaurants] = useState<MapRestaurant[]>([]);
  const [selectedFromSearch, setSelectedFromSearch] = useState<MapRestaurant | null>(null);
  const [tierCounts, setTierCounts] = useState<Record<TierType, number>>({
    my_network: 0,
    similar_tastes: 0,
    community: 0,
    unrated: 0,
  });

  // State - Map
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null);

  // State - Autocomplete
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [autocompleteBounds, setAutocompleteBounds] = useState<google.maps.LatLngBounds | null>(null);

  // State - User Location (for distance calculation)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // State - UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    cuisines: [],
    priceRange: [],
    minTrustScore: 0,
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  // Fetch BocaBoca restaurant data with tier classifications
  const fetchBocabocaData = useCallback(async () => {
    console.log('[BocaBoca] Fetching tier data for center:', mapCenter);
    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(
        `${backendUrl}/api/recommendations/map?latitude=${mapCenter.lat}&longitude=${mapCenter.lng}&radius_km=50&limit=500`,
        { headers }
      );

      if (!response.ok) {
        console.warn('[BocaBoca] API response not OK:', response.status);
        return [];
      }

      const data = await response.json();
      console.log('[BocaBoca] API response:', data);
      
      if (data.success && data.data?.recommendations) {
        console.log('[BocaBoca] Loaded', data.data.recommendations.length, 'restaurants with tiers');
        return data.data.recommendations as BocaBocaRestaurant[];
      }
      console.warn('[BocaBoca] No recommendations in response');
      return [];
    } catch (err) {
      console.error('[BocaBoca] Error fetching data:', err);
      return [];
    }
  }, [mapCenter]);

  // =============================================================================
  // DATA PROCESSING
  // =============================================================================

  // Convert BocaBoca data to map restaurant format
  useEffect(() => {
    const restaurants: MapRestaurant[] = bocabocaRestaurants.map((bb) => ({
      id: bb.google_place_id || bb.restaurant_id,
      name: bb.restaurant_name,
      latitude: bb.latitude,
      longitude: bb.longitude,
      address: bb.address,
      city: bb.city,
      cuisine_type: bb.cuisine_type,
      price_level: bb.price_range,
      tier: bb.tier,
      tier_data: bb.tier_data,
      bocaboca_data: bb,
      google_place_id: bb.google_place_id,
      recommendation_count: bb.recommendations?.length || 0,
    }));

    // Add selected restaurant from search if not already in BocaBoca
    if (selectedFromSearch) {
      const exists = restaurants.some(
        r => r.google_place_id === selectedFromSearch.google_place_id ||
             r.id === selectedFromSearch.id
      );
      if (!exists) {
        restaurants.push(selectedFromSearch);
      }
    }

    // Sort by tier priority (my_network first, unrated last)
    restaurants.sort((a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier]);

    setMapRestaurants(restaurants);

    // Update tier counts
    const counts: Record<TierType, number> = {
      my_network: 0,
      similar_tastes: 0,
      community: 0,
      unrated: 0,
    };
    restaurants.forEach((r) => counts[r.tier]++);
    setTierCounts(counts);

  }, [bocabocaRestaurants, selectedFromSearch]);

  // =============================================================================
  // MAP INITIALIZATION
  // =============================================================================

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  // Fetch BocaBoca data when map loads
  useEffect(() => {
    if (!isLoaded) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const bbData = await fetchBocabocaData();
        setBocabocaRestaurants(bbData);
      } catch (err) {
        setError('Failed to load restaurant data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoaded, fetchBocabocaData]);

  // =============================================================================
  // AUTOCOMPLETE HANDLERS
  // =============================================================================

  // Update autocomplete bounds when map center changes (soft location bias)
  useEffect(() => {
    if (!isLoaded || !mapCenter) return;
    
    // Create bounds ~50km around current center for biasing
    // This prioritizes nearby results but doesn't exclude distant ones
    const radiusInDegrees = 0.5; // roughly 50km
    const bounds = new google.maps.LatLngBounds(
      { lat: mapCenter.lat - radiusInDegrees, lng: mapCenter.lng - radiusInDegrees },
      { lat: mapCenter.lat + radiusInDegrees, lng: mapCenter.lng + radiusInDegrees }
    );
    setAutocompleteBounds(bounds);
  }, [isLoaded, mapCenter]);

  const onAutocompleteLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    
    if (!place.geometry?.location) {
      console.warn('Place has no geometry');
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Check if this place exists in BocaBoca
    const existingBocaBoca = bocabocaRestaurants.find(bb => {
      // Match by google_place_id first
      if (bb.google_place_id && bb.google_place_id === place.place_id) {
        return true;
      }
      // Fallback: match by normalized name + proximity
      const normalizedBocaName = bb.restaurant_name?.toLowerCase().trim();
      const normalizedGoogleName = place.name?.toLowerCase().trim();
      if (normalizedBocaName && normalizedGoogleName && 
          normalizedBocaName === normalizedGoogleName) {
        // Verify they're close geographically (within ~500m)
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        if (lat && lng && bb.latitude && bb.longitude) {
          const distance = Math.sqrt(
            Math.pow(lat - bb.latitude, 2) + Math.pow(lng - bb.longitude, 2)
          );
          return distance < 0.005; // ~500m
        }
      }
      return false;
    });

    if (existingBocaBoca) {
      // Pan to existing BocaBoca restaurant and select it
      const mapRestaurant = mapRestaurants.find(r => r.google_place_id === place.place_id);
      if (mapRestaurant) {
        setSelectedRestaurant(mapRestaurant);
      }
    } else {
      // Create new "unrated" restaurant from Google Places
      const newRestaurant: MapRestaurant = {
        id: place.place_id || `google-${Date.now()}`,
        name: place.name || 'Unknown Restaurant',
        latitude: lat,
        longitude: lng,
        address: place.formatted_address || place.vicinity,
        tier: 'unrated',
        tier_data: { trust_score: 0 },
        google_place_id: place.place_id,
        is_open: place.opening_hours?.isOpen?.(),
        photo_url: place.photos?.[0]?.getUrl({ maxWidth: 200 }),
      };

      setSelectedFromSearch(newRestaurant);
      setSelectedRestaurant(newRestaurant);
    }

    // Pan map to selected location
    setMapCenter({ lat, lng });
    mapRef?.panTo({ lat, lng });
    mapRef?.setZoom(16);

    // Clear search input
    setSearchInputValue('');
  }, [autocomplete, bocabocaRestaurants, mapRestaurants, mapRef]);

  // =============================================================================
  // FILTERING
  // =============================================================================

  const filteredRestaurants = useMemo(() => {
    return mapRestaurants.filter((restaurant) => {
      // Tier filter
      if (selectedTier && restaurant.tier !== selectedTier) return false;

      // Cuisine filter
      if (filters.cuisines.length > 0 && restaurant.cuisine_type) {
        if (!filters.cuisines.some(c => 
          normalizeText(restaurant.cuisine_type || '').includes(normalizeText(c))
        )) return false;
      }

      // Price range filter
      if (filters.priceRange.length > 0 && restaurant.price_level) {
        if (!filters.priceRange.includes(restaurant.price_level)) return false;
      }

      // Trust score filter (only for rated restaurants)
      if (filters.minTrustScore > 0 && restaurant.tier !== 'unrated') {
        if (restaurant.tier_data.trust_score < filters.minTrustScore) return false;
      }

      return true;
    });
  }, [mapRestaurants, selectedTier, filters]);

  // Get available cuisines from data
  const availableCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    mapRestaurants.forEach((r) => {
      if (r.cuisine_type) cuisines.add(r.cuisine_type);
    });
    return Array.from(cuisines).sort();
  }, [mapRestaurants]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cuisines.length > 0) count++;
    if (filters.priceRange.length > 0) count++;
    if (filters.minTrustScore > 0) count++;
    if (selectedTier) count++;
    return count;
  }, [filters, selectedTier]);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleMarkerClick = (restaurant: MapRestaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleTierClick = (tier: TierType) => {
    setSelectedTier(selectedTier === tier ? null : tier);
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(newCenter);
          setUserLocation(newCenter); // Store for distance calculations
          mapRef?.panTo(newCenter);
          mapRef?.setZoom(14);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location');
        }
      );
    }
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSelectedFromSearch(null);
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Create marker icon
  const createMarkerIcon = (tier: TierType): google.maps.Symbol => {
    const size = TIER_MARKER_SIZES[tier];
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: TIER_COLORS[tier],
      fillOpacity: tier === 'unrated' ? 0.6 : 1,
      strokeColor: tier === 'unrated' ? '#9CA3AF' : '#FFFFFF',
      strokeWeight: 2,
      scale: size,
    };
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl">
        <div className="text-center text-red-500">
          <p>Error loading Google Maps</p>
          <p className="text-sm text-gray-500 mt-2">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF644A]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar with Google Places Autocomplete */}
      <div className="relative">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ['restaurant', 'food', 'cafe', 'bar'],
            fields: ['place_id', 'name', 'geometry', 'formatted_address', 'vicinity', 'opening_hours', 'photos'],
            // Soft location bias - prioritizes nearby but allows global results
            bounds: autocompleteBounds || undefined,
            strictBounds: false,
          }}
        >
          <div className="relative">
            <input
              type="text"
              placeholder={t('search.placeholder') || 'Search restaurants by name, cuisine, or location...'}
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchInputValue && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </Autocomplete>
      </div>

      {/* Controls Row - UPDATED: Removed restaurant count, added legend items inline */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Legend items (no "Legend" label, no count) */}
        <div className="flex items-center gap-1 flex-wrap">
          {(['my_network', 'similar_tastes', 'community', 'unrated'] as TierType[]).map((tier) => (
            <button
              key={tier}
              onClick={() => handleTierClick(tier)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm transition-all ${
                selectedTier === tier
                  ? 'ring-2 ring-[#FF644A] ring-offset-1 bg-white'
                  : selectedTier && selectedTier !== tier
                  ? 'opacity-40 bg-white'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: TIER_COLORS[tier] }}
              />
              <span className="text-gray-700 text-xs font-medium">{TIER_LABELS[tier]}</span>
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Near Me Button */}
          <button
            onClick={handleNearMe}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
          >
            <svg className="h-4 w-4 text-[#FF644A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm">{t('nearMe') || 'Near Me'}</span>
          </button>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-[#FF644A] text-white border-[#FF644A]' : 'border-gray-200 hover:bg-gray-50 bg-white'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm">{t('filters.title') || 'Filters'}</span>
            {activeFilterCount > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                showFilters ? 'bg-white text-[#FF644A]' : 'bg-[#FF644A] text-white'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          {/* Cuisine Filter */}
          {availableCuisines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('filters.cuisine') || 'Cuisine'}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCuisines.slice(0, 10).map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        cuisines: prev.cuisines.includes(cuisine)
                          ? prev.cuisines.filter((c) => c !== cuisine)
                          : [...prev.cuisines, cuisine],
                      }));
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors capitalize ${
                      filters.cuisines.includes(cuisine)
                        ? 'bg-[#FF644A] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filters.priceRange') || 'Price Range'}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      priceRange: prev.priceRange.includes(level)
                        ? prev.priceRange.filter((p) => p !== level)
                        : [...prev.priceRange, level],
                    }));
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filters.priceRange.includes(level)
                      ? 'bg-[#FF644A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {'$'.repeat(level)}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilters({ cuisines: [], priceRange: [], minTrustScore: 0 });
                setSelectedTier(null);
              }}
              className="text-sm text-[#FF644A] hover:underline"
            >
              {t('filters.clear') || 'Clear all filters'}
            </button>
          )}
        </div>
      )}

      {/* Map - conditionally rendered based on showMap prop */}
      {showMap && (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          options={{
            styles: [
              {
                featureType: 'poi.business',
                stylers: [{ visibility: 'off' }],
              },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Markers */}
          {filteredRestaurants.map((restaurant) => (
            <Marker
              key={restaurant.id}
              position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
              icon={createMarkerIcon(restaurant.tier)}
              onClick={() => handleMarkerClick(restaurant)}
              zIndex={5 - TIER_PRIORITY[restaurant.tier]} // Higher tiers on top
            />
          ))}

          {/* Info Window */}
          {selectedRestaurant && (
            <InfoWindow
              position={{
                lat: selectedRestaurant.latitude,
                lng: selectedRestaurant.longitude,
              }}
              onCloseClick={() => setSelectedRestaurant(null)}
            >
              <div className="max-w-xs p-1">
                {/* Restaurant Name & Tier Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">
                    {selectedRestaurant.name}
                  </h3>
                  <span
                    className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${TIER_COLORS[selectedRestaurant.tier]}20`,
                      color: selectedRestaurant.tier === 'unrated' ? '#6B7280' : TIER_COLORS[selectedRestaurant.tier],
                    }}
                  >
                    {TIER_ICONS[selectedRestaurant.tier]} {TIER_LABELS[selectedRestaurant.tier]}
                  </span>
                </div>

                {/* Address */}
                {selectedRestaurant.address && (
                  <p className="text-sm text-gray-500 mb-2">{selectedRestaurant.address}</p>
                )}

                {/* BocaBoca Rating (if available) */}
                <div className="flex items-center gap-3 mb-3 text-sm">
                  {selectedRestaurant.tier !== 'unrated' && selectedRestaurant.bocaboca_data && (
                    <div className="flex items-center gap-1">
                      <span className="text-[#FF644A] font-semibold">
                        {selectedRestaurant.bocaboca_data.rating?.toFixed(1) || '—'}
                      </span>
                      <span className="text-gray-400">/10</span>
                      <span className="text-xs text-gray-500">BocaBoca</span>
                    </div>
                  )}
                  {selectedRestaurant.price_level && (
                    <span className="text-gray-500">
                      {'$'.repeat(selectedRestaurant.price_level)}
                    </span>
                  )}
                  {selectedRestaurant.is_open !== undefined && (
                    <span className={`text-xs ${selectedRestaurant.is_open ? 'text-green-600' : 'text-red-500'}`}>
                      {selectedRestaurant.is_open ? (t('open') || 'Open') : (t('closed') || 'Closed')}
                    </span>
                  )}
                </div>

                {/* BocaBoca Recommendations Count */}
                {selectedRestaurant.bocaboca_data?.recommendations && 
                 selectedRestaurant.bocaboca_data.recommendations.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 mb-2">
                    <p className="text-xs text-gray-500">
                      {selectedRestaurant.bocaboca_data.recommendations.length} BocaBoca {t('recommendations') || 'recommendation(s)'}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  {selectedRestaurant.tier === 'unrated' ? (
                    <button
                      onClick={() => {
                        if (onCreateRecommendation) {
                          onCreateRecommendation(selectedRestaurant.id, selectedRestaurant.name);
                        }
                      }}
                      className="flex-1 bg-[#FF644A] text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#E65441] transition-colors"
                    >
                      {t('beFirstToReview') || 'Be First to Review'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onRestaurantClick) {
                          onRestaurantClick(selectedRestaurant.bocaboca_data?.restaurant_id || selectedRestaurant.id);
                        } else {
                          window.location.href = `/restaurant/${selectedRestaurant.bocaboca_data?.restaurant_id || selectedRestaurant.id}`;
                        }
                      }}
                      className="flex-1 bg-[#FF644A] text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#E65441] transition-colors"
                    >
                      {t('viewDetails') || 'View Details'}
                    </button>
                  )}
                  <button
                    onClick={() => openDirections(selectedRestaurant.latitude, selectedRestaurant.longitude)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t('directions') || 'Directions'}
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}

      {/* Restaurant List - conditionally rendered based on showList prop */}
      {showList && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-medium text-gray-700">
              {filteredRestaurants.length} {t('results') || 'Results'}
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {filteredRestaurants.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>{t('noResults.title') || 'No restaurants found'}</p>
                <p className="text-sm mt-1">{t('noResults.description') || 'Try adjusting your search or filters'}</p>
              </div>
            ) : (
              filteredRestaurants.slice(0, 20).map((restaurant) => {
                // Calculate distance if user location is available
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      restaurant.latitude,
                      restaurant.longitude
                    )
                  : null;

                // Count network recommendations
                const networkRecCount = restaurant.bocaboca_data?.recommendations?.filter(
                  r => r.tier === 'my_network'
                ).length || 0;

                const totalRecCount = restaurant.recommendation_count || 
                  restaurant.bocaboca_data?.recommendations?.length || 0;

                return (
                  <div
                    key={restaurant.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3"
                    onClick={() => {
                      handleMarkerClick(restaurant);
                      mapRef?.panTo({ lat: restaurant.latitude, lng: restaurant.longitude });
                    }}
                  >
                    {/* Photo with tier indicator overlay */}
                    <div className="relative flex-shrink-0">
                      {restaurant.photo_url ? (
                        <img
                          src={restaurant.photo_url}
                          alt={restaurant.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xl">🍽️</span>
                        </div>
                      )}
                      {/* Tier indicator dot */}
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: TIER_COLORS[restaurant.tier] }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name and tier label */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 truncate">{restaurant.name}</h4>
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${TIER_COLORS[restaurant.tier]}20`,
                            color: restaurant.tier === 'unrated' ? '#6B7280' : TIER_COLORS[restaurant.tier]
                          }}
                        >
                          {restaurant.tier === 'my_network' && (t('tierMyNetwork') || 'My Network')}
                          {restaurant.tier === 'similar_tastes' && (t('tierSimilarTastes') || 'Similar Tastes')}
                          {restaurant.tier === 'community' && (t('tierCommunity') || 'Community')}
                          {restaurant.tier === 'unrated' && (t('tierUnrated') || 'Unrated')}
                        </span>
                      </div>

                      {/* Metadata row: Cuisine · $$ · City · Distance */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 flex-wrap">
                        {restaurant.cuisine_type && (
                          <>
                            <span className="capitalize">{restaurant.cuisine_type}</span>
                            <span className="text-gray-300">·</span>
                          </>
                        )}
                        {restaurant.price_level && (
                          <>
                            <span>{'$'.repeat(restaurant.price_level)}</span>
                            <span className="text-gray-300">·</span>
                          </>
                        )}
                        {restaurant.city && (
                          <>
                            <span className="truncate max-w-[120px]">{restaurant.city}</span>
                            {distance !== null && <span className="text-gray-300">·</span>}
                          </>
                        )}
                        {distance !== null && (
                          <span className="text-gray-600 font-medium">{formatDistance(distance)}</span>
                        )}
                      </div>

                      {/* Recommendation count */}
                      <div className="text-sm text-gray-500 mt-1">
                        {totalRecCount > 0 ? (
                          <span>
                            {totalRecCount} {totalRecCount === 1 
                              ? (t('recommendation') || 'recommendation') 
                              : (t('recommendations') || 'recommendations')}
                            {networkRecCount > 0 && (
                              <span className="text-[#FF644A] ml-1">
                                ({networkRecCount} {t('fromNetwork') || 'from your network'})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            {t('beFirstToReview') || 'Be the first to review'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <div className="flex-shrink-0 self-center text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })
            )}
            {filteredRestaurants.length > 20 && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                {t('showingOf', { shown: 20, total: filteredRestaurants.length }) || 
                  `Showing 20 of ${filteredRestaurants.length} restaurants. Zoom in to see more.`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF644A]"></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}