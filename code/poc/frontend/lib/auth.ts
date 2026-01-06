// code/poc/frontend/lib/auth.ts
// FIXED VERSION: Uses two-tier authentication endpoints

import { toast } from 'react-hot-toast';

// Types for authentication
export interface User {
  id: string;
  address?: string;
  email?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
  created_at?: string;
  // Two-tier fields
  onboarding_completed?: boolean;
  profileCompletion?: number;
  isNewUser?: boolean;
  accountTier?: string;
  authMethod?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

export interface WalletInfo {
  address: string;
  publicKey?: string;
  provider: 'metamask' | 'walletconnect' | 'coinbase' | 'manual';
}

// Wallet detection and connection utilities
export class WalletManager {
  // Check if MetaMask is available
  static isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).ethereum !== 'undefined' &&
           (window as any).ethereum.isMetaMask;
  }

  // Connect to MetaMask
  static async connectMetaMask(): Promise<WalletInfo> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask not found. Please install MetaMask browser extension.');
    }

    try {
      const ethereum = (window as any).ethereum;
      
      console.log('🔌 WalletManager: Starting MetaMask connection...');
      
      const addresses = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      console.log('🔌 WalletManager: Received addresses:', addresses);

      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const address = addresses[0];
      
      if (!address || typeof address !== 'string' || address.trim() === '') {
        throw new Error('Invalid address received from MetaMask.');
      }
      
      const cleanedAddress = address.trim();
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(cleanedAddress)) {
        throw new Error('Invalid Ethereum address format.');
      }
      
      const lowercaseAddress = cleanedAddress.toLowerCase();

      const walletInfo: WalletInfo = {
        address: lowercaseAddress,
        publicKey: undefined,
        provider: 'metamask'
      };

      return walletInfo;
    } catch (error: any) {
      console.error('❌ WalletManager: Connection error:', error);
      throw new Error(`Failed to connect MetaMask: ${error.message}`);
    }
  }

  // Sign a message with wallet
  static async signMessage(message: string, address: string): Promise<string> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask not available');
    }

    try {
      const ethereum = (window as any).ethereum;
      
      console.log('✍️ WalletManager: Signing message...');
      
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      console.log('✅ WalletManager: Signature received');

      return signature;
    } catch (error: any) {
      console.error('❌ WalletManager: Message signing error:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  // Listen for account changes
  static onAccountsChanged(callback: (addresses: string[]) => void) {
    if (!this.isMetaMaskAvailable()) return;
    
    const ethereum = (window as any).ethereum;
    ethereum.on('accountsChanged', callback);
    
    return () => {
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', callback);
      }
    };
  }

  // Listen for network changes
  static onChainChanged(callback: (chainId: string) => void) {
    if (!this.isMetaMaskAvailable()) return;
    
    const ethereum = (window as any).ethereum;
    ethereum.on('chainChanged', callback);
    
    return () => {
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener('chainChanged', callback);
      }
    };
  }
}

// API base URL configuration
const getApiBaseUrl = (): string => {
  const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  const reactAppUrl = process.env.REACT_APP_API_URL;
  
  console.log('🔧 lib/auth.ts Environment Check:', {
    NEXT_PUBLIC_API_URL: nextPublicUrl,
    REACT_APP_API_URL: reactAppUrl,
    NODE_ENV: process.env.NODE_ENV
  });

  const defaultUrl = nextPublicUrl || reactAppUrl;
  
  if (!defaultUrl) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('github.dev') || hostname.includes('gitpod.io')) {
        const baseUrl = `${window.location.protocol}//${hostname.replace('-3000', '-3001')}`;
        console.log('🔗 lib/auth.ts: Detected Codespaces/Gitpod, using:', baseUrl);
        return baseUrl;
      }
    }
    console.log('🔗 lib/auth.ts: Using localhost:3001');
    return 'http://localhost:3001';
  }
  
  const baseUrl = defaultUrl.replace(/\/api.*$/, '');
  console.log('🔗 lib/auth.ts using API base URL:', baseUrl);
  
  return baseUrl;
};

// Authentication API client
export class AuthAPI {
  private static get baseURL() {
    return getApiBaseUrl();
  }

  // ✅ FIXED: Generate authentication challenge using two-tier endpoint
  static async getAuthChallenge(walletAddress: string): Promise<{ challenge: string; timestamp: number; nonce: string }> {
    try {
      const fullUrl = `${this.baseURL}/api/auth/wallet/challenge`;  // ✅ Changed from /auth/challenge
      console.log('🔐 lib/auth.ts: Getting auth challenge from:', fullUrl);
      console.log('🔐 lib/auth.ts: Wallet address:', walletAddress);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ walletAddress }),
      });

      console.log('🔐 lib/auth.ts: Challenge response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ lib/auth.ts: Challenge failed:', response.status, errorText);
        throw new Error(`Failed to get auth challenge: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ lib/auth.ts: Challenge data received');
      
      if (data.success) {
        return {
          challenge: data.challenge,
          timestamp: data.timestamp,
          nonce: data.nonce
        };
      } else {
        throw new Error(data.error || 'Invalid response from auth challenge');
      }
    } catch (error: any) {
      console.error('❌ lib/auth.ts: Auth challenge error:', error);
      throw error;
    }
  }

  // ✅ FIXED: Verify signature using two-tier endpoint
  static async verifySignature(
    walletAddress: string, 
    signature: string, 
    challenge: string,
    timestamp?: number,
    nonce?: string
  ): Promise<{ token: string; user: User }> {
    try {
      const fullUrl = `${this.baseURL}/api/auth/wallet/verify`;  // ✅ Changed from /auth/login
      console.log('🔐 lib/auth.ts: Verifying signature at:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          walletAddress, 
          signature, 
          challenge,
          timestamp,
          nonce
        }),
      });

      console.log('🔐 lib/auth.ts: Verify response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('❌ lib/auth.ts: Verify failed:', errorData);
        throw new Error(`Authentication failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ lib/auth.ts: Verify data received:', data);
      
      // ✅ FIXED: Handle two-tier response format with all fields
      if (data.success && data.token && data.user) {
        return {
          token: data.token,
          user: {
            id: data.user.id,
            address: data.user.walletAddress,
            display_name: data.user.display_name,
            username: data.user.username,
            avatar_url: data.user.avatar_url,
            bio: data.user.bio,
            verification_status: data.user.verificationLevel || 'basic',
            created_at: data.user.createdAt,
            // ✅ Two-tier fields
            onboarding_completed: data.user.onboarding_completed,
            profileCompletion: data.user.profileCompletion,
            isNewUser: data.isNewUser,  // ✅ From top-level response
            accountTier: data.user.accountTier,
            authMethod: data.user.authMethod
          }
        };
      } else {
        throw new Error(data.error || 'Invalid response from authentication');
      }
    } catch (error: any) {
      console.error('❌ lib/auth.ts: Signature verification error:', error);
      throw error;
    }
  }

  // Get current user info
  static async getCurrentUser(token: string): Promise<User> {
    try {
      const fullUrl = `${this.baseURL}/api/auth/me`;
      console.log('🔍 lib/auth.ts: Getting current user from:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        return {
          id: data.user.id,
          address: data.user.walletAddress,
          email: data.user.email,
          display_name: data.user.display_name,
          username: data.user.username,
          avatar_url: data.user.avatar_url,
          verification_status: 'basic',
          created_at: data.user.created_at,
          // Two-tier fields
          onboarding_completed: data.user.onboarding_completed,
          profileCompletion: data.user.profileCompletion,
          accountTier: data.user.accountTier,
          authMethod: data.user.authMethod
        };
      } else {
        throw new Error(data.error || 'Invalid user data received');
      }
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // Email sign-up (two-tier endpoint)
  static async emailSignup(email: string, password: string, displayName?: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
    try {
      console.log('📧 AuthAPI: Email sign-up request:', email);

      const response = await fetch(`${this.baseURL}/api/auth/email/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName
        }),
      });

      console.log('📧 AuthAPI: Sign-up response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Sign-up failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AuthAPI: Email sign-up successful');

      return {
        token: data.token,
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          display_name: data.user.display_name,
          accountTier: data.user.accountTier,
          authMethod: data.user.authMethod,
          profileCompletion: data.user.profileCompletion,
          onboarding_completed: data.user.onboarding_completed
        },
        isNewUser: data.isNewUser
      };
    } catch (error) {
      console.error('❌ AuthAPI: Email sign-up error:', error);
      throw error;
    }
  }

  // Email login (two-tier endpoint)
  static async emailLogin(email: string, password: string): Promise<{ token: string; user: User; isNewUser: boolean }> {
    try {
      console.log('📧 AuthAPI: Email login request:', email);

      const response = await fetch(`${this.baseURL}/api/auth/email/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      console.log('📧 AuthAPI: Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ AuthAPI: Email login successful');

      return {
        token: data.token,
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          display_name: data.user.display_name,
          accountTier: data.user.accountTier,
          authMethod: data.user.authMethod,
          profileCompletion: data.user.profileCompletion,
          onboarding_completed: data.user.onboarding_completed
        },
        isNewUser: data.isNewUser
      };
    } catch (error) {
      console.error('❌ AuthAPI: Email login error:', error);
      throw error;
    }
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const fullUrl = `${this.baseURL}/api/auth/verify`;
      console.log('🔍 lib/auth.ts: Verifying token at:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();
      
      if (data.success && data.valid) {
        return {
          valid: true,
          user: data.user ? {
            id: data.user.id,
            address: data.user.walletAddress,
            email: data.user.email,
            display_name: data.user.display_name,
            username: data.user.username,
            verification_status: 'basic',
            accountTier: data.user.accountTier,
            authMethod: data.user.authMethod
          } : undefined
        };
      } else {
        return { valid: false };
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      return { valid: false };
    }
  }
}

// Local storage utilities
export class AuthStorage {
  private static TOKEN_KEY = 'omeone_auth_token';
  private static USER_KEY = 'omeone_user';

  static saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  static saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          this.removeUser();
        }
      }
    }
    return null;
  }

  static removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  static clear(): void {
    this.removeToken();
    this.removeUser();
  }
}

// Utility functions
export const createAuthMessage = (challenge: string, walletAddress: string): string => {
  return challenge;
};

export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const generateChallenge = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
};