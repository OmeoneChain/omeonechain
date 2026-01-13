// File: code/poc/frontend/src/components/auth/AuthModal.tsx
// UPDATED: Wallet-only authentication for web (Jan 2026)
// Email auth disabled - mobile app uses phone auth, web uses wallet connect

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { WalletManager, AuthAPI, AuthStorage } from '../../../lib/auth';

interface AuthModalProps {
  onSuccess?: (token: string, user: any) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  onSuccess, 
  onClose
}) => {
  const t = useTranslations('auth');
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if MetaMask is available
      if (!WalletManager.isMetaMaskAvailable()) {
        setError(t('errors.walletNotFound') || 'MetaMask not found. Please install the MetaMask browser extension.');
        return;
      }

      console.log('🔌 Connecting to MetaMask...');
      
      // Connect wallet
      const walletInfo = await WalletManager.connectMetaMask();
      console.log('✅ Wallet connected:', walletInfo.address);

      // Get challenge from backend
      console.log('🔐 Getting auth challenge...');
      const { challenge, timestamp, nonce } = await AuthAPI.getAuthChallenge(walletInfo.address);

      // Sign the challenge
      console.log('✍️ Signing challenge...');
      const signature = await WalletManager.signMessage(challenge, walletInfo.address);

      // Verify signature and get token
      console.log('🔐 Verifying signature...');
      const { token, user } = await AuthAPI.verifySignature(
        walletInfo.address,
        signature,
        challenge,
        timestamp,
        nonce
      );

      // Store auth data
      AuthStorage.saveToken(token);
      AuthStorage.saveUser(user);

      console.log('✅ Authentication successful:', user);

      if (onSuccess) {
        onSuccess(token, user);
      }

      // Redirect based on onboarding status
      if (user.isNewUser || !user.onboarding_completed) {
        router.push('/onboarding');
      } else {
        router.push('/feed');
      }

      if (onClose) {
        onClose();
      }

    } catch (err: any) {
      console.error('❌ Wallet connection error:', err);
      setError(err.message || t('errors.connectionFailed') || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('wallet.title') || 'Connect Wallet'}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('wallet.subtitle') || 'Connect your wallet to access BocaBoca'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Wallet Connect Button */}
        <button
          onClick={handleWalletConnect}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('wallet.connecting') || 'Connecting...'}
            </span>
          ) : (
            <>
              {/* MetaMask Fox Icon */}
              <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M36.0112 3.33337L22.1207 13.6277L24.7012 7.56091L36.0112 3.33337Z" fill="#E17726"/>
                <path d="M3.99609 3.33337L17.7891 13.7238L15.2988 7.56091L3.99609 3.33337Z" fill="#E27625"/>
                <path d="M31.0468 27.2023L27.5765 32.4969L35.2617 34.6105L37.4676 27.3194L31.0468 27.2023Z" fill="#E27625"/>
                <path d="M2.53906 27.3194L4.73828 34.6105L12.4168 32.4969L8.95312 27.2023L2.53906 27.3194Z" fill="#E27625"/>
                <path d="M12.0547 17.5576L9.93945 20.7484L17.5625 21.0928L17.3086 12.8369L12.0547 17.5576Z" fill="#E27625"/>
                <path d="M27.9453 17.5576L22.6172 12.7407L22.4375 21.0928L30.0605 20.7484L27.9453 17.5576Z" fill="#E27625"/>
                <path d="M12.418 32.4968L17.1094 30.2661L13.0625 27.3623L12.418 32.4968Z" fill="#E27625"/>
                <path d="M22.8906 30.2661L27.582 32.4968L26.9375 27.3623L22.8906 30.2661Z" fill="#E27625"/>
              </svg>
              {t('wallet.connectMetaMask') || 'Connect with MetaMask'}
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              {t('wallet.orBrowse') || 'or'}
            </span>
          </div>
        </div>

        {/* Browse Read-Only Option */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          {t('wallet.browseOnly') || 'Continue Browsing'}
        </button>

        {/* Mobile App Prompt */}
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">
                {t('wallet.mobilePrompt.title') || 'Get the Mobile App'}
              </h4>
              <p className="text-sm text-orange-800">
                {t('wallet.mobilePrompt.description') || 'For the full BocaBoca experience with photo sharing and rewards, download our mobile app.'}
              </p>
            </div>
          </div>
        </div>

        {/* What is a wallet? Help link */}
        <div className="mt-4 text-center">
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            {t('wallet.whatIsWallet') || "Don't have a wallet? Learn more →"}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;