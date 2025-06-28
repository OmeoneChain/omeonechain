/**
 * OmeoneChain API
 * 
 * Main entry point for the OmeoneChain API server
 * Based on Technical Specifications A.4
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import recommendationRoutes from './routes/recommendations';
import userRoutes from './routes/users';
import serviceRoutes from './routes/services';
import tokenRoutes from './routes/tokens';
import governanceRoutes from './routes/governance';
import developerRoutes from './routes/developer';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { authenticate } from './middleware/auth';

// Import engines
import { RecommendationEngine } from '../recommendation/engine';
import { ReputationEngine } from '../reputation/engine';
import { TokenEngine } from '../token/engine';
import { ServiceEngine } from '../services/engine';
import { GovernanceEngine } from '../governance/engine';

// Import adapters
import { ChainAdapter } from '../adapters/chain-adapter';
import { StorageProvider } from '../storage/storage-provider';

/**
 * API server configuration
 */
export interface ApiServerConfig {
  /**
   * Server port
   */
  port?: number;
  
  /**
   * Enable CORS
   */
  cors?: boolean;
  
  /**
   * Trusted origins for CORS
   */
  corsOrigins?: string[];
  
  /**
   * Enable WebSocket for real-time updates
   */
  enableWebSocket?: boolean;
  
  /**
   * Request size limit
   */
  maxRequestSize?: string;
  
  /**
   * JWT secret for authentication
   */
  jwtSecret?: string;
  
  /**
   * Enable rate limiting
   */
  enableRateLimit?: boolean;
  
  /**
   * Rate limit requests per IP
   */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

/**
 * Default API server configuration
 */
const DEFAULT_CONFIG: ApiServerConfig = {
  port: 3000,
  cors: true,
  corsOrigins: ['http://localhost:3001'],
  enableWebSocket: true,
  maxRequestSize: '5mb',
  enableRateLimit: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};

/**
 * OmeoneChain API Server
 */
export class ApiServer {
  private app: express.Application;
  private server: any;
  private io: any;
  private config: ApiServerConfig;
  
  // Core engines
  private recommendationEngine: RecommendationEngine;
  private reputationEngine: ReputationEngine;
  private tokenEngine: TokenEngine;
  private serviceEngine: ServiceEngine;
  private governanceEngine: GovernanceEngine;
  
  /**
   * Create a new API server
   * 
   * @param adapter Chain adapter for blockchain interactions
   * @param storage Storage provider for off-chain content
   * @param config Server configuration
   */
  constructor(
    adapter: ChainAdapter,
    storage: StorageProvider,
    config: ApiServerConfig = {}
  ) {
    // Merge config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Create engines
    this.recommendationEngine = new RecommendationEngine(adapter, storage);
    this.reputationEngine = new ReputationEngine(adapter);
    this.tokenEngine = new TokenEngine(adapter);
    this.serviceEngine = new ServiceEngine(adapter, storage);
    this.governanceEngine = new GovernanceEngine(adapter);
    
    // Create Express app
    this.app = express();
    
    // Set up middleware
    this.setupMiddleware();
    
    // Set up routes
    this.setupRoutes();
    
    // Set up error handler
    this.app.use(errorHandler);
    
    // Create HTTP server
    this.server = createServer(this.app);
    
    // Set up WebSocket if enabled
    if (this.config.enableWebSocket) {
      this.setupWebSocket();
    }
  }
  
  /**
   * Set up middleware
   * 
   * @private
   */
  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(bodyParser.json({ limit: this.config.maxRequestSize }));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(requestLogger);
    
    // CORS
    if (this.config.cors) {
      this.app.use(cors({
        origin: this.config.corsOrigins,
        credentials: true
      }));
    }
    
    // Rate limiting
    if (this.config.enableRateLimit) {
      const rateLimit = require('express-rate-limit');
      this.app.use(rateLimit({
        windowMs: this.config.rateLimit?.windowMs || 15 * 60 * 1000,
        max: this.config.rateLimit?.max || 100
      }));
    }
  }
  
  /**
   * Set up API routes
   * 
   * @private
   */
  private setupRoutes(): void {
    // API version prefix
    const apiPrefix = '/api/v1';
    
    // Health check route (no auth)
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });
    
    // Public routes (no auth)
    this.app.use(`${apiPrefix}/recommendations`, recommendationRoutes(this.recommendationEngine));
    
    // Protected routes (require auth)
    this.app.use(`${apiPrefix}/users`, authenticate, userRoutes(this.reputationEngine));
    this.app.use(`${apiPrefix}/services`, authenticate, serviceRoutes(this.serviceEngine));
    this.app.use(`${apiPrefix}/wallet`, authenticate, tokenRoutes(this.tokenEngine));
    this.app.use(`${apiPrefix}/governance`, authenticate, governanceRoutes(this.governanceEngine));
    
    // Developer API routes
    this.app.use(`${apiPrefix}/developer`, authenticate, developerRoutes({
      recommendationEngine: this.recommendationEngine,
      reputationEngine: this.reputationEngine,
      serviceEngine: this.serviceEngine
    }));
    
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }
  
  /**
   * Set up WebSocket for real-time updates
   * 
   * @private
   */
  private setupWebSocket(): void {
    this.io = new Server(this.server, {
      cors: {
        origin: this.config.corsOrigins,
        credentials: true
      }
    });
    
    // Authentication middleware for Socket.IO
    this.io.use((socket: any, next: Function) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      try {
        // Simple JWT verification
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, this.config.jwtSecret);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
    
    // Socket connection handler
    this.io.on('connection', (socket: any) => {
      console.log(`User connected: ${socket.user.id}`);
      
      // Join user-specific room
      socket.join(`user:${socket.user.id}`);
      
      // Join recommendation rooms based on subscription
      socket.on('subscribe:recommendations', (data: any) => {
        if (data.category) {
          socket.join(`recommendations:category:${data.category}`);
        }
        
        if (data.serviceId) {
          socket.join(`recommendations:service:${data.serviceId}`);
        }
      });
      
      // Disconnect handler
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.id}`);
      });
    });
  }
  
  /**
   * Initialize the API server
   * 
   * @returns Promise resolving when initialized
   */
  async initialize(): Promise<void> {
    // Initialize engines
    await this.recommendationEngine.initialize();
    await this.reputationEngine.initialize();
    await this.tokenEngine.initialize();
    await this.serviceEngine.initialize();
    await this.governanceEngine.initialize();
    
    console.log('API engines initialized');
  }
  
  /**
   * Start the API server
   * 
   * @returns Promise resolving when server is started
   */
  async start(): Promise<void> {
    // Initialize server
    await this.initialize();
    
    // Start listening
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`API server running on port ${this.config.port}`);
        resolve();
      });
    });
  }
  
  /**
   * Stop the API server
   * 
   * @returns Promise resolving when server is stopped
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Get the Express app instance
   * 
   * @returns Express application
   */
  getApp(): express.Application {
    return this.app;
  }
  
  /**
   * Get the HTTP server instance
   * 
   * @returns HTTP server
   */
  getServer(): any {
    return this.server;
  }
  
  /**
   * Get the Socket.IO server instance
   * 
   * @returns Socket.IO server
   */
  getIo(): any {
    return this.io;
  }
  
  /**
   * Emit an event to all subscribed clients
   * 
   * @param event Event name
   * @param data Event data
   */
  emit(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
  
  /**
   * Emit an event to a specific room
   * 
   * @param room Room name
   * @param event Event name
   * @param data Event data
   */
  emitToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }
  
  /**
   * Emit an event to a specific user
   * 
   * @param userId User ID
   * @param event Event name
   * @param data Event data
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }
}

/**
 * Create and export a default API server instance
 * 
 * @param adapter Chain adapter for blockchain interactions
 * @param storage Storage provider for off-chain content
 * @param config Server configuration
 * @returns API server instance
 */
export function createApiServer(
  adapter: ChainAdapter,
  storage: StorageProvider,
  config?: ApiServerConfig
): ApiServer {
  return new ApiServer(adapter, storage, config);
}

export default createApiServer;
