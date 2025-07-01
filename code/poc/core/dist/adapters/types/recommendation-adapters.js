"use strict";
// src/adapters/types/recommendation-adapters.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTransactionData = toTransactionData;
exports.getActionDetail = getActionDetail;
// Convert recommendation data to chain transaction format
function toTransactionData(type, data) {
    return {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date(),
        status: 'pending'
    };
}
// Get human-readable action details
function getActionDetail(transaction) {
    switch (transaction.type) {
        case 'recommendation':
            const recData = transaction.data;
            return `New recommendation by ${recData.author} for service ${recData.serviceId}`;
        case 'vote':
            const voteData = transaction.data;
            return `${voteData.voteType === 'up' ? 'Upvote' : 'Downvote'} by ${voteData.voter}`;
        case 'reputation_update':
            const repData = transaction.data;
            return `Reputation updated for ${repData.userId}: ${repData.oldScore} → ${repData.newScore}`;
        default:
            return `Unknown action: ${transaction.type}`;
    }
}
//# sourceMappingURL=recommendation-adapters.js.map