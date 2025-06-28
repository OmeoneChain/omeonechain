// File: code/poc/core/src/service/__tests__/engine-fixed.test.ts
import { ServiceEngine } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { Service } from '../../types/service';

describe('ServiceEngine - Fixed', () => {
  let engine: ServiceEngine;
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
    engine = new ServiceEngine(adapter);
  });

  afterEach(async () => {
    if (adapter.disconnect) {
      await adapter.disconnect();
    }
  });

  test('should create and retrieve a service', async () => {
    const serviceData = {
      name: 'Test Restaurant',
      category: 'restaurant',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      }
    };

    // Create service
    const createdService = await engine.createService(serviceData);
    expect(createdService.serviceId).toBeDefined();
    expect(createdService.name).toBe(serviceData.name);

    // Retrieve service
    const retrievedService = await engine.getServiceById(createdService.serviceId);
    expect(retrievedService).toBeDefined();
    expect(retrievedService?.name).toBe(serviceData.name);
  });

  test('should handle service not found gracefully', async () => {
    const service = await engine.getServiceById('non-existent');
    expect(service).toBeUndefined();
  });

  test('should search services by filter', async () => {
    // Create test services first
    await engine.createService({
      name: 'Italian Restaurant',
      category: 'restaurant',
      location: { latitude: 40.7128, longitude: -74.0060, address: '123 Test St', city: 'New York', country: 'USA' }
    });

    await engine.createService({
      name: 'Coffee Shop',
      category: 'cafe',
      location: { latitude: 40.7129, longitude: -74.0061, address: '124 Test St', city: 'New York', country: 'USA' }
    });

    // Search by category
    const result = await engine.searchServices({
      category: 'restaurant',
      limit: 10,
      offset: 0
    });

    expect(result.services.length).toBeGreaterThan(0);
    expect(result.services[0].category).toBe('restaurant');
  });
});