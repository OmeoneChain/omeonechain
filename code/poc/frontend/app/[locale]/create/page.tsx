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
    // Navigate to the newly created list
    router.push(`/list/${listId}`);
  };

  const handleCreateRequestSuccess = () => {
    setShowCreateRequestModal(false);
    // Navigate to discover page with requests tab active
    router.push('/discover?tab=requests');
  };

  // Loading state for hydration
  if (!mounted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FFF4E1' }}>
        <CleanHeader currentPath="/create" />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
              {t('hub.title')}
            </h1>
            <p style={{ color: '#666' }}>
              {t('hub.subtitle')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF4E1' }}>
      {/* Header with navigation */}
      <CleanHeader currentPath="/create" />
      
      {/* Main content */}
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: '#1F1E2A' }}>
              {t('hub.title')}
            </h1>
            <p className="text-lg" style={{ color: '#666' }}>
              {t('hub.subtitle')}
            </p>
          </div>

          {/* Creation Options */}
          <div className="space-y-4">
            {/* Recommendation - Active */}
            <button
              onClick={() => handleOptionClick('recommendation')}
              className="w-full bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
              style={{ border: '1px solid #E5E5E5' }}
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
                  <h3 
                    className="text-lg font-semibold group-hover:text-[#FF644A] transition-colors"
                    style={{ color: '#1F1E2A' }}
                  >
                    {t('hub.options.recommendation.title')}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: '#666' }}>
                    {t('hub.options.recommendation.description')}
                  </p>
                </div>
                
                <ChevronRight 
                  className="w-5 h-5 group-hover:translate-x-1 transition-all flex-shrink-0" 
                  style={{ color: '#9CA3AF' }}
                />
              </div>
            </button>

            {/* Curated List - Now Active */}
            <button
              onClick={() => handleOptionClick('list')}
              className="w-full bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="flex items-center gap-4">
                {/* Icon with mint background */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#BFE2D9' }}
                >
                  <ListOrdered className="w-7 h-7" style={{ color: '#2D7A5F' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-lg font-semibold group-hover:text-[#2D7A5F] transition-colors"
                    style={{ color: '#1F1E2A' }}
                  >
                    {t('hub.options.list.title')}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: '#666' }}>
                    {t('hub.options.list.description')}
                  </p>
                </div>
                
                <ChevronRight 
                  className="w-5 h-5 group-hover:translate-x-1 transition-all flex-shrink-0" 
                  style={{ color: '#9CA3AF' }}
                />
              </div>
            </button>

            {/* Request - Now Active */}
            <button
              onClick={() => handleOptionClick('request')}
              className="w-full bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="flex items-center gap-4">
                {/* Icon with plum background */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#E9E4EC' }}
                >
                  <HelpCircle className="w-7 h-7" style={{ color: '#35273B' }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-lg font-semibold group-hover:text-[#35273B] transition-colors"
                    style={{ color: '#1F1E2A' }}
                  >
                    {t('hub.options.request.title')}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: '#666' }}>
                    {t('hub.options.request.description')}
                  </p>
                </div>
                
                <ChevronRight 
                  className="w-5 h-5 group-hover:translate-x-1 transition-all flex-shrink-0" 
                  style={{ color: '#9CA3AF' }}
                />
              </div>
            </button>
          </div>

          {/* Rewards Hint - Subtle */}
          <div className="mt-8 text-center">
            <a 
              href="/rewards" 
              className="inline-flex items-center gap-2 text-sm transition-colors group"
              style={{ color: '#666' }}
            >
              <Sparkles 
                className="w-4 h-4 group-hover:scale-110 transition-transform" 
                style={{ color: '#FFB84D' }} 
              />
              <span>{t('hub.rewardsHint')}</span>
              <span className="font-medium" style={{ color: '#FF644A' }}>
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