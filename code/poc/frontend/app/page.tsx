"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/Logo';
import TrustScoreBadge from '@/components/TrustScoreBadge';
import RecommendationCard from '@/components/RecommendationCard';
import { Users, Zap, Shield, TrendingUp, Star, Heart, Bookmark, Menu, BarChart3 } from 'lucide-react';

const DemoPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sample data
  const sampleTrustBreakdown = {
    directFriends: 11,
    friendsOfFriends: 12,
    totalEndorsements: 23,
    socialHops: '±1 hop' as const
  };

  const sampleRecommendations = [
    {
      id: '1',
      title: 'Brasserie du Soleil - Best Kid-Friendly Brunch',
      description: 'Amazing family brunch spot with incredible French toast and a great outdoor seating area. The staff is super accommodating and they have high chairs available. Perfect for weekend family outings.',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23ff6b35"/%3E%3Crect x="50" y="120" width="300" height="60" fill="rgba(255,255,255,0.9)" rx="8"/%3E%3Ctext x="200" y="140" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="%23333"%3EBrasserie du Soleil%3C/text%3E%3Ctext x="200" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="%23666"%3EFrench Restaurant%3C/text%3E%3C/svg%3E',
      category: 'Restaurant',
      location: {
        name: 'Brasserie du Soleil',
        address: '123 Main St',
        city: 'Brooklyn, NY'
      },
      author: {
        id: 'author1',
        name: 'Alice Chen',
        avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cdefs%3E%3ClinearGradient id="grad3" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%234fc3f7;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%2329b6f6;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx="50" cy="50" r="50" fill="url(%23grad3)"/%3E%3Ctext x="50" y="60" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="white"%3EA%3C/text%3E%3C/svg%3E',
        reputation: 8.5,
        isFollowing: true,
        socialDistance: 1 as const
      },
      trustScore: 8.3,
      trustBreakdown: sampleTrustBreakdown,
      engagement: {
        saves: 23,
        upvotes: 18,
        comments: 5
      },
      tokenRewards: {
        amount: 2.1,
        usdValue: 0.25,
        earnedFrom: 'upvotes' as const
      },
      createdAt: '2025-01-10T10:30:00Z',
      tags: ['family-friendly', 'brunch', 'outdoor-seating'],
      isBookmarked: false,
      hasUpvoted: false
    },
    {
      id: '2',
      title: 'Hidden Gem Coffee Shop in SoHo',
      description: 'Incredible single-origin coffee and the most amazing croissants. Perfect for working or catching up with friends. They roast their own beans in-house.',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%236f4e37"/%3E%3Crect x="50" y="120" width="300" height="60" fill="rgba(255,255,255,0.9)" rx="8"/%3E%3Ctext x="200" y="140" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="%23333"%3EBlue Bottle Coffee%3C/text%3E%3Ctext x="200" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="%23666"%3ESpecialty Coffee%3C/text%3E%3C/svg%3E',
      category: 'Coffee',
      location: {
        name: 'Blue Bottle Coffee',
        address: '456 Spring St',
        city: 'New York, NY'
      },
      author: {
        id: 'author2',
        name: 'David Kim',
        avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cdefs%3E%3ClinearGradient id="grad4" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23ab47bc;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%238e24aa;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx="50" cy="50" r="50" fill="url(%23grad4)"/%3E%3Ctext x="50" y="60" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="white"%3ED%3C/text%3E%3C/svg%3E',
        reputation: 7.2,
        isFollowing: false,
        socialDistance: 2 as const
      },
      trustScore: 7.1,
      trustBreakdown: {
        directFriends: 8,
        friendsOfFriends: 15,
        totalEndorsements: 23,
        socialHops: '±2 hops' as const
      },
      engagement: {
        saves: 31,
        upvotes: 24,
        comments: 8
      },
      createdAt: '2025-01-09T14:20:00Z',
      tags: ['coffee', 'work-friendly', 'artisanal'],
      isBookmarked: true,
      hasUpvoted: true
    }
  ];

  // Don't render animations until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-trust-50">
        {/* Header */}
        <header className="border-b border-network-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Logo size="lg" variant="full" />
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                  Discover
                </a>
                <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                  Following
                </a>
                <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                  Create
                </a>
                <Link 
                  href="/dashboard"
                  className="text-network-600 hover:text-network-900 font-medium transition-colors flex items-center gap-2"
                >
                  <BarChart3 size={16} />
                  Dashboard
                </Link>
                <button className="bg-trust-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-trust-600 transition-colors">
                  Join OmeoneChain
                </button>
              </nav>

              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 text-network-600 hover:text-network-900">
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Loading state for server-side render */}
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-network-900 leading-tight">
                Personalized Recommendations
                <span className="block text-trust-600">from Trusted Sources</span>
              </h1>
              <p className="text-lg sm:text-xl text-network-600 max-w-2xl mx-auto leading-relaxed px-4">
                Discover amazing places through your social network. Get recommendations from people you trust, 
                not anonymous crowds.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-trust-50">
      {/* Header */}
      <header className="border-b border-network-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo size="lg" variant="full" />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                Discover
              </a>
              <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                Following
              </a>
              <a href="#" className="text-network-600 hover:text-network-900 font-medium transition-colors">
                Create
              </a>
              <Link 
                href="/dashboard"
                className="text-network-600 hover:text-network-900 font-medium transition-colors flex items-center gap-2"
              >
                <BarChart3 size={16} />
                Dashboard
              </Link>
              <button className="bg-trust-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-trust-600 transition-colors">
                Join OmeoneChain
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-network-600 hover:text-network-900">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-network-900 leading-tight">
              Personalized Recommendations
              <span className="block text-trust-600">from Trusted Sources</span>
            </h1>
            <p className="text-lg sm:text-xl text-network-600 max-w-2xl mx-auto leading-relaxed px-4">
              Discover amazing places through your social network. Get recommendations from people you trust, 
              not anonymous crowds.
            </p>
          </motion.div>

          {/* Trust Score Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 sm:p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-network-200 mx-4 sm:mx-0"
          >
            <div className="text-center sm:text-left">
              <p className="text-sm text-network-600 mb-2">Instead of this:</p>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-network-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={16} fill="currentColor" />
                ))}
                <span className="ml-2 text-sm">4.3 (247 reviews)</span>
              </div>
            </div>
            
            <div className="text-2xl text-network-400">→</div>
            
            <div className="text-center sm:text-left">
              <p className="text-sm text-network-600 mb-2">You get this:</p>
              <TrustScoreBadge
                score={8.3}
                breakdown={sampleTrustBreakdown}
                variant="detailed"
                size="lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-network-900 mb-4">
              How OmeoneChain Works
            </h2>
            <p className="text-base sm:text-lg text-network-600 max-w-2xl mx-auto px-4">
              Social trust, transparent algorithms, and fair rewards for quality recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-xl bg-white border border-network-200 hover:shadow-soft transition-all"
            >
              <div className="w-16 h-16 bg-trust-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-trust-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-network-900 mb-3">Social Trust Network</h3>
              <p className="text-sm sm:text-base text-network-600 leading-relaxed">
                Recommendations from your friends count as 0.75x weight, friends-of-friends as 0.25x. 
                Beyond 2 hops = no influence on your Trust Score.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-white border border-network-200 hover:shadow-soft transition-all"
            >
              <div className="w-16 h-16 bg-success-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="text-success-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-network-900 mb-3">Earn Tokens for Impact</h3>
              <p className="text-sm sm:text-base text-network-600 leading-relaxed">
                Get rewarded when your recommendations reach Trust Score ≥ 0.25. 
                Higher social impact = higher token rewards.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-white border border-network-200 hover:shadow-soft transition-all"
            >
              <div className="w-16 h-16 bg-social-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-social-600" size={32} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-network-900 mb-3">Transparent Rankings</h3>
              <p className="text-sm sm:text-base text-network-600 leading-relaxed">
                No pay-to-play manipulation. Trust Scores are calculated from real social signals, 
                not advertising budgets.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-network-900 mb-4">
              See It In Action
            </h2>
            <p className="text-base sm:text-lg text-network-600 px-4">
              Real recommendations with social context and Trust Scores
            </p>
          </div>

          <div className="space-y-6">
            {sampleRecommendations.map((recommendation, index) => (
              <motion.div
                key={recommendation.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <RecommendationCard
                  recommendation={recommendation}
                  showTokenRewards={true}
                  onSave={(id) => console.log('Saved:', id)}
                  onUpvote={(id) => console.log('Upvoted:', id)}
                  onShare={(id) => console.log('Shared:', id)}
                  onAuthorClick={(authorId) => console.log('Author clicked:', authorId)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Score Variations */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-network-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-network-900 mb-4">
              Trust Score Examples
            </h2>
            <p className="text-base sm:text-lg text-network-600 px-4">
              Different trust levels based on your social network
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4 sm:p-6 bg-white rounded-xl border border-network-200 text-center"
            >
              <TrustScoreBadge
                score={9.2}
                breakdown={{
                  directFriends: 15,
                  friendsOfFriends: 8,
                  totalEndorsements: 23,
                  socialHops: '±1 hop'
                }}
                variant="compact"
                size="lg"
                className="mx-auto mb-4"
              />
              <h3 className="text-sm sm:text-base font-semibold text-network-900 mb-2">Highly Trusted</h3>
              <p className="text-xs sm:text-sm text-network-600">Strong endorsements from close friends</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 sm:p-6 bg-white rounded-xl border border-network-200 text-center"
            >
              <TrustScoreBadge
                score={7.1}
                breakdown={{
                  directFriends: 8,
                  friendsOfFriends: 12,
                  totalEndorsements: 20,
                  socialHops: 'Mixed'
                }}
                variant="compact"
                size="lg"
                className="mx-auto mb-4"
              />
              <h3 className="text-sm sm:text-base font-semibold text-network-900 mb-2">Trusted</h3>
              <p className="text-xs sm:text-sm text-network-600">Good mix of direct and indirect endorsements</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4 sm:p-6 bg-white rounded-xl border border-network-200 text-center"
            >
              <TrustScoreBadge
                score={5.4}
                breakdown={{
                  directFriends: 3,
                  friendsOfFriends: 8,
                  totalEndorsements: 11,
                  socialHops: '±2 hops'
                }}
                variant="compact"
                size="lg"
                className="mx-auto mb-4"
              />
              <h3 className="text-sm sm:text-base font-semibold text-network-900 mb-2">Some Trust</h3>
              <p className="text-xs sm:text-sm text-network-600">Mostly from extended network</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-4 sm:p-6 bg-white rounded-xl border border-network-200 text-center"
            >
              <TrustScoreBadge
                score={2.8}
                breakdown={{
                  directFriends: 1,
                  friendsOfFriends: 2,
                  totalEndorsements: 3,
                  socialHops: '±1 hop'
                }}
                variant="compact"
                size="lg"
                className="mx-auto mb-4"
              />
              <h3 className="text-sm sm:text-base font-semibold text-network-900 mb-2">Limited Data</h3>
              <p className="text-xs sm:text-sm text-network-600">Few endorsements in your network</p>
            </motion.div>
          </div>

          <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-white rounded-xl border border-trust-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-trust-600" size={24} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-network-900 mb-2">How Trust Scores Work</h3>
                <p className="text-xs sm:text-sm text-network-600 leading-relaxed">
                  Your Trust Score for any recommendation is calculated from endorsements within your social network. 
                  Direct friends (people you follow) have 0.75x weight, friends-of-friends have 0.25x weight, 
                  and beyond 2 social hops, endorsements don't count toward your personal Trust Score. 
                  This ensures recommendations are relevant to <em>your</em> social circle, not just popular globally.
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard CTA - This is the perfect spot from your screenshot */}
          <div className="mt-8 sm:mt-12 text-center">
            <Link 
              href="/dashboard"
              className="bg-trust-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-trust-600 transition-all inline-flex items-center gap-3 hover:shadow-lg"
            >
              <BarChart3 size={24} />
              Try Interactive Dashboard
            </Link>
            <p className="text-sm text-network-600 mt-3">
              Experience Trust Score calculations, governance, and token rewards in our live demo
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 sm:space-y-8"
          >
            <Logo size="xl" className="mx-auto" />
            
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-network-900">
                Ready to Trust Your Network?
              </h2>
              <p className="text-lg sm:text-xl text-network-600 leading-relaxed px-4">
                Join OmeoneChain and discover recommendations from people you actually trust. 
                Earn tokens for helpful advice and build your reputation in the community.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link 
                href="/dashboard"
                className="bg-trust-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-trust-600 transition-all hover:shadow-trust inline-flex items-center justify-center gap-2"
              >
                <BarChart3 size={20} />
                Try Dashboard
              </Link>
              <button className="border-2 border-network-300 text-network-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:border-network-400 hover:bg-network-50 transition-all">
                Read Whitepaper
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-network-500">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Social Trust</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span>Transparent</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} />
                <span>Rewarding</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-network-200 bg-network-50 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Logo size="md" variant="full" />
              <p className="text-network-600 text-xs sm:text-sm leading-relaxed">
                The trust-based recommendation network powered by your social connections.
              </p>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold text-network-900 mb-3 sm:mb-4">Platform</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Discover</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Create</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Following</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Trending</a>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold text-network-900 mb-3 sm:mb-4">Learn</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">How it Works</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Trust Scores</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Token Rewards</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Whitepaper</a>
              </div>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-semibold text-network-900 mb-3 sm:mb-4">Community</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Discord</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Twitter</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">GitHub</a>
                <a href="#" className="block text-network-600 hover:text-network-900 transition-colors">Blog</a>
              </div>
            </div>
          </div>

          <div className="border-t border-network-200 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs sm:text-sm text-network-500">
              © 2025 OmeoneChain. Built on IOTA Rebased.
            </p>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-network-500">
              <a href="#" className="hover:text-network-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-network-700 transition-colors">Terms</a>
              <a href="#" className="hover:text-network-700 transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoPage;