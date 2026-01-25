// File: code/poc/frontend/components/onboarding/WelcomeCarousel.tsx
// Pre-auth welcome carousel explaining BocaBoca's value proposition
// Shows before phone verification - inspired by Beli's onboarding flow
//
// Created: Jan 25, 2026

'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================
// BRAND COLORS (from BocaBoca Brand Guidelines)
// ============================================
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  cream: '#FFF4E1',
  navy: '#1F1E2A',
  mint: '#BFE2D9',
  white: '#FFFFFF',
};

// ============================================
// SLIDE DATA
// ============================================
interface Slide {
  id: string;
  emoji: string;
  title: string;
  titleKey: string;
  subtitle: string;
  subtitleKey: string;
}

const slides: Slide[] = [
  {
    id: 'trust',
    emoji: '🤝',
    title: 'Trust Your Network\'s Taste',
    titleKey: 'welcome.slide1.title',
    subtitle: 'Find restaurants recommended by people you actually trust — not strangers or algorithms.',
    subtitleKey: 'welcome.slide1.subtitle',
  },
  {
    id: 'never-lost',
    emoji: '📌',
    title: 'Never Lost in the Scroll',
    titleKey: 'welcome.slide2.title',
    subtitle: 'That perfect restaurant rec from your friend? It\'s saved, searchable, and there when you need it.',
    subtitleKey: 'welcome.slide2.subtitle',
  },
  {
    id: 'ownership',
    emoji: '✨',
    title: 'Your Taste, Your Data',
    titleKey: 'welcome.slide3.title',
    subtitle: 'Build a taste profile that\'s yours — portable, private, and always improving.',
    subtitleKey: 'welcome.slide3.subtitle',
  },
];

// ============================================
// COMPONENT PROPS
// ============================================
interface WelcomeCarouselProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================
const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ onGetStarted, onLogin }) => {
  const t = useTranslations('onboarding');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance for gesture
  const minSwipeDistance = 50;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#FFF4E1] flex flex-col">
      {/* Main content area */}
      <div 
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <span className="text-4xl font-bold text-[#1F1E2A]">
              Boca<span className="text-[#FF644A]">Boca</span>
            </span>
          </div>
        </div>

        {/* Slide Content */}
        <div className="w-full max-w-md text-center mb-8">
          {/* Emoji Icon */}
          <div className="text-6xl mb-6 animate-bounce-slow">
            {currentSlideData.emoji}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-[#1F1E2A] mb-4 leading-tight">
            {t(currentSlideData.titleKey) || currentSlideData.title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[#1F1E2A]/70 leading-relaxed">
            {t(currentSlideData.subtitleKey) || currentSlideData.subtitle}
          </p>
        </div>

        {/* Navigation Arrows (for desktop/larger screens) */}
        <div className="hidden sm:flex items-center justify-center gap-8 mb-8">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`p-2 rounded-full transition-all ${
              currentSlide === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-[#1F1E2A] hover:bg-[#1F1E2A]/10'
            }`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-[#1F1E2A] w-6'
                    : 'bg-[#1F1E2A]/30 hover:bg-[#1F1E2A]/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className={`p-2 rounded-full transition-all ${
              currentSlide === slides.length - 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-[#1F1E2A] hover:bg-[#1F1E2A]/10'
            }`}
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Dots Indicator */}
        <div className="flex sm:hidden items-center justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-[#1F1E2A] w-6'
                  : 'bg-[#1F1E2A]/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="px-6 pb-8 pt-4 bg-[#FFF4E1]">
        {/* Get Started Button */}
        <button
          onClick={onGetStarted}
          className="w-full py-4 px-6 bg-[#FF644A] text-white font-semibold text-lg rounded-2xl shadow-lg hover:bg-[#E65441] active:scale-[0.98] transition-all duration-200"
        >
          {t('welcome.getStarted') || 'Get Started'}
        </button>

        {/* Login Link */}
        <button
          onClick={onLogin}
          className="w-full mt-4 py-3 text-[#1F1E2A]/70 font-medium hover:text-[#1F1E2A] transition-colors"
        >
          {t('welcome.alreadyHaveAccount') || 'Already have an account?'}{' '}
          <span className="text-[#FF644A] font-semibold">
            {t('welcome.logIn') || 'Log in'}
          </span>
        </button>

        {/* Terms */}
        <p className="mt-6 text-xs text-[#1F1E2A]/50 text-center leading-relaxed">
          {t('welcome.termsPrefix') || 'By continuing, you agree to our'}{' '}
          <a href="/terms" className="text-[#FF644A] underline">
            {t('welcome.terms') || 'Terms'}
          </a>
          {'. '}
          {t('welcome.privacyPrefix') || 'You acknowledge receipt and understanding of our'}{' '}
          <a href="/privacy" className="text-[#FF644A] underline">
            {t('welcome.privacyPolicy') || 'Privacy Policy'}
          </a>
          {'.'}
        </p>
      </div>

      {/* Custom animation for emoji */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default WelcomeCarousel;