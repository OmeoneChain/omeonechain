// code/poc/core/src/__integration_tests__/test-utils/test-helpers.ts

import axios from 'axios';
import * as nock from 'nock';

/**
 * Set up mock responses for API requests
 */
export function setupMockResponses() {
  // Clear any existing mocks
  nock.cleanAll();

  // Mock node info endpoint
  nock('http://localhost:8080')
    .get('/api/v1/info')
    .reply(200, {
      version: '1.0.0',
      network: 'rebased-testnet',
      latestCommitNumber: 12345
    });

  // More mock endpoints can be added here...
}

/**
 * Wait for a specific condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}
