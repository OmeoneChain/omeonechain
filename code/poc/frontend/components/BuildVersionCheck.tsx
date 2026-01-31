// File: code/poc/frontend/components/BuildVersionGate.tsx
// BLOCKING version check - prevents app from rendering until version is verified
// This ensures users never see stale code crashes
// Created: Jan 31, 2026

'use client';

import { useState, useEffect, ReactNode } from 'react';

// This value is set at BUILD TIME by Vercel
const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
  || process.env.NEXT_PUBLIC_BUILD_ID 
  || 'development';

const BUILD_CHECK_KEY = 'bocaboca_last_build_id';

interface BuildVersionGateProps {
  children: ReactNode;
}

export default function BuildVersionGate({ children }: BuildVersionGateProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'reloading'>('checking');

  useEffect(() => {
    const checkVersion = async () => {
      // Skip in development
      if (CLIENT_BUILD_ID === 'development') {
        setStatus('ready');
        return;
      }

      try {
        // Check if we already verified this build in this session
        const sessionChecked = sessionStorage.getItem('bocaboca_version_checked');
        if (sessionChecked === CLIENT_BUILD_ID) {
          // Already verified this session, proceed
          setStatus('ready');
          return;
        }

        // Fetch current server build ID
        const response = await fetch('/api/build-info', {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
        });

        if (!response.ok) {
          // Can't verify, proceed anyway (don't block on API failure)
          console.warn('🔄 Version check: API unavailable, proceeding');
          setStatus('ready');
          return;
        }

        const data = await response.json();
        const serverBuildId = data.buildId;

        console.log('🔄 Version gate:', {
          client: CLIENT_BUILD_ID?.slice(0, 8),
          server: serverBuildId?.slice(0, 8),
          match: CLIENT_BUILD_ID === serverBuildId
        });

        // If builds match, we're good
        if (CLIENT_BUILD_ID === serverBuildId) {
          sessionStorage.setItem('bocaboca_version_checked', CLIENT_BUILD_ID);
          localStorage.setItem(BUILD_CHECK_KEY, serverBuildId);
          setStatus('ready');
          return;
        }

        // Builds don't match - check if we already tried reloading
        const lastKnownBuild = localStorage.getItem(BUILD_CHECK_KEY);
        if (lastKnownBuild === serverBuildId) {
          // We already reloaded for this build but still have old client code
          // This means the reload didn't work (aggressive caching)
          // Clear everything and try one more hard reload
          console.log('🔄 Version gate: Reload did not update code, clearing all caches...');
          
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          
          // Clear localStorage items related to caching
          localStorage.removeItem(BUILD_CHECK_KEY);
          sessionStorage.clear();
          
          setStatus('reloading');
          
          // Use cache-busting URL parameter
          const url = new URL(window.location.href);
          url.searchParams.set('_cb', Date.now().toString());
          window.location.href = url.toString();
          return;
        }

        // First time seeing this new build - reload to get fresh code
        console.log('🔄 Version gate: New deployment detected, reloading...');
        localStorage.setItem(BUILD_CHECK_KEY, serverBuildId);
        setStatus('reloading');
        
        // Clear caches before reload
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        window.location.reload();
        
      } catch (error) {
        console.warn('🔄 Version check failed:', error);
        // Don't block on errors, proceed with app
        setStatus('ready');
      }
    };

    checkVersion();
  }, []);

  // Show loading screen while checking
  if (status === 'checking' || status === 'reloading') {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center">
        <div className="text-center">
          {/* BocaBoca logo/spinner */}
          <div className="w-16 h-16 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">
            {status === 'reloading' ? 'Updating...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Version verified, render app
  return <>{children}</>;
}