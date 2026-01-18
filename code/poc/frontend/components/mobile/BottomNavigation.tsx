// File: code/poc/frontend/components/mobile/BottomNavigation.tsx
// Bottom tab navigation for BocaBoca mobile app
// Design: Icons only, Create button filled with coral

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavTab {
  id: string;
  icon: React.ElementType;
  href: string;
  hrefGuest?: string; // Alternative route for non-authenticated users
  isSpecial?: boolean; // For the Create button
}

const tabs: NavTab[] = [
  { 
    id: 'home', 
    icon: Home, 
    href: '/feed',
    hrefGuest: '/', // Landing page for guests
  },
  { 
    id: 'discover', 
    icon: Search, 
    href: '/discover',
  },
  { 
    id: 'create', 
    icon: Plus, 
    href: '/create',
    isSpecial: true,
  },
  { 
    id: 'community', 
    icon: Users, 
    href: '/community',
  },
  { 
    id: 'lists',
    icon: ClipboardList,
    href: '/saved-lists',
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Helper to check if a tab is active
  const isTabActive = (tab: NavTab): boolean => {
    const currentPath = pathname.replace(/^\/(pt-BR|en|es)/, '') || '/';
    
    if (tab.id === 'home') {
      return currentPath === '/feed' || currentPath === '/' || currentPath === '';
    }
    
    return currentPath.startsWith(tab.href);
  };

  // Get the correct href based on auth state
  const getHref = (tab: NavTab): string => {
    if (!isAuthenticated && tab.hrefGuest) {
      return tab.hrefGuest;
    }
    return tab.href;
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-[#1F1E2A] border-gray-200 dark:border-[#3D3C4A]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        paddingTop: '8px',
      }}
    >
      <div 
        className="flex items-center justify-around"
        style={{
          paddingLeft: '12px',
          paddingRight: '12px',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab);
          const href = getHref(tab);

          return (
            <Link
              key={tab.id}
              href={href}
              className="flex items-center justify-center flex-1 py-2 transition-all active:scale-95"
              style={{ minHeight: '44px' }}
            >
              {tab.isSpecial ? (
                // Create button - filled coral circle
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#FF644A] shadow-md"
                  style={{
                    boxShadow: '0 2px 8px rgba(255, 100, 74, 0.3)',
                  }}
                >
                  <Icon 
                    size={22} 
                    color="white" 
                    strokeWidth={2.5} 
                  />
                </div>
              ) : (
                // Regular tab icon
                <Icon
                  size={24}
                  className={`transition-colors ${
                    isActive 
                      ? 'text-[#FF644A]' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              )}
            </Link>
          );
        })}
      </div>
      
      {/* Home indicator spacer for iOS */}
      <div className="h-1" />
    </nav>
  );
}

export default BottomNavigation;