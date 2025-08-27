import { testBalanceComparison, getMyTokenBalance } from './services/TokenBalanceService';

// Make functions available globally for console testing
(window as any).testBalance = testBalanceComparison;
(window as any).getMyBalance = getMyTokenBalance;