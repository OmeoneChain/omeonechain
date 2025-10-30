'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import supabase from '@/lib/supabase';

// Types for authentication states
export type AuthMode = 'guest' | 'email' | 'wallet';

export interface User {
  id: string;
  wallet_address?: string;
  username?: string;
  email?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location_city?: string;
  location_country?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
  created_at?: string;
  authMode: AuthMode;
  // Computed fields
  profileCompletion?: number;
  reputation?: number;
  trustScore?: number;
  tokensEarned?: number;
  stakingBalance?: number;
  // Compatibility fields
  name?: string;
  avatar?: string;
  address?: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  authMode: AuthMode;
  pendingTokens: number;
  canEarnTokens: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token?: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_PENDING_TOKENS'; payload: number };

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
  if ((user.reputation || 0) > 0) score += 15;
  if ((user.trustScore || 0) > 0) score += 15;
  
  // Verification (10 points)
  if (user.authMode === 'wallet') score += 10;
  
  return Math.min(score, 100);
};

// Auth context
interface AuthContextType extends AuthState {
  login: (user: User, token?: string) => void;
  logout: () => void;
  connectWallet: (onSuccess?: () => void) => void;
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (profileData: any) => Promise<void>;
  addPendingTokens: (amount: number) => void;
  refreshProfileCompletion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'LOGIN_SUCCESS':
      const userWithCompletion = {
        ...action.payload.user,
        profileCompletion: calculateProfileCompletion(action.payload.user),
        // Add compatibility fields
        name: action.payload.user.display_name || action.payload.user.username,
        avatar: action.payload.user.avatar_url,
        address: action.payload.user.wallet_address
      };
      
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: userWithCompletion,
        token: action.payload.token || null,
        authMode: action.payload.user.authMode,
        canEarnTokens: action.payload.user.authMode === 'wallet',
        pendingTokens: action.payload.user.authMode === 'email' ? state.pendingTokens : 0
      };
    
    case 'LOGOUT':
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('pending_tokens');
      
      return {
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        authMode: 'guest',
        pendingTokens: 0,
        canEarnTokens: false
      };
    
    case 'UPDATE_USER':
      if (!state.user) return state;
      
      const updatedUser = { ...state.user, ...action.payload };
      const newCompletion = calculateProfileCompletion(updatedUser);
      updatedUser.profileCompletion = newCompletion;
      
      // Update localStorage
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      return {
        ...state,
        user: updatedUser
      };
    
    case 'SET_PENDING_TOKENS':
      const pendingTokens = action.payload;
      localStorage.setItem('pending_tokens', pendingTokens.toString());
      return { ...state, pendingTokens };
    
    default:
      return state;
  }
};

// Initial state
const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  authMode: 'guest',
  pendingTokens: 0,
  canEarnTokens: false
};

// Wallet connection service (simplified)
const WalletService = {
  async connectMetaMask(): Promise<{ address: string }> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const address = accounts[0];
      console.log('✅ MetaMask connected:', address);
      
      return { address };
    } catch (error: any) {
      console.error('❌ MetaMask connection failed:', error);
      throw new Error(`MetaMask connection failed: ${error.message}`);
    }
  }
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔄 Initializing auth state...');
        
        const userData = localStorage.getItem('user_data');
        const pendingTokens = localStorage.getItem('pending_tokens');

        if (pendingTokens) {
          dispatch({ type: 'SET_PENDING_TOKENS', payload: parseFloat(pendingTokens) || 0 });
        }

        if (userData) {
          const user = JSON.parse(userData);
          console.log('📱 Found stored user data:', user);
          
          // If this is a wallet user, verify they still exist in Supabase
          if (user.wallet_address || user.address) {
            const walletAddress = user.wallet_address || user.address;
            const freshUser = await SupabaseUserService.getUserByWalletAddress(walletAddress);
            
            if (freshUser) {
              console.log('✅ User verified in Supabase, updating with fresh data');
              dispatch({ type: 'LOGIN_SUCCESS', payload: { user: freshUser } });
            } else {
              console.log('⚠️ User not found in Supabase, clearing local data');
              localStorage.removeItem('user_data');
            }
          } else {
            // Email user or legacy data
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        // Clear corrupted data
        localStorage.removeItem('user_data');
        localStorage.removeItem('pending_tokens');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  // Auth methods
  const login = (user: User, token?: string) => {
    localStorage.setItem('user_data', JSON.stringify(user));
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const loginWithEmail = async (email: string, name?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // For demo purposes, create local email account
      const emailUser: User = {
        id: `email_${Date.now()}`,
        email,
        username: email.split('@')[0],
        display_name: name || email.split('@')[0],
        authMode: 'email',
        verification_status: 'basic',
        created_at: new Date().toISOString()
      };
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: emailUser } });
      
      toast.success('Account created! Connect a wallet to start earning tokens.');
    } catch (error: any) {
      toast.error(`Email login failed: ${error.message}`);
      throw error;
    }
  };

  const connectWallet = async (onSuccess?: () => void) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Connect to MetaMask
      const walletInfo = await WalletService.connectMetaMask();
      
      // Check if user exists in Supabase
      let user = await SupabaseUserService.getUserByWalletAddress(walletInfo.address);
      
      if (!user) {
        // Create new user
        user = await SupabaseUserService.createUser(walletInfo.address);
        toast.success('Welcome! Your account has been created.');
      } else {
        toast.success(`Welcome back, ${user.display_name || user.username}!`);
      }

      // Log in the user
      login(user);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      toast.error(`Wallet connection failed: ${error.message}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateUser = (updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const updateProfile = async (profileData: any) => {
    try {
      if (!state.user) {
        throw new Error('No user logged in');
      }

      // Update profile in Supabase
      const updatedUser = await SupabaseUserService.updateUserProfile(state.user.id, profileData);
      
      // Update the user in state with the response data
      const userUpdates = {
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
        location_city: updatedUser.location_city,
        location_country: updatedUser.location_country,
        avatar_url: updatedUser.avatar_url,
        // Update compatibility fields
        name: updatedUser.display_name || updatedUser.username,
        avatar: updatedUser.avatar_url
      };

      dispatch({ type: 'UPDATE_USER', payload: userUpdates });
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  };

  const addPendingTokens = (amount: number) => {
    if (state.authMode === 'email') {
      const newTotal = state.pendingTokens + amount;
      dispatch({ type: 'SET_PENDING_TOKENS', payload: newTotal });
      
      toast.success(`+${amount.toFixed(2)} TOK earned! Connect wallet to claim.`, {
        duration: 3000,
      });
    }
  };

  const refreshProfileCompletion = () => {
    if (state.user) {
      const newCompletion = calculateProfileCompletion(state.user);
      dispatch({ type: 'UPDATE_USER', payload: { profileCompletion: newCompletion } });
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    connectWallet,
    loginWithEmail,
    updateUser,
    updateProfile,
    addPendingTokens,
    refreshProfileCompletion
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hook for auth checks
export const useAuthGuard = () => {
  const { isAuthenticated, authMode, user } = useAuth();
  
  const requireAuth = (action: string = 'perform this action') => {
    if (!isAuthenticated) {
      toast.error(`Please sign in to ${action}`);
      return false;
    }
    return true;
  };
  
  const requireWallet = (action: string = 'earn tokens') => {
    if (authMode !== 'wallet') {
      toast.error(`Connect your wallet to ${action}`);
      return false;
    }
    return true;
  };
  
  return {
    requireAuth,
    requireWallet,
    isAuthenticated,
    canEarnTokens: authMode === 'wallet',
    user
  };
};

// NEW: Hook for getting authenticated API headers
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

// NEW: Hook for making authenticated API calls
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