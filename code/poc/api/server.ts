// code/poc/api/server.ts - Fixed with proper CORS for Codespaces
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

// CORRECTED: Enhanced CORS configuration for Codespaces
const corsOrigins = [
  // Local development
  'http://localhost:3000',        // Frontend (React dev server)
  'http://localhost:3001',        // Backend (API server) - for any self-references
  'http://127.0.0.1:3000',       // Frontend alternative
  'http://127.0.0.1:3001',       // Backend alternative
  // FIXED: Correct Codespaces URLs matching your actual environment
  'https://redesigned-lamp-q74w4d8gqp51fx6q1q-3000.app.github.dev',  // Frontend
  'https://redesigned-lamp-q74w4d8gqp51fx6q1q-3001.app.github.dev',  // Backend (if needed)
  // Add any additional origins from environment
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
];

console.log('🌍 CORS Origins configured:', corsOrigins);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log('❌ CORS rejected origin:', origin);
    console.log('✅ Allowed origins:', corsOrigins);
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: port,
    cors: corsOrigins
  });
});

// CORRECTED: Add explicit API health check
app.get('/api/health', (req, res) => {
  console.log('🏥 API Health check requested');
  res.json({ 
    status: 'healthy', 
    service: 'OmeoneChain API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// DIRECT AUTH ROUTES - Bypass import issues
console.log('🔄 Setting up direct auth routes');

app.post('/api/auth/challenge', async (req, res) => {
  try {
    console.log('🔐 Auth challenge requested');
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wallet address is required' 
      });
    }

    const challenge = `Please sign this message to authenticate with OmeoneChain: ${Date.now()}`;
    
    console.log(`✅ Challenge generated for address: ${address}`);
    res.json({ 
      success: true, 
      challenge,
      message: `Sign this message to verify your wallet: ${challenge}`,
      expiresIn: 300
    });
  } catch (error) {
    console.error('❌ Auth challenge error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    console.log('🔐 Auth verification requested');
    const { address, signature, challenge } = req.body;
    
    if (!address || !signature || !challenge) {
      return res.status(400).json({ 
        success: false, 
        error: 'Address, signature, and challenge are required' 
      });
    }

    // For now, always return success - implement actual signature verification later
    const authToken = `auth_${Date.now()}_${address}`;
    
    console.log(`✅ Auth verified for address: ${address}`);
    res.json({ 
      success: true, 
      token: authToken,
      user: { 
        address,
        id: `user_${address.slice(2, 8)}`,
        isAuthenticated: true,
        authMode: 'wallet'
      },
      expiresIn: 24 * 60 * 60
    });
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

console.log('✅ Direct auth routes configured');

// Mock data for testing
const mockUser = {
  id: 'user1',
  reputation: {
    overallScore: 8.6,
    qualityScore: 9.2,
    consistencyScore: 8.8,
    totalRecommendations: 23,
    socialImpact: 147,
    upvotesReceived: 89,
    downvotesReceived: 12
  },
  tokenBalance: 1250,
  stakingInfo: {
    totalStaked: 100,
    votingPower: 2.3,
    tier: 'Explorer'
  }
};

const mockProposals = [
  {
    id: 'prop_1',
    title: 'Reduce Transaction Fees',
    description: 'Proposal to reduce network transaction fees by 25%',
    category: 'PARAMETER_CHANGE',
    status: 'ACTIVE',
    author: 'user1',
    totalVotes: 156,
    supportPercentage: 73.2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prop_2', 
    title: 'Treasury Allocation for Development',
    description: 'Allocate 50,000 TOK from treasury for core development',
    category: 'TREASURY_SPEND',
    status: 'ACTIVE',
    author: 'user2',
    totalVotes: 89,
    supportPercentage: 65.8,
    createdAt: new Date().toISOString()
  }
];

// API Routes - all prefixed with /api

// Governance endpoints
app.get('/api/governance/proposals', async (req, res) => {
  try {
    console.log('🏛️ Governance proposals requested');
    res.json({ success: true, data: mockProposals });
  } catch (error) {
    console.error('❌ Governance proposals error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/governance/proposals', async (req, res) => {
  try {
    console.log('🏛️ Creating new proposal');
    const { title, description, category, userId } = req.body;
    
    if (!title || !description || !category || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, description, category, userId' 
      });
    }

    const newProposal = {
      id: `prop_${Date.now()}`,
      title,
      description,
      category,
      status: 'ACTIVE',
      author: userId,
      totalVotes: 0,
      supportPercentage: 0,
      createdAt: new Date().toISOString()
    };

    mockProposals.push(newProposal);
    console.log('✅ Proposal created:', newProposal.id);
    res.status(201).json({ success: true, data: newProposal });
  } catch (error) {
    console.error('❌ Create proposal error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/governance/proposals/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, support } = req.body;
    
    console.log(`🗳️ Vote on proposal ${id}: ${support ? 'FOR' : 'AGAINST'}`);
    
    if (!userId || typeof support !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, support' 
      });
    }

    const proposal = mockProposals.find(p => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    // Update vote counts (simplified)
    proposal.totalVotes += 1;
    if (support) {
      proposal.supportPercentage = Math.min(proposal.supportPercentage + 2, 100);
    } else {
      proposal.supportPercentage = Math.max(proposal.supportPercentage - 1, 0);
    }

    const result = {
      proposalId: id,
      userId,
      support,
      voteWeight: 1.0,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Vote recorded:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Vote error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/governance/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🏛️ Get proposal ${id}`);
    const proposal = mockProposals.find(p => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    res.json({ success: true, data: proposal });
  } catch (error) {
    console.error('❌ Get proposal error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// User/Reputation endpoints
app.get('/api/users/me', async (req, res) => {
  try {
    console.log('👤 Get current user');
    const userId = req.headers['x-user-id'] as string || 'user1';
    const userData = { ...mockUser, id: userId };
    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/users/:id/trust-score', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Get trust score for user ${id}`);
    const trustScore = {
      userId: id,
      trustScore: 8.6,
      socialGraphWeight: 0.75,
      directConnections: 34,
      indirectConnections: 147,
      reputationFactor: 1.2
    };
    res.json({ success: true, data: trustScore });
  } catch (error) {
    console.error('❌ Get trust score error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Token endpoints
app.get('/api/tokens/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`💰 Get balance for user ${userId}`);
    const balance = { userId, balance: mockUser.tokenBalance };
    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('❌ Get balance error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/tokens/transfer', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    console.log(`💸 Transfer ${amount} tokens from ${from} to ${to}`);
    
    if (!from || !to || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: from, to, amount' 
      });
    }

    const result = {
      transactionId: `tx_${Date.now()}`,
      from,
      to,
      amount,
      timestamp: new Date().toISOString()
    };
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Transfer error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Staking endpoints
app.post('/api/governance/stake', async (req, res) => {
  try {
    const { userId, amount, duration } = req.body;
    console.log(`🔒 Stake ${amount} tokens for user ${userId}`);
    
    if (!userId || !amount || !duration) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, amount, duration' 
      });
    }

    const result = {
      userId,
      amount,
      duration,
      stakingId: `stake_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Stake error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/governance/staking/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔒 Get staking info for user ${userId}`);
    const stakingInfo = {
      userId,
      totalStaked: mockUser.stakingInfo.totalStaked,
      votingPower: mockUser.stakingInfo.votingPower,
      tier: mockUser.stakingInfo.tier,
      lockEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
    res.json({ success: true, data: stakingInfo });
  } catch (error) {
    console.error('❌ Get staking info error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Recommendations endpoints
app.get('/api/recommendations', async (req, res) => {
  try {
    const { category, location, limit = 10 } = req.query;
    console.log(`📝 Get recommendations - category: ${category}, location: ${location}, limit: ${limit}`);
    const mockRecommendations = [
      {
        id: 'rec_1',
        userId: 'user1',
        serviceId: 'restaurant_123',
        rating: 5,
        content: 'Amazing pasta and great atmosphere!',
        tags: ['italian', 'pasta', 'romantic'],
        trustScore: 8.9,
        createdAt: new Date().toISOString()
      }
    ];
    res.json({ success: true, data: mockRecommendations });
  } catch (error) {
    console.error('❌ Get recommendations error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/recommendations', async (req, res) => {
  try {
    const { userId, serviceId, rating, content, tags } = req.body;
    console.log(`📝 Create recommendation for service ${serviceId}`);
    
    if (!userId || !serviceId || !rating || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, serviceId, rating, content' 
      });
    }

    const recommendation = {
      id: `rec_${Date.now()}`,
      userId,
      serviceId,
      rating,
      content,
      tags: tags || [],
      trustScore: 0,
      createdAt: new Date().toISOString()
    };
    
    console.log('✅ Recommendation created:', recommendation.id);
    res.status(201).json({ success: true, data: recommendation });
  } catch (error) {
    console.error('❌ Create recommendation error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Error handling middleware (must be after all routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 OmeoneChain API Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🏛️ Governance API: http://localhost:${port}/api/governance/proposals`);
  console.log(`🔐 Auth API: http://localhost:${port}/api/auth/challenge`);
  console.log(`🌍 CORS Origins: ${corsOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { app, server };