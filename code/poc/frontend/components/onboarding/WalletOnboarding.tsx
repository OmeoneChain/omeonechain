'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Coins, 
  Shield, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ExternalLink,
  Users,
  TrendingUp,
  Lock,
  Gift
} from 'lucide-react';
import WalletConnect from '@/components/auth/WalletConnect';

interface WalletOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'upgrade' | 'first-time';
}

const WalletOnboarding: React.FC<WalletOnboardingProps> = ({ 
  isOpen, 
  onClose,
  variant = 'first-time' 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  // Mock data - you can integrate with your auth system
  const pendingTokens = variant === 'upgrade' ? 2.5 : 0;

  const onboardingSteps = [
    {
      id: 'intro',
      title: variant === 'upgrade' ? 'Ready to Claim Your Tokens?' : 'Welcome to Web3 Recommendations',
      content: variant === 'upgrade' 
        ? `You've earned ${pendingTokens.toFixed(2)} TOK! Connect your wallet to claim them and start earning more.`
        : 'Connect your wallet to earn tokens for helpful recommendations and participate in the trust network.',
      icon: variant === 'upgrade' ? Gift : Wallet,
      benefits: variant === 'upgrade' 
        ? [
            { icon: Coins, text: `Claim ${pendingTokens.toFixed(2)} TOK you've earned` },
            { icon: TrendingUp, text: 'Start earning tokens for future recommendations' },
            { icon: Users, text: 'Full trust network participation' }
          ]
        : [
            { icon: Coins, text: 'Earn tokens for helpful recommendations' },
            { icon: Shield, text: 'Your data stays under your control' },
            { icon: Users, text: 'Build your reputation in the trust network' }
          ]
    },
    {
      id: 'benefits',
      title: 'Why Connect a Wallet?',
      content: 'A Web3 wallet gives you ownership and control while enabling token rewards.',
      icon: Shield,
      benefits: [
        { icon: Lock, text: 'Your data and identity remain under your control' },
        { icon: Coins, text: 'Earn 1-3 TOK per helpful recommendation' },
        { icon: TrendingUp, text: 'Build reputation that follows you everywhere' },
        { icon: Users, text: 'Participate in platform governance' }
      ]
    },
    {
      id: 'security',
      title: 'Safe & Secure',
      content: 'We prioritize your security and never access your funds.',
      icon: Shield,
      benefits: [
        { icon: Lock, text: 'We never store your private keys' },
        { icon: Shield, text: 'No transactions required - just authentication' },
        { icon: Check, text: 'Industry standard security practices' },
        { icon: Users, text: 'Trusted by thousands of users' }
      ]
    }
  ];

  const handleConnect = async (token: string, user: any) => {
    try {
      setIsConnecting(true);
      
      // The parent component will handle the actual auth logic
      // Just close the modal after successful connection
      setTimeout(() => {
        onClose();
        setIsConnecting(false);
      }, 1000);
      
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipToConnection = () => {
    setCurrentStep(onboardingSteps.length); // Beyond last step to show connection
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {variant === 'upgrade' ? 'Claim Your Tokens' : 'Connect Your Wallet'}
            </h2>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Indicator */}
        {currentStep < onboardingSteps.length && (
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Step {currentStep + 1} of {onboardingSteps.length}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep < onboardingSteps.length ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Step Content */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                    {React.createElement(onboardingSteps[currentStep].icon, {
                      className: "w-8 h-8 text-blue-600"
                    })}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {onboardingSteps[currentStep].title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {onboardingSteps[currentStep].content}
                    </p>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="space-y-3">
                  {onboardingSteps[currentStep].benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        {React.createElement(benefit.icon, {
                          className: "w-4 h-4 text-blue-600"
                        })}
                      </div>
                      <span className="text-sm text-gray-700">{benefit.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {currentStep > 0 && (
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  
                  <div className="flex-1" />
                  
                  {variant === 'upgrade' && currentStep === 0 ? (
                    <button
                      onClick={skipToConnection}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      <Coins className="w-4 h-4" />
                      Claim {pendingTokens.toFixed(2)} TOK
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : currentStep === onboardingSteps.length - 1 ? (
                    <button
                      onClick={skipToConnection}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Connect Wallet
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Skip Option */}
                {currentStep === 0 && variant !== 'upgrade' && (
                  <div className="text-center pt-2">
                    <button
                      onClick={skipToConnection}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Skip intro and connect wallet
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Wallet Connection Step */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {variant === 'upgrade' && (
                  <div className="text-center mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-green-800">
                      <Coins className="w-5 h-5" />
                      <span className="font-medium">
                        Ready to claim {pendingTokens.toFixed(2)} TOK!
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Connect your wallet to unlock your earned tokens
                    </p>
                  </div>
                )}

                <WalletConnect
                  onSuccess={handleConnect}
                  onCancel={() => setCurrentStep(onboardingSteps.length - 1)}
                  className="border-0 p-0 bg-transparent"
                />

                {/* Security Reminder */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        Your Security is Our Priority
                      </h4>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        We use industry-standard wallet connection protocols. Your private keys stay 
                        in your wallet, and we never initiate transactions without your explicit approval.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help Link */}
                <div className="text-center">
                  <a
                    href="https://metamask.io/faqs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    New to wallets? Learn more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default WalletOnboarding;