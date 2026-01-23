"use client"

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, FileText, Mail, Globe } from 'lucide-react';

export default function TermsOfServicePage() {
  const t = useTranslations('legal.terms');

  return (
    <div className="min-h-screen bg-[#FFFAF5]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFAF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#1F1E2A]" />
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FF644A]" />
            <h1 className="text-xl font-bold text-[#1F1E2A]">{t('title')}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          {/* Last Updated */}
          <p className="text-sm text-gray-500 mb-6">{t('lastUpdated')}</p>

          {/* Intro */}
          <p className="text-gray-700 mb-8 leading-relaxed">{t('intro')}</p>

          {/* Section 1: About BocaBoca */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.about.title')}</h2>
            <p className="text-gray-700">{t('sections.about.description')}</p>
          </section>

          {/* Section 2: Eligibility */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.eligibility.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.eligibility.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.eligibility.requirements.age')}</li>
              <li>{t('sections.eligibility.requirements.minor')}</li>
              <li>{t('sections.eligibility.requirements.phone')}</li>
              <li>{t('sections.eligibility.requirements.legal')}</li>
              <li>{t('sections.eligibility.requirements.notBanned')}</li>
            </ul>
          </section>

          {/* Section 3: Your Account */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.account.title')}</h2>
            
            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.account.creation.title')}</h3>
            <p className="text-gray-700 mb-4">{t('sections.account.creation.description')}</p>

            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.account.truthful.title')}</h3>
            <p className="text-gray-700">{t('sections.account.truthful.description')}</p>
          </section>

          {/* Section 4: User Content */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.content.title')}</h2>
            
            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.content.recommendations.title')}</h3>
            <p className="text-gray-700 mb-4">{t('sections.content.recommendations.description')}</p>

            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.content.guidelines.title')}</h3>
            <p className="text-gray-700 mb-2">{t('sections.content.guidelines.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.content.guidelines.prohibited.false')}</li>
              <li>{t('sections.content.guidelines.prohibited.rights')}</li>
              <li>{t('sections.content.guidelines.prohibited.offensive')}</li>
              <li>{t('sections.content.guidelines.prohibited.spam')}</li>
              <li>{t('sections.content.guidelines.prohibited.illegal')}</li>
            </ul>
          </section>

          {/* Section 5: Trust Score */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.trustScore.title')}</h2>
            <p className="text-gray-700">{t('sections.trustScore.description')}</p>
          </section>

          {/* Section 6: BOCA Tokens */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.tokens.title')}</h2>
            
            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.tokens.nature.title')}</h3>
            <p className="text-gray-700 mb-4">{t('sections.tokens.nature.description')}</p>

            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.tokens.disclaimer.title')}</h3>
            <p className="text-gray-700 mb-2">{t('sections.tokens.disclaimer.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.tokens.disclaimer.points.notCurrency')}</li>
              <li>{t('sections.tokens.disclaimer.points.noValue')}</li>
              <li>{t('sections.tokens.disclaimer.points.notInvestment')}</li>
              <li>{t('sections.tokens.disclaimer.points.notRedeemable')}</li>
              <li>{t('sections.tokens.disclaimer.points.mayChange')}</li>
            </ul>
          </section>

          {/* Section 7: Prohibited Conduct */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.prohibited.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.prohibited.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.prohibited.actions.manipulate')}</li>
              <li>{t('sections.prohibited.actions.fakeReviews')}</li>
              <li>{t('sections.prohibited.actions.bots')}</li>
              <li>{t('sections.prohibited.actions.harass')}</li>
              <li>{t('sections.prohibited.actions.security')}</li>
              <li>{t('sections.prohibited.actions.violateTerms')}</li>
            </ul>
          </section>

          {/* Section 8: Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.ip.title')}</h2>
            <p className="text-gray-700">{t('sections.ip.description')}</p>
          </section>

          {/* Section 9: Disclaimer of Warranties */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.disclaimer.title')}</h2>
            <p className="text-gray-700">{t('sections.disclaimer.description')}</p>
          </section>

          {/* Section 10: Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.liability.title')}</h2>
            <p className="text-gray-700">{t('sections.liability.description')}</p>
          </section>

          {/* Section 11: Suspension and Termination */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.termination.title')}</h2>
            <p className="text-gray-700">{t('sections.termination.description')}</p>
          </section>

          {/* Section 12: Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.changes.title')}</h2>
            <p className="text-gray-700">{t('sections.changes.description')}</p>
          </section>

          {/* Section 13: Governing Law */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.law.title')}</h2>
            <p className="text-gray-700">{t('sections.law.description')}</p>
          </section>

          {/* Section 14: General Provisions */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.general.title')}</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.general.provisions.severability')}</li>
              <li>{t('sections.general.provisions.waiver')}</li>
              <li>{t('sections.general.provisions.entireAgreement')}</li>
            </ul>
          </section>

          {/* Section 15: Contact */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.contact.title')}</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-[#FF644A]" />
                <span>{t('sections.contact.email')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Globe className="w-4 h-4 text-[#FF644A]" />
                <span>{t('sections.contact.website')}</span>
              </div>
            </div>
          </section>

          {/* Agreement Notice */}
          <div className="bg-[#FFF4E1] rounded-xl p-4 mb-6">
            <p className="text-gray-700 text-sm">{t('agreement')}</p>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">{t('copyright')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}