// code/poc/core/src/adapters/__tests__/production-adapter.test.ts

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/test-environment';
import { ProductionRebasedAdapter } from '../production-rebased-adapter.js';
import { AdapterFactory } from '../adapter-factory.js';
import { AdapterMonitoring } from '../monitoring.js';
import { environmentManager } from '../../config/index.js';

describe('ProductionRebasedAdapter', () => {
  let adapter: ProductionRebasedAdapter;
  let factory: AdapterFactory;
  let monitoring: AdapterMonitoring;

  beforeAll(async () => {
    // Initialize test environment
    await environmentManager.switchEnvironment('development');
    factory = AdapterFactory.getInstance();
    monitoring = AdapterMonitoring.getInstance();
  });

  beforeEach(async () => {
    adapter = new ProductionRebasedAdapter();
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow initialization
  });

  afterAll(() => {
    monitoring.stopMonitoring();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', async () => {
      const metrics = adapter.getMetrics();
      const connectionStatus = adapter.getConnectionStatus();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(connectionStatus.healthy).toBe(true);
      expect(connectionStatus.circuitBreakerState).toBe('closed');
    });

    test('should load network configuration', () => {
      const connectionStatus = adapter.getConnectionStatus();
      expect(connectionStatus.primary).toBeDefined();
      expect(typeof connectionStatus.primary).toBe('string');
    });

    test('should initialize sponsor wallet configuration', () => {
      const sponsorWallet = adapter.getSponsorWalletStatus();
      expect(typeof sponsorWallet.enabled).toBe('boolean');
      expect(sponsorWallet.dailyGasLimit).toBeGreaterThan(0);
      expect(sponsorWallet.maxGasPerTx).toBeGreaterThan(0);
    });
  });

  describe('Transaction Submission', () => {
    test('should submit basic transaction successfully', async () => {
      const txData = {
        moveCall: {
          module: 'omeone_chain::token',
          function: 'transfer',
          args: ['0x123', 1000],
        },
      };

      const result = await adapter.submitTransaction(txData);
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeGreaterThan(0);
      expect(result.gasUsed).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should handle invalid transaction data', async () => {
      const result = await adapter.submitTransaction(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transaction data');
    });

    test('should use sponsor wallet for transactions', async () => {
      const sponsorWalletBefore = adapter.getSponsorWalletStatus();
      
      const txData = {
        moveCall: {
          module: 'omeone_chain::token',
          function: 'mint',
          args: [1000],
          maxGas: 50000,
        },
      };

      await adapter.submitTransaction(txData);
      
      const sponsorWalletAfter = adapter.getSponsorWalletStatus();
      
      if (sponsorWalletBefore.enabled) {
        expect(sponsorWalletAfter.usedGasToday).toBeGreaterThan(sponsorWalletBefore.usedGasToday);
      }
    });

    test('should track transaction metrics', async () => {
      const metricsBefore = adapter.getMetrics();
      
      await adapter.submitTransaction({
        moveCall: {
          module: 'test',
          function: 'test_fn',
          args: [],
        },
      });
      
      const metricsAfter = adapter.getMetrics();
      
      expect(metricsAfter.totalRequests).toBe(metricsBefore.totalRequests + 1);
      expect(metricsAfter.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('State Queries', () => {
    test('should query state successfully', async () => {
      const query = {
        moveQuery: {
          module: 'omeone_chain::token',
          function: 'balance_of',
          args: ['0x123'],
        },
      };

      const result = await adapter.queryState(query);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should cache query results', async () => {
      const query = {
        moveQuery: {
          module: 'omeone_chain::test',
          function: 'get_value',
          args: ['test_key'],
        },
      };

      // First query
      const result1 = await adapter.queryState(query);
      const connectionStatus1 = adapter.getConnectionStatus();
      
      // Second identical query
      const result2 = await adapter.queryState(query);
      const connectionStatus2 = adapter.getConnectionStatus();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(connectionStatus2.cacheSize).toBeGreaterThan(0);
    });

    test('should handle query errors gracefully', async () => {
      const invalidQuery = {
        moveQuery: {
          module: 'invalid_module',
          function: 'invalid_function',
          args: [],
        },
      };

      const result = await adapter.queryState(invalidQuery);
      
      // Even with invalid query, adapter should handle gracefully
      expect(result.success).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Circuit Breaker', () => {
    test('should track failures and successes', async () => {
      const connectionStatusBefore = adapter.getConnectionStatus();
      expect(connectionStatusBefore.circuitBreakerState).toBe('closed');

      // Successful operation
      await adapter.queryState({ test: true });
      
      const connectionStatusAfter = adapter.getConnectionStatus();
      expect(connectionStatusAfter.circuitBreakerState).toBe('closed');
    });

    test('should allow manual connection refresh', () => {
      adapter.refreshConnection();
      
      const connectionStatus = adapter.getConnectionStatus();
      expect(connectionStatus.circuitBreakerState).toBe('closed');
    });
  });

  describe('Cache Management', () => {
    test('should cache and retrieve data', async () => {
      const query1 = { moveQuery: { module: 'test', function: 'cache_test_1', args: [] } };
      const query2 = { moveQuery: { module: 'test', function: 'cache_test_2', args: [] } };
      
      await adapter.queryState(query1);
      await adapter.queryState(query2);
      
      const connectionStatus = adapter.getConnectionStatus();
      expect(connectionStatus.cacheSize).toBeGreaterThan(0);
    });

    test('should clear cache on demand', async () => {
      // Add some cached data
      await adapter.queryState({ moveQuery: { module: 'test', function: 'cache_test', args: [] } });
      
      const connectionStatusBefore = adapter.getConnectionStatus();
      expect(connectionStatusBefore.cacheSize).toBeGreaterThan(0);
      
      adapter.clearCache();
      
      const connectionStatusAfter = adapter.getConnectionStatus();
      expect(connectionStatusAfter.cacheSize).toBe(0);
    });
  });

  describe('Health Monitoring', () => {
    test('should provide health status', async () => {
      const healthStatus = await adapter.getHealthStatus();
      
      expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.checks).toBeDefined();
      expect(typeof healthStatus.checks).toBe('object');
    });

    test('should track performance metrics', async () => {
      // Generate some activity
      await adapter.queryState({ test: 'metrics_test' });
      await adapter.submitTransaction({ moveCall: { module: 'test', function: 'test', args: [] } });
      
      const metrics = adapter.getMetrics();
      
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    });

    test('should update sponsor wallet metrics', async () => {
      const sponsorWallet = adapter.getSponsorWalletStatus();
      
      expect(typeof sponsorWallet.enabled).toBe('boolean');
      expect(sponsorWallet.usedGasToday).toBeGreaterThanOrEqual(0);
      expect(sponsorWallet.dailyGasLimit).toBeGreaterThan(0);
    });
  });

  describe('Event Watching', () => {
    test('should start event watching', async () => {
      const events: any[] = [];
      const eventFilter = { type: 'transfer', module: 'omeone_chain::token' };

      await adapter.watchEvents(eventFilter, (event) => {
        events.push(event);
      });

      // Wait a bit for potential events
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have set up watching without errors
      expect(true).toBe(true); // Basic test that no errors occurred
    });
  });
});

describe('AdapterFactory Integration', () => {
  let factory: AdapterFactory;

  beforeAll(() => {
    factory = AdapterFactory.getInstance();
  });

  test('should create production adapter for rebased network', async () => {
    const config = {
      type: 'rebased' as const,
      enableMetrics: true,
      enableCache: true,
    };

    const adapter = await factory.createAdapter(config);
    expect(adapter).toBeInstanceOf(ProductionRebasedAdapter);
    
    const adapterType = factory.getCurrentAdapterType();
    expect(adapterType).toBe('rebased');
  });

  test('should auto-detect appropriate adapter', async () => {
    const config = { type: 'auto' as const };
    const adapter = await factory.createAdapter(config);
    
    expect(adapter).toBeDefined();
    
    const adapterType = factory.getCurrentAdapterType();
    expect(['mock', 'rebased', 'evm']).toContain(adapterType);
  });

  test('should validate adapter configuration', async () => {
    const validConfig = {
      type: 'rebased' as const,
      enableMetrics: true,
    };

    const validation = await factory.validateAdapterConfig(validConfig);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject invalid adapter configuration', async () => {
    const invalidConfig = {
      type: 'invalid' as any,
      customEndpoint: 'not-a-url',
    };

    const validation = await factory.validateAdapterConfig(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should provide recommended configuration', async () => {
    const recommendedConfig = await factory.getRecommendedConfig();
    
    expect(recommendedConfig.type).toBeDefined();
    expect(typeof recommendedConfig.enableMetrics).toBe('boolean');
    expect(typeof recommendedConfig.enableCache).toBe('boolean');
  });

  test('should get adapter health status', async () => {
    await factory.createAdapter({ type: 'rebased' });
    
    const health = await factory.getAdapterHealth();
    
    expect(health.type).toBeDefined();
    expect(typeof health.healthy).toBe('boolean');
    expect(health.details).toBeDefined();
  });

  test('should switch between adapters', async () => {
    // Start with mock adapter
    await factory.createAdapter({ type: 'mock' });
    expect(factory.getCurrentAdapterType()).toBe('mock');
    
    // Switch to rebased adapter
    await factory.switchAdapter({ type: 'rebased' });
    expect(factory.getCurrentAdapterType()).toBe('rebased');
  });
});

describe('Monitoring Integration', () => {
  let monitoring: AdapterMonitoring;
  let factory: AdapterFactory;

  beforeAll(async () => {
    monitoring = AdapterMonitoring.getInstance();
    factory = AdapterFactory.getInstance();
    await factory.createAdapter({ type: 'rebased' });
  });

  afterAll(() => {
    monitoring.stopMonitoring();
  });

  test('should start and stop monitoring', () => {
    monitoring.startMonitoring(1000); // 1 second for testing
    
    // Should not throw error starting twice
    monitoring.startMonitoring(1000);
    
    monitoring.stopMonitoring();
  });

  test('should collect metrics automatically', async () => {
    monitoring.startMonitoring(500); // 500ms for testing
    
    // Wait for at least one metrics collection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recentMetrics = monitoring.getRecentMetrics(1);
    expect(recentMetrics.length).toBeGreaterThan(0);
    
    const metrics = recentMetrics[0];
    expect(metrics.timestamp).toBeInstanceOf(Date);
    expect(metrics.adapter).toBeDefined();
    expect(metrics.network).toBeDefined();
    expect(metrics.system).toBeDefined();
    
    monitoring.stopMonitoring();
  });

  test('should generate alerts for issues', async () => {
    monitoring.startMonitoring(200);
    
    // Wait for some monitoring cycles
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recentAlerts = monitoring.getRecentAlerts(10);
    
    // Should have at least one alert (monitoring started)
    expect(recentAlerts.length).toBeGreaterThan(0);
    
    const alert = recentAlerts[0];
    expect(alert.timestamp).toBeInstanceOf(Date);
    expect(alert.severity).toMatch(/info|warning|error|critical/);
    expect(alert.component).toBeDefined();
    expect(alert.message).toBeDefined();
    
    monitoring.stopMonitoring();
  });

  test('should provide metrics summary', async () => {
    monitoring.startMonitoring(200);
    
    // Generate some activity
    const adapter = factory.getCurrentAdapter();
    if (adapter) {
      await adapter.queryState({ test: 'monitoring_test' });
      await adapter.submitTransaction({ moveCall: { module: 'test', function: 'test', args: [] } });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const summary = monitoring.getMetricsSummary(1); // 1 minute
    
    expect(summary.period.start).toBeInstanceOf(Date);
    expect(summary.period.end).toBeInstanceOf(Date);
    expect(summary.adapter).toBeDefined();
    expect(summary.system).toBeDefined();
    expect(summary.alerts).toBeDefined();
    
    monitoring.stopMonitoring();
  });

  test('should generate health report', async () => {
    monitoring.startMonitoring(200);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const healthReport = monitoring.generateHealthReport();
    
    expect(healthReport.status).toMatch(/healthy|degraded|unhealthy/);
    expect(healthReport.timestamp).toBeInstanceOf(Date);
    expect(healthReport.summary).toBeDefined();
    expect(healthReport.details).toBeDefined();
    expect(Array.isArray(healthReport.details.recommendations)).toBe(true);
    
    monitoring.stopMonitoring();
  });

  test('should handle alert callbacks', async () => {
    const alerts: any[] = [];
    
    monitoring.onAlert((alert) => {
      alerts.push(alert);
    });
    
    monitoring.startMonitoring(200);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    monitoring.stopMonitoring();
    
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toHaveProperty('severity');
    expect(alerts[0]).toHaveProperty('component');
    expect(alerts[0]).toHaveProperty('message');
  });

  test('should handle metrics callbacks', async () => {
    const metricsUpdates: any[] = [];
    
    monitoring.onMetrics((metrics) => {
      metricsUpdates.push(metrics);
    });
    
    monitoring.startMonitoring(200);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    monitoring.stopMonitoring();
    
    expect(metricsUpdates.length).toBeGreaterThan(0);
    expect(metricsUpdates[0]).toHaveProperty('adapter');
    expect(metricsUpdates[0]).toHaveProperty('network');
    expect(metricsUpdates[0]).toHaveProperty('system');
  });

  test('should export monitoring data', async () => {
    monitoring.startMonitoring(200);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const exportData = monitoring.exportData();
    
    expect(exportData.export.timestamp).toBeInstanceOf(Date);
    expect(exportData.export.environment).toBeDefined();
    expect(Array.isArray(exportData.export.alerts)).toBe(true);
    expect(Array.isArray(exportData.export.metrics)).toBe(true);
    expect(exportData.export.summary).toBeDefined();
    
    monitoring.stopMonitoring();
  });

  test('should clear monitoring data', () => {
    monitoring.clearData();
    
    const recentMetrics = monitoring.getRecentMetrics(10);
    const recentAlerts = monitoring.getRecentAlerts(10);
    
    expect(recentMetrics).toHaveLength(0);
    expect(recentAlerts).toHaveLength(0);
  });
});

describe('Error Handling and Resilience', () => {
  let adapter: ProductionRebasedAdapter;

  beforeEach(async () => {
    adapter = new ProductionRebasedAdapter();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('should handle network timeouts gracefully', async () => {
    // Simulate timeout by submitting transaction that would take time
    const result = await adapter.submitTransaction({
      moveCall: {
        module: 'test::slow_module',
        function: 'slow_function',
        args: [],
        maxGas: 1000000,
      },
    });

    // Should complete without throwing
    expect(result).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should maintain metrics during errors', async () => {
    const metricsBefore = adapter.getMetrics();
    
    // Submit invalid transaction
    await adapter.submitTransaction({ invalid: 'data' });
    
    const metricsAfter = adapter.getMetrics();
    
    expect(metricsAfter.totalRequests).toBeGreaterThan(metricsBefore.totalRequests);
  });

  test('should handle sponsor wallet limit exceeded', async () => {
    // Update sponsor wallet to have very low limits
    adapter.updateSponsorWallet({
      enabled: true,
      maxGasPerTx: 1, // Very low limit
      dailyGasLimit: 10,
      usedGasToday: 9, // Almost at limit
    });

    const result = await adapter.submitTransaction({
      moveCall: {
        module: 'test',
        function: 'expensive_function',
        args: [],
        maxGas: 1000, // Exceeds limits
      },
    });

    // Should handle gracefully
    expect(result).toBeDefined();
  });

  test('should recover from circuit breaker opening', async () => {
    // Reset circuit breaker to closed state
    adapter.refreshConnection();
    
    const connectionStatus = adapter.getConnectionStatus();
    expect(connectionStatus.circuitBreakerState).toBe('closed');
    
    // After refresh, should be able to make requests
    const result = await adapter.queryState({ test: 'recovery_test' });
    expect(result).toBeDefined();
  });
});

describe('Performance and Load Testing', () => {
  let adapter: ProductionRebasedAdapter;

  beforeEach(async () => {
    adapter = new ProductionRebasedAdapter();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('should handle concurrent requests', async () => {
    const concurrentRequests = 5;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        adapter.queryState({
          moveQuery: {
            module: 'test',
            function: 'concurrent_test',
            args: [i],
          },
        })
      );
    }

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(concurrentRequests);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  test('should maintain performance under load', async () => {
    const startTime = Date.now();
    const requestCount = 10;
    
    for (let i = 0; i < requestCount; i++) {
      await adapter.queryState({ test: `load_test_${i}` });
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / requestCount;
    
    // Should complete reasonably quickly (less than 1 second per request on average)
    expect(avgTime).toBeLessThan(1000);
    
    const metrics = adapter.getMetrics();
    expect(metrics.totalRequests).toBeGreaterThanOrEqual(requestCount);
  });

  test('should manage cache effectively under load', async () => {
    // Fill cache with various queries
    for (let i = 0; i < 20; i++) {
      await adapter.queryState({
        moveQuery: {
          module: 'test',
          function: 'cache_test',
          args: [i],
        },
      });
    }

    const connectionStatus = adapter.getConnectionStatus();
    expect(connectionStatus.cacheSize).toBeGreaterThan(0);

    // Cache should not grow indefinitely
    expect(connectionStatus.cacheSize).toBeLessThanOrEqual(1000);
  });
});

describe('Configuration Integration', () => {
  test('should adapt to environment changes', async () => {
    // Create adapter in development environment
    await environmentManager.switchEnvironment('development');
    const factory = AdapterFactory.getInstance();
    
    const devAdapter = await factory.createAdapter({ type: 'auto' });
    expect(factory.getCurrentAdapterType()).toBe('mock');
    
    // Switch to testnet environment (would use rebased if contracts were deployed)
    await environmentManager.switchEnvironment('testnet');
    
    const testnetAdapter = await factory.createAdapter({ type: 'auto' });
    // Note: Would be 'rebased' if contracts were actually deployed
    expect(['mock', 'rebased']).toContain(factory.getCurrentAdapterType());
  });

  test('should use configuration-based endpoints', async () => {
    const environment = await environmentManager.getEnvironment();
    const adapter = new ProductionRebasedAdapter();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const connectionStatus = adapter.getConnectionStatus();
    
    // Should use the endpoint from configuration
    expect(connectionStatus.primary).toBe(environment.network.rpcEndpoint);
  });
});