// File: code/poc/frontend/components/discover/TipResponseModal.tsx
// Modal for bounty creators to tip other helpful responses after award
// Tips come from creator's own wallet, 100% goes to responder (no burn)
// UPDATED: Dark mode support + i18n translations

"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gift,
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

// BocaBoca Brand Colors
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
};

interface Responder {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Recommendation {
  id: string;
  restaurant: Restaurant;
}

interface DiscoveryResponse {
  id: string;
  comment: string | null;
  responder: Responder;
  recommendation: Recommendation;
}

interface TipResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTip: (responseId: string, amount: number) => Promise<void>;
  response: DiscoveryResponse | null;
  userBalance: number;
  bountyId: string;
}

// Preset tip amounts
const PRESET_AMOUNTS = [0.5, 1, 2, 5];
const MIN_TIP = 0.5;
const MAX_TIP = 100;

const TipResponseModal: React.FC<TipResponseModalProps> = ({
  isOpen,
  onClose,
  onTip,
  response,
  userBalance,
  bountyId
}) => {
  const t = useTranslations('discover');
  
  const [amount, setAmount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isTipping, setIsTipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : amount;
  const canTip = effectiveAmount >= MIN_TIP && effectiveAmount <= userBalance;

  const handlePresetSelect = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
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

  const handleTip = async () => {
    if (!response || !canTip) return;

    setIsTipping(true);
    setError(null);

    try {
      await onTip(response.id, effectiveAmount);
      setSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tipModal.error.failed'));
    } finally {
      setIsTipping(false);
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

  if (!isOpen || !response) return null;

  const responderName = response.responder.display_name || response.responder.username;

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
              <div className="p-2 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1E2A] dark:text-white">
                  {t('tipModal.title')}
                </h2>
                <p className="text-sm text-stone-500 dark:text-gray-400">
                  {t('tipModal.subtitle')}
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
                {t('tipModal.success.title')}
              </h3>
              <p className="text-stone-600 dark:text-gray-400">
                {t('tipModal.success.description', { amount: effectiveAmount.toFixed(2), name: responderName })}
              </p>
            </div>
          ) : (
            <>
              {/* Recipient Info */}
              <div className="px-6 py-4 bg-stone-50 dark:bg-[#353444] border-b border-stone-100 dark:border-[#3D3C4A]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 dark:bg-[#404050] flex-shrink-0">
                    {response.responder.avatar_url ? (
                      <Image
                        src={response.responder.avatar_url}
                        alt={response.responder.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                        {response.responder.display_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1F1E2A] dark:text-white truncate">
                      {responderName}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-gray-400 truncate">
                      {t('tipModal.recommended')}: {response.recommendation.restaurant.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="px-6 py-6 space-y-6">
                {/* Balance indicator */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    {t('tipModal.yourBalance')}
                  </span>
                  <span className="font-semibold text-[#1F1E2A] dark:text-white">
                    {userBalance.toFixed(2)} BOCA
                  </span>
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
                    {t('tipModal.customAmount')}
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
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-100 dark:border-blue-800">
                  <Gift className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700 dark:text-blue-300">
                    {t('tipModal.infoNote', { name: responderName })}
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
                {effectiveAmount > userBalance && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {t('tipModal.insufficientBalance', { balance: userBalance.toFixed(2) })}
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
                    {t('tipModal.cancel')}
                  </button>
                  <button
                    onClick={handleTip}
                    disabled={!canTip || isTipping}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                      canTip && !isTipping
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-md"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                    )}
                  >
                    {isTipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('tipModal.sending')}
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        {t('tipModal.sendAmount', { amount: effectiveAmount.toFixed(2) })}
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
};

export default TipResponseModal;