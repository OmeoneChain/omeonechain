'use client';

import React, { useState } from 'react';
import { Award, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface FirstReviewerBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

const FirstReviewerBadge: React.FC<FirstReviewerBadgeProps> = ({
  className = '',
  showTooltip = true
}) => {
  const t = useTranslations('badges');
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge */}
      <motion.div
        className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-full"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <Award size={14} className="text-yellow-600" />
        <span className="text-xs font-semibold text-yellow-800">
          {t('firstReviewer.label')}
        </span>
        {showTooltip && (
          <Info size={12} className="text-yellow-600" />
        )}
      </motion.div>

      {/* Tooltip */}
      {showTooltip && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
            >
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="font-semibold mb-1">{t('firstReviewer.tooltipTitle')}</div>
                <div className="text-gray-300">{t('firstReviewer.tooltipContent')}</div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default FirstReviewerBadge;