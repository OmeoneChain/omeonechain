"use strict";
/**
 * Token Transaction Model
 *
 * Represents token transfers and rewards in the OmeoneChain system
 * Based on Technical Specifications A.2.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenActionType = exports.TransactionType = void 0;
exports.createTokenTransaction = createTokenTransaction;
exports.createRewardTransaction = createRewardTransaction;
exports.createTransferTransaction = createTransferTransaction;
exports.validateTokenTransaction = validateTokenTransaction;
var TransactionType;
(function (TransactionType) {
    TransactionType["REWARD"] = "reward";
    TransactionType["TRANSFER"] = "transfer";
    TransactionType["FEE"] = "fee";
    TransactionType["STAKE"] = "stake";
    TransactionType["UNSTAKE"] = "unstake";
    TransactionType["SERVICE_PAYMENT"] = "service_payment";
    TransactionType["NFT_PURCHASE"] = "nft_purchase";
    TransactionType["BURN"] = "burn";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// Additional enum for compatibility with existing code that expects TokenActionType
var TokenActionType;
(function (TokenActionType) {
    TokenActionType["MINT"] = "mint";
    TokenActionType["BURN"] = "burn";
    TokenActionType["TRANSFER"] = "transfer";
    TokenActionType["STAKE"] = "stake";
    TokenActionType["UNSTAKE"] = "unstake";
    TokenActionType["REWARD"] = "reward";
    TokenActionType["TIP"] = "tip";
    TokenActionType["GOVERNANCE"] = "governance";
    // Map to existing TransactionType values
    TokenActionType["FEE"] = "fee";
    TokenActionType["SERVICE_PAYMENT"] = "service_payment";
    TokenActionType["NFT_PURCHASE"] = "nft_purchase";
})(TokenActionType || (exports.TokenActionType = TokenActionType = {}));
/**
 * Helper function to create TokenTransaction with proper defaults
 * Ensures all required fields are present for TypeScript compliance
 */
function createTokenTransaction(partial) {
    const now = new Date().toISOString();
    const txId = partial.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
        transactionId: txId,
        timestamp: partial.timestamp || now,
        status: partial.status || 'pending',
        userId: partial.userId || partial.sender,
        tokenType: partial.tokenType || 'TOK',
        // Map TransactionType to TokenActionType for compatibility
        action: mapTransactionTypeToAction(partial.type),
        ...partial
    };
}
/**
 * Helper function to map TransactionType to TokenActionType
 */
function mapTransactionTypeToAction(type) {
    switch (type) {
        case TransactionType.REWARD:
            return TokenActionType.REWARD;
        case TransactionType.TRANSFER:
            return TokenActionType.TRANSFER;
        case TransactionType.STAKE:
            return TokenActionType.STAKE;
        case TransactionType.UNSTAKE:
            return TokenActionType.UNSTAKE;
        case TransactionType.BURN:
            return TokenActionType.BURN;
        case TransactionType.FEE:
            return TokenActionType.FEE;
        case TransactionType.SERVICE_PAYMENT:
            return TokenActionType.SERVICE_PAYMENT;
        case TransactionType.NFT_PURCHASE:
            return TokenActionType.NFT_PURCHASE;
        default:
            return TokenActionType.TRANSFER;
    }
}
/**
 * Helper function for creating reward transactions
 */
function createRewardTransaction(recipient, amount, recommendationId, tangle) {
    return createTokenTransaction({
        sender: 'SYSTEM',
        recipient,
        amount,
        type: TransactionType.REWARD,
        actionReference: recommendationId,
        tokenType: 'reward',
        tangle
    });
}
/**
 * Helper function for creating transfer transactions
 */
function createTransferTransaction(sender, recipient, amount, tangle, actionReference) {
    return createTokenTransaction({
        sender,
        recipient,
        amount,
        type: TransactionType.TRANSFER,
        actionReference,
        tokenType: 'TOK',
        tangle
    });
}
/**
 * Validate TokenTransaction structure
 * Ensures all required fields are present and valid
 */
function validateTokenTransaction(tx) {
    return (typeof tx === 'object' &&
        typeof tx.transactionId === 'string' &&
        typeof tx.sender === 'string' &&
        typeof tx.recipient === 'string' &&
        typeof tx.amount === 'number' &&
        typeof tx.timestamp === 'string' &&
        Object.values(TransactionType).includes(tx.type) &&
        typeof tx.tangle === 'object' &&
        typeof tx.tangle.objectId === 'string' &&
        typeof tx.tangle.commitNumber === 'number');
}
//# sourceMappingURL=token.js.map