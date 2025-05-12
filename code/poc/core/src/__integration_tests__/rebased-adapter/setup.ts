// code/poc/core/src/__integration_tests__/rebased-adapter/setup.ts

import { RebasedAdapter } from '../../adapters/rebased-adapter';
import { RecommendationEngine } from '../../recommendation/engine';
import { ReputationEngine } from '../../reputation/engine';
import { TokenEngine } from '../../token/engine';
import { GovernanceEngine } from '../../governance/engine';

/**
 * Creates a test environment with initialized engines and adapter
 */
export async function setupTestEnvironment(useMocks = true) {
  // Create the RebasedAdapter with test configuration
  const adapter = new RebasedAdapter({
    network: 'testnet',
    nodeUrl: useMocks ? 'http://localhost:8080' : 'https://api.testnet.rebased.iota.org',
    account: {
      address: '0xtestacc0untaddr355000000000000000000000000',
      privateKey: '0xtestprivatekey00000000000000000000000000',
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

  // Initialize engines with the adapter
  const recommendationEngine = new RecommendationEngine();
  recommendationEngine.setAdapter(adapter);

  const reputationEngine = new ReputationEngine();
  reputationEngine.setAdapter(adapter);

  const tokenEngine = new TokenEngine();
  tokenEngine.setAdapter(adapter);

  const governanceEngine = new GovernanceEngine();
  governanceEngine.setAdapter(adapter);

  // Return the test environment
  return {
    adapter,
    engines: {
      recommendation: recommendationEngine,
      reputation: reputationEngine,
      token: tokenEngine,
      governance: governanceEngine
    },
    // Cleanup function to call after tests
    cleanup: async () => {
      await adapter.disconnect();
    }
  };
}
