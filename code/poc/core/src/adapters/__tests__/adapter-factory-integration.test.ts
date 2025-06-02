// code/poc/core/src/adapters/__tests__/adapter-factory-integration.test.ts

import { describe, test, expect, beforeAll, afterAll } from '@jest/test-environment';
import { AdapterFactory, AdapterType } from '../adapter-factory.js';
import { ProductionRebasedAdapter } from '../production-rebased-adapter.js';
import { RebasedAdapter } from '../rebased-adapter.js';
import { MockAdapter } from '../mock-adapter.js';

describe('Enhanced AdapterFactory Integration', () => {
  let factory: AdapterFactory;

  beforeAll(() => {
    factory = AdapterFactory.getInstance();
  });

  afterAll(async () => {
    await factory.reset();
  });

  describe('Legacy Functionality', () => {
    test('should create standard RebasedAdapter by default', () => {
      const adapter = factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        apiKey: 'test-key',
      });

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(RebasedAdapter);
      expect(adapter).not.toBeInstanceOf(ProductionRebasedAdapter);
    });

    test('should create MockAdapter', () => {
      const adapter = factory.createAdapter({
        type: AdapterType.MOCK,
        simulateLatency: true,
        failureRate: 5,
      });

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(MockAdapter);
    });

    test('should manage active adapter', async () => {
      // Create and set mock adapter as active
      const mockAdapter = factory.createAdapter({
        type: AdapterType.MOCK,
        simulateLatency: false,
      });

      await factory.setActiveAdapter(AdapterType.MOCK);
      
      expect(factory.getActiveAdapter()).toBe(mockAdapter);
      expect(factory.getActiveAdapterType()).toBe(AdapterType.MOCK);
    });

    test('should support createAdapterSimple', () => {
      const adapter = factory.createAdapterSimple(AdapterType.REBASED, {
        nodeUrl: 'https://test.iota.org',
        useProductionAdapter: false,
      });

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(RebasedAdapter);
    });
  });

  describe('New Production Features', () => {
    test('should create ProductionRebasedAdapter when requested', () => {
      const adapter = factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        useProductionAdapter: true, // NEW FEATURE
      });

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(ProductionRebasedAdapter);
    });

    test('should get adapter health for standard adapter', async () => {
      // Create and activate standard adapter
      factory.createAdapter({
        type: AdapterType.MOCK,
        simulateLatency: false,
      });
      await factory.setActiveAdapter(AdapterType.MOCK);

      const health = await factory.getAdapterHealth();
      
      expect(health).toBeDefined();
      expect(health.type).toBe(AdapterType.MOCK);
      expect(typeof health.healthy).toBe('boolean');
      expect(health.details).toBeDefined();
    });

    test('should get enhanced health for ProductionRebasedAdapter', async () => {
      // Create and activate production adapter
      factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        useProductionAdapter: true,
      });
      await factory.setActiveAdapter(AdapterType.REBASED);

      // Wait for adapter initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      const health = await factory.getAdapterHealth();
      
      expect(health).toBeDefined();
      expect(health.type).toBe(AdapterType.REBASED);
      expect(typeof health.healthy).toBe('boolean');
      expect(health.details).toBeDefined();
      
      // Should have enhanced health details
      if (health.details.overall) {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.details.overall);
        expect(health.details.checks).toBeDefined();
      }
    });

    test('should get adapter metrics for ProductionRebasedAdapter', async () => {
      // Create and activate production adapter
      factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        useProductionAdapter: true,
      });
      await factory.setActiveAdapter(AdapterType.REBASED);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = factory.getAdapterMetrics();
      
      expect(metrics).toBeDefined();
      
      // Should have production metrics
      if (metrics.performance) {
        expect(metrics.performance.totalRequests).toBeDefined();
        expect(metrics.performance.successRate).toBeDefined();
        expect(metrics.connection).toBeDefined();
        expect(metrics.sponsorWallet).toBeDefined();
      }
    });

    test('should refresh connection for ProductionRebasedAdapter', async () => {
      // Create and activate production adapter
      factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        useProductionAdapter: true,
      });
      await factory.setActiveAdapter(AdapterType.REBASED);

      // Should not throw error
      expect(() => factory.refreshConnection()).not.toThrow();
    });

    test('should handle missing active adapter gracefully', async () => {
      await factory.reset();

      const health = await factory.getAdapterHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.details.error).toBe('No active adapter');
    });
  });

  describe('Migration Capabilities', () => {
    test('should support adapter migration', async () => {
      // Create both adapters
      factory.createAdapter({
        type: AdapterType.MOCK,
        simulateLatency: false,
      });

      factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        useProductionAdapter: true,
      });

      // Migrate from mock to rebased
      const migrationResult = await factory.migrateAdapter(
        AdapterType.MOCK,
        AdapterType.REBASED
      );

      expect(migrationResult).toBe(true);
      expect(factory.getActiveAdapterType()).toBe(AdapterType.REBASED);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain all existing enum values', () => {
      expect(AdapterType.REBASED).toBe('rebased');
      expect(AdapterType.EVM).toBe('evm');
      expect(AdapterType.MOCK).toBe('mock');
    });

    test('should support all existing configuration options', () => {
      const rebasedAdapter = factory.createAdapter({
        type: AdapterType.REBASED,
        nodeUrl: 'https://api.testnet.rebased.iota.org',
        apiKey: 'test-key',
        seed: 'test-seed',
        account: {
          address: '0x123',
          privateKey: 'key123',
        },
        sponsorWallet: {
          address: '0x456',
          privateKey: 'key456',
        },
        contractAddresses: {
          recommendation: '0x111',
          reputation: '0x222',
          token: '0x333',
          governance: '0x444',
          service: '0x555',
        },
        options: {
          retryAttempts: 3,
          maxFeePerTransaction: 1000,
          timeoutMs: 5000,
        },
      });

      expect(rebasedAdapter).toBeDefined();
      expect(rebasedAdapter).toBeInstanceOf(RebasedAdapter);
    });

    test('should support legacy createAdapterSimple with new options', () => {
      const prodAdapter = factory.createAdapterSimple(AdapterType.REBASED, {
        nodeUrl: 'https://test.iota.org',
        useProductionAdapter: true, // NEW option works in legacy method
      });

      expect(prodAdapter).toBeInstanceOf(ProductionRebasedAdapter);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid adapter type', () => {
      expect(() => {
        factory.createAdapter({
          type: 'invalid' as any,
          nodeUrl: 'test',
        });
      }).toThrow('Unsupported adapter type');
    });

    test('should handle adapter not found for activation', async () => {
      await factory.reset();

      await expect(
        factory.setActiveAdapter(AdapterType.REBASED)
      ).rejects.toThrow('Adapter of type rebased not found');
    });

    test('should handle migration with missing adapters', async () => {
      await factory.reset();

      await expect(
        factory.migrateAdapter(AdapterType.MOCK, AdapterType.REBASED)
      ).rejects.toThrow('Both source and target adapters must be created');
    });
  });
});

// Utility test to verify the adapter can actually be used
describe('Production Adapter Functionality', () => {
  test('should perform basic operations with ProductionRebasedAdapter', async () => {
    const factory = AdapterFactory.getInstance();
    
    const adapter = factory.createAdapter({
      type: AdapterType.REBASED,
      nodeUrl: 'https://api.testnet.rebased.iota.org',
      useProductionAdapter: true,
    });

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 200));

    // Test basic functionality
    expect(adapter).toBeInstanceOf(ProductionRebasedAdapter);
    
    if (adapter instanceof ProductionRebasedAdapter) {
      // Test production-specific methods
      const metrics = adapter.getMetrics();
      expect(metrics.totalRequests).toBeDefined();
      
      const connectionStatus = adapter.getConnectionStatus();
      expect(connectionStatus.healthy).toBeDefined();
      
      const healthStatus = await adapter.getHealthStatus();
      expect(healthStatus.overall).toBeDefined();
      
      // Test basic adapter operations
      const result = await adapter.submitTransaction({
        moveCall: {
          module: 'test',
          function: 'test_function',
          args: [],
        },
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    }
  });
});