// File: code/poc/frontend/components/discover/CreateRequestModal.tsx
// Create Discovery Request Modal - Updated with BOCA staking (bounty) functionality
// UPDATED: Dark mode support and full i18n translation keys
// FIXED: Changed 'discovery.' to 'discover.' to match translation file namespace

"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, MapPin, Utensils, Calendar, DollarSign, Loader2, Clock, Coins, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

// Initial form state for easy reset
const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  location: '',
  cuisine_type: '',
  occasion: '',
  budget_range: [] as string[],
  dietary_restrictions: [] as string[],
  urgency: '7d' as string,
  stake_amount: '1.0'
};

// Quick stake amount options
const STAKE_PRESETS = [1, 5, 10, 25];
const MIN_STAKE = 1.0;

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const t = useTranslations();
  const [locationTouched, setLocationTouched] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  
  // Token balance state
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const occasionOptions = [
    { value: 'date_night', label: t('discover.createRequest.occasions.date_night') },
    { value: 'family', label: t('discover.createRequest.occasions.family') },
    { value: 'business', label: t('discover.createRequest.occasions.business') },
    { value: 'casual', label: t('discover.createRequest.occasions.casual') },
    { value: 'celebration', label: t('discover.createRequest.occasions.celebration') },
    { value: 'group', label: t('discover.createRequest.occasions.group') },
    { value: 'solo', label: t('discover.createRequest.occasions.solo') }
  ];

  const budgetOptions = [
    { value: '$', label: t('discover.createRequest.budget.low') },
    { value: '$$', label: t('discover.createRequest.budget.moderate') },
    { value: '$$$', label: t('discover.createRequest.budget.upscale') },
    { value: '$$$$', label: t('discover.createRequest.budget.fine') }
  ];

  const dietaryOptions = [
    { value: 'Vegetarian', label: t('discover.createRequest.dietary.vegetarian') },
    { value: 'Vegan', label: t('discover.createRequest.dietary.vegan') },
    { value: 'Gluten-Free', label: t('discover.createRequest.dietary.glutenFree') },
    { value: 'Dairy-Free', label: t('discover.createRequest.dietary.dairyFree') },
    { value: 'Nut-Free', label: t('discover.createRequest.dietary.nutFree') },
    { value: 'Halal', label: t('discover.createRequest.dietary.halal') },
    { value: 'Kosher', label: t('discover.createRequest.dietary.kosher') }
  ];

  const urgencyOptions = [
    { value: '6h', label: t('discover.createRequest.urgency.6h') || '6 hours' },
    { value: '24h', label: t('discover.createRequest.urgency.24h') || '24 hours' },
    { value: '3d', label: t('discover.createRequest.urgency.3d') || '3 days' },
    { value: '7d', label: t('discover.createRequest.urgency.7d') || '7 days' },
    { value: '14d', label: t('discover.createRequest.urgency.14d') || '2 weeks' },
    { value: '30d', label: t('discover.createRequest.urgency.30d') || '30 days' }
  ];

  // Fetch token balance when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTokenBalance();
    }
  }, [isOpen]);

  const fetchTokenBalance = async () => {
    setIsLoadingBalance(true);
    setBalanceError(null);
    
    try {
      const token = localStorage.getItem('omeone_auth_token');
      if (!token) {
        setBalanceError(t('discover.createRequest.stake.loginRequired') || 'Please log in to create a request');
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';
      
      const response = await fetch(`${API_BASE_URL}/tokens/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setTokenBalance(data.balance ?? data.tokens_earned ?? 0);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setBalanceError(t('discover.createRequest.stake.balanceError') || 'Unable to load token balance');
      setTokenBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Helper to calculate expiration date from urgency
  const calculateExpiresAt = (urgency: string): string => {
    const now = new Date();
    const match = urgency.match(/^(\d+)(h|d)$/);
    if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
    const value = parseInt(match[1]);
    const unit = match[2];
  
    if (unit === 'h') {
      now.setHours(now.getHours() + value);
    } else if (unit === 'd') {
      now.setDate(now.getDate() + value);
    }
  
    return now.toISOString();
  };

  // Helper to format expiration preview
  const formatExpirationPreview = (urgency: string): string => {
    const expiresAt = new Date(calculateExpiresAt(urgency));
    return expiresAt.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Parse stake amount safely
  const getStakeAmount = (): number => {
    const parsed = parseFloat(formData.stake_amount);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Check if stake amount is valid
  const isStakeValid = (): boolean => {
    const stake = getStakeAmount();
    return stake >= MIN_STAKE && (tokenBalance === null || stake <= tokenBalance);
  };

  // Get stake validation message
  const getStakeValidationMessage = (): string | null => {
    const stake = getStakeAmount();
    if (stake < MIN_STAKE) {
      return t('discover.createRequest.stake.minStake', { amount: MIN_STAKE }) || `Minimum stake is ${MIN_STAKE} BOCA`;
    }
    if (tokenBalance !== null && stake > tokenBalance) {
      return t('discover.createRequest.stake.insufficientBalance', { balance: tokenBalance.toFixed(1) }) || `Insufficient balance (${tokenBalance.toFixed(1)} BOCA available)`;
    }
    return null;
  };

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_STATE, budget_range: [], dietary_restrictions: [] });
    setLocationTouched(false);
  }, []);

  // Handle modal close - always reset form
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Toggle budget range - now supports multi-select
  const toggleBudgetRange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      budget_range: prev.budget_range.includes(value)
        ? prev.budget_range.filter(b => b !== value)
        : [...prev.budget_range, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error(t('discover.createRequest.validation.titleRequired'));
      return;
    }

    if (formData.title.length < 10) {
      toast.error(t('discover.createRequest.validation.titleTooShort'));
      return;
    }

    if (!formData.location.trim()) {
      toast.error(t('discover.createRequest.validation.locationRequired') || 'Location is required');
      return;
    }

    // Stake validation
    if (!isStakeValid()) {
      const message = getStakeValidationMessage();
      toast.error(message || 'Invalid stake amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      
      if (!token) {
        toast.error(t('discover.createRequest.validation.loginRequired'));
        setIsSubmitting(false);
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

      const response = await fetch(`${API_BASE_URL}/bounty/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim(),
          cuisine_type: formData.cuisine_type || undefined,
          occasion: formData.occasion || undefined,
          budget_range: formData.budget_range.length > 0 ? formData.budget_range : undefined,
          dietary_restrictions: formData.dietary_restrictions.length > 0 ? formData.dietary_restrictions : undefined,
          expires_at: calculateExpiresAt(formData.urgency),
          stake_amount: getStakeAmount()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('discover.createRequest.error'));
      }

      toast.success(t('discover.createRequest.stake.successMessage', { amount: getStakeAmount() }) || `Request created! ${getStakeAmount()} BOCA staked`);
      onSuccess(data.bounty?.id || data.request?.id || data.id);
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error instanceof Error ? error.message : t('discover.createRequest.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }));
  };

  if (!isOpen) return null;

  const stakeAmount = getStakeAmount();
  const winnerAmount = (stakeAmount * 0.9).toFixed(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header - BocaBoca Coral Gradient */}
          <div className="sticky top-0 bg-gradient-to-r from-[#FF644A] to-[#E65441] px-6 py-4 flex items-center justify-between border-b border-[#E65441] z-10">
            <div className="flex items-center gap-3 text-white">
              <HelpCircle className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{t('discover.createRequest.modal.title')}</h2>
                <p className="text-sm text-white/80">{t('discover.createRequest.modal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Token Balance & Stake Amount Section */}
            <div className="bg-gradient-to-r from-[#FFF4E1] to-[#BFE2D9]/30 dark:from-[#353444] dark:to-[#2D4A44] border border-[#BFE2D9] dark:border-[#3D3C4A] rounded-lg p-4 space-y-4">
              {/* Balance Display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#1F1E2A] dark:text-white">
                  <Coins className="w-5 h-5 text-[#FF644A]" />
                  <span className="font-medium">{t('discover.createRequest.stake.balance') || 'Your Balance'}</span>
                </div>
                <div className="text-right">
                  {isLoadingBalance ? (
                    <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('discover.createRequest.stake.loading') || 'Loading...'}
                    </span>
                  ) : balanceError ? (
                    <span className="text-red-500 dark:text-red-400 text-sm">{balanceError}</span>
                  ) : (
                    <span className="font-bold text-[#1F1E2A] dark:text-white">
                      {tokenBalance?.toFixed(1) ?? '0.0'} BOCA
                    </span>
                  )}
                </div>
              </div>

              {/* Stake Amount Input */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('discover.createRequest.stake.amount') || 'Stake Amount'} <span className="text-[#FF644A]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min={MIN_STAKE}
                      value={formData.stake_amount}
                      onChange={(e) => setFormData({ ...formData, stake_amount: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow pr-16 bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white ${
                        !isStakeValid() && formData.stake_amount 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                          : 'border-gray-300 dark:border-[#3D3C4A]'
                      }`}
                      placeholder="1.0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                      BOCA
                    </span>
                  </div>
                </div>
                
                {/* Quick Select Buttons */}
                <div className="flex gap-2 mt-2">
                  {STAKE_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setFormData({ ...formData, stake_amount: amount.toString() })}
                      disabled={tokenBalance !== null && amount > tokenBalance}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        parseFloat(formData.stake_amount) === amount
                          ? 'border-[#FF644A] bg-[#FF644A] text-white'
                          : tokenBalance !== null && amount > tokenBalance
                            ? 'border-gray-200 dark:border-[#3D3C4A] text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'border-gray-300 dark:border-[#3D3C4A] hover:border-[#FF644A] text-[#1F1E2A] dark:text-white'
                      }`}
                    >
                      {amount} BOCA
                    </button>
                  ))}
                </div>

                {/* Validation Message */}
                {getStakeValidationMessage() && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {getStakeValidationMessage()}
                  </p>
                )}
              </div>

              {/* Reward Explainer */}
              <div className="bg-white/60 dark:bg-[#2D2C3A]/60 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center justify-between text-[#1F1E2A] dark:text-white">
                  <span>{t('discover.createRequest.stake.winnerReceives') || 'Winner receives:'}</span>
                  <span className="font-bold text-[#FF644A]">{winnerAmount} BOCA (90%)</span>
                </div>
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mt-1">
                  <span>{t('discover.createRequest.stake.platformFee') || 'Platform fee:'}</span>
                  <span>{(stakeAmount * 0.1).toFixed(1)} BOCA (10%)</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                {t('discover.createRequest.fields.title.label')} <span className="text-[#FF644A]">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('discover.createRequest.fields.title.placeholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#3D3C4A] rounded-lg bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.title.length}/200 {t('discover.createRequest.fields.title.characters') || 'characters'}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                {t('discover.createRequest.fields.description.label')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('discover.createRequest.fields.description.placeholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#3D3C4A] rounded-lg bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent resize-none transition-shadow"
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.description.length}/1000 {t('discover.createRequest.fields.description.characters') || 'characters'}
              </p>
            </div>

            {/* Location - Required */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-[#FF644A]" />
                {t('discover.createRequest.fields.location.label')} <span className="text-[#FF644A]">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                onBlur={() => setLocationTouched(true)}
                placeholder={t('discover.createRequest.fields.location.placeholder')}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow ${
                  locationTouched && !formData.location.trim()
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-[#3D3C4A]'
                }`}
                required
              />
              {locationTouched && !formData.location.trim() ? (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {t('discover.createRequest.validation.locationRequired') || 'Location is required'}
                </p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                  {t('discover.createRequest.fields.location.hint') || 'City, neighborhood, region, or "anywhere" / "worldwide"'}
                </p>
              )}
            </div>

            {/* Cuisine Type */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 flex items-center gap-2">
                <Utensils size={16} className="text-[#FF644A]" />
                {t('discover.createRequest.fields.cuisineType.label')}
              </label>
              <input
                type="text"
                value={formData.cuisine_type}
                onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                placeholder={t('discover.createRequest.fields.cuisineType.placeholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#3D3C4A] rounded-lg bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
              />
            </div>

            {/* Occasion */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-[#FF644A]" />
                {t('discover.createRequest.fields.occasion.label')}
              </label>
              <select
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#3D3C4A] rounded-lg bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
              >
                <option value="">{t('discover.createRequest.fields.occasion.placeholder')}</option>
                {occasionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range - Multi-select */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-[#FF644A]" />
                {t('discover.createRequest.fields.budgetRange.label')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {budgetOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleBudgetRange(option.value)}
                    className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                      formData.budget_range.includes(option.value)
                        ? 'border-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A]'
                        : 'border-gray-300 dark:border-[#3D3C4A] hover:border-gray-400 dark:hover:border-gray-500 text-[#1F1E2A] dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                {t('discover.createRequest.fields.budgetRange.hint') || 'Select one or more • Click again to deselect'}
              </p>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-3">
                {t('discover.createRequest.fields.dietary.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleDietaryRestriction(option.value)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      formData.dietary_restrictions.includes(option.value)
                        ? 'border-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A]'
                        : 'border-gray-300 dark:border-[#3D3C4A] hover:border-gray-400 dark:hover:border-gray-500 text-[#1F1E2A] dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Urgency / Expiration */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 flex items-center gap-2">
                <Clock size={16} className="text-[#FF644A]" />
                {t('discover.createRequest.fields.urgency.label') || 'How soon do you need recommendations?'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {urgencyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: option.value })}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      formData.urgency === option.value
                        ? 'border-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A]'
                        : 'border-gray-300 dark:border-[#3D3C4A] hover:border-gray-400 dark:hover:border-gray-500 text-[#1F1E2A] dark:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {/* Expiration Preview */}
              <div className="mt-2 px-3 py-2 bg-gray-50 dark:bg-[#353444] rounded-lg border border-gray-200 dark:border-[#3D3C4A]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('discover.createRequest.fields.urgency.expiresLabel') || 'Request will expire:'}{' '}
                  <span className="font-medium text-[#1F1E2A] dark:text-white">{formatExpirationPreview(formData.urgency)}</span>
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#BFE2D9]/30 dark:bg-[#BFE2D9]/10 border border-[#BFE2D9] dark:border-[#BFE2D9]/30 rounded-lg p-4">
              <p className="text-sm text-[#1F1E2A] dark:text-gray-300">
                💡 {t('discover.createRequest.tip')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#3D3C4A]">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 text-[#1F1E2A] dark:text-white hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
              >
                {t('discover.createRequest.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || formData.title.length < 10 || !formData.location.trim() || !isStakeValid()}
                className="px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('discover.createRequest.actions.creating')}
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    {t('discover.createRequest.actions.submit', { amount: getStakeAmount().toFixed(1) }) || `Post Request (${getStakeAmount().toFixed(1)} BOCA)`}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateRequestModal;