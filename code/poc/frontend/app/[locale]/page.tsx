// app/[locale]/page.tsx - Landing page with carousel design
// REDESIGNED: Matches mobile WelcomeCarousel with side-by-side desktop layout
// No header for unauthenticated users - clean conversion-focused experience
// All users flow through Get Started → phone signup → wallet upgrade later
// FIX: Get Started links to /onboarding?step=phone to skip redundant carousel
// Updated: Feb 7, 2026

"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import AuthService from '@/services/auth';
import { useTranslations } from 'next-intl';
import { useCapacitor } from '@/hooks/useCapacitor';

// ============================================
// SLIDE DATA - Same as mobile WelcomeCarousel
// ============================================
interface Slide {
  id: string;
  titleKey: string;
  subtitleKey: string;
  fallbackTitle: string;
  fallbackSubtitle: string;
  image: string;
  imageAlt: string;
}

const slides: Slide[] = [
  {
    id: 'trust',
    titleKey: 'welcome.slide1.title',
    subtitleKey: 'welcome.slide1.subtitle',
    fallbackTitle: "Trust Your Network's Taste",
    fallbackSubtitle: 'Find restaurants recommended by people you actually trust — not strangers or algorithms.',
    image: '/images/onboarding/slide-trust.jpg',
    imageAlt: 'Friends sharing pizza around a table',
  },
  {
    id: 'never-lost',
    titleKey: 'welcome.slide2.title',
    subtitleKey: 'welcome.slide2.subtitle',
    fallbackTitle: 'Never Lost in the Scroll',
    fallbackSubtitle: "That perfect restaurant rec from your friend? It's saved, searchable, and there when you need it.",
    image: '/images/onboarding/slide-never-lost.jpg',
    imageAlt: 'Cozy coffee and croissants at a cafe',
  },
  {
    id: 'ownership',
    titleKey: 'welcome.slide3.title',
    subtitleKey: 'welcome.slide3.subtitle',
    fallbackTitle: 'Your Taste, Your Data',
    fallbackSubtitle: "Build a taste profile that's yours — portable, private, and always improving.",
    image: '/images/onboarding/slide-ownership.jpg',
    imageAlt: 'Chef carefully plating a dish',
  },
];

// ============================================
// MAIN LANDING PAGE COMPONENT
// ============================================
const LandingPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Auth
  const { isAuthenticated, isLoading, isHydrated } = useAuth() as any;
  const router = useRouter();
  const t = useTranslations('landing');
  const tOnboarding = useTranslations('onboarding');
  const { isCapacitor } = useCapacitor();

  // ============================================
  // CAROUSEL LOGIC
  // ============================================
  const goToSlide = useCallback((index: number) => {
    if (index === currentSlide || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [currentSlide, isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, goToSlide]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [mounted, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToSlide((currentSlide + 1) % slides.length);
      if (e.key === 'ArrowLeft') goToSlide((currentSlide - 1 + slides.length) % slides.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, goToSlide]);

  // ============================================
  // AUTH & REDIRECT LOGIC (preserved from original)
  // ============================================
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isHydrated && isAuthenticated) {
      console.log('🔄 Landing: User is authenticated, redirecting to feed...');
      router.replace('/feed');
    }
  }, [mounted, isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (mounted && isHydrated && isCapacitor && !isAuthenticated && !isLoading) {
      console.log('📱 Mobile: Redirecting unauthenticated user to onboarding...');
      router.replace('/onboarding');
    }
  }, [mounted, isHydrated, isCapacitor, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!mounted) return;
    
    const hash = window.location.hash;
    if (!hash || (!hash.includes('auth_token') && !hash.includes('auth_success') && !hash.includes('auth_error'))) {
      return;
    }

    console.log('🔍 OAuth callback detected, processing...');
    const result = AuthService.handleOAuthCallback();

    if (result.success) {
      setIsProcessingOAuth(true);
      console.log('✅ OAuth callback processed successfully');

      const userData = result.user || JSON.parse(localStorage.getItem('user') || '{}');
      const isNewUser = result.isNewUser || userData.onboarding_completed === false;

      setTimeout(() => {
        if (isNewUser) {
          window.location.href = '/onboarding';
        } else {
          window.location.href = '/feed';
        }
      }, 500);

    } else if (result.error) {
      console.error('❌ OAuth failed:', result.error);
      alert(`Authentication failed: ${result.error}`);
    }
  }, [mounted]);

  // ============================================
  // LOADING STATES
  // ============================================
  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF644A] mx-auto mb-4"></div>
          <p className="font-medium text-[#1F1E2A] dark:text-gray-100">{t('loading.signingIn')}</p>
          <p className="text-sm mt-2 text-[#666666] dark:text-gray-400">{t('loading.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (!mounted || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="text-center">
          <div className="mb-6">
            <Logo size="lg" variant="icon" />
          </div>
          <div className="animate-pulse">
            <div className="h-2 w-24 bg-[#FF644A]/30 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF644A] mx-auto mb-4"></div>
          <p className="font-medium text-[#1F1E2A] dark:text-gray-100">{t('loading.signingIn')}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // CURRENT SLIDE DATA
  // ============================================
  const slide = slides[currentSlide];

  // ============================================
  // MAIN LANDING PAGE - No header, conversion-focused
  // ============================================
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF4E1] dark:bg-[#1F1E2A]">

      {/* ============================================ */}
      {/* SUBTLE LOGO - Top left, no navigation       */}
      {/* ============================================ */}
      <div className="absolute top-0 left-0 z-10 p-4 md:p-6">
        <Link href="/" aria-label="BocaBoca home">
          <Image
            src="/BocaBoca_Logo.png"
            alt="BocaBoca"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* ============================================ */}
      {/* HERO CAROUSEL SECTION                       */}
      {/* Desktop: side-by-side | Mobile: stacked     */}
      {/* ============================================ */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col md:flex-row items-stretch max-w-7xl w-full mx-auto">
          
          {/* ============================== */}
          {/* IMAGE SIDE (left on desktop)   */}
          {/* ============================== */}
          <div className="relative w-full md:w-1/2 h-[40vh] md:h-auto md:min-h-[calc(100vh-80px)]">
            {slides.map((s, index) => (
              <div
                key={s.id}
                className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={s.image}
                  alt={s.imageAlt}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ))}
            
            {/* Gradient fade - bottom on mobile, right edge on desktop */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-24 md:hidden pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,244,225,0) 0%, rgba(255,244,225,0.7) 50%, rgba(255,244,225,1) 100%)'
              }}
            />
            <div 
              className="hidden md:block absolute top-0 right-0 bottom-0 w-24 pointer-events-none"
              style={{
                background: 'linear-gradient(to right, rgba(255,244,225,0) 0%, rgba(255,244,225,0.5) 60%, rgba(255,244,225,1) 100%)'
              }}
            />
          </div>

          {/* ============================== */}
          {/* CONTENT SIDE (right on desktop)*/}
          {/* ============================== */}
          <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8 md:py-12">
            
            {/* BocaBoca wordmark */}
            <div className="mb-2">
              <span className="text-3xl md:text-4xl font-bold text-[#1F1E2A] dark:text-gray-100">
                BocaBoca
              </span>
            </div>

            {/* Slide title - animated */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`title-${currentSlide}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F1E2A] dark:text-gray-100 leading-tight mb-4"
              >
                {tOnboarding(slide.titleKey) || slide.fallbackTitle}
              </motion.h1>
            </AnimatePresence>

            {/* Slide subtitle - animated */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`subtitle-${currentSlide}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="text-base sm:text-lg text-[#1F1E2A]/70 dark:text-gray-400 leading-relaxed mb-8 max-w-md"
              >
                {tOnboarding(slide.subtitleKey) || slide.fallbackSubtitle}
              </motion.p>
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="flex items-center gap-2.5 mb-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-[#1F1E2A] dark:bg-gray-100 w-7'
                      : 'bg-[#1F1E2A]/25 dark:bg-gray-100/25 w-2.5 hover:bg-[#1F1E2A]/40 dark:hover:bg-gray-100/40'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* CTA Buttons - Link to /onboarding?step=phone to skip carousel */}
            <div className="space-y-4 max-w-sm">
              <Link
                href="/onboarding?step=phone"
                className="block w-full py-4 px-6 bg-[#FF644A] text-white font-semibold text-lg rounded-2xl shadow-lg hover:bg-[#E65441] active:scale-[0.98] transition-all duration-200 text-center"
              >
                {tOnboarding('welcome.getStarted') || 'Get Started'}
              </Link>

              <Link
                href="/onboarding?step=phone"
                className="block w-full py-3 text-[#1F1E2A]/70 dark:text-gray-400 font-medium hover:text-[#1F1E2A] dark:hover:text-gray-200 transition-colors text-center"
              >
                {tOnboarding('welcome.alreadyHaveAccount') || 'Already have an account?'}{' '}
                <span className="text-[#FF644A] font-semibold">
                  {tOnboarding('welcome.logIn') || 'Log in'}
                </span>
              </Link>
            </div>

            {/* Terms */}
            <p className="mt-8 text-xs text-[#1F1E2A]/40 dark:text-gray-500 leading-relaxed max-w-sm">
              {tOnboarding('welcome.termsPrefix') || 'By continuing, you agree to our'}{' '}
              <Link href="/terms" className="text-[#FF644A] underline hover:opacity-80">
                {tOnboarding('welcome.terms') || 'Terms'}
              </Link>
              {'. '}
              {tOnboarding('welcome.privacyPrefix') || 'You acknowledge receipt and understanding of our'}{' '}
              <Link href="/privacy" className="text-[#FF644A] underline hover:opacity-80">
                {tOnboarding('welcome.privacyPolicy') || 'Privacy Policy'}
              </Link>
              {'.'}
            </p>
          </div>
        </section>

        {/* ============================================ */}
        {/* MINIMAL FOOTER                              */}
        {/* ============================================ */}
        <footer className="py-6 px-6 border-t border-[#E5E5E5]/60 dark:border-[#3D3C4A]/60">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm text-[#999999] dark:text-gray-500">
              © {new Date().getFullYear()} BocaBoca
            </span>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-[#999999] dark:text-gray-500">
              <Link href="/terms" className="hover:text-[#FF644A] transition-colors">
                {t('footer.terms')}
              </Link>
              <Link href="/privacy" className="hover:text-[#FF644A] transition-colors">
                {t('footer.privacy')}
              </Link>
              <a 
                href="https://bocaboca.xyz/litepaper" 
                className="hover:text-[#FF644A] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Litepaper
              </a>
              <a 
                href="https://twitter.com/BocaBocaX" 
                className="hover:text-[#FF644A] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                𝕏 Twitter
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;