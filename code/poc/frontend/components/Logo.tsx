"use client"

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Utility function for class names (in case cn from @/lib/utils is missing)
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const logoVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      size: {
        xs: "w-6 h-6", // 24px - for favicons, very small UI
        sm: "w-8 h-8", // 32px - for buttons, small headers  
        md: "w-12 h-12", // 48px - for cards, medium headers
        lg: "w-16 h-16", // 64px - for large headers, hero sections
        xl: "w-24 h-24", // 96px - for landing pages, promotional
        "2xl": "w-32 h-32" // 128px - for hero banners, print
      },
      variant: {
        symbol: "", // Just the hexagon symbol
        full: "gap-3", // Symbol + text
        text: "gap-2" // Minimal symbol + text
      }
    },
    defaultVariants: {
      size: "md",
      variant: "symbol"
    }
  }
);

interface LogoProps extends VariantProps<typeof logoVariants> {
  className?: string;
  showText?: boolean;
  textColor?: string;
}

const LogoSymbol: React.FC<{ size: string; className?: string }> = ({ size, className }) => {
  const isSmall = size === 'xs' || size === 'sm';
  
  // Scale factors for different sizes
  const scaleFactor = isSmall ? 0.6 : 1;
  const strokeWidth = isSmall ? 1.2 : 1.92;
  const circleRadius = isSmall ? 2.3 : 3.84;
  const fontSize = isSmall ? 12 : 19.2;
  
  // Create unique IDs for this instance to avoid conflicts
  const uniqueId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  return (
    <div className={cn("relative", className)}>
      <svg 
        viewBox="0 0 64 64" 
        className="w-full h-full drop-shadow-sm"
        style={{ 
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      >
        <defs>
          {/* Professional black/gray gradient */}
          <linearGradient id={`g-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151"/>
            <stop offset="50%" stopColor="#1f2937"/>
            <stop offset="100%" stopColor="#111827"/>
          </linearGradient>
          
          {/* Secondary gradient for enhanced visibility */}
          <linearGradient id={`gEnhanced-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280"/>
            <stop offset="50%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#1f2937"/>
          </linearGradient>

          {/* Light gradient for subtle contexts */}
          <linearGradient id={`gLight-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af"/>
            <stop offset="50%" stopColor="#6b7280"/>
            <stop offset="100%" stopColor="#4b5563"/>
          </linearGradient>

          <filter id={`logoShadow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Connecting strokes - your exact coordinates with better visibility */}
        <g stroke={`url(#gEnhanced-${uniqueId})`} strokeWidth={strokeWidth} opacity="0.8">
          <line x1="51.43" y1="23.43" x2="32" y2="12.00" />
          <line x1="32" y1="52.00" x2="12.57" y2="40.57" />
          <line x1="12.57" y1="40.57" x2="12.57" y2="23.43" />
          <line x1="32" y1="12.00" x2="51.43" y2="23.43" />
          <line x1="51.43" y1="40.57" x2="32" y2="52.00" />
          <line x1="12.57" y1="23.43" x2="32" y2="12.00" />
        </g>

        {/* Hexagon stroke - your exact path with enhanced visibility */}
        <path 
          d="M51.43 23.43 L51.43 40.57 L32 52 L12.57 40.57 L12.57 23.43 L32 12 L51.43 23.43 Z"
          fill="none" 
          stroke={`url(#g-${uniqueId})`} 
          strokeWidth={strokeWidth * 1.2}
          filter={`url(#logoShadow-${uniqueId})`}
        />

        {/* Node circles - your exact coordinates with better contrast */}
        <g fill={`url(#gEnhanced-${uniqueId})`} filter={`url(#logoShadow-${uniqueId})`}>
          <circle cx="51.43" cy="23.43" r={circleRadius} />
          <circle cx="51.43" cy="40.57" r={circleRadius} />
          <circle cx="32.00" cy="52.00" r={circleRadius} />
          <circle cx="12.57" cy="40.57" r={circleRadius} />
          <circle cx="12.57" cy="23.43" r={circleRadius} />
          <circle cx="32.00" cy="12.00" r={circleRadius} />
        </g>

        {/* Numeral "1" - your exact positioning in black */}
        <text 
          x="32" 
          y="38.4" 
          textAnchor="middle"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif" 
          fontSize={fontSize} 
          fontWeight="700"
          fill="#1f2937"
          filter={`url(#logoShadow-${uniqueId})`}
          style={{ userSelect: 'none' }}
        >
          1
        </text>
      </svg>
    </div>
  );
};

const Logo: React.FC<LogoProps> = ({ 
  size = "md", 
  variant = "symbol", 
  className, 
  showText = false,
  textColor = "text-gray-900"
}) => {
  const shouldShowText = variant === "full" || variant === "text" || showText;
  
  // Debug logging to help identify header issues
  React.useEffect(() => {
    console.log('Logo rendering with props:', { size, variant, shouldShowText, className });
  }, [size, variant, shouldShowText, className]);
  
  return (
    <div className={cn(logoVariants({ size, variant }), className)} style={{ minWidth: 'fit-content' }}>
      <div className={cn("relative flex-shrink-0", logoVariants({ size: size, variant: "symbol" }))}>
        <LogoSymbol size={size || "md"} />
      </div>
      
      {shouldShowText && (
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "font-bold leading-none tracking-tight whitespace-nowrap",
            textColor,
            {
              "text-sm": size === "xs" || size === "sm",
              "text-lg": size === "md", 
              "text-xl": size === "lg",
              "text-2xl": size === "xl",
              "text-4xl": size === "2xl"
            }
          )}>
            OmeoneChain
          </span>
          {(size === "lg" || size === "xl" || size === "2xl") && (
            <span className={cn(
              "font-medium tracking-wide opacity-70 whitespace-nowrap",
              textColor,
              {
                "text-xs": size === "lg",
                "text-sm": size === "xl" || size === "2xl"
              }
            )}>
              Trust-Based Recommendations
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;