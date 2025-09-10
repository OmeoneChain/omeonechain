// File: code/poc/frontend/hooks/useAuth.ts
// FIXED VERSION: Corrected API endpoints to match backend routes

'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { toast } from 'react-hot-toast';

// Types for authentication - Enhanced with progressive features + profile management
export type AuthMode = 'guest' | 'email' | 'wallet';

export interface User {
  id: string;
  address?: string; // Optional for email users
  email?: string; // New field for email users
  username?: string;
  display_name?: string;
  avatar_url?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
  created_at?: string;
  // Progressive Web3 fields
  auth_mode?: AuthMode;
  tokens_earned?: number;
  trust_score?: number;
  pending_tokens?: number; // For email users who haven't connected wallet
  // Profile management fields
  profileCompletion?: number;
  bio?: string;
  location_city?: string;
  location_country?: string;
  authMode?: AuthMode; // Alternative naming for compatibility
  name?: string; // Alternative naming for compatibility
  avatar?: string; // Alternative naming for compatibility
  reputation?: number;
  trustScore?: number;
  tokensEarned?: number;
  stakingBalance?: number;
  createdAt?: string;
  // Additional fields from backend
  walletAddress?: string;
  reputation_score?: number;
  staking_balance?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  // Progressive Web3 state
  authMode: AuthMode;
  pendingTokens: number;
  canEarnTokens: boolean;
}

// Initial auth state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  authMode: 'guest',
  pendingTokens: 0,
  canEarnTokens: false,
};

// FIXED: Correct API configuration to match backend structure
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Profile completion calculation helper
const calculateProfileCompletion = (user: User): number => {
  let score = 0;
  
  // Basic information (40 points)
  if (user.username && user.username !== user.id) score += 10;
  if (user.display_name && user.display_name !== user.username) score += 10;
  if (user.bio && user.bio.length > 10) score += 10;
  if (user.avatar_url && !user.avatar_url.includes('dicebear')) score += 10;
  
  // Location (20 points)
  if (user.location_city) score += 10;
  if (user.location_country) score += 10;
  
  // Social activity (30 points)
  if ((user.trust_score || user.trustScore || 0) > 0) score += 15;
  if ((user.tokens_earned || user.tokensEarned || 0) > 0) score += 15;
  
  // Verification (10 points)
  if ((user.auth_mode || user.authMode) === 'wallet') score += 10;
  
  return Math.min(score, 100);
};

// Auth context type - Enhanced with progressive features + profile management
interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  isCheckingAuth: boolean;
  // Progressive Web3 methods
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  upgradeToWallet: () => Promise<void>;
  addPendingTokens: (amount: number) => void;
  showUpgradePrompt: () => void;
  connectWallet: (onSuccess?: () => void) => Promise<void>;
  // Profile management methods
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (profileData: any) => Promise<void>;
  refreshProfileCompletion: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// FIXED: Real API functions with correct endpoints matching backend structure
const authAPI = {
  // Get current user from backend - FIXED: Correct endpoint
  getCurrentUser: async (token: string): Promise<User> => {
    console.log('🔍 Getting current user from backend...');
    
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to get user`);
    }

    const data = await response.json();
    console.log('✅ User data received from backend:', data);
    
    if (!data.success || !data.user) {
      throw new Error('Invalid user data received');
    }

    const user = data.user;
    
    // Ensure profile completion is calculated
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }

    // Add compatibility fields
    return {
      ...user,
      name: user.display_name || user.username || user.name,
      avatar: user.avatar_url || user.avatar,
      authMode: 'wallet' as AuthMode,
      reputation: user.reputation_score || user.reputation || 0,
      trustScore: user.trust_score || user.trustScore || 0,
      tokensEarned: user.tokens_earned || user.tokensEarned || 0,
      stakingBalance: user.staking_balance || user.stakingBalance || 0,
      createdAt: user.created_at || user.createdAt
    };
  },

  // Refresh token and get updated user data - FIXED: Correct endpoint
  refreshToken: async (token: string): Promise<{ token: string; user: User }> => {
    console.log('🔄 Refreshing auth token...');
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    if (!data.success || !data.valid) {
      throw new Error('Invalid or expired token');
    }

    // Get fresh user data
    const user = await authAPI.getCurrentUser(token);
    
    return {
      token,
      user
    };
  },

  // New: Email signup
  createEmailUser: async (email: string, name?: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const user: User = {
      id: `email_${Date.now()}`,
      email,
      display_name: name || email.split('@')[0],
      username: email.split('@')[0],
      name: name || email.split('@')[0], // Compatibility
      verification_status: 'basic',
      auth_mode: 'email',
      authMode: 'email',
      tokens_earned: 0,
      tokensEarned: 0,
      trust_score: 0,
      trustScore: 0,
      pending_tokens: 0,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    user.profileCompletion = calculateProfileCompletion(user);
    return user;
  },

  // New: Upgrade email user to wallet
  upgradeUserToWallet: async (userId: string, address: string, token: string): Promise<User> => {
    // This would call the real upgrade API when implemented
    const user = await authAPI.getCurrentUser(token);
    return user;
  },

  // FIXED: Update profile via real API with correct endpoint
  updateProfile: async (token: string, profileData: any): Promise<User> => {
    console.log('📝 Updating profile via API...', profileData);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update profile: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Profile updated successfully:', data);
    
    if (!data.success || !data.user) {
      throw new Error('Invalid response from profile update');
    }

    const user = data.user;
    
    // Ensure profile completion is calculated
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }

    // Add compatibility fields
    return {
      ...user,
      name: user.display_name || user.username || user.name,
      avatar: user.avatar_url || user.avatar,
      authMode: 'wallet' as AuthMode,
      reputation: user.reputation_score || user.reputation || 0,
      trustScore: user.trust_score || user.trustScore || 0,
      tokensEarned: user.tokens_earned || user.tokensEarned || 0,
      stakingBalance: user.staking_balance || user.stakingBalance || 0,
      createdAt: user.created_at || user.createdAt
    };
  },

  // Check username availability - FIXED: Correct endpoint
  checkUsernameAvailability: async (username: string): Promise<{ available: boolean; suggestions?: string[] }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/availability/${username}`);
    
    if (!response.ok) {
      throw new Error('Failed to check username availability');
    }
    
    const data = await response.json();
    return {
      available: data.available,
      suggestions: data.suggestions
    };
  }
};

// Enhanced Storage utilities
const AuthStorage = {
  saveToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omeone_auth_token', token);
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omeone_auth_token');
    }
    return null;
  },

  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omeone_auth_token');
    }
  },

  saveUser: (user: User): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omeone_user', JSON.stringify(user));
    }
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('omeone_user');
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          localStorage.removeItem('omeone_user');
        }
      }
    }
    return null;
  },

  removeUser: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omeone_user');
    }
  },

  // New: Pending tokens management
  savePendingTokens: (amount: number): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omeone_pending_tokens', amount.toString());
    }
  },

  getPendingTokens: (): number => {
    if (typeof window !== 'undefined') {
      const pending = localStorage.getItem('omeone_pending_tokens');
      return pending ? parseFloat(pending) || 0 : 0;
    }
    return 0;
  },

  removePendingTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omeone_pending_tokens');
    }
  },

  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omeone_auth_token');
      localStorage.removeItem('omeone_user');
      localStorage.removeItem('omeone_pending_tokens');
    }
  }
};

// Auth provider component - Enhanced with progressive features + profile management
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Helper to determine auth mode
  const getAuthMode = (user: User | null): AuthMode => {
    if (!user) return 'guest';
    if (user.address || user.walletAddress) return 'wallet';
    if (user.email) return 'email';
    return 'guest';
  };

  // Enhanced login function
  const login = useCallback((token: string, user: User) => {
    const authMode = getAuthMode(user);
    
    // Ensure profile completion is calculated
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }
    
    // Save to storage
    AuthStorage.saveToken(token);
    AuthStorage.saveUser(user);
    
    // Clear pending tokens if upgrading to wallet
    if (authMode === 'wallet') {
      AuthStorage.removePendingTokens();
    }
    
    // Update state
    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user,
      token,
      authMode,
      pendingTokens: authMode === 'email' ? (user.pending_tokens || 0) : 0,
      canEarnTokens: authMode === 'wallet',
    });

    toast.success(`Welcome back, ${user.display_name || user.username || user.name || 'User'}!`);
  }, []);

  // Enhanced logout function - FIXED: Correct endpoint
  const logout = useCallback(async () => {
    const token = AuthStorage.getToken();
    
    // Try to logout on backend
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Backend logout failed:', error);
        // Continue with local cleanup
      }
    }
    
    // Clear storage
    AuthStorage.clear();
    
    // Update state
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      authMode: 'guest',
      pendingTokens: 0,
      canEarnTokens: false,
    });

    toast.success('Successfully logged out');
  }, []);

  // Profile management functions
  const updateUser = useCallback((updates: Partial<User>) => {
    if (!authState.user) return;
    
    const updatedUser = { ...authState.user, ...updates };
    updatedUser.profileCompletion = calculateProfileCompletion(updatedUser);
    
    // Update storage
    AuthStorage.saveUser(updatedUser);
    
    // Update state
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  }, [authState.user]);

  const updateProfile = useCallback(async (profileData: any) => {
    try {
      if (!authState.user || !authState.token) {
        throw new Error('No user logged in');
      }

      // Make API call to update profile
      const updatedUser = await authAPI.updateProfile(authState.token, profileData);
      
      // Update the user in state with the response data
      const userUpdates = {
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
        location_city: updatedUser.location_city,
        location_country: updatedUser.location_country,
        avatar_url: updatedUser.avatar_url,
        profileCompletion: updatedUser.profileCompletion,
        // Update compatibility fields
        name: updatedUser.display_name || updatedUser.username,
        avatar: updatedUser.avatar_url
      };

      updateUser(userUpdates);
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }, [authState.user, authState.token, updateUser]);

  const refreshProfileCompletion = useCallback(() => {
    if (authState.user) {
      const newCompletion = calculateProfileCompletion(authState.user);
      updateUser({ profileCompletion: newCompletion });
    }
  }, [authState.user, updateUser]);

  // New: Email login function
  const loginWithEmail = useCallback(async (email: string, name?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Create email user (in production, this would call your API)
      const user = await authAPI.createEmailUser(email, name);
      
      // Save user without token
      AuthStorage.saveUser(user);
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user,
        token: null,
        authMode: 'email',
        pendingTokens: 0,
        canEarnTokens: false,
      });
      
      toast.success('Account created! Connect a wallet to start earning tokens.');
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      toast.error(`Email signup failed: ${error.message}`);
      throw error;
    }
  }, []);

  // New: Wallet connection function
  const connectWallet = useCallback(async (onSuccess?: () => void) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Dynamic import to avoid SSR issues
      const { WalletManager, AuthAPI, createAuthMessage } = await import('@/lib/auth');
      
      // Connect wallet
      const walletInfo = await WalletManager.connectMetaMask();
      
      // Get challenge
      const challengeResponse = await AuthAPI.getAuthChallenge(walletInfo.address);
      const authMessage = createAuthMessage(challengeResponse.challenge, walletInfo.address);
      
      // Sign message
      const signature = await WalletManager.signMessage(authMessage, walletInfo.address);
      
      // Verify and get token
      const authResult = await AuthAPI.verifySignature(
        walletInfo.address,
        signature,
        challengeResponse.challenge
      );

      if (authState.user && authState.authMode === 'email') {
        // Upgrade existing email user to wallet
        const upgradedUser = await authAPI.upgradeUserToWallet(
          authState.user.id,
          walletInfo.address,
          authResult.token
        );
        
        login(authResult.token, upgradedUser);
        
        toast.success(`Wallet connected! You've claimed ${authState.pendingTokens.toFixed(2)} TOK.`);
      } else {
        // New wallet user
        login(authResult.token, authResult.user);
        toast.success('Wallet connected successfully!');
      }
      
      onSuccess?.();
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      toast.error(`Wallet connection failed: ${error.message}`);
      throw error;
    }
  }, [authState.user, authState.authMode, authState.pendingTokens, login]);

  // New: Upgrade to wallet function
  const upgradeToWallet = useCallback(async () => {
    return connectWallet();
  }, [connectWallet]);

  // New: Add pending tokens function
  const addPendingTokens = useCallback((amount: number) => {
    if (authState.authMode === 'email') {
      const newTotal = authState.pendingTokens + amount;
      AuthStorage.savePendingTokens(newTotal);
      
      setAuthState(prev => ({ ...prev, pendingTokens: newTotal }));
      
      toast.success(`+${amount.toFixed(2)} TOK earned! Connect wallet to claim.`, {
        duration: 3000,
      });
    }
  }, [authState.authMode, authState.pendingTokens]);

  // New: Show upgrade prompt function - Using React.createElement instead of JSX
  const showUpgradePrompt = useCallback(() => {
    if (authState.authMode === 'email' && authState.pendingTokens > 0) {
      toast.custom(
        (t) => 
          React.createElement('div', {
            className: 'bg-white border border-orange-200 rounded-lg p-4 shadow-lg max-w-sm'
          },
            React.createElement('div', {
              className: 'flex items-start gap-3'
            },
              React.createElement('div', {
                className: 'w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0'
              }, '🪙'),
              React.createElement('div', {
                className: 'flex-1'
              },
                React.createElement('p', {
                  className: 'text-sm font-medium text-gray-900 mb-1'
                }, `You've earned ${authState.pendingTokens.toFixed(2)} TOK!`),
                React.createElement('p', {
                  className: 'text-xs text-gray-600 mb-3'
                }, 'Connect your wallet to claim your tokens and start earning more.'),
                React.createElement('div', {
                  className: 'flex gap-2'
                },
                  React.createElement('button', {
                    onClick: () => {
                      toast.dismiss(t.id);
                      upgradeToWallet();
                    },
                    className: 'px-3 py-1.5 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors'
                  }, 'Connect Wallet'),
                  React.createElement('button', {
                    onClick: () => toast.dismiss(t.id),
                    className: 'px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors'
                  }, 'Later')
                )
              )
            )
          ),
        { duration: 8000, position: 'top-right' }
      );
    }
  }, [authState.authMode, authState.pendingTokens, upgradeToWallet]);

  // FIXED: Enhanced refresh authentication with correct API endpoints
  const refreshAuth = useCallback(async () => {
    const token = AuthStorage.getToken();
    const storedUser = AuthStorage.getUser();
    const pendingTokens = AuthStorage.getPendingTokens();
    
    if (!token && !storedUser) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        pendingTokens: pendingTokens 
      }));
      setIsCheckingAuth(false);
      return;
    }

    // Handle email-only users (no token)
    if (storedUser && !token) {
      const authMode = getAuthMode(storedUser);
      if (!storedUser.profileCompletion) {
        storedUser.profileCompletion = calculateProfileCompletion(storedUser);
      }
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: storedUser,
        token: null,
        authMode,
        pendingTokens: authMode === 'email' ? pendingTokens : 0,
        canEarnTokens: false,
      });
      setIsCheckingAuth(false);
      return;
    }

    // Handle wallet users (with token) - FIXED: Now uses correct API endpoints
    if (token) {
      try {
        console.log('🔄 Refreshing auth with real API...');
        const user = await authAPI.getCurrentUser(token); // 🎯 Now calls correct /api/auth/me endpoint!
        const authMode = getAuthMode(user);
        
        console.log('✅ Got real user data from backend:', user);
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user,
          token,
          authMode,
          pendingTokens: authMode === 'email' ? pendingTokens : 0,
          canEarnTokens: authMode === 'wallet',
        });
      } catch (error: any) {
        console.error('❌ Auth refresh failed:', error);
        
        // Try to refresh the token
        try {
          const refreshResult = await authAPI.refreshToken(token); // 🎯 Real token refresh with correct endpoint!
          const authMode = getAuthMode(refreshResult.user);
          
          // Update storage
          AuthStorage.saveToken(refreshResult.token);
          AuthStorage.saveUser(refreshResult.user);
          
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: refreshResult.user,
            token: refreshResult.token,
            authMode,
            pendingTokens: authMode === 'email' ? pendingTokens : 0,
            canEarnTokens: authMode === 'wallet',
          });
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          
          // Clear invalid auth data
          AuthStorage.clear();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
            authMode: 'guest',
            pendingTokens: 0,
            canEarnTokens: false,
          });
          
          // Don't show error toast for expired tokens on page load
          if (!window.location.pathname.includes('/login')) {
            toast.error('Session expired. Please connect your wallet again.');
          }
        }
      } finally {
        setIsCheckingAuth(false);
      }
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setIsCheckingAuth(false);
      }
    };

    initializeAuth();
  }, [refreshAuth]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
    isCheckingAuth,
    // Progressive Web3 methods
    loginWithEmail,
    upgradeToWallet,
    addPendingTokens,
    showUpgradePrompt,
    connectWallet,
    // Profile management methods
    updateUser,
    updateProfile,
    refreshProfileCompletion,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
};

// Enhanced utility hooks

// Hook for protected routes
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Please connect your wallet to access this feature');
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
};

// Enhanced hook for conditional rendering based on auth state
export const useAuthGuard = () => {
  const { isAuthenticated, isLoading, user, authMode, canEarnTokens, showUpgradePrompt } = useAuth();

  const requireAuth = (action: string = 'perform this action') => {
    if (!isAuthenticated) {
      toast.error(`Please sign in to ${action}`);
      return false;
    }
    return true;
  };
  
  const requireWallet = (action: string = 'earn tokens') => {
    if (authMode !== 'wallet') {
      toast.custom(
        (t) =>
          React.createElement('div', {
            className: 'bg-white border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm'
          },
            React.createElement('div', {
              className: 'flex items-start gap-3'
            },
              React.createElement('div', {
                className: 'w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'
              }, '🔗'),
              React.createElement('div', {
                className: 'flex-1'
              },
                React.createElement('p', {
                  className: 'text-sm font-medium text-gray-900 mb-1'
                }, 'Wallet Required'),
                React.createElement('p', {
                  className: 'text-xs text-gray-600 mb-3'
                }, `Connect your wallet to ${action}`),
                React.createElement('button', {
                  onClick: () => {
                    toast.dismiss(t.id);
                    showUpgradePrompt();
                  },
                  className: 'px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors'
                }, 'Connect Wallet')
              )
            )
          ),
        { duration: 5000 }
      );
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    authMode,
    canAccess: isAuthenticated && !isLoading,
    isGuest: !isAuthenticated && !isLoading,
    canEarnTokens,
    requireAuth,
    requireWallet,
  };
};

// Hook for getting authenticated API headers
export const useAuthHeaders = () => {
  const { token } = useAuth();

  return useCallback(() => {
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [token]);
};

// Enhanced hook for making authenticated API calls
export const useAuthenticatedFetch = () => {
  const getHeaders = useAuthHeaders();
  const { logout } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...getHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
      logout();
      toast.error('Session expired. Please reconnect your wallet.');
      throw new Error('Authentication expired');
    }

    return response;
  }, [getHeaders, logout]);
};