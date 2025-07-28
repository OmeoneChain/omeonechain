"use client";

import React from 'react';
import { MainNavigation } from './restaurant/RestaurantNavigation';

// Client component to handle navigation with current path
export function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = React.useState('/');
  
  React.useEffect(() => {
    // Set initial path
    setCurrentPath(window.location.pathname);
    
    // Listen for navigation changes
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleLocationChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  
  return (
    <>
      <MainNavigation currentPath={currentPath} />
      <main className="min-h-screen">
        {children}
      </main>
    </>
  );
}