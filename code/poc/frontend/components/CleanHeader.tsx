'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Menu, 
  X, 
  Users, 
  Wallet, 
  LogOut,
  User,
  Settings,
  ChevronDown,
  Coins,
  TrendingUp,
  Mail,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import WalletConnect from '@/components/auth/WalletConnect';
import WalletOnboarding from '@/components/onboarding/WalletOnboarding';

interface CleanHeaderProps {
  currentPath?: string;
}

const CleanHeader: React.FC<CleanHeaderProps> = ({ currentPath = '/' }) => {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmailSignup, setShowEmailSignup] = useState(false);

  // Mock progressive auth state (integrate with your auth system)
  const authMode = user?.address ? 'wallet' : user?.email ? 'email' : 'guest';
  const pendingTokens = 0; // You can add this to your user model
  const canEarnTokens = authMode === 'wallet';

  // Dynamic Community link based on auth state
  const getCommunityLink = () => {
    return '/community';
    
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleAuthSuccess = (token: string, userData: any) => {
    login(token, userData);
    setShowWalletConnect(false);
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  };

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

  // Navigation items
  const navItems = [
    { href: '/discover', label: 'Discover' },
    { href: getCommunityLink(), label: 'Community', icon: Users },
    { href: '/create', label: 'Create' },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 }
  ];

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Link 
          key={item.href}
          href={item.href} 
          className={`font-medium transition-colors relative ${mobile ? 'block py-3 flex items-center gap-2' : ''} ${
            pathname === item.href 
              ? 'text-trust-600' 
              : 'text-network-600 hover:text-network-900'
          }`}
          onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
        >
          {mobile && item.icon && <item.icon size={16} />}
          {item.label}
          {!mobile && pathname === item.href && (
            <motion.div
              layoutId="activeTab"
              className="absolute -bottom-4 left-0 right-0 h-0.5 bg-trust-600"
            />
          )}
        </Link>
      ))}
    </>
  );

  const AuthButton = ({ mobile = false }: { mobile?: boolean }) => {
    if (isLoading) {
      return (
        <div className={`${mobile ? 'w-full' : ''} bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium`}>
          Loading...
        </div>
      );
    }

    if (isAuthenticated && user) {
      if (mobile) {
        return (
          <div className="w-full flex items-center gap-2">
            <Link 
              href={`/users/${user.id}`}
              className="flex-1 bg-trust-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-trust-600 transition-colors text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {user.display_name || user.username || 'My Profile'}
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        );
      }

      // Desktop authenticated user menu - handled in the main auth section
      return null;
    }

    // Guest user buttons
    return (
      <div className={`${mobile ? 'w-full space-y-2' : 'flex items-center gap-2'}`}>
        {!mobile && (
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
            Sign Up with Email
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="border-b border-network-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Logo size="lg" variant="full" />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <NavigationLinks />
            </nav>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Pending Tokens Indicator (Email Users) */}
              {authMode === 'email' && pendingTokens > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setShowOnboarding(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-orange-800 text-sm font-medium transition-colors"
                >
                  <Coins className="w-4 h-4" />
                  <span>{pendingTokens.toFixed(2)} TOK</span>
                  <ArrowUpRight className="w-3 h-3" />
                </motion.button>
              )}

              {/* Token Balance (Wallet Users) */}
              {authMode === 'wallet' && user?.tokens_earned && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success-50 border border-success-200 rounded-lg text-success-800 text-sm">
                  <Coins className="w-4 h-4" />
                  <span>{user.tokens_earned.toFixed(2)} TOK</span>
                  <span className="text-xs opacity-75">LIVE</span>
                </div>
              )}

              {!isAuthenticated ? (
                <AuthButton />
              ) : (
                /* Authenticated User Dropdown */
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-network-50 rounded-lg transition-colors"
                  >
                    {/* User Avatar */}
                    <img
                      src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                      alt={user?.display_name || user?.username}
                      className="w-8 h-8 rounded-full"
                    />

                    {/* User Info */}
                    <div className="text-left">
                      <p className="text-sm font-medium text-network-900">
                        {user?.display_name || user?.username || 'User'}
                      </p>
                      <p className="text-xs text-network-500">
                        {authMode === 'wallet' && user?.address
                          ? formatAddress(user.address)
                          : authMode === 'email'
                          ? 'Email Account'
                          : 'Guest'
                        }
                      </p>
                    </div>

                    <ChevronDown className="w-4 h-4 text-network-400" />
                  </button>

                  {/* User Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-72 bg-white border border-network-200 rounded-xl shadow-lg py-2 z-50"
                        onMouseLeave={() => setShowUserMenu(false)}
                      >
                        {/* User Info Header */}
                        <div className="px-4 py-3 border-b border-network-100">
                          <div className="flex items-center gap-3">
                            <img
                              src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                              alt={user?.display_name || user?.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-network-900">
                                {user?.display_name || user?.username || 'User'}
                              </p>
                              <p className="text-xs text-network-500">
                                {user?.email && <span>{user.email}</span>}
                                {authMode === 'wallet' && user?.address && (
                                  <span className="block">{formatAddress(user.address)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Account Status */}
                        <div className="px-4 py-3 border-b border-network-100">
                          {authMode === 'email' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-network-600">Account Type:</span>
                                <span className="text-orange-600 font-medium">Email</span>
                              </div>
                              {pendingTokens > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-network-600">Pending Tokens:</span>
                                  <span className="text-orange-600 font-medium">{pendingTokens.toFixed(2)} TOK</span>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setShowUserMenu(false);
                                  handleConnectWallet();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm transition-colors"
                              >
                                <Wallet className="w-4 h-4" />
                                Connect Wallet to Earn
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-network-600">Trust Score:</span>
                                <span className="text-success-600 font-medium">
                                  {user?.trust_score?.toFixed(1) || '0.0'}/10
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-network-600">Tokens Earned:</span>
                                <span className="text-success-600 font-medium">
                                  {user?.tokens_earned?.toFixed(2) || '0.00'} TOK
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-network-700 hover:bg-network-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <TrendingUp className="w-4 h-4" />
                            Dashboard
                          </Link>
                          
                          <Link
                            href={`/users/${user?.id}`}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-network-700 hover:bg-network-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Link>
                          
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-network-700 hover:bg-network-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-network-100 pt-1">
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-network-600 hover:text-network-900"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-network-200">
              <nav className="flex flex-col">
                <NavigationLinks mobile={true} />
                
                {/* Mobile Auth Section */}
                <div className="mt-4 pt-4 border-t border-network-200">
                  {isAuthenticated && user && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                          alt={user.display_name || user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {authMode === 'wallet' && user.address 
                              ? formatAddress(user.address)
                              : authMode === 'email' 
                              ? 'Email Account' 
                              : ''
                            }
                          </p>
                          {authMode === 'email' && pendingTokens > 0 && (
                            <p className="text-xs text-orange-600 font-medium">
                              {pendingTokens.toFixed(2)} TOK pending
                            </p>
                          )}
                        </div>
                      </div>
                      {authMode === 'email' && (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleConnectWallet();
                          }}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-sm transition-colors"
                        >
                          <Wallet className="w-4 h-4" />
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  )}
                  <AuthButton mobile={true} />
                </div>
              </nav>
            </div>
          )}
        </div>
        
        {/* Development Helper */}
        {process.env.NODE_ENV === 'development' && false && (
          <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-1">
            <div className="max-w-7xl mx-auto">
              <p className="text-xs text-yellow-800">
                <strong>Dev Mode:</strong> Auth: {isAuthenticated ? '✅ Logged In' : '❌ Logged Out'} | 
                Mode: {authMode} | User: {user?.username || 'None'}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <WalletConnect
              onSuccess={handleAuthSuccess}
              onCancel={() => setShowWalletConnect(false)}
              className="shadow-xl"
            />
          </div>
        </div>
      )}

      {/* Wallet Onboarding Modal */}
      <WalletOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        variant={authMode === 'email' ? 'upgrade' : 'first-time'}
      />

      {/* Email Signup Modal */}
      <AnimatePresence>
        {showEmailSignup && (
          <EmailSignupModal 
            onClose={() => setShowEmailSignup(false)}
            onSuccess={() => {
              setShowEmailSignup(false);
              // You'd integrate this with your actual auth system
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Simple Email Signup Modal Component
const EmailSignupModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    try {
      setIsLoading(true);
      // Here you'd integrate with your actual auth system
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error('Email signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Get Started</h2>
          <p className="text-gray-600 text-sm">
            Create an account to save recommendations and see token earning potential
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Your name"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            ✨ You'll earn tokens for helpful recommendations that you can claim when you connect a wallet later!
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CleanHeader;