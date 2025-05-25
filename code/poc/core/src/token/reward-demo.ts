cd /workspaces/omeonechain/code/poc/core

# Remove the problematic file
rm src/token/reward-demo.ts

# Create a clean version
cat > src/token/reward-demo.ts << 'EOF'
import { RewardEngine } from './reward-engine';

console.log('💰 OmeoneChain Reward Engine Demo\n');

const engine = new RewardEngine();

const result = engine.calculateReward({
  actionId: 'pizza-rec-001',
  userId: 'alice',
  contentId: 'joes-amazing-pizza',
  actionType: 'recommendation_created',
  trustScore: 8.6,
  socialConnections: [
    {
      fromUserId: 'bob',
      toUserId: 'alice',
      socialDistance: 1,
      trustWeight: 0.75,
      interactionType: 'upvote',
      timestamp: new Date()
    },
    {
      fromUserId: 'charlie',
      toUserId: 'alice', 
      socialDistance: 1,
      trustWeight: 0.75,
      interactionType: 'save',
      timestamp: new Date()
    }
  ],
  timestamp: new Date(),
  metadata: { category: 'restaurant' }
});

console.log('🍕 Pizza Recommendation Token Rewards:');
console.log(`Total Reward: ${result.totalReward.toFixed(2)} TOK`);
console.log(`Trust Multiplier: ${result.breakdown.trustMultiplier.toFixed(2)}x`);
console.log(`Social Bonuses: ${result.breakdown.socialBonuses.toFixed(2)} TOK`);

console.log('\nDistribution Plan:');
result.distributionPlan.forEach(reward => {
  console.log(`- ${reward.recipientUserId}: ${reward.amount.toFixed(2)} TOK`);
});

console.log('\n🎉 Trust Score 8.6 → Real Token Rewards!');
EOF

# Run the demo
npx tsx src/token/reward-demo.ts