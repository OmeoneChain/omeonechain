/**
 * Tests for the RecommendationEngine
 */

import { RecommendationEngine } from '../engine';
import { MockAdapter } from '../../adapters/mock-adapter';
import { StorageProvider } from '../../storage/storage-provider';

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

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;
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
    engine = new RecommendationEngine(adapter, storage, {
      validateContent: true,
      spamDetection: true,
      chainId: 'test-chain-001'
    });
    
    // Initialize engine
    await engine.initialize();
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('should submit a recommendation', async () => {
    const author = 'test-user';
    const recommendation = {
      serviceId: 'restaurant-123',
      category: 'restaurant',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St, New York, NY'
      },
      rating: 5,
      content: {
        title: 'Amazing Restaurant',
        body: 'This is an amazing restaurant with great food and service.',
        media: [
          {
            type: 'image/jpeg',
            data: Buffer.from('mock-image-data'),
            caption: 'Food photo'
          }
        ]
      },
      tags: ['italian', 'pizza', 'pasta']
    };
    
    const result = await engine.submitRecommendation(author, recommendation);
    
    // Verify result
    expect(result).toMatchObject({
      author,
      serviceId: recommendation.serviceId,
      category: recommendation.category,
      rating: recommendation.rating,
      content: {
        title: recommendation.content.title,
        body: recommendation.content.body
      },
      tags: recommendation.tags,
      verificationStatus: 'unverified',
      chainID: 'test-chain-001'
    });
    
    // Verify media was stored
    expect(result.content.media).toHaveLength(1);
    expect(result.content.media[0].ipfsHash).toBeDefined();
    
    // Verify it was stored in IPFS
    const mediaExists = await storage.fileExists(result.content.media[0].ipfsHash);
    expect(mediaExists).toBe(true);
  });
  
  it('should get recommendations by filter', async () => {
    // Mock adapter queryState response
    const mockRecommendations = [
      {
        id: 'rec-1',
        author: 'test-user',
        timestamp: '2025-01-01T00:00:00Z',
        serviceId: 'restaurant-123',
        category: 'restaurant',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Test St, New York, NY'
        },
        rating: 5,
        content: {
          title: 'Amazing Restaurant',
          body: 'This is an amazing restaurant with great food and service.',
          media: [
            {
              type: 'image/jpeg',
              ipfsHash: 'mock-ipfs-1',
              caption: 'Food photo'
            }
          ]
        },
        tags: ['italian', 'pizza', 'pasta'],
        verificationStatus: 'unverified',
        contentHash: 'hash-1',
        tangle: {
          objectId: 'object-1',
          commitNumber: 1
        },
        chainID: 'test-chain-001'
      }
    ];
    
    // Mock storage data
    await storage.storeFile(Buffer.from('mock-image-data'), 'image/jpeg', { caption: 'Food photo' });
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: mockRecommendations,
      total: 1,
      pagination: {
        offset: 0,
        limit: 10,
        hasMore: false
      }
    });
    
    // Get recommendations by category
    const result = await engine.getRecommendations({
      category: 'restaurant'
    });
    
    // Verify results
    expect(result.recommendations).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.recommendations[0]).toMatchObject({
      id: 'rec-1',
      category: 'restaurant',
      rating: 5
    });
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'recommendation',
      filter: {
        category: 'restaurant'
      },
      sort: undefined,
      pagination: undefined
    });
  });
  
  it('should vote on a recommendation', async () => {
    const userId = 'test-user';
    const recommendationId = 'rec-1';
    
    // Spy on adapter submitTx method
    const submitSpy = jest.spyOn(adapter, 'submitTx');
    submitSpy.mockResolvedValue({
      id: 'tx-1',
      status: 'confirmed',
      timestamp: '2025-01-01T00:00:00Z',
      commitNumber: 1
    });
    
    // Upvote
    const result = await engine.voteOnRecommendation(userId, recommendationId, true);
    
    // Verify results
    expect(result.success).toBe(true);
    expect(result.action).toMatchObject({
      type: 'upvote',
      recommendationId,
      userId
    });
    
    // Verify transaction
    expect(submitSpy).toHaveBeenCalledWith({
      sender: userId,
      payload: {
        objectType: 'recommendation_vote',
        action: 'upvote',
        data: {
          recommendationId,
          vote: 1
        }
      },
      feeOptions: {
        sponsorWallet: undefined
      }
    });
  });
  
  it('should get a recommendation by ID', async () => {
    // Mock adapter queryState response
    const mockRecommendation = {
      id: 'rec-1',
      author: 'test-user',
      timestamp: '2025-01-01T00:00:00Z',
      serviceId: 'restaurant-123',
      category: 'restaurant',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St, New York, NY'
      },
      rating: 5,
      content: {
        title: 'Amazing Restaurant',
        body: 'This is an amazing restaurant with great food and service.',
        media: []
      },
      tags: ['italian', 'pizza', 'pasta'],
      verificationStatus: 'unverified',
      contentHash: 'hash-1',
      tangle: {
        objectId: 'object-1',
        commitNumber: 1
      },
      chainID: 'test-chain-001'
    };
    
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [mockRecommendation],
      total: 1
    });
    
    // Get recommendation by ID
    const result = await engine.getRecommendationById('rec-1');
    
    // Verify result
    expect(result).toMatchObject({
      id: 'rec-1',
      author: 'test-user',
      serviceId: 'restaurant-123',
      rating: 5
    });
    
    // Verify query parameters
    expect(querySpy).toHaveBeenCalledWith({
      objectType: 'recommendation',
      filter: {
        id: 'rec-1'
      }
    });
  });
  
  it('should throw error if recommendation not found', async () => {
    // Spy on adapter queryState method
    const querySpy = jest.spyOn(adapter, 'queryState');
    querySpy.mockResolvedValue({
      results: [],
      total: 0
    });
    
    // Try to get non-existent recommendation
    await expect(engine.getRecommendationById('non-existent')).rejects.toThrow(
      'Recommendation not found: non-existent'
    );
  });
});
