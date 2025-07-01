"use strict";
// code/poc/core/src/config/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractRegistry = exports.environmentManager = void 0;
exports.getConfigurationState = getConfigurationState;
exports.getNetworkCapabilities = getNetworkCapabilities;
exports.performQuickHealthCheck = performQuickHealthCheck;
exports.initializeConfiguration = initializeConfiguration;
exports.cleanupConfiguration = cleanupConfiguration;
// Main configuration exports
__exportStar(require("./network-config"), exports);
__exportStar(require("./environment-manager"), exports);
__exportStar(require("./contract-registry"), exports);
__exportStar(require("./types"), exports);
// Convenience exports for common use cases
var environment_manager_1 = require("./environment-manager");
Object.defineProperty(exports, "environmentManager", { enumerable: true, get: function () { return environment_manager_1.environmentManager; } });
var contract_registry_1 = require("./contract-registry");
Object.defineProperty(exports, "contractRegistry", { enumerable: true, get: function () { return contract_registry_1.contractRegistry; } });
// Utility functions for quick access
const environment_manager_2 = require("./environment-manager");
const contract_registry_2 = require("./contract-registry");
/**
 * Get current configuration state summary
 */
async function getConfigurationState() {
    const envStatus = await environment_manager_2.environmentManager.getEnvironmentStatus();
    const networkInfo = environment_manager_2.environmentManager.getNetworkInfo();
    const contractReport = contract_registry_2.contractRegistry.generateContractReport();
    return {
        environment: environment_manager_2.environmentManager.getCurrentEnvironment(),
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
function getNetworkCapabilities() {
    const networkInfo = environment_manager_2.environmentManager.getNetworkInfo();
    const contractReport = contract_registry_2.contractRegistry.generateContractReport();
    return {
        hasTokenTransfers: contract_registry_2.contractRegistry.isContractDeployed('OmeoneToken'),
        hasSmartContracts: networkInfo.isMoveVM || networkInfo.chainId.includes('evm'),
        hasGovernance: contract_registry_2.contractRegistry.isContractDeployed('Governance'),
        hasReputationSystem: contract_registry_2.contractRegistry.isContractDeployed('Reputation'),
        hasNFTSupport: contract_registry_2.contractRegistry.isContractDeployed('NFTTickets'),
        supportsSponsoredTransactions: networkInfo.hasSponsorWallet,
        supportsDagStructure: networkInfo.isDag,
        supportsRealTimeUpdates: true, // Always supported via our API layer
    };
}
/**
 * Quick health check
 */
async function performQuickHealthCheck() {
    const envStatus = await environment_manager_2.environmentManager.getEnvironmentStatus();
    const contractValidation = contract_registry_2.contractRegistry.validateContractAddresses();
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
async function initializeConfiguration() {
    console.log('🚀 Initializing OmeoneChain configuration system...');
    try {
        // Load contracts from current environment
        await contract_registry_2.contractRegistry.loadContractsFromEnvironment();
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
function cleanupConfiguration() {
    environment_manager_2.environmentManager.cleanup();
    console.log('🧹 Configuration system cleaned up');
}
//# sourceMappingURL=index.js.map