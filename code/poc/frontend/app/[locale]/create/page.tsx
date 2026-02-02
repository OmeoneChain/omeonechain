// app/[locale]/create/page.tsx - Hub for content creation
"use client"

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import CleanHeader from '@/components/CleanHeader';
import dynamic from 'next/dynamic';
import { PenSquare, ListOrdered, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';

// Import the creation modals (same ones used in Discover page)
const CreateListFlow = dynamic(
  () => import('@/components/lists/CreateListFlow'),
  { ssr: false }
);

const CreateRequestModal = dynamic(
  () => import('@/components/discover/CreateRequestModal'),
  { ssr: false }
);

const CreatePage: React.FC = () => {
  const t = useTranslations('create');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Modal states
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOptionClick = (option: string) => {
    switch (option) {
      case 'recommendation':
        router.push('/create/recommendation');
        break;
      case 'list':
        setShowCreateListModal(true);
        break;
      case 'request':
        setShowCreateRequestModal(true);
        break;
    }
  };

  // Success handlers
  const handleCreateListSuccess = (listId: string) => {
    setShowCreateListModal(false);
    router.push('/feed');
  };

  const handleCreateRequestSuccess = () => {
    setShowCreateRequestModal(false);
    router.push('/feed');
  };

  // Loading state for hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4 text-[#1F1E2A] dark:text-white">
              {t('hub.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('hub.subtitle')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      {/* Header with navigation */}
      <CleanHeader />
      
      {/* Main content */}
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-[#1F1E2A] dark:text-white">
              {t('hub.title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('hub.subtitle')}
            </p>
          </div>

          {/* Creation Options */}
          <div className="space-y-4">
            {/* Recommendation - Active */}
            <button
              onClick={() => handleOptionClick('recommendation')}
              className="w-full bg-white dark:bg-[#2D2C3A] rounded-xl p-5 shadow-sm hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 text-left group border border-gray-200 dark:border-[#3D3C4A]"
            >
              <div className="flex items-center gap-4">
                {/* Icon with coral background */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)' }}
                >
                  <PenSquare className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#1F1E2A] dark:text-white group-hover:text-[#FF644A] transition-colors">
                    {t('hub.options.recommendation.title')}
                  </h3>
                  <p className="text-sm mt-0.5 text-gray-600 dark:text-gray-400">
                    {t('hub.options.recommendation.description')}
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </button>

            {/* Curated List - Now Active */}
            <button
              onClick={() => handleOptionClick('list')}
              className="w-full bg-white dark:bg-[#2D2C3A] rounded-xl p-5 shadow-sm hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 text-left group border border-gray-200 dark:border-[#3D3C4A]"
            >
              <div className="flex items-center gap-4">
                {/* Icon with mint background */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform bg-[#BFE2D9] dark:bg-[#BFE2D9]/20">
                  <ListOrdered className="w-7 h-7 text-[#2D7A5F] dark:text-[#6EE7B7]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#1F1E2A] dark:text-white group-hover:text-[#2D7A5F] dark:group-hover:text-[#6EE7B7] transition-colors">
                    {t('hub.options.list.title')}
                  </h3>
                  <p className="text-sm mt-0.5 text-gray-600 dark:text-gray-400">
                    {t('hub.options.list.description')}
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </button>

            {/* Request - Now Active */}
            <button
              onClick={() => handleOptionClick('request')}
              className="w-full bg-white dark:bg-[#2D2C3A] rounded-xl p-5 shadow-sm hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 text-left group border border-gray-200 dark:border-[#3D3C4A]"
            >
              <div className="flex items-center gap-4">
                {/* Icon with plum background */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform bg-[#E9E4EC] dark:bg-[#E9E4EC]/20">
                  <HelpCircle className="w-7 h-7 text-[#35273B] dark:text-[#D8B4FE]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#1F1E2A] dark:text-white group-hover:text-[#35273B] dark:group-hover:text-[#D8B4FE] transition-colors">
                    {t('hub.options.request.title')}
                  </h3>
                  <p className="text-sm mt-0.5 text-gray-600 dark:text-gray-400">
                    {t('hub.options.request.description')}
                  </p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </button>
          </div>

          {/* Rewards Hint - Subtle */}
          <div className="mt-8 text-center">
            <a 
              href="/rewards" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors group"
            >
              <Sparkles className="w-4 h-4 text-[#FFB84D] group-hover:scale-110 transition-transform" />
              <span>{t('hub.rewardsHint')}</span>
              <span className="font-medium text-[#FF644A]">
                {t('hub.learnMore')}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Creation Modals */}
      <CreateListFlow
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onSuccess={handleCreateListSuccess}
      />

      <CreateRequestModal
        isOpen={showCreateRequestModal}
        onClose={() => setShowCreateRequestModal(false)}
        onSuccess={handleCreateRequestSuccess}
      />
    </div>
  );
};

export default CreatePage;