'use client';

import React from 'react';
import { Loader2, ArrowRight, Coins } from 'lucide-react';

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
    500: '#10B981',
    600: '#059669',
  },
};

interface StickyPublishButtonProps {
  /**
   * Estimated reward in BOCA. Defensive code will treat non-finite/undefined
   * values as 0 to prevent runtime crashes.
   */
  estimatedReward: number | undefined | null;

  onPublish: () => void;
  disabled: boolean;
  isPublishing: boolean;
  disabledReason?: string;

  /**
   * Translation function (e.g., from next-intl useTranslations).
   * Optional: component will fall back to basic English strings if omitted.
   */
  t?: (key: string, params?: Record<string, any>) => string;

  /**
   * Optional: base reward for the action (used to decide if "bonus" hint should show).
   * White Paper v1.0 launch: wallet recommendation = 5.0 BOCA.
   */
  baseReward?: number;
}

export function StickyPublishButton({
  estimatedReward,
  onPublish,
  disabled,
  isPublishing,
  disabledReason,
  t,
  baseReward = 5.0,
}: StickyPublishButtonProps) {
  // ---- Defensive translation wrapper (prevents "t is not a function") ----
  const tt =
    typeof t === 'function'
      ? t
      : ((key: string, params?: Record<string, any>) => {
          switch (key) {
            case 'singleScreen.publish.publishing':
              return 'Publishing...';
            case 'singleScreen.publish.button':
              return `Publish & earn ${params?.tokens ?? ''} BOCA`;
            case 'singleScreen.publish.bonusEarned':
              return 'Bonus available after validation.';
            default:
              return key;
          }
        });

  // ---- Defensive reward formatting (prevents "toFixed of undefined") ----
  const safeReward =
    typeof estimatedReward === 'number' && Number.isFinite(estimatedReward)
      ? estimatedReward
      : 0;

  // Most of your UI is using 1 decimal, keep it consistent.
  const formattedReward = safeReward.toFixed(1);

  const bonusAmount = Math.max(0, safeReward - baseReward);
  const showBonusHint = !disabled && !isPublishing && bonusAmount > 0.0001;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: `1px solid ${BRAND.stone[200]}`,
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div className="px-4 py-3 max-w-lg mx-auto">
        {/* Disabled reason message */}
        {disabled && disabledReason && !isPublishing && (
          <p
            className="text-xs text-center mb-2"
            style={{ color: BRAND.stone[500] }}
          >
            {disabledReason}
          </p>
        )}

        {/* Main publish button */}
        <button
          type="button"
          onClick={onPublish}
          disabled={disabled || isPublishing}
          className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold text-white transition-all duration-200"
          style={{
            height: '56px',
            backgroundColor: disabled ? BRAND.stone[300] : BRAND.coral,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: isPublishing ? 0.8 : 1,
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isPublishing) {
              e.currentTarget.style.backgroundColor = BRAND.coralDark;
              e.currentTarget.style.transform = 'scale(1.01)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !isPublishing) {
              e.currentTarget.style.backgroundColor = BRAND.coral;
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{tt('singleScreen.publish.publishing')}</span>
            </>
          ) : (
            <>
              <Coins className="w-5 h-5" />
              <span>{tt('singleScreen.publish.button', { tokens: formattedReward })}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Bonus hint (only if estimate exceeds baseReward) */}
        {showBonusHint && (
          <p
            className="text-xs text-center mt-2"
            style={{ color: BRAND.emerald[600] }}
          >
            🎉 {tt('singleScreen.publish.bonusEarned') || 'Bonus available after validation.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default StickyPublishButton;