// code/poc/core/src/config/contract-registry.ts

import { environmentManager } from './environment-manager';

export interface ContractMetadata {
  name: string;
  address: string;
  deployedAt?: Date;
  blockNumber?: number;
  txHash?: string;
  version: string;
  abi?: any; // Contract ABI for EVM contracts
  moduleId?: string; // Module ID for Move contracts
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

export class ContractRegistry {
  private contracts: Map<string, ContractMetadata> = new Map();
  private deployments: Map<string, DeploymentInfo> = new Map();
  private initialized = false;

  constructor() {
    // Don't initialize immediately - wait for environment to be ready
  }

  private async initializeRegistry(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load contract addresses from current environment
      await this.loadContractsFromEnvironment();
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load contracts from environment, using fallback initialization:', error);
      this.initializeFallbackContracts();
      this.initialized = true;
    }
  }

  private initializeFallbackContracts(): void {
    // Fallback initialization with empty addresses that will be populated from environment
    this.registerContract({
      name: 'OmeoneToken',
      address: '', // Will be populated from environment
      version: '1.0.0',
      isUpgradeable: false,
      verified: true,
      moduleId: 'omeone_chain::token::OmeoneToken',
    });

    this.registerContract({
      name: 'RewardDistribution',
      address: '', // Will be populated from environment
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::rewards::RewardDistribution',
    });

    this.registerContract({
      name: 'Governance',
      address: '', // Will be populated from environment
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::governance::Governance',
    });

    this.registerContract({
      name: 'Reputation',
      address: '', // Will be populated from environment
      version: '1.0.0',
      isUpgradeable: false,
      verified: true,
      moduleId: 'omeone_chain::reputation::ReputationSystem',
    });

    this.registerContract({
      name: 'Recommendation',
      address: '', // Will be populated from environment
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::recommendation::RecommendationSystem',
    });

    this.registerContract({
      name: 'NFTTickets',
      address: '', // Will be populated from environment (optional)
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::nft::NFTTickets',
    });
  }

  public registerContract(metadata: Omit<ContractMetadata, 'deployedAt'>): void {
    const fullMetadata: ContractMetadata = {
      ...metadata,
      deployedAt: new Date(),
    };

    this.contracts.set(metadata.name, fullMetadata);
    
    // Only log if address is not empty (avoid spamming logs with empty addresses)
    if (metadata.address && metadata.address.length > 0) {
      console.log(`📋 Registered contract: ${metadata.name} at ${metadata.address}`);
    }
  }

  public async updateContractAddress(
    contractName: string, 
    newAddress: string,
    deploymentInfo?: Partial<DeploymentInfo>
  ): Promise<void> {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }

    // Update contract address
    contract.address = newAddress;
    contract.deployedAt = new Date();

    // Store deployment info if provided
    if (deploymentInfo) {
      const currentEnv = environmentManager.getCurrentEnvironment();
      const networkInfo = environmentManager.getNetworkInfo();
      
      const fullDeploymentInfo: DeploymentInfo = {
        networkName: networkInfo.name,
        chainId: networkInfo.chainId,
        deployer: deploymentInfo.deployer || 'unknown',
        deploymentTime: new Date(),
        ...deploymentInfo,
      };

      this.deployments.set(`${contractName}:${currentEnv}`, fullDeploymentInfo);
    }

    console.log(`✅ Updated contract ${contractName} address to ${newAddress}`);
  }

  public async getContract(contractName: string): Promise<ContractMetadata | undefined> {
    await this.ensureInitialized();
    return this.contracts.get(contractName);
  }

  public async getContractAddress(contractName: string): Promise<string> {
    await this.ensureInitialized();
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }
    return contract.address;
  }

  public async getAllContracts(): Promise<Map<string, ContractMetadata>> {
    await this.ensureInitialized();
    return new Map(this.contracts);
  }

  public async getContractsByNetwork(networkName: string): Promise<ContractMetadata[]> {
    await this.ensureInitialized();
    // In a full implementation, this would filter by network
    // For now, return all contracts
    return Array.from(this.contracts.values());
  }

  public async isContractDeployed(contractName: string): Promise<boolean> {
    await this.ensureInitialized();
    const contract = this.contracts.get(contractName);
    return contract !== undefined && contract.address.length > 0 && contract.address !== '0x0000000000000000000000000000000000000000';
  }

  public getDeploymentInfo(contractName: string, environment?: string): DeploymentInfo | undefined {
    const env = environment || environmentManager.getCurrentEnvironment();
    return this.deployments.get(`${contractName}:${env}`);
  }

  public async verifyContract(contractName: string, verified: boolean = true): Promise<void> {
    await this.ensureInitialized();
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }

    contract.verified = verified;
    console.log(`${verified ? '✅' : '❌'} Contract ${contractName} verification status: ${verified}`);
  }

  public async getContractUrl(contractName: string): Promise<string> {
    await this.ensureInitialized();
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }

    const networkInfo = environmentManager.getNetworkInfo();
    const environment = environmentManager.getCurrentEnvironment();
    
    // For mock network, return a local URL
    if (environment === 'development') {
      return `http://localhost:3000/explorer/contract/${contract.address}`;
    }

    // For real networks, construct explorer URL
    const baseUrl = this.getExplorerBaseUrl();
    if (networkInfo.isMoveVM) {
      return `${baseUrl}/object/${contract.address}`;
    } else {
      return `${baseUrl}/address/${contract.address}`;
    }
  }

  private getExplorerBaseUrl(): string {
    const environment = environmentManager.getCurrentEnvironment();
    
    switch (environment) {
      case 'testnet':
        return 'https://explorer.iota.org/testnet'; // Updated to match the working explorer URL
      case 'production':
        return 'https://explorer.iota.org';
      case 'evm-testnet':
        return 'https://mumbai.polygonscan.com';
      default:
        return 'http://localhost:3000/explorer';
    }
  }

  public async generateContractReport(): Promise<{
    summary: {
      totalContracts: number;
      deployedContracts: number;
      verifiedContracts: number;
      upgradeableContracts: number;
    };
    contracts: ContractMetadata[];
    environment: string;
    networkInfo: any;
  }> {
    await this.ensureInitialized();
    const contracts = Array.from(this.contracts.values());
    
    const deployedCount = await Promise.all(
      contracts.map(c => this.isContractDeployed(c.name))
    ).then(results => results.filter(Boolean).length);
    
    return {
      summary: {
        totalContracts: contracts.length,
        deployedContracts: deployedCount,
        verifiedContracts: contracts.filter(c => c.verified).length,
        upgradeableContracts: contracts.filter(c => c.isUpgradeable).length,
      },
      contracts,
      environment: environmentManager.getCurrentEnvironment(),
      networkInfo: environmentManager.getNetworkInfo(),
    };
  }

  public async loadContractsFromEnvironment(): Promise<void> {
    try {
      const environment = await environmentManager.getEnvironment();
      const contractAddresses = environment.contracts;

      // If no contracts exist yet, initialize with empty ones
      if (this.contracts.size === 0) {
        this.initializeFallbackContracts();
      }

      // Update registry with addresses from environment
      for (const [contractKey, address] of Object.entries(contractAddresses)) {
        // Map contract keys to contract names
        const contractName = this.mapContractKey(contractKey);
        if (contractName) {
          const existingContract = this.contracts.get(contractName);
          if (existingContract) {
            existingContract.address = address;
            if (address && address.length > 0) {
              console.log(`📋 Loaded ${contractName} from environment: ${address}`);
            }
          } else {
            // Create new contract if it doesn't exist
            this.registerContract({
              name: contractName,
              address: address,
              version: '1.0.0',
              isUpgradeable: true,
              verified: true,
              moduleId: `omeone_chain::${contractKey}::${contractName}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load contracts from environment:', error);
      throw error;
    }
  }

  private mapContractKey(key: string): string | undefined {
    const mapping: Record<string, string> = {
      omeoneToken: 'OmeoneToken',
      rewardDistribution: 'RewardDistribution',
      governance: 'Governance',
      reputation: 'Reputation',
      recommendation: 'Recommendation', // Added recommendation mapping
      nftTickets: 'NFTTickets',
    };
    return mapping[key];
  }

  public async saveContractAddresses(): Promise<void> {
    await this.ensureInitialized();
    // In a full implementation, this would save to a persistent store
    // For now, just log the current state
    console.log('💾 Current contract addresses:');
    for (const [name, contract] of this.contracts) {
      console.log(`  ${name}: ${contract.address}`);
    }
  }

  public async exportContractAddresses(): Promise<Record<string, string>> {
    await this.ensureInitialized();
    const addresses: Record<string, string> = {};
    
    for (const [name, contract] of this.contracts) {
      const key = this.mapContractNameToKey(name);
      if (key) {
        addresses[key] = contract.address;
      }
    }
    
    return addresses;
  }

  private mapContractNameToKey(name: string): string | undefined {
    const mapping: Record<string, string> = {
      OmeoneToken: 'omeoneToken',
      RewardDistribution: 'rewardDistribution',
      Governance: 'governance',
      Reputation: 'reputation',
      Recommendation: 'recommendation', // Added recommendation mapping
      NFTTickets: 'nftTickets',
    };
    return mapping[name];
  }

  public async validateContractAddresses(): Promise<{ valid: boolean; errors: string[] }> {
    await this.ensureInitialized();
    const errors: string[] = [];
    const networkInfo = environmentManager.getNetworkInfo();

    for (const [name, contract] of this.contracts) {
      // Skip validation for mock network
      if (networkInfo.name === 'Mock Network') {
        continue;
      }

      // Check if address is set (skip optional contracts like NFTTickets)
      if (!contract.address || contract.address.length === 0) {
        if (name !== 'NFTTickets') { // NFTTickets is optional
          errors.push(`Contract '${name}' has no address set`);
        }
        continue;
      }

      // Check address format based on network type
      if (networkInfo.isMoveVM) {
        // Move VM addresses are longer hex strings
        if (!this.isValidMoveAddress(contract.address)) {
          errors.push(`Contract '${name}' has invalid Move address format`);
        }
      } else {
        // EVM address format
        if (!this.isValidEvmAddress(contract.address)) {
          errors.push(`Contract '${name}' has invalid EVM address format`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidMoveAddress(address: string): boolean {
    // Move addresses are longer hex strings starting with 0x
    return /^0x[a-fA-F0-9]{64,}$/.test(address);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeRegistry();
    }
  }

  // Method to refresh contracts from environment (useful for testing)
  public async refreshFromEnvironment(): Promise<void> {
    this.initialized = false;
    this.contracts.clear();
    await this.initializeRegistry();
  }
}

// Global singleton instance
export const contractRegistry = new ContractRegistry();