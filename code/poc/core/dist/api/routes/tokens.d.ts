/**
 * Token API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for token operations and wallet management
 * Based on Technical Specifications A.4.1
 */
import { TokenEngine } from '../../token/engine';
/**
 * Create token routes
 *
 * @param engine Token engine instance
 * @returns Express router
 */
export declare function createTokenRoutes(engine: TokenEngine): import("express-serve-static-core").Router;
export default createTokenRoutes;
