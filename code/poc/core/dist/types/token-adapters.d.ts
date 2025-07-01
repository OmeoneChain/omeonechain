/**
 * Adapter-specific token types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * token transactions across different blockchain implementations.
 */
/**
 * Token transaction data structure for adapter operations
 */
export interface TokenTransactionData {
    /**
     * Unique identifier for the transaction
     */
    transactionId?: string;
    /**
     * Sender's public key or identifier (or "SYSTEM" for rewards)
     */
    sender: string;
    /**
     * Recipient's public key or identifier
     */
    recipient: string;
    /**
     * Amount of tokens being transferred
     */
    amount: number;
    /**
     * Timestamp of the transaction
     */
    timestamp?: string;
    /**
     * Type of transaction (reward, transfer, fee, etc.)
     */
    type: 'reward' | 'transfer' | 'fee' | 'stake' | 'unstake' | 'burn';
    /**
     * Reference to related action (recommendation ID, governance proposal, etc.)
     */
    actionReference?: string;
    /**
     * On-chain reference data
     */
    tangle?: {
        objectId?: string;
        commitNumber?: number;
    };
}
/**
 * Token action types
 */
export declare enum TokenActionType {
    TRANSFER = "transfer",
    CLAIM_REWARD = "claim_reward",
    STAKE = "stake",
    UNSTAKE = "unstake",
    BURN = "burn"
}
/**
 * Map of token actions to adapter-specific actions
 */
export declare const tokenActionMap: {
    transfer: string;
    claim_reward: string;
    stake: string;
    unstake: string;
    burn: string;
};
/**
 * Format token amount for chain submission
 * @param amount Original amount (human-readable)
 * @param decimals Token decimals (default: 18)
 * @returns Formatted amount for chain
 */
export declare function formatTokenAmount(amount: number, decimals?: number): string;
/**
 * Parse token amount from chain representation
 * @param amountOnChain Amount in chain representation
 * @param decimals Token decimals (default: 18)
 * @returns Human-readable amount
 */
export declare function parseTokenAmount(amountOnChain: string, decimals?: number): number;
