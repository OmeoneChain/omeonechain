// code/poc/core/src/config/network-config.ts

export interface NetworkConfig {
  name: string;
  chainId: string;
  rpcEndpoint: string;
  explorerUrl: string;
  faucetUrl?: string;
  gasPrice: number;
  confirmationBlocks: number;
  blockTime: number; // milliseconds
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

// Network definitions
export const NETWORKS: Record<string, NetworkConfig> = {
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
    rpcEndpoint: "https://api.testnet.rebased.iota.org", // Placeholder - will update with real endpoint
    explorerUrl: "https://explorer.testnet.rebased.iota.org",
    faucetUrl: "https://faucet.testnet.rebased.iota.org",
    gasPrice: 50, // μMIOTA
    confirmationBlocks: 3,
    blockTime: 5000,
    features: {
      sponsorWallet: true,
      moveVM: true,
      dagStructure: true,
    },
  },

  "rebased-mainnet": {
    name: "IOTA Rebased Mainnet",
    chainId: "rebased-mainnet-001",
    rpcEndpoint: "https://api.rebased.iota.org", // Placeholder - will update with real endpoint
    explorerUrl: "https://explorer.rebased.iota.org",
    gasPrice: 50, // μMIOTA
    confirmationBlocks: 5,
    blockTime: 5000,
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
export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
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
export const ENVIRONMENTS: Record<string, NetworkEnvironment> = {
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
export function validateNetworkConfig(config: NetworkConfig): boolean {
  return !!(
    config.name &&
    config.chainId &&
    config.rpcEndpoint &&
    config.gasPrice >= 0 &&
    config.confirmationBlocks > 0 &&
    config.blockTime > 0
  );
}

export function validateContractAddresses(addresses: ContractAddresses): boolean {
  return !!(
    addresses.omeoneToken &&
    addresses.rewardDistribution &&
    addresses.governance &&
    addresses.reputation
  );
}

export function isNetworkAvailable(networkName: string): boolean {
  return networkName in NETWORKS;
}

export function isMoveVMNetwork(networkName: string): boolean {
  const network = NETWORKS[networkName];
  return network?.features.moveVM ?? false;
}

export function isDagNetwork(networkName: string): boolean {
  const network = NETWORKS[networkName];
  return network?.features.dagStructure ?? false;
}

export function hasSponsorWallet(networkName: string): boolean {
  const network = NETWORKS[networkName];
  return network?.features.sponsorWallet ?? false;
}