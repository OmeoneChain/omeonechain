// File: code/poc/core/src/routes/wallet.ts
// Wallet and token management routes

import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Mock wallet data (in production, integrate with blockchain)
const mockWallets = new Map([
  ['0x1234567890123456789012345678901234567890', {
    address: '0x1234567890123456789012345678901234567890',
    balance: 127.45,
    staked: 25.0,
    pending_rewards: 3.2,
    tier: 'curator',
    transactions: [
      { type: 'earned', amount: 2.5, timestamp: '2024-07-31T10:00:00Z', description: 'Recommendation reward' },
      { type: 'tip_received', amount: 1.0, timestamp: '2024-07-31T09:30:00Z', description: 'Tip from user_456' }
    ]
  }]
]);

// GET /api/wallet/balance - Get wallet balance
router.get('/balance', async (req, res) => {
  try {
    const address = req.query.address as string;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    const wallet = mockWallets.get(address.toLowerCase()) || {
      address,
      balance: 0,
      staked: 0,
      pending_rewards: 0,
      tier: 'explorer',
      transactions: []
    };
    
    res.json({
      success: true,
      wallet,
      blockchain_info: {
        network: 'IOTA Rebased Testnet',
        last_sync: new Date().toISOString(),
        transaction_fee: '0.05 μMIOTA (~$0.00002)'
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
});

// POST /api/wallet/transfer - Transfer tokens
router.post('/transfer', async (req, res) => {
  try {
    const { from, to, amount, type = 'tip' } = req.body;
    
    // Validation
    if (!from || !to || !amount) {
      return res.status(400).json({
        success: false,
        message: 'From address, to address, and amount are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be positive'
      });
    }
    
    const fromWallet = mockWallets.get(from.toLowerCase());
    if (!fromWallet || fromWallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Simulate blockchain transaction
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    console.log(`💸 Transfer: ${amount} TOK from ${from} to ${to} (${type})`);
    
    // Update balances (in production, this would be handled by blockchain)
    fromWallet.balance -= amount;
    fromWallet.transactions.unshift({
      type: 'sent',
      amount: -amount,
      timestamp: new Date().toISOString(),
      description: `${type} to ${to.slice(0, 8)}...`
    });
    
    // Update recipient wallet
    const toWallet = mockWallets.get(to.toLowerCase()) || {
      address: to,
      balance: 0,
      staked: 0,
      pending_rewards: 0,
      tier: 'explorer',
      transactions: []
    };
    
    toWallet.balance += amount;
    toWallet.transactions.unshift({
      type: 'received',
      amount: amount,
      timestamp: new Date().toISOString(),
      description: `${type} from ${from.slice(0, 8)}...`
    });
    
    mockWallets.set(to.toLowerCase(), toWallet);
    
    res.json({
      success: true,
      transaction: {
        hash: txHash,
        from,
        to,
        amount,
        type,
        timestamp: new Date().toISOString(),
        fee: '0.05 μMIOTA',
        status: 'confirmed'
      },
      message: `Successfully sent ${amount} TOK`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Transfer failed',
      error: error.message
    });
  }
});

// POST /api/wallet/stake - Stake tokens for governance
router.post('/stake', async (req, res) => {
  try {
    const { address, amount, duration = 3 } = req.body; // duration in months
    
    if (!address || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Address and amount are required'
      });
    }
    
    const wallet = mockWallets.get(address.toLowerCase());
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for staking'
      });
    }
    
    // Determine staking tier
    let tier = 'explorer';
    if (amount >= 1000) tier = 'validator';
    else if (amount >= 100) tier = 'curator';
    else if (amount >= 50) tier = 'passport';
    
    // Update wallet
    wallet.balance -= amount;
    wallet.staked += amount;
    wallet.tier = tier;
    
    console.log(`🔒 Staked ${amount} TOK for ${duration} months (${tier} tier)`);
    
    res.json({
      success: true,
      staking: {
        amount,
        duration,
        tier,
        unlock_date: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString(),
        benefits: {
          governance_weight: tier === 'validator' ? 1.5 : 1.0,
          premium_discounts: tier === 'passport',
          proposal_rights: ['curator', 'validator'].includes(tier)
        }
      },
      wallet: {
        balance: wallet.balance,
        staked: wallet.staked,
        tier: wallet.tier
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Staking failed',
      error: error.message
    });
  }
});

// GET /api/wallet/:address/transactions - Get transaction history
router.get('/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const wallet = mockWallets.get(address.toLowerCase());
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    const transactions = wallet.transactions.slice(offset, offset + limit);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        limit,
        offset,
        total: wallet.transactions.length,
        hasMore: offset + limit < wallet.transactions.length
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// POST /api/wallet/claim-rewards - Claim pending token rewards
router.post('/claim-rewards', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    const wallet = mockWallets.get(address.toLowerCase());
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    if (wallet.pending_rewards <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending rewards to claim'
      });
    }
    
    const rewardAmount = wallet.pending_rewards;
    wallet.balance += rewardAmount;
    wallet.pending_rewards = 0;
    
    wallet.transactions.unshift({
      type: 'reward_claimed',
      amount: rewardAmount,
      timestamp: new Date().toISOString(),
      description: 'Claimed recommendation rewards'
    });
    
    console.log(`🎁 Claimed ${rewardAmount} TOK rewards for ${address}`);
    
    res.json({
      success: true,
      claimed_amount: rewardAmount,
      new_balance: wallet.balance,
      message: `Successfully claimed ${rewardAmount} TOK in rewards`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to claim rewards',
      error: error.message
    });
  }
});

export default router;