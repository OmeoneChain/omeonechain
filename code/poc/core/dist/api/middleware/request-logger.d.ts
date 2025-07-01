/**
 * Request Logger Middleware
 *
 * Logs incoming API requests for monitoring and debugging
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Options for request logging
 */
export interface RequestLoggerOptions {
    /**
     * Whether to log request bodies
     */
    logBody?: boolean;
    /**
     * Whether to log query parameters
     */
    logQuery?: boolean;
    /**
     * Skip logging for these paths (regex patterns)
     */
    skipPaths?: RegExp[];
    /**
     * Skip logging for these methods
     */
    skipMethods?: string[];
    /**
     * Remove sensitive headers (e.g., 'authorization')
     */
    sensitiveHeaders?: string[];
    /**
     * Log level for requests
     */
    level?: 'debug' | 'info' | 'warn';
    /**
     * Format for logging timestamps
     */
    timestampFormat?: string;
    /**
     * Custom logger implementation
     */
    logger?: (message: string, level?: string) => void;
}
/**
 * Create a request logger middleware
 *
 * @param options Logger options
 * @returns Express middleware function
 */
export declare function createRequestLogger(options?: RequestLoggerOptions): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Default request logger middleware
 */
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export default requestLogger;
