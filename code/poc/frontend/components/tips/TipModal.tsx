// File: code/poc/frontend/components/tips/TipModal.tsx
// Generic modal for tipping any content (recommendations, guides, comments, users)
// Refactored from TipResponseModal to be context-agnostic
// UPDATED: Uses Coins icon consistent with CleanHeader

"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Coins,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Wallet
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';

// =============================================================================
// TYPES
// =============================================================================

export interface TipRecipient {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TipContext {
  type: 'recommendation' | 'guide' | 'comment' | 'user';
  id: string;
  label?: string; // e.g., "for recommending Pizzeria Roma"
}

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: TipRecipient;
  context: TipContext;
  onSuccess?: (amount: number) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PRESET_AMOUNTS = [0.5, 1, 2, 5];
const MIN_TIP = 0.5;
const MAX_TIP = 1000;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

// =============================================================================
// COMPONENT
// =============================================================================

export default function TipModal({
  isOpen,
  onClose,
  recipient,
  context,
  onSuccess
}: TipModalProps) {
  const t = useTranslations('tips');
  const { token, isAuthenticated, user } = useAuth();
  
  const [amount, setAmount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : amount;
  const canTip = effectiveAmount >= MIN_TIP && effectiveAmount <= userBalance && isAuthenticated;

  // Fetch user balance on mount
  useEffect(() => {
    if (isOpen && token) {
      fetchBalance();
    }
  }, [isOpen, token]);

  const fetchBalance = async () => {
    try {
      setIsLoadingBalance(true);
      
      // Use the user endpoint (same as CleanHeader) which reliably works
      if (user?.id) {
        const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const userData = data.user || data;
          setUserBalance(userData.token_balance ?? userData.tokens_earned ?? 0);
          return;
        }
      }
      
      // Fallback: use tokens_earned from auth context
      setUserBalance(user?.tokens_earned ?? user?.tokensEarned ?? 0);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      // Final fallback to auth context
      setUserBalance(user?.tokens_earned ?? user?.tokensEarned ?? 0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handlePresetSelect = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
      setIsCustom(true);
      setError(null);
    }
  };

  const handleIncrement = () => {
    if (isCustom) {
      const current = parseFloat(customAmount) || 0;
      const newValue = Math.min(current + 0.5, MAX_TIP, userBalance);
      setCustomAmount(newValue.toFixed(2));
    } else {
      const currentIndex = PRESET_AMOUNTS.indexOf(amount);
      if (currentIndex < PRESET_AMOUNTS.length - 1) {
        setAmount(PRESET_AMOUNTS[currentIndex + 1]);
      } else {
        setIsCustom(true);
        setCustomAmount((amount + 0.5).toFixed(2));
      }
    }
    setError(null);
  };

  const handleDecrement = () => {
    if (isCustom) {
      const current = parseFloat(customAmount) || 0;
      const newValue = Math.max(current - 0.5, MIN_TIP);
      setCustomAmount(newValue.toFixed(2));
    } else {
      const currentIndex = PRESET_AMOUNTS.indexOf(amount);
      if (currentIndex > 0) {
        setAmount(PRESET_AMOUNTS[currentIndex - 1]);
      }
    }
    setError(null);
  };

  const handleSendTip = async () => {
    if (!canTip || !token) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/tips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: recipient.id,
          amount: effectiveAmount,
          context_type: context.type,
          context_id: context.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('error.failed'));
      }

      setSuccess(true);
      setUserBalance(data.new_balance);
      onSuccess?.(effectiveAmount);
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failed'));
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setAmount(1);
    setCustomAmount('');
    setIsCustom(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  const recipientName = recipient.display_name || recipient.username;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-2xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 dark:border-[#3D3C4A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-xl">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1E2A] dark:text-white">
                  {t('modal.title')}
                </h2>
                <p className="text-sm text-stone-500 dark:text-gray-400">
                  {t('modal.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Success State */}
          {success ? (
            <div className="px-6 py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-[#1F1E2A] dark:text-white mb-2">
                {t('success.title')}
              </h3>
              <p className="text-stone-600 dark:text-gray-400">
                {t('success.description', { amount: effectiveAmount.toFixed(2), name: recipientName })}
              </p>
            </div>
          ) : (
            <>
              {/* Recipient Info */}
              <div className="px-6 py-4 bg-stone-50 dark:bg-[#353444] border-b border-stone-100 dark:border-[#3D3C4A]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 dark:bg-[#404050] flex-shrink-0">
                    {recipient.avatar_url ? (
                      <Image
                        src={recipient.avatar_url}
                        alt={recipient.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                        {recipientName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1F1E2A] dark:text-white truncate">
                      {recipientName}
                    </p>
                    {context.label && (
                      <p className="text-sm text-stone-500 dark:text-gray-400 truncate">
                        {context.label}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="px-6 py-6 space-y-6">
                {/* Balance indicator */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    {t('modal.yourBalance')}
                  </span>
                  {isLoadingBalance ? (
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-[#FF644A] rounded-full animate-spin" />
                  ) : (
                    <span className="font-semibold text-[#1F1E2A] dark:text-white">
                      {userBalance.toFixed(2)} BOCA
                    </span>
                  )}
                </div>

                {/* Preset amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect(preset)}
                      disabled={preset > userBalance}
                      className={cn(
                        "py-3 rounded-xl font-semibold text-sm transition-all",
                        !isCustom && amount === preset
                          ? "bg-[#FF644A] text-white shadow-md"
                          : preset > userBalance
                            ? "bg-stone-100 dark:bg-[#404050] text-stone-400 dark:text-gray-600 cursor-not-allowed"
                            : "bg-stone-100 dark:bg-[#353444] text-stone-700 dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-[#404050]"
                      )}
                    >
                      {preset} BOCA
                    </button>
                  ))}
                </div>

                {/* Custom amount input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600 dark:text-gray-400">
                    {t('modal.customAmount')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDecrement}
                      disabled={effectiveAmount <= MIN_TIP}
                      className="p-3 bg-stone-100 dark:bg-[#353444] rounded-lg hover:bg-stone-200 dark:hover:bg-[#404050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4 text-stone-600 dark:text-gray-400" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={isCustom ? customAmount : amount.toString()}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        onFocus={() => {
                          if (!isCustom) {
                            setCustomAmount(amount.toString());
                            setIsCustom(true);
                          }
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-center text-xl font-bold rounded-xl border-2 transition-all bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white",
                          isCustom
                            ? "border-[#FF644A] ring-2 ring-[#FF644A]/20"
                            : "border-stone-200 dark:border-[#3D3C4A]"
                        )}
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-gray-500 font-medium">
                        BOCA
                      </span>
                    </div>

                    <button
                      onClick={handleIncrement}
                      disabled={effectiveAmount >= Math.min(MAX_TIP, userBalance)}
                      className="p-3 bg-stone-100 dark:bg-[#353444] rounded-lg hover:bg-stone-200 dark:hover:bg-[#404050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-stone-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 bg-[#FFF4E1] dark:bg-[#FF644A]/10 rounded-lg text-sm border border-[#FF644A]/20">
                  <Coins className="w-4 h-4 text-[#FF644A] flex-shrink-0 mt-0.5" />
                  <p className="text-[#1F1E2A] dark:text-gray-300">
                    {t('modal.infoNote', { name: recipientName })}
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Insufficient balance warning */}
                {effectiveAmount > userBalance && !isLoadingBalance && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {t('modal.insufficientBalance', { balance: userBalance.toFixed(2) })}
                  </div>
                )}

                {/* Not authenticated warning */}
                {!isAuthenticated && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {t('modal.signInRequired')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-200 dark:border-[#3D3C4A] bg-stone-50 dark:bg-[#353444]">
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 border border-stone-300 dark:border-[#4D4C5A] text-stone-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-stone-100 dark:hover:bg-[#404050] transition-colors"
                  >
                    {t('modal.cancel')}
                  </button>
                  <button
                    onClick={handleSendTip}
                    disabled={!canTip || isSending}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                      canTip && !isSending
                        ? "bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white hover:from-[#E65441] hover:to-[#C94232] shadow-md"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                    )}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('modal.sending')}
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        {t('modal.sendAmount', { amount: effectiveAmount.toFixed(2) })}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}