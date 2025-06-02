// Blockchain Integration Tests
import { BlockchainIntegrationService } from '../blockchain-integration';
import { GovernanceEngine } from '../../governance/engine';
import { TokenEngine } from '../../token/engine';
import { ReputationEngine } from '../../reputation/engine';
import { RecommendationEngine } from '../../recommendation/engine';

describe('Blockchain Integration', () => {
  let integrationService: BlockchainIntegrationService;

  beforeEach(async () => {
    // Initialize engines
    const engines = {
      governance: new GovernanceEngine(),
      token: new TokenEngine(),
      reputation: new ReputationEngine(),
      recommendation: new RecommendationEngine(),
    };

    // Start with mock mode for testing
    integrationService = new BlockchainIntegrationService(
      { mode: 'mock' },
      engines
    );

    await integrationService.initialize();
  });

  afterEach(async () => {
    await integrationService.shutdown();
  });

  it('should initialize successfully', async () => {
    const health = await integrationService.getSystemHealth();
    expect(health.connected).toBe(true);
    expect(health.adapter).toBe('mock');
  });

  it('should create user profile', async () => {
    const address = '0x123';
    const profile = await integrationService.createUser(address);
    
    expect(profile.address).toBe(address);
    expect(profile.liquidBalance).toBe(0);
    expect(profile.trustScore).toBe(0);
  });

  it('should handle recommendation flow', async () => {
    const userAddress = '0x123';
    await integrationService.createUser(userAddress);

    // Submit recommendation
    const result = await integrationService.submitRecommendation(
      userAddress,
      { title: 'Test Restaurant', content: 'Great food!' }
    );

    expect(result.success).toBe(true);
    expect(result.actionId).toBeDefined();
  });

  // Add more tests as needed
});
