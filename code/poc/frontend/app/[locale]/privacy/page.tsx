"use client"

import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Shield, Mail, Globe, User } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const t = useTranslations('legal.privacy');

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
            <Shield className="w-5 h-5 text-[#FF644A]" />
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
          <p className="text-gray-700 mb-8 leading-relaxed">{t('lgpdCompliance')}</p>

          {/* Section 1: Data We Collect */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.dataCollection.title')}</h2>
            
            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.dataCollection.providedByYou.title')}</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>{t('sections.dataCollection.providedByYou.phone')}</li>
              <li>{t('sections.dataCollection.providedByYou.displayName')}</li>
              <li>{t('sections.dataCollection.providedByYou.photo')}</li>
              <li>{t('sections.dataCollection.providedByYou.email')}</li>
              <li>{t('sections.dataCollection.providedByYou.recommendations')}</li>
              <li>{t('sections.dataCollection.providedByYou.connections')}</li>
            </ul>

            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.dataCollection.automatic.title')}</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>{t('sections.dataCollection.automatic.location')}</li>
              <li>{t('sections.dataCollection.automatic.device')}</li>
              <li>{t('sections.dataCollection.automatic.usage')}</li>
              <li>{t('sections.dataCollection.automatic.identifiers')}</li>
            </ul>

            <h3 className="text-md font-medium text-[#1F1E2A] mb-2">{t('sections.dataCollection.thirdParty.title')}</h3>
            <p className="text-gray-700">{t('sections.dataCollection.thirdParty.description')}</p>
          </section>

          {/* Section 2: How We Use Your Data */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.dataUsage.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.dataUsage.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.dataUsage.purposes.account')}</li>
              <li>{t('sections.dataUsage.purposes.verify')}</li>
              <li>{t('sections.dataUsage.purposes.recommendations')}</li>
              <li>{t('sections.dataUsage.purposes.connect')}</li>
              <li>{t('sections.dataUsage.purposes.trustScore')}</li>
              <li>{t('sections.dataUsage.purposes.tokens')}</li>
              <li>{t('sections.dataUsage.purposes.improve')}</li>
              <li>{t('sections.dataUsage.purposes.notifications')}</li>
            </ul>
          </section>

          {/* Section 3: Legal Basis */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.legalBasis.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.legalBasis.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.legalBasis.bases.contract')}</li>
              <li>{t('sections.legalBasis.bases.consent')}</li>
              <li>{t('sections.legalBasis.bases.legitimateInterest')}</li>
              <li>{t('sections.legalBasis.bases.legal')}</li>
            </ul>
          </section>

          {/* Section 4: Data Sharing */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.dataSharing.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.dataSharing.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>{t('sections.dataSharing.parties.users')}</li>
              <li>{t('sections.dataSharing.parties.providers')}</li>
              <li>{t('sections.dataSharing.parties.authorities')}</li>
            </ul>
            <p className="text-gray-700 font-medium">{t('sections.dataSharing.noSale')}</p>
          </section>

          {/* Section 5: Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.thirdPartyServices.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.thirdPartyServices.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>{t('sections.thirdPartyServices.services.supabase')}</li>
              <li>{t('sections.thirdPartyServices.services.twilio')}</li>
              <li>{t('sections.thirdPartyServices.services.vercel')}</li>
              <li>{t('sections.thirdPartyServices.services.auth')}</li>
              <li>{t('sections.thirdPartyServices.services.maps')}</li>
            </ul>
          </section>

          {/* Section 6: Your Rights (LGPD) */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.rights.title')}</h2>
            <p className="text-gray-700 mb-2">{t('sections.rights.intro')}</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>{t('sections.rights.list.confirmation')}</li>
              <li>{t('sections.rights.list.access')}</li>
              <li>{t('sections.rights.list.correction')}</li>
              <li>{t('sections.rights.list.anonymization')}</li>
              <li>{t('sections.rights.list.portability')}</li>
              <li>{t('sections.rights.list.revocation')}</li>
              <li>{t('sections.rights.list.information')}</li>
            </ul>
            <p className="text-gray-700">{t('sections.rights.contact')}</p>
          </section>

          {/* Section 7: Data Security */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.security.title')}</h2>
            <p className="text-gray-700">{t('sections.security.description')}</p>
          </section>

          {/* Section 8: Data Retention */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.retention.title')}</h2>
            <p className="text-gray-700">{t('sections.retention.description')}</p>
          </section>

          {/* Section 9: BOCA Tokens */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.tokens.title')}</h2>
            <p className="text-gray-700">{t('sections.tokens.description')}</p>
          </section>

          {/* Section 10: Minors */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.minors.title')}</h2>
            <p className="text-gray-700">{t('sections.minors.description')}</p>
          </section>

          {/* Section 11: Changes */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[#1F1E2A] mb-4">{t('sections.changes.title')}</h2>
            <p className="text-gray-700">{t('sections.changes.description')}</p>
          </section>

          {/* Section 12: Contact */}
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
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-[#FF644A]" />
                <span>{t('sections.contact.dpo')}</span>
              </div>
            </div>
          </section>

          {/* Copyright */}
          <div className="pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">{t('copyright')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}