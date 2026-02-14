// File: code/poc/core/src/routes/tips.ts
// Generic Tipping API Routes
// Handles tips for: recommendations, guides, comments, users
// Uses reward_events for balance changes (trigger keeps tokens_earned in sync),
// token_transactions for tip-specific history, notifications for alerts.
//
// Tip Flow (v1.2.0):
// 1. Validate sender has sufficient balance
// 2. Insert tip_sent (negative) into reward_events → trigger deducts from sender
// 3. Insert tip_received (positive) into reward_events → trigger credits recipient
// 4. Log in token_transactions (tip-specific audit trail)
// 5. Create notification for recipient
//
// NOTE: tokens_earned is NEVER modified directly. The recalculate_token_balance
// trigger on reward_events handles all balance updates automatically.

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for tips routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const TIP_CONFIG = {
  MIN_TIP: 0.5,       // Minimum tip amount in BOCA
  MAX_TIP: 1000,      // Maximum tip amount in BOCA
  PLATFORM_FEE: 0,    // No fee on tips - encourage generosity
};

// Base unit conversion (reward_events stores micro-BOCA)
const BOCA_DECIMALS = 1_000_000;

const VALID_CONTEXT_TYPES = ['recommendation', 'guide', 'comment', 'user'] as const;
type ContextType = typeof VALID_CONTEXT_TYPES[number];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const tipSchema = z.object({
  recipient_id: z.string().uuid(),
  amount: z.number().min(TIP_CONFIG.MIN_TIP).max(TIP_CONFIG.MAX_TIP),
  context_type: z.enum(VALID_CONTEXT_TYPES),
  context_id: z.string().uuid()
});

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address?: string;
    email?: string;
    accountTier: 'verified' | 'wallet';
    authMethod: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get user's token balance (reads tokens_earned, maintained by DB trigger)
 */
async function getTokenBalance(userId: string): Promise<number> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    if (error || !user) return 0;
    return user.tokens_earned || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Insert a reward event (trigger handles balance update)
 * Returns the inserted row ID, or null on failure.
 */
async function insertRewardEvent(
  userId: string,
  action: string,
  amountBaseUnits: number,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('reward_events')
      .insert({
        user_id: userId,
        action,
        amount: amountBaseUnits,
        metadata,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Failed to insert reward_event (${action}):`, error);
      return null;
    }
    return data?.id || null;
  } catch (error) {
    console.error(`❌ Error inserting reward_event (${action}):`, error);
    return null;
  }
}

/**
 * Delete a reward event by ID (used for rollback on partial failure)
 * Trigger will recalculate balance on DELETE.
 */
async function deleteRewardEvent(eventId: string): Promise<void> {
  try {
    await supabase
      .from('reward_events')
      .delete()
      .eq('id', eventId);
  } catch (error) {
    console.error('❌ Failed to rollback reward_event:', error);
  }
}

/**
 * Get context label for the tip (for notifications and transaction notes)
 */
async function getContextLabel(contextType: ContextType, contextId: string): Promise<string> {
  try {
    switch (contextType) {
      case 'recommendation': {
        const { data } = await supabase
          .from('recommendations')
          .select('title, restaurant:restaurant_id(name)')
          .eq('id', contextId)
          .single();
        if (data?.restaurant?.name) {
          return `recommendation for ${data.restaurant.name}`;
        }
        return data?.title || 'recommendation';
      }
      case 'guide': {
        const { data } = await supabase
          .from('saved_lists')
          .select('name')
          .eq('id', contextId)
          .single();
        return data?.name ? `guide "${data.name}"` : 'guide';
      }
      case 'comment': {
        return 'comment';
      }
      case 'user': {
        const { data } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', contextId)
          .single();
        return data?.display_name || data?.username || 'user';
      }
      default:
        return contextType;
    }
  } catch (error) {
    return contextType;
  }
}

/**
 * Create notification for tip recipient
 */
async function createTipNotification(
  recipientId: string,
  senderId: string,
  amount: number,
  contextType: ContextType,
  contextId: string,
  contextLabel: string
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        actor_id: senderId,
        type: 'tip',
        target_type: contextType,
        target_id: contextId,
        content: {
          amount: amount,
          context_label: contextLabel
        },
        read: false
      });
    console.log(`🔔 Notification created for tip to user ${recipientId}`);
  } catch (error) {
    console.warn('⚠️ Could not create tip notification:', error);
  }
}

/**
 * Log transaction in token_transactions table (tip-specific audit trail)
 */
async function logTransaction(
  fromUserId: string,
  toUserId: string,
  amount: number,
  contextType: ContextType,
  contextId: string,
  contextLabel: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('token_transactions')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: amount,
        transaction_type: 'tip',
        reference_type: contextType,
        reference_id: contextId,
        note: `Tip for ${contextLabel}`
      })
      .select('id')
      .single();

    if (error) {
      console.warn('⚠️ Could not log tip transaction:', error);
      return null;
    }
    return data?.id || null;
  } catch (error) {
    console.warn('⚠️ Could not log tip transaction:', error);
    return null;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/tips
 * Send a tip to another user
 * 
 * Flow:
 * 1. Validate input + check balance
 * 2. Insert tip_sent (negative) into reward_events → trigger deducts
 * 3. Insert tip_received (positive) into reward_events → trigger credits
 * 4. On partial failure, rollback by deleting the reward_event row
 * 5. Log to token_transactions + create notification
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user?.id;

    if (!senderId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request body
    const validation = tipSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid tip data. Amount must be between ${TIP_CONFIG.MIN_TIP} and ${TIP_CONFIG.MAX_TIP} BOCA`,
        details: validation.error.errors
      });
    }

    const { recipient_id, amount, context_type, context_id } = validation.data;

    console.log(`💝 POST tip: ${amount} BOCA from ${senderId} to ${recipient_id} for ${context_type}:${context_id}`);

    // Can't tip yourself
    if (senderId === recipient_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot tip yourself'
      });
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Check sender's balance
    const balance = await getTokenBalance(senderId);
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. You have ${balance.toFixed(2)} BOCA, need ${amount.toFixed(2)} BOCA`
      });
    }

    // Get context label for notification/logging
    const contextLabel = await getContextLabel(context_type, context_id);

    // Convert to base units for reward_events (micro-BOCA)
    const amountBaseUnits = Math.round(amount * BOCA_DECIMALS);

    // Step 1: Deduct from sender via reward_events (negative amount)
    const tipSentMetadata = {
      recipient_id,
      context_type,
      context_id,
      context_label: contextLabel,
    };

    const senderEventId = await insertRewardEvent(
      senderId,
      'tip_sent',
      -amountBaseUnits, // Negative amount — trigger SUMs correctly
      tipSentMetadata
    );

    if (!senderEventId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process tip from your wallet'
      });
    }

    // Step 2: Credit to recipient via reward_events (positive amount)
    const tipReceivedMetadata = {
      sender_id: senderId,
      context_type,
      context_id,
      context_label: contextLabel,
    };

    const recipientEventId = await insertRewardEvent(
      recipient_id,
      'tip_received',
      amountBaseUnits, // Positive amount
      tipReceivedMetadata
    );

    if (!recipientEventId) {
      // Rollback sender deduction
      console.error('❌ Failed to credit recipient, rolling back sender deduction');
      await deleteRewardEvent(senderEventId);
      return res.status(500).json({
        success: false,
        error: 'Failed to send tip to recipient'
      });
    }

    // Step 3: Log to token_transactions (tip-specific audit trail)
    const transactionId = await logTransaction(
      senderId,
      recipient_id,
      amount,
      context_type,
      context_id,
      contextLabel
    );

    // Step 4: Create notification for recipient
    await createTipNotification(
      recipient_id,
      senderId,
      amount,
      context_type,
      context_id,
      contextLabel
    );

    // Get sender's updated balance (trigger has already recalculated)
    const newBalance = await getTokenBalance(senderId);

    console.log(`✅ Tip sent: ${amount} BOCA from ${senderId} to ${recipient_id}`);

    res.json({
      success: true,
      message: 'Tip sent successfully',
      tip: {
        id: transactionId,
        amount: amount,
        recipient_id: recipient_id,
        recipient_name: recipient.display_name || recipient.username,
        context_type: context_type,
        context_id: context_id,
        context_label: contextLabel
      },
      new_balance: newBalance
    });

  } catch (error) {
    console.error('❌ Error sending tip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send tip'
    });
  }
});

/**
 * GET /api/tips/balance
 * Get current user's token balance
 */
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const balance = await getTokenBalance(userId);

    res.json({
      success: true,
      balance: balance
    });

  } catch (error) {
    console.error('❌ Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

/**
 * GET /api/tips/sent
 * Get tips sent by current user
 */
router.get('/sent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { data: tips, error } = await supabase
      .from('token_transactions')
      .select(`
        id,
        amount,
        reference_type,
        reference_id,
        note,
        created_at,
        recipient:to_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('from_user_id', userId)
      .eq('transaction_type', 'tip')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching sent tips:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sent tips'
      });
    }

    res.json({
      success: true,
      tips: tips || []
    });

  } catch (error) {
    console.error('❌ Error fetching sent tips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sent tips'
    });
  }
});

/**
 * GET /api/tips/received
 * Get tips received by current user
 */
router.get('/received', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { data: tips, error } = await supabase
      .from('token_transactions')
      .select(`
        id,
        amount,
        reference_type,
        reference_id,
        note,
        created_at,
        sender:from_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('to_user_id', userId)
      .eq('transaction_type', 'tip')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching received tips:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch received tips'
      });
    }

    res.json({
      success: true,
      tips: tips || []
    });

  } catch (error) {
    console.error('❌ Error fetching received tips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch received tips'
    });
  }
});

export default router;