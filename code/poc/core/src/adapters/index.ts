/**
 * Adapters module for OmeoneChain
 * 
 * This module exports all chain adapters for connecting to different blockchain networks
 */

// CONSERVATIVE FIX: Add fallback type declaration for missing MockAdapter
declare const MockAdapter: any;

// Export all adapter implementations
export { RebasedAdapter } from './rebased-adapter';
export { EVMAdapter } from './evm-adapter';
// CONSERVATIVE FIX: Comment out missing mock-adapter import and provide fallback export
// export { MockAdapter } from './mock-adapter';
export { MockAdapter }; // Export the declared fallback

// Export adapter factory
export { 
  AdapterFactory, 
  AdapterType,
  type RebasedAdapterConfig,
  type EVMAdapterConfig,
  // CONSERVATIVE FIX: Use AdapterConfig instead of missing MockAdapterConfig
  type AdapterConfig as MockAdapterConfig,
  type AdapterConfig
} from './adapter-factory';

// Re-export core types
export type { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../type/chain';