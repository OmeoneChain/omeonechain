// File: code/poc/frontend/components/profile/ProfileMapView.tsx
// "Taste Map" - Shows all restaurants a user has reviewed with ratings inside markers
// Inspired by Beli's personal map feature

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, List, Map, ExternalLink, Navigation, Calendar, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Types
interface UserReview {
  id: string;
  restaurantId: number;
  restaurantName: string;
  latitude: number;
  longitude: number;
  rating: number;
  cuisineType?: string;
  createdAt: string;
  content?: string;
  photos?: string[];
}

interface ReviewStats {
  total: number;
  avgRating: number;
  loved: number;  // 8+
  liked: number;  // 6-8
  meh: number;    // <6
}

interface ProfileMapViewProps {
  userId: string;
  username?: string;
  isOwnProfile?: boolean;
  onReviewClick?: (reviewId: string) => void;
  onRestaurantClick?: (restaurantId: number) => void;
}

interface MapReview extends UserReview {
  position: { lat: number; lng: number };
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

// Get color based on personal rating
const getRatingColor = (rating: number): string => {
  if (rating >= 8) return '#10B981'; // Green - Loved it
  if (rating >= 6) return '#F59E0B'; // Amber - Liked it
  return '#EF4444'; // Red - Meh
};

// Get rating tier label
const getRatingTier = (rating: number): string => {
  if (rating >= 8) return 'loved';
  if (rating >= 6) return 'liked';
  return 'meh';
};

// Generate SVG marker with rating inside
const createRatingMarkerIcon = (rating: number, isSelected: boolean = false): google.maps.Icon => {
  const color = getRatingColor(rating);
  const size = isSelected ? 44 : 36;
  const fontSize = isSelected ? 13 : 11;
  const ratingText = rating % 1 === 0 ? rating.toString() : rating.toFixed(1);
  
  // SVG with rating number inside circle
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="${size/2}" y="${size/2 + fontSize/3}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${fontSize}px" font-weight="bold">${ratingText}</text>
    </svg>
  `;
  
  const encodedSvg = encodeURIComponent(svg);
  
  return {
    url: `data:image/svg+xml,${encodedSvg}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size/2, size/2),
  };
};

export default function ProfileMapView({
  userId,
  username,
  isOwnProfile = false,
  onReviewClick,
  onRestaurantClick
}: ProfileMapViewProps) {
  const t = useTranslations('profileMap');
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [reviews, setReviews] = useState<MapReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<MapReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -15.7934, lng: -47.8823 });

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry']
  });

  // Calculate stats from reviews
  const stats: ReviewStats = useMemo(() => {
    if (reviews.length === 0) {
      return { total: 0, avgRating: 0, loved: 0, liked: 0, meh: 0 };
    }
    
    const total = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    const loved = reviews.filter(r => r.rating >= 8).length;
    const liked = reviews.filter(r => r.rating >= 6 && r.rating < 8).length;
    const meh = reviews.filter(r => r.rating < 6).length;
    
    return { total, avgRating, loved, liked, meh };
  }, [reviews]);

  // Fetch user's reviews with location data
  const fetchUserReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}/recommendations?includeLocation=true`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const data = await response.json();
      const reviewList = data.recommendations || data.results || [];
      
      // Transform to MapReview format, filtering out reviews without location
      const mapReviews: MapReview[] = reviewList
        .filter((r: any) => {
          const lat = r.latitude || r.restaurants?.latitude;
          const lng = r.longitude || r.restaurants?.longitude;
          return lat && lng;
        })
        .map((r: any) => {
          const lat = r.latitude || r.restaurants?.latitude;
          const lng = r.longitude || r.restaurants?.longitude;
          return {
            id: r.id,
            restaurantId: r.restaurantId || r.restaurant_id,
            restaurantName: r.restaurantName || r.restaurant_name || r.restaurants?.name || r.title,
            latitude: lat,
            longitude: lng,
            rating: r.rating || r.overall_rating || r.overallRating || 7,
            cuisineType: r.cuisineType || r.cuisine_type,
            createdAt: r.createdAt || r.created_at,
            content: r.content || r.description,
            photos: r.photos || [],
            position: { lat, lng }
          };
        });

      setReviews(mapReviews);
      
      // Center map on reviews if we have any
      if (mapReviews.length > 0) {
        const avgLat = mapReviews.reduce((sum, r) => sum + r.latitude, 0) / mapReviews.length;
        const avgLng = mapReviews.reduce((sum, r) => sum + r.longitude, 0) / mapReviews.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
      
    } catch (err) {
      console.error('ProfileMapView: Error fetching reviews:', err);
      setError(t('errors.loadFailed'));
      
      // Use mock data for development
      setReviews(getMockReviews());
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    fetchUserReviews();
  }, [fetchUserReviews]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Fit bounds to show all markers
    if (reviews.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      reviews.forEach(review => {
        bounds.extend(review.position);
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [reviews]);

  // Update bounds when reviews change
  useEffect(() => {
    if (map && reviews.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      reviews.forEach(review => {
        bounds.extend(review.position);
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [map, reviews]);

  const handleMarkerClick = (review: MapReview) => {
    setSelectedReview(review);
  };

  const handleInfoWindowClose = () => {
    setSelectedReview(null);
  };

  const handleViewReview = (reviewId: string) => {
    if (onReviewClick) {
      onReviewClick(reviewId);
    }
  };

  const handleViewRestaurant = (restaurantId: number) => {
    if (onRestaurantClick) {
      onRestaurantClick(restaurantId);
    } else {
      window.location.href = `/restaurant/${restaurantId}`;
    }
  };

  const handleGetDirections = (review: MapReview) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${review.latitude},${review.longitude}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Error state for Google Maps loading
  if (loadError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-red-600 mb-2">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold">{t('errors.mapLoadError')}</h3>
        </div>
        <p className="text-gray-600">{t('errors.tryAgainLater')}</p>
      </div>
    );
  }

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-80 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Empty state
  if (reviews.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-400 mb-4">
          <MapPin className="w-16 h-16 mx-auto mb-3" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isOwnProfile ? t('empty.ownProfile.title') : t('empty.otherProfile.title', { username: username || t('empty.otherProfile.defaultUsername') })}
        </h3>
        <p className="text-gray-500 mb-4">
          {isOwnProfile ? t('empty.ownProfile.description') : t('empty.otherProfile.description')}
        </p>
        {isOwnProfile && (
          <button 
            onClick={() => window.location.href = '/create'}
            className="px-6 py-2 bg-[#FF644A] text-white font-medium rounded-lg hover:bg-[#E65441] transition-colors"
          >
            {t('empty.ownProfile.cta')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#FF644A]" />
            {isOwnProfile ? t('header.ownTitle') : t('header.otherTitle', { username: username || '' })}
          </h3>
          
          {/* View Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
            <button 
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'map' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Map className="w-4 h-4" />
              {t('viewToggle.map')}
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'list' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              {t('viewToggle.list')}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">{t('stats.reviews')}</div>
            </div>
            <div className="border-l border-orange-200 pl-4">
              <div className="text-xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</div>
              <div className="text-xs text-gray-500">{t('stats.avgRating')}</div>
            </div>
            <div className="border-l border-orange-200 pl-4">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="font-bold text-gray-900">{stats.loved}</span>
              </div>
              <div className="text-xs text-gray-500">{t('stats.loved')}</div>
            </div>
            <div className="border-l border-orange-200 pl-4">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-bold text-gray-900">{stats.liked}</span>
              </div>
              <div className="text-xs text-gray-500">{t('stats.liked')}</div>
            </div>
            <div className="border-l border-orange-200 pl-4">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="font-bold text-gray-900">{stats.meh}</span>
              </div>
              <div className="text-xs text-gray-500">{t('stats.meh')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="relative">
          {/* Legend */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 rounded-lg p-2.5 shadow-sm text-xs border border-gray-200">
            <div className="font-medium text-gray-700 mb-1.5">{t('legend.title')}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white" style={{fontSize: '8px', fontWeight: 'bold'}}>8+</div>
                <span className="text-gray-600">{t('legend.loved')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white" style={{fontSize: '8px', fontWeight: 'bold'}}>6+</div>
                <span className="text-gray-600">{t('legend.liked')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white" style={{fontSize: '7px', fontWeight: 'bold'}}>&lt;6</div>
                <span className="text-gray-600">{t('legend.meh')}</span>
              </div>
            </div>
          </div>

          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={12}
            onLoad={onLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {/* Review Markers with ratings inside */}
            {reviews.map((review) => (
              <Marker
                key={review.id}
                position={review.position}
                icon={createRatingMarkerIcon(review.rating, selectedReview?.id === review.id)}
                onClick={() => handleMarkerClick(review)}
                title={`${review.restaurantName}: ${review.rating}/10`}
                zIndex={selectedReview?.id === review.id ? 1000 : 1}
              />
            ))}

            {/* Info Window for selected review */}
            {selectedReview && (
              <InfoWindow
                position={selectedReview.position}
                onCloseClick={handleInfoWindowClose}
              >
                <div className="p-2 min-w-[260px] max-w-[300px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-base truncate">
                        {selectedReview.restaurantName}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                        {selectedReview.cuisineType && (
                          <span>{selectedReview.cuisineType}</span>
                        )}
                      </div>
                    </div>
                    <div 
                      className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: getRatingColor(selectedReview.rating) }}
                    >
                      {selectedReview.rating}
                    </div>
                  </div>
                  
                  {/* Review date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                    <Calendar className="w-3 h-3" />
                    <span>{t('infoWindow.reviewed')} {formatDate(selectedReview.createdAt)}</span>
                  </div>

                  {/* Preview of review content */}
                  {selectedReview.content && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      "{selectedReview.content}"
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleViewRestaurant(selectedReview.restaurantId)}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {t('infoWindow.viewRestaurant')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleGetDirections(selectedReview)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      title={t('infoWindow.directions')}
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Tap hint */}
          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="text-xs text-gray-500 bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
              {t('hints.tapMarker')}
            </span>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="max-h-[400px] overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {reviews
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((review) => (
                <div 
                  key={review.id}
                  onClick={() => handleViewRestaurant(review.restaurantId)}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {/* Rating badge */}
                  <div 
                    className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: getRatingColor(review.rating) }}
                  >
                    {review.rating}
                  </div>
                  
                  {/* Restaurant info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{review.restaurantName}</h4>
                    <p className="text-sm text-gray-500">{review.cuisineType || t('list.restaurant')}</p>
                  </div>
                  
                  {/* Date */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// Mock data for development
function getMockReviews(): MapReview[] {
  return [
    {
      id: '1',
      restaurantId: 1,
      restaurantName: "Mangai",
      latitude: -15.8267,
      longitude: -47.9218,
      rating: 9.0,
      cuisineType: "Nordestina",
      createdAt: "2024-11-15T12:00:00Z",
      content: "Incredible buffet with authentic northeastern Brazilian cuisine. The sun-dried meat was perfect!",
      photos: [],
      position: { lat: -15.8267, lng: -47.9218 }
    },
    {
      id: '2',
      restaurantId: 2,
      restaurantName: "Coco Bambu",
      latitude: -15.7901,
      longitude: -47.8829,
      rating: 8.5,
      cuisineType: "Frutos do Mar",
      createdAt: "2024-10-22T19:30:00Z",
      content: "Great seafood, amazing shrimp dishes. A bit pricey but worth it for special occasions.",
      photos: [],
      position: { lat: -15.7901, lng: -47.8829 }
    },
    {
      id: '3',
      restaurantId: 3,
      restaurantName: "Parrilla Madrid",
      latitude: -15.8301,
      longitude: -47.9234,
      rating: 7.0,
      cuisineType: "Steakhouse",
      createdAt: "2024-09-18T20:00:00Z",
      content: "Good steaks, nice atmosphere. Service could be better.",
      photos: [],
      position: { lat: -15.8301, lng: -47.9234 }
    },
    {
      id: '4',
      restaurantId: 4,
      restaurantName: "Café Cultura",
      latitude: -15.8150,
      longitude: -47.8950,
      rating: 8.0,
      cuisineType: "Café",
      createdAt: "2024-08-05T10:00:00Z",
      content: "Perfect for breakfast meetings. Great coffee and pastries.",
      photos: [],
      position: { lat: -15.8150, lng: -47.8950 }
    },
    {
      id: '5',
      restaurantId: 5,
      restaurantName: "Vila do Conde",
      latitude: -15.8178,
      longitude: -47.9011,
      rating: 6.5,
      cuisineType: "Brasileira",
      createdAt: "2024-07-12T13:00:00Z",
      content: "Decent lunch spot. Nothing special but reliable.",
      photos: [],
      position: { lat: -15.8178, lng: -47.9011 }
    },
    {
      id: '6',
      restaurantId: 6,
      restaurantName: "Fogo de Chão",
      latitude: -15.7850,
      longitude: -47.8900,
      rating: 9.5,
      cuisineType: "Churrascaria",
      createdAt: "2024-06-20T19:00:00Z",
      content: "Best churrasco in Brasília! The picanha is out of this world.",
      photos: [],
      position: { lat: -15.7850, lng: -47.8900 }
    },
    {
      id: '7',
      restaurantId: 7,
      restaurantName: "Baco Pizzaria",
      latitude: -15.8100,
      longitude: -47.9100,
      rating: 5.5,
      cuisineType: "Italiana",
      createdAt: "2024-05-10T21:00:00Z",
      content: "Disappointing pizza. Crust was soggy and toppings were sparse.",
      photos: [],
      position: { lat: -15.8100, lng: -47.9100 }
    },
  ];
}