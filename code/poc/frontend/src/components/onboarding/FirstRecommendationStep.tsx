// File: code/poc/frontend/src/components/onboarding/FirstRecommendationStep.tsx
// Step 5: Create first recommendation to complete onboarding
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Star, Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface FirstRecommendationStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

const FirstRecommendationStep: React.FC<FirstRecommendationStepProps> = ({
  onComplete,
  onSkip
}) => {
  const t = useTranslations('onboarding.firstRec');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRecommendation = () => {
    toast(t('toast.opening'), { icon: '✍️' });
    router.push('/create?onboarding=true');
  };

  const handleSkip = () => {
    toast(t('toast.skipped'), {
      icon: 'ℹ️'
    });
    onSkip();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')} 🎉
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </motion.div>

      {/* What to Include Guide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-orange-500" />
          {t('guide.title')}
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{t('guide.place.title')}</h4>
              <p className="text-sm text-gray-600">
                {t('guide.place.description')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{t('guide.loved.title')}</h4>
              <p className="text-sm text-gray-600">
                {t('guide.loved.description')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{t('guide.photos.title')}</h4>
              <p className="text-sm text-gray-600">
                {t('guide.photos.description')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Example Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white border-2 border-gray-200 rounded-xl p-4"
      >
        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
          {t('example.label')}
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">
            {t('example.title')}
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('example.content')}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              9/10
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Downtown, São Paulo
            </span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 pt-4"
      >
        <button
          onClick={handleCreateRecommendation}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
        >
          <Sparkles className="w-5 h-5" />
          {t('createButton')}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors text-sm"
        >
          {t('skipButton')}
        </button>
      </motion.div>

      {/* Encouragement Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-green-50 border border-green-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-green-900 mb-1">
          {t('encouragement.title')} 🎉
        </h3>
        <p className="text-sm text-green-800">
          {t('encouragement.description')}
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">10+</div>
          <div className="text-xs text-gray-600">{t('stats.earned')}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">✓</div>
          <div className="text-xs text-gray-600">{t('stats.complete')}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">🎯</div>
          <div className="text-xs text-gray-600">{t('stats.ready')}</div>
        </div>
      </div>
    </div>
  );
};

export default FirstRecommendationStep;