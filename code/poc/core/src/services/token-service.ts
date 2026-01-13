/**
 * Token Service - Off-Chain Balance Management
 * File: code/poc/core/src/services/token-service.ts
 * 
 * Manages BOCA token balances in the database (off-chain).
 * Tokens are only minted on-chain when users connect a wallet and bridge out.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration for TokenService');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Transaction types
export type TransactionType = 
  // Rewards (system → user)
  | 'reward_recommendation'
  | 'reward_engagement'
  | 'reward_validation'
  | 'reward_referral'
  | 'reward_contest'
  | 'reward_bounty'
  | 'reward_onboarding'
  // User-to-user
  | 'tip'
  | 'bounty_stake'
  | 'bounty_prize'
  | 'bounty_refund'
  | 'contest_entry'
  | 'contest_prize'
  | 'transfer'
  // Platform services
  | 'ai_concierge'
  | 'premium_feature'
  // Wallet bridge
  | 'wallet_bridge_out'
  | 'wallet_bridge_in';

export interface TokenTransaction {
  id: string;
  fromUserId: string | null;
  toUserId: string | null;
  amount: number;
  transactionType: TransactionType;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdAt: Date;
}

export interface UserBalance {
  userId: string;
  tokenBalance: number;
  tokensEarned: number;
  tokensSpentTotal: number;
}

/**
 * Get user's current token balance
 */
export async function getBalance(userId: string): Promise<UserBalance | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, token_balance, tokens_earned, tokens_spent_total')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    console.error('❌ Failed to get balance:', error);
    return null;
  }
  
  return {
    userId: data.id,
    tokenBalance: parseFloat(data.token_balance) || 0,
    tokensEarned: parseFloat(data.tokens_earned) || 0,
    tokensSpentTotal: parseFloat(data.tokens_spent_total) || 0
  };
}

/**
 * Award tokens to a user (system reward)
 */
export async function awardTokens(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  referenceType?: string,
  referenceId?: string,
  note?: string
): Promise<boolean> {
  if (amount <= 0) {
    console.error('❌ Award amount must be positive');
    return false;
  }
  
  try {
    // Update user balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        token_balance: supabase.rpc('increment', { x: amount }),
        tokens_earned: supabase.rpc('increment', { x: amount }),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Fallback: direct update if rpc doesn't work
    if (updateError) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('token_balance, tokens_earned')
        .eq('id', userId)
        .single();
      
      if (currentUser) {
        await supabase
          .from('users')
          .update({
            token_balance: (parseFloat(currentUser.token_balance) || 0) + amount,
            tokens_earned: (parseFloat(currentUser.tokens_earned) || 0) + amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    }
    
    // Log transaction
    await supabase
      .from('token_transactions')
      .insert({
        from_user_id: null, // System reward
        to_user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        reference_type: referenceType,
        reference_id: referenceId,
        note: note
      });
    
    console.log(`✅ Awarded ${amount} BOCA to user ${userId} (${transactionType})`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to award tokens:', error);
    return false;
  }
}

/**
 * Transfer tokens between users (tip, bounty prize, etc.)
 */
export async function transferTokens(
  fromUserId: string,
  toUserId: string,
  amount: number,
  transactionType: TransactionType,
  referenceType?: string,
  referenceId?: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }
  
  if (fromUserId === toUserId) {
    return { success: false, error: 'Cannot transfer to yourself' };
  }
  
  try {
    // Check sender balance
    const { data: sender } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', fromUserId)
      .single();
    
    if (!sender || parseFloat(sender.token_balance) < amount) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    // Deduct from sender
    await supabase
      .from('users')
      .update({
        token_balance: parseFloat(sender.token_balance) - amount,
        tokens_spent_total: supabase.rpc('increment', { x: amount }),
        updated_at: new Date().toISOString()
      })
      .eq('id', fromUserId);
    
    // Add to receiver
    const { data: receiver } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', toUserId)
      .single();
    
    if (receiver) {
      await supabase
        .from('users')
        .update({
          token_balance: parseFloat(receiver.token_balance) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', toUserId);
    }
    
    // Log transaction
    await supabase
      .from('token_transactions')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: amount,
        transaction_type: transactionType,
        reference_type: referenceType,
        reference_id: referenceId,
        note: note
      });
    
    console.log(`✅ Transferred ${amount} BOCA from ${fromUserId} to ${toUserId} (${transactionType})`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Transfer failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Spend tokens on platform services (deduct from user)
 */
export async function spendTokens(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  referenceType?: string,
  referenceId?: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }
  
  try {
    // Check balance
    const { data: user } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();
    
    if (!user || parseFloat(user.token_balance) < amount) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    // Deduct tokens
    await supabase
      .from('users')
      .update({
        token_balance: parseFloat(user.token_balance) - amount,
        tokens_spent_total: supabase.rpc('increment', { x: amount }),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Log transaction
    await supabase
      .from('token_transactions')
      .insert({
        from_user_id: userId,
        to_user_id: null, // Platform/burn
        amount: amount,
        transaction_type: transactionType,
        reference_type: referenceType,
        reference_id: referenceId,
        note: note
      });
    
    console.log(`✅ User ${userId} spent ${amount} BOCA (${transactionType})`);
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Spend failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TokenTransaction[]> {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error || !data) {
    console.error('❌ Failed to get transaction history:', error);
    return [];
  }
  
  return data.map(tx => ({
    id: tx.id,
    fromUserId: tx.from_user_id,
    toUserId: tx.to_user_id,
    amount: parseFloat(tx.amount),
    transactionType: tx.transaction_type,
    referenceType: tx.reference_type,
    referenceId: tx.reference_id,
    note: tx.note,
    createdAt: new Date(tx.created_at)
  }));
}

/**
 * Hold tokens in escrow (for bounties, contests)
 */
export async function holdTokens(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  referenceType: string,
  referenceId: string
): Promise<{ success: boolean; error?: string }> {
  // For now, this just deducts from balance
  // In production, you might have a separate escrow table
  return spendTokens(userId, amount, transactionType, referenceType, referenceId, 'Held in escrow');
}

/**
 * Release escrowed tokens to winner
 */
export async function releaseEscrow(
  toUserId: string,
  amount: number,
  transactionType: TransactionType,
  referenceType: string,
  referenceId: string
): Promise<boolean> {
  // Award tokens from system (escrow pool)
  return awardTokens(toUserId, amount, transactionType, referenceType, referenceId, 'Released from escrow');
}

export default {
  getBalance,
  awardTokens,
  transferTokens,
  spendTokens,
  getTransactionHistory,
  holdTokens,
  releaseEscrow
};