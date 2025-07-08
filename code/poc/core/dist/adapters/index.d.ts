/**
 * Adapters module for OmeoneChain
 *
 * This module exports all chain adapters for connecting to different blockchain networks
 */
declare const MockAdapter: any;
export { RebasedAdapter } from './rebased-adapter';
export { EVMAdapter } from './evm-adapter';
export { MockAdapter };
export { AdapterFactory, AdapterType, type RebasedAdapterConfig, type EVMAdapterConfig, type AdapterConfig as MockAdapterConfig, type AdapterConfig } from './adapter-factory';
export type { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../type/chain';
