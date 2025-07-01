/**
 * Developer API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for third-party developers
 * Based on Technical Specifications A.4.2
 */
import { RecommendationEngine } from '../../recommendation/engine';
import { ReputationEngine } from '../../reputation/engine';
import { ServiceEngine } from '../../services/engine';
/**
 * Developer engines interface
 */
interface DeveloperEngines {
    recommendationEngine: RecommendationEngine;
    reputationEngine: ReputationEngine;
    serviceEngine: ServiceEngine;
}
/**
 * Create developer routes
 *
 * @param engines Engine instances
 * @returns Express router
 */
export declare function createDeveloperRoutes(engines: DeveloperEngines): import("express-serve-static-core").Router;
export default createDeveloperRoutes;
