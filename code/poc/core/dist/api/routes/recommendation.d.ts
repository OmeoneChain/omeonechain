/**
 * Recommendations API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for recommendations management
 * Based on Technical Specifications A.4.1
 */
import { RecommendationEngine } from '../../recommendation/engine';
/**
 * Create recommendation routes
 *
 * @param engine Recommendation engine instance
 * @returns Express router
 */
export declare function createRecommendationRoutes(engine: RecommendationEngine): import("express-serve-static-core").Router;
export default createRecommendationRoutes;
