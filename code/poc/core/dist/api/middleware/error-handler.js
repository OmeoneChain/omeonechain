"use strict";
/**
 * Error Handler Middleware
 *
 * Centralized error handling for the API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.errorHandler = errorHandler;
/**
 * Custom API error class
 */
class ApiError extends Error {
    /**
     * Create a new API error
     *
     * @param message Error message
     * @param statusCode HTTP status code
     * @param code Error code
     * @param details Additional error details
     */
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Convert to JSON representation
     *
     * @returns JSON object
     */
    toJSON() {
        return {
            error: {
                message: this.message,
                code: this.code || 'INTERNAL_ERROR',
                ...(this.details && { details: this.details })
            }
        };
    }
    /**
     * Create a Bad Request error (400)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
        return new ApiError(message, 400, code, details);
    }
    /**
     * Create an Unauthorized error (401)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED', details) {
        return new ApiError(message, 401, code, details);
    }
    /**
     * Create a Forbidden error (403)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN', details) {
        return new ApiError(message, 403, code, details);
    }
    /**
     * Create a Not Found error (404)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static notFound(message = 'Not found', code = 'NOT_FOUND', details) {
        return new ApiError(message, 404, code, details);
    }
    /**
     * Create a Conflict error (409)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static conflict(message = 'Conflict', code = 'CONFLICT', details) {
        return new ApiError(message, 409, code, details);
    }
    /**
     * Create a Too Many Requests error (429)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static tooManyRequests(message = 'Too many requests', code = 'TOO_MANY_REQUESTS', details) {
        return new ApiError(message, 429, code, details);
    }
    /**
     * Create an Internal Server Error (500)
     *
     * @param message Error message
     * @param code Error code
     * @param details Additional error details
     * @returns API error
     */
    static internal(message = 'Internal server error', code = 'INTERNAL_ERROR', details) {
        return new ApiError(message, 500, code, details);
    }
}
exports.ApiError = ApiError;
/**
 * Express error handler middleware
 *
 * @param err Error object
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
function errorHandler(err, req, res, next) {
    // Log the error
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    // Default to 500 Internal Server Error
    let statusCode = 500;
    let errorResponse = {
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        }
    };
    // Handle API errors
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        errorResponse = err.toJSON();
    }
    // Handle validation errors (e.g., from Joi or express-validator)
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        errorResponse = {
            error: {
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: err.details || err.message
            }
        };
    }
    // Handle JWT errors
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorResponse = {
            error: {
                message: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }
        };
    }
    // Add request ID if available
    if (req.headers['x-request-id']) {
        errorResponse.error = {
            ...errorResponse.error,
            requestId: req.headers['x-request-id']
        };
    }
    // In development, include stack trace
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = {
            ...errorResponse.error,
            stack: err.stack
        };
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
}
exports.default = errorHandler;
//# sourceMappingURL=error-handler.js.map