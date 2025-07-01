"use strict";
/**
 * OmeoneChain API
 *
 * Main entry point for the OmeoneChain API server
 * Based on Technical Specifications A.4
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiServer = void 0;
exports.createApiServer = createApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// Import routes
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const users_1 = __importDefault(require("./routes/users"));
const services_1 = __importDefault(require("./routes/services"));
const tokens_1 = __importDefault(require("./routes/tokens"));
const governance_1 = __importDefault(require("./routes/governance"));
const developer_1 = __importDefault(require("./routes/developer"));
// Import middleware
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const auth_1 = require("./middleware/auth");
// Import engines
const engine_1 = require("../recommendation/engine");
const engine_2 = require("../reputation/engine");
const engine_3 = require("../token/engine");
const engine_4 = require("../services/engine");
const engine_5 = require("../governance/engine");
/**
 * Default API server configuration
 */
const DEFAULT_CONFIG = {
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
class ApiServer {
    /**
     * Create a new API server
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param storage Storage provider for off-chain content
     * @param config Server configuration
     */
    constructor(adapter, storage, config = {}) {
        // Merge config with defaults
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Create engines
        this.recommendationEngine = new engine_1.RecommendationEngine(adapter, storage);
        this.reputationEngine = new engine_2.ReputationEngine(adapter);
        this.tokenEngine = new engine_3.TokenEngine(adapter);
        this.serviceEngine = new engine_4.ServiceEngine(adapter, storage);
        this.governanceEngine = new engine_5.GovernanceEngine(adapter);
        // Create Express app
        this.app = (0, express_1.default)();
        // Set up middleware
        this.setupMiddleware();
        // Set up routes
        this.setupRoutes();
        // Set up error handler
        this.app.use(error_handler_1.errorHandler);
        // Create HTTP server
        this.server = (0, http_1.createServer)(this.app);
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
    setupMiddleware() {
        // Basic middleware
        this.app.use((0, helmet_1.default)());
        this.app.use((0, compression_1.default)());
        this.app.use(body_parser_1.default.json({ limit: this.config.maxRequestSize }));
        this.app.use(body_parser_1.default.urlencoded({ extended: true }));
        this.app.use(request_logger_1.requestLogger);
        // CORS
        if (this.config.cors) {
            this.app.use((0, cors_1.default)({
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
    setupRoutes() {
        // API version prefix
        const apiPrefix = '/api/v1';
        // Health check route (no auth)
        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok' });
        });
        // Public routes (no auth)
        this.app.use(`${apiPrefix}/recommendations`, (0, recommendations_1.default)(this.recommendationEngine));
        // Protected routes (require auth)
        this.app.use(`${apiPrefix}/users`, auth_1.authenticate, (0, users_1.default)(this.reputationEngine));
        this.app.use(`${apiPrefix}/services`, auth_1.authenticate, (0, services_1.default)(this.serviceEngine));
        this.app.use(`${apiPrefix}/wallet`, auth_1.authenticate, (0, tokens_1.default)(this.tokenEngine));
        this.app.use(`${apiPrefix}/governance`, auth_1.authenticate, (0, governance_1.default)(this.governanceEngine));
        // Developer API routes
        this.app.use(`${apiPrefix}/developer`, auth_1.authenticate, (0, developer_1.default)({
            recommendationEngine: this.recommendationEngine,
            reputationEngine: this.reputationEngine,
            serviceEngine: this.serviceEngine
        }));
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }
    /**
     * Set up WebSocket for real-time updates
     *
     * @private
     */
    setupWebSocket() {
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: this.config.corsOrigins,
                credentials: true
            }
        });
        // Authentication middleware for Socket.IO
        this.io.use((socket, next) => {
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
            }
            catch (err) {
                next(new Error('Authentication error'));
            }
        });
        // Socket connection handler
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.user.id}`);
            // Join user-specific room
            socket.join(`user:${socket.user.id}`);
            // Join recommendation rooms based on subscription
            socket.on('subscribe:recommendations', (data) => {
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
    async initialize() {
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
    async start() {
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
    async stop() {
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
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
    getApp() {
        return this.app;
    }
    /**
     * Get the HTTP server instance
     *
     * @returns HTTP server
     */
    getServer() {
        return this.server;
    }
    /**
     * Get the Socket.IO server instance
     *
     * @returns Socket.IO server
     */
    getIo() {
        return this.io;
    }
    /**
     * Emit an event to all subscribed clients
     *
     * @param event Event name
     * @param data Event data
     */
    emit(event, data) {
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
    emitToRoom(room, event, data) {
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
    emitToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }
}
exports.ApiServer = ApiServer;
/**
 * Create and export a default API server instance
 *
 * @param adapter Chain adapter for blockchain interactions
 * @param storage Storage provider for off-chain content
 * @param config Server configuration
 * @returns API server instance
 */
function createApiServer(adapter, storage, config) {
    return new ApiServer(adapter, storage, config);
}
exports.default = createApiServer;
//# sourceMappingURL=index.js.map