"use strict";
/**
 * Request Logger Middleware
 *
 * Logs incoming API requests for monitoring and debugging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
exports.createRequestLogger = createRequestLogger;
const uuid_1 = require("uuid");
/**
 * Default options for request logging
 */
const DEFAULT_OPTIONS = {
    logBody: process.env.NODE_ENV === 'development',
    logQuery: true,
    skipPaths: [/^\/health$/, /^\/favicon.ico$/],
    skipMethods: [],
    sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
    level: 'info',
    timestampFormat: 'ISO',
    logger: (message, level = 'info') => {
        console[level](message);
    }
};
/**
 * Format a timestamp
 *
 * @param format Format type ('ISO' or custom)
 * @returns Formatted timestamp
 */
function formatTimestamp(format) {
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
function sanitizeObject(obj, sensitiveFields = []) {
    if (!obj)
        return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, sensitiveFields);
        }
        else {
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
function createRequestLogger(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return (req, res, next) => {
        // Skip logging for specified paths/methods
        if ((opts.skipPaths && opts.skipPaths.some(pattern => pattern.test(req.path))) ||
            (opts.skipMethods && opts.skipMethods.includes(req.method))) {
            return next();
        }
        // Add request ID if not present
        if (!req.headers['x-request-id']) {
            const requestId = (0, uuid_1.v4)();
            req.headers['x-request-id'] = requestId;
            res.setHeader('x-request-id', requestId);
        }
        // Record start time
        const startTime = Date.now();
        // Prepare log data
        const logData = {
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
            const sanitizedHeaders = sanitizeObject(req.headers, opts.sensitiveHeaders);
            logData.headers = sanitizedHeaders;
        }
        // Log the request
        opts.logger?.(`REQUEST: ${JSON.stringify(logData)}`, opts.level);
        // Capture the response
        const originalEnd = res.end;
        const chunks = [];
        // @ts-ignore - Override res.end to capture response
        res.end = function (chunk, ...rest) {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            // Calculate response time
            const responseTime = Date.now() - startTime;
            // Prepare response log data
            const responseLogData = {
                timestamp: formatTimestamp(opts.timestampFormat || 'ISO'),
                requestId: req.headers['x-request-id'],
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
            };
            // Add response body for non-binary responses in development
            if (process.env.NODE_ENV === 'development' &&
                opts.logBody &&
                chunks.length > 0 &&
                res.getHeader('content-type')?.toString().includes('application/json')) {
                try {
                    const body = Buffer.concat(chunks).toString('utf8');
                    const parsedBody = JSON.parse(body);
                    responseLogData.body = parsedBody;
                }
                catch (e) {
                    // Ignore parsing errors
                }
            }
            // Log the response
            opts.logger?.(`RESPONSE: ${JSON.stringify(responseLogData)}`, opts.level);
            // Call the original end method
            return originalEnd.call(this, chunk, ...rest);
        };
        next();
    };
}
/**
 * Default request logger middleware
 */
exports.requestLogger = createRequestLogger();
exports.default = exports.requestLogger;
//# sourceMappingURL=request-logger.js.map