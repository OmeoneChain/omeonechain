// File: code/poc/core/src/__tests__/setup.ts
// Global test setup and cleanup

// Increase timeout for all tests
jest.setTimeout(10000);

// Mock console.log/error to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Quiet console output during tests unless specifically needed
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console functions
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  // Clear all timers between tests
  jest.clearAllTimers();
});

// Global mock for RebasedAdapter polling to prevent hanging
jest.mock('../adapters/rebased-adapter', () => {
  const mockRebasedAdapter = {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    submitTx: jest.fn().mockResolvedValue({
      id: 'mock-tx-id',
      status: 'confirmed',
      hash: 'mock-hash',
      timestamp: new Date().toISOString()
    }),
    queryState: jest.fn().mockResolvedValue([]),
    watchEvents: jest.fn().mockReturnValue(() => {}),
    initializeWallet: jest.fn().mockResolvedValue(true),
    getWalletAddress: jest.fn().mockReturnValue('mock-wallet-address'),
    pollForEvents: jest.fn(), // Mock but don't auto-call
    startEventPolling: jest.fn(),
    stopEventPolling: jest.fn()
  };

  return {
    RebasedAdapter: jest.fn(() => mockRebasedAdapter)
  };
});