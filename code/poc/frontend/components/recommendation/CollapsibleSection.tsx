'use client';

import React, { useState, ReactNode } from 'react';
import { ChevronRight, Check } from 'lucide-react';

// Brand colors from BocaBoca guidelines
const BRAND = {
  coral: '#FF644A',
  coralLight: '#FFE4E0',
  coralDark: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
  plum: '#35273B',
  stone: {
    50: '#FAFAFA',
    200: '#E5E5E5',
    300: '#D1D5DB',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#1C1917',
  },
  emerald: {
    600: '#059669',
  }
};

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  bonus?: string;           // e.g., "+0.2 BOCA"
  badge?: string | number;  // e.g., "3" for 3 dishes, check for completed
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
  badgeType = 'count',
  defaultOpen = false,
  children,
  testId,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div 
      className="border-b"
      style={{ borderColor: BRAND.stone[200] }}
      data-testid={testId}
    >
      {/* Collapsible Header Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 transition-colors"
        style={{
          minHeight: '56px',
          backgroundColor: isOpen ? BRAND.stone[50] : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = BRAND.stone[50];
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        aria-expanded={isOpen}
        aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {/* Left side: Icon, Title, Badge */}
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-hidden="true">{icon}</span>
          <span 
            className="font-medium"
            style={{ color: BRAND.stone[800] }}
          >
            {title}
          </span>
          {badge !== undefined && badge !== null && badge !== 0 && badge !== '' && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: BRAND.coralLight, 
                color: BRAND.coralDark,
                minWidth: badgeType === 'check' ? '20px' : '24px',
              }}
            >
              {badgeType === 'check' ? (
                <Check className="w-3 h-3" />
              ) : (
                badge
              )}
            </span>
          )}
        </div>

        {/* Right side: Bonus text, Chevron */}
        <div className="flex items-center gap-2">
          {bonus && (
            <span 
              className="text-xs font-medium"
              style={{ color: BRAND.emerald[600] }}
            >
              {bonus}
            </span>
          )}
          <ChevronRight
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            style={{ color: BRAND.stone[400] }}
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