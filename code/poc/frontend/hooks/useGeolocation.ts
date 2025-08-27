// File: code/frontend/src/hooks/useGeolocation.ts

import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface GeolocationState {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  requestPermission?: boolean;
  reverseGeocode?: boolean;
}

const DEFAULT_OPTIONS: Required<UseGeolocationOptions> = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
  watch: false,
  requestPermission: true,
  reverseGeocode: true,
};

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  // Mock reverse geocoding - replace with actual service in production
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    try {
      // For demo purposes, using mock data
      // In production, use Google Maps Geocoding API, Mapbox, or similar
      
      // Mock Portugal coordinates
      if (lat > 36 && lat < 42 && lng > -10 && lng < -6) {
        if (lat > 38.7 && lat < 38.8 && lng > -9.2 && lng < -9.1) {
          return {
            address: 'Chiado',
            city: 'Lisbon',
            country: 'Portugal'
          };
        } else if (lat > 41.1 && lat < 41.2 && lng > -8.7 && lng < -8.5) {
          return {
            address: 'Ribeira',
            city: 'Porto',
            country: 'Portugal'
          };
        } else {
          return {
            address: 'Historic Center',
            city: 'Lisbon',
            country: 'Portugal'
          };
        }
      }
      
      // Mock Brazil coordinates
      if (lat > -24 && lat < -23 && lng > -47 && lng < -46) {
        if (lat > -23.6 && lat < -23.5 && lng > -46.7 && lng < -46.6) {
          return {
            address: 'Vila Madalena',
            city: 'São Paulo',
            country: 'Brazil'
          };
        } else {
          return {
            address: 'Centro',
            city: 'São Paulo',
            country: 'Brazil'
          };
        }
      }
      
      // Fallback for other locations
      return {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: 'Unknown',
        country: 'Unknown'
      };
      
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return {};
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<void> => {
    if (!state.supported) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: opts.enableHighAccuracy,
            timeout: opts.timeout,
            maximumAge: opts.maximumAge,
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      let locationData: LocationData = {
        latitude,
        longitude,
        accuracy,
      };

      // Add reverse geocoding if enabled
      if (opts.reverseGeocode) {
        try {
          const geocodeResult = await reverseGeocode(latitude, longitude);
          locationData = { ...locationData, ...geocodeResult };
        } catch (geocodeError) {
          console.warn('Reverse geocoding failed:', geocodeError);
          // Continue without address data
        }
      }

      setState(prev => ({
        ...prev,
        location: locationData,
        loading: false,
        error: null,
      }));

    } catch (error: any) {
      const errorMessage = getGeolocationErrorMessage(error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [state.supported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, opts.reverseGeocode, reverseGeocode]);

  const requestPermission = useCallback(async (): Promise<PermissionState | null> => {
    if (!navigator.permissions) return null;
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permission.state;
    } catch (error) {
      console.warn('Permission query failed:', error);
      return null;
    }
  }, []);

  // Auto-request location on mount if enabled - FIX: Add ref to prevent infinite re-renders
  const hasRequestedLocation = useCallback(() => {
    let hasRequested = false;
    return () => {
      if (hasRequested) return true;
      hasRequested = true;
      return false;
    };
  }, [])();

  useEffect(() => {
    if (opts.requestPermission && state.supported && !hasRequestedLocation()) {
      getCurrentPosition();
    }
  }, [opts.requestPermission, state.supported]); // Removed getCurrentPosition from deps

  // Watch position if enabled
  useEffect(() => {
    if (!opts.watch || !state.supported) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        let locationData: LocationData = {
          latitude,
          longitude,
          accuracy,
        };

        if (opts.reverseGeocode) {
          try {
            const geocodeResult = await reverseGeocode(latitude, longitude);
            locationData = { ...locationData, ...geocodeResult };
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }
        }

        setState(prev => ({
          ...prev,
          location: locationData,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        const errorMessage = getGeolocationErrorMessage(error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [opts.watch, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, opts.reverseGeocode, reverseGeocode, state.supported]);

  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    clearLocation: useCallback(() => setState(prev => ({ ...prev, location: null, error: null })), []),
    retry: getCurrentPosition,
  };
};

const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location services.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting location.';
  }
};

// Utility hook for restaurant discovery based on location
export const useNearbyRestaurants = (location: LocationData | null, radius: number = 5000) => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNearby = useCallback(async () => {
    if (!location) return;

    setLoading(true);
    setError(null);

    try {
      // Mock nearby restaurant search
      // In production, this would call your API or Google Places API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockRestaurants = [
        {
          id: '1',
          name: 'Taberna do Real',
          address: 'Rua do Ouro 96',
          city: location.city || 'Lisbon',
          latitude: location.latitude + 0.001,
          longitude: location.longitude + 0.001,
          cuisine: 'Portuguese',
          priceRange: '€€',
          distance: 120, // meters
        },
        {
          id: '2',
          name: 'Local Café',
          address: 'Near you',
          city: location.city || 'Unknown',
          latitude: location.latitude + 0.002,
          longitude: location.longitude - 0.001,
          cuisine: 'Coffee',
          priceRange: '€',
          distance: 200,
        },
      ];

      setRestaurants(mockRestaurants);
    } catch (err: any) {
      setError(err.message || 'Failed to search nearby restaurants');
    } finally {
      setLoading(false);
    }
  }, [location, radius]);

  useEffect(() => {
    if (location) {
      searchNearby();
    }
  }, [location, searchNearby]);

  return {
    restaurants,
    loading,
    error,
    refresh: searchNearby,
  };
};