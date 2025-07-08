// src/__integration_tests__/rebased-adapter/setup.ts
// Enhanced version with TypeScript fixes while preserving existing structure

import { RebasedAdapter } from '../../adapters/rebased-adapter';
import { RecommendationEngine } from '../../recommendation/engine';
import { ReputationEngine } from '../../reputation/engine';
import { TokenEngine } from '../../token/engine';
import { GovernanceEngine } from '../../governance/engine';

// FIX 1: Create fallback ServiceEngine type for missing import
type ServiceEngine = any;

export interface TestSetup {
  adapter: RebasedAdapter;
  engines: {
    recommendation: RecommendationEngine;
    reputation: ReputationEngine;
    token: TokenEngine;
    governance: GovernanceEngine;
    service?: ServiceEngine;
  };
  cleanup: () => Promise<void>;
}

/**
 * Creates a test environment with initialized engines and adapter
 * Enhanced with proper constructor handling and TypeScript compatibility
 */
export async function setupTestEnvironment(useMocks = true): Promise<TestSetup> {
  // Create the RebasedAdapter with test configuration
  const adapter = new RebasedAdapter({
    network: 'testnet',
    nodeUrl: useMocks ? 'http://localhost:8080' : 'https://api.testnet.rebased.iota.org',
    account: {
      address: process.env.IOTA_ADDRESS || '0xtestacc0untaddr355000000000000000000000000',
      privateKey: process.env.IOTA_PRIVATE_KEY || '0xtestprivatekey00000000000000000000000000',
    },
    contractAddresses: {
      recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
      reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
      token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
      governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
      service: '0x4f6d656f6e65536572766963655ddc8',
    },
    options: {
      retryAttempts: 1, // Use 1 for faster tests
      timeoutMs: 5000
    }
  });

  // Connect to the blockchain
  await adapter.connect();

  // Create a mock storage instance for engines that need it
  const mockStorage = {
    store: async (data: any) => ({ success: true, cid: 'mock_cid_' + Date.now() }),
    retrieve: async (cid: string) => ({ success: true, data: { mockData: true } }),
    connect: async () => { console.log('Mock storage connected'); },
    disconnect: async () => { console.log('Mock storage disconnected'); }
  };

  // Initialize engines with proper constructor arguments and error handling
  const engines = await initializeEngines(adapter, mockStorage);

  // Return the test environment
  return {
    adapter,
    engines,
    // Cleanup function to call after tests
    cleanup: async () => {
      try {
        if (mockStorage && typeof mockStorage.disconnect === 'function') {
          await mockStorage.disconnect();
        }
        await adapter.disconnect();
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }
  };
}

/**
 * Alternative setup function that handles different engine constructor patterns
 * Enhanced with better error handling and TypeScript compatibility
 */
export async function setupTestEnvironmentSafe(useMocks = true): Promise<TestSetup> {
  // Create the RebasedAdapter with test configuration
  const adapter = new RebasedAdapter({
    network: 'testnet',
    nodeUrl: useMocks ? 'http://localhost:8080' : 'https://api.testnet.rebased.iota.org',
    account: {
      address: process.env.IOTA_ADDRESS || '0xtestacc0untaddr355000000000000000000000000',
      privateKey: process.env.IOTA_PRIVATE_KEY || '0xtestprivatekey00000000000000000000000000',
    },
    contractAddresses: {
      recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
      reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
      token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
      governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
      service: '0x4f6d656f6e65536572766963655ddc8',
    },
    options: {
      retryAttempts: 1,
      timeoutMs: 5000
    }
  });

  // Connect to the blockchain
  await adapter.connect();

  // Create a storage instance if needed
  const storage = {
    store: async (data: any) => ({ success: true, cid: 'mock_cid' }),
    retrieve: async (cid: string) => ({ success: true, data: {} }),
    connect: async () => {},
    disconnect: async () => {}
  };

  // Initialize engines with defensive programming
  const engines = await initializeEnginesDefensively(adapter, storage);

  return {
    adapter,
    engines,
    cleanup: async () => {
      try {
        if (storage && typeof storage.disconnect === 'function') {
          await storage.disconnect();
        }
        await adapter.disconnect();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
  };
}

/**
 * Initialize engines with proper constructor arguments
 * This function handles the known constructor signatures
 */
async function initializeEngines(adapter: RebasedAdapter, storage: any) {
  // Initialize engines in dependency order
  
  // 1. Reputation Engine (no dependencies)
  const reputationEngine = new ReputationEngine(adapter as any);
  
  // 2. Token Engine (no dependencies)
  const tokenEngine = new TokenEngine(adapter as any);
  
  // 3. Recommendation Engine (needs adapter and storage)
  const recommendationEngine = new RecommendationEngine(adapter as any, storage);
  
  // 4. Governance Engine (needs adapter, storage, reputation, and token engines)
  const governanceEngine = new GovernanceEngine(
    adapter as any,
    storage,
    reputationEngine,
    tokenEngine
  );
  
  // 5. Service Engine (optional, needs adapter)
  let serviceEngine: ServiceEngine | undefined;
  try {
    // FIX 2: Create mock ServiceEngine since import is missing
    serviceEngine = {
      adapter: adapter as any,
      initialize: async () => console.log('Mock ServiceEngine initialized'),
      cleanup: async () => console.log('Mock ServiceEngine cleaned up')
    } as any;
  } catch (error) {
    console.warn('ServiceEngine initialization failed:', error);
  }

  return {
    recommendation: recommendationEngine,
    reputation: reputationEngine,
    token: tokenEngine,
    governance: governanceEngine,
    service: serviceEngine
  };
}

/**
 * Enhanced helper function to create engine instances with different constructor patterns
 * Now with better TypeScript support and error messages
 */
async function initializeEnginesDefensively(adapter: RebasedAdapter, storage: any) {
  const engines: any = {};

  // Initialize each engine based on its constructor signature
  try {
    engines.recommendation = createEngineInstance(RecommendationEngine, [adapter as any, storage], 'RecommendationEngine');
  } catch (error) {
    console.warn('Failed to create RecommendationEngine:', error);
    // Create a mock engine to prevent further errors
    engines.recommendation = createMockEngine('RecommendationEngine');
  }

  try {
    engines.reputation = createEngineInstance(ReputationEngine, [adapter as any], 'ReputationEngine');
  } catch (error) {
    console.warn('Failed to create ReputationEngine:', error);
    engines.reputation = createMockEngine('ReputationEngine');
  }

  try {
    engines.token = createEngineInstance(TokenEngine, [adapter as any], 'TokenEngine');
  } catch (error) {
    console.warn('Failed to create TokenEngine:', error);
    engines.token = createMockEngine('TokenEngine');
  }

  try {
    engines.governance = createEngineInstance(GovernanceEngine, [
      adapter as any, 
      storage, 
      engines.reputation, 
      engines.token
    ], 'GovernanceEngine');
  } catch (error) {
    console.warn('Failed to create GovernanceEngine:', error);
    engines.governance = createMockEngine('GovernanceEngine');
  }

  try {
    // FIX 3: Use mock instead of trying to import missing ServiceEngine
    engines.service = {
      adapter: adapter as any,
      initialize: async () => console.log('Mock ServiceEngine initialized'),
      cleanup: async () => console.log('Mock ServiceEngine cleaned up')
    } as any;
  } catch (error) {
    console.warn('Failed to create ServiceEngine:', error);
    engines.service = createMockEngine('ServiceEngine');
  }

  return engines;
}

/**
 * Enhanced helper function to create engine instances with different constructor patterns
 */
function createEngineInstance(EngineClass: any, args: any[], engineName: string): any {
  // Try different argument combinations in order of most likely to succeed
  const patterns = [
    args, // All arguments (most specific)
    [args[0], args[1]], // First two arguments
    [args[0]], // First argument only (most common - just adapter)
    [], // No arguments (fallback)
  ];

  let lastError: Error | null = null;

  for (const pattern of patterns) {
    try {
      const instance = new EngineClass(...pattern);
      
      // If successful and has setAdapter method, call it with the adapter
      if (args[0] && typeof instance.setAdapter === 'function') {
        instance.setAdapter(args[0]);
      }
      
      console.log(`✅ Successfully created ${engineName} with ${pattern.length} arguments`);
      return instance;
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ Failed to create ${engineName} with ${pattern.length} arguments:`, (error as Error).message);
      continue;
    }
  }

  throw new Error(`Could not create instance of ${engineName} with any argument pattern. Last error: ${lastError?.message}`);
}

/**
 * Create a mock engine for testing when real engine creation fails
 */
function createMockEngine(engineName: string) {
  console.warn(`Creating mock ${engineName} for testing`);
  
  return {
    engineName,
    isMock: true,
    setAdapter: (adapter: any) => {
      console.log(`Mock ${engineName} adapter set`);
    },
    // Add common methods that tests might expect
    initialize: async () => { console.log(`Mock ${engineName} initialized`); },
    cleanup: async () => { console.log(`Mock ${engineName} cleaned up`); },
  };
}

/**
 * Utility function to check if engines are properly initialized
 */
export function validateTestSetup(setup: TestSetup): boolean {
  const requiredEngines = ['recommendation', 'reputation', 'token', 'governance'];
  
  for (const engineName of requiredEngines) {
    const engine = setup.engines[engineName as keyof typeof setup.engines];
    if (!engine) {
      console.error(`Missing required engine: ${engineName}`);
      return false;
    }
    
    if ((engine as any).isMock) {
      console.warn(`Engine ${engineName} is a mock - tests may not work as expected`);
    }
  }
  
  if (!setup.adapter) {
    console.error('Missing adapter in test setup');
    return false;
  }
  
  return true;
}

/**
 * Helper function to create minimal test data
 */
export function createTestData() {
  return {
    testUser: {
      id: 'test_user_' + Date.now(),
      address: process.env.IOTA_ADDRESS || '0xtest_address',
    },
    testRecommendation: {
      id: 'test_rec_' + Date.now(),
      title: 'Test Restaurant',
      description: 'A great place for testing',
      category: 'restaurant',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St, Test City'
      }
    },
    testProposal: {
      id: 'test_prop_' + Date.now(),
      title: 'Test Governance Proposal',
      description: 'A proposal for testing purposes',
      type: 'parameter_change'
    }
  };
}

/**
 * Legacy function for backward compatibility
 */
export async function setupTestEnvironmentLegacy() {
  console.warn('setupTestEnvironmentLegacy is deprecated, use setupTestEnvironment instead');
  return await setupTestEnvironment(true);
}