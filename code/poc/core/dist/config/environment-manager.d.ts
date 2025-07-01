import { NetworkEnvironment, CONTRACT_ADDRESSES } from './network-config';
export type EnvironmentName = 'development' | 'testnet' | 'production' | 'evm-testnet';
export interface EnvironmentStatus {
    name: EnvironmentName;
    isActive: boolean;
    isHealthy: boolean;
    lastChecked: Date;
    errors: string[];
    warnings: string[];
}
export declare class EnvironmentManager {
    private currentEnvironment;
    private environmentCache;
    private statusCache;
    private healthCheckInterval?;
    constructor();
    private detectEnvironment;
    private isValidEnvironment;
    private initializeEnvironment;
    private loadEnvironment;
    private validateEnvironment;
    private cacheEnvironment;
    private performHealthCheck;
    private checkNetworkConnectivity;
    private checkContractStatus;
    private checkMonitoringHealth;
    private startHealthChecking;
    private logEnvironmentDetails;
    getCurrentEnvironment(): EnvironmentName;
    getEnvironment(envName?: EnvironmentName): Promise<NetworkEnvironment>;
    switchEnvironment(envName: EnvironmentName): Promise<void>;
    getEnvironmentStatus(envName?: EnvironmentName): Promise<EnvironmentStatus>;
    getAllEnvironmentStatuses(): Map<EnvironmentName, EnvironmentStatus>;
    getNetworkInfo(): {
        name: string;
        chainId: string;
        isMoveVM: boolean;
        isDag: boolean;
        hasSponsorWallet: boolean;
    };
    isContractDeployed(contractName: keyof typeof CONTRACT_ADDRESSES.mock): Promise<boolean>;
    getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.mock): Promise<string>;
    cleanup(): void;
}
export declare const environmentManager: EnvironmentManager;
