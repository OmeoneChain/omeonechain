import { useState } from 'react';

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

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  // Return a completely static state - no dynamic behavior
  const [state] = useState<GeolocationState>({
    location: {
      latitude: -15.7942,
      longitude: -47.8822,
      accuracy: 10,
      address: 'Asa Sul',
      city: 'Brasília',
      country: 'Brazil'
    },
    loading: false,
    error: null,
    supported: true,
  });

  // Return completely inert functions
  const getCurrentPosition = () => {
    console.log('useGeolocation: getCurrentPosition called (inert mode)');
    // Do absolutely nothing
  };

  return {
    ...state,
    getCurrentPosition,
    refetch: getCurrentPosition,
  };
};