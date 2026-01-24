// File: code/poc/frontend/components/CleanHeader.tsx
// REFACTORED: Full i18n support with next-intl
// FIXED: Now uses PNG logo image for pixel-perfect display
// ADDED: Dark mode toggle in user dropdown
// UPDATED: Dark mode for language dropdown
// REMOVED: Non-functional global search bar
// FIXED: Moved all hooks before conditional returns to fix React Error #300

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Bell, Wallet, Mail, Users, ChevronDown, Settings, LogOut, Coins, Globe, Sun, Moon, } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from '@/components/auth/AuthModal';
import WalletConnect from '@/components/auth/WalletConnect';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './notifications/NotificationBell';
import { useCapacitor } from '@/hooks/useCapacitor';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { BottomNavigation } from '@/components/mobile/BottomNavigation';
import tokenBalanceService from '@/services/TokenBalanceService';
import { useLocale, useTranslations } from 'next-intl';
import { switchLocale } from '@/navigation';

interface CleanHeaderProps {
  className?: string;
}

// ============================================
// LOGO COMPONENT - Uses PNG for pixel-perfect display
// ============================================
const BocaBocaLogo = ({ size = 32 }: { size?: number }) => (
  <Image
    src="/BocaBoca_Logo.png"
    alt="BocaBoca"
    width={size}
    height={size}
    className="object-contain"
    priority
  />
);

// ============================================
// LANGUAGE SWITCHER COMPONENT - With Dark Mode
// ============================================
const LanguageSwitcher = () => {
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  const handleSwitchLocale = (newLocale: string) => {
    console.log('🌐 Switching locale:', { from: locale, to: newLocale, pathname });
    const newPath = switchLocale(newLocale, pathname);
    console.log('🌐 New path:', newPath);
    window.location.href = newPath;
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          console.log('🌐 Language button clicked');
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2C3A] transition-colors"
        aria-label="Change language"
      >
        <Globe size={18} className="text-gray-500 dark:text-gray-400" />
        <span className="text-sm hidden sm:inline">{currentLang.flag}</span>
        <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#2D2C3A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-50 border border-gray-200 dark:border-[#3D3C4A]"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSwitchLocale(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  locale === lang.code 
                    ? 'font-semibold text-[#FF644A] bg-[#FFF5F3] dark:bg-[#FF644A]/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// MAIN HEADER COMPONENT
// ============================================
export function CleanHeader({ className = '' }: CleanHeaderProps) {
  // ============================================
  // ALL HOOKS MUST BE CALLED FIRST - Before any conditional returns
  // ============================================
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { isCapacitor } = useCapacitor();
  
  const { 
    isAuthenticated, 
    user, 
    authMode,
    logout: logoutFromHook,
    isLoading,
    login,
    refreshAuth
  } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  
  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Theme state - managed locally
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
  };

  // Load token balance when user is authenticated
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

    // Subscribe to optimistic updates
    if (isAuthenticated && user?.id) {
      const unsubscribe = tokenBalanceService.onBalanceChange((newBalance) => {
        console.log('💰 Header: Balance updated optimistically:', newBalance);
        setTokenBalance(newBalance);
      });

      return () => unsubscribe();
    }
  }, [isAuthenticated, user?.id, pathname]);

  // ============================================
  // CONDITIONAL RETURNS - After all hooks
  // ============================================
  
  // Mobile detection - return mobile components when in Capacitor
  if (isCapacitor) {
    return (
      <>
        <MobileHeader className={className} />
        <BottomNavigation />
      </>
    );
  }

  const handleConnectWallet = () => {
    if (isAuthenticated && authMode === 'email') {
      setShowOnboarding(true);
    } else {
      setShowWalletConnect(true);
    }
  };

  const handleSignUp = () => {
    setShowEmailSignup(true);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleLogout = () => {
    logoutFromHook();
    router.push('/');
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    return user.display_name || user.displayName || user.username || user.name || 'User';
  };

  const getInitial = () => {
    if (!user) return 'U';
    const name = getDisplayName();
    return name[0]?.toUpperCase() || 'U';
  };

  const AuthButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {!isAuthenticated && (
        <button 
          onClick={handleSignUp}
          className="px-4 py-2 text-sm hover:opacity-70 transition-opacity text-gray-600 dark:text-gray-300"
        >
          {t('header.signUp')}
        </button>
      )}
      <button 
        onClick={handleConnectWallet}
        className={`${mobile ? 'w-full' : ''} text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 bg-[#FF644A]`}
      >
        <Wallet size={16} />
        {t('header.connectWallet')}
      </button>
      {mobile && (
        <button
          onClick={() => {
            handleSignUp();
            setIsMobileMenuOpen(false);
          }}
          className="w-full px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#2D2C3A] transition-colors flex items-center justify-center gap-2 border-2 border-[#FF644A] text-[#FF644A]"
        >
          <Mail size={16} />
          {t('header.emailSignUp')}
        </button>
      )}
    </>
  );

  if (isLoading) {
    return (
      <header className={`bg-white dark:bg-[#1F1E2A] border-b border-gray-200 dark:border-[#3D3C4A] sticky top-0 z-40 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <BocaBocaLogo size={32} />
              <span className="font-bold text-xl hidden sm:inline text-[#1F1E2A] dark:text-white">
                BocaBoca
              </span>
            </Link>
            <div className="animate-pulse h-8 w-24 bg-gray-200 dark:bg-[#353444] rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`bg-white dark:bg-[#1F1E2A] border-b border-gray-200 dark:border-[#3D3C4A] sticky top-0 z-40 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <BocaBocaLogo size={32} />
              <span className="font-bold text-xl hidden sm:inline text-[#1F1E2A] dark:text-white">
                BocaBoca
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/create" 
                className={`transition-colors ${
                  pathname === '/create' 
                    ? 'text-[#FF644A]' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('navigation.create')}
              </Link>
              <Link 
                href="/discover" 
                className={`transition-colors ${
                  pathname === '/discover' 
                    ? 'text-[#FF644A]' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {t('navigation.discover')}
              </Link>
              <Link 
                href="/community" 
                className={`transition-colors ${
                  pathname === '/community' 
                    ? 'text-[#FF644A]' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('navigation.community')}
              </Link>
              <Link 
                href="/rewards" 
                className={`transition-colors relative ${
                  pathname === '/rewards' 
                    ? 'text-[#FF644A]' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t('navigation.rewards')}
                {isAuthenticated && authMode === 'email' && (
                  <span 
                    className="absolute -top-1 -right-12 text-xs px-1.5 py-0.5 rounded whitespace-nowrap bg-[#FFE8E3] dark:bg-[#FF644A]/30 text-[#E65441]"
                    style={{ fontSize: '10px', fontWeight: '600' }}
                  >
                    {t('header.upgradeBadge')}
                  </span>
                )}
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {isAuthenticated && <NotificationBell />}

              {/* Token Balance Display - Links to My Rewards */}
              {isAuthenticated && (
                <Link
                  href="/my-rewards"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFE8E3] dark:bg-[#FF644A]/20 border border-[#FFD4CC] dark:border-[#FF644A]/30 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 transition-colors"
                >
                  <Coins className="w-4 h-4 text-[#FF644A]" />
                  {isLoadingBalance ? (
                    <div className="animate-pulse h-4 w-12 rounded bg-[#FFD4CC] dark:bg-[#FF644A]/30"></div>
                  ) : (
                    <span className="text-sm font-semibold text-[#E65441]">
                      {tokenBalance.toFixed(1)} BOCA
                    </span>
                  )}
                </Link>
              )}

              {!isAuthenticated ? (
                <AuthButtons />
              ) : (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D2C3A] transition-colors">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)' }}
                    >
                      {getInitial()}
                    </div>
                    <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                  </button>

                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#2D2C3A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-gray-200 dark:border-[#3D3C4A]">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-[#3D3C4A]">
                      <div className="font-medium text-[#1F1E2A] dark:text-white">
                        {getDisplayName()}
                      </div>
                      {user?.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      )}
                      {(user?.walletAddress || user?.wallet_address) && (
                        <div className="text-xs font-mono text-gray-400 dark:text-gray-500">
                          {formatAddress(user.walletAddress || user.wallet_address || '')}
                        </div>
                      )}
                      <div className="mt-2">
                        <span 
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            authMode === 'wallet' 
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {authMode === 'wallet' ? `🔷 ${t('header.walletAccount')}` : `📧 ${t('header.emailAccount')}`}
                        </span>
                      </div>
          
                      {/* Token balance in dropdown */}
                      {authMode === 'wallet' && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#3D3C4A]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t('header.bocaBalance')}:</span>
                            <span className="text-sm font-semibold text-[#FF644A]">
                              {tokenBalance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444]"
                    >
                      {t('navigation.dashboard')}
                    </Link>
                    <Link
                      href={`/users/${user?.id}`}
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444]"
                    >
                      {t('navigation.profile')}
                    </Link>
                    <Link
                      href="/saved-lists"
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444]"
                    >
                      {t('navigation.savedLists')}
                    </Link>

                    {/* Theme Toggle */}
                    <button
                      onClick={toggleTheme}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                        {theme === 'dark' ? t('header.darkMode') : t('header.lightMode')}
                      </span>
                      <div 
                        className={`w-8 h-5 rounded-full p-0.5 transition-colors ${
                          theme === 'dark' ? 'bg-[#FF644A]' : 'bg-gray-300'
                        }`}
                      >
                        <div 
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            theme === 'dark' ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
        
                    {authMode === 'email' && (
                      <button
                        onClick={handleConnectWallet}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-[#FF644A] border-t border-gray-100 dark:border-[#3D3C4A] hover:bg-[#FFE8E3] dark:hover:bg-[#FF644A]/20 transition-colors"
                      >
                        ⬆️ {t('header.upgradeToWallet')}
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-[#3D3C4A] hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={14} />
                      {t('navigation.signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-[#1F1E2A] border-b border-gray-200 dark:border-[#3D3C4A]"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Language Switcher in Mobile Menu */}
              <div className="flex justify-center py-2">
                <LanguageSwitcher />
              </div>

              {/* Theme Toggle in Mobile Menu */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2D2C3A]"
              >
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  {theme === 'dark' ? t('header.darkMode') : t('header.lightMode')}
                </span>
                <div 
                  className={`w-8 h-5 rounded-full p-0.5 transition-colors ${
                    theme === 'dark' ? 'bg-[#FF644A]' : 'bg-gray-300'
                  }`}
                >
                  <div 
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              {/* Token balance in mobile menu - Links to My Rewards */}
              {isAuthenticated && (
                <Link
                  href="/my-rewards"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#FFE8E3] dark:bg-[#FF644A]/20 border border-[#FFD4CC] dark:border-[#FF644A]/30 hover:bg-[#FFD4CC] dark:hover:bg-[#FF644A]/30 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Coins size={16} className="text-[#FF644A]" />
                    {t('header.bocaBalance')}
                  </span>
                  {isLoadingBalance ? (
                    <div className="animate-pulse h-4 w-16 rounded bg-[#FFD4CC] dark:bg-[#FF644A]/30"></div>
                  ) : (
                    <span className="text-sm font-semibold text-[#FF644A]">
                      {tokenBalance.toFixed(1)} BOCA
                    </span>
                  )}
                </Link>
              )}

              <Link
                href="/discover"
                className={`block py-2 transition-colors ${
                  pathname === '/discover' ? 'text-[#FF644A]' : 'text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.discover')}
              </Link>
              <Link
                href="/community"
                className={`block py-2 transition-colors ${
                  pathname === '/community' ? 'text-[#FF644A]' : 'text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.community')}
              </Link>
              <Link
                href="/rewards"
                className={`block py-2 transition-colors relative ${
                  pathname === '/rewards' ? 'text-[#FF644A]' : 'text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.rewards')}
                {isAuthenticated && authMode === 'email' && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#FFE8E3] dark:bg-[#FF644A]/30 text-[#E65441]" style={{ fontSize: '10px', fontWeight: '600' }}>
                    {t('header.upgradeBadge')}
                  </span>
                )}
              </Link>
              <Link
                href="/create"
                className={`block py-2 transition-colors ${
                  pathname === '/create' ? 'text-[#FF644A]' : 'text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.create')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block py-2 text-gray-600 dark:text-gray-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('navigation.dashboard')}
                  </Link>
                  <Link
                    href={`/users/${user?.id}`}
                    className="block py-2 text-gray-600 dark:text-gray-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('navigation.profile')}
                  </Link>
                  {authMode === 'email' && (
                    <button
                      onClick={() => {
                        handleConnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left py-2 font-medium text-[#FF644A]"
                    >
                      ⬆️ {t('header.upgradeToWallet')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-red-600 dark:text-red-400"
                  >
                    {t('navigation.signOut')}
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-[#3D3C4A]">
                  <AuthButtons mobile />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* WalletConnect Modal */}
      <AnimatePresence>
        {showWalletConnect && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <WalletConnect 
                onSuccess={async (token, userData) => {
                  console.log('✅ CleanHeader: Wallet connection successful!');
                  try {
                    setShowWalletConnect(false);
                    login(token, userData);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await refreshAuth();
                    router.push('/feed');
                  } catch (error) {
                    console.error('❌ Error during post-auth processing:', error);
                    window.location.href = '/feed';
                  }
                }}
                onCancel={() => {
                  console.log('❌ Wallet connection cancelled');
                  setShowWalletConnect(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#2D2C3A] rounded-xl max-w-md w-full p-6"
            >
              <h2 className="text-xl font-bold mb-4 text-[#1F1E2A] dark:text-white">
                {t('auth.upgradeTitle')}
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-300">
                {t('auth.upgradeMessage')}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowOnboarding(false);
                    setShowWalletConnect(true);
                  }}
                  className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity bg-[#FF644A]"
                >
                  {t('header.connectWallet')}
                </button>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full px-4 py-2 hover:opacity-70 transition-opacity text-gray-600 dark:text-gray-400"
                >
                  {t('auth.maybeLater')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Signup Modal */}
      <AnimatePresence>
        {showEmailSignup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowEmailSignup(false)}
                className="absolute top-4 right-4 transition-colors z-10 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                aria-label={t('common.close')}
              >
                <X size={24} />
              </button>

              <div className="p-6">
                <AuthModal 
                  onSuccess={(token, user) => {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    setShowEmailSignup(false);
                    
                    const isNewUser = user.onboarding_completed === false;
                    if (isNewUser) {
                      window.location.href = '/onboarding';
                    } else {
                      window.location.href = '/discover';
                    }
                  }}
                  onClose={() => setShowEmailSignup(false)}
                  defaultTab="email"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default CleanHeader;