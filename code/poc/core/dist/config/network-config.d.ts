export interface NetworkConfig {
    name: string;
    chainId: string;
    rpcEndpoint: string;
    indexerEndpoint?: string;
    explorerUrl: string;
    faucetUrl?: string;
    gasPrice: number;
    confirmationBlocks: number;
    blockTime: number;
    features: {
        sponsorWallet: boolean;
        moveVM: boolean;
        dagStructure: boolean;
    };
}
export interface ContractAddresses {
    omeoneToken: string;
    rewardDistribution: string;
    governance: string;
    reputation: string;
    nftTickets?: string;
}
export interface NetworkEnvironment {
    network: NetworkConfig;
    contracts: ContractAddresses;
    apiKeys?: {
        ipfsGateway?: string;
        alephNode?: string;
        analytics?: string;
    };
    monitoring: {
        enabled: boolean;
        metricsEndpoint?: string;
        alertingWebhook?: string;
    };
}
export declare const NETWORKS: Record<string, NetworkConfig>;
export declare const CONTRACT_ADDRESSES: Record<string, ContractAddresses>;
export declare const ENVIRONMENTS: Record<string, NetworkEnvironment>;
export declare function validateNetworkConfig(config: NetworkConfig): boolean;
export declare function validateContractAddresses(addresses: ContractAddresses): boolean;
export declare function isNetworkAvailable(networkName: string): boolean;
export declare function isMoveVMNetwork(networkName: string): boolean;
export declare function isDagNetwork(networkName: string): boolean;
export declare function hasSponsorWallet(networkName: string): boolean;
