// File: code/poc/frontend/capacitor.config.ts
// Capacitor configuration for BocaBoca mobile app
// Using server URL instead of static export

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bocaboca.app',
  appName: 'BocaBoca',
  webDir: 'out',
  
  // Point to your hosted web app
  server: {
    // Use your production URL or dev URL
    url: 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3000.app.github.dev',
    cleartext: true,
  },
  
  ios: {
    scheme: 'BocaBoca',
    contentInset: 'automatic',
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1F1E2A',
      showSpinner: false,
    },
  },
};

export default config;
