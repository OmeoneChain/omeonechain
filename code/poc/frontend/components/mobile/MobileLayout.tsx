// File: code/poc/frontend/components/mobile/MobileLayout.tsx
// Layout wrapper for mobile app - combines MobileHeader and BottomNavigation
// Use this component to wrap page content in the mobile app

'use client';

import React from 'react';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { useCapacitor } from '@/hooks/useCapacitor';

interface MobileLayoutProps {
  children: React.ReactNode;
  /** Hide the header (useful for custom headers on specific pages) */
  hideHeader?: boolean;
  /** Hide the bottom navigation (useful for full-screen views) */
  hideBottomNav?: boolean;
  /** Custom className for the main content area */
  contentClassName?: string;
  /** Background color variant */
  background?: 'default' | 'cream' | 'white';
}

export function MobileLayout({ 
  children, 
  hideHeader = false,
  hideBottomNav = false,
  contentClassName = '',
  background = 'default',
}: MobileLayoutProps) {
  const { isCapacitor } = useCapacitor();

  // Background classes based on variant
  const backgroundClasses = {
    default: 'bg-[#FAF9F6] dark:bg-[#1F1E2A]', // Soft Cream light, Midnight Navy dark
    cream: 'bg-[#FAF9F6] dark:bg-[#1F1E2A]',
    white: 'bg-white dark:bg-[#1F1E2A]',
  };

  return (
    <div className={`min-h-screen flex flex-col ${backgroundClasses[background]}`}>
      {/* Mobile Header */}
      {!hideHeader && <MobileHeader />}
      
      {/* Main Content Area */}
      <main 
        className={`flex-1 ${contentClassName}`}
        style={{
          // Add padding at bottom for the fixed bottom navigation
          paddingBottom: hideBottomNav ? '0' : 'calc(70px + env(safe-area-inset-bottom, 20px))',
        }}
      >
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
}

/**
 * Higher-order component to wrap pages with MobileLayout
 * when running in Capacitor, or render normally on web
 */
export function withMobileLayout<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<MobileLayoutProps, 'children'>
) {
  return function WithMobileLayoutWrapper(props: P) {
    const { isCapacitor } = useCapacitor();

    // On web, render normally (web has its own CleanHeader)
    if (!isCapacitor) {
      return <WrappedComponent {...props} />;
    }

    // On mobile (Capacitor), wrap with MobileLayout
    return (
      <MobileLayout {...options}>
        <WrappedComponent {...props} />
      </MobileLayout>
    );
  };
}

export default MobileLayout;