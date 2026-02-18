import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bocaboca.app',
  appName: 'BocaBoca',
  webDir: 'out',
  server: {
    url: 'https://bocaboca.xyz',
    cleartext: true
  },
  ios: {
    // Enable debugging during beta (helps with cache issues)
    webContentsDebuggingEnabled: false,
    preferredContentMode: 'mobile'
  }
};

export default config;