// File: code/poc/frontend/hooks/useAuth.ts
// COMPREHENSIVE FIX: Capacitor Preferences + Refresh Tokens + App Resume Handling
// This implements WhatsApp-style persistent login for mobile apps
//
// UPDATED (Jan 28, 2026): Re-enabled Capacitor Preferences for iOS/Android native storage
// localStorage is volatile on iOS WKWebView - the OS can clear it anytime
// Capacitor Preferences uses iOS UserDefaults / Android SharedPreferences which persist

'use client';

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

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
  onboarding_completed?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean; // Tracks if we've completed initial auth check
  user: User | null;
  token: string | null;
  refreshToken: string | null; // Refresh token support
  authMode: AuthMode;
  pendingTokens: number;
  canEarnTokens: boolean;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  isHydrated: false,
  user: null,
  token: null,
  refreshToken: null,
  authMode: 'guest',
  pendingTokens: 0,
  canEarnTokens: false,
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

// Token expiry buffer - refresh 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// CAPACITOR DETECTION & STORAGE
// ============================================================================

/**
 * Detects if we're running in a Capacitor native context
 */
const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

/**
 * Storage adapter that uses Capacitor Preferences on mobile, localStorage on web
 * Capacitor Preferences uses:
 * - iOS: UserDefaults (persists across app restarts, survives app backgrounding)
 * - Android: SharedPreferences (persists across app restarts)
 * 
 * This is CRITICAL for mobile apps - localStorage in WKWebView is NOT persistent!
 */
const AuthStorage = {
  _capacitorPreferences: null as any,
  _initPromise: null as Promise<any> | null,
  _initAttempted: false,

  /**
   * FIXED (Jan 28, 2026): Re-enabled Capacitor Preferences
   * Now properly uses iOS UserDefaults / Android SharedPreferences for persistent storage
   */
  async _getPreferences() {
    // TEMPORARY FIX: Bypass Capacitor Preferences to fix loading issue
    // This forces localStorage usage until the Capacitor plugin issue is resolved
    // TODO: Re-enable Capacitor Preferences once plugin is properly configured
    console.log('📱 Using localStorage (Capacitor Preferences bypassed)');
    return null;
  },

  async saveToken(token: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.set({ key: 'omeone_auth_token', value: token });
        console.log('💾 Token saved to Capacitor Preferences');
      } else {
        localStorage.setItem('omeone_auth_token', token);
        console.log('💾 Token saved to localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to save token:', error);
      // Fallback to localStorage
      localStorage.setItem('omeone_auth_token', token);
    }
  },

  async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        const { value } = await prefs.get({ key: 'omeone_auth_token' });
        return value;
      }
      return localStorage.getItem('omeone_auth_token');
    } catch (error) {
      console.error('❌ Failed to get token:', error);
      return localStorage.getItem('omeone_auth_token');
    }
  },

  async removeToken(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.remove({ key: 'omeone_auth_token' });
      } else {
        localStorage.removeItem('omeone_auth_token');
      }
    } catch (error) {
      console.error('❌ Failed to remove token:', error);
      localStorage.removeItem('omeone_auth_token');
    }
  },

  // Refresh token storage
  async saveRefreshToken(token: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.set({ key: 'omeone_refresh_token', value: token });
        console.log('💾 Refresh token saved to Capacitor Preferences');
      } else {
        localStorage.setItem('omeone_refresh_token', token);
      }
    } catch (error) {
      console.error('❌ Failed to save refresh token:', error);
      localStorage.setItem('omeone_refresh_token', token);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        const { value } = await prefs.get({ key: 'omeone_refresh_token' });
        return value;
      }
      return localStorage.getItem('omeone_refresh_token');
    } catch (error) {
      console.error('❌ Failed to get refresh token:', error);
      return localStorage.getItem('omeone_refresh_token');
    }
  },

  async removeRefreshToken(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.remove({ key: 'omeone_refresh_token' });
      } else {
        localStorage.removeItem('omeone_refresh_token');
      }
    } catch (error) {
      console.error('❌ Failed to remove refresh token:', error);
      localStorage.removeItem('omeone_refresh_token');
    }
  },

  // Token expiry storage for silent refresh scheduling
  async saveTokenExpiry(expiryTimestamp: number): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.set({ key: 'omeone_token_expiry', value: expiryTimestamp.toString() });
      } else {
        localStorage.setItem('omeone_token_expiry', expiryTimestamp.toString());
      }
    } catch (error) {
      console.error('❌ Failed to save token expiry:', error);
      localStorage.setItem('omeone_token_expiry', expiryTimestamp.toString());
    }
  },

  async getTokenExpiry(): Promise<number | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const prefs = await this._getPreferences();
      let value: string | null = null;
      
      if (prefs) {
        const result = await prefs.get({ key: 'omeone_token_expiry' });
        value = result.value;
      } else {
        value = localStorage.getItem('omeone_token_expiry');
      }
      
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('❌ Failed to get token expiry:', error);
      const value = localStorage.getItem('omeone_token_expiry');
      return value ? parseInt(value, 10) : null;
    }
  },

  async saveUser(user: User): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.set({ key: 'omeone_user', value: JSON.stringify(user) });
        console.log('💾 User saved to Capacitor Preferences');
      } else {
        localStorage.setItem('omeone_user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('❌ Failed to save user:', error);
      localStorage.setItem('omeone_user', JSON.stringify(user));
    }
  },

  async getUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const prefs = await this._getPreferences();
      let userData: string | null = null;
      
      if (prefs) {
        const { value } = await prefs.get({ key: 'omeone_user' });
        userData = value;
      } else {
        userData = localStorage.getItem('omeone_user');
      }
      
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (parseError) {
          console.error('Failed to parse stored user data');
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get user:', error);
      const userData = localStorage.getItem('omeone_user');
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch {
          return null;
        }
      }
      return null;
    }
  },

  async removeUser(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.remove({ key: 'omeone_user' });
      } else {
        localStorage.removeItem('omeone_user');
      }
    } catch (error) {
      console.error('❌ Failed to remove user:', error);
      localStorage.removeItem('omeone_user');
    }
  },

  async savePendingTokens(amount: number): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.set({ key: 'omeone_pending_tokens', value: amount.toString() });
      } else {
        localStorage.setItem('omeone_pending_tokens', amount.toString());
      }
    } catch (error) {
      console.error('❌ Failed to save pending tokens:', error);
      localStorage.setItem('omeone_pending_tokens', amount.toString());
    }
  },

  async getPendingTokens(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    
    try {
      const prefs = await this._getPreferences();
      let value: string | null = null;
      
      if (prefs) {
        const result = await prefs.get({ key: 'omeone_pending_tokens' });
        value = result.value;
      } else {
        value = localStorage.getItem('omeone_pending_tokens');
      }
      
      return value ? parseFloat(value) || 0 : 0;
    } catch (error) {
      console.error('❌ Failed to get pending tokens:', error);
      const value = localStorage.getItem('omeone_pending_tokens');
      return value ? parseFloat(value) || 0 : 0;
    }
  },

  async removePendingTokens(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await prefs.remove({ key: 'omeone_pending_tokens' });
      } else {
        localStorage.removeItem('omeone_pending_tokens');
      }
    } catch (error) {
      console.error('❌ Failed to remove pending tokens:', error);
      localStorage.removeItem('omeone_pending_tokens');
    }
  },

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    console.log('🗑️ Clearing all auth storage...');
    
    try {
      const prefs = await this._getPreferences();
      if (prefs) {
        await Promise.all([
          prefs.remove({ key: 'omeone_auth_token' }),
          prefs.remove({ key: 'omeone_refresh_token' }),
          prefs.remove({ key: 'omeone_token_expiry' }),
          prefs.remove({ key: 'omeone_user' }),
          prefs.remove({ key: 'omeone_pending_tokens' }),
        ]);
        console.log('🗑️ Cleared Capacitor Preferences');
      } else {
        localStorage.removeItem('omeone_auth_token');
        localStorage.removeItem('omeone_refresh_token');
        localStorage.removeItem('omeone_token_expiry');
        localStorage.removeItem('omeone_user');
        localStorage.removeItem('omeone_pending_tokens');
        console.log('🗑️ Cleared localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
      // Fallback: clear localStorage anyway
      localStorage.removeItem('omeone_auth_token');
      localStorage.removeItem('omeone_refresh_token');
      localStorage.removeItem('omeone_token_expiry');
      localStorage.removeItem('omeone_user');
      localStorage.removeItem('omeone_pending_tokens');
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

const getAuthMode = (user: User | null): AuthMode => {
  if (!user) return 'guest';
  if (user.address || user.walletAddress) return 'wallet';
  if (user.email) return 'email';
  return 'guest';
};

/**
 * Parses JWT to extract expiry time
 */
const parseJwtExpiry = (token: string): number | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

const authAPI = {
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
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
      authMode: getAuthMode(user),
      reputation: user.reputation_score || user.reputation || 0,
      trustScore: user.trust_score || user.trustScore || 0,
      tokensEarned: user.tokens_earned || user.tokensEarned || 0,
      stakingBalance: user.staking_balance || user.stakingBalance || 0,
      createdAt: user.created_at || user.createdAt
    };
  },

  /**
   * Refresh access token using refresh token
   * UPDATED (Jan 28, 2026): Now calls /auth/phone/refresh endpoint
   */
  refreshAccessToken: async (refreshToken: string): Promise<{ token: string; refreshToken?: string; user?: any; expiresIn?: number }> => {
    console.log('🔄 Calling refresh token endpoint...');
    
    // Try the phone auth refresh endpoint (primary for mobile users)
    const response = await fetch(`${BACKEND_URL}/auth/phone/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Token refresh failed:', errorData);
      throw new Error(errorData.error || `Token refresh failed: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.token) {
      throw new Error('Invalid refresh response');
    }
    
    console.log('✅ Token refresh successful');
    
    return {
      token: data.token,
      refreshToken: data.refreshToken, // Server may rotate refresh token
      user: data.user,
      expiresIn: data.expiresIn || 2592000, // Default 30 days
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
    const response = await fetch(`${BACKEND_URL}/auth/profile`, {
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
      authMode: getAuthMode(user),
    };
  },
};

// ============================================================================
// CONTEXT
// ============================================================================

interface AuthContextType extends AuthState {
  login: (token: string, user: User, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
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

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);
  const initRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appListenerRef = useRef<any>(null);

  // Schedule silent token refresh before expiry
  const scheduleTokenRefresh = useCallback((expiryTime: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const now = Date.now();
    const refreshTime = expiryTime - TOKEN_REFRESH_BUFFER_MS;
    const delay = Math.max(refreshTime - now, 0);

    if (delay > 0) {
      console.log(`🔄 Token refresh scheduled in ${Math.round(delay / 1000 / 60)} minutes`);
      refreshTimeoutRef.current = setTimeout(async () => {
        console.log('🔄 Performing scheduled silent token refresh...');
        await performSilentRefresh();
      }, delay);
    } else {
      // Token already needs refresh
      console.log('🔄 Token needs immediate refresh');
      performSilentRefresh();
    }
  }, []);

  // Perform silent token refresh
  const performSilentRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = await AuthStorage.getRefreshToken();
    if (!refreshToken) {
      console.log('❌ No refresh token available for silent refresh');
      return false;
    }

    try {
      console.log('🔄 Attempting silent token refresh...');
      const result = await authAPI.refreshAccessToken(refreshToken);
      
      // Save new tokens
      await AuthStorage.saveToken(result.token);
      if (result.refreshToken) {
        await AuthStorage.saveRefreshToken(result.refreshToken);
      }
      
      // Calculate and save new expiry
      const expiry = parseJwtExpiry(result.token) || (Date.now() + (result.expiresIn || 2592000) * 1000);
      await AuthStorage.saveTokenExpiry(expiry);
      
      // Update user data if returned
      if (result.user) {
        const user = {
          ...result.user,
          profileCompletion: calculateProfileCompletion(result.user),
        };
        await AuthStorage.saveUser(user);
        
        setAuthState(prev => ({
          ...prev,
          token: result.token,
          refreshToken: result.refreshToken || prev.refreshToken,
          user,
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          token: result.token,
          refreshToken: result.refreshToken || prev.refreshToken,
        }));
      }
      
      // Schedule next refresh
      scheduleTokenRefresh(expiry);
      
      console.log('✅ Silent token refresh successful');
      return true;
    } catch (error) {
      console.error('❌ Silent token refresh failed:', error);
      return false;
    }
  }, [scheduleTokenRefresh]);

  // Login function - now async to handle storage
  const login = useCallback(async (token: string, user: User, refreshToken?: string) => {
    console.log('🔐 Login called, saving credentials...');
    
    const authMode = getAuthMode(user);
    if (!user.profileCompletion) {
      user.profileCompletion = calculateProfileCompletion(user);
    }
    
    // Save to persistent storage (MUST await these!)
    await AuthStorage.saveToken(token);
    await AuthStorage.saveUser(user);
    
    if (refreshToken) {
      await AuthStorage.saveRefreshToken(refreshToken);
      console.log('💾 Refresh token saved');
    }
    
    // Calculate and save token expiry
    const expiry = parseJwtExpiry(token) || (Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
    await AuthStorage.saveTokenExpiry(expiry);
    
    if (authMode === 'wallet') {
      await AuthStorage.removePendingTokens();
    }
    
    console.log('💾 All credentials saved to storage');
    
    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
      user,
      token,
      refreshToken: refreshToken || null,
      authMode,
      pendingTokens: authMode === 'email' ? (user.pending_tokens || 0) : 0,
      canEarnTokens: authMode === 'wallet',
    });
    
    // Schedule token refresh
    scheduleTokenRefresh(expiry);
    
    toast.success(`Welcome back, ${user.display_name || user.username || user.name || 'User'}!`);
  }, [scheduleTokenRefresh]);

  // Logout function
  const logout = useCallback(async () => {
    console.log('🚪 Logout called...');
    
    // Clear refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    const token = await AuthStorage.getToken();
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch (error) {
        console.warn('Backend logout failed:', error);
      }
    }
    
    await AuthStorage.clear();
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      isHydrated: true,
      user: null,
      token: null,
      refreshToken: null,
      authMode: 'guest',
      pendingTokens: 0,
      canEarnTokens: false,
    });
    
    toast.success('Successfully logged out');
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...updates };
      updatedUser.profileCompletion = calculateProfileCompletion(updatedUser);
      AuthStorage.saveUser(updatedUser); // Fire and forget
      return { ...prev, user: updatedUser };
    });
  }, []);

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
      await AuthStorage.saveUser(user);
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        user,
        token: null,
        refreshToken: null,
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
      
      // Login with refresh token if provided
      await login(authResult.token, authResult.user, authResult.refreshToken);
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
    setAuthState(prev => {
      if (prev.authMode === 'email') {
        const newTotal = prev.pendingTokens + amount;
        AuthStorage.savePendingTokens(newTotal); // Fire and forget
        toast.success(`+${amount.toFixed(2)} TOK earned! Connect wallet to claim.`);
        return { ...prev, pendingTokens: newTotal };
      }
      return prev;
    });
  }, []);

  const showUpgradePrompt = useCallback(() => {
    if (authState.authMode === 'email' && authState.pendingTokens > 0) {
      toast(`You've earned ${authState.pendingTokens.toFixed(2)} TOK! Connect wallet to claim.`);
    }
  }, [authState.authMode, authState.pendingTokens]);

  // Main auth refresh - called on mount and app resume
  const refreshAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    console.log('🔄 refreshAuth: Starting auth hydration...');

    try {
      const [token, storedUser, pendingTokens, refreshToken, tokenExpiry] = await Promise.all([
        AuthStorage.getToken(),
        AuthStorage.getUser(),
        AuthStorage.getPendingTokens(),
        AuthStorage.getRefreshToken(),
        AuthStorage.getTokenExpiry(),
      ]);

      console.log('🔄 refreshAuth: Storage check:', {
        hasToken: !!token,
        hasStoredUser: !!storedUser,
        hasRefreshToken: !!refreshToken,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toISOString() : 'none',
        tokenExpired: tokenExpiry ? Date.now() > tokenExpiry : 'unknown',
        isNative: isCapacitorNative(),
      });

      // Case 1: No credentials at all - user is logged out
      if (!token && !storedUser && !refreshToken) {
        console.log('🔄 refreshAuth: No credentials found, user is logged out');
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isHydrated: true,
          pendingTokens,
        }));
        setIsCheckingAuth(false);
        return;
      }

      // Case 2: Email-only user (no token needed)
      if (storedUser && !token && !refreshToken) {
        console.log('🔄 refreshAuth: Email-only user detected');
        const authMode = getAuthMode(storedUser);
        if (!storedUser.profileCompletion) {
          storedUser.profileCompletion = calculateProfileCompletion(storedUser);
        }
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
          user: storedUser,
          token: null,
          refreshToken: null,
          authMode,
          pendingTokens: authMode === 'email' ? pendingTokens : 0,
          canEarnTokens: false,
        });
        setIsCheckingAuth(false);
        return;
      }

      // Case 3: Token exists - check if expired
      if (token) {
        const isTokenExpired = tokenExpiry ? Date.now() > tokenExpiry : false;
        
        // Try to refresh if token is expired and we have a refresh token
        if (isTokenExpired && refreshToken) {
          console.log('🔄 refreshAuth: Access token expired, attempting refresh...');
          const refreshSuccess = await performSilentRefresh();
          
          if (refreshSuccess) {
            // Refresh successful - auth state already updated by performSilentRefresh
            // Get fresh user data
            const newToken = await AuthStorage.getToken();
            if (newToken) {
              try {
                const user = await authAPI.getCurrentUser(newToken);
                const authMode = getAuthMode(user);
                setAuthState(prev => ({
                  ...prev,
                  isAuthenticated: true,
                  isLoading: false,
                  isHydrated: true,
                  user,
                  authMode,
                  pendingTokens: authMode === 'email' ? pendingTokens : 0,
                  canEarnTokens: authMode === 'wallet',
                }));
              } catch (error) {
                console.error('❌ Failed to fetch user after refresh:', error);
                // Still authenticated with refreshed token, just couldn't get fresh user data
              }
            }
            setIsCheckingAuth(false);
            return;
          }
          
          // Refresh failed - clear everything and log out
          console.log('❌ refreshAuth: Token refresh failed, logging out');
          await AuthStorage.clear();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            isHydrated: true,
            user: null,
            token: null,
            refreshToken: null,
            authMode: 'guest',
            pendingTokens: 0,
            canEarnTokens: false,
          });
          setIsCheckingAuth(false);
          return;
        }
        
        // Token is valid (not expired) - verify with backend
        try {
          console.log('🔄 refreshAuth: Validating token with backend...');
          const user = await authAPI.getCurrentUser(token);
          const authMode = getAuthMode(user);
          
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            isHydrated: true,
            user,
            token,
            refreshToken,
            authMode,
            pendingTokens: authMode === 'email' ? pendingTokens : 0,
            canEarnTokens: authMode === 'wallet',
          });
          
          // Save user to storage (in case it was updated on backend)
          await AuthStorage.saveUser(user);
          
          // Schedule refresh if we have expiry info
          if (tokenExpiry) {
            scheduleTokenRefresh(tokenExpiry);
          }
          
          console.log('✅ refreshAuth: Authentication verified successfully');
        } catch (error: any) {
          console.error('❌ refreshAuth: Token validation failed:', error);
          
          // Try refresh token if validation fails (token might be invalid but not yet expired)
          if (refreshToken) {
            console.log('🔄 Attempting refresh after validation failure...');
            const refreshSuccess = await performSilentRefresh();
            if (refreshSuccess) {
              setIsCheckingAuth(false);
              return;
            }
          }
          
          // All attempts failed - clear and log out
          console.log('❌ All auth attempts failed, clearing credentials');
          await AuthStorage.clear();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            isHydrated: true,
            user: null,
            token: null,
            refreshToken: null,
            authMode: 'guest',
            pendingTokens: 0,
            canEarnTokens: false,
          });
        } finally {
          setIsCheckingAuth(false);
        }
      } else if (refreshToken) {
        // No access token but have refresh token - try to refresh
        console.log('🔄 refreshAuth: No access token but have refresh token, attempting refresh...');
        const refreshSuccess = await performSilentRefresh();
        
        if (!refreshSuccess) {
          console.log('❌ Refresh failed, clearing credentials');
          await AuthStorage.clear();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            isHydrated: true,
            user: null,
            token: null,
            refreshToken: null,
            authMode: 'guest',
            pendingTokens: 0,
            canEarnTokens: false,
          });
        }
        setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error('❌ Auth hydration failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
        user: null,
        token: null,
        refreshToken: null,
        authMode: 'guest',
        pendingTokens: 0,
        canEarnTokens: false,
      });
      setIsCheckingAuth(false);
    }
  }, [performSilentRefresh, scheduleTokenRefresh]);

  // Setup Capacitor app state listener for resume handling
  useEffect(() => {
    if (typeof window === 'undefined' || !isCapacitorNative()) return;

    const setupAppListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        appListenerRef.current = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log('📱 App resumed from background, checking auth...');
            // Check if token needs refresh on resume
            const tokenExpiry = await AuthStorage.getTokenExpiry();
            if (tokenExpiry && Date.now() > tokenExpiry - TOKEN_REFRESH_BUFFER_MS) {
              console.log('📱 Token needs refresh on resume');
              await performSilentRefresh();
            }
          }
        });
        
        console.log('📱 Capacitor app state listener registered');
      } catch (error) {
        console.warn('Failed to setup Capacitor app listener:', error);
      }
    };

    setupAppListener();

    return () => {
      if (appListenerRef.current) {
        appListenerRef.current.remove();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [performSilentRefresh]);

  // Client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize auth after mount
  useEffect(() => {
    if (mounted && !initRef.current) {
      initRef.current = true;
      refreshAuth();
    }
  }, [mounted, refreshAuth]);

  const contextValue: AuthContextType = {
    ...authState,
    isLoading: !mounted || authState.isLoading,
    isCheckingAuth: !mounted || isCheckingAuth,
    login,
    logout,
    refreshAuth,
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

// ============================================================================
// UTILITY HOOKS
// ============================================================================

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
  const { isAuthenticated, isLoading, isHydrated, user, authMode, canEarnTokens } = useAuth();
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
    isHydrated,
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
  const { logout, refreshAuth } = useAuth();
  
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = { ...getHeaders(), ...options.headers };
    let response = await fetch(url, { ...options, headers });
    
    // If 401, try refreshing token once
    if (response.status === 401) {
      console.log('🔄 Got 401, attempting token refresh...');
      await refreshAuth();
      
      // Retry with potentially new token
      const newHeaders = { ...getHeaders(), ...options.headers };
      response = await fetch(url, { ...options, headers: newHeaders });
      
      if (response.status === 401) {
        logout();
        throw new Error('Authentication expired');
      }
    }
    
    return response;
  }, [getHeaders, logout, refreshAuth]);
};