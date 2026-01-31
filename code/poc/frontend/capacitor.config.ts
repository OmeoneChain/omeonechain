import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bocaboca.app',
  appName: 'BocaBoca',
  webDir: 'out',
  server: {
    url: 'https://omeonechain.vercel.app',
    cleartext: true
  },
  ios: {
    // Enable debugging during beta (helps with cache issues)
    webContentsDebuggingEnabled: true,
    preferredContentMode: 'mobile'
  }
};

export default config;