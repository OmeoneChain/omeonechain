"use strict";
// src/types/index.ts
// Comprehensive type exports to fix import issues
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.HttpStatusCode = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.ChainOperationError = exports.OmeoneError = void 0;
exports.isEngineResponse = isEngineResponse;
exports.isApiResult = isApiResult;
exports.isResult = isResult;
exports.isOmeoneError = isOmeoneError;
// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================
/**
 * Base OmeoneChain error class
 */
class OmeoneError extends Error {
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.name = 'OmeoneError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, OmeoneError);
        }
    }
}
exports.OmeoneError = OmeoneError;
/**
 * Chain-specific error class
 */
class ChainOperationError extends OmeoneError {
    constructor(message, details) {
        super(message, 'CHAIN_OPERATION_ERROR', 500, details);
        this.name = 'ChainOperationError';
    }
}
exports.ChainOperationError = ChainOperationError;
/**
 * Validation error class
 */
class ValidationError extends OmeoneError {
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', 400, { field });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error class
 */
class AuthenticationError extends OmeoneError {
    constructor(message = 'Authentication required') {
        super(message, 'AUTHENTICATION_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error class
 */
class AuthorizationError extends OmeoneError {
    constructor(message = 'Insufficient permissions') {
        super(message, 'AUTHORIZATION_ERROR', 403);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error class
 */
class NotFoundError extends OmeoneError {
    constructor(resource, id) {
        const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
        super(message, 'NOT_FOUND_ERROR', 404, { resource, id });
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
// ============================================================================
// TYPE GUARDS
// ============================================================================
/**
 * Type guard for EngineResponse
 */
function isEngineResponse(obj) {
    return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}
/**
 * Type guard for ApiResult
 */
function isApiResult(obj) {
    return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}
/**
 * Type guard for Result
 */
function isResult(obj) {
    return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}
/**
 * Type guard for OmeoneError
 */
function isOmeoneError(obj) {
    return obj instanceof Error && 'code' in obj && 'statusCode' in obj;
}
// ============================================================================
// CONSTANTS AND ENUMS
// ============================================================================
/**
 * Standard HTTP status codes
 */
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["OK"] = 200] = "OK";
    HttpStatusCode[HttpStatusCode["CREATED"] = 201] = "CREATED";
    HttpStatusCode[HttpStatusCode["ACCEPTED"] = 202] = "ACCEPTED";
    HttpStatusCode[HttpStatusCode["NO_CONTENT"] = 204] = "NO_CONTENT";
    HttpStatusCode[HttpStatusCode["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatusCode[HttpStatusCode["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatusCode[HttpStatusCode["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatusCode[HttpStatusCode["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatusCode[HttpStatusCode["CONFLICT"] = 409] = "CONFLICT";
    HttpStatusCode[HttpStatusCode["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    HttpStatusCode[HttpStatusCode["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatusCode[HttpStatusCode["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    HttpStatusCode[HttpStatusCode["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
})(HttpStatusCode || (exports.HttpStatusCode = HttpStatusCode = {}));
/**
 * Standard error codes
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorCode["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    ErrorCode["CHAIN_OPERATION_ERROR"] = "CHAIN_OPERATION_ERROR";
    ErrorCode["STORAGE_ERROR"] = "STORAGE_ERROR";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=index.js.map