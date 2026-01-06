// File: frontend/src/services/TokenBalanceService.ts
// UPDATED: Fetches token balance from backend API instead of IOTA contracts
// Real-time token balance service with 6 decimal precision + optimistic updates

import apiClient from './api';

export interface TokenBalanceResult {
  balance: number; // BOCA amount (not base units)
  displayBalance: string; // formatted for display
  escrowBalance: number; // amount in 7-day escrow (if applicable)
  availableBalance: number; // balance - escrow
  source: 'live' | 'mock' | 'error';
  lastUpdated: string;
  userId: string;
  error?: string;
}

export interface TokenBalanceConfig {
  enableMock: boolean;
  mockBalance: number;
  refreshInterval: number; // milliseconds
  maxRetries: number;
}

export class TokenBalanceService {
  private config: TokenBalanceConfig;
  private cache = new Map<string, TokenBalanceResult>();
  private refreshTimers = new Map<string, NodeJS.Timeout>();
  private listeners = new Set<(balance: number) => void>();
  
  // CRITICAL: Backend stores as BOCA (not base units)
  private readonly DECIMALS = 6;

  constructor(config: Partial<TokenBalanceConfig> = {}) {
    this.config = {
      enableMock: false,
      mockBalance: 1250, // 1250 BOCA
      refreshInterval: 30000, // 30 seconds
      maxRetries: 3,
      ...config
    };
    
    console.log('💰 TokenBalanceService initialized', {
      mockEnabled: this.config.enableMock,
      refreshInterval: this.config.refreshInterval
    });
  }

  /**
   * 💰 Get real token balance from backend
   */
  async getRealTokenBalance(userId: string): Promise<TokenBalanceResult> {
    const cacheKey = userId.toLowerCase();
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheFresh(cached)) {
      console.log('🔄 Using cached balance:', cached.displayBalance);
      return cached;
    }

    // If mock mode is enabled, return mock data
    if (this.config.enableMock) {
      console.log('🔧 Mock mode enabled, returning mock balance');
      return this.createMockResult(userId);
    }

    let retryCount = 0;
    while (retryCount < this.config.maxRetries) {
      try {
        console.log(`💰 Attempt ${retryCount + 1}: Getting real token balance for ${userId}...`);
        
        // Fetch user data from backend (includes tokens_earned)
        const response = await apiClient.get(`/users/${userId}`);

        if (!response.success || !response.user) {
          throw new Error('Failed to fetch user data');
        }

        const userData = response.user;
        const tokensEarned = userData.tokens_earned || 0;
        
        const result: TokenBalanceResult = {
          balance: tokensEarned, // Backend stores as BOCA directly
          displayBalance: this.formatDisplay(tokensEarned),
          escrowBalance: 0, // TODO: Add escrow support if needed
          availableBalance: tokensEarned,
          source: 'live',
          lastUpdated: new Date().toISOString(),
          userId
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        
        // Set up auto-refresh
        this.scheduleRefresh(userId);
        
        console.log(`✅ Live token balance retrieved: ${result.displayBalance}`);
        return result;
        
      } catch (error) {
        retryCount++;
        console.warn(`⚠️ Attempt ${retryCount} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (retryCount < this.config.maxRetries) {
          const waitTime = 1000 * Math.pow(2, retryCount - 1);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }

    // All retries failed
    console.error(`❌ Failed to get live balance after ${this.config.maxRetries} attempts`);
    const errorResult: TokenBalanceResult = {
      balance: this.config.mockBalance,
      displayBalance: this.formatDisplay(this.config.mockBalance),
      escrowBalance: 0,
      availableBalance: this.config.mockBalance,
      source: 'error',
      lastUpdated: new Date().toISOString(),
      userId,
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
    
    console.log(`🔄 Mock mode ${enabled ? 'enabled' : 'disabled'}${mockBalance ? ` with balance ${mockBalance} BOCA` : ''}`);
  }

  /**
   * 📊 Get balance with detailed status info
   */
  async getBalanceWithStatus(userId: string): Promise<{
    balance: number;
    displayBalance: string;
    escrowInfo: {
      amount: number;
      displayAmount: string;
      percentage: number;
    };
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
    const result = await this.getRealTokenBalance(userId);
    const cached = this.cache.get(userId.toLowerCase());
    
    const escrowPercentage = result.balance > 0 
      ? (result.escrowBalance / result.balance) * 100 
      : 0;

    return {
      balance: result.balance,
      displayBalance: result.displayBalance,
      escrowInfo: {
        amount: result.escrowBalance,
        displayAmount: this.formatDisplay(result.escrowBalance),
        percentage: escrowPercentage
      },
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
  async forceRefreshBalance(userId: string): Promise<TokenBalanceResult> {
    const cacheKey = userId.toLowerCase();
    
    // Remove from cache
    this.cache.delete(cacheKey);
    
    // Cancel existing refresh timer
    const timer = this.refreshTimers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(cacheKey);
    }
    
    console.log('🔄 Force refreshing token balance...');
    return await this.getRealTokenBalance(userId);
  }

  /**
   * 📈 Subscribe to balance updates
   */
  subscribeToBalanceUpdates(
    userId: string, 
    callback: (balance: TokenBalanceResult) => void
  ): () => void {
    console.log(`📡 Subscribing to balance updates for user: ${userId}`);
    
    const intervalId = setInterval(async () => {
      try {
        const balance = await this.getRealTokenBalance(userId);
        callback(balance);
      } catch (error) {
        console.warn('Balance subscription error:', error);
      }
    }, this.config.refreshInterval);

    // Return unsubscribe function
    return () => {
      console.log(`📡 Unsubscribing from balance updates for user: ${userId}`);
      clearInterval(intervalId);
    };
  }

  /**
   * 💸 Calculate reward amount in display format
   */
  calculateRewardAmount(
    baseReward: number,
    tierMultiplier: number
  ): {
    amount: number;
    displayAmount: string;
  } {
    const amount = baseReward * tierMultiplier;
    
    return {
      amount,
      displayAmount: this.formatDisplay(amount)
    };
  }

  /**
   * 📊 Get escrow status for user (placeholder for future escrow implementation)
   */
  async getEscrowStatus(userId: string): Promise<{
    hasEscrow: boolean;
    amount: number;
    displayAmount: string;
    releaseDate: string | null;
    daysRemaining: number;
  }> {
    try {
      const balance = await this.getRealTokenBalance(userId);
      
      if (balance.escrowBalance === 0) {
        return {
          hasEscrow: false,
          amount: 0,
          displayAmount: '0.00 BOCA',
          releaseDate: null,
          daysRemaining: 0
        };
      }

      // Calculate release date (7 days from now - would come from backend)
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7);
      
      const daysRemaining = Math.ceil(
        (releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        hasEscrow: true,
        amount: balance.escrowBalance,
        displayAmount: this.formatDisplay(balance.escrowBalance),
        releaseDate: releaseDate.toISOString(),
        daysRemaining
      };
    } catch (error) {
      console.error('❌ Failed to get escrow status:', error);
      return {
        hasEscrow: false,
        amount: 0,
        displayAmount: '0.00 BOCA',
        releaseDate: null,
        daysRemaining: 0
      };
    }
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

  // ========== NEW: OPTIMISTIC UPDATE METHODS ==========

  /**
   * Subscribe to immediate balance updates (for optimistic updates)
   */
  onBalanceChange(callback: (balance: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit balance change to all listeners
   */
  private emitBalanceChange(balance: number): void {
    this.listeners.forEach(listener => listener(balance));
  }

  /**
   * Optimistically update balance (instant UI update + background refresh)
   */
  async optimisticUpdate(userId: string, amount: number): Promise<void> {
    const cacheKey = userId.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      // Immediately update local balance and notify listeners
      const newBalance = cached.balance + amount;
      console.log(`🚀 Optimistic update: ${cached.balance} + ${amount} = ${newBalance}`);
      this.emitBalanceChange(newBalance);
      
      // Update cache optimistically
      cached.balance = newBalance;
      cached.availableBalance = newBalance;
      cached.displayBalance = this.formatDisplay(newBalance);
      cached.lastUpdated = new Date().toISOString();
    } else {
      console.warn('⚠️ No cached balance found for optimistic update, fetching first...');
      // If no cache exists, fetch current balance first
      await this.getRealTokenBalance(userId);
      // Try optimistic update again
      return this.optimisticUpdate(userId, amount);
    }
    
    // Refresh from backend in background (for accuracy)
    this.forceRefreshBalance(userId).catch(error => {
      console.warn('Background balance refresh failed (non-critical):', error);
    });
  }

  // ========== HELPER METHODS ==========

  /**
   * Format balance for display with BOCA symbol
   */
  formatDisplay(amount: number): string {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} BOCA`;
  }

  /**
   * Format balance without symbol
   */
  formatNumber(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Parse display amount string to number
   */
  parseAmount(displayString: string): number {
    // Remove BOCA symbol and commas
    const cleanString = displayString.replace(/[^0-9.]/g, '');
    return parseFloat(cleanString);
  }

  // ========== PRIVATE METHODS ==========

  private createMockResult(userId: string): TokenBalanceResult {
    return {
      balance: this.config.mockBalance,
      displayBalance: this.formatDisplay(this.config.mockBalance),
      escrowBalance: 0,
      availableBalance: this.config.mockBalance,
      source: 'mock',
      lastUpdated: new Date().toISOString(),
      userId
    };
  }

  private isCacheFresh(cached: TokenBalanceResult): boolean {
    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
    return cacheAge < this.config.refreshInterval;
  }

  private scheduleRefresh(userId: string): void {
    const cacheKey = userId.toLowerCase();
    
    // Cancel existing timer
    const existingTimer = this.refreshTimers.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule new refresh
    const timer = setTimeout(() => {
      this.getRealTokenBalance(userId).catch(error => {
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
 * 🎯 Quick function to get balance for a specific user
 */
export async function getMyTokenBalance(userId: string): Promise<number> {
  const service = new TokenBalanceService();
  
  try {
    const result = await service.getRealTokenBalance(userId);
    console.log(`💰 Balance: ${result.displayBalance} (${result.source})`);
    return result.balance;
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    return 0;
  }
}

/**
 * 🧪 Test function to compare real vs mock balance
 */
export async function testBalanceComparison(userId: string): Promise<void> {
  const service = new TokenBalanceService();
  
  console.log('🧪 Testing real vs mock balance...');
  
  // Test real balance
  console.log('\n1️⃣ Testing REAL balance:');
  service.setMockMode(false);
  const realResult = await service.getBalanceWithStatus(userId);
  
  // Test mock balance  
  console.log('\n2️⃣ Testing MOCK balance:');
  service.setMockMode(true, 1250); // 1250 BOCA
  const mockResult = await service.getBalanceWithStatus(userId);
  
  console.log('\n📊 COMPARISON RESULTS:');
  console.log(`Real Balance: ${realResult.displayBalance} (${realResult.status.source})`);
  console.log(`Mock Balance: ${mockResult.displayBalance} (${mockResult.status.source})`);
  console.log(`Escrow: ${realResult.escrowInfo.displayAmount} (${realResult.escrowInfo.percentage.toFixed(1)}%)`);
  
  service.cleanup();
}

/**
 * 💰 Format token amount helper
 */
export function formatTokenAmount(amount: number, decimals: number = 2): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })} BOCA`;
}

/**
 * 🔢 Token converter utilities
 */
export const TokenConverter = {
  format: (amount: number) => formatTokenAmount(amount),
  parse: (displayString: string) => {
    const cleanString = displayString.replace(/[^0-9.]/g, '');
    return parseFloat(cleanString);
  }
};

// Export singleton instance
const tokenBalanceService = new TokenBalanceService();
export default tokenBalanceService;

// Also export the class for testing
export { TokenBalanceService as TokenBalanceServiceClass };