"use strict";
/**
 * Adapter-specific token types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * token transactions across different blockchain implementations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenActionMap = exports.TokenActionType = void 0;
exports.formatTokenAmount = formatTokenAmount;
exports.parseTokenAmount = parseTokenAmount;
exports.calculateTransactionFees = calculateTransactionFees;
exports.validateTokenTransfer = validateTokenTransfer;
/**
 * Token action types
 */
var TokenActionType;
(function (TokenActionType) {
    TokenActionType["TRANSFER"] = "transfer";
    TokenActionType["CLAIM_REWARD"] = "claim_reward";
    TokenActionType["STAKE"] = "stake";
    TokenActionType["UNSTAKE"] = "unstake";
    TokenActionType["BURN"] = "burn";
    TokenActionType["TIP"] = "tip";
    TokenActionType["PAYMENT"] = "payment";
})(TokenActionType || (exports.TokenActionType = TokenActionType = {}));
/**
 * Map of token actions to adapter-specific actions
 */
exports.tokenActionMap = {
    [TokenActionType.TRANSFER]: 'transfer',
    [TokenActionType.CLAIM_REWARD]: 'claim_reward',
    [TokenActionType.STAKE]: 'stake',
    [TokenActionType.UNSTAKE]: 'unstake',
    [TokenActionType.BURN]: 'burn',
    [TokenActionType.TIP]: 'tip',
    [TokenActionType.PAYMENT]: 'payment'
};
/**
 * Format token amount for chain submission
 * @param amount Original amount (human-readable)
 * @param decimals Token decimals (default: 18)
 * @returns Formatted amount for chain
 */
function formatTokenAmount(amount, decimals = 18) {
    // Convert human-readable amount to chain representation
    // This is a simplified implementation for example purposes
    return (amount * (10 ** decimals)).toString();
}
/**
 * Parse token amount from chain representation
 * @param amountOnChain Amount in chain representation
 * @param decimals Token decimals (default: 18)
 * @returns Human-readable amount
 */
function parseTokenAmount(amountOnChain, decimals = 18) {
    // Convert chain representation to human-readable amount
    return parseFloat(amountOnChain) / (10 ** decimals);
}
/**
 * Calculate transaction fees
 * @param amount Transaction amount
 * @param transactionType Type of transaction
 * @returns Fee information
 */
function calculateTransactionFees(amount, transactionType) {
    // Basic fee calculation - can be made more sophisticated
    const platformFeeRate = transactionType === TokenActionType.TIP ? 0.025 : 0.01; // 2.5% for tips, 1% for others
    const networkFee = 0; // IOTA Rebased is feeless
    const platformFee = amount * platformFeeRate;
    return {
        networkFee,
        platformFee,
        totalFee: networkFee + platformFee,
        feeCurrency: 'TOK'
    };
}
/**
 * Validate token transfer request
 * @param request Transfer request to validate
 * @returns Validation result
 */
function validateTokenTransfer(request) {
    const errors = [];
    if (!request.to || request.to.length === 0) {
        errors.push('Recipient address is required');
    }
    if (!request.amount || request.amount <= 0) {
        errors.push('Amount must be greater than 0');
    }
    if (request.amount && request.amount > 1000000) {
        errors.push('Amount exceeds maximum transfer limit');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=token-adapters.js.map