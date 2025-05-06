/**
 * Tests for the ServiceEngine
 */

import { ServiceEngine } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { StorageProvider } from '../../storage/storage-provider';
import { Service, VerificationStatus } from '../../types/service';

// Mock the storage provider
class MockStorageProvider implements StorageProvider {
  supportsRetrieval = true;
  supportsDeletion = true;
  storedFiles: Map<string, Buffer> = new Map();
  
  async storeFile(
    data: Buffer | Blob | string,
    _mimeType: string,
    _metadata?: Record<string, any>
  ): Promise<string> {
    // Convert data to Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data);
    } else if (data instanceof Blob) {
      buffer = Buffer.from(await data.arrayBuffer());
    } else {
      throw new Error('Unsupported data type');
    }
    
    // Generate a mock CID
    const cid = `mock-ipfs-${Math.random().toString(36).substring(2, 15)}`;
    
    // Store the data
    this.storedFiles.set(cid, buffer);
    
    return cid;
  }
  
  async retrieveFile(cid: string): Promise<Buffer> {
    const data = this.storedFiles.get(cid);
    if (!data) {
      throw new Error(`File not found: ${cid}`);
    }
    return data;
  }
  
  async fileExists(cid: string): Promise<boolean> {
    return this.storedFiles.has(cid);
  }
  
  async deleteFile(cid: string): Promise<boolean> {
    return this.storedFiles.delete(cid);
  }
  
  async getFileMetadata(cid: string): Promise<{
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  }> {
    const data = this.storedFiles.get(cid);
    if (!data) {
      throw new Error(`File not found: ${cid}`);
    }
    
    return {
      size: data.length,
      mimeType: 'application/octet-stream',
      created: new Date()
    };
  }
  
  async connect(): Promise<void> {
    // Nothing to do for mock
  }
  
  async disconnect(): Promise<void> {
    // Nothing to do for mock
  }
}

describe('ServiceEngine', () => {
  let engine: ServiceEngine;
  let adapter: MockAdapter;
  let storage: MockStorageProvider;
  
  beforeEach(async () => {
    // Create dependencies
    adapter = new MockAdapter({
      inMemory: true,
      chainId: 'test-chain-001'
    });
    storage = new MockStorageProvider();
    
    // Connect adapter
    await adapter.connect();
    
    // Create engine
    engine = new ServiceEngine(adapter, storage, {
      chainId: 'test-chain-001',
      enableVerification: true,
      sponsorWallet: 'SPONSOR',
      experienceOptions: {
        protocolFeePercentage: 3
      }
    });
    
    // Initialize engine
    await engine.initialize();
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('should create a service', async () => {
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Create service
    const service = await engine.createOrUpdateService(
      'test-user',
      {
        serviceId: undefined, // Should generate new ID
        name: 'Test Restaurant',
        category: 'restaurant',
        subcategories: ['italian', 'pizza'],
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test St',
          city: 'New York',
          country: 'USA'
        },
        website: 'https://test-restaurant.com',
        contact: '+1234567890'
      }
    );
    
    // Verify results
    expect(service).toMatchObject({
      name: 'Test Restaurant',
      category: 'restaurant',
      subcategories: ['italian', 'pizza'],
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      },
      website: 'https://test-restaurant.com',
      contact: '+1234567890',
      verificationStatus: VerificationStatus.UNCLAIMED,
      averageRating: 0,
      totalRecommendations: 0,
      totalUpvotes: 0
    });
    
    // Verify generated ID
    expect(service.serviceId).toBeDefined();
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'service',
        action: 'create',
        data: expect.objectContaining({
          name: 'Test Restaurant'
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should get a service by ID', async () => {
    // Mock service
    const mockService: Service = {
      serviceId: 'service-1',
      name: 'Test Restaurant',
      category: 'restaurant',
      subcategories: ['italian', 'pizza'],
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      },
      website: 'https://test-restaurant.com',
      contact: '+1234567890',
      verificationStatus: VerificationStatus.UNCLAIMED,
      averageRating: 4.5,
      totalRecommendations: 10,
      totalUpvotes: 5,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [mockService],
      total: 1
    });
    
    // Get service
    const service = await engine.getServiceById('service-1');
    
    // Verify results
    expect(service).toEqual(mockService);
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'service',
      filter: {
        serviceId: 'service-1'
      }
    });
  });
  
  it('should throw error if service not found', async () => {
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [],
      total: 0
    });
    
    // Try to get non-existent service
    await expect(engine.getServiceById('non-existent')).rejects.toThrow(
      'Service not found: non-existent'
    );
  });
  
  it('should query services by filter', async () => {
    // Mock services
    const mockServices: Service[] = [
      {
        serviceId: 'service-1',
        name: 'Italian Restaurant',
        category: 'restaurant',
        subcategories: ['italian', 'pizza'],
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test St',
          city: 'New York',
          country: 'USA'
        },
        website: 'https://italian-restaurant.com',
        contact: '+1234567890',
        verificationStatus: VerificationStatus.VERIFIED,
        averageRating: 4.5,
        totalRecommendations: 10,
        totalUpvotes: 5,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        serviceId: 'service-2',
        name: 'Sushi Restaurant',
        category: 'restaurant',
        subcategories: ['japanese', 'sushi'],
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '456 Test St',
          city: 'New York',
          country: 'USA'
        },
        website: 'https://sushi-restaurant.com',
        contact: '+1234567890',
        verificationStatus: VerificationStatus.UNCLAIMED,
        averageRating: 4.0,
        totalRecommendations: 5,
        totalUpvotes: 2,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z'
      }
    ];
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: mockServices,
      total: 2,
      pagination: {
        offset: 0,
        limit: 10,
        hasMore: false
      }
    });
    
    // Query services
    const result = await engine.queryServices({
      category: 'restaurant',
      pagination: {
        offset: 0,
        limit: 10
      }
    });
    
    // Verify results
    expect(result.services).toEqual(mockServices);
    expect(result.total).toBe(2);
    expect(result.pagination).toEqual({
      offset: 0,
      limit: 10,
      hasMore: false
    });
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'service',
      filter: {
        category: 'restaurant'
      },
      pagination: {
        offset: 0,
        limit: 10
      },
      sort: undefined
    });
  });
  
  it('should update service metrics', async () => {
    // Mock service
    const mockService: Service = {
      serviceId: 'service-1',
      name: 'Test Restaurant',
      category: 'restaurant',
      subcategories: ['italian', 'pizza'],
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      },
      website: 'https://test-restaurant.com',
      contact: '+1234567890',
      verificationStatus: VerificationStatus.UNCLAIMED,
      averageRating: 4.0,
      totalRecommendations: 1,
      totalUpvotes: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };
    
    // Spy on getServiceById method
    const getSpy = jest.spyOn(engine, 'getServiceById');
    getSpy.mockResolvedValue(mockService);
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Update metrics
    const updatedService = await engine.updateServiceMetrics(
      'service-1',
      5, // New rating
      true // Upvote
    );
    
    // Verify results
    expect(updatedService).toMatchObject({
      serviceId: 'service-1',
      totalRecommendations: 2,
      averageRating: 4.5, // (4.0*1 + 5)/2 = 4.5
      totalUpvotes: 1
    });
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'SPONSOR',
      payload: expect.objectContaining({
        objectType: 'service',
        action: 'update',
        data: expect.objectContaining({
          totalRecommendations: 2,
          averageRating: 4.5,
          totalUpvotes: 1
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should request service verification', async () => {
    // Mock service
    const mockService: Service = {
      serviceId: 'service-1',
      name: 'Test Restaurant',
      category: 'restaurant',
      subcategories: ['italian', 'pizza'],
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      },
      website: 'https://test-restaurant.com',
      contact: '+1234567890',
      verificationStatus: VerificationStatus.UNCLAIMED,
      averageRating: 4.0,
      totalRecommendations: 1,
      totalUpvotes: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };
    
    // Spy on getServiceById method
    const getSpy = jest.spyOn(engine, 'getServiceById');
    getSpy.mockResolvedValue(mockService);
    
    // Spy on getVerificationRequestByServiceId method
    const verSpy = jest.spyOn(engine, 'getVerificationRequestByServiceId');
    verSpy.mockResolvedValue(null);
    
    // Spy on createOrUpdateService method
    const updateSpy = jest.spyOn(engine, 'createOrUpdateService');
    updateSpy.mockResolvedValue({
      ...mockService,
      verificationStatus: VerificationStatus.CLAIMED
    });
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Request verification
    const request = await engine.requestServiceVerification(
      'test-user',
      'service-1',
      ['doc-1', 'doc-2']
    );
    
    // Verify results
    expect(request).toMatchObject({
      serviceId: 'service-1',
      requesterId: 'test-user',
      documents: ['doc-1', 'doc-2'],
      status: 'pending'
    });
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'verification_request',
        action: 'create',
        data: expect.objectContaining({
          serviceId: 'service-1',
          requesterId: 'test-user'
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
    
    // Verify service status update
    expect(updateSpy).toHaveBeenCalledWith('test-user', {
      ...mockService,
      verificationStatus: VerificationStatus.CLAIMED
    });
  });
  
  it('should throw error if verification already pending', async () => {
    // Spy on getServiceById method
    const getSpy = jest.spyOn(engine, 'getServiceById');
    getSpy.mockResolvedValue({} as Service);
    
    // Spy on getVerificationRequestByServiceId method
    const verSpy = jest.spyOn(engine, 'getVerificationRequestByServiceId');
    verSpy.mockResolvedValue({
      requestId: 'req-1',
      serviceId: 'service-1',
      requesterId: 'other-user',
      documents: ['doc-1'],
      status: 'pending',
      timestamp: '2025-01-01T00:00:00Z'
    });
    
    // Try to request verification
    await expect(
      engine.requestServiceVerification(
        'test-user',
        'service-1',
        ['doc-1', 'doc-2']
      )
    ).rejects.toThrow('Verification already pending for service: service-1');
  });
  
  it('should create a service experience', async () => {
    // Mock service
    const mockService: Service = {
      serviceId: 'service-1',
      name: 'Test Restaurant',
      category: 'restaurant',
      subcategories: ['italian', 'pizza'],
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
        city: 'New York',
        country: 'USA'
      },
      website: 'https://test-restaurant.com',
      contact: '+1234567890',
      verificationStatus: VerificationStatus.VERIFIED,
      averageRating: 4.0,
      totalRecommendations: 1,
      totalUpvotes: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };
    
    // Spy on getServiceById method
    const getSpy = jest.spyOn(engine, 'getServiceById');
    getSpy.mockResolvedValue(mockService);
    
    // Spy on getVerificationRequestByServiceId method
    const verSpy = jest.spyOn(engine, 'getVerificationRequestByServiceId');
    verSpy.mockResolvedValue({
      requestId: 'req-1',
      serviceId: 'service-1',
      requesterId: 'test-user',
      documents: ['doc-1'],
      status: 'approved',
      timestamp: '2025-01-01T00:00:00Z'
    });
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1,
      objectId: 'obj-1'
    });
    
    // Create experience
    const experience = await engine.createServiceExperience(
      'test-user',
      'service-1',
      'Exclusive Dinner',
      'A special dining experience',
      50,
      10,
      {
        startTime: '2025-02-01T18:00:00Z',
        endTime: '2025-02-01T22:00:00Z',
        mediaHash: 'media-1'
      }
    );
    
    // Verify results
    expect(experience).toMatchObject({
      serviceId: 'service-1',
      title: 'Exclusive Dinner',
      description: 'A special dining experience',
      price: 50,
      supply: 10,
      purchased: 0,
      startTime: '2025-02-01T18:00:00Z',
      endTime: '2025-02-01T22:00:00Z',
      mediaHash: 'media-1',
      isActive: true
    });
    
    // Verify transaction submission
    expect(submitSpy).toHaveBeenCalledWith({
      sender: 'test-user',
      payload: expect.objectContaining({
        objectType: 'service_experience',
        action: 'create',
        data: expect.objectContaining({
          serviceId: 'service-1',
          title: 'Exclusive Dinner'
        })
      }),
      feeOptions: {
        sponsorWallet: 'SPONSOR'
      }
    });
  });
  
  it('should calculate protocol fee', () => {
    const fee = engine.calculateProtocolFee(100);
    expect(fee).toBe(3); // 3% of 100
  });
});
