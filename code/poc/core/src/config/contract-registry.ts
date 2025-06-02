// code/poc/core/src/config/contract-registry.ts

import { environmentManager } from './environment-manager.js';

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

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    // Initialize with mock contracts for development
    this.registerContract({
      name: 'OmeoneToken',
      address: '0x1111111111111111111111111111111111111111',
      version: '1.0.0',
      isUpgradeable: false,
      verified: true,
      moduleId: 'omeone_chain::token::OmeoneToken',
    });

    this.registerContract({
      name: 'RewardDistribution',
      address: '0x2222222222222222222222222222222222222222',
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::rewards::RewardDistribution',
    });

    this.registerContract({
      name: 'Governance',
      address: '0x3333333333333333333333333333333333333333',
      version: '1.0.0',
      isUpgradeable: true,
      verified: true,
      moduleId: 'omeone_chain::governance::Governance',
    });

    this.registerContract({
      name: 'Reputation',
      address: '0x4444444444444444444444444444444444444444',
      version: '1.0.0',
      isUpgradeable: false,
      verified: true,
      moduleId: 'omeone_chain::reputation::ReputationSystem',
    });

    this.registerContract({
      name: 'NFTTickets',
      address: '0x5555555555555555555555555555555555555555',
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
    console.log(`📋 Registered contract: ${metadata.name} at ${metadata.address}`);
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

  public getContract(contractName: string): ContractMetadata | undefined {
    return this.contracts.get(contractName);
  }

  public getContractAddress(contractName: string): string {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }
    return contract.address;
  }

  public getAllContracts(): Map<string, ContractMetadata> {
    return new Map(this.contracts);
  }

  public getContractsByNetwork(networkName: string): ContractMetadata[] {
    // In a full implementation, this would filter by network
    // For now, return all contracts
    return Array.from(this.contracts.values());
  }

  public isContractDeployed(contractName: string): boolean {
    const contract = this.contracts.get(contractName);
    return contract !== undefined && contract.address.length > 0 && contract.address !== '0x0000000000000000000000000000000000000000';
  }

  public getDeploymentInfo(contractName: string, environment?: string): DeploymentInfo | undefined {
    const env = environment || environmentManager.getCurrentEnvironment();
    return this.deployments.get(`${contractName}:${env}`);
  }

  public async verifyContract(contractName: string, verified: boolean = true): Promise<void> {
    const contract = this.contracts.get(contractName);
    if (!contract) {
      throw new Error(`Contract '${contractName}' not found in registry`);
    }

    contract.verified = verified;
    console.log(`${verified ? '✅' : '❌'} Contract ${contractName} verification status: ${verified}`);
  }

  public getContractUrl(contractName: string): string {
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
        return 'https://explorer.testnet.rebased.iota.org';
      case 'production':
        return 'https://explorer.rebased.iota.org';
      case 'evm-testnet':
        return 'https://mumbai.polygonscan.com';
      default:
        return 'http://localhost:3000/explorer';
    }
  }

  public generateContractReport(): {
    summary: {
      totalContracts: number;
      deployedContracts: number;
      verifiedContracts: number;
      upgradeableContracts: number;
    };
    contracts: ContractMetadata[];
    environment: string;
    networkInfo: any;
  } {
    const contracts = Array.from(this.contracts.values());
    
    return {
      summary: {
        totalContracts: contracts.length,
        deployedContracts: contracts.filter(c => this.isContractDeployed(c.name)).length,
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

      // Update registry with addresses from environment
      for (const [contractKey, address] of Object.entries(contractAddresses)) {
        // Map contract keys to contract names
        const contractName = this.mapContractKey(contractKey);
        if (contractName && address && address.length > 0) {
          const existingContract = this.contracts.get(contractName);
          if (existingContract) {
            existingContract.address = address;
            console.log(`📋 Loaded ${contractName} address: ${address}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load contracts from environment:', error);
    }
  }

  private mapContractKey(key: string): string | undefined {
    const mapping: Record<string, string> = {
      omeoneToken: 'OmeoneToken',
      rewardDistribution: 'RewardDistribution',
      governance: 'Governance',
      reputation: 'Reputation',
      nftTickets: 'NFTTickets',
    };
    return mapping[key];
  }

  public async saveContractAddresses(): Promise<void> {
    // In a full implementation, this would save to a persistent store
    // For now, just log the current state
    console.log('💾 Current contract addresses:');
    for (const [name, contract] of this.contracts) {
      console.log(`  ${name}: ${contract.address}`);
    }
  }

  public exportContractAddresses(): Record<string, string> {
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
      NFTTickets: 'nftTickets',
    };
    return mapping[name];
  }

  public validateContractAddresses(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const networkInfo = environmentManager.getNetworkInfo();

    for (const [name, contract] of this.contracts) {
      // Skip validation for mock network
      if (networkInfo.name === 'Mock Network') {
        continue;
      }

      // Check if address is set
      if (!contract.address || contract.address.length === 0) {
        errors.push(`Contract '${name}' has no address set`);
        continue;
      }

      // Check address format based on network type
      if (networkInfo.isMoveVM) {
        // Move VM addresses are different format
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
    // Move addresses can be various formats
    // For now, accept any non-empty string that doesn't look like EVM
    return address.length > 0 && !address.startsWith('0x');
  }
}

// Global singleton instance
export const contractRegistry = new ContractRegistry();