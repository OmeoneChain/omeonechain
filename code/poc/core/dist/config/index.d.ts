export * from './network-config';
export * from './environment-manager';
export * from './contract-registry';
export * from './types';
export { environmentManager } from './environment-manager';
export { contractRegistry } from './contract-registry';
import type { ConfigurationState, NetworkCapabilities } from './types';
/**
 * Get current configuration state summary
 */
export declare function getConfigurationState(): Promise<ConfigurationState>;
/**
 * Get network capabilities
 */
export declare function getNetworkCapabilities(): NetworkCapabilities;
/**
 * Quick health check
 */
export declare function performQuickHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
}>;
/**
 * Initialize configuration system
 */
export declare function initializeConfiguration(): Promise<void>;
/**
 * Clean up configuration system
 */
export declare function cleanupConfiguration(): void;
