'use client';

import React, { useState, ReactNode } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  bonus?: string;
  badge?: string | number;
  badgeCount?: number;
  badgeType?: 'count' | 'check';
  defaultOpen?: boolean;
  children: ReactNode;
  testId?: string;
}

export function CollapsibleSection({
  title,
  icon,
  bonus,
  badge,
  badgeCount,
  badgeType = 'count',
  defaultOpen = false,
  children,
  testId,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Support both badge and badgeCount props
  const displayBadge = badge ?? badgeCount;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="border-b border-gray-200 dark:border-[#3D3C4A]"
      data-testid={testId}
    >
      {/* Collapsible Header Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-4 transition-colors min-h-[56px] ${
          isOpen 
            ? 'bg-gray-50 dark:bg-[#353444]' 
            : 'bg-transparent hover:bg-gray-50 dark:hover:bg-[#353444]'
        }`}
        aria-expanded={isOpen}
        aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {/* Left side: Icon, Title, Badge */}
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-hidden="true">{icon}</span>
          <span className="font-medium text-[#1F1E2A] dark:text-white">
            {title}
          </span>
          {displayBadge !== undefined && displayBadge !== null && displayBadge !== 0 && displayBadge !== '' && (
            <span 
              className={`text-xs px-2 py-0.5 rounded-full flex items-center justify-center bg-[#FFE4E0] dark:bg-[#FF644A]/20 text-[#E65441] dark:text-[#FF644A] ${
                badgeType === 'check' ? 'min-w-[20px]' : 'min-w-[24px]'
              }`}
            >
              {badgeType === 'check' ? (
                <Check className="w-3 h-3" />
              ) : (
                displayBadge
              )}
            </span>
          )}
        </div>

        {/* Right side: Bonus text, Chevron */}
        <div className="flex items-center gap-2">
          {bonus && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {bonus}
            </span>
          )}
          <ChevronRight
            className={`w-5 h-5 transition-transform duration-200 text-gray-400 dark:text-gray-500 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        id={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isOpen && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default CollapsibleSection;