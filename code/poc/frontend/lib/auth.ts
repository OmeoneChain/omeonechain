// code/poc/frontend/lib/auth.ts
// FIXED VERSION: Corrected API base URL configuration to prevent double /api/ issue

import { toast } from 'react-hot-toast';

// Types for authentication
export interface User {
  id: string;
  address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  verification_status?: 'basic' | 'verified' | 'expert';
  created_at?: string;
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
      
      // Request account access
      const addresses = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!addresses || addresses.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const address = addresses[0];
      
      // Get the public key if available (optional)
      let publicKey: string | undefined;
      try {
        publicKey = await ethereum.request({
          method: 'eth_getEncryptionPublicKey',
          params: [address]
        });
      } catch (error) {
        console.log('Could not get public key:', error);
      }

      return {
        address: address.toLowerCase(),
        publicKey,
        provider: 'metamask'
      };
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
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
      
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      return signature;
    } catch (error: any) {
      console.error('Message signing error:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  // Listen for account changes
  static onAccountsChanged(callback: (addresses: string[]) => void) {
    if (!this.isMetaMaskAvailable()) return;
    
    const ethereum = (window as any).ethereum;
    ethereum.on('accountsChanged', callback);
    
    // Return cleanup function
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
    
    // Return cleanup function
    return () => {
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener('chainChanged', callback);
      }
    };
  }
}

// FIXED: Corrected URL detection and API base configuration
const getApiBaseUrl = (): string => {
  // Try environment variables in order of preference
  const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  const reactAppUrl = process.env.REACT_APP_API_URL;
  
  console.log('🔧 lib/auth.ts Environment Check:', {
    NEXT_PUBLIC_API_URL: nextPublicUrl,
    REACT_APP_API_URL: reactAppUrl,
    NODE_ENV: process.env.NODE_ENV,
    window_location: typeof window !== 'undefined' ? window.location.href : 'SSR'
  });

  // FIXED: Use backend port 3001 (where your Express server runs) WITHOUT extra /api/v1 suffix
  const defaultUrl = nextPublicUrl || reactAppUrl;
  
  // If no env var is set, detect Codespaces URL or use localhost
  if (!defaultUrl) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('github.dev') || hostname.includes('gitpod.io')) {
        // Extract Codespaces/Gitpod base and point to backend port
        const baseUrl = `${window.location.protocol}//${hostname.replace('-3000', '-3001')}`;
        return baseUrl; // FIXED: Return base URL without /api/v1 suffix
      }
    }
    return 'http://localhost:3001'; // FIXED: Backend runs on 3001 without /api/v1 suffix
  }
  
  // FIXED: Ensure URL does NOT have /api/v1 suffix (we'll add it in the API calls)
  const baseUrl = defaultUrl.replace(/\/api.*$/, '');
  console.log('🔗 lib/auth.ts using API base URL:', baseUrl);
  
  return baseUrl;
};

// Authentication API client
export class AuthAPI {
  private static get baseURL() {
    return getApiBaseUrl();
  }

  // FIXED: Generate authentication challenge with correct endpoint
  static async getAuthChallenge(walletAddress: string): Promise<{ challenge: string; timestamp: number; nonce: string }> {
    try {
      const fullUrl = `${this.baseURL}/api/v1/auth/challenge`;
      console.log('🔐 lib/auth.ts: Getting auth challenge from:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // FIXED: Include credentials for CORS
        body: JSON.stringify({ walletAddress }), // FIXED: Match backend parameter name
      });

      console.log('🔐 lib/auth.ts: Challenge response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ lib/auth.ts: Challenge failed:', response.status, errorText);
        throw new Error(`Failed to get auth challenge: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ lib/auth.ts: Challenge data received:', data);
      
      // FIXED: Handle backend response format
      if (data.success) {
        return {
          challenge: data.challenge,
          timestamp: data.timestamp,
          nonce: data.nonce
        };
      } else {
        throw new Error(data.error || 'Invalid response format from auth challenge endpoint');
      }
    } catch (error: any) {
      console.error('❌ lib/auth.ts: Auth challenge error:', error);
      throw new Error(`Failed to get auth challenge: ${error.message}`);
    }
  }

  // FIXED: Verify signature with correct endpoint
  static async verifySignature(
    walletAddress: string, 
    signature: string, 
    challenge: string,
    timestamp?: number,
    nonce?: string
  ): Promise<{ token: string; user: User }> {
    try {
      const fullUrl = `${this.baseURL}/api/v1/auth/login`;
      console.log('🔐 lib/auth.ts: Verifying signature at:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // FIXED: Include credentials for CORS
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
      
      // FIXED: Handle backend response format
      if (data.success && data.token && data.user) {
        return {
          token: data.token,
          user: {
            id: data.user.id,
            address: data.user.walletAddress,
            display_name: data.user.pseudonym || `User ${data.user.walletAddress.slice(-4)}`,
            verification_status: 'basic',
            created_at: new Date().toISOString()
          }
        };
      } else {
        throw new Error(data.error || 'Invalid response format from auth verify endpoint');
      }
    } catch (error: any) {
      console.error('❌ lib/auth.ts: Signature verification error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // FIXED: Get current user info with correct endpoint
  static async getCurrentUser(token: string): Promise<User> {
    try {
      const fullUrl = `${this.baseURL}/api/v1/auth/me`;
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
      
      // FIXED: Handle backend response format
      if (data.success && data.user) {
        return {
          id: data.user.id,
          address: data.user.walletAddress,
          display_name: data.user.pseudonym || `User ${data.user.walletAddress.slice(-4)}`,
          verification_status: 'basic',
          created_at: data.user.created_at
        };
      } else {
        throw new Error(data.error || 'Invalid user data received');
      }
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  // FIXED: Verify JWT token with correct endpoint
  static async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const fullUrl = `${this.baseURL}/api/v1/auth/verify`;
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
            display_name: data.user.pseudonym || `User ${data.user.walletAddress.slice(-4)}`,
            verification_status: 'basic',
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

// FIXED: Utility functions to match backend challenge format
export const createAuthMessage = (challenge: string, walletAddress: string): string => {
  // This should match the challenge message format from your backend auth routes
  return challenge; // Backend already provides the complete formatted message
};

export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Generate a random challenge string (fallback - backend should handle this)
export const generateChallenge = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
};