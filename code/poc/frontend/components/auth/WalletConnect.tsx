// code/poc/frontend/components/auth/WalletConnect.tsx
// Wallet connection modal for BocaBoca
// UPDATED: Rebranded to BocaBoca design system (Feb 8, 2026)
//   - Coral primary (#FF644A), cream accents (#FFF4E1, #FFE8E3)
//   - Full dark mode support
//   - Cleaned up dev debug UI
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Wallet, Loader2, ExternalLink, AlertCircle, Shield } from 'lucide-react';
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
    <div className={`max-w-md mx-auto p-6 bg-white dark:bg-[#2D2C3A] rounded-2xl border border-gray-200 dark:border-[#3D3C4A] shadow-xl ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-[#FF644A]" />
        </div>
        <h2 className="text-xl font-bold text-[#1F1E2A] dark:text-white mb-2">
          {t('auth.walletConnect.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('auth.walletConnect.subtitle')}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-[#FFE8E3] dark:bg-red-900/20 border border-[#FFD4CC] dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#E65441] dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#1F1E2A] dark:text-white font-medium mb-1">
              {t('auth.walletConnect.connectionFailed')}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
            {error.includes('server') && (
              <p className="text-xs text-[#E65441] dark:text-red-400 mt-2">
                {t('auth.walletConnect.hints.serverCheck')}
              </p>
            )}
            {error.includes('mismatch') && (
              <p className="text-xs text-[#E65441] dark:text-red-400 mt-2">
                {t('auth.walletConnect.hints.mismatchHint')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dev-only: Clear auth data */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            clearAllAuthData();
            toast.success(t('auth.walletConnect.debug.cleared'));
          }}
          className="w-full mb-2 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#3D3C4A] rounded-lg hover:bg-gray-50 dark:hover:bg-[#353444]"
        >
          🧹 {t('auth.walletConnect.debug.clearData')}
        </button>
      )}

      {/* Main Action Area */}
      {!isMetaMaskAvailable ? (
        /* MetaMask Not Installed */
        <div className="text-center">
          <div className="mb-4 p-4 bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFD4CC] dark:border-[#FF644A]/30 rounded-xl">
            <p className="text-sm text-[#1F1E2A] dark:text-white font-medium mb-1">
              {t('auth.wallet.noWallet')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('auth.wallet.installWallet')}
            </p>
          </div>
          
          <button
            onClick={handleInstallMetaMask}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FF644A] text-white rounded-xl hover:bg-[#E65441] transition-colors font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            {t('auth.walletConnect.installMetaMask')}
          </button>
        </div>
      ) : (
        /* MetaMask Available — Connect Button */
        <div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#FF644A] text-white rounded-xl hover:bg-[#E65441] disabled:bg-[#FF644A]/50 disabled:cursor-not-allowed transition-colors font-medium text-[15px]"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            {isConnecting ? getStepText() : t('auth.walletConnect.connectMetaMask')}
          </button>

          {/* In-progress status */}
          {isConnecting && (
            <div className="mt-4 p-3 bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFD4CC] dark:border-[#FF644A]/30 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-[#1F1E2A] dark:text-white">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF644A]" />
                <span>{getStepText()}</span>
              </div>
              
              {step === 'signing' && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {t('auth.walletConnect.hints.checkExtension')}
                </p>
              )}
              
              {step === 'verifying' && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {t('auth.walletConnect.hints.verifying')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Other Wallet Options (coming soon) */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-[#3D3C4A]">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
          {t('auth.walletConnect.moreOptions')}
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#3D3C4A] rounded-xl cursor-not-allowed bg-gray-50 dark:bg-[#353444]"
          >
            {t('auth.wallet.walletConnect')}
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#3D3C4A] rounded-xl cursor-not-allowed bg-gray-50 dark:bg-[#353444]"
          >
            {t('auth.wallet.coinbase')}
          </button>
        </div>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white transition-colors font-medium"
        >
          {isConnecting ? t('auth.walletConnect.cancelConnection') : t('common.cancel')}
        </button>
      )}

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-xl flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-[#2D7A5F] dark:text-[#BFE2D9] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          <strong className="text-[#1F1E2A] dark:text-white">{t('auth.walletConnect.security.title')}</strong>{' '}
          {t('auth.walletConnect.security.description')}
        </p>
      </div>

      {/* Dev Debug Panel - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 p-2 bg-gray-100 dark:bg-[#353444] rounded-lg text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          <p>Backend: port 3001 | API: /api/auth/challenge</p>
          <p>Account change detection: Active</p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;