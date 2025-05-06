/**
 * Updated adapters module for OmeoneChain
 * 
 * This module exports the blockchain adapters for connecting to different networks,
 * properly aligned with the existing project structure.
 */

// Export adapter implementations
export { RebasedAdapter } from './rebased-adapter';
export { EVMAdapter } from './evm-adapter';
export { MockAdapterV2 } from './mock-adapter-v2';

// Export adapter factory
export { 
  AdapterFactory, 
  AdapterType,
  type RebasedAdapterConfig,
  type EVMAdapterConfig,
  type MockAdapterConfig,
  type AdapterConfig
} from './adapter-factory-updated';

// Export adapter-specific type helpers
export * from './types/recommendation-adapters';
export * from './types/reputation-adapters';
export * from './types/token-adapters';

// Re-export chain types
export type { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../types/chain';
