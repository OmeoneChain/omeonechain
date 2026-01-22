// File: code/poc/core/src/routes/diagnostics.ts
// Balance Diagnostic Tool - Compare Supabase vs IOTA Testnet balances
// Created: January 2026
// Purpose: Pre-launch verification of dual-ledger sync
//
// Usage:
//   API: GET /api/diagnostics/balance-check?userId=xxx
//         GET /api/diagnostics/balance-check-all?limit=100
//   CLI: npx ts-node src/routes/diagnostics.ts --user=xxx
//        npx ts-node src/routes/diagnostics.ts --all --limit=50

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase configuration for diagnostics');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// IOTA Configuration - Hardcoded from testnet-config.ts (January 2026)
// These are the LIVE DEPLOYED contracts on IOTA Rebased Testnet
const IOTA_CONFIG = {
  // Network
  rpcUrl: 'https://api.testnet.iota.cafe',
  chainId: '2304aa97',
  explorerUrl: 'https://explorer.testnet.iota.cafe',
  
  // BOCA Token Contract
  tokenPackageId: '0xa455c5a7bce8e0d28f42234deeb16ea496cec40f0d87a71a3ec473465e52e6fb6',
  tokenModule: 'token',
  tokenType: 'BOCA',
  
  // Other Contract Package IDs (for reference/future use)
  contracts: {
    token: '0xa455c5a7bce8e0d28f42234deeb16ea496cec40f0d87a71a3ec473465e52e6fb6',
    user_status: '0x36b7e8497d3210ab5697700f866654d8e8179f7d0b6c31a8195452344a9394f1',
    rewards: '0xa38c2800afdbf7144985b6df295f4274a288d95f2f7f97bfd25598a381dcb84a',
    recommendation: '0x296d6464874fca09b9f38a8b719aab2a2647ac35f089aab87656e2e0bb23eeee',
    lottery: '0x326c44a0c70c045890d962e57d7f23db6754d12eac4860db0d9d5ef9aaf5ead0',
    photo_contest: '0x3fcb73bd55e649c98318adbf6654222144b8d758590732e652df27a0fb6223dd',
    bounty: '0xd297c8d6cbccba453fdf96870c5e2e94d87a71a3ec473465e52e9f8c542b9d54',
    governance: '0x7429a0ec403c1ea8cc33637c946983047404f13e2e2ae801cbfe5df6b067b39a',
    // Deprecated but still on testnet
    escrow: '0x0b8aca5827456ac537829f01637a93a79fb9d3401ac513c028c4a25f75d6d21e',
    email_escrow: '0x9fba0f28e326d8bbfdbcbb6ee03f07a41a8a903bde063c08839424edb53590db'
  }
};

const TOKEN_DECIMALS = 6;
const TOKEN_MULTIPLIER = 1_000_000;

// =============================================================================
// TYPES
// =============================================================================

interface UserBalanceRecord {
  userId: string;
  username?: string;
  walletAddress?: string;
  supabaseBalance: number;
  supabaseBalanceDisplay: string;
  iotaBalance: number | null;
  iotaBalanceDisplay: string | null;
  discrepancy: number | null;
  discrepancyDisplay: string | null;
  syncStatus: 'synced' | 'discrepancy' | 'no_wallet' | 'iota_error' | 'unknown';
  checkedAt: string;
  notes: string[];
}

interface DiagnosticReport {
  summary: {
    totalUsersChecked: number;
    usersWithWallets: number;
    usersSynced: number;
    usersWithDiscrepancy: number;
    usersWithIotaErrors: number;
    totalSupabaseBalance: number;
    totalIotaBalance: number;
    totalDiscrepancy: number;
  };
  users: UserBalanceRecord[];
  generatedAt: string;
  iotaNetworkStatus: 'connected' | 'error' | 'unknown';
  warnings: string[];
}

// =============================================================================
// IOTA TESTNET HELPERS
// =============================================================================

/**
 * Fetch token balance from IOTA testnet
 * Returns null if unable to fetch (no wallet, network error, etc.)
 */
async function fetchIotaBalance(walletAddress: string): Promise<{
  balance: number | null;
  error?: string;
}> {
  if (!walletAddress) {
    return { balance: null, error: 'No wallet address' };
  }

  if (!IOTA_CONFIG.tokenPackageId) {
    return { balance: null, error: 'IOTA token package ID not configured' };
  }

  try {
    // Construct the token type
    const tokenType = `${IOTA_CONFIG.tokenPackageId}::${IOTA_CONFIG.tokenModule}::${IOTA_CONFIG.tokenType}`;
    
    // Make RPC call to get coins
    const response = await fetch(IOTA_CONFIG.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getCoins',
        params: [walletAddress, tokenType, null, 50] // owner, coinType, cursor, limit
      })
    });

    if (!response.ok) {
      return { balance: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { balance: null, error: data.error.message || 'RPC error' };
    }

    // Sum up all coin balances
    let totalBalance = 0;
    if (data.result?.data && Array.isArray(data.result.data)) {
      for (const coin of data.result.data) {
        totalBalance += parseInt(coin.balance || '0', 10);
      }
    }

    return { balance: totalBalance };
  } catch (error: any) {
    console.error(`❌ IOTA balance fetch error for ${walletAddress}:`, error.message);
    return { balance: null, error: error.message };
  }
}

/**
 * Test IOTA network connectivity
 */
async function testIotaConnection(): Promise<{
  connected: boolean;
  latestCheckpoint?: number;
  error?: string;
}> {
  try {
    const response = await fetch(IOTA_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getLatestCheckpointSequenceNumber',
        params: []
      })
    });

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    if (data.error) {
      return { connected: false, error: data.error.message };
    }

    return { 
      connected: true, 
      latestCheckpoint: parseInt(data.result, 10) 
    };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

// =============================================================================
// BALANCE COMPARISON LOGIC
// =============================================================================

/**
 * Format token amount for display
 */
function formatBalance(baseUnits: number): string {
  const amount = baseUnits / TOKEN_MULTIPLIER;
  return `${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} BOCA`;
}

/**
 * Check balance for a single user
 */
async function checkUserBalance(userId: string): Promise<UserBalanceRecord> {
  const notes: string[] = [];
  const checkedAt = new Date().toISOString();

  // Fetch user from Supabase
  if (!supabase) {
    return {
      userId,
      supabaseBalance: 0,
      supabaseBalanceDisplay: '0.00 BOCA',
      iotaBalance: null,
      iotaBalanceDisplay: null,
      discrepancy: null,
      discrepancyDisplay: null,
      syncStatus: 'unknown',
      checkedAt,
      notes: ['Supabase not configured']
    };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, display_name, wallet_address, tokens_earned')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return {
      userId,
      supabaseBalance: 0,
      supabaseBalanceDisplay: '0.00 BOCA',
      iotaBalance: null,
      iotaBalanceDisplay: null,
      discrepancy: null,
      discrepancyDisplay: null,
      syncStatus: 'unknown',
      checkedAt,
      notes: [`User not found: ${userError?.message || 'No data'}`]
    };
  }

  const supabaseBalance = user.tokens_earned || 0;
  // Convert display balance to base units for comparison (if stored as display amount)
  // Adjust this based on how you store tokens_earned (base units or display amount)
  const supabaseBalanceBaseUnits = supabaseBalance < 1000 
    ? Math.round(supabaseBalance * TOKEN_MULTIPLIER) // Stored as display amount
    : supabaseBalance; // Already in base units

  const result: UserBalanceRecord = {
    userId,
    username: user.username || user.display_name,
    walletAddress: user.wallet_address,
    supabaseBalance: supabaseBalanceBaseUnits,
    supabaseBalanceDisplay: formatBalance(supabaseBalanceBaseUnits),
    iotaBalance: null,
    iotaBalanceDisplay: null,
    discrepancy: null,
    discrepancyDisplay: null,
    syncStatus: 'unknown',
    checkedAt,
    notes
  };

  // Check if user has a wallet address
  if (!user.wallet_address) {
    result.syncStatus = 'no_wallet';
    result.notes.push('User has no wallet address linked');
    return result;
  }

  // Fetch IOTA balance
  const iotaResult = await fetchIotaBalance(user.wallet_address);

  if (iotaResult.error) {
    result.syncStatus = 'iota_error';
    result.notes.push(`IOTA fetch error: ${iotaResult.error}`);
    return result;
  }

  result.iotaBalance = iotaResult.balance;
  result.iotaBalanceDisplay = formatBalance(iotaResult.balance || 0);

  // Calculate discrepancy
  const discrepancy = supabaseBalanceBaseUnits - (iotaResult.balance || 0);
  result.discrepancy = discrepancy;
  result.discrepancyDisplay = formatBalance(Math.abs(discrepancy));

  // Determine sync status (allow small rounding differences)
  const toleranceBaseUnits = 1000; // 0.001 BOCA tolerance
  if (Math.abs(discrepancy) <= toleranceBaseUnits) {
    result.syncStatus = 'synced';
  } else {
    result.syncStatus = 'discrepancy';
    if (discrepancy > 0) {
      result.notes.push(`Supabase has ${formatBalance(discrepancy)} MORE than IOTA`);
    } else {
      result.notes.push(`IOTA has ${formatBalance(Math.abs(discrepancy))} MORE than Supabase`);
    }
  }

  return result;
}

/**
 * Check balances for multiple users
 */
async function checkAllBalances(options: {
  limit?: number;
  onlyWithWallets?: boolean;
  onlyWithBalance?: boolean;
}): Promise<DiagnosticReport> {
  const warnings: string[] = [];
  const generatedAt = new Date().toISOString();

  if (!supabase) {
    return {
      summary: {
        totalUsersChecked: 0,
        usersWithWallets: 0,
        usersSynced: 0,
        usersWithDiscrepancy: 0,
        usersWithIotaErrors: 0,
        totalSupabaseBalance: 0,
        totalIotaBalance: 0,
        totalDiscrepancy: 0
      },
      users: [],
      generatedAt,
      iotaNetworkStatus: 'unknown',
      warnings: ['Supabase not configured']
    };
  }

  // Test IOTA connection first
  const iotaConnectionTest = await testIotaConnection();
  const iotaNetworkStatus = iotaConnectionTest.connected ? 'connected' : 'error';
  
  if (!iotaConnectionTest.connected) {
    warnings.push(`IOTA network error: ${iotaConnectionTest.error}`);
  } else {
    console.log(`✅ IOTA connected, latest checkpoint: ${iotaConnectionTest.latestCheckpoint}`);
  }

  // Build query
  let query = supabase
    .from('users')
    .select('id, username, display_name, wallet_address, tokens_earned')
    .order('tokens_earned', { ascending: false });

  if (options.onlyWithWallets) {
    query = query.not('wallet_address', 'is', null);
  }

  if (options.onlyWithBalance) {
    query = query.gt('tokens_earned', 0);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: users, error: usersError } = await query;

  if (usersError || !users) {
    warnings.push(`Failed to fetch users: ${usersError?.message}`);
    return {
      summary: {
        totalUsersChecked: 0,
        usersWithWallets: 0,
        usersSynced: 0,
        usersWithDiscrepancy: 0,
        usersWithIotaErrors: 0,
        totalSupabaseBalance: 0,
        totalIotaBalance: 0,
        totalDiscrepancy: 0
      },
      users: [],
      generatedAt,
      iotaNetworkStatus,
      warnings
    };
  }

  console.log(`📊 Checking balances for ${users.length} users...`);

  // Check each user (with rate limiting to avoid overwhelming IOTA RPC)
  const results: UserBalanceRecord[] = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`  [${i + 1}/${users.length}] Checking ${user.username || user.id}...`);
    
    const result = await checkUserBalance(user.id);
    results.push(result);

    // Small delay to avoid rate limiting
    if (user.wallet_address && i < users.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Calculate summary
  const summary = {
    totalUsersChecked: results.length,
    usersWithWallets: results.filter(r => r.walletAddress).length,
    usersSynced: results.filter(r => r.syncStatus === 'synced').length,
    usersWithDiscrepancy: results.filter(r => r.syncStatus === 'discrepancy').length,
    usersWithIotaErrors: results.filter(r => r.syncStatus === 'iota_error').length,
    totalSupabaseBalance: results.reduce((sum, r) => sum + r.supabaseBalance, 0),
    totalIotaBalance: results.reduce((sum, r) => sum + (r.iotaBalance || 0), 0),
    totalDiscrepancy: results.reduce((sum, r) => sum + Math.abs(r.discrepancy || 0), 0)
  };

  return {
    summary,
    users: results,
    generatedAt,
    iotaNetworkStatus,
    warnings
  };
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/diagnostics/health
 * Quick health check for IOTA connection
 */
router.get('/health', async (req: Request, res: Response) => {
  console.log('🔍 Diagnostics health check...');

  const iotaTest = await testIotaConnection();
  const supabaseOk = !!supabase;

  res.json({
    status: iotaTest.connected && supabaseOk ? 'healthy' : 'degraded',
    supabase: supabaseOk ? 'connected' : 'not configured',
    iota: {
      status: iotaTest.connected ? 'connected' : 'error',
      rpcUrl: IOTA_CONFIG.rpcUrl,
      chainId: IOTA_CONFIG.chainId,
      latestCheckpoint: iotaTest.latestCheckpoint,
      error: iotaTest.error
    },
    tokenConfig: {
      packageId: IOTA_CONFIG.tokenPackageId,
      decimals: TOKEN_DECIMALS,
      symbol: IOTA_CONFIG.tokenType
    },
    checkedAt: new Date().toISOString()
  });
});

/**
 * GET /api/diagnostics/contracts
 * Check status of all deployed contracts on IOTA testnet
 */
router.get('/contracts', async (req: Request, res: Response) => {
  console.log('🔍 Checking contract deployment status...');

  const results: Record<string, { status: string; packageId: string; error?: string }> = {};

  for (const [name, packageId] of Object.entries(IOTA_CONFIG.contracts)) {
    try {
      const response = await fetch(IOTA_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'iota_getObject',
          params: [
            packageId,
            { showType: true, showOwner: true }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        results[name] = { status: 'error', packageId, error: data.error.message };
      } else if (data.result?.data) {
        results[name] = { status: 'deployed', packageId };
      } else {
        results[name] = { status: 'not_found', packageId };
      }
    } catch (error: any) {
      results[name] = { status: 'fetch_error', packageId, error: error.message };
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const deployed = Object.values(results).filter(r => r.status === 'deployed').length;
  const total = Object.keys(results).length;

  res.json({
    summary: {
      deployed,
      total,
      activeContracts: 8, // Excluding deprecated escrow contracts
      status: deployed >= 8 ? 'healthy' : deployed >= 5 ? 'degraded' : 'unhealthy'
    },
    contracts: results,
    explorerBaseUrl: IOTA_CONFIG.explorerUrl,
    checkedAt: new Date().toISOString()
  });
});

/**
 * GET /api/diagnostics/balance-check
 * Check balance for a single user
 * Query params: userId (required)
 */
router.get('/balance-check', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'userId query parameter is required'
    });
  }

  console.log(`🔍 Balance check for user: ${userId}`);

  const result = await checkUserBalance(userId);

  res.json({
    success: true,
    result
  });
});

/**
 * GET /api/diagnostics/balance-check-all
 * Check balances for multiple users
 * Query params: 
 *   - limit (default: 50, max: 500)
 *   - onlyWithWallets (default: false)
 *   - onlyWithBalance (default: true)
 */
router.get('/balance-check-all', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const onlyWithWallets = req.query.onlyWithWallets === 'true';
  const onlyWithBalance = req.query.onlyWithBalance !== 'false'; // Default true

  console.log(`🔍 Bulk balance check: limit=${limit}, onlyWithWallets=${onlyWithWallets}, onlyWithBalance=${onlyWithBalance}`);

  const report = await checkAllBalances({
    limit,
    onlyWithWallets,
    onlyWithBalance
  });

  // Log summary
  console.log('\n📊 BALANCE CHECK SUMMARY:');
  console.log(`   Total users checked: ${report.summary.totalUsersChecked}`);
  console.log(`   Users with wallets: ${report.summary.usersWithWallets}`);
  console.log(`   Users synced: ${report.summary.usersSynced}`);
  console.log(`   Users with discrepancy: ${report.summary.usersWithDiscrepancy}`);
  console.log(`   Total Supabase balance: ${formatBalance(report.summary.totalSupabaseBalance)}`);
  console.log(`   Total IOTA balance: ${formatBalance(report.summary.totalIotaBalance)}`);
  console.log(`   Total discrepancy: ${formatBalance(report.summary.totalDiscrepancy)}`);

  res.json({
    success: true,
    report
  });
});

/**
 * GET /api/diagnostics/discrepancies
 * Get only users with balance discrepancies
 */
router.get('/discrepancies', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

  console.log(`🔍 Checking for discrepancies (limit=${limit})...`);

  const report = await checkAllBalances({
    limit,
    onlyWithWallets: true,
    onlyWithBalance: true
  });

  // Filter to only discrepancies
  const discrepancies = report.users.filter(u => u.syncStatus === 'discrepancy');

  res.json({
    success: true,
    discrepancyCount: discrepancies.length,
    totalChecked: report.summary.totalUsersChecked,
    iotaNetworkStatus: report.iotaNetworkStatus,
    discrepancies,
    generatedAt: report.generatedAt
  });
});

// =============================================================================
// CLI MODE
// =============================================================================

async function runCli() {
  const args = process.argv.slice(2);
  
  console.log('🔧 BocaBoca Balance Diagnostics CLI\n');

  // Parse arguments
  const userArg = args.find(a => a.startsWith('--user='));
  const allFlag = args.includes('--all');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const walletsOnlyFlag = args.includes('--wallets-only');

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

  if (userArg) {
    // Single user check
    const userId = userArg.split('=')[1];
    console.log(`Checking user: ${userId}\n`);
    
    const result = await checkUserBalance(userId);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`User: ${result.username || result.userId}`);
    console.log(`Wallet: ${result.walletAddress || 'Not linked'}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Supabase Balance: ${result.supabaseBalanceDisplay}`);
    console.log(`IOTA Balance:     ${result.iotaBalanceDisplay || 'N/A'}`);
    console.log(`Discrepancy:      ${result.discrepancyDisplay || 'N/A'}`);
    console.log(`Status:           ${result.syncStatus.toUpperCase()}`);
    if (result.notes.length > 0) {
      console.log(`Notes:            ${result.notes.join(', ')}`);
    }
    console.log('═══════════════════════════════════════════════════════');

  } else if (allFlag) {
    // Bulk check
    console.log(`Checking up to ${limit} users${walletsOnlyFlag ? ' (with wallets only)' : ''}...\n`);

    const report = await checkAllBalances({
      limit,
      onlyWithWallets: walletsOnlyFlag,
      onlyWithBalance: true
    });

    // Print report
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   BALANCE REPORT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Generated: ${report.generatedAt}`);
    console.log(`IOTA Network: ${report.iotaNetworkStatus}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Total Users Checked:    ${report.summary.totalUsersChecked}`);
    console.log(`Users With Wallets:     ${report.summary.usersWithWallets}`);
    console.log(`Users Synced:           ${report.summary.usersSynced}`);
    console.log(`Users With Discrepancy: ${report.summary.usersWithDiscrepancy}`);
    console.log(`IOTA Errors:            ${report.summary.usersWithIotaErrors}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Total Supabase:  ${formatBalance(report.summary.totalSupabaseBalance)}`);
    console.log(`Total IOTA:      ${formatBalance(report.summary.totalIotaBalance)}`);
    console.log(`Total Discrep.:  ${formatBalance(report.summary.totalDiscrepancy)}`);
    console.log('═══════════════════════════════════════════════════════');

    // Show discrepancies
    const discrepancies = report.users.filter(u => u.syncStatus === 'discrepancy');
    if (discrepancies.length > 0) {
      console.log('\n⚠️  DISCREPANCIES FOUND:\n');
      for (const user of discrepancies) {
        console.log(`  ${user.username || user.userId}`);
        console.log(`    Supabase: ${user.supabaseBalanceDisplay}`);
        console.log(`    IOTA:     ${user.iotaBalanceDisplay}`);
        console.log(`    Diff:     ${user.discrepancyDisplay}`);
        console.log('');
      }
    } else {
      console.log('\n✅ No discrepancies found!');
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      report.warnings.forEach(w => console.log(`  - ${w}`));
    }

  } else {
    // Help
    console.log('Usage:');
    console.log('  npx ts-node src/routes/diagnostics.ts --user=<userId>');
    console.log('  npx ts-node src/routes/diagnostics.ts --all [--limit=N] [--wallets-only]');
    console.log('');
    console.log('Options:');
    console.log('  --user=<id>      Check a single user by ID');
    console.log('  --all            Check all users with token balance');
    console.log('  --limit=N        Limit number of users (default: 50)');
    console.log('  --wallets-only   Only check users with linked wallets');
  }
}

// Run CLI if executed directly
if (require.main === module) {
  runCli()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('CLI Error:', err);
      process.exit(1);
    });
}

export default router;
export { checkUserBalance, checkAllBalances, testIotaConnection };