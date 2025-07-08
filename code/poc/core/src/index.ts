/**
 * OmeoneChain Core Package
 * 
 * Main entry point for the OmeoneChain core functionality
 */

// Export types (remove duplicate TangleReference exports)
export * from './type/reputation';
export * from './type/token';
export * from './type/service';

// Export adapters (remove non-existent mock-adapter)
export * from './adapters/chain-adapter';

// Export storage
export * from './storage/storage-provider';
export * from './storage/ipfs-storage';

// Export engines
export * from './recommendation/engine';

// Export from other modules as they are implemented
// export * from './reputation/engine';
// export * from './token/engine';
// export * from './governance/engine';