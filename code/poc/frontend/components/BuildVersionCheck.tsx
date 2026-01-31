// File: code/poc/frontend/components/BuildVersionCheck.tsx
// Detects when a new deployment has occurred and forces a refresh
// This prevents stale cached JS from running against new backend code

'use client';

import { useEffect, useRef } from 'react';

// This value is set at BUILD TIME by Vercel
// It will be different for each deployment
const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
  || process.env.NEXT_PUBLIC_BUILD_ID 
  || 'development';

// Key for localStorage
const BUILD_CHECK_KEY = 'bocaboca_last_build_id';
const LAST_CHECK_KEY = 'bocaboca_last_build_check';

// Don't check more than once per minute (prevents reload loops)
const CHECK_INTERVAL_MS = 60 * 1000;

export default function BuildVersionCheck() {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run on client, only run once per mount
    if (typeof window === 'undefined' || hasChecked.current) return;
    hasChecked.current = true;

    const checkBuildVersion = async () => {
      try {
        // Don't check too frequently (prevents reload loops)
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        if (lastCheck && Date.now() - parseInt(lastCheck) < CHECK_INTERVAL_MS) {
          console.log('🔄 Build check: Skipping (checked recently)');
          return;
        }

        // Fetch current server build ID
        const response = await fetch('/api/build-info', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          console.warn('🔄 Build check: Could not fetch build info');
          return;
        }

        const data = await response.json();
        const serverBuildId = data.buildId;

        // Update last check timestamp
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

        console.log('🔄 Build check:', {
          client: CLIENT_BUILD_ID?.slice(0, 8),
          server: serverBuildId?.slice(0, 8),
          match: CLIENT_BUILD_ID === serverBuildId
        });

        // If build IDs don't match, we have stale code
        if (serverBuildId && CLIENT_BUILD_ID !== serverBuildId && CLIENT_BUILD_ID !== 'development') {
          const lastKnownBuild = localStorage.getItem(BUILD_CHECK_KEY);
          
          // If we've already tried to reload for this server build, don't loop
          if (lastKnownBuild === serverBuildId) {
            console.log('🔄 Build check: Already reloaded for this build, skipping');
            return;
          }

          console.log('🔄 Build check: New deployment detected! Refreshing...');
          
          // Store the server build ID to prevent reload loops
          localStorage.setItem(BUILD_CHECK_KEY, serverBuildId);
          
          // Clear any cached data that might cause issues
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Force a hard reload to get fresh JS bundles
          window.location.reload();
        } else {
          // Build matches - store it
          if (serverBuildId) {
            localStorage.setItem(BUILD_CHECK_KEY, serverBuildId);
          }
        }
      } catch (error) {
        console.warn('🔄 Build check failed:', error);
        // Don't crash the app if version check fails
      }
    };

    // Run check after a short delay to not block initial render
    const timeoutId = setTimeout(checkBuildVersion, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  // This component doesn't render anything
  return null;
}