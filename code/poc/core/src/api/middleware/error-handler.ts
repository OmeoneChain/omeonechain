/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom API error class
 */
export class ApiError extends Error {
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
  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, any>
  ) {
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
  toJSON(): Record<string, any> {
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
  static badRequest(
    message: string = 'Bad request',
    code: string = 'BAD_REQUEST',
    details?: Record<string, any>
  ): ApiError {
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
  static unauthorized(
    message: string = 'Unauthorized',
    code: string = 'UNAUTHORIZED',
    details?: Record<string, any>
  ): ApiError {
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
  static forbidden(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN',
    details?: Record<string, any>
  ): ApiError {
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
  static notFound(
    message: string = 'Not found',
    code: string = 'NOT_FOUND',
    details?: Record<string, any>
  ): ApiError {
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
  static conflict(
    message: string = 'Conflict',
    code: string = 'CONFLICT',
    details?: Record<string, any>
  ): ApiError {
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
  static tooManyRequests(
    message: string = 'Too many requests',
    code: string = 'TOO_MANY_REQUESTS',
    details?: Record<string, any>
  ): ApiError {
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
  static internal(
    message: string = 'Internal server error',
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ): ApiError {
    return new ApiError(message, 500, code, details);
  }
}

/**
 * Express error handler middleware
 * 
 * @param err Error object
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorResponse: any = {
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
        details: (err as any).details || err.message
      }
    } as any;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
    } as any;
  }
  
  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.error = {
      ...errorResponse.error,
      requestId: req.headers['x-request-id']
    } as any;
  }
  
  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      ...errorResponse.error,
      stack: err.stack
    } as any;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

export default errorHandler;