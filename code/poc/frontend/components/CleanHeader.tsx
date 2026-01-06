// File: code/poc/frontend/components/restaurant/CleanHeader.tsx
// REFACTORED: Full i18n support with next-intl
// FIXED: Now uses PNG logo image for pixel-perfect display

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Search, Bell, Wallet, Mail, Users, ChevronDown, Settings, LogOut, Coins, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from '@/components/auth/AuthModal';
import WalletConnect from '@/components/auth/WalletConnect';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from './notifications/NotificationBell';
import tokenBalanceService from '@/services/TokenBalanceService';
import { useLocale, useTranslations } from 'next-intl';
import { switchLocale } from '@/navigation';

interface CleanHeaderProps {
  className?: string;
}

// ============================================
// LOGO COMPONENT - Uses PNG for pixel-perfect display
// ============================================
// 
// SETUP INSTRUCTIONS:
// 1. Create an icon-only version of your logo (just the two B shapes, no text)
// 2. Save it as: public/BocaBoca_Logo.png
// 3. Recommended size: 128x128px or larger for retina displays
//
// If you only have the full logo with text, use BocaBocaLogoFromFullImage instead
//
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

// Alternative: Use this if you only have the full logo with text
// It crops the image to show only the icon portion
// Save your full logo as: public/bocaboca-logo-full.png
const BocaBocaLogoFromFullImage = ({ size = 32 }: { size?: number }) => (
  <div 
    style={{ 
      width: size, 
      height: size, 
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    <Image
      src="/bocaboca-logo-full.png"
      alt="BocaBoca"
      width={size * 2}
      height={size * 2}
      style={{
        position: 'absolute',
        top: '-15%',
        left: '-50%',
        objectFit: 'contain'
      }}
      priority
    />
  </div>
);

// ============================================
// LANGUAGE SWITCHER COMPONENT
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe size={18} style={{ color: '#666' }} />
        <span className="text-sm hidden sm:inline">{currentLang.flag}</span>
        <ChevronDown size={14} style={{ color: '#999' }} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1 z-50"
            style={{ border: '1px solid #E5E5E5' }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSwitchLocale(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  locale === lang.code ? 'font-semibold' : ''
                }`}
                style={{ 
                  color: locale === lang.code ? '#FF644A' : '#666',
                  backgroundColor: locale === lang.code ? '#FFF5F3' : 'transparent'
                }}
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
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  
  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
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
          className="px-4 py-2 text-sm hover:opacity-70 transition-opacity"
          style={{ color: '#666' }}
        >
          {t('header.signUp')}
        </button>
      )}
      <button 
        onClick={handleConnectWallet}
        className={`${mobile ? 'w-full' : ''} text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
        style={{ backgroundColor: '#FF644A' }}
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
          className="w-full px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          style={{ 
            border: '2px solid #FF644A',
            color: '#FF644A'
          }}
        >
          <Mail size={16} />
          {t('header.emailSignUp')}
        </button>
      )}
    </>
  );

  if (isLoading) {
    return (
      <header className={`bg-white border-b sticky top-0 z-40 ${className}`} style={{ borderColor: '#E5E5E5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <BocaBocaLogo size={32} />
              <span className="font-bold text-xl hidden sm:inline" style={{ color: '#1F1E2A' }}>
                BocaBoca
              </span>
            </Link>
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`bg-white border-b sticky top-0 z-40 ${className}`} style={{ borderColor: '#E5E5E5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <BocaBocaLogo size={32} />
              <span className="font-bold text-xl hidden sm:inline" style={{ color: '#1F1E2A' }}>
                BocaBoca
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/create" 
                className="transition-colors"
                style={{ color: pathname === '/create' ? '#FF644A' : '#666' }}
              >
                {t('navigation.create')}
              </Link>
              <Link 
                href="/discover" 
                className="transition-colors"
                style={{ color: pathname === '/discover' ? '#FF644A' : '#666' }}
              >
                {t('navigation.discover')}
              </Link>
              <Link 
                href="/community" 
                className="transition-colors"
                style={{ color: pathname === '/community' ? '#FF644A' : '#666' }}
              >
                {t('navigation.community')}
              </Link>
              <Link 
                href="/rewards" 
                className="transition-colors relative"
                style={{ color: pathname === '/rewards' ? '#FF644A' : '#666' }}
              >
                {t('navigation.rewards')}
                {isAuthenticated && authMode === 'email' && (
                  <span 
                    className="absolute -top-1 -right-12 text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{ 
                      backgroundColor: '#FFE8E3',
                      color: '#E65441',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}
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
              
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 transition-colors"
                style={{ color: '#666' }}
                aria-label={t('common.search')}
              >
                <Search size={20} />
              </button>

              {isAuthenticated && <NotificationBell />}

              {/* Token Balance Display */}
              {isAuthenticated && authMode === 'wallet' && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ 
                    backgroundColor: '#FFE8E3',
                    border: '1px solid #FFD4CC'
                  }}
                >
                  <Coins className="w-4 h-4" style={{ color: '#FF644A' }} />
                  {isLoadingBalance ? (
                    <div className="animate-pulse h-4 w-12 rounded" style={{ backgroundColor: '#FFD4CC' }}></div>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: '#E65441' }}>
                      {tokenBalance.toFixed(2)} BOCA
                    </span>
                  )}
                </div>
              )}

              {!isAuthenticated ? (
                <AuthButtons />
              ) : (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ 
                        background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)'
                      }}
                    >
                      {getInitial()}
                    </div>
                    <ChevronDown size={16} style={{ color: '#999' }} />
                  </button>

                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                    style={{ border: '1px solid #E5E5E5' }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: '#F5F5F5' }}>
                      <div className="font-medium" style={{ color: '#1F1E2A' }}>
                        {getDisplayName()}
                      </div>
                      {user?.email && (
                        <div className="text-sm" style={{ color: '#999' }}>{user.email}</div>
                      )}
                      {(user?.walletAddress || user?.wallet_address) && (
                        <div className="text-xs font-mono" style={{ color: '#BBB' }}>
                          {formatAddress(user.walletAddress || user.wallet_address || '')}
                        </div>
                      )}
                      <div className="mt-2">
                        <span 
                          className="inline-block px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: authMode === 'wallet' ? '#E3F2FD' : '#F5F5F5',
                            color: authMode === 'wallet' ? '#1976D2' : '#666'
                          }}
                        >
                          {authMode === 'wallet' ? `🔷 ${t('header.walletAccount')}` : `📧 ${t('header.emailAccount')}`}
                        </span>
                      </div>
                      
                      {/* Token balance in dropdown */}
                      {authMode === 'wallet' && (
                        <div className="mt-2 pt-2 border-t" style={{ borderColor: '#F5F5F5' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#999' }}>{t('header.bocaBalance')}:</span>
                            <span className="text-sm font-semibold" style={{ color: '#FF644A' }}>
                              {tokenBalance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      style={{ color: '#666' }}
                    >
                      {t('navigation.dashboard')}
                    </Link>
                    <Link
                      href={`/users/${user?.id}`}
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      style={{ color: '#666' }}
                    >
                      {t('navigation.profile')}
                    </Link>
                    <Link
                      href="/saved-lists"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      style={{ color: '#666' }}
                    >
                      {t('navigation.savedLists')}
                    </Link>
                    
                    {authMode === 'email' && (
                      <button
                        onClick={handleConnectWallet}
                        className="w-full text-left px-4 py-2 text-sm font-medium border-t"
                        style={{ 
                          color: '#FF644A',
                          borderColor: '#F5F5F5',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFE8E3'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        ⬆️ {t('header.upgradeToWallet')}
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm border-t flex items-center gap-2"
                      style={{ 
                        color: '#DC2626',
                        borderColor: '#F5F5F5',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              className="md:hidden p-2"
              style={{ color: '#666' }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Search Bar Dropdown */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white"
              style={{ borderTop: '1px solid #E5E5E5' }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: '#999' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    placeholder={t('header.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none"
                    style={{ borderColor: '#E5E5E5' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FF644A';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255, 100, 74, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E5E5';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div 
                        className="animate-spin rounded-full h-5 w-5 border-b-2"
                        style={{ borderColor: '#FF644A' }}
                      ></div>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div 
                    className="mt-2 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto"
                    style={{ border: '1px solid #E5E5E5' }}
                  >
                    {searchResults.map((result: any, index: number) => (
                      <Link
                        key={index}
                        href={result.url}
                        className="block px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                        style={{ borderColor: '#F5F5F5' }}
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        <div className="font-medium" style={{ color: '#1F1E2A' }}>{result.title}</div>
                        {result.description && (
                          <div className="text-sm mt-1" style={{ color: '#666' }}>{result.description}</div>
                        )}
                        <div className="text-xs mt-1" style={{ color: '#999' }}>{result.type}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b"
            style={{ borderColor: '#E5E5E5' }}
          >
            <div className="px-4 py-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: '#999' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder={t('header.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none"
                  style={{ borderColor: '#E5E5E5' }}
                />
              </div>

              {/* Language Switcher in Mobile Menu */}
              <div className="flex justify-center py-2">
                <LanguageSwitcher />
              </div>

              {/* Token balance in mobile menu */}
              {isAuthenticated && authMode === 'wallet' && (
                <div 
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ 
                    backgroundColor: '#FFE8E3',
                    border: '1px solid #FFD4CC'
                  }}
                >
                  <span className="text-sm" style={{ color: '#666' }}>{t('header.bocaBalance')}:</span>
                  {isLoadingBalance ? (
                    <div className="animate-pulse h-4 w-16 rounded" style={{ backgroundColor: '#FFD4CC' }}></div>
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: '#FF644A' }}>
                      {tokenBalance.toFixed(2)} BOCA
                    </span>
                  )}
                </div>
              )}

              <Link
                href="/discover"
                className="block py-2 transition-colors"
                style={{ color: pathname === '/discover' ? '#FF644A' : '#666' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.discover')}
              </Link>
              <Link
                href="/community"
                className="block py-2 transition-colors"
                style={{ color: pathname === '/community' ? '#FF644A' : '#666' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.community')}
              </Link>
              <Link
                href="/rewards"
                className="block py-2 transition-colors relative"
                style={{ color: pathname === '/rewards' ? '#FF644A' : '#666' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.rewards')}
                {isAuthenticated && authMode === 'email' && (
                  <span 
                    className="ml-2 text-xs px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: '#FFE8E3',
                      color: '#E65441',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}
                  >
                    {t('header.upgradeBadge')}
                  </span>
                )}
              </Link>
              <Link
                href="/create"
                className="block py-2 transition-colors"
                style={{ color: pathname === '/create' ? '#FF644A' : '#666' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.create')}
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block py-2"
                    style={{ color: '#666' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('navigation.dashboard')}
                  </Link>
                  <Link
                    href={`/users/${user?.id}`}
                    className="block py-2"
                    style={{ color: '#666' }}
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
                      className="w-full text-left py-2 font-medium"
                      style={{ color: '#FF644A' }}
                    >
                      ⬆️ {t('header.upgradeToWallet')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2"
                    style={{ color: '#DC2626' }}
                  >
                    {t('navigation.signOut')}
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#E5E5E5' }}>
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
                  console.log('📦 Token:', token ? 'Received' : 'Missing');
                  console.log('👤 User data:', userData);
    
                  try {
                    setShowWalletConnect(false);
                    login(token, userData);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await refreshAuth();
                    console.log('🚀 Redirecting to /feed');
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
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
                {t('auth.upgradeTitle')}
              </h2>
              <p className="mb-4" style={{ color: '#666' }}>
                {t('auth.upgradeMessage')}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowOnboarding(false);
                    setShowWalletConnect(true);
                  }}
                  className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF644A' }}
                >
                  {t('header.connectWallet')}
                </button>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full px-4 py-2 hover:opacity-70 transition-opacity"
                  style={{ color: '#666' }}
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowEmailSignup(false)}
                className="absolute top-4 right-4 transition-colors z-10"
                style={{ color: '#999' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#666'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
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