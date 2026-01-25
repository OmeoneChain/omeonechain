import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bocaboca.app',
  appName: 'BocaBoca',
  webDir: 'out',
  server: {
    url: 'https://omeonechain.vercel.app',
    cleartext: true
  }
};

export default config;