/**
 * Adapters module for OmeoneChain
 * 
 * This module exports all chain adapters for connecting to different blockchain networks
 */

// Export all adapter implementations
export { RebasedAdapter } from './rebased-adapter';
export { EVMAdapter } from './evm-adapter';
export { MockAdapter } from './mock-adapter';

// Export adapter factory
export { 
  AdapterFactory, 
  AdapterType,
  type RebasedAdapterConfig,
  type EVMAdapterConfig,
  type MockAdapterConfig,
  type AdapterConfig
} from './adapter-factory';

// Re-export core types
export type { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../types/chain';
