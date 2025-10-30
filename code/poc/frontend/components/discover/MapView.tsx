// File: code/poc/frontend/components/discover/MapView.tsx
// Enhanced MapView with filtering, search, and context-based recommendations
// ✅ Priority 1: Interactive restaurant cards
// ✅ Priority 2: Smart filtering sidebar
// ✅ Priority 3: Search bar
// ✅ Priority 4: Context-based auto-display

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Restaurant } from '@/lib/services/restaurant-service';
import { Search, SlidersHorizontal, X, MapPin, Clock, Utensils, DollarSign } from 'lucide-react';

interface MapViewProps {
  onRestaurantClick?: (restaurantId: number) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
}

interface MapRestaurant extends Restaurant {
  position: { lat: number; lng: number };
}

interface Filters {
  cuisines: string[];
  priceRange: number[];
  minTrustScore: number;
  distance: number;
}

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: -15.7934, // Brasília
  lng: -47.8823
};

// Context-based meal types
type MealContext = 'breakfast' | 'lunch' | 'dinner' | 'all';

export default function MapView({
  onRestaurantClick,
  initialCenter = defaultCenter,
  initialZoom = 12
}: MapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<MapRestaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MapRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    cuisines: [],
    priceRange: [1, 2, 3, 4],
    minTrustScore: 0,
    distance: 10 // km
  });

  // Context-based display
  const [currentContext, setCurrentContext] = useState<MealContext>('all');

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry']
  });

  // ✅ Priority 4: Detect time of day and set context (DISABLED for now - shows all restaurants)
  useEffect(() => {
    // Commented out auto-context to show all restaurants by default
    // Uncomment when restaurants have proper meal-type metadata
    /*
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 11) {
      setCurrentContext('breakfast');
    } else if (hour >= 11 && hour < 15) {
      setCurrentContext('lunch');
    } else if (hour >= 17 && hour < 23) {
      setCurrentContext('dinner');
    } else {
      setCurrentContext('all');
    }
    */
    
    // Default to showing all restaurants
    setCurrentContext('all');
  }, []);

  // Get context label
  const getContextLabel = (context: MealContext): string => {
    switch (context) {
      case 'breakfast': return '🌅 Breakfast Spots';
      case 'lunch': return '☀️ Lunch Options';
      case 'dinner': return '🌙 Dinner Restaurants';
      default: return '🍽️ All Restaurants';
    }
  };

  // Get available cuisines from all restaurants
  const availableCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    allRestaurants.forEach(r => {
      if (r.cuisineType) cuisines.add(r.cuisineType);
    });
    return Array.from(cuisines).sort();
  }, [allRestaurants]);

  // ✅ Priority 2 & 3: Filter and search restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = [...allRestaurants];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.cuisineType?.toLowerCase().includes(query) ||
        r.address.toLowerCase().includes(query)
      );
    }

    // Cuisine filter - only apply if cuisines are selected
    if (filters.cuisines.length > 0) {
      filtered = filtered.filter(r => 
        r.cuisineType && filters.cuisines.includes(r.cuisineType)
      );
    }

    // Price range filter - only apply if not all prices are selected
    if (filters.priceRange.length > 0 && filters.priceRange.length < 4) {
      filtered = filtered.filter(r => 
        r.priceRange && filters.priceRange.includes(r.priceRange)
      );
    }

    // Trust score filter - only apply if minimum is set above 0
    if (filters.minTrustScore > 0) {
      filtered = filtered.filter(r => 
        (r.avgTrustScore || 0) >= filters.minTrustScore
      );
    }

    console.log(`MapView: Filtered from ${allRestaurants.length} to ${filtered.length} restaurants`);
    
    return filtered;
  }, [allRestaurants, searchQuery, filters]);

  // Fetch all restaurants
  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    console.log('MapView: Starting to fetch restaurants...');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${API_BASE_URL}/api/restaurants?city=Brasília&limit=100`;
      
      console.log('MapView: Fetching from:', url);

      const response = await fetch(url);
      
      console.log('MapView: Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch restaurants: ${response.status}`);
      }

      const data = await response.json();
      console.log('MapView: API returned data:', data);
      
      const restaurantList = data.restaurants || data.results || [];
      console.log('MapView: Restaurant list from API:', restaurantList);
      
      const mapRestaurants: MapRestaurant[] = restaurantList.map((r: Restaurant) => ({
        ...r,
        position: { lat: r.latitude, lng: r.longitude }
      }));

      console.log(`MapView: Successfully transformed ${mapRestaurants.length} restaurants for map display`);
      setAllRestaurants(mapRestaurants);
    } catch (err) {
      console.error('MapView: Error fetching restaurants:', err);
      setError('Failed to load restaurants. Please try again.');
      
      console.log('MapView: Using mock data as fallback');
      setAllRestaurants(getMockMapRestaurants());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('MapView: Component mounted, fetching restaurants...');
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('MapView: Map loaded successfully');
    setMap(map);
  }, []);

  // Toggle cuisine filter
  const toggleCuisineFilter = (cuisine: string) => {
    setFilters(prev => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter(c => c !== cuisine)
        : [...prev.cuisines, cuisine]
    }));
  };

  // Toggle price filter
  const togglePriceFilter = (price: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: prev.priceRange.includes(price)
        ? prev.priceRange.filter(p => p !== price)
        : [...prev.priceRange, price]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      cuisines: [],
      priceRange: [1, 2, 3, 4],
      minTrustScore: 0,
      distance: 10
    });
    setSearchQuery('');
  };

  // Get marker color based on Trust Score
  const getMarkerColor = (avgTrustScore?: number): string => {
    if (!avgTrustScore) return '#6B7280';
    if (avgTrustScore >= 8) return '#10B981';
    if (avgTrustScore >= 6) return '#F59E0B';
    return '#EF4444';
  };

  // Get marker icon
  const getMarkerIcon = (restaurant: MapRestaurant): google.maps.Icon => {
    const color = getMarkerColor(restaurant.avgTrustScore);
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    };
  };

  const handleMarkerClick = (restaurant: MapRestaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleInfoWindowClose = () => {
    setSelectedRestaurant(null);
  };

  const handleViewRestaurant = (restaurantId: number) => {
    if (onRestaurantClick) {
      onRestaurantClick(restaurantId);
    } else {
      window.location.href = `/restaurant/${restaurantId}`;
    }
  };

  // Center map on user location
  const handleCenterOnMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          map?.panTo(userLocation);
          map?.setZoom(14);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (loadError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Map Loading Error</h3>
        </div>
        <p className="text-gray-600 mb-4">Failed to load Google Maps. Please check your API key.</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Reload Page
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
          <div className="mt-4 flex justify-center">
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* ✅ Priority 4: Context Banner - Hidden by default, shows when user changes context */}
      {currentContext !== 'all' && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">{getContextLabel(currentContext)}</span>
            </div>
            <button
              onClick={() => setCurrentContext('all')}
              className="text-sm text-blue-700 hover:text-blue-900 underline"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* ✅ Priority 3: Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants by name, cuisine, or location..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Header with Filter Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {filteredRestaurants.length} Restaurants
          </h3>
          <p className="text-sm text-gray-500">
            {filteredRestaurants.length !== allRestaurants.length 
              ? `Filtered from ${allRestaurants.length} total` 
              : 'Showing all restaurants'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Near Me Button */}
          <button
            onClick={handleCenterOnMe}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Near Me
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(filters.cuisines.length > 0 || filters.minTrustScore > 0 || filters.priceRange.length < 4) && (
              <span className="px-1.5 py-0.5 bg-white text-blue-600 text-xs rounded-full font-medium">
                {filters.cuisines.length + (filters.minTrustScore > 0 ? 1 : 0) + (filters.priceRange.length < 4 ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ✅ Priority 2: Filters Sidebar */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Filters</h4>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {/* Cuisine Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Utensils className="inline w-4 h-4 mr-1" />
                Cuisine Type
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCuisines.map(cuisine => (
                  <button
                    key={cuisine}
                    onClick={() => toggleCuisineFilter(cuisine)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      filters.cuisines.includes(cuisine)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Price Range
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(price => (
                  <button
                    key={price}
                    onClick={() => togglePriceFilter(price)}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      filters.priceRange.includes(price)
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {'$'.repeat(price)}
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Score Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Trust Score: {filters.minTrustScore}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.minTrustScore}
                onChange={(e) => setFilters(prev => ({ ...prev, minTrustScore: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 (Any)</span>
                <span>5</span>
                <span>10 (Best)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mb-4 flex items-center justify-center gap-4 text-xs bg-gray-50 p-2 rounded-lg">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">High Trust (8+)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-600">Medium (6-8)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Low (&lt;6)</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
          Loading restaurants...
        </div>
      )}

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={onLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Restaurant Markers - Only show filtered */}
        {filteredRestaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            position={restaurant.position}
            icon={getMarkerIcon(restaurant)}
            onClick={() => handleMarkerClick(restaurant)}
            title={restaurant.name}
          />
        ))}

        {/* ✅ Priority 1: Enhanced Info Window */}
        {selectedRestaurant && (
          <InfoWindow
            position={selectedRestaurant.position}
            onCloseClick={handleInfoWindowClose}
          >
            <div className="p-2 min-w-[280px]">
              <h4 className="font-semibold text-gray-900 mb-1 text-base">
                {selectedRestaurant.name}
              </h4>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">
                  {selectedRestaurant.cuisineType || 'Restaurant'}
                </span>
                {selectedRestaurant.priceRange && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-green-600 font-medium">
                      {'$'.repeat(selectedRestaurant.priceRange)}
                    </span>
                  </>
                )}
              </div>

              {/* Trust Score Display */}
              {selectedRestaurant.avgTrustScore && (
                <div className="mb-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                    selectedRestaurant.avgTrustScore >= 8 
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : selectedRestaurant.avgTrustScore >= 6
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <span>Trust Score: {selectedRestaurant.avgTrustScore.toFixed(1)}</span>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="text-xs text-gray-500 mb-3">
                {selectedRestaurant.totalRecommendations || 0} recommendations from your network
              </div>

              {/* Address */}
              <p className="text-xs text-gray-600 mb-3">
                {selectedRestaurant.address}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewRestaurant(selectedRestaurant.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedRestaurant.latitude},${selectedRestaurant.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Directions
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Pan and zoom to explore • Markers show Trust Scores from your network, not external ratings
      </div>
    </div>
  );
}

// Mock data for development
function getMockMapRestaurants(): MapRestaurant[] {
  return [
    {
      id: 1,
      name: "Restaurante Mangai",
      address: "SCLS 109, Bloco A, Loja 2/4",
      city: "Brasília",
      country: "Brazil",
      latitude: -15.8267,
      longitude: -47.9218,
      cuisineType: "Nordestina",
      priceRange: 3,
      avgTrustScore: 8.7,
      totalRecommendations: 23,
      verified: true,
      position: { lat: -15.8267, lng: -47.9218 }
    },
    {
      id: 2,
      name: "Coco Bambu",
      address: "SCES Trecho 2, Conjunto 31",
      city: "Brasília",
      country: "Brazil",
      latitude: -15.7901,
      longitude: -47.8829,
      cuisineType: "Frutos do Mar",
      priceRange: 4,
      avgTrustScore: 8.3,
      totalRecommendations: 18,
      verified: true,
      position: { lat: -15.7901, lng: -47.8829 }
    },
    {
      id: 3,
      name: "Parrilla Madrid",
      address: "SCLS 210, Bloco C, Loja 50",
      city: "Brasília",
      country: "Brazil",
      latitude: -15.8301,
      longitude: -47.9234,
      cuisineType: "Steakhouse",
      priceRange: 3,
      avgTrustScore: 7.9,
      totalRecommendations: 15,
      verified: true,
      position: { lat: -15.8301, lng: -47.9234 }
    },
    {
      id: 4,
      name: "Vila do Conde",
      address: "SCLS 306, Bloco B, Loja 34",
      city: "Brasília",
      country: "Brazil",
      latitude: -15.8178,
      longitude: -47.9011,
      cuisineType: "Brasileira",
      priceRange: 2,
      avgTrustScore: 7.2,
      totalRecommendations: 8,
      verified: false,
      position: { lat: -15.8178, lng: -47.9011 }
    },
    {
      id: 5,
      name: "Café Cultura",
      address: "SCLS 404, Bloco D",
      city: "Brasília",
      country: "Brazil",
      latitude: -15.8150,
      longitude: -47.8950,
      cuisineType: "Cafe",
      priceRange: 2,
      avgTrustScore: 8.1,
      totalRecommendations: 12,
      verified: true,
      position: { lat: -15.8150, lng: -47.8950 }
    }
  ];
}