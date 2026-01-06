"use client"

import React from 'react';
import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';

// Utility function for class names
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const logoVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      size: {
        xs: "w-6 h-6",
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-24 h-24",
        "2xl": "w-32 h-32"
      },
      variant: {
        symbol: "",
        full: "gap-3",
        text: "gap-2"
      }
    },
    defaultVariants: {
      size: "md",
      variant: "symbol"
    }
  }
);

// Size mapping for the Image component
const sizeMap: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  "2xl": 128
};

interface LogoProps extends VariantProps<typeof logoVariants> {
  className?: string;
  showText?: boolean;
  textColor?: string;
}

// BocaBoca Logo Symbol using PNG image
const LogoSymbol: React.FC<{ size: string; className?: string }> = ({ size, className }) => {
  const pixelSize = sizeMap[size] || 48;
  
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <Image
        src="/BocaBoca_Logo.png"
        alt="BocaBoca"
        width={pixelSize}
        height={pixelSize}
        className="object-contain"
        priority
      />
    </div>
  );
};

const Logo: React.FC<LogoProps> = ({ 
  size = "md", 
  variant = "symbol", 
  className, 
  showText = false,
  textColor
}) => {
  const shouldShowText = variant === "full" || variant === "text" || showText;
  
  return (
    <div className={cn(logoVariants({ size, variant }), className)} style={{ minWidth: 'fit-content' }}>
      <div className={cn("relative flex-shrink-0", logoVariants({ size: size, variant: "symbol" }))}>
        <LogoSymbol size={size || "md"} />
      </div>
      
      {shouldShowText && (
        <div className="flex flex-col min-w-0">
          <span 
            className={cn(
              "font-bold leading-none tracking-tight whitespace-nowrap",
              {
                "text-sm": size === "xs" || size === "sm",
                "text-lg": size === "md", 
                "text-xl": size === "lg",
                "text-2xl": size === "xl",
                "text-4xl": size === "2xl"
              }
            )}
            style={{ color: textColor || '#1F1E2A' }}
          >
            BocaBoca
          </span>
          {(size === "lg" || size === "xl" || size === "2xl") && (
            <span 
              className={cn(
                "font-medium tracking-wide whitespace-nowrap",
                {
                  "text-xs": size === "lg",
                  "text-sm": size === "xl" || size === "2xl"
                }
              )}
              style={{ color: textColor || '#666', opacity: 0.8 }}
            >
              Recommendations from people you trust
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;