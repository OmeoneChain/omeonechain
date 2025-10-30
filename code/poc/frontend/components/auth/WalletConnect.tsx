// code/poc/frontend/components/auth/WalletConnect.tsx
// ENHANCED DEBUG VERSION with comprehensive logging and null safety

'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Wallet, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { WalletManager, AuthAPI, createAuthMessage } from '@/lib/auth';

// Helper function to clear all authentication data
const clearAllAuthData = () => {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  localStorage.removeItem('omeone_auth_token');
  localStorage.removeItem('omeone_user');
  localStorage.removeItem('omeone_pending_tokens');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear any cookies
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'connect' | 'signing' | 'verifying'>('connect');
  const [error, setError] = useState<string | null>(null);

  // Account change detection
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 MetaMask account changed:', accounts);
      
      if (accounts.length === 0) {
        setError('MetaMask disconnected. Please reconnect.');
        setIsConnecting(false);
        setStep('connect');
      } else {
        console.log('✨ Account switched to:', accounts[0]);
        setError(null);
        setStep('connect');
        setIsConnecting(false);
        toast.success('Account changed. Ready to connect with new account.');
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
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStep('connect');

      console.log('🔗 Starting wallet connection process...');
      console.log('🔗 window.ethereum exists:', !!window.ethereum);

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Step 1: Get current account with comprehensive error handling
      let currentAccount: string | null = null;
      try {
        console.log('📋 Requesting eth_accounts...');
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        console.log('📋 Raw accounts response:', accounts);
        console.log('📋 Accounts type:', typeof accounts);
        console.log('📋 Accounts is array:', Array.isArray(accounts));
        console.log('📋 Accounts length:', accounts?.length);
        
        currentAccount = accounts && accounts.length > 0 ? accounts[0] : null;
        console.log('📋 Current account after extraction:', currentAccount);
        
        if (!currentAccount) {
          console.log('📋 No current account, requesting access...');
          const requestedAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('📋 Requested accounts:', requestedAccounts);
          currentAccount = requestedAccounts && requestedAccounts.length > 0 ? requestedAccounts[0] : null;
          console.log('📋 Current account after request:', currentAccount);
        }
        
        if (!currentAccount) {
          throw new Error('No accounts found. Please unlock MetaMask and select an account.');
        }
        
        console.log('✅ Current MetaMask account confirmed:', currentAccount);
        console.log('✅ Account type:', typeof currentAccount);
        console.log('✅ Account length:', currentAccount.length);
        
      } catch (accountError: any) {
        console.error('❌ Account retrieval error:', accountError);
        console.error('❌ Error code:', accountError.code);
        console.error('❌ Error message:', accountError.message);
        
        if (accountError.code === 4001) {
          throw new Error('Please unlock MetaMask and grant access to your account.');
        }
        throw accountError;
      }

      // Step 2: Connect wallet via WalletManager
      toast.loading('Connecting to MetaMask...', { id: 'wallet-connect' });
      console.log('🔌 Calling WalletManager.connectMetaMask()...');
      
      const walletInfo = await WalletManager.connectMetaMask();
      
      console.log('📦 WalletInfo received:', walletInfo);
      console.log('📦 WalletInfo type:', typeof walletInfo);
      console.log('📦 WalletInfo is object:', typeof walletInfo === 'object' && walletInfo !== null);
      console.log('📦 WalletInfo.address:', walletInfo?.address);
      console.log('📦 WalletInfo.address type:', typeof walletInfo?.address);
      console.log('📦 WalletInfo.address length:', walletInfo?.address?.length);
      console.log('📦 Full WalletInfo structure:', JSON.stringify(walletInfo, null, 2));
      
      // Validate walletInfo structure
      if (!walletInfo || typeof walletInfo !== 'object') {
        console.error('❌ Invalid walletInfo - not an object:', walletInfo);
        throw new Error('Failed to connect wallet - invalid response from WalletManager');
      }
      
      if (!walletInfo.address || typeof walletInfo.address !== 'string') {
        console.error('❌ Missing or invalid address in walletInfo');
        console.error('❌ walletInfo.address value:', walletInfo.address);
        console.error('❌ walletInfo.address type:', typeof walletInfo.address);
        throw new Error('Failed to connect wallet - no address returned');
      }
      
      // Verify account match with safe toLowerCase
      console.log('🔍 Preparing address comparison...');
      console.log('🔍 walletInfo.address before trim:', `"${walletInfo.address}"`);
      console.log('🔍 currentAccount before trim:', `"${currentAccount}"`);
      
      const connectedAddress = walletInfo.address.trim().toLowerCase();
      const selectedAddress = currentAccount.trim().toLowerCase();
      
      console.log('🔍 Address comparison:', {
        connected: connectedAddress,
        selected: selectedAddress,
        connectedLength: connectedAddress.length,
        selectedLength: selectedAddress.length,
        match: connectedAddress === selectedAddress
      });
      
      if (connectedAddress !== selectedAddress) {
        console.warn('⚠️ Account mismatch detected!');
        console.warn('⚠️ Connected:', connectedAddress);
        console.warn('⚠️ Selected:', selectedAddress);
        throw new Error('Account mismatch detected. Please refresh the page and try again.');
      }
      
      console.log('✅ Addresses match! Wallet connected:', connectedAddress);
      
      // Step 3: Get authentication challenge
      setStep('signing');
      toast.loading('Preparing authentication...', { id: 'wallet-connect' });
      
      console.log('🔐 Getting auth challenge for wallet:', connectedAddress);
      const challengeResponse = await AuthAPI.getAuthChallenge(connectedAddress);
      
      console.log('✅ Challenge response received:', challengeResponse);
      console.log('✅ Challenge type:', typeof challengeResponse);
      console.log('✅ Challenge structure:', JSON.stringify(challengeResponse, null, 2));
      
      // Validate challenge response
      if (!challengeResponse || typeof challengeResponse !== 'object') {
        console.error('❌ Invalid challenge response - not an object:', challengeResponse);
        throw new Error('Failed to get authentication challenge - invalid response');
      }
      
      if (!challengeResponse.challenge || typeof challengeResponse.challenge !== 'string') {
        console.error('❌ Missing or invalid challenge string');
        console.error('❌ challengeResponse.challenge:', challengeResponse.challenge);
        console.error('❌ Type:', typeof challengeResponse.challenge);
        throw new Error('Failed to get authentication challenge - no challenge string');
      }
      
      console.log('✅ Challenge validated:', {
        challenge: challengeResponse.challenge.substring(0, 50) + '...',
        timestamp: challengeResponse.timestamp,
        nonce: challengeResponse.nonce
      });
      
      // Create auth message
      const authMessage = createAuthMessage(challengeResponse.challenge, connectedAddress);
      console.log('📝 Auth message created');
      console.log('📝 Message length:', authMessage.length);
      console.log('📝 Message preview:', authMessage.substring(0, 100) + '...');

      // Step 4: Sign message
      toast.loading('Please sign the message in MetaMask...', { id: 'wallet-connect' });
      console.log('✍️ Requesting signature from MetaMask...');
      
      const signature = await WalletManager.signMessage(authMessage, connectedAddress);
      
      console.log('✅ Signature received');
      console.log('✅ Signature type:', typeof signature);
      console.log('✅ Signature length:', signature?.length);
      console.log('✅ Signature preview:', signature?.substring(0, 20) + '...');
      
      // Validate signature
      if (!signature || typeof signature !== 'string') {
        console.error('❌ Invalid signature:', signature);
        console.error('❌ Signature type:', typeof signature);
        throw new Error('Failed to sign message - invalid signature returned');
      }

      // Step 5: Verify signature and get token
      setStep('verifying');
      toast.loading('Verifying signature...', { id: 'wallet-connect' });
      
      console.log('🔍 Verifying signature with backend...');
      console.log('🔍 Verification parameters:', {
        address: connectedAddress,
        signature: signature.substring(0, 20) + '...',
        challenge: challengeResponse.challenge.substring(0, 50) + '...',
        timestamp: challengeResponse.timestamp,
        nonce: challengeResponse.nonce
      });
      
      const authResult = await AuthAPI.verifySignature(
        connectedAddress,
        signature,
        challengeResponse.challenge,
        challengeResponse.timestamp,
        challengeResponse.nonce
      );
      
      console.log('✅ Auth result received:', authResult);
      console.log('✅ Auth result type:', typeof authResult);
      console.log('✅ Auth result structure:', JSON.stringify(authResult, null, 2));
      
      // Validate auth result
      if (!authResult || typeof authResult !== 'object') {
        console.error('❌ Invalid auth result - not an object:', authResult);
        throw new Error('Authentication failed - invalid response');
      }
      
      if (!authResult.token || typeof authResult.token !== 'string') {
        console.error('❌ Missing or invalid token');
        console.error('❌ authResult.token:', authResult.token);
        console.error('❌ Type:', typeof authResult.token);
        throw new Error('Authentication failed - no token returned');
      }
      
      if (!authResult.user || typeof authResult.user !== 'object') {
        console.error('❌ Missing or invalid user data');
        console.error('❌ authResult.user:', authResult.user);
        console.error('❌ Type:', typeof authResult.user);
        throw new Error('Authentication failed - no user data returned');
      }

      console.log('✅ Authentication complete! Token and user validated.');
      toast.success('Successfully authenticated!', { id: 'wallet-connect' });
      
      onSuccess(authResult.token, authResult.user);

    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      let errorMessage = 'Connection failed';
      
      // Enhanced error messages
      if (error.message?.includes('MetaMask')) {
        errorMessage = 'MetaMask connection failed. Please make sure MetaMask is unlocked.';
      } else if (error.message?.includes('rejected') || error.message?.includes('denied') || error.code === 4001) {
        errorMessage = 'You cancelled the connection request.';
      } else if (error.message?.includes('mismatch')) {
        errorMessage = 'Account mismatch detected. Please refresh the page.';
      } else if (error.message?.includes('challenge')) {
        errorMessage = 'Failed to get authentication challenge from server.';
      } else if (error.message?.includes('signature')) {
        errorMessage = 'Failed to verify signature. Please try again.';
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and ensure backend is running.';
      } else if (error.message?.includes('No accounts')) {
        errorMessage = 'No MetaMask accounts found. Please create or import an account.';
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
      toast('Connection cancelled', { icon: 'ℹ️' });
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
        return 'Connecting to wallet...';
      case 'signing':
        return 'Please sign the message in MetaMask';
      case 'verifying':
        return 'Verifying signature...';
      default:
        return 'Connect Wallet';
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
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 text-sm">
          Connect your wallet to access personalized recommendations and earn tokens
        </p>
      </div>

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

      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            clearAllAuthData();
            toast.success('Auth data cleared. Ready for fresh connection.');
          }}
          className="w-full mb-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🧹 Clear All Auth Data (Debug)
        </button>
      )}

      {!isMetaMaskAvailable ? (
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

      {onCancel && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isConnecting ? 'Cancel Connection' : 'Cancel'}
        </button>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          🔒 <strong>Secure Connection:</strong> We never store your private keys. 
          The signature request is only used for authentication and won't trigger any transactions.
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