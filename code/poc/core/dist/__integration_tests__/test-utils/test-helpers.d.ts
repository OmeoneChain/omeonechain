/**
 * Set up mock responses for API requests
 */
export declare function setupMockResponses(): void;
/**
 * Wait for a specific condition to be true
 */
export declare function waitForCondition(condition: () => boolean | Promise<boolean>, timeoutMs?: number, intervalMs?: number): Promise<void>;
