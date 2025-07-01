"use strict";
// code/poc/core/src/adapters/production-rebased-adapter.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionRebasedAdapter = void 0;
const index_1 = require("../config/index");
class ProductionRebasedAdapter {
    constructor() {
        this.initializeAdapter();
    }
    async initializeAdapter() {
        console.log('🔧 Initializing Production RebasedAdapter...');
        // Load network configuration
        const environment = await index_1.environmentManager.getEnvironment();
        this.network = environment.network;
        // Initialize connection pool
        this.connectionPool = {
            primary: this.network.rpcEndpoint,
            fallbacks: [
                // Add fallback endpoints when available
                this.network.rpcEndpoint.replace('api.', 'api-backup.'),
                this.network.rpcEndpoint.replace('api.', 'api2.'),
            ],
            maxRetries: 3,
            timeoutMs: 10000,
        };
        // Initialize performance metrics
        this.metrics = {
            averageResponseTime: 0,
            successRate: 100,
            totalRequests: 0,
            failedRequests: 0,
        };
        // Initialize sponsor wallet
        this.sponsorWallet = {
            enabled: this.network.features.sponsorWallet,
            walletAddress: process.env.SPONSOR_WALLET_ADDRESS,
            privateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY,
            maxGasPerTx: 100000, // μMIOTA
            dailyGasLimit: 10000000, // μMIOTA per day
            usedGasToday: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
        };
        // Initialize cache
        this.cacheConfig = {
            enabled: true,
            ttlSeconds: 60,
            maxEntries: 1000,
        };
        this.cache = new Map();
        // Initialize circuit breaker
        this.circuitBreaker = {
            failures: 0,
            lastFailure: null,
            state: 'closed',
        };
        console.log('✅ Production RebasedAdapter initialized');
        this.logAdapterStatus();
    }
    logAdapterStatus() {
        console.log(`🌍 Network: ${this.network.name} (${this.network.chainId})`);
        console.log(`🔗 Primary RPC: ${this.connectionPool.primary}`);
        console.log(`💰 Sponsor Wallet: ${this.sponsorWallet.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`🗄️ Cache: ${this.cacheConfig.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`⚡ Features: ${Object.entries(this.network.features)
            .filter(([_, enabled]) => enabled)
            .map(([feature, _]) => feature)
            .join(', ')}`);
    }
    // Circuit breaker implementation
    checkCircuitBreaker() {
        const now = new Date();
        switch (this.circuitBreaker.state) {
            case 'open':
                // Check if we should try again (30 second timeout)
                if (this.circuitBreaker.lastFailure &&
                    now.getTime() - this.circuitBreaker.lastFailure.getTime() > 30000) {
                    this.circuitBreaker.state = 'half-open';
                    return true;
                }
                return false;
            case 'half-open':
                // Allow one request to test
                return true;
            case 'closed':
            default:
                return true;
        }
    }
    recordSuccess() {
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'closed';
        this.metrics.lastSuccess = new Date();
    }
    recordFailure(error) {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = new Date();
        this.metrics.lastError = error;
        // Open circuit after 5 failures
        if (this.circuitBreaker.failures >= 5) {
            this.circuitBreaker.state = 'open';
            console.warn('🚨 Circuit breaker opened due to repeated failures');
        }
    }
    // Cache implementation
    getCacheKey(operation, params) {
        return `${operation}:${JSON.stringify(params)}`;
    }
    getFromCache(key) {
        if (!this.cacheConfig.enabled)
            return null;
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        const now = Date.now();
        const age = (now - cached.timestamp) / 1000;
        if (age > this.cacheConfig.ttlSeconds) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }
    setCache(key, data) {
        if (!this.cacheConfig.enabled)
            return;
        // Clean old entries if cache is full
        if (this.cache.size >= this.cacheConfig.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
    // Sponsor wallet management
    async checkSponsorWalletLimits(gasNeeded) {
        if (!this.sponsorWallet.enabled)
            return false;
        // Reset daily limit if new day
        const today = new Date().toISOString().split('T')[0];
        if (this.sponsorWallet.lastResetDate !== today) {
            this.sponsorWallet.usedGasToday = 0;
            this.sponsorWallet.lastResetDate = today;
        }
        // Check per-transaction limit
        if (gasNeeded > this.sponsorWallet.maxGasPerTx) {
            console.warn(`⚠️ Transaction gas (${gasNeeded}) exceeds per-tx limit (${this.sponsorWallet.maxGasPerTx})`);
            return false;
        }
        // Check daily limit
        if (this.sponsorWallet.usedGasToday + gasNeeded > this.sponsorWallet.dailyGasLimit) {
            console.warn(`⚠️ Daily gas limit would be exceeded: ${this.sponsorWallet.usedGasToday + gasNeeded}/${this.sponsorWallet.dailyGasLimit}`);
            return false;
        }
        return true;
    }
    updateSponsorWalletUsage(gasUsed) {
        if (this.sponsorWallet.enabled) {
            this.sponsorWallet.usedGasToday += gasUsed;
        }
    }
    // Connection management with retry logic
    async makeRequest(operation, requestFn, cacheable = true) {
        // Check circuit breaker
        if (!this.checkCircuitBreaker()) {
            throw new Error('Circuit breaker is open - service temporarily unavailable');
        }
        // Check cache first
        const cacheKey = this.getCacheKey(operation, arguments);
        if (cacheable) {
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const startTime = Date.now();
        let lastError = null;
        // Try primary endpoint first, then fallbacks
        const endpoints = [this.connectionPool.primary, ...this.connectionPool.fallbacks];
        for (let attempt = 0; attempt <= this.connectionPool.maxRetries; attempt++) {
            const endpoint = endpoints[attempt % endpoints.length];
            try {
                // Add timeout wrapper
                const result = await Promise.race([
                    requestFn(endpoint),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), this.connectionPool.timeoutMs))
                ]);
                // Record success metrics
                const responseTime = Date.now() - startTime;
                this.updateMetrics(responseTime, true);
                this.recordSuccess();
                // Cache the result
                if (cacheable) {
                    this.setCache(cacheKey, result);
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`⚠️ Request failed (attempt ${attempt + 1}/${this.connectionPool.maxRetries + 1}):`, lastError.message);
                // Wait before retry (exponential backoff)
                if (attempt < this.connectionPool.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        // All attempts failed
        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, false);
        this.recordFailure(lastError?.message || 'Unknown error');
        throw new Error(`All connection attempts failed. Last error: ${lastError?.message}`);
    }
    updateMetrics(responseTime, success) {
        this.metrics.totalRequests++;
        if (success) {
            // Update average response time
            const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
            this.metrics.averageResponseTime = totalTime / this.metrics.totalRequests;
        }
        else {
            this.metrics.failedRequests++;
        }
        // Update success rate
        this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) * 100;
    }
    // Move VM specific operations
    async callMoveFunction(call) {
        return await this.makeRequest('move_call', async (endpoint) => {
            // Simulate Move VM call
            console.log(`📞 Move call: ${call.module}::${call.function}`);
            // Check sponsor wallet if no sender specified
            if (!call.sender && this.sponsorWallet.enabled) {
                const gasNeeded = call.maxGas || this.network.gasPrice * 1000;
                if (await this.checkSponsorWalletLimits(gasNeeded)) {
                    call.sender = this.sponsorWallet.walletAddress;
                    this.updateSponsorWalletUsage(gasNeeded);
                }
            }
            // Simulate the call
            const mockResult = {
                success: true,
                result: { data: 'mock_move_result' },
                gasUsed: call.maxGas || this.network.gasPrice * 100,
                timestamp: new Date(),
            };
            return mockResult;
        }, false // Don't cache state-changing operations
        );
    }
    async queryMoveFunction(query) {
        return await this.makeRequest('move_query', async (endpoint) => {
            console.log(`🔍 Move query: ${query.module}::${query.function}`);
            // Simulate the query
            const mockResult = {
                success: true,
                data: { value: 'mock_query_result' },
                timestamp: new Date(),
            };
            return mockResult;
        }, true // Cache read operations
        );
    }
    // ChainAdapter implementation
    async submitTransaction(txData) {
        try {
            // Validate transaction data
            if (!txData || typeof txData !== 'object') {
                throw new Error('Invalid transaction data');
            }
            // For Move VM transactions
            if (this.network.features.moveVM && txData.moveCall) {
                const result = await this.callMoveFunction(txData.moveCall);
                return {
                    success: true,
                    txHash: `0x${Math.random().toString(16).substring(2)}`, // Mock hash
                    blockNumber: Math.floor(Math.random() * 1000000),
                    gasUsed: result.gasUsed,
                    timestamp: new Date(),
                };
            }
            // Fallback for other transaction types
            const result = await this.makeRequest('submit_tx', async (endpoint) => {
                console.log(`📤 Submitting transaction to ${endpoint}`);
                return {
                    success: true,
                    txHash: `0x${Math.random().toString(16).substring(2)}`,
                    blockNumber: Math.floor(Math.random() * 1000000),
                    gasUsed: this.network.gasPrice * 100,
                };
            }, false);
            return {
                success: true,
                txHash: result.txHash,
                blockNumber: result.blockNumber,
                gasUsed: result.gasUsed,
                timestamp: new Date(),
            };
        }
        catch (error) {
            console.error('❌ Transaction submission failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    }
    async queryState(query) {
        try {
            // For Move VM queries
            if (this.network.features.moveVM && query.moveQuery) {
                const result = await this.queryMoveFunction(query.moveQuery);
                return {
                    success: true,
                    data: result.data,
                    timestamp: new Date(),
                };
            }
            // Fallback for other query types
            const result = await this.makeRequest('query_state', async (endpoint) => {
                console.log(`🔍 Querying state from ${endpoint}`);
                return {
                    data: { value: 'mock_result', query },
                };
            }, true);
            return {
                success: true,
                data: result.data,
                timestamp: new Date(),
            };
        }
        catch (error) {
            console.error('❌ State query failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    }
    async watchEvents(eventFilter, callback) {
        console.log('👀 Starting event watch with filter:', eventFilter);
        // Simulate event watching
        const eventInterval = setInterval(() => {
            const mockEvent = {
                type: eventFilter.type || 'generic',
                data: { timestamp: new Date(), filter: eventFilter },
                blockNumber: Math.floor(Math.random() * 1000000),
            };
            callback(mockEvent);
        }, 5000);
        // Store interval for cleanup (in real implementation)
        // this.eventIntervals.add(eventInterval);
    }
    // Enhanced public API methods
    /**
     * Get adapter performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get sponsor wallet status
     */
    getSponsorWalletStatus() {
        return { ...this.sponsorWallet };
    }
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            primary: this.connectionPool.primary,
            healthy: this.circuitBreaker.state === 'closed',
            circuitBreakerState: this.circuitBreaker.state,
            cacheSize: this.cache.size,
            lastError: this.metrics.lastError,
        };
    }
    /**
     * Force refresh connection (reset circuit breaker)
     */
    refreshConnection() {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.lastFailure = null;
        console.log('🔄 Connection refreshed');
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
    /**
     * Update sponsor wallet configuration
     */
    updateSponsorWallet(config) {
        this.sponsorWallet = { ...this.sponsorWallet, ...config };
        console.log('💰 Sponsor wallet configuration updated');
    }
    /**
     * Get detailed health status
     */
    async getHealthStatus() {
        const checks = {};
        // Check circuit breaker
        checks.circuitBreaker = {
            status: this.circuitBreaker.state === 'closed',
            message: `Circuit breaker is ${this.circuitBreaker.state}`,
        };
        // Check success rate
        checks.successRate = {
            status: this.metrics.successRate >= 95,
            message: `Success rate: ${this.metrics.successRate.toFixed(1)}%`,
        };
        // Check response time
        checks.responseTime = {
            status: this.metrics.averageResponseTime < 5000,
            message: `Average response time: ${this.metrics.averageResponseTime.toFixed(0)}ms`,
        };
        // Check sponsor wallet
        if (this.sponsorWallet.enabled) {
            const usagePercent = (this.sponsorWallet.usedGasToday / this.sponsorWallet.dailyGasLimit) * 100;
            checks.sponsorWallet = {
                status: usagePercent < 90,
                message: `Daily gas usage: ${usagePercent.toFixed(1)}%`,
            };
        }
        // Determine overall health
        const healthyChecks = Object.values(checks).filter(check => check.status).length;
        const totalChecks = Object.values(checks).length;
        let overall;
        if (healthyChecks === totalChecks) {
            overall = 'healthy';
        }
        else if (healthyChecks >= totalChecks * 0.7) {
            overall = 'degraded';
        }
        else {
            overall = 'unhealthy';
        }
        return { overall, checks };
    }
}
exports.ProductionRebasedAdapter = ProductionRebasedAdapter;
//# sourceMappingURL=production-rebased-adapter.js.map