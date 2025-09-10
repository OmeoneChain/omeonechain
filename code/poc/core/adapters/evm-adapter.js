import Web3 from 'web3';
import * as crypto from 'crypto';
/**
 * EVMAdapter - Fallback implementation of ChainAdapter interface for EVM chains
 *
 * This adapter connects OmeoneChain to Ethereum-compatible chains like Fantom Sonic
 * or Arbitrum, serving as a fallback when IOTA Rebased is unavailable.
 */
export class EVMAdapter {
    /**
     * Constructor
     * @param rpcUrl RPC URL for the EVM chain
     * @param contractAddresses Addresses of deployed contracts
     * @param privateKey Private key for transaction signing
     * @param chainId Chain ID (e.g., 250 for Fantom)
     */
    constructor(rpcUrl, contractAddresses, privateKey, chainId) {
        this.isConnected = false; // Conservative fix: Use 'any' type to avoid interface mismatch
        this.eventSubscribers = new Map();
        this.contracts = {}; // Conservative fix: Use 'any' for Contract generic
        this.accountAddress = ''; // Conservative fix: Initialize property
        this.privateKey = ''; // Conservative fix: Initialize property
        this.contractAddresses = {
            recommendation: '',
            token: '',
            governance: '',
        };
        // ABIs for the contracts
        this.contractAbis = {
            recommendation: [],
            token: [],
            governance: []
        };
        this.web3 = new Web3(rpcUrl);
        this.contractAddresses = contractAddresses;
        if (privateKey) {
            this.privateKey = privateKey;
            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            this.accountAddress = account.address;
            this.web3.eth.accounts.wallet.add(account);
            this.web3.eth.defaultAccount = this.accountAddress;
        }
        this.chainId = chainId || 250; // Default to Fantom
        // Load contract ABIs - in a real implementation, these would be imported from JSON files
        this.loadContractAbis();
    }
    /**
     * Initialize and connect to the EVM chain
     */
    async connect() {
        try {
            // Test connection to chain
            const blockNumber = await this.web3.eth.getBlockNumber();
            // Initialize contracts
            this.initializeContracts();
            console.log(`Connected to EVM chain at block ${blockNumber}`);
            // Start event listener
            this.startEventListener();
            this.isConnected = true;
            return true;
        }
        catch (error) {
            console.error('Failed to connect to EVM chain:', error);
            this.isConnected = false;
            return false;
        }
    }
    /**
     * Disconnect from the EVM chain
     */
    async disconnect() {
        this.stopEventListener();
        if (this.web3.currentProvider && typeof this.web3.currentProvider.disconnect === 'function') {
            this.web3.currentProvider.disconnect();
        }
        this.isConnected = false;
        console.log('Disconnected from EVM chain');
    }
    /**
     * Load contract ABIs from JSON files or hardcoded values
     * In a production environment, these would be loaded from actual JSON files
     */
    loadContractAbis() {
        // This is a simplified placeholder for demonstration
        // In a real implementation, you would import ABIs from JSON files
        this.contractAbis.recommendation = [
            {
                "inputs": [
                    { "internalType": "address", "name": "author", "type": "address" },
                    { "internalType": "string", "name": "contentHash", "type": "string" },
                    { "internalType": "string", "name": "metadata", "type": "string" }
                ],
                "name": "postRecommendation",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    { "internalType": "uint256", "name": "recommendationId", "type": "uint256" },
                    { "internalType": "bool", "name": "isUpvote", "type": "bool" }
                ],
                "name": "vote",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "internalType": "uint256", "name": "recommendationId", "type": "uint256" }],
                "name": "getRecommendation",
                "outputs": [
                    { "internalType": "address", "name": "", "type": "address" },
                    { "internalType": "string", "name": "", "type": "string" },
                    { "internalType": "string", "name": "", "type": "string" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "uint256", "name": "", "type": "uint256" }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "indexed": true, "internalType": "address", "name": "author", "type": "address" },
                    { "indexed": false, "internalType": "string", "name": "contentHash", "type": "string" }
                ],
                "name": "RecommendationCreated",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "indexed": true, "internalType": "address", "name": "voter", "type": "address" },
                    { "indexed": false, "internalType": "bool", "name": "isUpvote", "type": "bool" }
                ],
                "name": "VoteCast",
                "type": "event"
            }
        ];
        this.contractAbis.token = [
            {
                "inputs": [
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "amount", "type": "uint256" }
                ],
                "name": "transfer",
                "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "internalType": "uint256", "name": "actionId", "type": "uint256" }],
                "name": "claimReward",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
                    { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
                    { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
                ],
                "name": "Transfer",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
                    { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
                    { "indexed": true, "internalType": "uint256", "name": "actionId", "type": "uint256" }
                ],
                "name": "RewardClaimed",
                "type": "event"
            }
        ];
        this.contractAbis.governance = [
            {
                "inputs": [
                    { "internalType": "string", "name": "title", "type": "string" },
                    { "internalType": "string", "name": "description", "type": "string" },
                    { "internalType": "string", "name": "parameters", "type": "string" },
                    { "internalType": "uint256", "name": "votingDuration", "type": "uint256" }
                ],
                "name": "createProposal",
                "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    { "internalType": "uint256", "name": "proposalId", "type": "uint256" },
                    { "internalType": "bool", "name": "vote", "type": "bool" }
                ],
                "name": "castVote",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }],
                "name": "getProposal",
                "outputs": [
                    { "internalType": "address", "name": "", "type": "address" },
                    { "internalType": "string", "name": "", "type": "string" },
                    { "internalType": "string", "name": "", "type": "string" },
                    { "internalType": "string", "name": "", "type": "string" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "uint256", "name": "", "type": "uint256" },
                    { "internalType": "enum Governance.ProposalStatus", "name": "", "type": "uint8" }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "indexed": true, "internalType": "address", "name": "proposer", "type": "address" },
                    { "indexed": false, "internalType": "string", "name": "title", "type": "string" }
                ],
                "name": "ProposalCreated",
                "type": "event"
            },
            {
                "anonymous": false,
                "inputs": [
                    { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "indexed": true, "internalType": "address", "name": "voter", "type": "address" },
                    { "indexed": false, "internalType": "bool", "name": "support", "type": "bool" }
                ],
                "name": "VoteCast",
                "type": "event"
            }
        ];
    }
    /**
     * Initialize contract instances
     */
    initializeContracts() {
        Object.keys(this.contractAddresses).forEach(contractType => {
            if (this.contractAddresses[contractType] && this.contractAbis[contractType]) {
                this.contracts[contractType] = new this.web3.eth.Contract(this.contractAbis[contractType], this.contractAddresses[contractType]);
            }
        });
    }
    /**
     * Submit a transaction to the EVM chain
     * @param transaction Transaction data to submit
     * @returns Transaction result with proper typing
     */
    async submitTransaction(transaction) {
        if (!this.isConnected) {
            throw new Error('Not connected to EVM chain');
        }
        if (!this.privateKey) {
            throw new Error('Private key not provided. Cannot sign transaction.');
        }
        try {
            const result = await this.executeContractMethod(transaction);
            return {
                success: true,
                objectId: this.generateObjectId(result.transactionHash, transaction.type), // Conservative fix: Use objectId instead of transactionId
                timestamp: new Date().toISOString(),
                status: 'confirmed', // Conservative fix: Add missing status property
                data: {
                    gasUsed: result.gasUsed,
                    gasPrice: result.gasPrice || '0',
                    events: result.events || {}
                }
            };
        }
        catch (error) {
            console.error('Transaction submission failed:', error);
            return {
                success: false,
                error: `Failed to submit transaction: ${error.message}`, // Conservative fix: Type cast error
                timestamp: new Date().toISOString(),
                status: 'failed' // Conservative fix: Add missing status property
            }; // Conservative fix: Use 'as any' for return type
        }
    }
    /**
     * Execute a contract method based on transaction type
     * @param transaction Transaction data
     * @returns Transaction receipt
     */
    async executeContractMethod(transaction) {
        let contract; // Conservative fix: Use 'any' type
        let method;
        let args;
        switch (transaction.type) {
            case 'recommendation':
                contract = this.contracts.recommendation;
                if (transaction.action === 'create') {
                    const data = transaction.data; // Conservative fix: Use 'as any' instead of specific type
                    method = 'postRecommendation';
                    args = [
                        data.author,
                        data.contentHash,
                        JSON.stringify({
                            category: data.category,
                            serviceId: data.serviceId,
                            location: data.location,
                            rating: data.rating,
                            timestamp: data.timestamp || new Date().toISOString()
                        })
                    ];
                }
                else if (transaction.action === 'vote') {
                    method = 'vote';
                    args = [
                        transaction.data.id,
                        transaction.actionDetail === 'upvote' // true for upvote, false for downvote
                    ];
                }
                else {
                    throw new Error(`Unsupported action for recommendation: ${transaction.action}`);
                }
                break;
            case 'token':
                contract = this.contracts.token;
                const tokenData = transaction.data;
                if (transaction.action === 'transfer') {
                    method = 'transfer';
                    args = [
                        tokenData.recipient,
                        this.web3.utils.toWei(tokenData.amount.toString(), 'ether')
                    ];
                }
                else if (transaction.action === 'claim_reward') {
                    method = 'claimReward';
                    args = [
                        tokenData.actionReference
                    ];
                }
                else {
                    throw new Error(`Unsupported action for token: ${transaction.action}`);
                }
                break;
            case 'governance':
                contract = this.contracts.governance;
                if (transaction.action === 'propose') {
                    method = 'createProposal';
                    args = [
                        transaction.data.title,
                        transaction.data.description,
                        transaction.data.parameters,
                        transaction.data.votingDuration
                    ];
                }
                else if (transaction.action === 'vote') {
                    method = 'castVote';
                    args = [
                        transaction.data.proposalId,
                        transaction.data.vote // true for yes, false for no
                    ];
                }
                else {
                    throw new Error(`Unsupported action for governance: ${transaction.action}`);
                }
                break;
            default:
                throw new Error(`Unsupported transaction type: ${transaction.type}`);
        }
        if (!contract || !method) {
            throw new Error('Contract or method not found');
        }
        // Execute transaction
        const gasEstimate = await contract.methods[method](...args).estimateGas({ from: this.accountAddress });
        const result = await contract.methods[method](...args).send({
            from: this.accountAddress,
            gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
            gasPrice: await this.web3.eth.getGasPrice(),
            chainId: this.chainId
        });
        return result;
    }
    /**
     * Generate a consistent object ID from transaction hash and type
     * @param txHash Transaction hash
     * @param type Object type
     * @returns Object ID
     */
    generateObjectId(txHash, type) {
        return `${type}-${txHash.substring(0, 24)}`;
    }
    /**
     * Query the current state for a given object type and ID
     * @param query Query parameters with object type and ID
     * @returns Current state of the object
     */
    async queryState(query) {
        if (!this.isConnected) {
            throw new Error('Not connected to EVM chain');
        }
        try {
            // Handle different query structures
            let objectId;
            let objectType;
            // Conservative fix: Handle multiple query formats
            if (query.objectId) {
                objectId = query.objectId;
                objectType = query.objectType || objectId.split('-')[0];
            }
            else if (query.filter?.id) {
                // Handle filter-based queries
                const id = query.filter.id;
                objectType = query.objectType || 'unknown';
                objectId = `${objectType}-${id}`;
            }
            else {
                throw new Error('Invalid query format');
            }
            // Extract transaction hash from object ID
            const parts = objectId.split('-');
            const type = parts[0];
            let data;
            let blockNumber;
            switch (type) {
                case 'recommendation':
                    const recommendationId = parseInt(parts[1], 10);
                    const recResult = await this.contracts.recommendation.methods.getRecommendation(recommendationId).call();
                    // Parse the result based on contract return structure
                    data = {
                        id: recommendationId.toString(),
                        author: recResult[0],
                        contentHash: recResult[1],
                        metadata: JSON.parse(recResult[2]),
                        upvotes: parseInt(recResult[3], 10),
                        downvotes: parseInt(recResult[4], 10),
                        timestamp: new Date(parseInt(recResult[5], 10) * 1000).toISOString()
                    };
                    blockNumber = Number(await this.web3.eth.getBlockNumber()); // FIX 1: Convert bigint to number
                    break;
                case 'token':
                    // For token queries, we might be looking up balances or transaction details
                    if (objectId.includes('balance')) {
                        const address = parts[2];
                        const balance = await this.contracts.token.methods.balanceOf(address).call();
                        data = {
                            address,
                            balance: this.web3.utils.fromWei(balance, 'ether')
                        };
                    }
                    else {
                        throw new Error('Unsupported token state query');
                    }
                    blockNumber = Number(await this.web3.eth.getBlockNumber()); // FIX 1: Convert bigint to number
                    break;
                case 'governance':
                    const proposalId = parseInt(parts[1], 10);
                    const govResult = await this.contracts.governance.methods.getProposal(proposalId).call();
                    // Parse the result based on contract return structure
                    data = {
                        id: proposalId.toString(),
                        proposer: govResult[0],
                        title: govResult[1],
                        description: govResult[2],
                        parameters: govResult[3],
                        votingStart: parseInt(govResult[4], 10),
                        votingEnd: parseInt(govResult[5], 10),
                        yesVotes: parseInt(govResult[6], 10),
                        noVotes: parseInt(govResult[7], 10),
                        status: this.parseProposalStatus(parseInt(govResult[8], 10))
                    };
                    blockNumber = Number(await this.web3.eth.getBlockNumber()); // FIX 1: Convert bigint to number
                    break;
                case 'service':
                    // Conservative fix: Add service case for services engine
                    data = {
                        serviceId: parts[1],
                        name: 'Mock Service',
                        category: 'restaurant',
                        averageRating: 4.5,
                        totalRecommendations: 10,
                        totalUpvotes: 25
                    };
                    blockNumber = Number(await this.web3.eth.getBlockNumber());
                    break;
                default:
                    throw new Error(`Unsupported object type: ${type}`);
            }
            // Conservative fix: Return structure that matches expected format
            return {
                results: [data],
                total: 1,
                objectId: objectId,
                objectType: objectType,
                data,
                commitNumber: blockNumber,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('State query failed:', error);
            throw new Error(`Failed to query state: ${error.message}`); // Conservative fix: Type cast error
        }
    }
    /**
     * Parse proposal status enum from contract
     * @param statusCode Status code from contract
     * @returns Status string
     */
    parseProposalStatus(statusCode) {
        const statuses = [
            'Pending',
            'Active',
            'Canceled',
            'Defeated',
            'Succeeded',
            'Executed'
        ];
        return statuses[statusCode] || 'Unknown';
    }
    /**
     * Query objects by type with optional filters
     * @param objectType Type of objects to query
     * @param filters Optional filters to apply
     * @param pagination Pagination options
     * @returns Array of matching objects
     */
    async queryObjects(objectType, filters, pagination) {
        if (!this.isConnected) {
            throw new Error('Not connected to EVM chain');
        }
        try {
            // For EVM chains, we need to use events to query objects
            // This is a simplified implementation - in production, you'd use more sophisticated indexing
            // Determine which events to query based on object type
            let events = [];
            let contract; // Conservative fix: Use 'any' type
            let eventName;
            switch (objectType) {
                case 'recommendation':
                    contract = this.contracts.recommendation;
                    eventName = 'RecommendationCreated';
                    break;
                case 'token':
                    contract = this.contracts.token;
                    eventName = 'Transfer';
                    break;
                case 'governance':
                    contract = this.contracts.governance;
                    eventName = 'ProposalCreated';
                    break;
                default:
                    throw new Error(`Unsupported object type: ${objectType}`);
            }
            // Create filter object for events
            const filterOptions = {};
            // Apply filters if provided
            if (filters) {
                Object.keys(filters).forEach(key => {
                    // Map filter keys to indexed event parameters
                    if (key === 'author' || key === 'proposer') {
                        filterOptions.proposer = filters[key];
                    }
                    else if (key === 'id' || key === 'recommendationId' || key === 'proposalId') {
                        filterOptions.id = filters[key];
                    }
                });
            }
            // Get events from last 1000 blocks as a reasonable default
            // In production, use a proper indexing solution
            const latestBlock = Number(await this.web3.eth.getBlockNumber()); // FIX 1: Convert bigint to number
            const fromBlock = Math.max(0, latestBlock - 1000);
            events = await contract.getPastEvents(eventName, {
                filter: filterOptions,
                fromBlock,
                toBlock: 'latest'
            });
            // Apply pagination if provided
            if (pagination) {
                const start = pagination.offset || 0;
                const end = pagination.limit ? start + pagination.limit : events.length;
                events = events.slice(start, end);
            }
            // Transform events into ChainState objects
            const results = [];
            // Process each event based on type
            for (const event of events) {
                let data;
                switch (objectType) {
                    case 'recommendation':
                        // For recommendations, fetch full data using the ID
                        try {
                            const recId = event.returnValues.id;
                            const recResult = await this.contracts.recommendation.methods.getRecommendation(recId).call();
                            data = {
                                id: recId.toString(),
                                author: recResult[0],
                                contentHash: recResult[1],
                                metadata: JSON.parse(recResult[2]),
                                upvotes: parseInt(recResult[3], 10),
                                downvotes: parseInt(recResult[4], 10),
                                timestamp: new Date(parseInt(recResult[5], 10) * 1000).toISOString()
                            };
                        }
                        catch (error) {
                            console.error(`Error fetching recommendation ${event.returnValues.id}:`, error);
                            continue;
                        }
                        break;
                    case 'token':
                        // For token transfers, use event data
                        data = {
                            from: event.returnValues.from,
                            to: event.returnValues.to,
                            amount: this.web3.utils.fromWei(event.returnValues.value, 'ether'),
                            timestamp: new Date().toISOString() // Block timestamp would be more accurate
                        };
                        break;
                    case 'governance':
                        // For governance proposals, fetch full data using the ID
                        try {
                            const propId = event.returnValues.id;
                            const govResult = await this.contracts.governance.methods.getProposal(propId).call();
                            data = {
                                id: propId.toString(),
                                proposer: govResult[0],
                                title: govResult[1],
                                description: govResult[2],
                                parameters: govResult[3],
                                votingStart: parseInt(govResult[4], 10),
                                votingEnd: parseInt(govResult[5], 10),
                                yesVotes: parseInt(govResult[6], 10),
                                noVotes: parseInt(govResult[7], 10),
                                status: this.parseProposalStatus(parseInt(govResult[8], 10))
                            };
                        }
                        catch (error) {
                            console.error(`Error fetching proposal ${event.returnValues.id}:`, error);
                            continue;
                        }
                        break;
                }
                results.push({
                    objectId: `${objectType}-${event.returnValues.id || event.transactionHash}`,
                    objectType,
                    data,
                    commitNumber: event.blockNumber,
                    timestamp: new Date().toISOString() // Block timestamp would be more accurate
                });
            }
            return results;
        }
        catch (error) {
            console.error('Objects query failed:', error);
            throw new Error(`Failed to query objects: ${error.message}`); // Conservative fix: Type cast error
        }
    }
    /**
     * Store data (for engines that expect this method)
     * @param key Storage key
     * @param value Data to store
     * @returns Success status
     */
    async store(key, value) {
        try {
            // For EVM adapter, we'll create a simple transaction to store the data hash
            // In practice, this might use IPFS or another storage solution
            console.log(`EVM Adapter: Storing data for key ${key}`);
            // Create a simple storage transaction
            const dataHash = crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
            // Store in a simple in-memory cache for this adapter instance
            // In production, this would use a proper storage solution
            if (!this.contracts['storage']) {
                // Initialize storage if not exists
                this.contracts['storage'] = {};
            }
            this.contracts['storage'][key] = {
                data: value,
                hash: dataHash,
                timestamp: new Date().toISOString()
            };
            return true;
        }
        catch (error) {
            console.error('Storage operation failed:', error);
            return false;
        }
    }
    /**
     * Retrieve data (for engines that expect this method)
     * @param key Storage key
     * @returns Retrieved data or null
     */
    async retrieve(key) {
        try {
            console.log(`EVM Adapter: Retrieving data for key ${key}`);
            if (!this.contracts['storage']) {
                return null;
            }
            const stored = this.contracts['storage'][key];
            return stored ? stored.data : null;
        }
        catch (error) {
            console.error('Retrieval operation failed:', error);
            return null;
        }
    }
    /**
     * Get network information
     * @returns Network information
     */
    async getNetworkInfo() {
        try {
            const blockNumber = await this.web3.eth.getBlockNumber();
            return {
                chainId: this.chainId.toString(),
                networkName: this.chainId === 250 ? 'Fantom' : this.chainId === 42161 ? 'Arbitrum' : 'Unknown', // FIX: Added missing networkName property
                blockHeight: Number(blockNumber), // FIX 1: Convert bigint to number
                isHealthy: this.isConnected
            };
        }
        catch (error) {
            console.error('Failed to get network info:', error);
            return {
                chainId: this.chainId.toString(),
                networkName: 'Unknown', // FIX: Added missing networkName property
                blockHeight: 0,
                isHealthy: false
            };
        }
    }
    /**
     * Get token balance for an address
     * @param address Wallet address
     * @returns Token balance information
     */
    async getBalance(address) {
        try {
            if (!this.contracts.token) {
                throw new Error('Token contract not initialized');
            }
            const balance = await this.contracts.token.methods.balanceOf(address).call();
            const balanceEther = this.web3.utils.fromWei(balance, 'ether');
            return {
                value: balanceEther, // Conservative fix: Remove 'confirmed', 'pending' properties that don't exist
                decimals: 18, // Standard ERC20 decimals
                symbol: 'TOK'
            };
        }
        catch (error) {
            console.error('Failed to get balance:', error);
            return {
                value: '0', // Conservative fix: Remove 'confirmed', 'pending' properties that don't exist
                decimals: 18,
                symbol: 'TOK'
            };
        }
    }
    subscribeToEvents(eventTypeOrFilter, callback) {
        // Handle the first overload: (eventType: string, callback: function)
        if (typeof eventTypeOrFilter === 'string' && typeof callback === 'function') {
            const subscriptionId = crypto.randomUUID();
            if (!this.eventSubscribers.has(eventTypeOrFilter)) {
                this.eventSubscribers.set(eventTypeOrFilter, []);
            }
            this.eventSubscribers.get(eventTypeOrFilter).push(callback);
            return subscriptionId;
        }
        // Handle the second overload: (filter: EventFilter) => AsyncIterator
        // For now, return a simple async iterator that yields no events
        // In a real implementation, this would use the filter to subscribe to specific events
        return {
            async *[Symbol.asyncIterator]() {
                // Placeholder implementation
                yield* [];
            }
        };
    }
    /**
     * Unsubscribe from events
     * @param subscriptionId ID of the subscription to cancel
     */
    unsubscribeFromEvents(subscriptionId) {
        // Implementation would remove the specific callback
        // For simplicity, we're not implementing the full logic here
        console.log(`Unsubscribed from events with ID: ${subscriptionId}`);
    }
    /**
     * Start event listener to monitor the chain for new events
     */
    startEventListener() {
        // For EVM chains, we can use either WebSocket subscriptions or polling
        // If WebSocket provider is available, use subscription
        if (this.web3.currentProvider && this.web3.currentProvider.subscribe) {
            // Subscribe to new blocks
            // Implementation depends on provider capabilities
            console.log('Using WebSocket event subscription');
        }
        else {
            // Fall back to polling for new blocks and events
            console.log('Using polling for event detection');
            this.pollForEvents();
        }
    }
    /**
     * Stop event listener
     */
    stopEventListener() {
        if (this.eventPollingInterval) {
            clearInterval(this.eventPollingInterval);
        }
        console.log('Event listener stopped');
    }
    /**
     * Poll for new events on the chain
     */
    pollForEvents() {
        let lastProcessedBlock = 0;
        // Start polling interval
        this.eventPollingInterval = setInterval(async () => {
            try {
                const currentBlock = Number(await this.web3.eth.getBlockNumber()); // FIX 1: Convert bigint to number
                if (currentBlock <= lastProcessedBlock) {
                    return;
                }
                // Process new blocks
                for (let blockNumber = lastProcessedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
                    await this.processBlockEvents(blockNumber);
                }
                lastProcessedBlock = currentBlock;
            }
            catch (error) {
                console.error('Error polling for events:', error);
            }
        }, 15000); // Poll every 15 seconds
    }
    /**
     * Process events from a specific block
     * @param blockNumber Block number to process
     */
    async processBlockEvents(blockNumber) {
        try {
            // Get all relevant events from the block
            const eventTypes = [
                { contract: 'recommendation', events: ['RecommendationCreated', 'VoteCast'] },
                { contract: 'token', events: ['Transfer', 'RewardClaimed'] },
                { contract: 'governance', events: ['ProposalCreated', 'VoteCast'] }
            ];
            for (const { contract, events } of eventTypes) {
                if (!this.contracts[contract])
                    continue;
                for (const eventName of events) {
                    const contractEvents = await this.contracts[contract].getPastEvents(eventName, {
                        fromBlock: blockNumber,
                        toBlock: blockNumber
                    });
                    for (const event of contractEvents) {
                        // Map contract event to ChainEvent
                        const chainEvent = this.mapContractEventToChainEvent(contract, eventName, event);
                        // Notify subscribers
                        this.notifyEventSubscribers(eventName, chainEvent);
                        this.notifyEventSubscribers('all', chainEvent);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error processing events for block ${blockNumber}:`, error);
        }
    }
    /**
     * Map contract event to ChainEvent format
     * @param contractType Contract type
     * @param eventName Event name
     * @param event Contract event
     * @returns Chain event
     */
    mapContractEventToChainEvent(contractType, eventName, event) {
        let objectType;
        let objectId;
        let data;
        switch (eventName) {
            case 'RecommendationCreated':
                objectType = 'recommendation';
                objectId = `recommendation-${event.returnValues.id}`;
                data = {
                    id: event.returnValues.id,
                    author: event.returnValues.author,
                    contentHash: event.returnValues.contentHash
                };
                break;
            case 'VoteCast':
                if (contractType === 'recommendation') {
                    objectType = 'recommendation-vote';
                    objectId = `recommendation-vote-${event.returnValues.id}-${event.returnValues.voter}`;
                    data = {
                        recommendationId: event.returnValues.id,
                        voter: event.returnValues.voter,
                        isUpvote: event.returnValues.isUpvote
                    };
                }
                else {
                    objectType = 'governance-vote';
                    objectId = `governance-vote-${event.returnValues.id}-${event.returnValues.voter}`;
                    data = {
                        proposalId: event.returnValues.id,
                        voter: event.returnValues.voter,
                        support: event.returnValues.support
                    };
                }
                break;
            case 'Transfer':
                objectType = 'token-transfer';
                objectId = `token-transfer-${event.transactionHash}`;
                data = {
                    from: event.returnValues.from,
                    to: event.returnValues.to,
                    amount: this.web3.utils.fromWei(event.returnValues.value, 'ether')
                };
                break;
            case 'RewardClaimed':
                objectType = 'token-reward';
                objectId = `token-reward-${event.returnValues.actionId}`;
                data = {
                    recipient: event.returnValues.recipient,
                    amount: this.web3.utils.fromWei(event.returnValues.amount, 'ether'),
                    actionId: event.returnValues.actionId
                };
                break;
            case 'ProposalCreated':
                objectType = 'governance';
                objectId = `governance-${event.returnValues.id}`;
                data = {
                    id: event.returnValues.id,
                    proposer: event.returnValues.proposer,
                    title: event.returnValues.title
                };
                break;
            default:
                objectType = 'unknown';
                objectId = `unknown-${event.transactionHash}`;
                data = event.returnValues;
        }
        return {
            eventId: `${eventName}-${event.transactionHash}-${event.logIndex}`,
            type: eventName, // FIX 4: Added missing 'type' property
            eventType: eventName,
            objectId,
            objectType,
            address: event.address, // FIX 4: Added missing 'address' property
            data,
            commitNumber: event.blockNumber,
            timestamp: new Date().toISOString() // Block timestamp would be more accurate
        };
    }
    /**
     * Notify subscribers of an event
     * @param eventType Event type
     * @param event Chain event
     */
    notifyEventSubscribers(eventType, event) {
        if (this.eventSubscribers.has(eventType)) {
            this.eventSubscribers.get(eventType).forEach(callback => {
                callback(event);
            });
        }
    }
    /**
     * Check if connected to the chain
     * @returns Connection status
     */
    isConnectedToNode() {
        return this.isConnected;
    }
    /**
     * Get the wallet address
     * @returns Wallet address
     */
    async getWalletAddress() {
        if (!this.accountAddress) {
            throw new Error('Wallet not initialized');
        }
        return this.accountAddress;
    }
    // CONSERVATIVE FIX: Add missing ChainAdapter interface methods with 'any' types
    /**
     * Watch events with an async iterator
     */
    async *watchEvents(filter) {
        // Conservative implementation - yields no events for now
        // In production, this would implement proper event watching
        return;
        yield* []; // Unreachable but satisfies TypeScript
    }
    /**
     * Get user trust score
     */
    async getUserTrustScore(userAddress) {
        // Conservative implementation
        try {
            // In a real implementation, this would query trust score from contracts
            console.log(`Getting trust score for user: ${userAddress}`);
            return 0.5; // Default trust score
        }
        catch (error) {
            console.error('Failed to get user trust score:', error);
            return 0;
        }
    }
    /**
     * Get user reputation score
     */
    async getUserReputationScore(userAddress) {
        // Conservative implementation
        try {
            console.log(`Getting reputation score for user: ${userAddress}`);
            return {
                score: 0.5,
                totalRecommendations: 0,
                totalUpvotes: 0
            };
        }
        catch (error) {
            console.error('Failed to get user reputation score:', error);
            return {
                score: 0,
                totalRecommendations: 0,
                totalUpvotes: 0
            };
        }
    }
    /**
     * Submit action for reward
     */
    async submitActionForReward(action) {
        // Conservative implementation
        try {
            console.log('Submitting action for reward:', action);
            // In production, this would submit the action to reward contracts
            return {
                success: true,
                rewardId: `reward-${Date.now()}`,
                amount: 1.0
            };
        }
        catch (error) {
            console.error('Failed to submit action for reward:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Get chain ID
     */
    async getChainId() {
        return this.chainId.toString();
    }
    /**
     * Submit transaction (alias for submitTransaction)
     */
    async submitTx(transaction) {
        return this.submitTransaction(transaction);
    }
    /**
     * Get current commit number
     */
    async getCurrentCommit() {
        try {
            return Number(await this.web3.eth.getBlockNumber());
        }
        catch (error) {
            console.error('Failed to get current commit:', error);
            return 0;
        }
    }
    /**
     * Estimate transaction fee
     */
    async estimateFee(transaction) {
        try {
            const gasPrice = await this.web3.eth.getGasPrice();
            return {
                estimated: gasPrice.toString(),
                currency: 'ETH'
            };
        }
        catch (error) {
            console.error('Failed to estimate fee:', error);
            return {
                estimated: '0',
                currency: 'ETH'
            };
        }
    }
    /**
     * Claim user rewards - CONSERVATIVE FIX: Added missing ChainAdapter method
     */
    async claimUserRewards(userAddress) {
        try {
            console.log(`Claiming rewards for user: ${userAddress}`);
            // In production, this would interact with reward contracts
            return {
                success: true,
                totalClaimed: 0,
                transactions: []
            };
        }
        catch (error) {
            console.error('Failed to claim user rewards:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
