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
})(TokenActionType || (exports.TokenActionType = TokenActionType = {}));
/**
 * Map of token actions to adapter-specific actions
 */
exports.tokenActionMap = {
    [TokenActionType.TRANSFER]: 'transfer',
    [TokenActionType.CLAIM_REWARD]: 'claim_reward',
    [TokenActionType.STAKE]: 'stake',
    [TokenActionType.UNSTAKE]: 'unstake',
    [TokenActionType.BURN]: 'burn'
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
//# sourceMappingURL=token-adapters.js.map