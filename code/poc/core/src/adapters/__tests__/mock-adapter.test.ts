/**
 * Tests for the MockAdapter
 */

import { MockAdapter } from '../mock-adapter';
import { Transaction } from '../chain-adapter';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  // Create a mock implementation
  const mockRun = jest.fn();
  const mockGet = jest.fn();
  const mockAll = jest.fn();
  const mockPrepare = jest.fn(() => ({
    run: mockRun,
    get: mockGet,
    all: mockAll
  }));
  const mockExec = jest.fn();
  const mockClose = jest.fn();
  
  // Mock class
  return jest.fn(() => ({
    prepare: mockPrepare,
    exec: mockExec,
    close: mockClose
  }));
});

describe('MockAdapter', () => {
  let adapter: MockAdapter;
  
  beforeEach(async () => {
    adapter = new MockAdapter({
      inMemory: true,
      chainId: 'test-chain-001'
    });
    await adapter.connect();
  });
  
  afterEach(async () => {
    await adapter.disconnect();
  });
  
  it('should get the chain ID', async () => {
    // Override the mock implementation
    require('better-sqlite3')().prepare().get.mockReturnValueOnce({
      value: 'test-chain-001'
    });
    
    const chainId = await adapter.getChainId();
    expect(chainId).toBe('test-chain-001');
  });
  
  it('should submit a transaction', async () => {
    const tx: Transaction = {
      sender: 'test-user',
      payload: {
        objectType: 'test',
        action: 'create',
        data: { foo: 'bar' }
      }
    };
    
    const result = await adapter.submitTx(tx);
    
    expect(result).toMatchObject({
      status: 'confirmed',
      sender: tx.sender,
      payload: tx.payload
    });
  });
  
  it('should query state', async () => {
    // Setup mock return value
    require('better-sqlite3')().prepare().all.mockReturnValueOnce([
      {
        id: 'test-1',
        type: 'test',
        owner: 'test-user',
        data: JSON.stringify({ name: 'Test 1' }),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        commit_number: 123
      },
      {
        id: 'test-2',
        type: 'test',
        owner: 'test-user',
        data: JSON.stringify({ name: 'Test 2' }),
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        commit_number: 124
      }
    ]);
    
    require('better-sqlite3')().prepare().get.mockReturnValueOnce({
      count: 2
    });
    
    const result = await adapter.queryState({
      objectType: 'test',
      filter: {
        owner: 'test-user'
      },
      pagination: {
        offset: 0,
        limit: 10
      }
    });
    
    expect(result.total).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      id: 'test-1',
      name: 'Test 1',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      commitNumber: 123
    });
  });
  
  it('should watch events', async () => {
    // Create a mock events array
    const mockEvents = [
      {
        id: 'event-1',
        type: 'test_created',
        commit_number: 123,
        timestamp: '2025-01-01T00:00:00Z',
        address: 'test-user',
        data: JSON.stringify({ id: 'test-1' })
      },
      {
        id: 'event-2',
        type: 'test_updated',
        commit_number: 124,
        timestamp: '2025-01-02T00:00:00Z',
        address: 'test-user',
        data: JSON.stringify({ id: 'test-1' })
      }
    ];
    
    // Setup mock return value
    require('better-sqlite3')().prepare().all.mockReturnValueOnce(mockEvents);
    
    // Create an async iterator to test events
    const eventFilter = {
      eventTypes: ['test_created', 'test_updated'],
      address: 'test-user'
    };
    
    const iterator = adapter.watchEvents(eventFilter);
    
    // Get the first event
    const result1 = await iterator.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toMatchObject({
      type: 'test_created',
      commitNumber: 123,
      address: 'test-user'
    });
    
    // Simulate a new event through the EventEmitter
    setTimeout(() => {
      adapter['eventEmitter'].emit('event', {
        type: 'test_updated',
        commitNumber: 125,
        timestamp: '2025-01-03T00:00:00Z',
        address: 'test-user',
        data: { id: 'test-2' }
      });
    }, 10);
    
    // Get the second event
    const result2 = await iterator.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toMatchObject({
      type: 'test_updated',
      commitNumber: 125,
      address: 'test-user'
    });
    
    // Close the iterator
    await iterator.return();
  });
  
  it('should get the current commit number', async () => {
    // Setup mock return value
    require('better-sqlite3')().prepare().get.mockReturnValueOnce({
      value: '42'
    });
    
    const commitNumber = await adapter.getCurrentCommit();
    expect(commitNumber).toBe(42);
  });
  
  it('should estimate fees', async () => {
    const fee = await adapter.estimateFee({
      sender: 'test-user',
      payload: { action: 'test' }
    });
    
    expect(fee).toBe(0.05);
  });
  
  it('should disconnect properly', async () => {
    await adapter.disconnect();
    
    // Trying to use after disconnect should throw
    await expect(adapter.getChainId()).rejects.toThrow('not connected');
  });
});
