// code/poc/frontend/components/auth/WalletConnect.tsx
// ENHANCED DEBUG VERSION with comprehensive logging and null safety
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Wallet, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { WalletManager, AuthAPI, createAuthMessage } from '@/lib/auth';

// Helper function to clear all authentication data
const clearAllAuthData = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('omeone_auth_token');
  localStorage.removeItem('omeone_user');
  localStorage.removeItem('omeone_pending_tokens');
  sessionStorage.clear();
  
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log('✅ All auth data cleared');
};

interface WalletConnectProps {
  onSuccess: (token: string, user: any) => void;
  onCancel?: () => void;
  className?: string;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ 
  onSuccess, 
  onCancel, 
  className = '' 
}) => {
  const t = useTranslations();
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'connect' | 'signing' | 'verifying'>('connect');
  const [error, setError] = useState<string | null>(null);

  // Account change detection
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 MetaMask account changed:', accounts);
      
      if (accounts.length === 0) {
        setError(t('auth.walletConnect.disconnected'));
        setIsConnecting(false);
        setStep('connect');
      } else {
        console.log('✨ Account switched to:', accounts[0]);
        setError(null);
        setStep('connect');
        setIsConnecting(false);
        toast.success(t('auth.walletConnect.accountChanged'));
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [t]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStep('connect');

      console.log('🔗 Starting wallet connection process...');

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Step 1: Get current account
      let currentAccount: string | null = null;
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        currentAccount = accounts && accounts.length > 0 ? accounts[0] : null;
        
        if (!currentAccount) {
          const requestedAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          currentAccount = requestedAccounts && requestedAccounts.length > 0 ? requestedAccounts[0] : null;
        }
        
        if (!currentAccount) {
          throw new Error(t('auth.walletConnect.errors.noAccounts'));
        }
        
      } catch (accountError: any) {
        if (accountError.code === 4001) {
          throw new Error(t('auth.walletConnect.errors.accessDenied'));
        }
        throw accountError;
      }

      // Step 2: Connect wallet via WalletManager
      toast.loading(t('auth.walletConnect.steps.connecting'), { id: 'wallet-connect' });
      
      const walletInfo = await WalletManager.connectMetaMask();
      
      if (!walletInfo || typeof walletInfo !== 'object' || !walletInfo.address) {
        throw new Error(t('auth.walletConnect.errors.connectionFailed'));
      }
      
      const connectedAddress = walletInfo.address.trim().toLowerCase();
      const selectedAddress = currentAccount.trim().toLowerCase();
      
      if (connectedAddress !== selectedAddress) {
        throw new Error(t('auth.walletConnect.errors.mismatch'));
      }
      
      // Step 3: Get authentication challenge
      setStep('signing');
      toast.loading(t('auth.walletConnect.steps.preparing'), { id: 'wallet-connect' });
      
      const challengeResponse = await AuthAPI.getAuthChallenge(connectedAddress);
      
      if (!challengeResponse || !challengeResponse.challenge) {
        throw new Error(t('auth.walletConnect.errors.challengeFailed'));
      }
      
      const authMessage = createAuthMessage(challengeResponse.challenge, connectedAddress);

      // Step 4: Sign message
      toast.loading(t('auth.walletConnect.steps.signing'), { id: 'wallet-connect' });
      
      const signature = await WalletManager.signMessage(authMessage, connectedAddress);
      
      if (!signature || typeof signature !== 'string') {
        throw new Error(t('auth.walletConnect.errors.signatureFailed'));
      }

      // Step 5: Verify signature and get token
      setStep('verifying');
      toast.loading(t('auth.walletConnect.steps.verifying'), { id: 'wallet-connect' });
      
      const authResult = await AuthAPI.verifySignature(
        connectedAddress,
        signature,
        challengeResponse.challenge,
        challengeResponse.timestamp,
        challengeResponse.nonce
      );
      
      if (!authResult || !authResult.token || !authResult.user) {
        throw new Error(t('auth.walletConnect.errors.authFailed'));
      }

      toast.success(t('auth.walletConnect.success'), { id: 'wallet-connect' });
      onSuccess(authResult.token, authResult.user);

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      let errorMessage = t('auth.walletConnect.errors.generic');
      
      if (error.message?.includes('MetaMask')) {
        errorMessage = t('auth.walletConnect.errors.metaMaskFailed');
      } else if (error.message?.includes('rejected') || error.message?.includes('denied') || error.code === 4001) {
        errorMessage = t('auth.walletConnect.errors.cancelled');
      } else if (error.message?.includes('mismatch')) {
        errorMessage = t('auth.walletConnect.errors.mismatch');
      } else if (error.message?.includes('challenge')) {
        errorMessage = t('auth.walletConnect.errors.challengeFailed');
      } else if (error.message?.includes('signature')) {
        errorMessage = t('auth.walletConnect.errors.signatureFailed');
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = t('auth.walletConnect.errors.network');
      } else if (error.message?.includes('No accounts') || error.message?.includes('noAccounts')) {
        errorMessage = t('auth.walletConnect.errors.noAccounts');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { id: 'wallet-connect' });
    } finally {
      setIsConnecting(false);
      setStep('connect');
    }
  };

  const handleCancel = () => {
    if (isConnecting) {
      setIsConnecting(false);
      setStep('connect');
      setError(null);
      toast.dismiss('wallet-connect');
      toast(t('auth.walletConnect.connectionCancelled'), { icon: 'ℹ️' });
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  const handleInstallMetaMask = () => {
    window.open('https://metamask.io/download/', '_blank');
  };

  const getStepText = () => {
    switch (step) {
      case 'connect':
        return t('auth.walletConnect.steps.connecting');
      case 'signing':
        return t('auth.walletConnect.steps.signing');
      case 'verifying':
        return t('auth.walletConnect.steps.verifying');
      default:
        return t('auth.wallet.title');
    }
  };

  const isMetaMaskAvailable = WalletManager.isMetaMaskAvailable();

  return (
    <div className={`max-w-md mx-auto p-6 bg-white rounded-lg border ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t('auth.walletConnect.title')}
        </h2>
        <p className="text-gray-600 text-sm">
          {t('auth.walletConnect.subtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium mb-1">{t('auth.walletConnect.connectionFailed')}</p>
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('server') && (
              <p className="text-xs text-red-600 mt-2">
                {t('auth.walletConnect.hints.serverCheck')}
              </p>
            )}
            {error.includes('mismatch') && (
              <p className="text-xs text-red-600 mt-2">
                {t('auth.walletConnect.hints.mismatchHint')}
              </p>
            )}
          </div>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            clearAllAuthData();
            toast.success(t('auth.walletConnect.debug.cleared'));
          }}
          className="w-full mb-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🧹 {t('auth.walletConnect.debug.clearData')}
        </button>
      )}

      {!isMetaMaskAvailable ? (
        <div className="text-center">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              {t('auth.wallet.noWallet')}
            </p>
            <p className="text-xs text-yellow-700">
              {t('auth.wallet.installWallet')}
            </p>
          </div>
          
          <button
            onClick={handleInstallMetaMask}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            {t('auth.walletConnect.installMetaMask')}
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            {isConnecting ? getStepText() : t('auth.walletConnect.connectMetaMask')}
          </button>

          {isConnecting && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{getStepText()}</span>
              </div>
              
              {step === 'signing' && (
                <p className="text-xs text-blue-600 mt-2">
                  {t('auth.walletConnect.hints.checkExtension')}
                </p>
              )}
              
              {step === 'verifying' && (
                <p className="text-xs text-blue-600 mt-2">
                  {t('auth.walletConnect.hints.verifying')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center mb-3">
          {t('auth.walletConnect.moreOptions')}
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            {t('auth.wallet.walletConnect')}
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            {t('auth.wallet.coinbase')}
          </button>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isConnecting ? t('auth.walletConnect.cancelConnection') : t('common.cancel')}
        </button>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          🔒 <strong>{t('auth.walletConnect.security.title')}</strong> {t('auth.walletConnect.security.description')}
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500">
          <p>Debug: Backend should be running on port 3001</p>
          <p>API endpoint: /api/auth/challenge</p>
          <p>Account change detection: Active</p>
          <p className="mt-1 text-blue-600 font-medium">Check browser console for detailed logs</p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;