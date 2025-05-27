// code/poc/api/server.ts - Simplified working version
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://omeonechain.app'] 
    : ['http://localhost:3000', 'http://localhost:5173']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

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

// API Routes

// Governance endpoints
app.get('/api/v1/governance/proposals', async (req, res) => {
  try {
    res.json({ success: true, data: mockProposals });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/v1/governance/proposals', async (req, res) => {
  try {
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
    res.status(201).json({ success: true, data: newProposal });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/v1/governance/proposals/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, support } = req.body;
    
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

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/v1/governance/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = mockProposals.find(p => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    res.json({ success: true, data: proposal });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// User/Reputation endpoints
app.get('/api/v1/users/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'user1';
    const userData = { ...mockUser, id: userId };
    res.json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/v1/users/:id/trust-score', async (req, res) => {
  try {
    const { id } = req.params;
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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Token endpoints
app.get('/api/v1/tokens/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const balance = { userId, balance: mockUser.tokenBalance };
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/v1/tokens/transfer', async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    
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
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Staking endpoints
app.post('/api/v1/governance/stake', async (req, res) => {
  try {
    const { userId, amount, duration } = req.body;
    
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
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/v1/governance/staking/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stakingInfo = {
      userId,
      totalStaked: mockUser.stakingInfo.totalStaked,
      votingPower: mockUser.stakingInfo.votingPower,
      tier: mockUser.stakingInfo.tier,
      lockEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
    res.json({ success: true, data: stakingInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Recommendations endpoints
app.get('/api/v1/recommendations', async (req, res) => {
  try {
    const { category, location, limit = 10 } = req.query;
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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/v1/recommendations', async (req, res) => {
  try {
    const { userId, serviceId, rating, content, tags } = req.body;
    
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
    
    res.status(201).json({ success: true, data: recommendation });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 OmeoneChain API Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🏛️ Governance API: http://localhost:${port}/api/v1/governance/proposals`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { app, server };