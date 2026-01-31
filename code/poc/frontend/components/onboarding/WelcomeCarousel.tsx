// File: code/poc/frontend/components/onboarding/WelcomeCarousel.tsx
// Pre-auth welcome carousel explaining BocaBoca's value proposition
// Shows before phone verification - inspired by Beli's onboarding flow
//
// Created: Jan 25, 2026
// Updated: Jan 30, 2026 - New full-bleed image design with food photography

'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

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
// 
// IMAGES TO DOWNLOAD (from Unsplash - free to use):
// 
// Slide 1 - Pizza sharing:
//   https://unsplash.com/photos/WcV2YkM3Dls (by Klara Kulikova)
//   Save as: public/images/onboarding/slide-trust.jpg
//
// Slide 2 - Coffee & croissants:
//   https://unsplash.com/photos/NZMfceSGoQY (by Jez Timms)
//   Save as: public/images/onboarding/slide-never-lost.jpg
//
// Slide 3 - Chef plating (omakase):
//   https://unsplash.com/photos/KDVGz-qnHfc (by Lucas Law)
//   Save as: public/images/onboarding/slide-ownership.jpg
//
// ============================================

interface Slide {
  id: string;
  title: string;
  titleKey: string;
  subtitle: string;
  subtitleKey: string;
  image: string;
  // Alt text for accessibility
  imageAlt: string;
}

const slides: Slide[] = [
  {
    id: 'trust',
    title: "Trust Your Network's Taste",
    titleKey: 'welcome.slide1.title',
    subtitle: 'Find restaurants recommended by people you actually trust — not strangers or algorithms.',
    subtitleKey: 'welcome.slide1.subtitle',
    // Option A: Local image (recommended for production)
    image: '/images/onboarding/slide-trust.jpg',
    // Option B: Unsplash URL (convenient for testing)
    // image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
    imageAlt: 'Friends sharing pizza around a table',
  },
  {
    id: 'never-lost',
    title: 'Never Lost in the Scroll',
    titleKey: 'welcome.slide2.title',
    subtitle: "That perfect restaurant rec from your friend? It's saved, searchable, and there when you need it.",
    subtitleKey: 'welcome.slide2.subtitle',
    image: '/images/onboarding/slide-never-lost.jpg',
    // image: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=1200&q=80',
    imageAlt: 'Cozy coffee and croissants at a cafe',
  },
  {
    id: 'ownership',
    title: 'Your Taste, Your Data',
    titleKey: 'welcome.slide3.title',
    subtitle: "Build a taste profile that's yours — portable, private, and always improving.",
    subtitleKey: 'welcome.slide3.subtitle',
    image: '/images/onboarding/slide-ownership.jpg',
    // image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    imageAlt: 'Chef carefully plating a dish',
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Minimum swipe distance for gesture
  const minSwipeDistance = 50;

  const goToSlide = useCallback((index: number) => {
    if (index === currentSlide || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    // Reset transition lock after animation
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentSlide, isTransitioning]);

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  }, [currentSlide, goToSlide]);

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
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ============================================ */}
      {/* FULL-BLEED BACKGROUND IMAGE */}
      {/* ============================================ */}
      <div className="absolute inset-0">
        {/* Image with fade transition */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Using Next.js Image for optimization */}
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        ))}
        
        {/* Gradient overlay - transparent at top, cream at bottom */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(255, 244, 225, 0) 0%, 
              rgba(255, 244, 225, 0.05) 25%,
              rgba(255, 244, 225, 0.4) 40%,
              rgba(255, 244, 225, 0.85) 55%,
              rgba(255, 244, 225, 0.98) 65%,
              rgba(255, 244, 225, 1) 75%
            )`
          }}
        />
      </div>

      {/* ============================================ */}
      {/* CONTENT OVERLAY */}
      {/* ============================================ */}
      <div className="relative flex-1 flex flex-col justify-end z-10">
        {/* Main content area */}
        <div className="px-6 pb-2">
          {/* Logo */}
          <div className="mb-5 flex justify-center">
            <div className="flex items-center justify-center">
              <span className="text-4xl font-bold text-[#1F1E2A]">
                Boca<span className="text-[#FF644A]">Boca</span>
              </span>
            </div>
          </div>

          {/* Slide Content with fade transition */}
          <div className="w-full max-w-md mx-auto text-center mb-6">
            {/* Title */}
            <h1 
              className="text-3xl font-bold text-[#1F1E2A] mb-4 leading-tight transition-opacity duration-300"
              key={`title-${currentSlide}`}
            >
              {t(currentSlideData.titleKey) || currentSlideData.title}
            </h1>

            {/* Subtitle */}
            <p 
              className="text-lg text-[#1F1E2A]/70 leading-relaxed transition-opacity duration-300"
              key={`subtitle-${currentSlide}`}
            >
              {t(currentSlideData.subtitleKey) || currentSlideData.subtitle}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-[#1F1E2A] w-6'
                    : 'bg-[#1F1E2A]/30 w-2.5 hover:bg-[#1F1E2A]/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* BOTTOM CTA SECTION */}
        {/* ============================================ */}
        <div className="px-6 pb-8 pt-2 bg-[#FFF4E1]">
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
      </div>
    </div>
  );
};

export default WelcomeCarousel;