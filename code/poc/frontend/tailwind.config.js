/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    // Updated paths to match your Next.js App Router structure
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    // Keep src paths as fallback in case you have files there
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ==========================================
        // BocaBoca Brand Colors (Mobile Onboarding)
        // ==========================================
        coral: {
          50: '#FFF5F3',
          100: '#FFE8E4',
          200: '#FFD5CC',
          300: '#FFB5A8',
          400: '#FF8A78',
          500: '#FF644A',  // Primary brand color
          600: '#E54E36',
          700: '#C03C27',
          800: '#9A3021',
          900: '#7D291D',
        },
        navy: {
          50: '#F4F4F6',
          100: '#E8E8EC',
          200: '#D1D1D9',
          300: '#A9A9B8',
          400: '#7B7B91',
          500: '#5C5C72',
          600: '#4A4A5C',
          700: '#3D3D4D',
          800: '#2D2D3A',
          900: '#1F1E2A',  // Primary text color
        },
        cream: {
          50: '#FFFDF9',
          100: '#FFF9F0',
          200: '#FFF4E1',  // Welcome screen background
          300: '#FFEFD2',
          400: '#FFE5B8',
          500: '#FFD99E',
          600: '#E5C28E',
          700: '#CCAB7E',
          800: '#B2946E',
          900: '#997D5E',
        },
        
        // ==========================================
        // Existing Colors (Trust-based Design System)
        // ==========================================
        trust: {
          50: '#eff6ff',
          100: '#dbeafe', 
          500: '#3b82f6', // Main trust blue
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a'
        },
        social: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316', // Social connection orange
          600: '#ea580c',
          700: '#c2410c'
        },
        network: {
          50: '#f9fafb',
          100: '#f3f4f6',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280', // Friend-of-friend connections
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981', // Positive trust scores
          600: '#059669',
          700: '#047857'
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b', // Attention states
          600: '#d97706'
        },
        // Semantic Colors
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6'
        },
        text: {
          primary: '#111827',
          secondary: '#4b5563',
          tertiary: '#9ca3af'
        },
        // Additional shadcn/ui compatible colors for components
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        // Safe area insets for iOS notch/home indicator
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'xl': '1rem',      // 16px - used for cards
        '2xl': '1.5rem',   // 24px
        '3xl': '2rem'      // 32px
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'trust': '0 4px 12px rgba(59, 130, 246, 0.15)',
        'social': '0 4px 12px rgba(249, 115, 22, 0.15)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        // BocaBoca coral glow for primary buttons
        'coral': '0 4px 14px rgba(255, 100, 74, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-trust': 'pulseTrust 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseTrust: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [],
}