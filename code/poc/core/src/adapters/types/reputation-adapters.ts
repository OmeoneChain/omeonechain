// Reputation adapter types for OmeoneChain

export interface ReputationData {
  userId: string;
  overallScore: number;
  qualityScore: number;
  consistencyScore: number;
  socialImpact: number;
  totalRecommendations: number;
  upvotesReceived: number;
  downvotesReceived: number;
  verificationLevel: string;
  activeSince: string;
  tokenRewardsEarned: number;
}

export interface TrustScoreCalculation {
  userId: string;
  trustScore: number;
  socialGraphWeight: number;
  directConnections: number;
  indirectConnections: number;
  reputationFactor: number;
}

export interface ReputationTransaction {
  transactionId: string;
  userId: string;
  action: 'UPVOTE' | 'DOWNVOTE' | 'RECOMMENDATION' | 'VERIFICATION';
  points: number;
  timestamp: string;
  relatedContentId?: string;
}
