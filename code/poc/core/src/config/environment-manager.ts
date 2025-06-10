// code/poc/core/src/config/environment-manager.ts

import { 
  NetworkEnvironment, 
  ENVIRONMENTS, 
  validateNetworkConfig, 
  validateContractAddresses,
  isNetworkAvailable,
  isMoveVMNetwork,
  isDagNetwork,
  hasSponsorWallet,
  CONTRACT_ADDRESSES
} from './network-config';

export type EnvironmentName = 'development' | 'testnet' | 'production' | 'evm-testnet';

export interface EnvironmentStatus {
  name: EnvironmentName;
  isActive: boolean;
  isHealthy: boolean;
  lastChecked: Date;
  errors: string[];
  warnings: string[];
}

export class EnvironmentManager {
  private currentEnvironment: EnvironmentName;
  private environmentCache: Map<EnvironmentName, NetworkEnvironment> = new Map();
  private statusCache: Map<EnvironmentName, EnvironmentStatus> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    // Determine environment from NODE_ENV or default to development
    this.currentEnvironment = this.detectEnvironment();
    this.initializeEnvironment();
  }

  private detectEnvironment(): EnvironmentName {
    const nodeEnv = process.env.NODE_ENV;
    const forceEnv = process.env.OMEONE_ENVIRONMENT as EnvironmentName;

    if (forceEnv && this.isValidEnvironment(forceEnv)) {
      return forceEnv;
    }

    switch (nodeEnv) {
      case 'production':
        return 'production';
      case 'test':
      case 'testing':
        return 'testnet';
      case 'development':
      case 'dev':
      default:
        return 'development';
    }
  }

  private isValidEnvironment(env: string): env is EnvironmentName {
    return ['development', 'testnet', 'production', 'evm-testnet'].includes(env);
  }

  private async initializeEnvironment(): Promise<void> {
    console.log(`🌍 Initializing OmeoneChain environment: ${this.currentEnvironment}`);
    
    try {
      const environment = await this.loadEnvironment(this.currentEnvironment);
      this.cacheEnvironment(this.currentEnvironment, environment);
      
      // Perform initial health check
      await this.performHealthCheck(this.currentEnvironment);
      
      // Start periodic health checks in non-development environments
      if (this.currentEnvironment !== 'development') {
        this.startHealthChecking();
      }

      console.log(`✅ Environment ${this.currentEnvironment} initialized successfully`);
      this.logEnvironmentDetails(environment);
    } catch (error) {
      console.error(`❌ Failed to initialize environment ${this.currentEnvironment}:`, error);
      throw error;
    }
  }

  private async loadEnvironment(envName: EnvironmentName): Promise<NetworkEnvironment> {
    // Check cache first
    if (this.environmentCache.has(envName)) {
      return this.environmentCache.get(envName)!;
    }

    // Load from configuration
    const environment = ENVIRONMENTS[envName];
    if (!environment) {
      throw new Error(`Environment '${envName}' not found in configuration`);
    }

    // Validate configuration
    this.validateEnvironment(environment);

    return environment;
  }

  private validateEnvironment(environment: NetworkEnvironment): void {
    const errors: string[] = [];

    // Validate network configuration
    if (!validateNetworkConfig(environment.network)) {
      errors.push('Invalid network configuration');
    }

    // RELAXED: Only validate contract addresses for production environment
    // Testnet and development can have empty contract addresses
    if (environment.network.name !== 'Mock Network' && this.currentEnvironment === 'production') {
      const hasValidContracts = Object.values(environment.contracts).some(addr => addr.length > 0);
      if (!hasValidContracts) {
        errors.push('No contract addresses configured - contracts need to be deployed for production');
      }
    }

    // Validate required environment variables for production only
    if (this.currentEnvironment === 'production') {
      if (environment.apiKeys?.ipfsGateway && !process.env.IPFS_GATEWAY_KEY) {
        errors.push('IPFS_GATEWAY_KEY environment variable required for production');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }

    // Log warnings for testnet/development with missing contracts
    if (environment.network.name !== 'Mock Network' && this.currentEnvironment !== 'production') {
      const hasValidContracts = Object.values(environment.contracts).some(addr => addr.length > 0);
      if (!hasValidContracts) {
        console.warn(`⚠️  No contracts deployed in ${this.currentEnvironment} environment - this is expected for testing`);
      }
    }
  }

  private cacheEnvironment(envName: EnvironmentName, environment: NetworkEnvironment): void {
    this.environmentCache.set(envName, environment);
  }

  private async performHealthCheck(envName: EnvironmentName): Promise<EnvironmentStatus> {
    const environment = await this.loadEnvironment(envName);
    const status: EnvironmentStatus = {
      name: envName,
      isActive: true,
      isHealthy: true,
      lastChecked: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      // Check network connectivity
      if (environment.network.name !== 'Mock Network') {
        await this.checkNetworkConnectivity(environment);
      }

      // Check contract deployment status
      await this.checkContractStatus(environment, status);

      // Check monitoring endpoints
      if (environment.monitoring.enabled) {
        await this.checkMonitoringHealth(environment, status);
      }

    } catch (error) {
      status.isHealthy = false;
      status.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    this.statusCache.set(envName, status);
    return status;
  }

  private async checkNetworkConnectivity(environment: NetworkEnvironment): Promise<void> {
    // For now, just validate the RPC endpoint format
    // In real implementation, this would make actual network calls
    const rpcUrl = environment.network.rpcEndpoint;
    
    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
      throw new Error('Invalid RPC endpoint format');
    }

    // Simulate network check delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async checkContractStatus(
    environment: NetworkEnvironment, 
    status: EnvironmentStatus
  ): Promise<void> {
    const contracts = environment.contracts;
    
    // Count deployed contracts
    const deployedContracts = Object.entries(contracts)
      .filter(([_, address]) => address.length > 0);
    
    const totalContracts = Object.keys(contracts).length;
    
    if (deployedContracts.length === 0 && environment.network.name !== 'Mock Network') {
      status.warnings.push('No contracts deployed yet - expected for testnet');
    } else if (deployedContracts.length < totalContracts) {
      status.warnings.push(`Only ${deployedContracts.length}/${totalContracts} contracts deployed`);
    }
  }

  private async checkMonitoringHealth(
    environment: NetworkEnvironment, 
    status: EnvironmentStatus
  ): Promise<void> {
    if (environment.monitoring.metricsEndpoint) {
      // In real implementation, this would ping the metrics endpoint
      // For now, just validate the URL format
      const metricsUrl = environment.monitoring.metricsEndpoint;
      if (!metricsUrl.startsWith('http://') && !metricsUrl.startsWith('https://')) {
        status.warnings.push('Invalid metrics endpoint format');
      }
    }
  }

  private startHealthChecking(): void {
    // Check health every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck(this.currentEnvironment);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  private logEnvironmentDetails(environment: NetworkEnvironment): void {
    console.log(`📊 Network: ${environment.network.name} (${environment.network.chainId})`);
    console.log(`🔗 RPC: ${environment.network.rpcEndpoint}`);
    
    if (environment.network.indexerEndpoint) {
      console.log(`📊 Indexer: ${environment.network.indexerEndpoint}`);
    }
    
    if (environment.network.explorerUrl) {
      console.log(`🔍 Explorer: ${environment.network.explorerUrl}`);
    }
    
    if (environment.network.faucetUrl) {
      console.log(`💧 Faucet: ${environment.network.faucetUrl}`);
    }
    
    // Log contract status
    const deployedContracts = Object.entries(environment.contracts)
      .filter(([_, address]) => address.length > 0);
    
    if (deployedContracts.length > 0) {
      console.log(`📋 Contracts deployed: ${deployedContracts.length}/${Object.keys(environment.contracts).length}`);
    } else {
      console.log(`📋 Contracts: Not yet deployed (expected for ${this.currentEnvironment})`);
    }

    // Log special features
    const features = environment.network.features;
    const enabledFeatures = Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
    
    if (enabledFeatures.length > 0) {
      console.log(`⚡ Features: ${enabledFeatures.join(', ')}`);
    }
  }

  // Public API methods

  public getCurrentEnvironment(): EnvironmentName {
    return this.currentEnvironment;
  }

  public async getEnvironment(envName?: EnvironmentName): Promise<NetworkEnvironment> {
    const targetEnv = envName || this.currentEnvironment;
    return await this.loadEnvironment(targetEnv);
  }

  public async switchEnvironment(envName: EnvironmentName): Promise<void> {
    if (envName === this.currentEnvironment) {
      return; // Already on target environment
    }

    console.log(`🔄 Switching from ${this.currentEnvironment} to ${envName}`);
    
    // Stop current health checking
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Load and validate new environment
    const newEnvironment = await this.loadEnvironment(envName);
    this.cacheEnvironment(envName, newEnvironment);

    // Switch current environment
    this.currentEnvironment = envName;

    // Perform health check and restart monitoring
    await this.performHealthCheck(envName);
    
    if (envName !== 'development') {
      this.startHealthChecking();
    }

    console.log(`✅ Successfully switched to ${envName}`);
    this.logEnvironmentDetails(newEnvironment);
  }

  public async getEnvironmentStatus(envName?: EnvironmentName): Promise<EnvironmentStatus> {
    const targetEnv = envName || this.currentEnvironment;
    
    // Return cached status if available and recent
    const cachedStatus = this.statusCache.get(targetEnv);
    if (cachedStatus && Date.now() - cachedStatus.lastChecked.getTime() < 60000) {
      return cachedStatus;
    }

    // Perform fresh health check
    return await this.performHealthCheck(targetEnv);
  }

  public getAllEnvironmentStatuses(): Map<EnvironmentName, EnvironmentStatus> {
    return new Map(this.statusCache);
  }

  public getNetworkInfo(): {
    name: string;
    chainId: string;
    isMoveVM: boolean;
    isDag: boolean;
    hasSponsorWallet: boolean;
  } {
    const env = this.environmentCache.get(this.currentEnvironment);
    if (!env) {
      throw new Error('Current environment not loaded');
    }

    return {
      name: env.network.name,
      chainId: env.network.chainId,
      isMoveVM: isMoveVMNetwork(this.currentEnvironment),
      isDag: isDagNetwork(this.currentEnvironment),
      hasSponsorWallet: hasSponsorWallet(this.currentEnvironment),
    };
  }

  public async isContractDeployed(contractName: keyof typeof CONTRACT_ADDRESSES.mock): Promise<boolean> {
    const environment = await this.getEnvironment();
    const contractAddress = environment.contracts[contractName];
    return contractAddress !== undefined && contractAddress.length > 0;
  }

  public async getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.mock): Promise<string> {
    const environment = await this.getEnvironment();
    const contractAddress = environment.contracts[contractName];
    
    if (!contractAddress || contractAddress.length === 0) {
      throw new Error(`Contract '${contractName}' not deployed in environment '${this.currentEnvironment}'`);
    }
    
    return contractAddress;
  }

  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.environmentCache.clear();
    this.statusCache.clear();
  }
}

// Global singleton instance
export const environmentManager = new EnvironmentManager();