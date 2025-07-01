/**
 * OmeoneChain API
 *
 * Main entry point for the OmeoneChain API server
 * Based on Technical Specifications A.4
 */
import express from 'express';
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
 * OmeoneChain API Server
 */
export declare class ApiServer {
    private app;
    private server;
    private io;
    private config;
    private recommendationEngine;
    private reputationEngine;
    private tokenEngine;
    private serviceEngine;
    private governanceEngine;
    /**
     * Create a new API server
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param storage Storage provider for off-chain content
     * @param config Server configuration
     */
    constructor(adapter: ChainAdapter, storage: StorageProvider, config?: ApiServerConfig);
    /**
     * Set up middleware
     *
     * @private
     */
    private setupMiddleware;
    /**
     * Set up API routes
     *
     * @private
     */
    private setupRoutes;
    /**
     * Set up WebSocket for real-time updates
     *
     * @private
     */
    private setupWebSocket;
    /**
     * Initialize the API server
     *
     * @returns Promise resolving when initialized
     */
    initialize(): Promise<void>;
    /**
     * Start the API server
     *
     * @returns Promise resolving when server is started
     */
    start(): Promise<void>;
    /**
     * Stop the API server
     *
     * @returns Promise resolving when server is stopped
     */
    stop(): Promise<void>;
    /**
     * Get the Express app instance
     *
     * @returns Express application
     */
    getApp(): express.Application;
    /**
     * Get the HTTP server instance
     *
     * @returns HTTP server
     */
    getServer(): any;
    /**
     * Get the Socket.IO server instance
     *
     * @returns Socket.IO server
     */
    getIo(): any;
    /**
     * Emit an event to all subscribed clients
     *
     * @param event Event name
     * @param data Event data
     */
    emit(event: string, data: any): void;
    /**
     * Emit an event to a specific room
     *
     * @param room Room name
     * @param event Event name
     * @param data Event data
     */
    emitToRoom(room: string, event: string, data: any): void;
    /**
     * Emit an event to a specific user
     *
     * @param userId User ID
     * @param event Event name
     * @param data Event data
     */
    emitToUser(userId: string, event: string, data: any): void;
}
/**
 * Create and export a default API server instance
 *
 * @param adapter Chain adapter for blockchain interactions
 * @param storage Storage provider for off-chain content
 * @param config Server configuration
 * @returns API server instance
 */
export declare function createApiServer(adapter: ChainAdapter, storage: StorageProvider, config?: ApiServerConfig): ApiServer;
export default createApiServer;
