// File: code/poc/frontend/components/auth/AuthErrorBoundary.tsx
// Error boundary for the authentication flow
// Catches crashes and shows a user-friendly retry screen instead of generic error
// Created: Jan 31, 2026

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('AuthErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Optional: Send to error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call optional reset callback
    this.props.onReset?.();
  };

  handleReload = () => {
    // Force a full page reload
    window.location.reload();
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
            
            {/* Retry Button */}
            <button
              onClick={this.handleRetry}
              className="w-full py-4 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            {/* Reload Button (secondary) */}
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Reload App
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