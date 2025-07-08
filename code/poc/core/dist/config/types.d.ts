type EnvironmentName = string;
type EnvironmentStatus = string;
export type { NetworkConfig, ContractAddresses, NetworkEnvironment, } from './network-config.js';
export type { EnvironmentName, EnvironmentStatus };
export type { ContractMetadata, DeploymentInfo, } from './contract-registry.js';
export interface ConfigurationState {
    environment: EnvironmentName;
    network: {
        name: string;
        chainId: string;
        isHealthy: boolean;
    };
    contracts: {
        deployed: number;
        total: number;
        verified: number;
    };
    features: {
        moveVM: boolean;
        dag: boolean;
        sponsorWallet: boolean;
    };
}
export interface NetworkCapabilities {
    hasTokenTransfers: boolean;
    hasSmartContracts: boolean;
    hasGovernance: boolean;
    hasReputationSystem: boolean;
    hasNFTSupport: boolean;
    supportsSponsoredTransactions: boolean;
    supportsDagStructure: boolean;
    supportsRealTimeUpdates: boolean;
}
export interface DeploymentConfiguration {
    contracts: {
        deployOrder: string[];
        dependencies: Record<string, string[]>;
        initializationParams: Record<string, any>;
    };
    migration: {
        dataBackup: boolean;
        rollbackPlan: boolean;
        verificationSteps: string[];
    };
    monitoring: {
        healthChecks: boolean;
        alerting: boolean;
        analytics: boolean;
    };
}
