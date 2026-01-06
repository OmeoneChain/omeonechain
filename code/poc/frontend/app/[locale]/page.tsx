// app/[locale]/page.tsx - Landing page with OAuth callback support and full i18n
// Updated with BocaBoca branding and harmonized messaging from One-Pager v1.0 and Litepaper v1.0

"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CleanHeader from '@/components/CleanHeader';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import AuthService from '@/services/auth';
import { useTranslations } from 'next-intl';
import { Star, Clock, UserCheck, AlertTriangle, Search, Shield, Users, TrendingUp } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('landing');

  useEffect(() => {
    console.log('CLIENT: Testing t function:', t('hero.title'));
    console.log('CLIENT: Problem title:', t('problem.trustCollapsed.title'));
    setMounted(true);
  }, [t]);

  // Handle OAuth callback
  useEffect(() => {
    if (!mounted) return;

    console.log('🔍 Checking for OAuth callback...');
    console.log('🔍 Full URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);
    console.log('🔍 Search:', window.location.search);

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    console.log('🔍 Auth token in hash:', params.get('auth_token') ? 'EXISTS' : 'MISSING');
    console.log('🔍 Auth success in hash:', params.get('auth_success'));
    console.log('🔍 Auth error in hash:', params.get('auth_error'));

    const result = AuthService.handleOAuthCallback();

    if (result.success) {
      setIsProcessingOAuth(true);
      console.log('✅ OAuth callback processed successfully');

      const userData = result.user || JSON.parse(localStorage.getItem('user') || '{}');
      const isNewUser = result.isNewUser || userData.onboarding_completed === false;

      console.log('📊 User status:', {
        isNewUser,
        onboardingCompleted: userData.onboarding_completed,
        profileCompletion: userData.profileCompletion
      });

      setTimeout(() => {
        if (isNewUser) {
          console.log('🎯 New user - redirecting to /onboarding');
          window.location.href = '/onboarding';
        } else {
          console.log('🚀 Returning user - redirecting to /feed');
          window.location.href = '/feed';
        }
      }, 500);

    } else if (result.error) {
      console.error('❌ OAuth failed:', result.error);
      alert(`Authentication failed: ${result.error}`);
    }
  }, [mounted]);

  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF4E1' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#FF644A' }}></div>
          <p className="font-medium" style={{ color: '#1F1E2A' }}>{t('loading.signingIn')}</p>
          <p className="text-sm mt-2" style={{ color: '#666' }}>{t('loading.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FFF4E1' }}>
        <CleanHeader />
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight" style={{ color: '#1F1E2A' }}>
                {t('hero.title')}
              </h1>

              {/* HERO SUBTITLE (Option A2) */}
              <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4" style={{ color: '#666' }}>
                {t.rich('hero.subtitle', {
                  br: () => <br className="hidden sm:block" />
                })}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF4E1' }}>
      <CleanHeader />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight" style={{ color: '#1F1E2A' }}>
              {t('hero.title')}
            </h1>

            {/* HERO SUBTITLE (Option A2) */}
            <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4" style={{ color: '#666' }}>
              {t.rich('hero.subtitle', {
                br: () => <br className="hidden sm:block" />
              })}
            </p>
          </motion.div>

          {/* Quote Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="py-6 px-8 rounded-2xl mx-4 sm:mx-0"
            style={{
              background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)',
              boxShadow: '0 4px 20px rgba(255, 100, 74, 0.3)'
            }}
          >
            {/* Removed forced quotation marks so it reads like a declarative insight */}
            <p className="text-lg sm:text-xl md:text-2xl font-medium text-white leading-relaxed">
              {t('quote.main')}
            </p>
            <p className="text-sm sm:text-base text-white/80 mt-3">
              {t('quote.tagline')}
            </p>
          </motion.div>

          {/* Comparison Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 sm:p-8 bg-white/60 backdrop-blur-sm rounded-2xl mx-4 sm:mx-0"
            style={{ border: '1px solid #E5E5E5' }}
          >
            <div className="text-center sm:text-left">
              <p className="text-sm mb-2" style={{ color: '#666' }}>{t('comparison.instead')}</p>
              <div className="flex items-center justify-center sm:justify-start gap-1" style={{ color: '#999' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={16} fill="currentColor" />
                ))}
                <span className="ml-2 text-sm">{t('comparison.stars')}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#999' }}>{t('comparison.starsNote')}</p>
            </div>

            <div className="text-2xl" style={{ color: '#999' }}>→</div>

            <div className="text-center sm:text-left">
              <p className="text-sm mb-3" style={{ color: '#666' }}>{t('comparison.youGet')}</p>

              {/* Mini 3-box "What People Think" design */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {/* Your Network - highlighted */}
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px]" style={{ backgroundColor: '#FFE8E3', border: '2px solid #FF644A' }}>
                  <Users size={14} className="mx-auto mb-1" style={{ color: '#FF644A' }} />
                  <div className="text-xl font-bold" style={{ color: '#FF644A' }}>8.3</div>
                  <div className="text-xs whitespace-nowrap" style={{ color: '#FF644A' }}>Your Network</div>
                </div>

                {/* Similar Taste */}
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px]" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
                  <Star size={14} className="mx-auto mb-1" style={{ color: '#666' }} />
                  <div className="text-xl font-bold" style={{ color: '#1F1E2A' }}>8.5</div>
                  <div className="text-xs whitespace-nowrap" style={{ color: '#666' }}>Similar Taste</div>
                </div>

                {/* All Reviews */}
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px]" style={{ backgroundColor: '#F5F5F5', border: '1px solid #E5E5E5' }}>
                  <TrendingUp size={14} className="mx-auto mb-1" style={{ color: '#666' }} />
                  <div className="text-xl font-bold" style={{ color: '#1F1E2A' }}>7.2</div>
                  <div className="text-xs whitespace-nowrap" style={{ color: '#666' }}>All Reviews</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section - REORDERED: Trust Collapsed → Lost in Scroll → Ratings Lost Meaning */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
              {t('problem.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4" style={{ color: '#666' }}>
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1: Trust Collapsed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-xl bg-white"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FEE2E2' }}>
                <AlertTriangle size={32} style={{ color: '#EF4444' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('problem.trustCollapsed.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t.rich('problem.trustCollapsed.description', {
                  strong: (chunks) => <strong>{chunks}</strong>
                })}
              </p>
            </motion.div>

            {/* Card 2: Lost in Scroll */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-white"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E0E7FF' }}>
                <Clock size={32} style={{ color: '#6366F1' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('problem.lostInScroll.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t('problem.lostInScroll.description')}
              </p>
            </motion.div>

            {/* Card 3: Ratings Lost Meaning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-white"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FEF3C7' }}>
                <Star size={32} style={{ color: '#F59E0B' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('problem.ratingsLostMeaning.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t('problem.ratingsLostMeaning.description')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solution Section - Three Pillars */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
              {t('solution.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4" style={{ color: '#666' }}>
              {t('solution.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FFE8E3' }}>
                <UserCheck size={32} style={{ color: '#FF644A' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('solution.trust.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t('solution.trust.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E8F5E3' }}>
                <Search size={32} style={{ color: '#4CAF50' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('solution.neverLost.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t('solution.neverLost.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F3E5F5' }}>
                <Shield size={32} style={{ color: '#9C27B0' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3" style={{ color: '#1F1E2A' }}>
                {t('solution.ownProfile.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                {t('solution.ownProfile.description')}
              </p>
            </motion.div>
          </div>

          {/* Concrete Example */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 sm:mt-12 p-6 sm:p-8 rounded-2xl bg-white text-center"
            style={{ border: '2px solid #FF644A' }}
          >
            <p className="text-base sm:text-lg mb-2" style={{ color: '#666' }}>
              {t('solution.example.intro')}
            </p>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: '#1F1E2A' }}>
              {t.rich('solution.example.quote', {
                green: (chunks) => <span style={{ color: '#4CAF50', fontWeight: 600 }}>{chunks}</span>,
                red: (chunks) => <span style={{ color: '#EF4444', fontWeight: 600 }}>{chunks}</span>
              })}
            </p>
            <p className="text-sm mt-3" style={{ color: '#999' }}>
              {t('solution.example.attribution')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
              {t('whyNow.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4" style={{ color: '#666' }}>
              {t('whyNow.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-xl bg-white flex items-start gap-4"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#FF644A' }}>
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                  {t('whyNow.aiCheap.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                  {t('whyNow.aiCheap.description')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-xl bg-white flex items-start gap-4"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#FF644A' }}>
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                  {t('whyNow.awareness.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                  {t('whyNow.awareness.description')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl bg-white flex items-start gap-4"
              style={{ border: '1px solid #E5E5E5' }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#FF644A' }}>
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                  {t('whyNow.infrastructure.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#666' }}>
                  {t('whyNow.infrastructure.description')}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Differentiators Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1F1E2A' }}>
              {t('differentiators.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: '#FFE8E3' }}
            >
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                {t('differentiators.trust.title')}
              </h3>
              <p className="text-sm" style={{ color: '#666' }}>
                {t('differentiators.trust.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: '#E8F5E3' }}
            >
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                {t('differentiators.neverLost.title')}
              </h3>
              <p className="text-sm" style={{ color: '#666' }}>
                {t('differentiators.neverLost.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: '#F3E5F5' }}
            >
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: '#1F1E2A' }}>
                {t('differentiators.ownProfile.title')}
              </h3>
              <p className="text-sm" style={{ color: '#666' }}>
                {t('differentiators.ownProfile.description')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: '#1F1E2A' }}>
              {t('cta.title')}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#666' }}>
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/onboarding"
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#FF644A' }}
              >
                {t('cta.getStarted')}
              </Link>
              <Link
                href="/discover"
                className="px-8 py-3 rounded-lg font-semibold transition-all hover:bg-white/80"
                style={{
                  backgroundColor: 'white',
                  color: '#FF644A',
                  border: '2px solid #FF644A'
                }}
              >
                {t('cta.exploreDemo')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6" style={{ borderTop: '1px solid #E5E5E5', backgroundColor: 'white' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Logo size="md" variant="full" />
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#666' }}>
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4" style={{ color: '#1F1E2A' }}>
                {t('footer.platform')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <Link href="/discover" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.discover')}
                </Link>
                <Link href="/create" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.create')}
                </Link>
                <Link href="/community" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.community')}
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4" style={{ color: '#1F1E2A' }}>
                {t('footer.learn')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.howItWorks')}
                </a>
                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.trustScores')}
                </a>
                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.tokenRewards')}
                </a>
                <a href="https://bocaboca.xyz/whitepaper" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.whitePaper')}
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4" style={{ color: '#1F1E2A' }}>
                {t('footer.community')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.discord')}
                </a>

                {/* Updated to BocaBocaX */}
                <a href="https://twitter.com/BocaBocaX" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.twitter')}
                </a>

                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.github')}
                </a>
                <a href="#" className="block transition-colors" style={{ color: '#666' }}>
                  {t('footer.blog')}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid #E5E5E5' }}>
            <p className="text-xs sm:text-sm" style={{ color: '#999' }}>
              {t('footer.copyright')}
            </p>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm" style={{ color: '#999' }}>
              <a href="#" className="hover:opacity-70 transition-opacity">{t('footer.privacy')}</a>
              <a href="#" className="hover:opacity-70 transition-opacity">{t('footer.terms')}</a>
              <a href="#" className="hover:opacity-70 transition-opacity">{t('footer.status')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;