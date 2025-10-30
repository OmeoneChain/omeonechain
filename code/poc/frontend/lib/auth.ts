// code/poc/frontend/lib/auth.ts
// FIXED VERSION: Enhanced with comprehensive debugging and null safety

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

  // Connect to MetaMask - FIXED with comprehensive null safety
  static async connectMetaMask(): Promise<WalletInfo> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask not found. Please install MetaMask browser extension.');
    }

    try {
      const ethereum = (window as any).ethereum;
      
      console.log('🔌 WalletManager: Starting MetaMask connection...');
      
      // Request account access
      const addresses = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      console.log('🔌 WalletManager: Received addresses:', addresses);
      console.log('🔌 WalletManager: Addresses type:', typeof addresses);
      console.log('🔌 WalletManager: Is array:', Array.isArray(addresses));
      console.log('🔌 WalletManager: Length:', addresses?.length);
      console.log('🔌 WalletManager: First address:', addresses?.[0]);
      console.log('🔌 WalletManager: First address type:', typeof addresses?.[0]);

      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const address = addresses[0];
      
      // CRITICAL: Check if address is actually a valid string before using it
      if (!address || typeof address !== 'string' || address.trim() === '') {
        console.error('❌ WalletManager: Invalid address received:', address);
        console.error('❌ WalletManager: Address type:', typeof address);
        console.error('❌ WalletManager: Address is null:', address === null);
        console.error('❌ WalletManager: Address is undefined:', address === undefined);
        throw new Error('Invalid address received from MetaMask. Please try reconnecting.');
      }
      
      // Clean and validate the address
      const cleanedAddress = address.trim();
      
      console.log('🔌 WalletManager: Cleaned address:', cleanedAddress);
      console.log('🔌 WalletManager: Cleaned address length:', cleanedAddress.length);
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(cleanedAddress)) {
        console.error('❌ WalletManager: Address format invalid:', cleanedAddress);
        console.error('❌ WalletManager: Address does not match Ethereum format');
        throw new Error('Invalid Ethereum address format received from MetaMask.');
      }
      
      console.log('✅ WalletManager: Valid address confirmed:', cleanedAddress);
      
      // Skip public key retrieval - it's deprecated and not needed
      console.log('🔌 WalletManager: Skipping deprecated eth_getEncryptionPublicKey');

      // Ensure address is lowercase before creating the object
      const lowercaseAddress = cleanedAddress.toLowerCase();
      console.log('🔌 WalletManager: Lowercase address:', lowercaseAddress);
      console.log('🔌 WalletManager: Lowercase address type:', typeof lowercaseAddress);
      console.log('🔌 WalletManager: Lowercase address length:', lowercaseAddress.length);

      const walletInfo: WalletInfo = {
        address: lowercaseAddress,
        publicKey: undefined,
        provider: 'metamask'
      };
      
      console.log('✅ WalletManager: Created wallet info object');
      console.log('✅ WalletManager: walletInfo.address:', walletInfo.address);
      console.log('✅ WalletManager: walletInfo.address type:', typeof walletInfo.address);
      console.log('✅ WalletManager: Returning wallet info');

      return walletInfo;
    } catch (error: any) {
      console.error('❌ WalletManager: Connection error:', error);
      console.error('❌ WalletManager: Error name:', error.name);
      console.error('❌ WalletManager: Error message:', error.message);
      console.error('❌ WalletManager: Error stack:', error.stack);
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
      console.log('✍️ WalletManager: Message length:', message.length);
      console.log('✍️ WalletManager: Address:', address);
      
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      console.log('✅ WalletManager: Signature received');
      console.log('✅ WalletManager: Signature type:', typeof signature);
      console.log('✅ WalletManager: Signature length:', signature?.length);

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

  // FIXED: Use backend port 3001 (where your Express server runs) WITHOUT extra /api suffix
  const defaultUrl = nextPublicUrl || reactAppUrl;
  
  // If no env var is set, detect Codespaces URL or use localhost
  if (!defaultUrl) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('github.dev') || hostname.includes('gitpod.io')) {
        // Extract Codespaces/Gitpod base and point to backend port
        const baseUrl = `${window.location.protocol}//${hostname.replace('-3000', '-3001')}`;
        console.log('🔗 lib/auth.ts: Detected Codespaces/Gitpod, using:', baseUrl);
        return baseUrl;
      }
    }
    console.log('🔗 lib/auth.ts: Using localhost:3001');
    return 'http://localhost:3001';
  }
  
  // FIXED: Ensure URL does NOT have /api suffix (we'll add it in the API calls)
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
      const fullUrl = `${this.baseURL}/api/auth/challenge`;
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
      console.log('🔐 lib/auth.ts: Challenge response ok:', response.ok);

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
      const fullUrl = `${this.baseURL}/api/auth/login`;
      console.log('🔐 lib/auth.ts: Verifying signature at:', fullUrl);
      console.log('🔐 lib/auth.ts: Parameters:', {
        walletAddress,
        signature: signature.substring(0, 20) + '...',
        challenge: challenge.substring(0, 50) + '...',
        timestamp,
        nonce
      });
      
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

// Add these methods to your AuthAPI class in lib/auth.ts
// (Insert after the verifySignature method)

/**
 * Email sign-up (creates email_basic tier account)
 */
async emailSignup(email: string, password: string, displayName?: string): Promise<AuthResponse> {
  try {
    console.log('📧 AuthAPI: Email sign-up request:', email);

    const response = await fetch(`${this.baseUrl}/api/auth/email-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        displayName
      }),
    });

    console.log('📧 AuthAPI: Sign-up response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Sign-up failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ AuthAPI: Email sign-up successful');

    return data;
  } catch (error) {
    console.error('❌ AuthAPI: Email sign-up error:', error);
    throw error;
  }
}

/**
 * Email login (for existing email users)
 */
async emailLogin(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('📧 AuthAPI: Email login request:', email);

    const response = await fetch(`${this.baseUrl}/api/auth/email-login`, {
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

    return data;
  } catch (error) {
    console.error('❌ AuthAPI: Email login error:', error);
    throw error;
  }
}

  // FIXED: Verify JWT token with correct endpoint
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