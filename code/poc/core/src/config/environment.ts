// code/poc/core/src/config/environment.ts
// Centralized environment configuration with validation

import { AppConfig, DatabaseConfig, RedisConfig, IpfsConfig, ChainConfig } from '../types';

export class EnvironmentConfig {
  static load(): AppConfig {
    // Load and validate environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'IOTA_RPC_URL',
      'JWT_SECRET'
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      env: this.getEnv(),
      port: this.getPort(),
      database: this.getDatabaseConfig(),
      redis: this.getRedisConfig(),
      ipfs: this.getIpfsConfig(),
      chain: this.getChainConfig(),
      jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      },
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: process.env.CORS_CREDENTIALS === 'true'
      }
    };
  }

  private static getEnv(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV;
    if (env === 'production' || env === 'staging' || env === 'development') {
      return env;
    }
    return 'development';
  }

  private static getPort(): number {
    const port = process.env.PORT;
    if (!port) return 3001;
    const parsed = parseInt(port, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('PORT must be a valid port number');
    }
    return parsed;
  }

  private static getDatabaseConfig(): DatabaseConfig {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }

    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 5432,
        database: parsed.pathname.slice(1),
        username: parsed.username,
        password: parsed.password,
        ssl: process.env.DATABASE_SSL === 'true',
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10')
      };
    } catch (error) {
      throw new Error('Invalid DATABASE_URL format');
    }
  }

  private static getRedisConfig(): RedisConfig {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is required');
    }

    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 6379,
        password: parsed.password || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'omeone:'
      };
    } catch (error) {
      throw new Error('Invalid REDIS_URL format');
    }
  }

  private static getIpfsConfig(): IpfsConfig {
    return {
      url: process.env.IPFS_URL || 'http://localhost:5001',
      timeout: parseInt(process.env.IPFS_TIMEOUT || '30000'),
      headers: process.env.IPFS_HEADERS ? JSON.parse(process.env.IPFS_HEADERS) : undefined
    };
  }

  private static getChainConfig(): ChainConfig {
    return {
      networkId: process.env.IOTA_NETWORK_ID || 'testnet',
      rpcUrl: process.env.IOTA_RPC_URL!,
      indexerUrl: process.env.IOTA_INDEXER_URL,
      explorerUrl: process.env.IOTA_EXPLORER_URL,
      gasPrice: parseInt(process.env.IOTA_GAS_PRICE || '1000'),
      gasLimit: parseInt(process.env.IOTA_GAS_LIMIT || '100000')
    };
  }

  // Helper method to check if we're in development
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  // Helper method to check if we're in production
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  // Helper method to get blockchain private key (development only)
  static getPrivateKey(): string | undefined {
    if (this.isProduction()) {
      return undefined; // Never expose private keys in production
    }
    return process.env.IOTA_PRIVATE_KEY;
  }
}