import { ChainAdapter, TransactionResult } from './chain-adapter';
export interface QueryResult {
    success: boolean;
    data?: any;
    error?: string;
    timestamp: Date;
}
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
    getChainId(): Promise<string>;
    submitTx(tx: any): Promise<TransactionResult>;
    getCurrentCommit(): Promise<any>;
    estimateFee(tx: any): Promise<any>;
    claimUserRewards(userId: string): Promise<any>;
    store(key: string, value: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    queryObjects(query: any): Promise<any>;
    connect(options?: Record<string, any>): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getNetworkInfo(): Promise<{
        chainId: string;
        currentCommit: number;
        networkStatus: "healthy" | "degraded" | "down";
        lastUpdate: string;
    }>;
    submitTransaction(txData: any): Promise<TransactionResult>;
    queryState(query: any): Promise<any>;
    watchEvents: any;
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
