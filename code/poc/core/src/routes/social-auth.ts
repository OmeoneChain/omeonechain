// File: code/poc/core/src/routes/social-auth.ts
// OAuth authentication routes for Google, Instagram, Apple, and Twitter
// Converted from Prisma to Supabase

import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { createClient } from '../lib/supabase';

const router = express.Router();
const supabase = createClient();

// Environment variables needed (add to .env file):
// GOOGLE_CLIENT_ID=your_google_client_id
// GOOGLE_CLIENT_SECRET=your_google_client_secret
// INSTAGRAM_CLIENT_ID=your_instagram_client_id
// INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
// APPLE_CLIENT_ID=your_apple_client_id
// APPLE_CLIENT_SECRET=your_apple_client_secret (or private key)
// TWITTER_CLIENT_ID=your_twitter_client_id
// TWITTER_CLIENT_SECRET=your_twitter_client_secret
// OAUTH_REDIRECT_BASE_URL=http://localhost:3001 (or your production URL)
// FRONTEND_URL=http://localhost:3000
// JWT_SECRET=your_jwt_secret
// SUPABASE_URL=your_supabase_url
// SUPABASE_ANON_KEY=your_supabase_anon_key

const OAUTH_REDIRECT_BASE = process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==========================================
// GOOGLE OAUTH
// ==========================================

// Test endpoint to verify routes are loaded
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Social auth routes are working!' });
});

/**
 * Initiate Google OAuth flow
 * GET /api/auth/social/google
 */
router.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/google/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});

/**
 * Google OAuth callback
 * GET /api/auth/social/google/callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  console.log('🔵 Google callback received');
  console.log('🔍 Query params:', req.query);

  const { code, error } = req.query;

  if (error) {
    console.error('❌ OAuth error from Google:', error);
    return res.redirect(`${FRONTEND_URL}#auth_error=${error}`);
  }

  if (!code) {
    console.error('❌ No code received from Google');
    return res.redirect(`${FRONTEND_URL}#auth_error=no_code`);
  }

  console.log('✅ Code received, exchanging for token...');

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/google/callback`;

    console.log('🔑 Client ID:', clientId ? 'Set' : 'Missing');
    console.log('🔑 Client Secret:', clientSecret ? 'Set' : 'Missing');
    console.log('🔗 Redirect URI:', redirectUri);

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenResponse.json();
    console.log('📨 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      throw new Error(tokenData.error || 'Failed to exchange code');
    }

    console.log('✅ Access token received');

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo: any = await userInfoResponse.json();
    console.log('👤 User info received:', userInfo.email);

    // Create or find user in your database
    const user = await findOrCreateUserFromGoogle(userInfo);
    console.log('✅ User found/created:', user.id);

    // Generate JWT token
    console.log('🔐 Generating JWT token...');
    console.log('🔐 JWT_SECRET exists:', !!JWT_SECRET);
    console.log('🔐 JWT_SECRET length:', JWT_SECRET.length);
    
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        accountTier: user.account_tier,
        authMethod: 'google',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ JWT token generated (first 20 chars):', jwtToken.substring(0, 20));
    console.log('🔍 FRONTEND_URL:', FRONTEND_URL);
    console.log('🚀 About to redirect to:', `${FRONTEND_URL}#auth_token=${jwtToken.substring(0, 30)}...&auth_success=true`);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}#auth_token=${jwtToken}&auth_success=true`);

    console.log('✅ Redirect command executed');

  } catch (error: any) {
    console.error('❌❌❌ CRITICAL ERROR in OAuth callback:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = encodeURIComponent(error.message || 'Unknown error');
    console.log('🔴 Redirecting to frontend with error:', errorMessage);
    res.redirect(`${FRONTEND_URL}#auth_error=${errorMessage}`);
  }
});

// ==========================================
// INSTAGRAM OAUTH
// ==========================================

/**
 * Initiate Instagram OAuth flow
 * GET /api/auth/social/instagram
 */
router.get('/instagram', (req: Request, res: Response) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/instagram/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Instagram OAuth not configured' });
  }

  const authUrl = `https://api.instagram.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=user_profile,user_media&` +
    `response_type=code`;

  res.redirect(authUrl);
});

/**
 * Instagram OAuth callback
 * GET /api/auth/social/instagram/callback
 */
router.get('/instagram/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}#auth_error=${error}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}#auth_error=no_code`);
  }

  try {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/instagram/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code as string,
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_message || 'Failed to exchange code');
    }

    // Get user info
    const userInfoResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${tokenData.access_token}`
    );

    const userInfo: any = await userInfoResponse.json();

    // Create or find user in your database
    const user = await findOrCreateUserFromInstagram(userInfo, tokenData.user_id);

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        accountTier: user.account_tier,
        authMethod: 'instagram',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}#auth_token=${jwtToken}&auth_success=true`);
  } catch (error: any) {
    console.error('Instagram OAuth error:', error);
    res.redirect(`${FRONTEND_URL}#auth_error=${encodeURIComponent(error.message)}`);
  }
});

// ==========================================
// APPLE OAUTH (Sign in with Apple)
// ==========================================

/**
 * Initiate Apple OAuth flow
 * GET /api/auth/social/apple
 */
router.get('/apple', (req: Request, res: Response) => {
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/apple/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Apple OAuth not configured' });
  }

  const authUrl = `https://appleid.apple.com/auth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=email name&` +
    `response_mode=form_post`;

  res.redirect(authUrl);
});

/**
 * Apple OAuth callback (POST endpoint)
 * POST /api/auth/social/apple/callback
 */
router.post('/apple/callback', async (req: Request, res: Response) => {
  const { code, error, user: userJson } = req.body;

  if (error) {
    return res.redirect(`${FRONTEND_URL}#auth_error=${error}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}#auth_error=no_code`);
  }

  try {
    // Parse user data if provided (only on first sign-in)
    let userData = null;
    if (userJson) {
      try {
        userData = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
      } catch (e) {
        console.warn('Failed to parse Apple user data:', e);
      }
    }

    // Create or find user in your database
    const user = await findOrCreateUserFromApple(userData, code);

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        accountTier: user.account_tier,
        authMethod: 'apple',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}#auth_token=${jwtToken}&auth_success=true`);
  } catch (error: any) {
    console.error('Apple OAuth error:', error);
    res.redirect(`${FRONTEND_URL}#auth_error=${encodeURIComponent(error.message)}`);
  }
});

// ==========================================
// TWITTER OAUTH
// ==========================================

/**
 * Initiate Twitter OAuth flow
 * GET /api/auth/social/twitter
 */
router.get('/twitter', (req: Request, res: Response) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/twitter/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }

  // Generate code verifier and challenge for PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store code verifier in session (or use state parameter)
  // For simplicity, we'll use a temporary in-memory store
  temporaryStore.set('twitter_code_verifier', codeVerifier);

  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('tweet.read users.read')}&` +
    `state=random_state_string&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`;

  res.redirect(authUrl);
});

/**
 * Twitter OAuth callback
 * GET /api/auth/social/twitter/callback
 */
router.get('/twitter/callback', async (req: Request, res: Response) => {
  const { code, error, state } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}#auth_error=${error}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}#auth_error=no_code`);
  }

  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = `${OAUTH_REDIRECT_BASE}/api/auth/social/twitter/callback`;
    const codeVerifier = temporaryStore.get('twitter_code_verifier');

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error || 'Failed to exchange code');
    }

    // Get user info
    const userInfoResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo: any = await userInfoResponse.json();

    // Create or find user in your database
    const user = await findOrCreateUserFromTwitter(userInfo.data);

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        accountTier: user.account_tier,
        authMethod: 'twitter',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}#auth_token=${jwtToken}&auth_success=true`);
  } catch (error: any) {
    console.error('Twitter OAuth error:', error);
    res.redirect(`${FRONTEND_URL}#auth_error=${encodeURIComponent(error.message)}`);
  }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Temporary in-memory store (use Redis in production)
const temporaryStore = new Map<string, any>();

function generateCodeVerifier(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => String.fromCharCode(b))
    .join('')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 43);
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ==========================================
// DATABASE HELPER FUNCTIONS - SUPABASE VERSION
// (Converted from Prisma to Supabase)
// ==========================================

async function findOrCreateUserFromGoogle(googleUser: any) {
  try {
    console.log('🔍 Finding or creating Google user:', googleUser.email);

    // Try to find existing user by Google ID
    const { data: existingByGoogleId, error: findByGoogleError } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleUser.id)
      .single();

    if (findByGoogleError && findByGoogleError.code !== 'PGRST116') {
      console.error('Error finding user by Google ID:', findByGoogleError);
      throw new Error('Database error finding user');
    }

    if (existingByGoogleId) {
      console.log('✅ Found existing user by Google ID:', existingByGoogleId.id);
      return existingByGoogleId;
    }

    // Try to find by email
    const { data: existingByEmail, error: findByEmailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single();

    if (findByEmailError && findByEmailError.code !== 'PGRST116') {
      console.error('Error finding user by email:', findByEmailError);
      throw new Error('Database error finding user');
    }

    if (existingByEmail) {
      // Update existing user with Google ID
      console.log('📝 Updating existing user with Google ID');
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          google_id: googleUser.id,
          profile_picture: googleUser.picture,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingByEmail.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw new Error('Failed to update user');
      }

      return updatedUser;
    }

    // Create new user
    console.log('✨ Creating new Google user');
    const username = googleUser.email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: googleUser.email,
        display_name: googleUser.name,
        username: username,
        google_id: googleUser.id,
        auth_method: 'google',
        account_tier: 'email_basic',
        profile_picture: googleUser.picture,
        email_verified: true,
        pending_token_claims: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error('Failed to create user');
    }

    console.log('✅ Created new user:', newUser.id);
    return newUser;

  } catch (error) {
    console.error('findOrCreateUserFromGoogle error:', error);
    throw error;
  }
}

async function findOrCreateUserFromInstagram(instagramUser: any, userId: string) {
  try {
    console.log('🔍 Finding or creating Instagram user:', instagramUser.username);

    // Try to find existing user by Instagram ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('instagram_id', userId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user by Instagram ID:', findError);
      throw new Error('Database error finding user');
    }

    if (existingUser) {
      console.log('✅ Found existing Instagram user:', existingUser.id);
      return existingUser;
    }

    // Create new user
    console.log('✨ Creating new Instagram user');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username: instagramUser.username,
        display_name: instagramUser.username,
        instagram_id: userId,
        auth_method: 'instagram',
        account_tier: 'email_basic',
        pending_token_claims: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating Instagram user:', createError);
      throw new Error('Failed to create user');
    }

    console.log('✅ Created new Instagram user:', newUser.id);
    return newUser;

  } catch (error) {
    console.error('findOrCreateUserFromInstagram error:', error);
    throw error;
  }
}

async function findOrCreateUserFromApple(appleUser: any, code: string) {
  try {
    console.log('🔍 Finding or creating Apple user');
    
    // Apple OAuth is more complex - requires validating ID token
    // For now, create a placeholder implementation
    
    // Extract Apple user ID from code or ID token (simplified)
    const appleId = code.substring(0, 20); // Placeholder - in production, extract from ID token
    
    // Try to find existing user by Apple ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('apple_id', appleId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user by Apple ID:', findError);
      throw new Error('Database error finding user');
    }

    if (existingUser) {
      console.log('✅ Found existing Apple user:', existingUser.id);
      return existingUser;
    }

    // Create new user
    console.log('✨ Creating new Apple user');
    const email = appleUser?.email || `apple_${appleId}@temp.com`;
    const displayName = appleUser?.name?.firstName || 'Apple User';
    const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email,
        display_name: displayName,
        username: username,
        apple_id: appleId,
        auth_method: 'apple',
        account_tier: 'email_basic',
        email_verified: appleUser?.email ? true : false,
        pending_token_claims: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating Apple user:', createError);
      throw new Error('Failed to create user');
    }

    console.log('✅ Created new Apple user:', newUser.id);
    return newUser;

  } catch (error) {
    console.error('findOrCreateUserFromApple error:', error);
    throw error;
  }
}

async function findOrCreateUserFromTwitter(twitterUser: any) {
  try {
    console.log('🔍 Finding or creating Twitter user:', twitterUser.username);

    // Try to find existing user by Twitter ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('twitter_id', twitterUser.id)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user by Twitter ID:', findError);
      throw new Error('Database error finding user');
    }

    if (existingUser) {
      console.log('✅ Found existing Twitter user:', existingUser.id);
      return existingUser;
    }

    // Create new user
    console.log('✨ Creating new Twitter user');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username: twitterUser.username,
        display_name: twitterUser.name,
        twitter_id: twitterUser.id,
        auth_method: 'twitter',
        account_tier: 'email_basic',
        pending_token_claims: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating Twitter user:', createError);
      throw new Error('Failed to create user');
    }

    console.log('✅ Created new Twitter user:', newUser.id);
    return newUser;

  } catch (error) {
    console.error('findOrCreateUserFromTwitter error:', error);
    throw error;
  }
}

export default router;