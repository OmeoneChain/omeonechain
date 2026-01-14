// File: code/poc/frontend/components/mobile/AdaptiveLayout.tsx
// Automatically switches between web (CleanHeader) and mobile (MobileHeader + BottomNav)

'use client';

import React from 'react';
import { useCapacitor } from '@/hooks/useCapacitor';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import CleanHeader from '@/components/CleanHeader';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
  /** Hide header entirely */
  hideHeader?: boolean;
  /** Hide bottom nav on mobile */
  hideBottomNav?: boolean;
}

export function AdaptiveLayout({ 
  children, 
  hideHeader = false,
  hideBottomNav = false,
}: AdaptiveLayoutProps) {
  const { isCapacitor } = useCapacitor();

  // Mobile (Capacitor) layout
  if (isCapacitor) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1F1E2A]">
        {!hideHeader && <MobileHeader />}
        <main 
          style={{
            paddingBottom: hideBottomNav ? '0' : 'calc(70px + env(safe-area-inset-bottom, 20px))',
          }}
        >
          {children}
        </main>
        {!hideBottomNav && <BottomNavigation />}
      </div>
    );
  }

  // Web layout (default)
  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#1F1E2A]">
      {!hideHeader && <CleanHeader />}
      <main>{children}</main>
    </div>
  );
}

export default AdaptiveLayout;
