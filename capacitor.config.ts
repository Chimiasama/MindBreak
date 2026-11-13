import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chimiasama.mindbreak',
  appName: 'MIND//BREAK',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#090714' },
};

export default config;
