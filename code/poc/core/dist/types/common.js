"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = createError;
exports.createSuccess = createSuccess;
exports.createFailure = createFailure;
exports.isApiError = isApiError;
exports.isResult = isResult;
// Helper functions for error handling
function createError(message, code, status) {
    return { message, code, status };
}
function createSuccess(data) {
    return { success: true, data };
}
function createFailure(error) {
    return { success: false, error };
}
// Type guards
function isApiError(obj) {
    return obj && typeof obj.message === 'string' && typeof obj.code === 'string';
}
function isResult(obj) {
    return obj && typeof obj.success === 'boolean';
}
//# sourceMappingURL=common.js.map