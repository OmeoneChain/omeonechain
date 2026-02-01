// app/[locale]/create/recommendation/layout.tsx
// Prevent static prerendering — this page depends on auth context and i18n providers
export const dynamic = 'force-dynamic';

export default function CreateRecommendationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}