/**
 * Users API Routes (v3 - Phase 5C Integration + Profile Management)
 *
 * API endpoints for user management and reputation with Phase 5B integration
 * Includes social graph, discovery incentives, community verification, and profile updates
 */
import { ReputationEngine } from '../../reputation/engine';
/**
 * Create user routes
 *
 * @param engine Reputation engine instance
 * @returns Express router
 */
export declare function createUserRoutes(engine: ReputationEngine): import("express-serve-static-core").Router;
export default createUserRoutes;
