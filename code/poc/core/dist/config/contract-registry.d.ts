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
    constructor();
    private initializeRegistry;
    registerContract(metadata: Omit<ContractMetadata, 'deployedAt'>): void;
    updateContractAddress(contractName: string, newAddress: string, deploymentInfo?: Partial<DeploymentInfo>): Promise<void>;
    getContract(contractName: string): ContractMetadata | undefined;
    getContractAddress(contractName: string): string;
    getAllContracts(): Map<string, ContractMetadata>;
    getContractsByNetwork(networkName: string): ContractMetadata[];
    isContractDeployed(contractName: string): boolean;
    getDeploymentInfo(contractName: string, environment?: string): DeploymentInfo | undefined;
    verifyContract(contractName: string, verified?: boolean): Promise<void>;
    getContractUrl(contractName: string): string;
    private getExplorerBaseUrl;
    generateContractReport(): {
        summary: {
            totalContracts: number;
            deployedContracts: number;
            verifiedContracts: number;
            upgradeableContracts: number;
        };
        contracts: ContractMetadata[];
        environment: string;
        networkInfo: any;
    };
    loadContractsFromEnvironment(): Promise<void>;
    private mapContractKey;
    saveContractAddresses(): Promise<void>;
    exportContractAddresses(): Record<string, string>;
    private mapContractNameToKey;
    validateContractAddresses(): {
        valid: boolean;
        errors: string[];
    };
    private isValidEvmAddress;
    private isValidMoveAddress;
}
export declare const contractRegistry: ContractRegistry;
