// File: code/poc/frontend/components/auth/AppleSignIn.tsx
// Apple Sign-in button - stub for future implementation
// Required by Apple for App Store approval if offering any third-party login

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

interface AppleSignInProps {
  onSuccess: (appleUser: AppleUserData) => void;
  onError: (error: Error) => void;
  mode?: 'signup' | 'login';
  disabled?: boolean;
}

export interface AppleUserData {
  appleId: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  identityToken: string;
  authorizationCode: string;
}

export default function AppleSignIn({
  onSuccess,
  onError,
  mode = 'signup',
  disabled = false
}: AppleSignInProps) {
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Check if running in native iOS context (Capacitor)
      const isNative = typeof window !== 'undefined' && 
        (window as any).Capacitor?.isNativePlatform?.();
      
      if (isNative) {
        // Native iOS Sign in with Apple
        // This will be implemented when Apple Developer account is set up
        // Uses @capacitor-community/apple-sign-in plugin
        
        // TODO: Implement native Sign in with Apple
        // const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        // const result = await SignInWithApple.authorize({
        //   clientId: 'com.bocaboca.app',
        //   redirectURI: 'https://bocaboca.xyz/callback/apple',
        //   scopes: 'email name',
        // });
        
        throw new Error('Apple Sign-in not yet configured. Please use phone verification.');
        
      } else {
        // Web-based Sign in with Apple (uses Apple JS SDK)
        // This requires Apple Developer account configuration
        
        // TODO: Implement web Sign in with Apple
        // AppleID.auth.init({
        //   clientId: 'com.bocaboca.app.web',
        //   scope: 'name email',
        //   redirectURI: 'https://bocaboca.xyz/callback/apple',
        //   usePopup: true
        // });
        // const result = await AppleID.auth.signIn();
        
        throw new Error('Apple Sign-in not yet configured. Please use phone verification.');
      }
      
    } catch (error: any) {
      console.error('Apple Sign-in error:', error);
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = mode === 'signup' 
    ? (t('appleSignIn.continueWith') || 'Continuar com Apple')
    : (t('appleSignIn.signInWith') || 'Entrar com Apple');

  return (
    <button
      onClick={handleAppleSignIn}
      disabled={disabled || isLoading}
      className="w-full py-4 bg-black hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
      aria-label={buttonText}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {/* Apple Logo SVG */}
          <svg 
            className="w-5 h-5" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          {buttonText}
        </>
      )}
    </button>
  );
}

/**
 * IMPLEMENTATION NOTES FOR FUTURE:
 * 
 * 1. Apple Developer Account Requirements:
 *    - Enroll in Apple Developer Program ($99/year)
 *    - Configure Sign in with Apple capability
 *    - Create Services ID for web authentication
 *    - Generate and configure keys
 * 
 * 2. Capacitor Plugin (for native iOS):
 *    npm install @capacitor-community/apple-sign-in
 *    npx cap sync
 * 
 * 3. Backend Requirements:
 *    - Endpoint to verify Apple identity token
 *    - Handle user creation/linking with apple_id
 *    - Store refresh tokens securely
 * 
 * 4. Configuration needed:
 *    - APPLE_CLIENT_ID (Services ID)
 *    - APPLE_TEAM_ID
 *    - APPLE_KEY_ID
 *    - APPLE_PRIVATE_KEY
 * 
 * 5. App Store Requirement:
 *    - If app offers ANY third-party login (Google, Facebook, etc.),
 *      Apple Sign-in MUST also be offered
 *    - This is an App Store Review guideline
 */
