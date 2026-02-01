// app/[locale]/create/recommendation/page.tsx
// Server component wrapper — loads creation flow client-side only
// Prevents useState/useTranslations errors during static prerendering

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