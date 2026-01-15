// File: code/poc/frontend/components/mobile/MobileHeader.tsx
// Mobile-optimized header for BocaBoca app
// Layout: Avatar (left) | Logo (center) | Bell + Tokens (right)
// FIXED: Translation fallbacks and iOS safe area handling

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, User, Moon, Sun, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import tokenBalanceService from '@/services/TokenBalanceService';
import { useTranslations } from 'next-intl';

interface MobileHeaderProps {
  className?: string;
}

export function MobileHeader({ className = '' }: MobileHeaderProps) {
  const router = useRouter();
  const t = useTranslations();
  
  const { 
    isAuthenticated, 
    user, 
    authMode,
    logout: logoutFromHook,
    isLoading,
  } = useAuth();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('bocaboca-theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('bocaboca-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    setShowProfileMenu(false);
  };

  // Load token balance
  useEffect(() => {
    const loadBalance = async () => {
      if (isAuthenticated && user?.id) {
        try {
          setIsLoadingBalance(true);
          const result = await tokenBalanceService.getRealTokenBalance(user.id);
          setTokenBalance(result.balance);
        } catch (error) {
          console.error('Failed to load token balance:', error);
          setTokenBalance(0);
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        setTokenBalance(0);
      }
    };

    loadBalance();

    if (isAuthenticated && user?.id) {
      const unsubscribe = tokenBalanceService.onBalanceChange((newBalance) => {
        setTokenBalance(newBalance);
      });
      return () => unsubscribe();
    }
    return undefined;
  }, [isAuthenticated, user?.id]);

  const handleLogout = () => {
    setShowProfileMenu(false);
    logoutFromHook();
    router.push('/');
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    return user.display_name || user.username || user.name || 'User';
  };

  const getInitial = () => {
    if (!user) return 'U';
    const name = getDisplayName();
    return name[0]?.toUpperCase() || 'U';
  };

  // Safe translation helper - returns fallback if key not found
  const safeT = (key: string, fallback: string): string => {
    try {
      const result = t(key);
      // If result equals the key, translation wasn't found
      if (result === key || result.startsWith('header.') || result.startsWith('navigation.')) {
        return fallback;
      }
      return result;
    } catch {
      return fallback;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <header className={`bg-white dark:bg-[#1F1E2A] sticky top-0 z-40 ${className}`}>
        {/* Safe area spacer for iOS notch */}
        <div className="bg-white dark:bg-[#1F1E2A] pt-[env(safe-area-inset-top)]" />
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-[#3D3C4A]">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#353444] animate-pulse" />
          <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-[#353444] animate-pulse" />
          <div className="w-20 h-8 rounded-lg bg-gray-200 dark:bg-[#353444] animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`bg-white dark:bg-[#1F1E2A] sticky top-0 z-40 ${className}`}>
        {/* Safe area spacer for iOS notch - this pushes content below the notch */}
        <div className="bg-white dark:bg-[#1F1E2A] pt-[env(safe-area-inset-top)]" />
        
        {/* Actual header content */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-[#3D3C4A]">
          {/* LEFT: Profile Avatar or Sign In */}
          <div className="flex items-center" style={{ minWidth: '80px' }}>
            {isAuthenticated ? (
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1 active:opacity-70 transition-opacity"
              >
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)' }}
                >
                  {getInitial()}
                </div>
                <ChevronDown 
                  size={14} 
                  className={`text-gray-400 dark:text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
                />
              </button>
            ) : (
              <Link
                href="/onboarding"
                className="px-3 py-1.5 rounded-lg text-white text-sm font-medium bg-[#FF644A] active:opacity-70 transition-opacity"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* CENTER: BocaBoca Logo */}
          <Link href={isAuthenticated ? "/feed" : "/"} className="flex items-center justify-center">
            <Image
              src="/BocaBoca_Logo.png"
              alt="BocaBoca"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </Link>

          {/* RIGHT: Notifications + Token Balance */}
          <div 
            className="flex items-center gap-2" 
            style={{ minWidth: '80px', justifyContent: 'flex-end' }}
          >
            {isAuthenticated ? (
              <>
                {/* Notifications Bell */}
                <NotificationBell />
                
                {/* Token Balance (wallet users only) */}
                {authMode === 'wallet' && (
                  <Link
                    href="/rewards"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FFE8E3] dark:bg-[#FF644A]/20 active:opacity-70 transition-opacity"
                  >
                    <Gift size={13} className="text-[#FF644A]" />
                    {isLoadingBalance ? (
                      <div className="w-8 h-4 bg-[#FFD4CC] dark:bg-[#FF644A]/30 rounded animate-pulse" />
                    ) : (
                      <span className="text-[13px] font-semibold text-[#FF644A]">
                        {tokenBalance.toFixed(1)}
                      </span>
                    )}
                  </Link>
                )}
              </>
            ) : (
              // Placeholder for alignment when not authenticated
              <div style={{ width: '80px' }} />
            )}
          </div>
        </div>
      </header>

      {/* Profile Dropdown Menu */}
      <AnimatePresence>
        {showProfileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowProfileMenu(false)}
            />
            
            {/* Menu - positioned below safe area */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed left-4 right-4 z-50 bg-white dark:bg-[#2D2C3A] rounded-xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-[#3D3C4A] overflow-hidden"
              style={{ 
                maxWidth: '320px',
                top: 'calc(env(safe-area-inset-top) + 60px)'
              }}
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#3D3C4A]">
                <div className="font-medium text-[#1F1E2A] dark:text-white">
                  {getDisplayName()}
                </div>
                {user?.email && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                )}
                <div className="mt-2">
                  <span 
                    className={`inline-block px-2 py-1 text-xs rounded ${
                      authMode === 'wallet' 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {authMode === 'wallet' ? '🔷 Carteira' : '📧 Email'}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-[#404050]"
                >
                  <Settings size={18} />
                  <span>{safeT('navigation.dashboard', 'Dashboard')}</span>
                </Link>
                
                <Link
                  href={`/users/${user?.id}`}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-[#404050]"
                >
                  <User size={18} />
                  <span>{safeT('navigation.profile', 'Perfil')}</span>
                </Link>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-[#404050]"
                >
                  <span className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </span>
                  <div 
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                      theme === 'dark' ? 'bg-[#FF644A]' : 'bg-gray-300'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-[#3D3C4A] active:bg-red-100"
                >
                  <LogOut size={18} />
                  <span>{safeT('navigation.signOut', 'Sair')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileHeader;