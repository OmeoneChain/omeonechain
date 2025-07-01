"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenActionMap = void 0;
exports.formatTokenForChain = formatTokenForChain;
exports.formatReputationForChain = formatReputationForChain;
exports.formatRecommendationForChain = formatRecommendationForChain;
exports.tokenActionMap = {
    'mint_reward': 'mint_reward',
    'transfer': 'transfer_tokens',
    'stake': 'stake_tokens',
    'unstake': 'unstake_tokens',
    'burn': 'burn_tokens',
    'governance_vote': 'governance_vote'
};
function formatTokenForChain(data) {
    return {
        type: exports.tokenActionMap[data.action],
        data: {
            user_id: data.userId,
            amount: data.amount.toString(),
            token_type: data.tokenType,
            action: data.action,
            metadata: data.metadata || {}
        },
        timestamp: new Date().toISOString()
    };
}
function formatReputationForChain(data) {
    return {
        type: 'update_reputation',
        data: {
            user_id: data.userId,
            reputation_change: data.reputationChange.toString(),
            reason: data.reason,
            source_id: data.sourceId,
            metadata: data.metadata || {}
        },
        timestamp: new Date().toISOString()
    };
}
function formatRecommendationForChain(data) {
    return {
        type: 'create_recommendation',
        data: {
            id: data.id,
            author: data.author,
            service_id: data.serviceId,
            content_hash: data.contentHash,
            rating: data.rating.toString(),
            metadata: data.metadata || {}
        },
        timestamp: new Date().toISOString()
    };
}
//# sourceMappingURL=token-adapters.js.map