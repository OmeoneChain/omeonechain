"use strict";
// code/poc/core/src/config/network-config.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENVIRONMENTS = exports.CONTRACT_ADDRESSES = exports.NETWORKS = void 0;
exports.validateNetworkConfig = validateNetworkConfig;
exports.validateContractAddresses = validateContractAddresses;
exports.isNetworkAvailable = isNetworkAvailable;
exports.isMoveVMNetwork = isMoveVMNetwork;
exports.isDagNetwork = isDagNetwork;
exports.hasSponsorWallet = hasSponsorWallet;
// Network definitions
exports.NETWORKS = {
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
        indexerEndpoint: "https://indexer.testnet.iota.cafe:443", // Added indexer endpoint
        explorerUrl: "https://explorer.testnet.iota.cafe", // Updated explorer URL
        faucetUrl: "https://faucet.testnet.iota.cafe", // Updated faucet URL
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
    // EVM fallback networks - MOVED INSIDE THE NETWORKS OBJECT
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
}; // ADDED MISSING CLOSING BRACE AND SEMICOLON
// Contract addresses by network
exports.CONTRACT_ADDRESSES = {
    mock: {
        omeoneToken: "0x1111111111111111111111111111111111111111",
        rewardDistribution: "0x2222222222222222222222222222222222222222",
        governance: "0x3333333333333333333333333333333333333333",
        reputation: "0x4444444444444444444444444444444444444444",
        nftTickets: "0x5555555555555555555555555555555555555555",
    },
    "rebased-testnet": {
        // Will be populated after contract deployment
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
        nftTickets: "",
    },
    "rebased-mainnet": {
        // Will be populated for mainnet deployment
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
    },
    "polygon-testnet": {
        // EVM fallback addresses
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
    },
    "arbitrum-testnet": {
        // EVM fallback addresses
        omeoneToken: "",
        rewardDistribution: "",
        governance: "",
        reputation: "",
    },
};
// Environment configurations
exports.ENVIRONMENTS = {
    development: {
        network: exports.NETWORKS.mock,
        contracts: exports.CONTRACT_ADDRESSES.mock,
        monitoring: {
            enabled: true,
            metricsEndpoint: "http://localhost:3001/metrics",
        },
    },
    testnet: {
        network: exports.NETWORKS["rebased-testnet"],
        contracts: exports.CONTRACT_ADDRESSES["rebased-testnet"],
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
        network: exports.NETWORKS["rebased-mainnet"],
        contracts: exports.CONTRACT_ADDRESSES["rebased-mainnet"],
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
        network: exports.NETWORKS["polygon-testnet"],
        contracts: exports.CONTRACT_ADDRESSES["polygon-testnet"],
        monitoring: {
            enabled: true,
        },
    },
};
// Validation functions
function validateNetworkConfig(config) {
    return !!(config.name &&
        config.chainId &&
        config.rpcEndpoint &&
        config.gasPrice >= 0 &&
        config.confirmationBlocks > 0 &&
        config.blockTime > 0);
}
function validateContractAddresses(addresses) {
    return !!(addresses.omeoneToken &&
        addresses.rewardDistribution &&
        addresses.governance &&
        addresses.reputation);
}
function isNetworkAvailable(networkName) {
    return networkName in exports.NETWORKS;
}
function isMoveVMNetwork(networkName) {
    const network = exports.NETWORKS[networkName];
    return network?.features.moveVM ?? false;
}
function isDagNetwork(networkName) {
    const network = exports.NETWORKS[networkName];
    return network?.features.dagStructure ?? false;
}
function hasSponsorWallet(networkName) {
    const network = exports.NETWORKS[networkName];
    return network?.features.sponsorWallet ?? false;
}
//# sourceMappingURL=network-config.js.map