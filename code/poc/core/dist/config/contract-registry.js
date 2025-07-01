"use strict";
// code/poc/core/src/config/contract-registry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractRegistry = exports.ContractRegistry = void 0;
const environment_manager_1 = require("./environment-manager");
class ContractRegistry {
    constructor() {
        this.contracts = new Map();
        this.deployments = new Map();
        this.initializeRegistry();
    }
    initializeRegistry() {
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
    registerContract(metadata) {
        const fullMetadata = {
            ...metadata,
            deployedAt: new Date(),
        };
        this.contracts.set(metadata.name, fullMetadata);
        console.log(`📋 Registered contract: ${metadata.name} at ${metadata.address}`);
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
    getContract(contractName) {
        return this.contracts.get(contractName);
    }
    getContractAddress(contractName) {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        return contract.address;
    }
    getAllContracts() {
        return new Map(this.contracts);
    }
    getContractsByNetwork(networkName) {
        // In a full implementation, this would filter by network
        // For now, return all contracts
        return Array.from(this.contracts.values());
    }
    isContractDeployed(contractName) {
        const contract = this.contracts.get(contractName);
        return contract !== undefined && contract.address.length > 0 && contract.address !== '0x0000000000000000000000000000000000000000';
    }
    getDeploymentInfo(contractName, environment) {
        const env = environment || environment_manager_1.environmentManager.getCurrentEnvironment();
        return this.deployments.get(`${contractName}:${env}`);
    }
    async verifyContract(contractName, verified = true) {
        const contract = this.contracts.get(contractName);
        if (!contract) {
            throw new Error(`Contract '${contractName}' not found in registry`);
        }
        contract.verified = verified;
        console.log(`${verified ? '✅' : '❌'} Contract ${contractName} verification status: ${verified}`);
    }
    getContractUrl(contractName) {
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
                return 'https://explorer.testnet.rebased.iota.org';
            case 'production':
                return 'https://explorer.rebased.iota.org';
            case 'evm-testnet':
                return 'https://mumbai.polygonscan.com';
            default:
                return 'http://localhost:3000/explorer';
        }
    }
    generateContractReport() {
        const contracts = Array.from(this.contracts.values());
        return {
            summary: {
                totalContracts: contracts.length,
                deployedContracts: contracts.filter(c => this.isContractDeployed(c.name)).length,
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
        }
        catch (error) {
            console.error('Failed to load contracts from environment:', error);
        }
    }
    mapContractKey(key) {
        const mapping = {
            omeoneToken: 'OmeoneToken',
            rewardDistribution: 'RewardDistribution',
            governance: 'Governance',
            reputation: 'Reputation',
            nftTickets: 'NFTTickets',
        };
        return mapping[key];
    }
    async saveContractAddresses() {
        // In a full implementation, this would save to a persistent store
        // For now, just log the current state
        console.log('💾 Current contract addresses:');
        for (const [name, contract] of this.contracts) {
            console.log(`  ${name}: ${contract.address}`);
        }
    }
    exportContractAddresses() {
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
            NFTTickets: 'nftTickets',
        };
        return mapping[name];
    }
    validateContractAddresses() {
        const errors = [];
        const networkInfo = environment_manager_1.environmentManager.getNetworkInfo();
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
        // Move addresses can be various formats
        // For now, accept any non-empty string that doesn't look like EVM
        return address.length > 0 && !address.startsWith('0x');
    }
}
exports.ContractRegistry = ContractRegistry;
// Global singleton instance
exports.contractRegistry = new ContractRegistry();
//# sourceMappingURL=contract-registry.js.map