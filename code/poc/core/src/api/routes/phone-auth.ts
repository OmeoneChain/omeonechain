/**
 * Phone Authentication Routes
 * File: code/poc/core/src/api/routes/phone-auth.ts
 * 
 * Handles phone number verification for the two-tier auth system.
 * Users can sign up/login with phone number, or add phone to existing account.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendVerificationCode, formatPhoneNumber, isValidPhoneNumber } from '../../services/sms-service';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration for phone auth');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 🍎 Apple Review test account (bypasses SMS verification)
const APPLE_REVIEW_PHONE = '+5511999999999';
const APPLE_REVIEW_CODE = '123456';

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate JWT token for authenticated user
 */
function generateToken(user: any): string {
  return jwt.sign(
    {
      userId: user.id,
      phoneNumber: user.phone,
      accountTier: user.account_tier,
      authMethod: user.auth_method
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/phone/request-code
 * Request a verification code for a phone number
 * Can be used for new signup or adding phone to existing account
 */
router.post('/request-code', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    const existingUserId = req.user?.id; // If user is already authenticated
    
    console.log(`📱 Phone verification request: ${countryCode}${phoneNumber}`);
    
    // Validate inputs
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and country code are required'
      });
    }
    
    // Format and validate phone number
    const fullPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    
    if (!isValidPhoneNumber(fullPhoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    // 🍎 Apple Review test account - skip SMS
    if (fullPhoneNumber === APPLE_REVIEW_PHONE) {
      console.log('🍎 Apple Review test account - skipping SMS');
      return res.json({
        success: true,
        message: 'Verification code sent',
        expiresIn: 600,
        phoneNumber: fullPhoneNumber.replace(/(\+\d{2})(\d{2})(\d+)(\d{4})/, '$1 $2 ****** $4')
      });
    }
    
    // Check if phone is already registered to another user
    const { data: existingRegistry } = await supabase
      .from('phone_number_registry')
      .select('user_id')
      .eq('phone_number', fullPhoneNumber)
      .eq('is_active', true)
      .single();
    
    if (existingRegistry && existingRegistry.user_id !== existingUserId) {
      return res.status(409).json({
        success: false,
        error: 'Phone number already registered to another account'
      });
    }
    
    // Check rate limiting (IP-based)
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const { data: rateLimit } = await supabase
      .from('verification_rate_limits')
      .select('*')
      .eq('identifier', clientIP)
      .single();
    
    if (rateLimit) {
      // Check if blocked
      if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date()) {
        const waitMinutes = Math.ceil((new Date(rateLimit.blocked_until).getTime() - Date.now()) / 60000);
        return res.status(429).json({
          success: false,
          error: `Too many attempts. Try again in ${waitMinutes} minutes.`
        });
      }
      
      // Check attempt count in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(rateLimit.first_attempt_at) > oneHourAgo && rateLimit.attempt_count >= 5) {
        // Block for 1 hour
        await supabase
          .from('verification_rate_limits')
          .update({ blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
          .eq('identifier', clientIP);
        
        return res.status(429).json({
          success: false,
          error: 'Too many verification attempts. Try again in 1 hour.'
        });
      }
      
      // Update attempt count
      await supabase
        .from('verification_rate_limits')
        .update({
          attempt_count: rateLimit.attempt_count + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('identifier', clientIP);
    } else {
      // Create rate limit record
      await supabase
        .from('verification_rate_limits')
        .insert({
          identifier: clientIP,
          identifier_type: 'ip',
          attempt_count: 1
        });
    }
    
    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Invalidate any existing codes for this phone number
    await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('phone_number', fullPhoneNumber)
      .eq('verified', false);
    
    // Store new code
    await supabase
      .from('phone_verification_codes')
      .insert({
        user_id: existingUserId || null,
        phone_number: fullPhoneNumber,
        country_code: countryCode,
        code: code,
        expires_at: expiresAt.toISOString()
      });
    
    // Send SMS
    const smsResult = await sendVerificationCode(fullPhoneNumber, code);
    
    if (!smsResult.success) {
      console.error('❌ Failed to send SMS:', smsResult.error);
      return res.status(500).json({
        success: false,
        error: smsResult.error || 'Failed to send verification code'
      });
    }
    
    console.log(`✅ Verification code sent to ${fullPhoneNumber}`);
    
    res.json({
      success: true,
      message: 'Verification code sent',
      expiresIn: 600, // seconds
      phoneNumber: fullPhoneNumber.replace(/(\+\d{2})(\d{2})(\d+)(\d{4})/, '$1 $2 ****** $4') // Masked
    });
    
  } catch (error: any) {
    console.error('❌ Phone verification request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process verification request'
    });
  }
});

/**
 * POST /api/auth/phone/verify
 * Verify code and create/login user
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, countryCode, code } = req.body;
    const existingUserId = req.user?.id;
    
    console.log(`📱 Phone verification attempt: ${countryCode}${phoneNumber}`);
    
    // Validate inputs
    if (!phoneNumber || !countryCode || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, country code, and verification code are required'
      });
    }
    
    const fullPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    
    // 🍎 Apple Review test account - bypass verification
    if (fullPhoneNumber === APPLE_REVIEW_PHONE && code === APPLE_REVIEW_CODE) {
      console.log('🍎 Apple Review test account - bypassing verification');
      
      // Check if test user exists
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('phone', fullPhoneNumber)
        .single();
      
      let isNewUser = false;
      
      if (!user) {
        // Create Apple Review test user
        isNewUser = true;
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            phone: fullPhoneNumber,
            phone_country_code: countryCode,
            phone_verified: true,
            phone_confirmed_at: new Date().toISOString(),
            username: 'applereview',
            display_name: 'Apple Review',
            account_tier: 'verified',
            auth_method: 'phone',
            token_balance: 50,
            tokens_earned: 50,
            reputation_score: 50,
            trust_score: 50
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Failed to create Apple Review user:', createError);
          throw createError;
        }
        user = newUser;
        console.log('✅ Apple Review test user created:', user.id);
      }
      
      const token = generateToken(user);
      
      return res.json({
        success: true,
        message: isNewUser ? 'Account created successfully' : 'Login successful',
        isNewUser,
        token,
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          displayName: user.display_name,
          accountTier: user.account_tier,
          authMethod: user.auth_method,
          tokenBalance: user.token_balance,
          tokensEarned: user.tokens_earned,
          reputationScore: user.reputation_score,
          trustScore: user.trust_score,
          createdAt: user.created_at
        },
        expiresIn: 604800
      });
    }
    
    // Find valid verification code
    const { data: verification, error: verifyError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('phone_number', fullPhoneNumber)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (verifyError || !verification) {
      // Increment attempt counter
      await supabase
        .from('phone_verification_codes')
        .update({ attempts: supabase.rpc('increment_attempts') })
        .eq('phone_number', fullPhoneNumber)
        .eq('verified', false);
      
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }
    
    // Check max attempts on this code
    if (verification.attempts >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Too many attempts. Please request a new code.'
      });
    }
    
    // Mark code as verified
    await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('id', verification.id);
    
    let user;
    let isNewUser = false;
    
    // Check if this phone belongs to an existing user
    const { data: existingUserByPhone } = await supabase
      .from('users')
      .select('*')
      .eq('phone', fullPhoneNumber)
      .single();
    
    if (existingUserByPhone) {
      // Existing user - login
      user = existingUserByPhone;
      console.log(`✅ Existing user login: ${user.id}`);
      
    } else if (existingUserId) {
      // Adding phone to existing authenticated user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          phone: fullPhoneNumber,
          phone_country_code: countryCode,
          phone_verified: true,
          phone_confirmed_at: new Date().toISOString(),
          auth_method: 'phone',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUserId)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      user = updatedUser;
      console.log(`✅ Phone added to existing user: ${user.id}`);
      
    } else {
      // New user - create account
      isNewUser = true;
      const username = `user_${fullPhoneNumber.slice(-6)}_${Date.now().toString(36)}`;
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone: fullPhoneNumber,
          phone_country_code: countryCode,
          phone_verified: true,
          phone_confirmed_at: new Date().toISOString(),
          username: username,
          display_name: 'BocaBoca User',
          account_tier: 'verified',
          auth_method: 'phone',
          token_balance: 0,
          tokens_earned: 0,
          reputation_score: 0,
          trust_score: 0
        })
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      user = newUser;
      console.log(`✅ New user created: ${user.id}`);
    }
    
    // Register phone number to prevent reuse
    await supabase
      .from('phone_number_registry')
      .upsert({
        phone_number: fullPhoneNumber,
        country_code: countryCode,
        user_id: user.id,
        is_active: true
      });
    
    // Clear rate limiting for this IP on successful verification
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    await supabase
      .from('verification_rate_limits')
      .delete()
      .eq('identifier', clientIP);
    
    // Generate JWT token
    const token = generateToken(user);
    
    console.log(`🎯 Phone auth successful for user: ${user.id}`);
    
    res.json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      isNewUser,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        displayName: user.display_name,
        accountTier: user.account_tier,
        authMethod: user.auth_method,
        tokenBalance: user.token_balance,
        tokensEarned: user.tokens_earned,
        reputationScore: user.reputation_score,
        trustScore: user.trust_score,
        createdAt: user.created_at
      },
      expiresIn: 604800 // 7 days in seconds
    });
    
  } catch (error: any) {
    console.error('❌ Phone verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

/**
 * POST /api/auth/phone/resend
 * Resend verification code
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, countryCode } = req.body;
    
    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and country code are required'
      });
    }
    
    const fullPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    
    // 🍎 Apple Review test account - skip resend logic
    if (fullPhoneNumber === APPLE_REVIEW_PHONE) {
      console.log('🍎 Apple Review test account - skipping resend');
      return res.json({
        success: true,
        message: 'New verification code sent',
        expiresIn: 600
      });
    }
    
    // Check if there's a recent code (prevent spam)
    const { data: recentCode } = await supabase
      .from('phone_verification_codes')
      .select('created_at')
      .eq('phone_number', fullPhoneNumber)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentCode) {
      const timeSinceLastCode = Date.now() - new Date(recentCode.created_at).getTime();
      const minWaitTime = 60 * 1000; // 1 minute
      
      if (timeSinceLastCode < minWaitTime) {
        const waitSeconds = Math.ceil((minWaitTime - timeSinceLastCode) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new code`
        });
      }
    }
    
    // Generate and send new code (reuse request-code logic)
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Invalidate existing codes
    await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('phone_number', fullPhoneNumber)
      .eq('verified', false);
    
    // Store new code
    await supabase
      .from('phone_verification_codes')
      .insert({
        phone_number: fullPhoneNumber,
        country_code: countryCode,
        code: code,
        expires_at: expiresAt.toISOString()
      });
    
    // Send SMS
    const smsResult = await sendVerificationCode(fullPhoneNumber, code);
    
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        error: smsResult.error || 'Failed to send verification code'
      });
    }
    
    res.json({
      success: true,
      message: 'New verification code sent',
      expiresIn: 600
    });
    
  } catch (error: any) {
    console.error('❌ Resend code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code'
    });
  }
});

export default router;