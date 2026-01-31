// File: code/poc/frontend/components/auth/AuthErrorBoundary.tsx
// Error boundary for the authentication flow
// Catches crashes and shows a user-friendly retry screen
// Updated: Try Again now does full reload to handle stale cache issues (Jan 31, 2026)

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export default class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
  }

  handleTryAgain = async () => {
    // Clear any service worker caches first
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🔄 Cleared browser caches');
      } catch (e) {
        console.warn('Failed to clear caches:', e);
      }
    }
    
    // Clear the build check storage to force a fresh check
    try {
      localStorage.removeItem('bocaboca_last_build_id');
      localStorage.removeItem('bocaboca_last_build_check');
    } catch (e) {
      console.warn('Failed to clear build check storage:', e);
    }
    
    // Do a full reload to get fresh code
    // This is more reliable than just resetting state when dealing with stale cache
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleSoftRetry = () => {
    // Soft retry - just reset state (used after successful reload)
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
    
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              We had trouble loading this page. This is usually temporary — please try again.
            </p>
            
            {/* Try Again Button - now does full reload */}
            <button
              onClick={this.handleTryAgain}
              className="w-full py-4 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            {/* Go to Home Button - alternative escape route */}
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Go to Home
            </button>
            
            {/* Debug info (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-500 mb-2">Debug info:</p>
                <p className="text-xs font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-gray-500 mt-2 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}