// File: code/poc/frontend/hooks/useCapacitor.ts
// Hook to detect if the app is running inside Capacitor (native iOS/Android)

'use client';

import { useState, useEffect } from 'react';

interface CapacitorInfo {
  isCapacitor: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Hook to detect Capacitor environment
 * Returns information about the current platform
 */
export function useCapacitor(): CapacitorInfo {
  const [info, setInfo] = useState<CapacitorInfo>({
    isCapacitor: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  });

  useEffect(() => {
    // Check if Capacitor is available
    const checkCapacitor = async () => {
      try {
        // Capacitor injects itself into the window object
        const isCapacitorAvailable = 
          typeof window !== 'undefined' && 
          !!(window as any).Capacitor;

        if (isCapacitorAvailable) {
          const Capacitor = (window as any).Capacitor;
          const platform = Capacitor.getPlatform?.() || 'web';
          const isNative = Capacitor.isNativePlatform?.() || false;

          setInfo({
            isCapacitor: isNative,
            isIOS: platform === 'ios',
            isAndroid: platform === 'android',
            isWeb: platform === 'web' || !isNative,
            platform: platform as 'ios' | 'android' | 'web',
          });
        }
      } catch (error) {
        console.log('Capacitor detection error (expected on web):', error);
        // Keep default web values
      }
    };

    checkCapacitor();
  }, []);

  return info;
}

/**
 * Simple check for Capacitor environment (non-hook version)
 * Useful for conditional logic outside of React components
 */
export function isRunningInCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  
  const Capacitor = (window as any).Capacitor;
  return Capacitor?.isNativePlatform?.() || false;
}

/**
 * Get the current platform
 */
export function getCapacitorPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  
  const Capacitor = (window as any).Capacitor;
  if (!Capacitor) return 'web';
  
  return Capacitor.getPlatform?.() || 'web';
}

export default useCapacitor;