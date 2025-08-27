// code/poc/frontend/src/services/auth.ts
// FIXED: Removed duplicate export to fix compile error

// CORRECTED: Read environment variables properly for Next.js
const getApiBaseUrl = (): string => {
  // Next.js environment variables
  const nextPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  const reactAppUrl = process.env.REACT_APP_API_URL;
  
  console.log('🔧 Auth Service Environment Check:', {
    NEXT_PUBLIC_API_URL: nextPublicUrl,
    REACT_APP_API_URL: reactAppUrl,
    NODE_ENV: process.env.NODE_ENV
  });

  const baseUrl = nextPublicUrl || reactAppUrl || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api';
  console.log('🔗 Auth Service using API URL:', baseUrl);
  
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

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

export class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🔐 AuthService initialized with URL:', this.baseUrl);
  }

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
      
      // Re-throw with more context
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
      
      // Re-throw with more context
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to ${url}. Please check if the backend server is running.`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during auth verification');
    }
  }

  // Health check method
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

  // Test the auth endpoints
  async testEndpoints(): Promise<{
    health: boolean;
    challenge: boolean;
    apiBaseUrl: string;
  }> {
    console.log('🧪 Testing auth endpoints...');
    
    const health = await this.checkConnection();
    
    let challenge = false;
    try {
      // Test with a dummy address
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

// FIXED: Removed duplicate export that was causing the compile error