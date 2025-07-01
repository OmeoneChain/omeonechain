import { ChainAdapter, TransactionResult, QueryResult } from './chain-adapter';
export interface ConnectionPool {
    primary: string;
    fallbacks: string[];
    maxRetries: number;
    timeoutMs: number;
}
export interface PerformanceMetrics {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    failedRequests: number;
    lastError?: string;
    lastSuccess?: Date;
}
export interface SponsorWalletConfig {
    enabled: boolean;
    walletAddress?: string;
    privateKey?: string;
    maxGasPerTx: number;
    dailyGasLimit: number;
    usedGasToday: number;
    lastResetDate: string;
}
export interface CacheConfig {
    enabled: boolean;
    ttlSeconds: number;
    maxEntries: number;
}
export interface MoveContractCall {
    module: string;
    function: string;
    typeArgs?: string[];
    args: any[];
    sender?: string;
    maxGas?: number;
}
export interface MoveQueryCall {
    module: string;
    function: string;
    typeArgs?: string[];
    args: any[];
}
export declare class ProductionRebasedAdapter implements ChainAdapter {
    private network;
    private connectionPool;
    private metrics;
    private sponsorWallet;
    private cache;
    private cacheConfig;
    private circuitBreaker;
    constructor();
    private initializeAdapter;
    private logAdapterStatus;
    private checkCircuitBreaker;
    private recordSuccess;
    private recordFailure;
    private getCacheKey;
    private getFromCache;
    private setCache;
    private checkSponsorWalletLimits;
    private updateSponsorWalletUsage;
    private makeRequest;
    private updateMetrics;
    private callMoveFunction;
    private queryMoveFunction;
    submitTransaction(txData: any): Promise<TransactionResult>;
    queryState(query: any): Promise<QueryResult>;
    watchEvents(eventFilter: any, callback: (event: any) => void): Promise<void>;
    /**
     * Get adapter performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get sponsor wallet status
     */
    getSponsorWalletStatus(): SponsorWalletConfig;
    /**
     * Get connection status
     */
    getConnectionStatus(): {
        primary: string;
        healthy: boolean;
        circuitBreakerState: string;
        cacheSize: number;
        lastError?: string;
    };
    /**
     * Force refresh connection (reset circuit breaker)
     */
    refreshConnection(): void;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Update sponsor wallet configuration
     */
    updateSponsorWallet(config: Partial<SponsorWalletConfig>): void;
    /**
     * Get detailed health status
     */
    getHealthStatus(): Promise<{
        overall: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, {
            status: boolean;
            message: string;
        }>;
    }>;
}
