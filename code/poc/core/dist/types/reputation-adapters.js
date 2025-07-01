"use strict";
/**
 * Adapter-specific reputation types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * reputation data across different blockchain implementations.
 * Updated to include missing TypeScript exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReputationForChain = formatReputationForChain;
exports.formatTokenDataForChain = formatTokenDataForChain;
exports.formatSocialActionForChain = formatSocialActionForChain;
exports.isReputationTransactionData = isReputationTransactionData;
exports.isTokenTransactionData = isTokenTransactionData;
/**
 * Helper function to format reputation data for chain submission
 * @param reputationData Original reputation data
 * @returns Formatted reputation data for chain transaction
 */
function formatReputationForChain(reputationData) {
    // Implementation would depend on your existing reputation data structure
    // This is a placeholder that would be filled with actual mapping logic
    return {
        userId: reputationData.userId,
        totalRecommendations: reputationData.totalRecommendations || 0,
        upvotesReceived: reputationData.upvotesReceived || 0,
        downvotesReceived: reputationData.downvotesReceived || 0,
        reputationScore: reputationData.reputationScore || 0,
        verificationLevel: reputationData.verificationLevel || 'basic',
        specializations: reputationData.specializations || [],
        chainID: reputationData.chainID
    };
}
/**
 * Helper function to format token transaction data
 * @param tokenData Original token data
 * @returns Formatted token data for chain transaction
 */
function formatTokenDataForChain(tokenData) {
    return {
        from: tokenData.from,
        to: tokenData.to,
        amount: tokenData.amount || 0,
        tokenType: tokenData.tokenType || 'TOK',
        reason: tokenData.reason || 'transfer',
        timestamp: tokenData.timestamp || Date.now(),
        metadata: tokenData.metadata || {}
    };
}
/**
 * Helper function to create social action transaction data
 * @param actionData Original action data
 * @returns Formatted social action data for chain transaction
 */
function formatSocialActionForChain(actionData) {
    return {
        userId: actionData.userId,
        action: actionData.action,
        targetId: actionData.targetId,
        targetType: actionData.targetType || 'recommendation',
        weight: actionData.weight || 1,
        timestamp: actionData.timestamp || Date.now(),
        metadata: actionData.metadata || {}
    };
}
/**
 * Type guard to check if data is ReputationTransactionData
 */
function isReputationTransactionData(data) {
    return data &&
        typeof data.userId === 'string' &&
        typeof data.reputationScore === 'number' &&
        ['basic', 'verified', 'expert'].includes(data.verificationLevel);
}
/**
 * Type guard to check if data is TokenTransactionData
 */
function isTokenTransactionData(data) {
    return data &&
        typeof data.from === 'string' &&
        typeof data.to === 'string' &&
        typeof data.amount === 'number' &&
        typeof data.timestamp === 'number';
}
//# sourceMappingURL=reputation-adapters.js.map