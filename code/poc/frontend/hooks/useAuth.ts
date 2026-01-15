// File: code/poc/frontend/hooks/useAuth.ts
// FIXED VERSION: Added SSR safety to prevent React hydration errors

'use client';

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Types for authentication
export type AuthMode = 'guest' | 'email' | 'wallet';

export interface User {
  id: string;
  address?: string;
  email?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
  created_at?: string;
  auth_mode?: AuthMode;
  tokens_earned?: number;
  trust_score?: number;
  pending_tokens?: number;
  profileCompletion?: number;
  bio?: string;
  location_city?: string;
  location_country?: string;
  authMode?: AuthMode;
  name?: string;
  avatar?: string;
  reputation?: number;
  trustScore?: number;
  tokensEarned?: number;
  stakingBalance?: number;
  createdAt?: string;
  walletAddress?: string;
  reputation_score?: number;
  staking_balance?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  authMode: AuthMode;
  pendingTokens: number;
  canEarnTokens: boolean;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  authMode: 'guest',
  pendingTokens: 0,
  canEarnTokens: false,
};

const BACKEND_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

const calculateProfileCompletion = (user: User): number => {
  let score = 0;
  if (user.username && user.username !== user.id) score += 10;
  if (user.display_name && user.display_name !== user.username) score += 10;
  if (user.bio && user.bio.length > 10) score += 10;
  if (user.avatar_url && !user.avatar_url.includes('dicebear')) score += 10;
  if (user.location_city) score += 10;
  if (user.location_country) score += 10;
  if ((user.trust_score || user.trustScore || 0) > 0) score += 15;
  if ((user.tokens_earned || user.tokensEarned || 0) > 0) score += 15;
  if ((user.auth_mode || user.authMode) === 'wallet') score += 10;
  return Math.min(score, 100);
};

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  isCheckingAuth: boolean;
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  upgradeToWallet: () => Promise<void>;
  addPendingTokens: (amount: number) => void;
  showUpgradePrompt: () => void;
  connectWallet: (onSuccess?: () => void) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (profileData: any) => Promise<void>;
  refreshProfileCompletion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Storage utilities with SSR safety
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

// API functions
const authAPI = {
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to get user`);
    }
    const data = await response.json();
    if (!data.success || !data.user) {
      throw new Error('Invalid user data received');
    }
    const user = data.user;
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }
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
  createEmailUser: async (email: string, name?: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const user: User = {
      id: `email_${Date.now()}`,
      email,
      display_name: name || email.split('@')[0],
      username: email.split('@')[0],
      name: name || email.split('@')[0],
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
  updateProfile: async (token: string, profileData: any): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) {
      throw new Error(`Failed to update profile: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data.success || !data.user) {
      throw new Error('Invalid response from profile update');
    }
    const user = data.user;
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }
    return {
      ...user,
      name: user.display_name || user.username || user.name,
      avatar: user.avatar_url || user.avatar,
      authMode: 'wallet' as AuthMode,
    };
  },
};

// Auth provider component - FIXED: SSR-safe initialization
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);
  const initRef = useRef(false);

  const getAuthMode = (user: User | null): AuthMode => {
    if (!user) return 'guest';
    if (user.address || user.walletAddress) return 'wallet';
    if (user.email) return 'email';
    return 'guest';
  };

  const login = useCallback((token: string, user: User) => {
    const authMode = getAuthMode(user);
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }
    AuthStorage.saveToken(token);
    AuthStorage.saveUser(user);
    if (authMode === 'wallet') {
      AuthStorage.removePendingTokens();
    }
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

  const logout = useCallback(async () => {
    const token = AuthStorage.getToken();
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.warn('Backend logout failed:', error);
      }
    }
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
    toast.success('Successfully logged out');
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!authState.user) return;
    const updatedUser = { ...authState.user, ...updates };
    updatedUser.profileCompletion = calculateProfileCompletion(updatedUser);
    AuthStorage.saveUser(updatedUser);
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  }, [authState.user]);

  const updateProfile = useCallback(async (profileData: any) => {
    if (!authState.user || !authState.token) {
      throw new Error('No user logged in');
    }
    const updatedUser = await authAPI.updateProfile(authState.token, profileData);
    updateUser(updatedUser);
    toast.success('Profile updated successfully!');
  }, [authState.user, authState.token, updateUser]);

  const refreshProfileCompletion = useCallback(() => {
    if (authState.user) {
      const newCompletion = calculateProfileCompletion(authState.user);
      updateUser({ profileCompletion: newCompletion });
    }
  }, [authState.user, updateUser]);

  const loginWithEmail = useCallback(async (email: string, name?: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const user = await authAPI.createEmailUser(email, name);
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

  const connectWallet = useCallback(async (onSuccess?: () => void) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const { WalletManager, AuthAPI, createAuthMessage } = await import('@/lib/auth');
      const walletInfo = await WalletManager.connectMetaMask();
      const challengeResponse = await AuthAPI.getAuthChallenge(walletInfo.address);
      const authMessage = createAuthMessage(challengeResponse.challenge, walletInfo.address);
      const signature = await WalletManager.signMessage(authMessage, walletInfo.address);
      const authResult = await AuthAPI.verifySignature(walletInfo.address, signature, challengeResponse.challenge);
      login(authResult.token, authResult.user);
      toast.success('Wallet connected successfully!');
      onSuccess?.();
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      toast.error(`Wallet connection failed: ${error.message}`);
      throw error;
    }
  }, [login]);

  const upgradeToWallet = useCallback(async () => {
    return connectWallet();
  }, [connectWallet]);

  const addPendingTokens = useCallback((amount: number) => {
    if (authState.authMode === 'email') {
      const newTotal = authState.pendingTokens + amount;
      AuthStorage.savePendingTokens(newTotal);
      setAuthState(prev => ({ ...prev, pendingTokens: newTotal }));
      toast.success(`+${amount.toFixed(2)} TOK earned! Connect wallet to claim.`);
    }
  }, [authState.authMode, authState.pendingTokens]);

  const showUpgradePrompt = useCallback(() => {
    if (authState.authMode === 'email' && authState.pendingTokens > 0) {
      toast(`You've earned ${authState.pendingTokens.toFixed(2)} TOK! Connect wallet to claim.`);
    }
  }, [authState.authMode, authState.pendingTokens]);

  // FIXED: SSR-safe refresh auth - only runs after mount
  const refreshAuth = useCallback(async () => {
    // Don't run on server
    if (typeof window === 'undefined') {
      return;
    }

    const token = AuthStorage.getToken();
    const storedUser = AuthStorage.getUser();
    const pendingTokens = AuthStorage.getPendingTokens();

    console.log('🔄 Refresh auth called:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });

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

    // Handle wallet users (with token)
    if (token) {
      try {
        const user = await authAPI.getCurrentUser(token);
        const authMode = getAuthMode(user);
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
      } finally {
        setIsCheckingAuth(false);
      }
    }
  }, []);

  // FIXED: Only initialize auth after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !initRef.current) {
      initRef.current = true;
      refreshAuth();
    }
  }, [mounted, refreshAuth]);

  // FIXED: Return loading state during SSR to prevent hydration mismatch
  const contextValue: AuthContextType = {
    ...authState,
    // Override isLoading to be true until mounted
    isLoading: !mounted || authState.isLoading,
    login,
    logout,
    refreshAuth,
    isCheckingAuth: !mounted || isCheckingAuth,
    loginWithEmail,
    upgradeToWallet,
    addPendingTokens,
    showUpgradePrompt,
    connectWallet,
    updateUser,
    updateProfile,
    refreshProfileCompletion,
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
};

// Utility hooks
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Please connect your wallet to access this feature');
    }
  }, [isAuthenticated, isLoading]);
  return { isAuthenticated, isLoading };
};

export const useAuthGuard = () => {
  const { isAuthenticated, isLoading, user, authMode, canEarnTokens } = useAuth();
  const requireAuth = (action: string = 'perform this action') => {
    if (!isAuthenticated) {
      toast.error(`Please sign in to ${action}`);
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
  };
};

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

export const useAuthenticatedFetch = () => {
  const getHeaders = useAuthHeaders();
  const { logout } = useAuth();
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = { ...getHeaders(), ...options.headers };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      logout();
      throw new Error('Authentication expired');
    }
    return response;
  }, [getHeaders, logout]);
};
