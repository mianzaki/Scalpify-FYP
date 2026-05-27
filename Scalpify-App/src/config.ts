import { Platform } from 'react-native';
import pkg from '../package.json';

export const APP_VERSION: string = pkg.version;

const PROD_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const DEV_LAN_IP = process.env.EXPO_PUBLIC_DEV_LAN_IP;

export const API_BASE_URL = (() => {
  if (__DEV__) {
    if (DEV_LAN_IP) return `http://${DEV_LAN_IP}:8000/api/v1`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/v1';
    return 'http://localhost:8000/api/v1';
  }
  if (!PROD_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Configure it in your .env / EAS env before building for production.',
    );
  }
  return PROD_API_BASE_URL;
})();
