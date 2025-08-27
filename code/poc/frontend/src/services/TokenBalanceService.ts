// File: frontend/src/services/TokenBalanceService.ts
// Real-time token balance service for IOTA Rebased testnet

import { IOTAService } from './IOTAService';

export interface TokenBalanceResult {
  balance: number;
  source: 'live' | 'mock' | 'error';
  lastUpdated: string;
  walletAddress: string;
  error?: string;
}

export interface TokenBalanceConfig {
  enableMock: boolean;
  mockBalance: number;
  refreshInterval: number; // milliseconds
  maxRetries: number;
}

export class TokenBalanceService {
  private iotaService: IOTAService;
  private config: TokenBalanceConfig;
  private cache = new Map<string, TokenBalanceResult>();
  private refreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<TokenBalanceConfig> = {}) {
    this.iotaService = new IOTAService();
    this.config = {
      enableMock: false, // Set to true to use mock data
      mockBalance: 15.75, // Fallback mock balance
      refreshInterval: 30000, // 30 seconds
      maxRetries: 3,
      ...config
    };
  }

  /**
   * 💰 Get real token balance from IOTA testnet
   */
  async getRealTokenBalance(walletAddress: string): Promise<TokenBalanceResult> {
    const cacheKey = walletAddress.toLowerCase();
    
    // Check cache first (if data is fresh)
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheFresh(cached)) {
      console.log('🔄 Using cached balance:', cached.balance);
      return cached;
    }

    // If mock mode is enabled, return mock data
    if (this.config.enableMock) {
      console.log('🔧 Mock mode enabled, returning mock balance');
      return this.createMockResult(walletAddress);
    }

    let retryCount = 0;
    while (retryCount < this.config.maxRetries) {
      try {
        console.log(`💰 Attempt ${retryCount + 1}: Getting real token balance for ${walletAddress}...`);
        
        // Call your existing IOTA service method
        const liveBalance = await this.iotaService.getLiveTokenBalance(walletAddress);
        
        const result: TokenBalanceResult = {
          balance: liveBalance,
          source: 'live',
          lastUpdated: new Date().toISOString(),
          walletAddress
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        
        // Set up auto-refresh
        this.scheduleRefresh(walletAddress);
        
        console.log(`✅ Live token balance retrieved: ${liveBalance} TOK`);
        return result;
        
      } catch (error) {
        retryCount++;
        console.warn(`⚠️ Attempt ${retryCount} failed:`, error.message);
        
        if (retryCount < this.config.maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount - 1);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }

    // All retries failed, return error result with fallback
    console.error(`❌ Failed to get live balance after ${this.config.maxRetries} attempts`);
    const errorResult: TokenBalanceResult = {
      balance: this.config.mockBalance, // Fallback to mock
      source: 'error',
      lastUpdated: new Date().toISOString(),
      walletAddress,
      error: `Failed after ${this.config.maxRetries} attempts`
    };

    this.cache.set(cacheKey, errorResult);
    return errorResult;
  }

  /**
   * 🔧 Toggle mock mode on/off
   */
  setMockMode(enabled: boolean, mockBalance?: number): void {
    this.config.enableMock = enabled;
    if (mockBalance !== undefined) {
      this.config.mockBalance = mockBalance;
    }
    
    // Clear cache when switching modes
    this.cache.clear();
    
    console.log(`🔄 Mock mode ${enabled ? 'enabled' : 'disabled'}${mockBalance ? ` with balance ${mockBalance} TOK` : ''}`);
  }

  /**
   * 📊 Get balance with detailed status info
   */
  async getBalanceWithStatus(walletAddress: string): Promise<{
    balance: number;
    status: {
      isLive: boolean;
      isMocked: boolean;
      hasError: boolean;
      lastUpdated: string;
      source: string;
      cacheStatus: 'fresh' | 'stale' | 'none';
    };
    error?: string;
  }> {
    const result = await this.getRealTokenBalance(walletAddress);
    const cached = this.cache.get(walletAddress.toLowerCase());
    
    return {
      balance: result.balance,
      status: {
        isLive: result.source === 'live',
        isMocked: result.source === 'mock' || this.config.enableMock,
        hasError: result.source === 'error',
        lastUpdated: result.lastUpdated,
        source: result.source,
        cacheStatus: cached ? (this.isCacheFresh(cached) ? 'fresh' : 'stale') : 'none'
      },
      error: result.error
    };
  }

  /**
   * 🔄 Force refresh balance (bypass cache)
   */
  async forceRefreshBalance(walletAddress: string): Promise<TokenBalanceResult> {
    const cacheKey = walletAddress.toLowerCase();
    
    // Remove from cache to force fresh fetch
    this.cache.delete(cacheKey);
    
    // Cancel any existing refresh timer
    const timer = this.refreshTimers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(cacheKey);
    }
    
    console.log('🔄 Force refreshing token balance...');
    return await this.getRealTokenBalance(walletAddress);
  }

  /**
   * 📈 Subscribe to balance updates
   */
  subscribeToBalanceUpdates(
    walletAddress: string, 
    callback: (balance: TokenBalanceResult) => void
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const balance = await this.getRealTokenBalance(walletAddress);
        callback(balance);
      } catch (error) {
        console.warn('Balance subscription error:', error);
      }
    }, this.config.refreshInterval);

    // Return unsubscribe function
    return () => clearInterval(intervalId);
  }

  /**
   * 🧹 Cleanup resources
   */
  cleanup(): void {
    // Clear all refresh timers
    this.refreshTimers.forEach((timer) => clearTimeout(timer));
    this.refreshTimers.clear();
    
    // Clear cache
    this.cache.clear();
    
    console.log('🧹 TokenBalanceService cleanup completed');
  }

  // ========== PRIVATE METHODS ==========

  private createMockResult(walletAddress: string): TokenBalanceResult {
    return {
      balance: this.config.mockBalance,
      source: 'mock',
      lastUpdated: new Date().toISOString(),
      walletAddress
    };
  }

  private isCacheFresh(cached: TokenBalanceResult): boolean {
    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
    return cacheAge < this.config.refreshInterval;
  }

  private scheduleRefresh(walletAddress: string): void {
    const cacheKey = walletAddress.toLowerCase();
    
    // Cancel existing timer
    const existingTimer = this.refreshTimers.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule new refresh
    const timer = setTimeout(() => {
      this.getRealTokenBalance(walletAddress).catch(error => {
        console.warn('Scheduled refresh failed:', error);
      });
    }, this.config.refreshInterval);
    
    this.refreshTimers.set(cacheKey, timer);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========== CONVENIENCE FUNCTIONS ==========

/**
 * 🎯 Quick function to get balance for your specific wallet
 */
export async function getMyTokenBalance(): Promise<number> {
  const service = new TokenBalanceService();
  const myWallet = '0xa48b350a23dd162ca38f45891030021f5bae61a620d8abba49166db3ddcdcf9d';
  
  try {
    const result = await service.getRealTokenBalance(myWallet);
    console.log(`💰 My current balance: ${result.balance} TOK (${result.source})`);
    return result.balance;
  } catch (error) {
    console.error('❌ Failed to get my balance:', error);
    return 0;
  }
}

/**
 * 🧪 Test function to compare real vs mock balance
 */
export async function testBalanceComparison(): Promise<void> {
  const service = new TokenBalanceService();
  const myWallet = '0xa48b350a23dd162ca38f45891030021f5bae61a620d8abba49166db3ddcdcf9d';
  
  console.log('🧪 Testing real vs mock balance...');
  
  // Test real balance
  console.log('\n1️⃣ Testing REAL balance:');
  service.setMockMode(false);
  const realResult = await service.getBalanceWithStatus(myWallet);
  
  // Test mock balance  
  console.log('\n2️⃣ Testing MOCK balance:');
  service.setMockMode(true, 15.75);
  const mockResult = await service.getBalanceWithStatus(myWallet);
  
  console.log('\n📊 COMPARISON RESULTS:');
  console.log(`Real Balance: ${realResult.balance} TOK (${realResult.status.source})`);
  console.log(`Mock Balance: ${mockResult.balance} TOK (${mockResult.status.source})`);
  console.log(`Difference: ${realResult.balance - mockResult.balance} TOK`);
  
  if (realResult.balance > mockResult.balance) {
    console.log('🎉 SUCCESS: Real balance is higher than mock - tokens are being minted!');
  } else if (realResult.balance === mockResult.balance) {
    console.log('🤔 SAME: Real and mock balance are equal - might be using fallback data');
  } else {
    console.log('⚠️ LOWER: Real balance is lower than mock - check if wallet has tokens');
  }
  
  service.cleanup();
}

// ========== USAGE EXAMPLES ==========

/*
// Example 1: Basic usage
const tokenService = new TokenBalanceService();
const balance = await tokenService.getRealTokenBalance('0xa48b...');
console.log(`Balance: ${balance.balance} TOK`);

// Example 2: With status info
const balanceWithStatus = await tokenService.getBalanceWithStatus('0xa48b...');
console.log(`Balance: ${balanceWithStatus.balance} TOK`);
console.log(`Is Live: ${balanceWithStatus.status.isLive}`);
console.log(`Source: ${balanceWithStatus.status.source}`);

// Example 3: Subscribe to updates
const unsubscribe = tokenService.subscribeToBalanceUpdates('0xa48b...', (balance) => {
  console.log(`Balance updated: ${balance.balance} TOK`);
});

// Example 4: Force refresh
const freshBalance = await tokenService.forceRefreshBalance('0xa48b...');

// Example 5: Toggle mock mode for testing
tokenService.setMockMode(true, 100); // Use 100 TOK as mock balance
tokenService.setMockMode(false); // Back to real balance

// Example 6: Quick test
const myBalance = await getMyTokenBalance();
*/