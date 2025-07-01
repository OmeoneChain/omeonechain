/**
 * Governance API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for platform governance
 * Based on Technical Specifications A.8
 */
import { GovernanceEngine } from '../../governance/engine';
/**
 * Create governance routes
 *
 * @param engine Governance engine instance
 * @returns Express router
 */
export declare function createGovernanceRoutes(engine: GovernanceEngine): import("express-serve-static-core").Router;
export default createGovernanceRoutes;
