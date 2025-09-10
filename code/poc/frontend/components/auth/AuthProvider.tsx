'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Types for authentication states
export type AuthMode = 'guest' | 'email' | 'wallet';

export interface User {
  id: string;
  address?: string;
  email?: string;
  name?: string;
  avatar?: string;
  reputation?: number;
  trustScore?: number;
  tokensEarned?: number;
  stakingBalance?: number;
  createdAt?: string;
  authMode: AuthMode;
  // Profile completion and management fields
  profileCompletion?: number;
  username?: string;
  display_name?: string;
  bio?: string;
  location_city?: string;
  location_country?: string;
  avatar_url?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  authMode: AuthMode;
  pendingTokens: number; // Tokens they could earn if they upgrade
  canEarnTokens: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_PENDING_TOKENS'; payload: number }
  | { type: 'UPGRADE_TO_EMAIL'; payload: { email: string; name?: string } }
  | { type: 'UPGRADE_TO_WALLET'; payload: { address: string; token: string } }
  | { type: 'UPDATE_PROFILE_COMPLETION'; payload: number };

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
  // Following and followers would need additional API calls
  // For now, we'll give some points if they have any social activity
  if ((user.trustScore || 0) > 0) score += 15;
  
  // Verification (10 points)
  if (user.authMode === 'wallet') score += 10;
  
  return Math.min(score, 100);
};

// Auth context
interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  connectWallet: (onSuccess?: () => void) => void;
  loginWithEmail: (email: string, name?: string) => Promise<void>;
  upgradeToWallet: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (profileData: any) => Promise<void>;
  addPendingTokens: (amount: number) => void;
  showUpgradePrompt: () => void;
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
        profileCompletion: calculateProfileCompletion(action.payload.user)
      };
      
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: userWithCompletion,
        token: action.payload.token,
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
    
    case 'UPDATE_PROFILE_COMPLETION':
      if (!state.user) return state;
      
      return {
        ...state,
        user: {
          ...state.user,
          profileCompletion: action.payload
        }
      };
    
    case 'SET_PENDING_TOKENS':
      const pendingTokens = action.payload;
      localStorage.setItem('pending_tokens', pendingTokens.toString());
      return { ...state, pendingTokens };
    
    case 'UPGRADE_TO_EMAIL':
      const emailUser: User = {
        id: `email_${Date.now()}`,
        email: action.payload.email,
        name: action.payload.name || action.payload.email.split('@')[0],
        username: action.payload.email.split('@')[0],
        display_name: action.payload.name || action.payload.email.split('@')[0],
        authMode: 'email',
        reputation: 1.0,
        trustScore: 0,
        tokensEarned: 0,
        createdAt: new Date().toISOString(),
        verification_status: 'basic'
      };
      
      emailUser.profileCompletion = calculateProfileCompletion(emailUser);
      localStorage.setItem('user_data', JSON.stringify(emailUser));
      
      return {
        ...state,
        isAuthenticated: true,
        user: emailUser,
        authMode: 'email',
        canEarnTokens: false,
        isLoading: false
      };
    
    case 'UPGRADE_TO_WALLET':
      if (!state.user) return state;
      
      const upgradedUser: User = {
        ...state.user,
        address: action.payload.address,
        authMode: 'wallet',
        id: action.payload.address
      };
      
      upgradedUser.profileCompletion = calculateProfileCompletion(upgradedUser);
      
      localStorage.setItem('auth_token', action.payload.token);
      localStorage.setItem('user_data', JSON.stringify(upgradedUser));
      localStorage.removeItem('pending_tokens');
      
      return {
        ...state,
        user: upgradedUser,
        token: action.payload.token,
        authMode: 'wallet',
        canEarnTokens: true,
        pendingTokens: 0
      };
    
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

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        const pendingTokens = localStorage.getItem('pending_tokens');

        if (pendingTokens) {
          dispatch({ type: 'SET_PENDING_TOKENS', payload: parseFloat(pendingTokens) || 0 });
        }

        if (token && userData) {
          const user = JSON.parse(userData);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } else if (userData) {
          // Email-only user
          const user = JSON.parse(userData);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: '' } });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear corrupted data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('pending_tokens');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  // Auth methods
  const login = (user: User, token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
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
      // In production, this would call your API
      dispatch({ type: 'UPGRADE_TO_EMAIL', payload: { email, name } });
      
      toast.success('Account created! Connect a wallet to start earning tokens.');
    } catch (error: any) {
      toast.error(`Email login failed: ${error.message}`);
      throw error;
    }
  };

  const connectWallet = async (onSuccess?: () => void) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
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

      if (state.user && state.authMode === 'email') {
        // Upgrade existing email user to wallet
        dispatch({ 
          type: 'UPGRADE_TO_WALLET', 
          payload: { 
            address: walletInfo.address, 
            token: authResult.token 
          } 
        });
        
        toast.success(`Wallet connected! You can now earn the ${state.pendingTokens.toFixed(2)} TOK you've accumulated.`);
      } else {
        // New wallet user
        login(authResult.user, authResult.token);
        toast.success('Wallet connected successfully!');
      }
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Wallet connection failed: ${error.message}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const upgradeToWallet = async () => {
    return connectWallet();
  };

  const updateUser = (updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const updateProfile = async (profileData: any) => {
    try {
      if (!state.user) {
        throw new Error('No user logged in');
      }

      // Make API call to update profile
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update the user in state with the response data
      const userUpdates = {
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
        location_city: updatedUser.location_city,
        location_country: updatedUser.location_country,
        avatar_url: updatedUser.avatar_url
      };

      dispatch({ type: 'UPDATE_USER', payload: userUpdates });
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
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
      dispatch({ type: 'UPDATE_PROFILE_COMPLETION', payload: newCompletion });
    }
  };

  const showUpgradePrompt = () => {
    if (state.authMode === 'email' && state.pendingTokens > 0) {
      toast.custom(
        (t) => (
          <div className="bg-white border border-orange-200 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                🪙
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  You've earned {state.pendingTokens.toFixed(2)} TOK!
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  Connect your wallet to claim your tokens and start earning more.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      upgradeToWallet();
                    }}
                    className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 transition-colors"
                  >
                    Connect Wallet
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 8000, position: 'top-right' }
      );
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    connectWallet,
    loginWithEmail,
    upgradeToWallet,
    updateUser,
    updateProfile,
    addPendingTokens,
    showUpgradePrompt,
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
  const { isAuthenticated, authMode, user, showUpgradePrompt } = useAuth();
  
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
        (t) => (
          <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                🔗
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Wallet Required
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  Connect your wallet to {action}
                </p>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    showUpgradePrompt();
                  }}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
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