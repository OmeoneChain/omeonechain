export interface ContractMetadata {
    name: string;
    address: string;
    deployedAt?: Date;
    blockNumber?: number;
    txHash?: string;
    version: string;
    abi?: any;
    moduleId?: string;
    isUpgradeable: boolean;
    verified: boolean;
}
export interface DeploymentInfo {
    networkName: string;
    chainId: string;
    deployer: string;
    deploymentTime: Date;
    gasUsed?: number;
    gasPrice?: number;
    totalCost?: number;
}
export declare class ContractRegistry {
    private contracts;
    private deployments;
    private initialized;
    constructor();
    private initializeRegistry;
    private initializeFallbackContracts;
    registerContract(metadata: Omit<ContractMetadata, 'deployedAt'>): void;
    updateContractAddress(contractName: string, newAddress: string, deploymentInfo?: Partial<DeploymentInfo>): Promise<void>;
    getContract(contractName: string): Promise<ContractMetadata | undefined>;
    getContractAddress(contractName: string): Promise<string>;
    getAllContracts(): Promise<Map<string, ContractMetadata>>;
    getContractsByNetwork(networkName: string): Promise<ContractMetadata[]>;
    isContractDeployed(contractName: string): Promise<boolean>;
    getDeploymentInfo(contractName: string, environment?: string): DeploymentInfo | undefined;
    verifyContract(contractName: string, verified?: boolean): Promise<void>;
    getContractUrl(contractName: string): Promise<string>;
    private getExplorerBaseUrl;
    generateContractReport(): Promise<{
        summary: {
            totalContracts: number;
            deployedContracts: number;
            verifiedContracts: number;
            upgradeableContracts: number;
        };
        contracts: ContractMetadata[];
        environment: string;
        networkInfo: any;
    }>;
    loadContractsFromEnvironment(): Promise<void>;
    private mapContractKey;
    saveContractAddresses(): Promise<void>;
    exportContractAddresses(): Promise<Record<string, string>>;
    private mapContractNameToKey;
    validateContractAddresses(): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private isValidEvmAddress;
    private isValidMoveAddress;
    private ensureInitialized;
    refreshFromEnvironment(): Promise<void>;
}
export declare const contractRegistry: ContractRegistry;
