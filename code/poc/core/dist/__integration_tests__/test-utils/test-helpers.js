"use strict";
// code/poc/core/src/__integration_tests__/test-utils/test-helpers.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMockResponses = setupMockResponses;
exports.waitForCondition = waitForCondition;
const nock_1 = __importDefault(require("nock"));
/**
 * Set up mock responses for API requests
 */
function setupMockResponses() {
    // Clear any existing mocks
    nock_1.default.cleanAll();
    // Mock node info endpoint
    (0, nock_1.default)('http://localhost:8080')
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
async function waitForCondition(condition, timeoutMs = 5000, intervalMs = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Condition not met within ${timeoutMs}ms`);
}
//# sourceMappingURL=test-helpers.js.map