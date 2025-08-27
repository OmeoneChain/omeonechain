"use strict";
// File: code/poc/core/src/utils/jwt.ts
// JWT utilities for session management
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = exports.SignatureUtils = exports.JWTUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
// In-memory challenge storage (replace with Redis/database in production)
const challengeStore = new Map();
// Clean up expired challenges every 5 minutes
setInterval(() => {
    const now = new Date();
    for (const [key, challenge] of challengeStore.entries()) {
        if (challenge.expires_at < now) {
            challengeStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
class JWTUtils {
    // Generate JWT token
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }
    // Generate refresh token
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        });
    }
    // Verify JWT token
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    // Extract token from Authorization header
    static extractTokenFromHeader(authHeader) {
        if (!authHeader)
            return null;
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
    // Generate authentication challenge
    static generateChallenge(address) {
        const challenge = crypto_1.default.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Store challenge
        challengeStore.set(challenge, {
            challenge,
            address: address.toLowerCase(),
            expires_at,
            used: false,
        });
        return { challenge, expires_at };
    }
    // Verify challenge
    static verifyChallenge(challenge, address) {
        const storedChallenge = challengeStore.get(challenge);
        if (!storedChallenge) {
            return false;
        }
        // Check if challenge is expired
        if (storedChallenge.expires_at < new Date()) {
            challengeStore.delete(challenge);
            return false;
        }
        // Check if challenge is already used
        if (storedChallenge.used) {
            return false;
        }
        // Check if address matches
        if (storedChallenge.address !== address.toLowerCase()) {
            return false;
        }
        // Mark challenge as used
        storedChallenge.used = true;
        return true;
    }
    // Create authentication message for signing
    static createAuthMessage(challenge, address) {
        return `Welcome to OmeoneChain!\n\nPlease sign this message to authenticate your wallet.\n\nChallenge: ${challenge}\nWallet: ${address}\n\nThis request will not trigger any blockchain transaction or cost any gas fees.`;
    }
}
exports.JWTUtils = JWTUtils;
// Signature verification utility
class SignatureUtils {
    // Verify Ethereum signature
    static verifyEthereumSignature(message, signature, address) {
        try {
            const ethUtil = require('ethereumjs-util');
            const msgHash = ethUtil.hashPersonalMessage(Buffer.from(message));
            const msgParams = ethUtil.fromRpcSig(signature);
            const publicKey = ethUtil.ecrecover(msgHash, msgParams.v, msgParams.r, msgParams.s);
            const recoveredAddress = ethUtil.publicToAddress(publicKey).toString('hex');
            return recoveredAddress.toLowerCase() === address.toLowerCase().replace('0x', '');
        }
        catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
    // Alternative signature verification using web3
    static async verifyWeb3Signature(message, signature, address) {
        try {
            const { Web3 } = require('web3');
            const web3 = new Web3();
            const recoveredAddress = web3.eth.accounts.recover(message, signature);
            return recoveredAddress.toLowerCase() === address.toLowerCase();
        }
        catch (error) {
            console.error('Web3 signature verification error:', error);
            return false;
        }
    }
}
exports.SignatureUtils = SignatureUtils;
// In-memory user storage (replace with database in production)
const userStore = new Map();
class UserManager {
    // Find user by address
    static findByAddress(address) {
        const normalizedAddress = address.toLowerCase();
        for (const user of userStore.values()) {
            if (user.address === normalizedAddress) {
                return user;
            }
        }
        return null;
    }
    // Find user by ID
    static findById(id) {
        return userStore.get(id) || null;
    }
    // Create new user
    static createUser(address) {
        const id = crypto_1.default.randomUUID();
        const now = new Date();
        const user = {
            id,
            address: address.toLowerCase(),
            username: `user_${id.slice(0, 8)}`,
            display_name: `User ${id.slice(0, 8)}`,
            avatar_url: null,
            verification_status: 'basic',
            created_at: now,
            updated_at: now,
        };
        userStore.set(id, user);
        return user;
    }
    // Update user
    static updateUser(id, updates) {
        const user = userStore.get(id);
        if (!user)
            return null;
        const updatedUser = {
            ...user,
            ...updates,
            id: user.id, // Prevent ID changes
            address: user.address, // Prevent address changes
            created_at: user.created_at, // Prevent creation date changes
            updated_at: new Date(),
        };
        userStore.set(id, updatedUser);
        return updatedUser;
    }
    // Get user stats (mock data)
    static getUserStats(userId) {
        return {
            followers_count: Math.floor(Math.random() * 500) + 10,
            following_count: Math.floor(Math.random() * 300) + 5,
            recommendations_count: Math.floor(Math.random() * 100) + 1,
            avg_trust_score: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        };
    }
}
exports.UserManager = UserManager;
//# sourceMappingURL=jwt.js.map