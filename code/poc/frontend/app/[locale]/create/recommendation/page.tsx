// app/[locale]/create/recommendation/page.tsx
// Client wrapper — loads creation flow dynamically to avoid prerender crashes
"use client";

import dynamic from 'next/dynamic';

const RecommendationCreationFlow = dynamic(
  () => import('@/components/recommendation/RecommendationCreationFlow'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#FF644A]" />
      </div>
    )
  }
);

export default function CreateRecommendationPage() {
  return <RecommendationCreationFlow />;
}