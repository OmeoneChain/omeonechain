/**
 * Request Logger Middleware
 * 
 * Logs incoming API requests for monitoring and debugging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
 * Default options for request logging
 */
const DEFAULT_OPTIONS: RequestLoggerOptions = {
  logBody: process.env.NODE_ENV === 'development',
  logQuery: true,
  skipPaths: [/^\/health$/, /^\/favicon.ico$/],
  skipMethods: [],
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  level: 'info',
  timestampFormat: 'ISO',
  logger: (message: string, level: string = 'info') => {
    (console as any)[level](message);
  }
};

/**
 * Format a timestamp
 * 
 * @param format Format type ('ISO' or custom)
 * @returns Formatted timestamp
 */
function formatTimestamp(format: string): string {
  const now = new Date();
  
  if (format === 'ISO') {
    return now.toISOString();
  }
  
  // Can add custom formats here
  return now.toISOString();
}

/**
 * Sanitize an object to remove sensitive information
 * 
 * @param obj Object to sanitize
 * @param sensitiveFields Fields to mask
 * @returns Sanitized object
 */
function sanitizeObject(
  obj: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  if (!obj) return obj;
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create a request logger middleware
 * 
 * @param options Logger options
 * @returns Express middleware function
 */
export function createRequestLogger(options: RequestLoggerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for specified paths/methods
    if (
      (opts.skipPaths && opts.skipPaths.some(pattern => pattern.test(req.path))) ||
      (opts.skipMethods && opts.skipMethods.includes(req.method))
    ) {
      return next();
    }
    
    // Add request ID if not present
    if (!req.headers['x-request-id']) {
      const requestId = uuidv4();
      req.headers['x-request-id'] = requestId;
      res.setHeader('x-request-id', requestId);
    }
    
    // Record start time
    const startTime = Date.now();
    
    // Prepare log data
    const logData: Record<string, any> = {
      timestamp: formatTimestamp(opts.timestampFormat || 'ISO'),
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    
    // Add query parameters if enabled
    if (opts.logQuery && Object.keys(req.query).length > 0) {
      logData.query = sanitizeObject(req.query);
    }
    
    // Add request body if enabled
    if (opts.logBody && req.body && Object.keys(req.body).length > 0) {
      logData.body = sanitizeObject(req.body);
    }
    
    // Add sanitized headers
    if (req.headers) {
      const sanitizedHeaders = sanitizeObject(
        req.headers,
        opts.sensitiveHeaders
      );
      logData.headers = sanitizedHeaders;
    }
    
    // Log the request
    opts.logger?.(`REQUEST: ${JSON.stringify(logData)}`, opts.level);
    
    // Capture the response
    const originalEnd = res.end;
    const chunks: Buffer[] = [];
    
    // @ts-ignore - Override res.end to capture response
    res.end = function(chunk: any, ...rest: any[]) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Prepare response log data
      const responseLogData: Record<string, any> = {
        timestamp: formatTimestamp(opts.timestampFormat || 'ISO'),
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
      };
      
      // Add response body for non-binary responses in development
      if (
        process.env.NODE_ENV === 'development' &&
        opts.logBody &&
        chunks.length > 0 &&
        res.getHeader('content-type')?.toString().includes('application/json')
      ) {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          const parsedBody = JSON.parse(body);
          responseLogData.body = parsedBody;
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Log the response
      opts.logger?.(`RESPONSE: ${JSON.stringify(responseLogData)}`, opts.level);
      
      // Call the original end method
      return (originalEnd as any).call(this, chunk, ...rest);
    };
    
    next();
  };
}

/**
 * Default request logger middleware
 */
export const requestLogger = createRequestLogger();

export default requestLogger;