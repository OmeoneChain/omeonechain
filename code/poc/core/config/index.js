// code/poc/core/src/config/index.ts
// Main configuration exports - Conservative fix: explicit exports to avoid conflicts
export * from './network-config';
export * from './contract-registry';
// Convenience exports for common use cases
export { environmentManager } from './environment-manager';
export { contractRegistry } from './contract-registry';
// Utility functions for quick access
import { environmentManager } from './environment-manager';
import { contractRegistry } from './contract-registry';
/**
 * Get current configuration state summary
 */
export async function getConfigurationState() {
    const envStatus = await environmentManager.getEnvironmentStatus();
    const networkInfo = environmentManager.getNetworkInfo();
    const contractReport = contractRegistry.generateContractReport();
    return {
        environment: environmentManager.getCurrentEnvironment(),
        network: {
            name: networkInfo.name,
            chainId: networkInfo.chainId,
            isHealthy: envStatus.isHealthy,
        },
        contracts: {
            deployed: contractReport.summary.deployedContracts,
            total: contractReport.summary.totalContracts,
            verified: contractReport.summary.verifiedContracts,
        },
        features: {
            moveVM: networkInfo.isMoveVM,
            dag: networkInfo.isDag,
            sponsorWallet: networkInfo.hasSponsorWallet,
        },
    };
}
/**
 * Get network capabilities
 */
export function getNetworkCapabilities() {
    const networkInfo = environmentManager.getNetworkInfo();
    const contractReport = contractRegistry.generateContractReport();
    return {
        hasTokenTransfers: contractRegistry.isContractDeployed('OmeoneToken'),
        hasSmartContracts: networkInfo.isMoveVM || networkInfo.chainId.includes('evm'),
        hasGovernance: contractRegistry.isContractDeployed('Governance'),
        hasReputationSystem: contractRegistry.isContractDeployed('Reputation'),
        hasNFTSupport: contractRegistry.isContractDeployed('NFTTickets'),
        supportsSponsoredTransactions: networkInfo.hasSponsorWallet,
        supportsDagStructure: networkInfo.isDag,
        supportsRealTimeUpdates: true, // Always supported via our API layer
    };
}
/**
 * Quick health check
 */
export async function performQuickHealthCheck() {
    const envStatus = await environmentManager.getEnvironmentStatus();
    const contractValidation = contractRegistry.validateContractAddresses();
    const issues = [...envStatus.errors];
    const warnings = [...envStatus.warnings];
    if (!contractValidation.valid) {
        issues.push(...contractValidation.errors);
    }
    return {
        healthy: envStatus.isHealthy && contractValidation.valid,
        issues,
        warnings,
    };
}
/**
 * Initialize configuration system
 */
export async function initializeConfiguration() {
    console.log('🚀 Initializing OmeoneChain configuration system...');
    try {
        // Load contracts from current environment
        await contractRegistry.loadContractsFromEnvironment();
        // Perform initial health check
        const healthCheck = await performQuickHealthCheck();
        if (healthCheck.healthy) {
            console.log('✅ Configuration system initialized successfully');
        }
        else {
            console.warn('⚠️ Configuration system initialized with warnings:', healthCheck.warnings);
            if (healthCheck.issues.length > 0) {
                console.error('❌ Configuration issues detected:', healthCheck.issues);
            }
        }
        // Log current state
        const state = await getConfigurationState();
        console.log('📊 Current configuration:', {
            environment: state.environment,
            network: state.network.name,
            contracts: `${state.contracts.deployed}/${state.contracts.total} deployed`,
            features: Object.entries(state.features)
                .filter(([_, enabled]) => enabled)
                .map(([feature, _]) => feature)
                .join(', '),
        });
    }
    catch (error) {
        console.error('❌ Failed to initialize configuration system:', error);
        throw error;
    }
}
/**
 * Clean up configuration system
 */
export function cleanupConfiguration() {
    environmentManager.cleanup();
    console.log('🧹 Configuration system cleaned up');
}
