// code/poc/core/src/config/network-config.ts
// Network definitions
export const NETWORKS = {
    mock: {
        name: "Mock Network",
        chainId: "mock-001",
        rpcEndpoint: "http://localhost:3000/mock-rpc",
        explorerUrl: "http://localhost:3000/explorer",
        gasPrice: 0,
        confirmationBlocks: 1,
        blockTime: 100,
        features: {
            sponsorWallet: true,
            moveVM: true,
            dagStructure: true,
        },
    },
    "rebased-testnet": {
        name: "IOTA Rebased Testnet",
        chainId: "rebased-testnet-001",
        rpcEndpoint: "https://api.testnet.iota.cafe:443",
        indexerEndpoint: "https://indexer.testnet.iota.cafe:443",
        explorerUrl: "https://explorer.testnet.iota.cafe",
        faucetUrl: "https://faucet.testnet.iota.cafe",
        gasPrice: 50, // μMIOTA - actual testnet gas price
        confirmationBlocks: 3,
        blockTime: 5000, // 5 seconds for testnet
        features: {
            sponsorWallet: true,
            moveVM: true,
            dagStructure: true,
        },
    },
    "rebased-devnet": {
        name: "IOTA Rebased DevNet",
        chainId: "rebased-devnet-001",
        rpcEndpoint: "https://api.devnet.iota.cafe:443",
        indexerEndpoint: "https://indexer.devnet.iota.cafe:443",
        explorerUrl: "https://explorer.devnet.iota.cafe",
        faucetUrl: "https://faucet.devnet.iota.cafe",
        gasPrice: 50, // μMIOTA
        confirmationBlocks: 1, // DevNet is faster
        blockTime: 3000, // 3 seconds for DevNet
        features: {
            sponsorWallet: true,
            moveVM: true,
            dagStructure: true,
        },
    },
    "rebased-mainnet": {
        name: "IOTA Rebased Mainnet",
        chainId: "rebased-mainnet-001",
        rpcEndpoint: "https://api.mainnet.iota.cafe:443", // Will be available May 5, 2025
        indexerEndpoint: "https://indexer.mainnet.iota.cafe:443",
        explorerUrl: "https://explorer.iota.org", // Main explorer
        gasPrice: 50, // μMIOTA - actual mainnet gas price
        confirmationBlocks: 5, // More confirmations for mainnet security
        blockTime: 5000, // 5 seconds
        features: {
            sponsorWallet: true,
            moveVM: true,
            dagStructure: true,
        },
    },
    // EVM fallback networks
    "polygon-testnet": {
        name: "Polygon Mumbai Testnet",
        chainId: "80001",
        rpcEndpoint: "https://rpc-mumbai.maticvigil.com",
        explorerUrl: "https://mumbai.polygonscan.com",
        faucetUrl: "https://faucet.polygon.technology",
        gasPrice: 30000000000, // 30 gwei
        confirmationBlocks: 3,
        blockTime: 2000,
        features: {
            sponsorWallet: false,
            moveVM: false,
            dagStructure: false,
        },
    },
    "arbitrum-testnet": {
        name: "Arbitrum Goerli Testnet",
        chainId: "421613",
        rpcEndpoint: "https://goerli-rollup.arbitrum.io/rpc",
        explorerUrl: "https://testnet.arbiscan.io",
        faucetUrl: "https://bridge.arbitrum.io",
        gasPrice: 100000000, // 0.1 gwei
        confirmationBlocks: 1,
        blockTime: 1000,
        features: {
            sponsorWallet: false,
            moveVM: false,
            dagStructure: false,
        },
    },
};
// Contract addresses by network
export const CONTRACT_ADDRESSES = {
    mock: {
        omeoneToken: "0x1111111111111111111111111111111111111111",
        rewardDistribution: "0x2222222222222222222222222222222222222222",
        governance: "0x3333333333333333333333333333333333333333",
        reputation: "0x4444444444444444444444444444444444444444",
        recommendation: "0x5555555555555555555555555555555555555555",
        nftTickets: "0x6666666666666666666666666666666666666666",
    },
    "rebased-testnet": {
        // ✅ LIVE DEPLOYED CONTRACTS - Updated with real Package IDs from IOTA explorer
        omeoneToken: "0x8e2115e374da187479791caf2a6591b5a3b8579c8550089e922ce673453e0f80",
        rewardDistribution: "0x94be5e4138473ac370ff98227c25ff6c0a77bffe72d282854dd70c37e1fadf0f",
        governance: "0x7429a0ec403c1ea8cc33637c946983047404f13e2e2ae801cbfe5df6b067b39a",
        reputation: "0xd5b409715fc8b81866e362bc851c9ef6fc36d58e79d6595f280c04cc824e3955",
        recommendation: "0x2944ad31391686be62e955acd908e7b8905c89e78207e6d1bea69f25220bc7a3",
        nftTickets: "", // To be deployed later
    },
    "rebased-mainnet": {
        // Will be populated for mainnet deployment
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
        recommendation: "",
        nftTickets: "",
    },
    "polygon-testnet": {
        // EVM fallback addresses
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
        recommendation: "",
        nftTickets: "",
    },
    "arbitrum-testnet": {
        // EVM fallback addresses
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
        recommendation: "",
        nftTickets: "",
    },
};
// Environment configurations
export const ENVIRONMENTS = {
    development: {
        network: NETWORKS.mock,
        contracts: CONTRACT_ADDRESSES.mock,
        monitoring: {
            enabled: true,
            metricsEndpoint: "http://localhost:3001/metrics",
        },
    },
    testnet: {
        network: NETWORKS["rebased-testnet"],
        contracts: CONTRACT_ADDRESSES["rebased-testnet"],
        apiKeys: {
            ipfsGateway: process.env.IPFS_GATEWAY_KEY,
            alephNode: process.env.ALEPH_NODE_KEY,
            analytics: process.env.ANALYTICS_KEY,
        },
        monitoring: {
            enabled: true,
            metricsEndpoint: process.env.METRICS_ENDPOINT,
            alertingWebhook: process.env.ALERT_WEBHOOK_URL,
        },
    },
    production: {
        network: NETWORKS["rebased-mainnet"],
        contracts: CONTRACT_ADDRESSES["rebased-mainnet"],
        apiKeys: {
            ipfsGateway: process.env.IPFS_GATEWAY_KEY,
            alephNode: process.env.ALEPH_NODE_KEY,
            analytics: process.env.ANALYTICS_KEY,
        },
        monitoring: {
            enabled: true,
            metricsEndpoint: process.env.METRICS_ENDPOINT,
            alertingWebhook: process.env.ALERT_WEBHOOK_URL,
        },
    },
    // Fallback environments
    "evm-testnet": {
        network: NETWORKS["polygon-testnet"],
        contracts: CONTRACT_ADDRESSES["polygon-testnet"],
        monitoring: {
            enabled: true,
        },
    },
};
// Validation functions
export function validateNetworkConfig(config) {
    return !!(config.name &&
        config.chainId &&
        config.rpcEndpoint &&
        config.gasPrice >= 0 &&
        config.confirmationBlocks > 0 &&
        config.blockTime > 0);
}
export function validateContractAddresses(addresses) {
    return !!(addresses.omeoneToken &&
        addresses.rewardDistribution &&
        addresses.governance &&
        addresses.reputation &&
        addresses.recommendation
    // nftTickets is optional, so not required for validation
    );
}
export function isNetworkAvailable(networkName) {
    return networkName in NETWORKS;
}
export function isMoveVMNetwork(networkName) {
    const network = NETWORKS[networkName];
    return network?.features.moveVM ?? false;
}
export function isDagNetwork(networkName) {
    const network = NETWORKS[networkName];
    return network?.features.dagStructure ?? false;
}
export function hasSponsorWallet(networkName) {
    const network = NETWORKS[networkName];
    return network?.features.sponsorWallet ?? false;
}
