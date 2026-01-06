/**
 * BocaBoca Integration Test Script
 * =================================
 * 
 * Tests the blockchain integration to verify everything is configured correctly.
 * 
 * Run with: npx ts-node src/blockchain/test-integration.ts
 * 
 * Target location: code/poc/core/src/blockchain/test-integration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../../.env') });

import { IOTAClient } from './iota-client';
import { 
  PACKAGE_IDS, 
  SHARED_OBJECTS, 
  ADMIN_CAPS,
  NETWORK_CONFIG,
  validateContractConfig,
  formatBoca,
} from './contracts';

// ANSI colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function header(message: string) {
  console.log('\n' + colors.bold + '═'.repeat(60) + colors.reset);
  log(message, colors.bold);
  console.log(colors.bold + '═'.repeat(60) + colors.reset);
}

async function runTests() {
  header('BocaBoca Integration Test Suite');
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // =========================================================================
  // Test 1: Contract Configuration
  // =========================================================================
  header('Test 1: Contract Configuration');
  
  try {
    const isValid = validateContractConfig();
    if (isValid) {
      success('All Package IDs and Shared Object IDs are valid format');
      passed++;
    } else {
      error('Invalid contract configuration');
      failed++;
    }
  } catch (e) {
    error(`Contract validation error: ${e}`);
    failed++;
  }

  // Log configured contracts
  info(`Network: ${NETWORK_CONFIG.network}`);
  info(`RPC URL: ${NETWORK_CONFIG.rpcUrl}`);
  console.log('\nPackage IDs configured:');
  Object.entries(PACKAGE_IDS).forEach(([name, id]) => {
    console.log(`  ${name}: ${id.substring(0, 20)}...`);
  });

  // =========================================================================
  // Test 2: Environment Variables
  // =========================================================================
  header('Test 2: Environment Variables');

  const envVars = {
    'BOCABOCA_SPONSOR_PRIVATE_KEY': process.env.BOCABOCA_SPONSOR_PRIVATE_KEY,
    'BOCABOCA_TREASURY_CAP': process.env.BOCABOCA_TREASURY_CAP,
    'BOCABOCA_LOTTERY_ADMIN_CAP': process.env.BOCABOCA_LOTTERY_ADMIN_CAP,
    'BOCABOCA_PHOTO_CONTEST_ADMIN_CAP': process.env.BOCABOCA_PHOTO_CONTEST_ADMIN_CAP,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  Object.entries(envVars).forEach(([name, value]) => {
    if (value && value.length > 0) {
      const displayValue = name.includes('KEY') || name.includes('PRIVATE') 
        ? `${value.substring(0, 15)}...` 
        : `${value.substring(0, 30)}...`;
      success(`${name} is set (${displayValue})`);
      passed++;
    } else {
      if (name.includes('SUPABASE')) {
        warning(`${name} not set (needed for pending rewards)`);
        warnings++;
      } else {
        error(`${name} not set`);
        failed++;
      }
    }
  });

  // =========================================================================
  // Test 3: IOTA Client Initialization
  // =========================================================================
  header('Test 3: IOTA Client Initialization');

  let iotaClient: IOTAClient | null = null;
  
  try {
    iotaClient = new IOTAClient();
    success('IOTAClient instantiated successfully');
    passed++;

    const sponsorAddress = iotaClient.getSponsorAddress();
    if (sponsorAddress) {
      success(`Sponsor wallet loaded: ${sponsorAddress}`);
      passed++;
    } else {
      error('Sponsor wallet not loaded (check BOCABOCA_SPONSOR_PRIVATE_KEY)');
      failed++;
    }
  } catch (e) {
    error(`Failed to create IOTAClient: ${e}`);
    failed++;
  }

  // =========================================================================
  // Test 4: Network Connectivity
  // =========================================================================
  header('Test 4: Network Connectivity');

  if (iotaClient) {
    try {
      const health = await iotaClient.healthCheck();
      
      if (health.healthy) {
        success(`Connected to IOTA network (latency: ${health.latencyMs}ms)`);
        passed++;
      } else {
        error(`Network unhealthy: ${health.error}`);
        failed++;
      }
    } catch (e) {
      error(`Health check failed: ${e}`);
      failed++;
    }
  } else {
    warning('Skipping network test (client not initialized)');
    warnings++;
  }

  // =========================================================================
  // Test 5: Query Token Registry
  // =========================================================================
  header('Test 5: Query Token Registry');

  if (iotaClient) {
    try {
      const tokenRegistry = await iotaClient.getObject(SHARED_OBJECTS.TOKEN_REGISTRY);
      
      if (tokenRegistry) {
        success('Token Registry object found on-chain');
        passed++;
      } else {
        error('Token Registry not found (check SHARED_OBJECTS.TOKEN_REGISTRY)');
        failed++;
      }
    } catch (e) {
      error(`Failed to query Token Registry: ${e}`);
      failed++;
    }
  } else {
    warning('Skipping registry test (client not initialized)');
    warnings++;
  }

  // =========================================================================
  // Test 6: Query Rewards Treasury
  // =========================================================================
  header('Test 6: Query Rewards Treasury');

  if (iotaClient) {
    try {
      const treasury = await iotaClient.getObject(SHARED_OBJECTS.REWARDS_TREASURY);
      
      if (treasury) {
        success('Rewards Treasury object found on-chain');
        passed++;
      } else {
        error('Rewards Treasury not found (check SHARED_OBJECTS.REWARDS_TREASURY)');
        failed++;
      }
    } catch (e) {
      error(`Failed to query Rewards Treasury: ${e}`);
      failed++;
    }
  } else {
    warning('Skipping treasury test (client not initialized)');
    warnings++;
  }

  // =========================================================================
  // Test 7: Check Sponsor Wallet Balance
  // =========================================================================
  header('Test 7: Sponsor Wallet IOTA Balance');

  if (iotaClient) {
    const sponsorAddress = iotaClient.getSponsorAddress();
    
    if (sponsorAddress) {
      try {
        // Query native IOTA balance for gas
        const response = await fetch(NETWORK_CONFIG.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'iotax_getBalance',
            params: [sponsorAddress, '0x2::iota::IOTA'],
          }),
        });
        
        const data = await response.json();
        
        if (data.result) {
          const balance = BigInt(data.result.totalBalance || 0);
          const displayBalance = Number(balance) / 1_000_000_000; // IOTA has 9 decimals
          
          if (balance > 0) {
            success(`Sponsor wallet has ${displayBalance.toFixed(4)} IOTA for gas`);
            passed++;
            
            if (displayBalance < 0.1) {
              warning('Low balance - consider requesting more from faucet');
              warnings++;
            }
          } else {
            error('Sponsor wallet has 0 IOTA - needs funding for gas');
            info(`Request testnet IOTA from: ${NETWORK_CONFIG.faucetUrl}`);
            failed++;
          }
        } else {
          warning('Could not fetch balance (this may be normal on some networks)');
          warnings++;
        }
      } catch (e) {
        warning(`Balance check failed: ${e}`);
        warnings++;
      }
    }
  }

  // =========================================================================
  // Test Summary
  // =========================================================================
  header('Test Summary');
  
  console.log(`\n  ${colors.green}Passed:   ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:   ${failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings: ${warnings}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All critical tests passed! Ready for integration.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  Some tests failed. Please fix issues before proceeding.${colors.reset}\n`);
  }

  // =========================================================================
  // Optional: Test Mint (uncomment to run)
  // =========================================================================

  header('Optional: Test Mint (DRY RUN)');
  
  // ⚠️ UNCOMMENT ONLY IF YOU WANT TO TEST ACTUAL MINTING
  // This will mint 0.1 BOCA to the sponsor wallet as a test
  
  if (iotaClient) {
    const sponsorAddress = iotaClient.getSponsorAddress();
    
    if (sponsorAddress && process.env.BOCABOCA_TREASURY_CAP) {
      info('Attempting to mint 0.1 BOCA to sponsor wallet...');
      
      try {
        const result = await iotaClient.mintTokens(sponsorAddress, 0.1);
        
        if (result.success) {
          success(`Minted 0.1 BOCA! TX: ${result.digest}`);
          info(`Explorer: ${result.explorerUrl}`);
        } else {
          error(`Mint failed: ${result.error}`);
        }
      } catch (e) {
        error(`Mint error: ${e}`);
      }
    } else {
      warning('Skipping mint test (missing sponsor address or treasury cap)');
    }
  }

  return failed === 0;
}

// Run the tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error('Test suite crashed:', e);
    process.exit(1);
  });