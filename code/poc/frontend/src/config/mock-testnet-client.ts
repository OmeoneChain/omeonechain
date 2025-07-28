// File path: /code/poc/frontend/src/config/mock-testnet-client.ts
// Mock client for development when IOTA testnet is not accessible

export interface MockTestnetClient {
  getObject: (objectId: string) => Promise<any>;
  getNetworkStatus: () => Promise<any>;
  getLatestCheckpointSequenceNumber: () => Promise<string>;
  getUserReputation: (address: string) => Promise<any>;
  getTokenBalance: (address: string) => Promise<any>;
  getOwnedObjects: (params: any) => Promise<any>;
  multiGetObjects: (objects: any[]) => Promise<any>;
  queryEvents: (query: any) => Promise<any>;
  createRecommendation: (...args: any[]) => Promise<any>;
  executeContract: (...args: any[]) => Promise<any>;
}

export const createMockTestnetClient = (): MockTestnetClient => ({
  async getObject(objectId: string) {
    console.log(`🔧 Mock: Getting object ${objectId.slice(0, 10)}...`);
    
    // Simulate successful contract access
    return {
      data: {
        content: {
          fields: {
            id: objectId,
            version: '1.0.0',
            type: 'SmartContract'
          }
        }
      }
    };
  },

  async getNetworkStatus() {
    console.log('🔧 Mock: Getting network status...');
    return {
      isHealthy: true,
      contractsDeployed: 5,
      latestCheckpoint: 123456,
      networkHealth: 'healthy'
    };
  },

  async getLatestCheckpointSequenceNumber() {
    return '123456';
  },

  async getUserReputation(address: string) {
    console.log(`🔧 Mock: Getting user reputation for ${address.slice(0, 10)}...`);
    return {
      data: {
        content: {
          fields: {
            reputation_score: 84700, // 0.847 * 100000
            trust_score: 86000,      // 0.86 * 100000
            total_recommendations: 23,
            upvotes_received: 156,
            direct_connections: ['0xuser1', '0xuser2', '0xuser3'],
            indirect_connections: ['0xuser4', '0xuser5', '0xuser6', '0xuser7', '0xuser8'],
            staking_tier: 'curator',
            tokens_earned: 1250000000 // 1250 tokens with 6 decimals
          }
        }
      }
    };
  },

  async getTokenBalance(address: string) {
    console.log(`🔧 Mock: Getting token balance for ${address.slice(0, 10)}...`);
    return {
      data: [
        {
          balance: '1250000000000' // 1250 tokens with 9 decimals
        }
      ]
    };
  },

  async getOwnedObjects(params: any) {
    console.log('🔧 Mock: Getting owned objects...');
    return {
      data: [
        {
          data: {
            content: {
              fields: {
                balance: '1250000000000' // 1250 tokens
              }
            }
          }
        }
      ]
    };
  },

  async multiGetObjects(objects: any[]) {
    console.log(`🔧 Mock: Getting ${objects.length} objects...`);
    return objects.map(obj => ({
      data: {
        content: {
          fields: {
            id: obj.objectId,
            accessible: true
          }
        }
      }
    }));
  },

  async queryEvents(query: any) {
    console.log('🔧 Mock: Querying events...');
    return {
      data: [
        {
          parsedJson: {
            recommendation_id: 'rec_123',
            endorser: '0xuser1',
            endorsement_type: 'upvote',
            user_trust_score: 8000
          },
          timestampMs: Date.now().toString()
        },
        {
          parsedJson: {
            recommendation_id: 'rec_123',
            endorser: '0xuser2',
            endorsement_type: 'save',
            user_trust_score: 7500
          },
          timestampMs: Date.now().toString()
        }
      ]
    };
  },

  async createRecommendation(...args: any[]) {
    console.log('🔧 Mock: Creating recommendation...');
    return {
      digest: `0x${Math.random().toString(16).slice(2)}`,
      status: 'success'
    };
  },

  async executeContract(...args: any[]) {
    console.log('🔧 Mock: Executing contract...');
    return {
      digest: `0x${Math.random().toString(16).slice(2)}`,
      status: 'success'
    };
  }
});

export default createMockTestnetClient;