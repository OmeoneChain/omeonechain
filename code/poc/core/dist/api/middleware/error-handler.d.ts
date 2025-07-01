/**
 * Error Handler Middleware
 *
 * Centralized error handling for the API
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Custom API error class
 */
export declare class ApiError extends Error {
    /**
     * HTTP status code
     */
    statusCode: number;
    /**
     * Error code for client identification
     */
    code?: string;
    /**
     * Additional error details
     */
    details?: Record<string, any>;
    /**
     * Create a new API error
     *
     * @param message Error message
     * @param statusCode HTTP status code
     * @param code Error code
     * @param details Additional error details
     */
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, any>);
    /**
     * Convert to JSON representation
     *
     * @returns JSON object
     */
    toJSON(): Record<string, any>;
    /**
     * Create a Bad Request error (400)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static badRequest(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create an Unauthorized error (401)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static unauthorized(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create a Forbidden error (403)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static forbidden(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create a Not Found error (404)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static notFound(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create a Conflict error (409)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static conflict(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create a Too Many Requests error (429)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static tooManyRequests(message?: string, code?: string, details?: Record<string, any>): ApiError;
    /**
     * Create an Internal Server Error (500)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static internal(message?: string, code?: string, details?: Record<string, any>): ApiError;
}
/**
 * Express error handler middleware
 *
 * @param err Error object
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export declare function errorHandler(err: Error | ApiError, req: Request, res: Response, next: NextFunction): void;
export default errorHandler;
