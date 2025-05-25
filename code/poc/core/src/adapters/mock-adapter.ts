/**
 * Mock Chain Adapter
 * 
 * Simulates a blockchain using SQLite for testing purposes
 * Based on Technical Specifications A.1.3 (MockAdapter)
 */

import { 
  ChainAdapter, 
  Transaction, 
  TransactionResult, 
  StateQuery, 
  EventFilter, 
  Event 
} from './chain-adapter';
import { ChainTransaction } from '../types/chain'; // Add this import
import { Database } from 'better-sqlite3';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock adapter configuration
 */
export interface MockAdapterConfig {
  /**
   * In-memory SQLite database (default: true)
   */
  inMemory?: boolean;
  
  /**
   * Path to SQLite database file (used if inMemory is false)
   */
  dbPath?: string;
  
  /**
   * Initial commit number (default: 1)
   */
  initialCommit?: number;
  
  /**
   * Chain ID for the mock network
   */
  chainId?: string;
  
  /**
   * Simulated transaction time in ms (default: 100)
   */
  txTime?: number;
  
  /**
   * Simulated fee in µIOTA (default: 0.05)
   */
  mockFee?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MockAdapterConfig = {
  inMemory: true,
  initialCommit: 1,
  chainId: 'mock-chain-001',
  txTime: 100,
  mockFee: 0.05
};

/**
 * Mock implementation of the Chain Adapter interface
 * Simulates a blockchain using SQLite for testing
 */
export class MockAdapter implements ChainAdapter {
  private db: Database | null = null;
  private config: MockAdapterConfig;
  private currentCommit: number;
  private eventEmitter: EventEmitter;
  private connected: boolean = false;
  
  // Storage for the new transaction format
  private chainTransactions: ChainTransaction[] = [];
  
  /**
   * Create a new MockAdapter instance
   * 
   * @param config Adapter configuration
   */
  constructor(config: MockAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentCommit = this.config.initialCommit || 1;
    this.eventEmitter = new EventEmitter();
  }
  
  /**
   * Initialize the SQLite database
   * 
   * @private
   */
  private initializeDatabase(): void {
    // Import dynamically to avoid issues in browser environments
    const BetterSqlite3 = require('better-sqlite3');
    
    // Create/connect to the database
    if (this.config.inMemory) {
      this.db = new BetterSqlite3(':memory:');
    } else if (this.config.dbPath) {
      this.db = new BetterSqlite3(this.config.dbPath);
    } else {
      throw new Error('Either inMemory must be true or dbPath must be provided');
    }
    
    // Create tables
    this.db.exec(`
      -- Transactions table
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        commit_number INTEGER NOT NULL,
        object_id TEXT,
        error TEXT,
        details TEXT
      );
      
      -- Chain transactions table (new format)
      CREATE TABLE IF NOT EXISTS chain_transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL
      );
      
      -- Objects table
      CREATE TABLE IF NOT EXISTS objects (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        owner TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        commit_number INTEGER NOT NULL
      );
      
      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        commit_number INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        address TEXT NOT NULL,
        data TEXT NOT NULL
      );
      
      -- Chain state table
      CREATE TABLE IF NOT EXISTS chain_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    // Set initial chain state
    const stmtInit = this.db.prepare('INSERT OR IGNORE INTO chain_state (key, value) VALUES (?, ?)');
    stmtInit.run('current_commit', this.currentCommit.toString());
    stmtInit.run('chain_id', this.config.chainId);
  }
  
  /**
   * NEW METHOD: Submit a transaction (required by GovernanceEngine)
   * 
   * @param transaction Transaction data to submit
   * @returns Transaction ID
   */
  async submitTransaction(transaction: Partial<ChainTransaction>): Promise<string> {
    this.ensureConnected();
    
    // Generate complete transaction
    const fullTransaction: ChainTransaction = {
      id: transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: transaction.type || 'unknown',
      data: transaction.data || {},
      timestamp: transaction.timestamp || new Date(),
      status: 'confirmed'
    };

    // Store in memory
    this.chainTransactions.push(fullTransaction);
    
    // Store in database
    const stmt = this.db!.prepare(`
      INSERT INTO chain_transactions (id, type, data, timestamp, status) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      fullTransaction.id,
      fullTransaction.type,
      JSON.stringify(fullTransaction.data),
      fullTransaction.timestamp.toISOString(),
      fullTransaction.status
    );
    
    // Emit event for listeners
    const event: Event = {
      type: `transaction_${fullTransaction.type}`,
      commitNumber: this.currentCommit++,
      timestamp: fullTransaction.timestamp.toISOString(),
      address: 'system',
      data: fullTransaction.data
    };
    
    this.eventEmitter.emit('event', event);
    
    // Record the event
    const eventStmt = this.db!.prepare(`
      INSERT INTO events (id, type, commit_number, timestamp, address, data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    eventStmt.run(
      uuidv4(),
      event.type,
      event.commitNumber,
      event.timestamp,
      event.address,
      JSON.stringify(event.data)
    );

    return fullTransaction.id;
  }
  
  /**
   * Get chain transactions (helper method for testing)
   */
  getChainTransactions(): ChainTransaction[] {
    return [...this.chainTransactions];
  }
  
  /**
   * Get transactions by type (helper method for testing)
   */
  getTransactionsByType(type: string): ChainTransaction[] {
    return this.chainTransactions.filter(tx => tx.type === type);
  }
  
  /**
   * Clear all chain transactions (helper method for testing)
   */
  clearChainTransactions(): void {
    this.chainTransactions = [];
    if (this.db) {
      const stmt = this.db.prepare('DELETE FROM chain_transactions');
      stmt.run();
    }
  }
  
  /**
   * Get the chain ID
   */
  async getChainId(): Promise<string> {
    this.ensureConnected();
    const stmt = this.db!.prepare('SELECT value FROM chain_state WHERE key = ?');
    const result = stmt.get('chain_id');
    return result?.value ?? this.config.chainId;
  }
  
  /**
   * Submit a transaction to the mock blockchain (original method)
   * 
   * @param tx Transaction to submit
   * @returns Transaction result
   */
  async submitTx(tx: Transaction): Promise<TransactionResult> {
    this.ensureConnected();
    
    // Generate ID if not provided
    const txId = tx.id || uuidv4();
    const timestamp = new Date().toISOString();
    const commitNumber = this.currentCommit++;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.config.txTime));
    
    // Generate a deterministic object ID if creating a new object
    const objectId = tx.payload?.objectType ? 
      `${tx.payload.objectType}-${commitNumber}-${txId.substring(0, 8)}` : 
      undefined;
    
    // Insert transaction
    const stmt = this.db!.prepare(`
      INSERT INTO transactions (
        id, sender, payload, status, timestamp, commit_number, object_id, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      txId,
      tx.sender,
      JSON.stringify(tx.payload),
      'confirmed',
      timestamp,
      commitNumber,
      objectId,
      JSON.stringify(tx.options || {})
    );
    
    // If creating an object, store it
    if (tx.payload?.objectType && tx.payload?.data) {
      const objStmt = this.db!.prepare(`
        INSERT INTO objects (
          id, type, owner, data, created_at, updated_at, commit_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      objStmt.run(
        objectId,
        tx.payload.objectType,
        tx.sender,
        JSON.stringify(tx.payload.data),
        timestamp,
        timestamp,
        commitNumber
      );
    }
    
    // Update chain state
    const updateStmt = this.db!.prepare('UPDATE chain_state SET value = ? WHERE key = ?');
    updateStmt.run(commitNumber.toString(), 'current_commit');
    
    // Emit event
    const event: Event = {
      type: tx.payload?.objectType ? `${tx.payload.objectType}_created` : 'transaction',
      commitNumber,
      timestamp,
      address: tx.sender,
      data: tx.payload
    };
    
    this.eventEmitter.emit('event', event);
    
    // Record the event
    const eventStmt = this.db!.prepare(`
      INSERT INTO events (
        id, type, commit_number, timestamp, address, data
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    eventStmt.run(
      uuidv4(),
      event.type,
      event.commitNumber,
      event.timestamp,
      event.address,
      JSON.stringify(event.data)
    );
    
    // Return transaction result
    return {
      id: txId,
      status: 'confirmed',
      timestamp,
      commitNumber,
      objectId,
      details: tx.options
    };
  }
  
  /**
   * Query the mock blockchain state
   * 
   * @param query Query parameters
   * @returns Query results
   */
  async queryState<T>(query: StateQuery): Promise<{
    results: T[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    this.ensureConnected();
    
    // Build query
    let sql = `SELECT * FROM objects WHERE type = ?`;
    const params: any[] = [query.objectType];
    
    // Apply filters
    if (query.filter) {
      for (const [key, value] of Object.entries(query.filter)) {
        if (key === 'owner') {
          sql += ` AND owner = ?`;
          params.push(value);
        } else {
          sql += ` AND json_extract(data, '$.${key}') = ?`;
          params.push(value);
        }
      }
    }
    
    // Apply sorting
    if (query.sort) {
      const direction = query.sort.direction === 'desc' ? 'DESC' : 'ASC';
      if (query.sort.field === 'created_at' || query.sort.field === 'updated_at' || query.sort.field === 'commit_number') {
        sql += ` ORDER BY ${query.sort.field} ${direction}`;
      } else {
        sql += ` ORDER BY json_extract(data, '$.${query.sort.field}') ${direction}`;
      }
    } else {
      sql += ` ORDER BY commit_number DESC`;
    }
    
    // Get total count
    const countStmt = this.db!.prepare(`SELECT COUNT(*) as count FROM (${sql})`);
    const countResult = countStmt.get(...params);
    const total = countResult?.count || 0;
    
    // Apply pagination
    if (query.pagination) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(query.pagination.limit, query.pagination.offset);
    }
    
    // Execute query
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params);
    
    // Transform results
    const results = rows.map(row => {
      const data = JSON.parse(row.data);
      return {
        id: row.id,
        ...data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        commitNumber: row.commit_number
      } as T;
    });
    
    // Return results with pagination
    return {
      results,
      total,
      ...(query.pagination && {
        pagination: {
          offset: query.pagination.offset,
          limit: query.pagination.limit,
          hasMore: query.pagination.offset + results.length < total
        }
      })
    };
  }
  
  /**
   * Watch for events on the mock blockchain
   * 
   * @param filter Event filter
   * @returns Async iterator of events
   */
  watchEvents(filter: EventFilter): AsyncIterator<Event> {
    this.ensureConnected();
    
    let done = false;
    const queue: Event[] = [];
    const listener = (event: Event) => {
      // Check if the event matches the filter
      if (
        filter.eventTypes.includes(event.type) &&
        (!filter.address || filter.address === event.address) &&
        (!filter.fromCommit || event.commitNumber >= filter.fromCommit)
      ) {
        queue.push(event);
      }
    };
    
    // Register event listener
    this.eventEmitter.on('event', listener);
    
    // Load historical events
    const sql = `
      SELECT * FROM events 
      WHERE type IN (${filter.eventTypes.map(() => '?').join(',')}) 
      ${filter.address ? 'AND address = ?' : ''}
      ${filter.fromCommit ? 'AND commit_number >= ?' : ''}
      ORDER BY commit_number ASC
    `;
    
    const params: any[] = [...filter.eventTypes];
    if (filter.address) params.push(filter.address);
    if (filter.fromCommit) params.push(filter.fromCommit);
    
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params);
    
    for (const row of rows) {
      queue.push({
        type: row.type,
        commitNumber: row.commit_number,
        timestamp: row.timestamp,
        address: row.address,
        data: JSON.parse(row.data)
      });
    }
    
    // Return async iterator
    return {
      next: async () => {
        if (done) {
          return { value: undefined, done: true };
        }
        
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        
        // Wait for next event
        return new Promise(resolve => {
          const tempListener = (event: Event) => {
            if (
              filter.eventTypes.includes(event.type) &&
              (!filter.address || filter.address === event.address) &&
              (!filter.fromCommit || event.commitNumber >= filter.fromCommit)
            ) {
              this.eventEmitter.off('event', tempListener);
              resolve({ value: event, done: false });
            }
          };
          
          this.eventEmitter.once('event', tempListener);
        });
      },
      return: async () => {
        done = true;
        this.eventEmitter.off('event', listener);
        return { value: undefined, done: true };
      }
    };
  }
  
  /**
   * Get the current commit/block number
   * 
   * @returns Current commit number
   */
  async getCurrentCommit(): Promise<number> {
    this.ensureConnected();
    const stmt = this.db!.prepare('SELECT value FROM chain_state WHERE key = ?');
    const result = stmt.get('current_commit');
    return parseInt(result?.value || '1', 10);
  }
  
  /**
   * Calculate the estimated fee for a transaction
   * 
   * @param tx Transaction to estimate fee for
   * @returns Estimated fee in smallest units (µIOTA)
   */
  async estimateFee(_tx: Transaction): Promise<number> {
    // For mock purposes, always return the configured fee
    return this.config.mockFee || 0.05;
  }
  
  /**
   * Connect to the mock blockchain
   * 
   * @returns Promise resolving when connected
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      this.initializeDatabase();
      this.connected = true;
    }
  }
  
  /**
   * Disconnect from the mock blockchain
   * 
   * @returns Promise resolving when disconnected
   */
  async disconnect(): Promise<void> {
    if (this.connected && this.db) {
      await this.db.close();
      this.db = null;
      this.connected = false;
      this.eventEmitter.removeAllListeners();
    }
  }
  
  /**
   * Ensure the adapter is connected
   * 
   * @private
   * @throws Error if not connected
   */
  private ensureConnected(): void {
    if (!this.connected || !this.db) {
      throw new Error('MockAdapter is not connected. Call connect() first.');
    }
  }
}
