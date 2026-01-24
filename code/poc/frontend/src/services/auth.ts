// code/poc/frontend/src/services/auth.ts
// COMPREHENSIVE: Wallet auth + OAuth social login support
// FIXED: Updated localStorage keys to match useAuth hook

// Environment configuration
const getApiBaseUrl = (): string => {
  const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  const reactAppUrl = process.env.REACT_APP_API_URL;
  
  console.log('🔧 Auth Service Environment Check:', {
    NEXT_PUBLIC_API_URL: nextPublicUrl,
    REACT_APP_API_URL: reactAppUrl,
    NODE_ENV: process.env.NODE_ENV
  });

  const baseUrl = nextPublicUrl || reactAppUrl || 'https://omeonechain-production.up.railway.app/api';
  console.log('🔗 Auth Service using API URL:', baseUrl);
  
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface AuthChallenge {
  challenge: string;
  message: string;
}

export interface AuthVerification {
  token: string;
  user: {
    id: string;
    walletAddress: string;
    reputation?: any;
    tokenBalance?: number;
    stakingInfo?: any;
  };
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

export interface User {
  userId: string;
  email?: string;
  username?: string;
  walletAddress?: string;
  accountTier: 'email_basic' | 'wallet_full';
  authMethod: 'email' | 'wallet' | 'google' | 'instagram' | 'apple' | 'twitter';
}

// ==========================================
// MAIN AUTH SERVICE CLASS
// ==========================================

export class AuthService {
  private baseUrl: string;
  // FIXED: Updated to match useAuth hook's localStorage keys
  private static readonly TOKEN_KEY = 'omeone_auth_token';
  private static readonly USER_KEY = 'omeone_user';

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🔐 AuthService initialized with URL:', this.baseUrl);
  }

  // ==========================================
  // WALLET AUTHENTICATION (EXISTING)
  // ==========================================

  async getAuthChallenge(walletAddress: string): Promise<AuthChallenge> {
    const url = `${this.baseUrl}/auth/challenge`;
    console.log('🔐 Getting auth challenge from:', url);
    console.log('🔐 Wallet address:', walletAddress);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress
        })
      });

      console.log('🔐 Auth challenge response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('❌ Auth challenge error data:', errorData);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          const errorText = await response.text();
          console.error('❌ Raw error response:', errorText);
        }
        throw new Error(`Failed to get auth challenge: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('✅ Auth challenge received:', data);

      if (!data.success || !data.data) {
        throw new Error('Invalid auth challenge response format');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Auth challenge error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to ${url}. Please check if the backend server is running.`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during auth challenge');
    }
  }

  async verifyAuth(walletAddress: string, signature: string, message: string): Promise<AuthVerification> {
    const url = `${this.baseUrl}/auth/verify`;
    console.log('🔐 Verifying auth at:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          signature,
          message
        })
      });

      console.log('🔐 Auth verification response:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('❌ Auth verification error data:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Raw verification error response:', errorText);
        }
        throw new Error(`Failed to verify auth: ${errorMessage}`);
      }

      const data = await response.json();
      console.log('✅ Auth verification received:', data);

      if (!data.success || !data.data) {
        throw new Error('Invalid auth verification response format');
      }

      return data.data;
    } catch (error) {
      console.error('❌ Auth verification error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to ${url}. Please check if the backend server is running.`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during auth verification');
    }
  }

  // ==========================================
  // OAUTH SOCIAL LOGIN (NEW)
  // ==========================================

  /**
   * Handle OAuth callback from URL parameters
   * Call this on your landing page when component mounts
   */
  static handleOAuthCallback(): { success: boolean; error?: string } {
    if (typeof window === 'undefined') return { success: false };

    console.log('🔍 OAuth callback handler started');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);

    // Check hash instead of query params
    const hash = window.location.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);
  
    const authToken = params.get('auth_token');
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');

    console.log('🔍 Parsed OAuth params:', {
      hasToken: !!authToken,
      authSuccess,
      authError,
      tokenPreview: authToken?.substring(0, 20) + '...'
    });

    // Handle error
    if (authError) {
      console.error('❌ OAuth error:', authError);
      this.cleanupURL();
      return { success: false, error: authError };
    }

    // Handle success
    if (authToken && authSuccess === 'true') {
      console.log('✅ OAuth successful, storing token');
      
      try {
        // Store token
        this.setToken(authToken);
        console.log('💾 Token stored successfully');
        
        // Decode and store user info
        const user = this.decodeToken(authToken);
        this.setUser(user);
        console.log('👤 User info stored:', user);
        
        // Verify storage
        const storedToken = this.getToken();
        console.log('🔍 Verification - token retrieved:', storedToken?.substring(0, 20) + '...');
        
        // Clean URL
        this.cleanupURL();
        
        console.log('✅ OAuth callback processing complete');
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error processing token:', error);
        return { success: false, error: 'Failed to process authentication token' };
      }
    }

    console.log('⚠️ No valid OAuth data found in URL');
    return { success: false };
  }

  /**
   * Initiate Google OAuth flow
   */
  static loginWithGoogle(): void {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
                       'https://omeonechain-production.up.railway.app';
    console.log('🔵 Redirecting to Google OAuth:', `${backendUrl}/api/auth/social/google`);
    window.location.href = `${backendUrl}/api/auth/social/google`;
  }

  /**
   * Initiate Instagram OAuth flow
   */
  static loginWithInstagram(): void {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
                       'https://omeonechain-production.up.railway.app';
    console.log('📸 Redirecting to Instagram OAuth:', `${backendUrl}/api/auth/social/instagram`);
    window.location.href = `${backendUrl}/api/auth/social/instagram`;
  }

  /**
   * Initiate Apple Sign In flow
   */
  static loginWithApple(): void {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
                       'https://omeonechain-production.up.railway.app';
    console.log('🍎 Redirecting to Apple OAuth:', `${backendUrl}/api/auth/social/apple`);
    window.location.href = `${backendUrl}/api/auth/social/apple`;
  }

  /**
   * Initiate Twitter OAuth flow
   */
  static loginWithTwitter(): void {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
                       'https://omeonechain-production.up.railway.app';
    console.log('🐦 Redirecting to Twitter OAuth:', `${backendUrl}/api/auth/social/twitter`);
    window.location.href = `${backendUrl}/api/auth/social/twitter`;
  }

  // ==========================================
  // TOKEN & USER MANAGEMENT
  // ==========================================

  /**
   * Store auth token
   * FIXED: Now uses 'omeone_auth_token' to match useAuth hook
   */
  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('💾 Token stored with key:', this.TOKEN_KEY);
  }

  /**
   * Get stored auth token
   * FIXED: Now uses 'omeone_auth_token' to match useAuth hook
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Remove auth token
   */
  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Store user data
   * FIXED: Now uses 'omeone_user' to match useAuth hook
   */
  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    console.log('💾 User stored with key:', this.USER_KEY);
  }

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Remove user data
   */
  static removeUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      // Check if token is expired
      if (exp && Date.now() >= exp * 1000) {
        console.log('⚠️  Token expired');
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Invalid token:', error);
      return false;
    }
  }

  /**
   * Decode JWT token (client-side only, no verification)
   */
  static decodeToken(token: string): User {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
        walletAddress: payload.address || payload.walletAddress,
        accountTier: payload.accountTier || 'email_basic',
        authMethod: payload.authMethod || 'email'
      };
    } catch (error) {
      console.error('❌ Failed to decode token:', error);
      throw new Error('Invalid token format');
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    this.removeToken();
    this.removeUser();
    console.log('👋 User logged out');
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Clean up URL after OAuth callback
   */
  private static cleanupURL(): void {
    if (typeof window === 'undefined') return;
    console.log('🧹 Cleaning up URL hash');
    window.history.replaceState({}, '', window.location.pathname);
  }

  // ==========================================
  // HEALTH & TESTING (EXISTING)
  // ==========================================

  async checkConnection(): Promise<boolean> {
    try {
      const healthUrl = this.baseUrl.replace('/api', '') + '/health';
      console.log('🏥 Checking connection to:', healthUrl);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🏥 Health check result:', data);
        return data.status === 'healthy';
      } else {
        console.error('❌ Health check failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  async testEndpoints(): Promise<{
    health: boolean;
    challenge: boolean;
    apiBaseUrl: string;
  }> {
    console.log('🧪 Testing auth endpoints...');
    
    const health = await this.checkConnection();
    
    let challenge = false;
    try {
      await this.getAuthChallenge('0x0000000000000000000000000000000000000000');
      challenge = true;
    } catch (error) {
      console.log('🧪 Challenge endpoint test failed:', error instanceof Error ? error.message : 'Unknown error');
      challenge = false;
    }

    const results = {
      health,
      challenge,
      apiBaseUrl: this.baseUrl
    };

    console.log('🧪 Endpoint test results:', results);
    return results;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class as default for compatibility
export default AuthService;