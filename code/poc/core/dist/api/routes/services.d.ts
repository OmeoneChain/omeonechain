/**
 * Services API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for service management
 * Based on Technical Specifications A.4.1
 */
import { ServiceEngine } from '../../services/engine';
/**
 * Create service routes
 *
 * @param engine Service engine instance
 * @returns Express router
 */
export declare function createServiceRoutes(engine: ServiceEngine): import("express-serve-static-core").Router;
export default createServiceRoutes;
