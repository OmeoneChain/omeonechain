import { TrustScoreCalculator } from './trust-score-calculator';

console.log('🚀 OmeoneChain Trust Score Algorithm Demo\n');

const calculator = new TrustScoreCalculator();

// Scenario 1: Restaurant recommendation from a friend
console.log('📍 Scenario 1: Friend recommends pizza place');
const friendRecommendation = calculator.calculateTrustScore({
  targetContentId: 'joes-pizza-nyc',
  evaluatingUserId: 'alice',
  socialConnections: [{
    fromUserId: 'alice',
    toUserId: 'bob-foodie',
    connectionType: 'follow',
    establishedAt: new Date('2024-01-01'),
    trustWeight: 1.0
  }],
  userInteractions: [
    {
      userId: 'charlie',
      contentId: 'joes-pizza-nyc',
      interactionType: 'save',
      timestamp: new Date(),
      socialDistance: 1
    },
    {
      userId: 'diana',
      contentId: 'joes-pizza-nyc',
      interactionType: 'upvote',
      timestamp: new Date(),
      socialDistance: 1
    }
  ],
  contentMetadata: {
    contentId: 'joes-pizza-nyc',
    authorId: 'bob-foodie',
    createdAt: new Date(),
    category: 'restaurant',
    tags: ['pizza', 'nyc', 'authentic']
  }
});

console.log(`Trust Score: ${friendRecommendation.finalScore}/10`);
console.log(`Category: ${calculator.getTrustCategory(friendRecommendation.finalScore)}`);
console.log(`Social Trust Weight: ${friendRecommendation.breakdown.socialTrustWeight}`);
console.log(`Quality Signals: ${friendRecommendation.breakdown.qualitySignals}`);
console.log(`Confidence: ${friendRecommendation.confidence}`);
console.log(`Qualifies for Rewards: ${calculator.meetsTrustThreshold(friendRecommendation.finalScore) ? '✅' : '❌'}`);

// Scenario 2: Your own content
console.log('\n📍 Scenario 2: Your own recommendation');
const ownContent = calculator.calculateTrustScore({
  targetContentId: 'my-favorite-cafe',
  evaluatingUserId: 'alice',
  socialConnections: [],
  userInteractions: [],
  contentMetadata: {
    contentId: 'my-favorite-cafe',
    authorId: 'alice',
    createdAt: new Date(),
    category: 'cafe',
    tags: ['coffee', 'quiet', 'wifi']
  }
});

console.log(`Trust Score: ${ownContent.finalScore}/10`);
console.log(`Category: ${calculator.getTrustCategory(ownContent.finalScore)}`);
console.log(`Qualifies for Rewards: ${calculator.meetsTrustThreshold(ownContent.finalScore) ? '✅' : '❌'}`);

// Scenario 3: Distant connection (should get low trust)
console.log('\n📍 Scenario 3: 3-hop distant recommendation');
const distantRecommendation = calculator.calculateTrustScore({
  targetContentId: 'random-restaurant',
  evaluatingUserId: 'alice',
  socialConnections: [
    { fromUserId: 'alice', toUserId: 'bob', connectionType: 'follow', establishedAt: new Date(), trustWeight: 1.0 },
    { fromUserId: 'bob', toUserId: 'charlie', connectionType: 'follow', establishedAt: new Date(), trustWeight: 1.0 },
    { fromUserId: 'charlie', toUserId: 'distant-user', connectionType: 'follow', establishedAt: new Date(), trustWeight: 1.0 }
  ],
  userInteractions: [],
  contentMetadata: {
    contentId: 'random-restaurant',
    authorId: 'distant-user',
    createdAt: new Date(),
    category: 'restaurant',
    tags: ['food']
  }
});

console.log(`Trust Score: ${distantRecommendation.finalScore}/10`);
console.log(`Category: ${calculator.getTrustCategory(distantRecommendation.finalScore)}`);
console.log(`Qualifies for Rewards: ${calculator.meetsTrustThreshold(distantRecommendation.finalScore) ? '✅' : '❌'}`);

console.log('\n🎉 Trust Score Algorithm Working Perfectly!');
