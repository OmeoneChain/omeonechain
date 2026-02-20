'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function DeleteAccountSection() {
  const t = useTranslations();
  const router = useRouter();
  const { token, logout } = useAuth();

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

  const handleDeleteAccount = async () => {
    if (!token) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const url = `${API_BASE.replace(/\/+$/, '')}/auth/account`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Account deleted — log out and redirect
        await logout();
        router.push('/');
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.error || t('profile.deleteAccount.error'));
      }
    } catch (e) {
      console.error('Account deletion failed:', e);
      setDeleteError(t('profile.deleteAccount.error'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Danger Zone */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#3D3C4A]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
          <h4 className="font-medium text-red-800 dark:text-red-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            {t('profile.deleteAccount.dangerZone')}
          </h4>
          <p className="text-sm text-red-700 dark:text-red-400/80 mb-4">
            {t('profile.deleteAccount.description')}
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            {t('profile.deleteAccount.button')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-[#3D3C4A]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('profile.deleteAccount.confirmTitle')}
                </h3>
              </div>
              <button
                onClick={() => { setShowConfirm(false); setDeleteError(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('profile.deleteAccount.confirmMessage')}
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 ml-4 list-disc">
                <li>{t('profile.deleteAccount.warning1')}</li>
                <li>{t('profile.deleteAccount.warning2')}</li>
                <li>{t('profile.deleteAccount.warning3')}</li>
                <li>{t('profile.deleteAccount.warning4')}</li>
              </ul>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowConfirm(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#4D4C5A] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#353444] text-sm font-medium"
              >
                {t('profile.deleteAccount.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('profile.deleteAccount.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('profile.deleteAccount.confirmButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}