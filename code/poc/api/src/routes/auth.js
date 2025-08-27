// File: code/poc/api/src/routes/auth.js
// Authentication routes for wallet connection

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();

// In-memory storage for challenges (in production, use Redis or database)
const pendingChallenges = new Map();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

/**
 * GET /api/auth/challenge
 * Generate a challenge for wallet signature verification
 */
router.get('/challenge', (req, res) => {
  try {
    // Generate a random challenge
    const challenge = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const expiresAt = timestamp + (5 * 60 * 1000); // 5 minutes

    // Store challenge temporarily
    pendingChallenges.set(challenge, {
      timestamp,
      expiresAt,
      used: false
    });

    // Clean up expired challenges
    cleanupExpiredChallenges();

    res.json({
      success: true,
      challenge,
      message: 'Sign this challenge with your wallet to authenticate',
      expiresIn: 300 // 5 minutes
    });
  } catch (error) {
    console.error('Error generating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate challenge'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify wallet signature and create session
 */
router.post('/verify', (req, res) => {
  try {
    const { challenge, signature, address, publicKey } = req.body;

    // Validate input
    if (!challenge || !signature || !address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: challenge, signature, address'
      });
    }

    // Check if challenge exists and is valid
    const challengeData = pendingChallenges.get(challenge);
    if (!challengeData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired challenge'
      });
    }

    // Check if challenge is expired
    if (Date.now() > challengeData.expiresAt) {
      pendingChallenges.delete(challenge);
      return res.status(400).json({
        success: false,
        message: 'Challenge expired'
      });
    }

    // Check if challenge was already used
    if (challengeData.used) {
      return res.status(400).json({
        success: false,
        message: 'Challenge already used'
      });
    }

    // Mark challenge as used
    challengeData.used = true;

    // In production, verify the signature here
    // For now, we'll assume the signature is valid if provided
    const isValidSignature = signature && signature.length > 0;

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        address,
        publicKey: publicKey || null,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      JWT_SECRET
    );

    // Clean up used challenge
    pendingChallenges.delete(challenge);

    res.json({
      success: true,
      token,
      user: {
        address,
        publicKey: publicKey || null,
        isAuthenticated: true
      },
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify signature'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info from token
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      address: req.user.address,
      publicKey: req.user.publicKey,
      isAuthenticated: true
    }
  });
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal mainly)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Middleware to authenticate JWT tokens
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Clean up expired challenges periodically
 */
function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [challenge, data] of pendingChallenges.entries()) {
    if (now > data.expiresAt) {
      pendingChallenges.delete(challenge);
    }
  }
}

// Clean up expired challenges every 5 minutes
setInterval(cleanupExpiredChallenges, 5 * 60 * 1000);

module.exports = router;