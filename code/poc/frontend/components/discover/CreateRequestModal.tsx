// File: code/poc/frontend/components/discover/CreateRequestModal.tsx
// Create Discovery Request Modal - Updated with BocaBoca brand colors

"use client"

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, MapPin, Utensils, Calendar, DollarSign, Loader2, Clock } from 'lucide-react';
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
  urgency: '7d' as string  // Default to 7 days
};

// BocaBoca Brand Colors
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
};

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const t = useTranslations();
  const [locationTouched, setLocationTouched] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const occasionOptions = [
    { value: 'date_night', label: t('discovery.createRequest.occasions.date_night') },
    { value: 'family', label: t('discovery.createRequest.occasions.family') },
    { value: 'business', label: t('discovery.createRequest.occasions.business') },
    { value: 'casual', label: t('discovery.createRequest.occasions.casual') },
    { value: 'celebration', label: t('discovery.createRequest.occasions.celebration') },
    { value: 'group', label: t('discovery.createRequest.occasions.group') },
    { value: 'solo', label: t('discovery.createRequest.occasions.solo') }
  ];

  const budgetOptions = [
    { value: '$', label: t('discovery.createRequest.budget.low') },
    { value: '$$', label: t('discovery.createRequest.budget.moderate') },
    { value: '$$$', label: t('discovery.createRequest.budget.upscale') },
    { value: '$$$$', label: t('discovery.createRequest.budget.fine') }
  ];

  const dietaryOptions = [
    { value: 'Vegetarian', label: t('discovery.createRequest.dietary.vegetarian') },
    { value: 'Vegan', label: t('discovery.createRequest.dietary.vegan') },
    { value: 'Gluten-Free', label: t('discovery.createRequest.dietary.glutenFree') },
    { value: 'Dairy-Free', label: t('discovery.createRequest.dietary.dairyFree') },
    { value: 'Nut-Free', label: t('discovery.createRequest.dietary.nutFree') },
    { value: 'Halal', label: t('discovery.createRequest.dietary.halal') },
    { value: 'Kosher', label: t('discovery.createRequest.dietary.kosher') }
  ];

  const urgencyOptions = [
    { value: '6h', label: '6 hours', description: 'Very urgent' },
    { value: '24h', label: '24 hours', description: 'Need it today' },
    { value: '3d', label: '3 days', description: 'This week' },
    { value: '7d', label: '7 days', description: 'Default' },
    { value: '14d', label: '2 weeks', description: 'Planning ahead' },
    { value: '30d', label: '30 days', description: 'No rush' }
  ];

  // Helper to calculate expiration date from urgency
  const calculateExpiresAt = (urgency: string): string => {
    const now = new Date();
    const match = urgency.match(/^(\d+)(h|d)$/);
    if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default 7 days
  
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

  // Toggle budget range - now supports multi-select (like dietary restrictions)
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
      toast.error(t('discovery.createRequest.validation.titleRequired'));
      return;
    }

    if (formData.title.length < 10) {
      toast.error(t('discovery.createRequest.validation.titleTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      
      if (!token) {
        toast.error(t('discovery.createRequest.validation.loginRequired'));
        setIsSubmitting(false);
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

      const response = await fetch(`${API_BASE_URL}/discovery/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim(),  // Now required
          cuisine_type: formData.cuisine_type || undefined,
          occasion: formData.occasion || undefined,
          budget_range: formData.budget_range.length > 0 ? formData.budget_range : undefined,
          dietary_restrictions: formData.dietary_restrictions.length > 0 ? formData.dietary_restrictions : undefined,
          expires_at: calculateExpiresAt(formData.urgency)  // Add this line
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('discovery.createRequest.error'));
      }

      toast.success(t('discovery.createRequest.success'));
      onSuccess(data.request.id);
      
      // Reset form after successful submission
      resetForm();
      
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error instanceof Error ? error.message : t('discovery.createRequest.error'));
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header - BocaBoca Coral Gradient */}
          <div className="sticky top-0 bg-gradient-to-r from-[#FF644A] to-[#E65441] px-6 py-4 flex items-center justify-between border-b border-[#E65441] z-10">
            <div className="flex items-center gap-3 text-white">
              <HelpCircle className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{t('discovery.createRequest.modal.title')}</h2>
                <p className="text-sm text-white/80">{t('discovery.createRequest.modal.subtitle')}</p>
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
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2">
                {t('discovery.createRequest.fields.title.label')} <span className="text-[#FF644A]">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('discovery.createRequest.fields.title.placeholder')}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
                maxLength={200}
                required
              />
              <p className="text-xs text-stone-500 mt-1">
                {t('discovery.createRequest.fields.title.charCount', { count: formData.title.length })}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2">
                {t('discovery.createRequest.fields.description.label')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('discovery.createRequest.fields.description.placeholder')}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent resize-none transition-shadow"
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-stone-500 mt-1">
                {t('discovery.createRequest.fields.description.charCount', { count: formData.description.length })}
              </p>
            </div>

            {/* Location - Required */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-[#FF644A]" />
                  {t('discovery.createRequest.fields.location.label')} <span className="text-[#FF644A]">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                onBlur={() => setLocationTouched(true)}
                placeholder={t('discovery.createRequest.fields.location.placeholder')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow ${
                  locationTouched && !formData.location.trim()
                    ? 'border-red-500 bg-red-50'
                    : 'border-stone-300'
                }`}
                required
              />
              {locationTouched && !formData.location.trim() ? (
                <p className="text-xs text-red-500 mt-1">
                  Location is required
                </p>
              ) : (
                <p className="text-xs text-stone-400 mt-1 italic">
                  City, neighborhood, region, or "anywhere" / "worldwide"
              </p>
              )}
            </div>

            {/* Cuisine Type */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2 flex items-center gap-2">
                <Utensils size={16} className="text-[#FF644A]" />
                {t('discovery.createRequest.fields.cuisineType.label')}
              </label>
              <input
                type="text"
                value={formData.cuisine_type}
                onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                placeholder={t('discovery.createRequest.fields.cuisineType.placeholder')}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow"
              />
            </div>

            {/* Occasion */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-[#FF644A]" />
                {t('discovery.createRequest.fields.occasion.label')}
              </label>
              <select
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-shadow bg-white"
              >
                <option value="">{t('discovery.createRequest.fields.occasion.placeholder')}</option>
                {occasionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range - Multi-select (click to toggle) */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-[#FF644A]" />
                {t('discovery.createRequest.fields.budgetRange.label')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {budgetOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleBudgetRange(option.value)}
                    className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                      formData.budget_range.includes(option.value)
                        ? 'border-[#FF644A] bg-[#FFF4E1] text-[#FF644A]'
                        : 'border-stone-300 hover:border-stone-400 text-[#1F1E2A]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {/* Helper text - hardcoded to avoid missing translation errors */}
              <p className="text-xs text-stone-400 mt-2 italic">
                Select one or more • Click again to deselect
              </p>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-3">
                {t('discovery.createRequest.fields.dietary.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleDietaryRestriction(option.value)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      formData.dietary_restrictions.includes(option.value)
                        ? 'border-[#FF644A] bg-[#FFF4E1] text-[#FF644A]'
                        : 'border-stone-300 hover:border-stone-400 text-[#1F1E2A]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Urgency / Expiration */}
            <div>
              <label className="block text-sm font-medium text-[#1F1E2A] mb-2 flex items-center gap-2">
                <Clock size={16} className="text-[#FF644A]" />
                How soon do you need recommendations?
              </label>
                <div className="grid grid-cols-3 gap-2">
                  {urgencyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: option.value })}
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        formData.urgency === option.value
                          ? 'border-[#FF644A] bg-[#FFF4E1] text-[#FF644A]'
                          : 'border-stone-300 hover:border-stone-400 text-[#1F1E2A]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {/* Expiration Preview */}
                <div className="mt-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-200">
                  <p className="text-xs text-stone-500">
                    Request will expire: <span className="font-medium text-[#1F1E2A]">{formatExpirationPreview(formData.urgency)}</span>
                  </p>
                </div>
              </div>

            {/* Info Box - Using Mint Breeze for helpful tips */}
            <div className="bg-[#BFE2D9]/30 border border-[#BFE2D9] rounded-lg p-4">
              <p className="text-sm text-[#1F1E2A]">
                💡 {t('discovery.createRequest.tip')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 text-[#1F1E2A] hover:bg-stone-100 rounded-lg transition-colors"
                disabled={isSubmitting || !formData.title.trim() || formData.title.length < 10 || !formData.location.trim()}
              >
                {t('discovery.createRequest.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || formData.title.length < 10}
                className="px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('discovery.createRequest.actions.creating')}
                  </>
                ) : (
                  t('discovery.createRequest.actions.submit')
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