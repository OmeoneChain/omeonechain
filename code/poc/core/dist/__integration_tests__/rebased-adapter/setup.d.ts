import { RebasedAdapter } from '../../adapters/rebased-adapter';
import { RecommendationEngine } from '../../recommendation/engine';
import { ReputationEngine } from '../../reputation/engine';
import { TokenEngine } from '../../token/engine';
import { GovernanceEngine } from '../../governance/engine';
import { ServiceEngine } from '../../service/engine';
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
export declare function setupTestEnvironment(useMocks?: boolean): Promise<TestSetup>;
/**
 * Alternative setup function that handles different engine constructor patterns
 * Enhanced with better error handling and TypeScript compatibility
 */
export declare function setupTestEnvironmentSafe(useMocks?: boolean): Promise<TestSetup>;
/**
 * Utility function to check if engines are properly initialized
 */
export declare function validateTestSetup(setup: TestSetup): boolean;
/**
 * Helper function to create minimal test data
 */
export declare function createTestData(): {
    testUser: {
        id: string;
        address: string;
    };
    testRecommendation: {
        id: string;
        title: string;
        description: string;
        category: string;
        location: {
            latitude: number;
            longitude: number;
            address: string;
        };
    };
    testProposal: {
        id: string;
        title: string;
        description: string;
        type: string;
    };
};
/**
 * Legacy function for backward compatibility
 */
export declare function setupTestEnvironmentLegacy(): Promise<TestSetup>;
