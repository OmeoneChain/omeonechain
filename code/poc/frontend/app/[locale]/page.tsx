// app/[locale]/page.tsx - Landing page with OAuth callback support and full i18n
// Updated with BocaBoca branding and harmonized messaging from One-Pager v1.0 and Litepaper v1.0
// Dark mode support added
// FIXED: Removed problematic debug console.logs that caused React Error #300 in Capacitor WebView

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

  // FIXED: Simple mount effect without translation calls
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle OAuth callback - only runs after mounted
  useEffect(() => {
    if (!mounted) return;
    
    // Only process if there's actually OAuth data in the URL
    const hash = window.location.hash;
    if (!hash || (!hash.includes('auth_token') && !hash.includes('auth_success') && !hash.includes('auth_error'))) {
      // No OAuth data, skip processing
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

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-[#1F1E2A] dark:text-gray-100">
                {t('hero.title')}
              </h1>
              <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4 text-[#666666] dark:text-gray-400">
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
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
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
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-[#1F1E2A] dark:text-gray-100">
              {t('hero.title')}
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4 text-[#666666] dark:text-gray-400">
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
            className="py-6 px-8 rounded-2xl mx-4 sm:mx-0 shadow-[0_4px_20px_rgba(255,100,74,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #FFB3AB 0%, #FF644A 100%)'
            }}
          >
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
            className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 sm:p-8 bg-white/60 dark:bg-[#2D2C3A]/60 backdrop-blur-sm rounded-2xl mx-4 sm:mx-0 border border-[#E5E5E5] dark:border-[#3D3C4A]"
          >
            <div className="text-center sm:text-left">
              <p className="text-sm mb-2 text-[#666666] dark:text-gray-400">{t('comparison.instead')}</p>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[#999999] dark:text-gray-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={16} fill="currentColor" />
                ))}
                <span className="ml-2 text-sm">{t('comparison.stars')}</span>
              </div>
              <p className="text-xs mt-1 text-[#999999] dark:text-gray-500">{t('comparison.starsNote')}</p>
            </div>

            <div className="text-2xl text-[#999999] dark:text-gray-500">→</div>

            <div className="text-center sm:text-left">
              <p className="text-sm mb-3 text-[#666666] dark:text-gray-400">{t('comparison.youGet')}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px] bg-[#FFE8E3] dark:bg-[#FF644A]/20 border-2 border-[#FF644A]">
                  <Users size={14} className="mx-auto mb-1 text-[#FF644A]" />
                  <div className="text-xl font-bold text-[#FF644A]">8.3</div>
                  <div className="text-xs whitespace-nowrap text-[#FF644A]">Your Network</div>
                </div>
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px] bg-[#F5F5F5] dark:bg-[#353444] border border-[#E5E5E5] dark:border-[#3D3C4A]">
                  <Star size={14} className="mx-auto mb-1 text-[#666666] dark:text-gray-400" />
                  <div className="text-xl font-bold text-[#1F1E2A] dark:text-gray-100">8.5</div>
                  <div className="text-xs whitespace-nowrap text-[#666666] dark:text-gray-400">Similar Taste</div>
                </div>
                <div className="px-3 py-2 rounded-lg text-center min-w-[90px] bg-[#F5F5F5] dark:bg-[#353444] border border-[#E5E5E5] dark:border-[#3D3C4A]">
                  <TrendingUp size={14} className="mx-auto mb-1 text-[#666666] dark:text-gray-400" />
                  <div className="text-xl font-bold text-[#1F1E2A] dark:text-gray-100">7.2</div>
                  <div className="text-xs whitespace-nowrap text-[#666666] dark:text-gray-400">All Reviews</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40 dark:bg-[#2D2C3A]/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-[#1F1E2A] dark:text-gray-100">
              {t('problem.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4 text-[#666666] dark:text-gray-400">
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#FEE2E2] dark:bg-red-900/30">
                <AlertTriangle size={32} className="text-[#EF4444]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('problem.trustCollapsed.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t.rich('problem.trustCollapsed.description', {
                  strong: (chunks) => <strong>{chunks}</strong>
                })}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#E0E7FF] dark:bg-indigo-900/30">
                <Clock size={32} className="text-[#6366F1]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('problem.lostInScroll.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t('problem.lostInScroll.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#FEF3C7] dark:bg-amber-900/30">
                <Star size={32} className="text-[#F59E0B]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('problem.ratingsLostMeaning.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t('problem.ratingsLostMeaning.description')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-[#1F1E2A] dark:text-gray-100">
              {t('solution.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4 text-[#666666] dark:text-gray-400">
              {t('solution.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#FFE8E3] dark:bg-[#FF644A]/20">
                <UserCheck size={32} className="text-[#FF644A]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('solution.trust.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t('solution.trust.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#E8F5E3] dark:bg-green-900/30">
                <Search size={32} className="text-[#4CAF50]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('solution.neverLost.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t('solution.neverLost.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-white dark:bg-[#2D2C3A] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-[#F3E5F5] dark:bg-purple-900/30">
                <Shield size={32} className="text-[#9C27B0]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-[#1F1E2A] dark:text-gray-100">
                {t('solution.ownProfile.title')}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                {t('solution.ownProfile.description')}
              </p>
            </motion.div>
          </div>

          {/* Concrete Example */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 sm:mt-12 p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#2D2C3A] text-center border-2 border-[#FF644A]"
          >
            <p className="text-base sm:text-lg mb-2 text-[#666666] dark:text-gray-400">
              {t('solution.example.intro')}
            </p>
            <p className="text-xl sm:text-2xl font-semibold text-[#1F1E2A] dark:text-gray-100">
              {t.rich('solution.example.quote', {
                green: (chunks) => <span className="text-[#4CAF50] font-semibold">{chunks}</span>,
                red: (chunks) => <span className="text-[#EF4444] font-semibold">{chunks}</span>
              })}
            </p>
            <p className="text-sm mt-3 text-[#999999] dark:text-gray-500">
              {t('solution.example.attribution')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40 dark:bg-[#2D2C3A]/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-[#1F1E2A] dark:text-gray-100">
              {t('whyNow.title')}
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto px-4 text-[#666666] dark:text-gray-400">
              {t('whyNow.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-xl bg-white dark:bg-[#2D2C3A] flex items-start gap-4 border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-[#FF644A]">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                  {t('whyNow.aiCheap.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                  {t('whyNow.aiCheap.description')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-xl bg-white dark:bg-[#2D2C3A] flex items-start gap-4 border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-[#FF644A]">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                  {t('whyNow.awareness.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
                  {t('whyNow.awareness.description')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl bg-white dark:bg-[#2D2C3A] flex items-start gap-4 border border-[#E5E5E5] dark:border-[#3D3C4A]"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-[#FF644A]">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                  {t('whyNow.infrastructure.title')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[#666666] dark:text-gray-400">
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-[#1F1E2A] dark:text-gray-100">
              {t('differentiators.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-6 rounded-xl text-center bg-[#FFE8E3] dark:bg-[#FF644A]/20"
            >
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                {t('differentiators.trust.title')}
              </h3>
              <p className="text-sm text-[#666666] dark:text-gray-400">
                {t('differentiators.trust.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-xl text-center bg-[#E8F5E3] dark:bg-green-900/20"
            >
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                {t('differentiators.neverLost.title')}
              </h3>
              <p className="text-sm text-[#666666] dark:text-gray-400">
                {t('differentiators.neverLost.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl text-center bg-[#F3E5F5] dark:bg-purple-900/20"
            >
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-[#1F1E2A] dark:text-gray-100">
                {t('differentiators.ownProfile.title')}
              </h3>
              <p className="text-sm text-[#666666] dark:text-gray-400">
                {t('differentiators.ownProfile.description')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40 dark:bg-[#2D2C3A]/40">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1F1E2A] dark:text-gray-100">
              {t('cta.title')}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#666666] dark:text-gray-400">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/onboarding"
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 bg-[#FF644A]"
              >
                {t('cta.getStarted')}
              </Link>
              <Link
                href="/discover"
                className="px-8 py-3 rounded-lg font-semibold transition-all bg-white dark:bg-[#2D2C3A] text-[#FF644A] border-2 border-[#FF644A] hover:bg-gray-50 dark:hover:bg-[#353444]"
              >
                {t('cta.exploreDemo')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-[#E5E5E5] dark:border-[#3D3C4A] bg-white dark:bg-[#2D2C3A]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Logo size="md" variant="full" />
              <p className="text-xs sm:text-sm leading-relaxed text-[#666666] dark:text-gray-400">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#1F1E2A] dark:text-gray-100">
                {t('footer.platform')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <Link href="/discover" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.discover')}
                </Link>
                <Link href="/create" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.create')}
                </Link>
                <Link href="/community" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.community')}
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#1F1E2A] dark:text-gray-100">
                {t('footer.learn')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.howItWorks')}
                </a>
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.trustScores')}
                </a>
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.tokenRewards')}
                </a>
                <a href="https://bocaboca.xyz/whitepaper" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.whitePaper')}
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-[#1F1E2A] dark:text-gray-100">
                {t('footer.community')}
              </h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.discord')}
                </a>
                <a href="https://twitter.com/BocaBocaX" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.twitter')}
                </a>
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.github')}
                </a>
                <a href="#" className="block transition-colors text-[#666666] dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A]">
                  {t('footer.blog')}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-[#E5E5E5] dark:border-[#3D3C4A]">
            <p className="text-xs sm:text-sm text-[#999999] dark:text-gray-500">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-[#999999] dark:text-gray-500">
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