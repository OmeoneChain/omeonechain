"use strict";
/**
 * Adapter-specific reputation types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * reputation data across different blockchain implementations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReputationForChain = formatReputationForChain;
exports.formatTokenDataForChain = formatTokenDataForChain;
exports.formatSocialActionForChain = formatSocialActionForChain;
exports.calculateTrustWeight = calculateTrustWeight;
exports.isReputationTransactionData = isReputationTransactionData;
exports.isTokenTransactionData = isTokenTransactionData;
exports.isUserReputation = isUserReputation;
/**
 * Helper function to format reputation data for chain submission
 * @param reputationData Original reputation data
 * @returns Formatted reputation data for chain transaction
 */
function formatReputationForChain(reputationData) {
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
 * Calculate trust weight between users
 * @param trustor User doing the trusting
 * @param trustee User being trusted
 * @param socialDistance Social distance (1 = direct, 2 = friend-of-friend)
 * @returns Trust weight (0-1)
 */
function calculateTrustWeight(trustor, trustee, socialDistance) {
    // Base weight by social distance
    let baseWeight = socialDistance === 1 ? 0.75 : 0.25;
    // Adjust by reputation scores
    const reputationMultiplier = (trustor.reputation.score + trustee.reputation.score) / 2;
    // Apply verification bonus
    const verificationBonus = trustee.verification.level === 'expert' ? 1.2 :
        trustee.verification.level === 'verified' ? 1.1 : 1.0;
    return Math.min(1.0, baseWeight * reputationMultiplier * verificationBonus);
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
/**
 * Type guard for UserReputation
 */
function isUserReputation(data) {
    return data &&
        typeof data.userId === 'string' &&
        data.reputation &&
        typeof data.reputation.score === 'number';
}
//# sourceMappingURL=reputation-adapters.js.map