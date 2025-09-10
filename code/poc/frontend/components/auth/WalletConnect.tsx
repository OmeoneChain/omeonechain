// code/poc/frontend/components/auth/WalletConnect.tsx
// FIXED: Updated to use corrected auth flow and better error handling + Account Change Detection

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Wallet, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
// FIXED: Updated imports to match corrected auth lib
import { WalletManager, AuthAPI, createAuthMessage } from '@/lib/auth';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'connect' | 'signing' | 'verifying'>('connect');
  const [error, setError] = useState<string | null>(null);

  // NEW: Add account change detection
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 MetaMask account changed:', accounts);
      // Reset component state when account changes
      if (accounts.length === 0) {
        // User disconnected
        setError('MetaMask disconnected. Please reconnect.');
        setIsConnecting(false);
        setStep('connect');
      } else {
        // Account switched - reset the connection state
        console.log('✨ Account switched to:', accounts[0]);
        setError(null);
        setStep('connect');
        setIsConnecting(false);
        toast.success('Account changed. Ready to connect with new account.');
      }
    };

    // Only add listener if window.ethereum exists
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Cleanup listener on unmount
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStep('connect');

      console.log('🔗 Starting wallet connection process...');

      // NEW: Step 1 - Get current account from MetaMask first
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        // Try to request account access
        const requestedAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (requestedAccounts.length === 0) {
          throw new Error('No accounts found. Please unlock MetaMask and select an account.');
        }
      }
      
      const currentAccount = accounts[0] || (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
      console.log('📋 Current MetaMask account:', currentAccount);

      // Step 2: Connect wallet (this should match the current account)
      toast.loading('Connecting to MetaMask...', { id: 'wallet-connect' });
      const walletInfo = await WalletManager.connectMetaMask();
      
      // NEW: Verify the connected account matches current account
      if (walletInfo.address.toLowerCase() !== currentAccount.toLowerCase()) {
        console.warn('⚠️ Account mismatch detected:', {
          connected: walletInfo.address,
          current: currentAccount
        });
        throw new Error('Account mismatch detected. Please refresh the page and try again.');
      }
      
      console.log('✅ Wallet connected:', walletInfo.address);
      
      // Step 3: Get authentication challenge
      setStep('signing');
      toast.loading('Preparing authentication...', { id: 'wallet-connect' });
      
      console.log('🔐 Getting auth challenge for wallet:', walletInfo.address);
      const challengeResponse = await AuthAPI.getAuthChallenge(walletInfo.address);
      console.log('✅ Challenge received:', challengeResponse);
      
      // FIXED: Use the complete challenge message from backend
      const authMessage = createAuthMessage(challengeResponse.challenge, walletInfo.address);
      console.log('📝 Auth message created:', authMessage);

      // Step 4: Sign message
      toast.loading('Please sign the message in MetaMask...', { id: 'wallet-connect' });
      console.log('✍️ Requesting signature...');
      const signature = await WalletManager.signMessage(authMessage, walletInfo.address);
      console.log('✅ Message signed:', signature);

      // Step 5: Verify signature and get token
      setStep('verifying');
      toast.loading('Verifying signature...', { id: 'wallet-connect' });
      
      console.log('🔍 Verifying signature...');
      // FIXED: Pass all required parameters to backend
      const authResult = await AuthAPI.verifySignature(
        walletInfo.address,
        signature,
        challengeResponse.challenge,
        challengeResponse.timestamp,
        challengeResponse.nonce
      );
      console.log('✅ Auth verified:', authResult);

      toast.success('Successfully authenticated!', { id: 'wallet-connect' });
      onSuccess(authResult.token, authResult.user);

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      let errorMessage = 'Connection failed';
      
      // ENHANCED: Better error handling with specific messages
      if (error.message.includes('MetaMask')) {
        errorMessage = 'MetaMask connection failed. Please make sure MetaMask is unlocked.';
      } else if (error.message.includes('rejected') || error.message.includes('denied')) {
        errorMessage = 'Signature request was rejected. Please try again.';
      } else if (error.message.includes('mismatch')) {
        errorMessage = 'Account mismatch detected. Please refresh the page and ensure you have the correct account selected.';
      } else if (error.message.includes('challenge')) {
        errorMessage = 'Failed to get authentication challenge. Please check your connection.';
      } else if (error.message.includes('signature')) {
        errorMessage = 'Signature verification failed. Please try again.';
      } else if (error.message.includes('CORS') || error.message.includes('fetch')) {
        errorMessage = 'Connection to backend failed. Please check if the server is running.';
      } else if (error.message.includes('No accounts')) {
        errorMessage = 'No MetaMask accounts found. Please unlock MetaMask and create/import an account.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { id: 'wallet-connect' });
    } finally {
      setIsConnecting(false);
      setStep('connect');
    }
  };

  // NEW: Add cancel handler to properly reset state
  const handleCancel = () => {
    if (isConnecting) {
      // If currently connecting, stop the process
      setIsConnecting(false);
      setStep('connect');
      setError(null);
      toast.dismiss('wallet-connect');
      toast.info('Connection cancelled');
    }
    
    // Call the provided onCancel callback
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
        return 'Connecting to wallet...';
      case 'signing':
        return 'Please sign the message in MetaMask';
      case 'verifying':
        return 'Verifying signature...';
      default:
        return 'Connect Wallet';
    }
  };

  // Check if MetaMask is available
  const isMetaMaskAvailable = WalletManager.isMetaMaskAvailable();

  return (
    <div className={`max-w-md mx-auto p-6 bg-white rounded-lg border ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 text-sm">
          Connect your wallet to access personalized recommendations and earn tokens
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium mb-1">Connection Failed</p>
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('server') && (
              <p className="text-xs text-red-600 mt-2">
                Make sure the backend server is running on port 3001
              </p>
            )}
            {error.includes('mismatch') && (
              <p className="text-xs text-red-600 mt-2">
                Try refreshing the page and selecting the correct account in MetaMask before connecting.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Connection Area */}
      {!isMetaMaskAvailable ? (
        // MetaMask not installed
        <div className="text-center">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              MetaMask wallet not detected
            </p>
            <p className="text-xs text-yellow-700">
              Install MetaMask browser extension to connect your wallet
            </p>
          </div>
          
          <button
            onClick={handleInstallMetaMask}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <ExternalLink className="w-5 h-5" />
            Install MetaMask
          </button>
        </div>
      ) : (
        // MetaMask available
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
            {isConnecting ? getStepText() : 'Connect MetaMask'}
          </button>

          {/* Step indicator */}
          {isConnecting && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{getStepText()}</span>
              </div>
              
              {step === 'signing' && (
                <p className="text-xs text-blue-600 mt-2">
                  Check your MetaMask extension for a signature request
                </p>
              )}
              
              {step === 'verifying' && (
                <p className="text-xs text-blue-600 mt-2">
                  Verifying your signature with the backend server...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alternative Options */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center mb-3">
          More wallet options coming soon
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
            Coinbase Wallet
          </button>
        </div>
      </div>

      {/* Cancel Button - ENHANCED */}
      {onCancel && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isConnecting ? 'Cancel Connection' : 'Cancel'}
        </button>
      )}

      {/* Security Note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          🔒 <strong>Secure Connection:</strong> We never store your private keys. 
          The signature request is only used for authentication and won't trigger any transactions.
        </p>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500">
          <p>Debug: Backend should be running on port 3001</p>
          <p>API endpoint: /api/auth/challenge</p>
          <p>Account change detection: Active</p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;