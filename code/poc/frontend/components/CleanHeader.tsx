// File: code/poc/frontend/src/components/restaurant/CleanHeader.tsx
// Updated to use AuthModal with social login buttons

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, Bell, Wallet, Mail, Users, ChevronDown, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from '@/components/auth/AuthModal';

interface CleanHeaderProps {
  className?: string;
}

export function CleanHeader({ className = '' }: CleanHeaderProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'email' | 'wallet'>('email');
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [trustMode, setTrustMode] = useState<'social' | 'global'>('social');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmailSignup, setShowEmailSignup] = useState(false);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        // Determine auth mode
        if (parsedUser.walletAddress) {
          setAuthMode('wallet');
        } else {
          setAuthMode('email');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    // Fetch notifications if authenticated
    if (isAuthenticated) {
      // Placeholder - replace with actual API call
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  const handleConnectWallet = () => {
    if (authMode === 'email') {
      // Show upgrade flow for existing email users
      setShowOnboarding(true);
    } else {
      // Show wallet connection
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setAuthMode('email');
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

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const AuthButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {!isAuthenticated && (
        <button 
          onClick={handleSignUp}
          className="px-4 py-2 text-sm text-network-600 hover:text-network-800 transition-colors"
        >
          Sign Up
        </button>
      )}
      <button 
        onClick={handleConnectWallet}
        className={`${mobile ? 'w-full' : ''} bg-trust-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-trust-600 transition-colors flex items-center justify-center gap-2`}
      >
        <Wallet size={16} />
        Connect Wallet
      </button>
      {mobile && (
        <button
          onClick={() => {
            handleSignUp();
            setIsMobileMenuOpen(false);
          }}
          className="w-full border border-network-300 text-network-700 px-4 py-2 rounded-lg font-medium hover:bg-network-50 transition-colors flex items-center justify-center gap-2"
        >
          <Mail size={16} />
          Email Sign Up
        </button>
      )}
    </>
  );

  return (
    <>
      <header className={`bg-white border-b border-gray-200 sticky top-0 z-40 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-trust-500 to-trust-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OC</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-lg text-gray-900">OmeoneChain</div>
                <div className="text-xs text-gray-500 -mt-1">Trust-Based Recommendations</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/discover" 
                className="text-gray-600 hover:text-trust-600 transition-colors"
              >
                Discover
              </Link>
              <Link 
                href="/community" 
                className="text-gray-600 hover:text-trust-600 transition-colors"
              >
                Community
              </Link>
              <Link 
                href="/create" 
                className="text-gray-600 hover:text-trust-600 transition-colors"
              >
                Create
              </Link>
            </nav>

            {/* Desktop Right Section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Search Button */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 text-gray-600 hover:text-trust-600 transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* Notifications */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-600 hover:text-trust-600 transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Auth Buttons / User Menu */}
              {!isAuthenticated ? (
                <AuthButtons />
              ) : (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-trust-500 to-trust-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <ChevronDown size={16} className="text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-gray-900">
                        {user?.displayName || user?.username || 'User'}
                      </div>
                      {user?.email && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                      {user?.walletAddress && (
                        <div className="text-xs text-gray-400 font-mono">
                          {formatAddress(user.walletAddress)}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          authMode === 'wallet' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {authMode === 'wallet' ? '🔷 Wallet Account' : '📧 Email Account'}
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href={`/users/${user?.id}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/saved-lists"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Saved Lists
                    </Link>
                    
                    {authMode === 'email' && (
                      <button
                        onClick={handleConnectWallet}
                        className="w-full text-left px-4 py-2 text-sm text-trust-600 hover:bg-trust-50 font-medium border-t border-gray-100"
                      >
                        ⬆️ Upgrade to Wallet
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Search Bar (Desktop) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-t border-gray-200 bg-white"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    placeholder="Search recommendations, users, or restaurants..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-trust-500 outline-none"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-trust-500"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {searchResults.map((result: any, index: number) => (
                      <Link
                        key={index}
                        href={result.url}
                        className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        <div className="font-medium text-gray-900">{result.title}</div>
                        {result.description && (
                          <div className="text-sm text-gray-600 mt-1">{result.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{result.type}</div>
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
            className="md:hidden bg-white border-b border-gray-200"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-trust-500 outline-none"
                />
              </div>

              {/* Mobile Navigation Links */}
              <Link
                href="/discover"
                className="block py-2 text-gray-600 hover:text-trust-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Discover
              </Link>
              <Link
                href="/community"
                className="block py-2 text-gray-600 hover:text-trust-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Community
              </Link>
              <Link
                href="/create"
                className="block py-2 text-gray-600 hover:text-trust-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Create
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block py-2 text-gray-600 hover:text-trust-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/users/${user?.id}`}
                    className="block py-2 text-gray-600 hover:text-trust-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {authMode === 'email' && (
                    <button
                      onClick={() => {
                        handleConnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left py-2 text-trust-600 hover:text-trust-700 font-medium"
                    >
                      ⬆️ Upgrade to Wallet
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 text-red-600 hover:text-red-700"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <AuthButtons mobile />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-gray-500">{unreadCount} unread</span>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markNotificationAsRead(notification.id);
                        }
                        if (notification.link) {
                          router.push(notification.link);
                          setShowNotifications(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {notification.type === 'follow' && <Users size={20} className="text-blue-500" />}
                          {notification.type === 'comment' && <Mail size={20} className="text-green-500" />}
                          {notification.type === 'recommendation' && <Bell size={20} className="text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trust Mode Toggle - shown when authenticated */}
      {isAuthenticated && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">View Mode:</span>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTrustMode('social')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    trustMode === 'social'
                      ? 'bg-trust-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Social Trust
                </button>
                <button
                  onClick={() => setTrustMode('global')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    trustMode === 'global'
                      ? 'bg-trust-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Global
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
            <p className="text-gray-600 mb-4">
              Connect your wallet to access full features including token claims and NFT loyalty cards.
            </p>
            <button
              onClick={() => setShowWalletConnect(false)}
              className="w-full px-4 py-2 bg-trust-500 text-white rounded-lg hover:bg-trust-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Onboarding/Upgrade Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <h2 className="text-xl font-bold mb-4">Upgrade to Wallet Account</h2>
              <p className="text-gray-600 mb-4">
                Connect a wallet to claim your earned tokens and access full features.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full px-4 py-2 bg-trust-500 text-white rounded-lg hover:bg-trust-600"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Signup Modal - REPLACED WITH AuthModal */}
      <AnimatePresence>
        {showEmailSignup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowEmailSignup(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close modal"
              >
                <X size={24} />
              </button>

              {/* AuthModal with social buttons */}
              <div className="p-6">
                <AuthModal 
                  onSuccess={(token, user) => {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    setIsAuthenticated(true);
                    setUser(user);
                    setShowEmailSignup(false);
                    
                    // Determine auth mode
                    if (user.walletAddress) {
                      setAuthMode('wallet');
                    } else {
                      setAuthMode('email');
                    }
                    
                    // Redirect to discover page
                    router.push('/discover');
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