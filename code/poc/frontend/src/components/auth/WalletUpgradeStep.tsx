// File: code/poc/frontend/src/components/auth/WalletUpgradeStep.tsx
// Wallet upgrade step - connects wallet to existing phone-verified account
// This is Step 2 (optional) after phone verification

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, Loader2, AlertCircle, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { WalletManager, AuthAPI } from '@/lib/auth';

interface WalletUpgradeStepProps {
  authToken: string;
  user: any;
  onSuccess: (token: string, user: any) => void;
  onSkip: () => void;
}

type WalletStep = 'connect' | 'signing' | 'upgrading';

const WalletUpgradeStep: React.FC<WalletUpgradeStepProps> = ({
  authToken,
  user,
  onSuccess,
  onSkip
}) => {
  const t = useTranslations('auth');
  
  const [step, setStep] = useState<WalletStep>('connect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Check if MetaMask is available
  const isMetaMaskAvailable = WalletManager.isMetaMaskAvailable();

  // Listen for account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Account changed:', accounts);
      if (accounts.length === 0) {
        setConnectedAddress(null);
        setError(t('walletUpgrade.disconnected') || 'Wallet disconnected');
      } else if (accounts[0].toLowerCase() !== connectedAddress?.toLowerCase()) {
        setConnectedAddress(accounts[0]);
        setError(null);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [connectedAddress, t]);

  // Handle wallet connection and upgrade
  const handleConnectWallet = async () => {
    setLoading(true);
    setError(null);
    setStep('connect');

    try {
      // Step 1: Check MetaMask
      if (!isMetaMaskAvailable) {
        throw new Error(t('walletUpgrade.errors.noMetaMask') || 'MetaMask not found. Please install the browser extension.');
      }

      console.log('🔌 Connecting to MetaMask...');
      toast.loading(t('walletUpgrade.connecting') || 'Connecting wallet...', { id: 'wallet-upgrade' });

      // Step 2: Connect wallet
      const walletInfo = await WalletManager.connectMetaMask();
      
      if (!walletInfo?.address) {
        throw new Error(t('walletUpgrade.errors.connectionFailed') || 'Failed to connect wallet');
      }

      setConnectedAddress(walletInfo.address);
      console.log('✅ Wallet connected:', walletInfo.address);

      // Step 3: Get challenge for signature
      setStep('signing');
      toast.loading(t('walletUpgrade.signing') || 'Please sign the message...', { id: 'wallet-upgrade' });

      const challengeResponse = await fetch(`${API_URL}/api/auth/wallet/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          walletAddress: walletInfo.address,
        }),
      });

      const challengeData = await challengeResponse.json();
      
      if (!challengeResponse.ok) {
        throw new Error(challengeData.error || 'Failed to get challenge');
      }

      // Step 4: Sign the challenge
      const signature = await WalletManager.signMessage(challengeData.challenge, walletInfo.address);
      
      if (!signature) {
        throw new Error(t('walletUpgrade.errors.signatureFailed') || 'Failed to sign message');
      }

      // Step 5: Upgrade account
      setStep('upgrading');
      toast.loading(t('walletUpgrade.upgrading') || 'Linking wallet to your account...', { id: 'wallet-upgrade' });

      const upgradeResponse = await fetch(`${API_URL}/api/auth/upgrade-to-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          walletAddress: walletInfo.address,
          signature,
          challenge: challengeData.challenge,
          timestamp: challengeData.timestamp,
          nonce: challengeData.nonce,
        }),
      });

      const upgradeData = await upgradeResponse.json();

      if (!upgradeResponse.ok) {
        throw new Error(upgradeData.error || 'Failed to upgrade account');
      }

      console.log('✅ Account upgraded successfully');
      toast.success(t('walletUpgrade.success') || 'Wallet connected!', { id: 'wallet-upgrade' });

      // Call success handler with new token and user data
      onSuccess(upgradeData.token, upgradeData.user);

    } catch (err: any) {
      console.error('❌ Wallet upgrade error:', err);
      
      let errorMessage = t('walletUpgrade.errors.generic') || 'Failed to connect wallet';
      
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        errorMessage = t('walletUpgrade.errors.cancelled') || 'Connection cancelled by user';
      } else if (err.message?.includes('MetaMask')) {
        errorMessage = err.message;
      } else if (err.message?.includes('already')) {
        errorMessage = t('walletUpgrade.errors.alreadyLinked') || 'This wallet is already linked to another account';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage, { id: 'wallet-upgrade' });
      setStep('connect');
    } finally {
      setLoading(false);
    }
  };

  // Open MetaMask install page
  const handleInstallMetaMask = () => {
    window.open('https://metamask.io/download/', '_blank');
  };

  // Get step description text
  const getStepText = () => {
    switch (step) {
      case 'connect':
        return t('walletUpgrade.steps.connect') || 'Connect your wallet';
      case 'signing':
        return t('walletUpgrade.steps.signing') || 'Sign the verification message';
      case 'upgrading':
        return t('walletUpgrade.steps.upgrading') || 'Linking wallet to your account';
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('walletUpgrade.connectTitle') || 'Connect Your Wallet'}
        </h2>
        <p className="text-gray-600">
          {t('walletUpgrade.connectSubtitle') || 'Link a wallet to unlock full Web3 features'}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('already linked') && (
              <p className="text-xs text-red-600 mt-1">
                {t('walletUpgrade.errors.alreadyLinkedHint') || 'Please use a different wallet or contact support.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Connected address indicator */}
      {connectedAddress && !loading && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-green-800 font-medium">
              {t('walletUpgrade.connected') || 'Wallet connected'}
            </p>
            <p className="text-xs text-green-600 truncate">
              {connectedAddress}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      {!isMetaMaskAvailable ? (
        // MetaMask not installed
        <div className="text-center">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              {t('walletUpgrade.noMetaMask') || 'MetaMask is required to connect a wallet'}
            </p>
            <p className="text-xs text-yellow-700">
              {t('walletUpgrade.installNote') || 'Install the browser extension to continue'}
            </p>
          </div>
          
          <button
            onClick={handleInstallMetaMask}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            {t('walletUpgrade.installMetaMask') || 'Install MetaMask'}
          </button>
        </div>
      ) : (
        // MetaMask available
        <div>
          <button
            onClick={handleConnectWallet}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {getStepText()}
              </>
            ) : (
              <>
                {/* MetaMask Fox Icon */}
                <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M36.0112 3.33337L22.1207 13.6277L24.7012 7.56091L36.0112 3.33337Z" fill="#E17726"/>
                  <path d="M3.99609 3.33337L17.7891 13.7238L15.2988 7.56091L3.99609 3.33337Z" fill="#E27625"/>
                  <path d="M31.0468 27.2023L27.5765 32.4969L35.2617 34.6105L37.4676 27.3194L31.0468 27.2023Z" fill="#E27625"/>
                  <path d="M2.53906 27.3194L4.73828 34.6105L12.4168 32.4969L8.95312 27.2023L2.53906 27.3194Z" fill="#E27625"/>
                </svg>
                {t('walletUpgrade.connectMetaMask') || 'Connect MetaMask'}
              </>
            )}
          </button>

          {/* Loading state indicator */}
          {loading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{getStepText()}</span>
              </div>
              {step === 'signing' && (
                <p className="text-xs text-blue-600 mt-2">
                  {t('walletUpgrade.checkExtension') || 'Check your MetaMask extension for the signature request'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Other wallet options (coming soon) */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center mb-3">
          {t('walletUpgrade.moreOptions') || 'More wallet options coming soon'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            WalletConnect
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            Coinbase
          </button>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        disabled={loading}
        className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('walletUpgrade.skipForNow') || 'Skip for now'}
      </button>

      {/* Security note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          🔒 <strong>{t('walletUpgrade.security.title') || 'Secure Connection'}</strong>{' '}
          {t('walletUpgrade.security.description') || 'We only request a signature to verify you own this wallet. We never have access to your funds or private keys.'}
        </p>
      </div>
    </div>
  );
};

export default WalletUpgradeStep;