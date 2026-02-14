// File: code/poc/frontend/components/recommendation/DeleteConfirmationModal.tsx
// Delete confirmation modal with 15-minute grace period awareness
// Shows different messaging based on BOCA impact

"use client"

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Coins, X, Trash2, Loader2 } from 'lucide-react';

interface DeletePreview {
  within_grace_period: boolean;
  minutes_since_creation: number;
  boca_impact: number;
  current_balance: number;
  projected_balance: number;
  will_go_negative: boolean;
  has_blockchain_record: boolean;
  breakdown: {
    base_reward: number;
    engagement_rewards: number;
    first_reviewer_bonus: number;
    validation_bonus: number;
  };
}

interface DeleteConfirmationModalProps {
  recommendationId: string;
  restaurantName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  backendUrl?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  recommendationId,
  restaurantName,
  isOpen,
  onClose,
  onConfirm,
  backendUrl = 'https://omeonechain-production.up.railway.app'
}) => {
  const t = useTranslations('recommendations');
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch delete preview when modal opens
  useEffect(() => {
    if (!isOpen || !recommendationId) return;

    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('omeone_auth_token');
        const response = await fetch(
          `${backendUrl}/api/recommendations/${recommendationId}/delete-preview`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load delete preview');
        }

        const data = await response.json();
        setPreview(data);
      } catch (err: any) {
        console.error('Failed to fetch delete preview:', err);
        setError(err.message || 'Failed to load deletion details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, recommendationId, backendUrl]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete recommendation. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] max-w-sm w-full overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#3D3C4A]">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('delete.title', { defaultMessage: 'Delete Recommendation' })}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 size={24} className="animate-spin text-coral" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('delete.loading', { defaultMessage: 'Calculating impact...' })}
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-3 text-sm text-coral hover:underline"
                >
                  {t('delete.close', { defaultMessage: 'Close' })}
                </button>
              </div>
            ) : preview ? (
              <>
                {/* Restaurant name context */}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('delete.confirmMessage', {
                    restaurant: restaurantName,
                    defaultMessage: `Are you sure you want to delete your recommendation for ${restaurantName}?`
                  })}
                </p>

                {/* Grace period badge */}
                {preview.within_grace_period ? (
                  <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <Clock size={18} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        {t('delete.gracePeriod', { defaultMessage: 'Within 15-minute grace period' })}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {t('delete.noBocaImpact', { defaultMessage: 'No BOCA will be affected.' })}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* BOCA impact panel */
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <Coins size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {t('delete.bocaDeduction', {
                            amount: preview.boca_impact.toFixed(1),
                            defaultMessage: `${preview.boca_impact.toFixed(1)} BOCA will be deducted`
                          })}
                        </p>
                        <div className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{t('delete.currentBalance', { defaultMessage: 'Current balance' })}</span>
                            <span className="font-medium">{preview.current_balance.toFixed(1)} BOCA</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('delete.deduction', { defaultMessage: 'Deduction' })}</span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -{preview.boca_impact.toFixed(1)} BOCA
                            </span>
                          </div>
                          <div className="border-t border-amber-200 dark:border-amber-700 pt-0.5 flex justify-between">
                            <span className="font-medium">{t('delete.newBalance', { defaultMessage: 'New balance' })}</span>
                            <span className={`font-bold ${preview.will_go_negative ? 'text-red-600 dark:text-red-400' : 'text-amber-800 dark:text-amber-300'}`}>
                              {preview.projected_balance.toFixed(1)} BOCA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Negative balance warning */}
                    {preview.will_go_negative && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-300">
                          {t('delete.negativeWarning', {
                            defaultMessage: 'Your balance will go negative. While negative, you won\'t be able to tip or spend BOCA, but you can earn it back through new recommendations and engagement.'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permanent action note */}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('delete.permanentNote', {
                    defaultMessage: 'This action cannot be undone. The recommendation will be removed from feeds, your profile, and search results.'
                  })}
                </p>
              </>
            ) : null}
          </div>

          {/* Actions */}
          {!isLoading && !error && (
            <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-[#3D3C4A]">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#353444] hover:bg-gray-200 dark:hover:bg-[#404050] rounded-xl transition-colors disabled:opacity-50"
              >
                {t('delete.cancel', { defaultMessage: 'Cancel' })}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('delete.deleting', { defaultMessage: 'Deleting...' })}
                  </>
                ) : (
                  t('delete.confirm', { defaultMessage: 'Delete' })
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteConfirmationModal;