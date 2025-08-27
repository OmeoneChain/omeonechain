"use strict";
// code/poc/core/src/config/contract-registry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractRegistry = exports.ContractRegistry = void 0;
const environment_manager_1 = require("./environment-manager");
class ContractRegistry {
    constructor() {
        this.contracts = new Map();
        this.deployments = new Map();
        this.initialized = false;
        // Don't initialize immediately - wait for environment to be ready
    }
    async initializeRegistry() {
        if (this.initialized) {
            return;
        }
        try {
            // Load contract addresses from current environment
            await this.loadContractsFromEnvironment();
            this.initialized = true;
        }
        catch (error) {
            console.warn('Failed to load contracts from environment, using fallback initialization:', error);
            this.initializeFallbackContracts();
            this.initialized = true;
        }
    }
    initializeFallbackContracts() {
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
    registerContract(metadata) {
        const fullMetadata = {
            ...metadata,
            deployedAt: new Date(),
        };
        this.contracts.set(metadata.name, fullMetadata);
        // Only log if address is not empty (avoid spamming logs with empty addresses)
        if (metadata.address && metadata.address.length > 0) {
            console.log(`📋 Registered contract: ${metadata.name} at ${metadata.address}`);
        }
    }
    async updateContractAddress(contractName, newAddress, deploymentInfo) {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        // Update contract address
        contract.address = newAddress;
        contract.deployedAt = new Date();
        // Store deployment info if provided
        if (deploymentInfo) {
            const currentEnv = environment_manager_1.environmentManager.getCurrentEnvironment();
            const networkInfo = environment_manager_1.environmentManager.getNetworkInfo();
            const fullDeploymentInfo = {
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
    async getContract(contractName) {
        await this.ensureInitialized();
        return this.contracts.get(contractName);
    }
    async getContractAddress(contractName) {
        await this.ensureInitialized();
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        return contract.address;
    }
    async getAllContracts() {
        await this.ensureInitialized();
        return new Map(this.contracts);
    }
    async getContractsByNetwork(networkName) {
        await this.ensureInitialized();
        // In a full implementation, this would filter by network
        // For now, return all contracts
        return Array.from(this.contracts.values());
    }
    async isContractDeployed(contractName) {
        await this.ensureInitialized();
        const contract = this.contracts.get(contractName);
        return contract !== undefined && contract.address.length > 0 && contract.address !== '0x0000000000000000000000000000000000000000';
    }
    getDeploymentInfo(contractName, environment) {
        const env = environment || environment_manager_1.environmentManager.getCurrentEnvironment();
        return this.deployments.get(`${contractName}:${env}`);
    }
    async verifyContract(contractName, verified = true) {
        await this.ensureInitialized();
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        contract.verified = verified;
        console.log(`${verified ? '✅' : '❌'} Contract ${contractName} verification status: ${verified}`);
    }
    async getContractUrl(contractName) {
        await this.ensureInitialized();
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        const networkInfo = environment_manager_1.environmentManager.getNetworkInfo();
        const environment = environment_manager_1.environmentManager.getCurrentEnvironment();
        // For mock network, return a local URL
        if (environment === 'development') {
            return `http://localhost:3000/explorer/contract/${contract.address}`;
        }
        // For real networks, construct explorer URL
        const baseUrl = this.getExplorerBaseUrl();
        if (networkInfo.isMoveVM) {
            return `${baseUrl}/object/${contract.address}`;
        }
        else {
            return `${baseUrl}/address/${contract.address}`;
        }
    }
    getExplorerBaseUrl() {
        const environment = environment_manager_1.environmentManager.getCurrentEnvironment();
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
    async generateContractReport() {
        await this.ensureInitialized();
        const contracts = Array.from(this.contracts.values());
        const deployedCount = await Promise.all(contracts.map(c => this.isContractDeployed(c.name))).then(results => results.filter(Boolean).length);
        return {
            summary: {
                totalContracts: contracts.length,
                deployedContracts: deployedCount,
                verifiedContracts: contracts.filter(c => c.verified).length,
                upgradeableContracts: contracts.filter(c => c.isUpgradeable).length,
            },
            contracts,
            environment: environment_manager_1.environmentManager.getCurrentEnvironment(),
            networkInfo: environment_manager_1.environmentManager.getNetworkInfo(),
        };
    }
    async loadContractsFromEnvironment() {
        try {
            const environment = await environment_manager_1.environmentManager.getEnvironment();
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
                    }
                    else {
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
        }
        catch (error) {
            console.error('Failed to load contracts from environment:', error);
            throw error;
        }
    }
    mapContractKey(key) {
        const mapping = {
            omeoneToken: 'OmeoneToken',
            rewardDistribution: 'RewardDistribution',
            governance: 'Governance',
            reputation: 'Reputation',
            recommendation: 'Recommendation', // Added recommendation mapping
            nftTickets: 'NFTTickets',
        };
        return mapping[key];
    }
    async saveContractAddresses() {
        await this.ensureInitialized();
        // In a full implementation, this would save to a persistent store
        // For now, just log the current state
        console.log('💾 Current contract addresses:');
        for (const [name, contract] of this.contracts) {
            console.log(`  ${name}: ${contract.address}`);
        }
    }
    async exportContractAddresses() {
        await this.ensureInitialized();
        const addresses = {};
        for (const [name, contract] of this.contracts) {
            const key = this.mapContractNameToKey(name);
            if (key) {
                addresses[key] = contract.address;
            }
        }
        return addresses;
    }
    mapContractNameToKey(name) {
        const mapping = {
            OmeoneToken: 'omeoneToken',
            RewardDistribution: 'rewardDistribution',
            Governance: 'governance',
            Reputation: 'reputation',
            Recommendation: 'recommendation', // Added recommendation mapping
            NFTTickets: 'nftTickets',
        };
        return mapping[name];
    }
    async validateContractAddresses() {
        await this.ensureInitialized();
        const errors = [];
        const networkInfo = environment_manager_1.environmentManager.getNetworkInfo();
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
            }
            else {
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
    isValidEvmAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    isValidMoveAddress(address) {
        // Move addresses are longer hex strings starting with 0x
        return /^0x[a-fA-F0-9]{64,}$/.test(address);
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeRegistry();
        }
    }
    // Method to refresh contracts from environment (useful for testing)
    async refreshFromEnvironment() {
        this.initialized = false;
        this.contracts.clear();
        await this.initializeRegistry();
    }
}
exports.ContractRegistry = ContractRegistry;
// Global singleton instance
exports.contractRegistry = new ContractRegistry();
//# sourceMappingURL=contract-registry.js.map