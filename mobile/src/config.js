// Get API URL from environment or use default
const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null' && envUrl.trim() !== '') {
    let url = envUrl.trim();
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    // Add /api if missing
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? url + 'api' : url + '/api';
    }
    return url;
  }
  return 'https://uchqun-production-2d8a.up.railway.app/api';
};

export const API_URL = getApiUrl();

// IMPORTANT:
// - Android Emulator: host machine -> http://10.0.2.2:<port>
// - Real device: use your PC's LAN IP (e.g. http://192.168.x.x:<port>) or a deployed URL (Railway/Vercel/etc.)
// - Production: Parent app -> https://uchqun-platform.netlify.app, Teacher app -> https://uchqun-platform.netlify.app/teacher
const DEFAULT_WEB_URL = 'https://uchqun-platform.netlify.app';

// Safely get WEB_URL with validation
const getWebUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_WEB_URL;
  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null' && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  return DEFAULT_WEB_URL;
};

export const WEB_URL = getWebUrl();

// Log for debugging
if (__DEV__) {
  console.log('[Config] WEB_URL:', WEB_URL);
  console.log('[Config] API_URL:', API_URL);
}

export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
};

export function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '');
  if (!p) return b;
  if (p.startsWith('/')) return `${b}${p}`;
  return `${b}/${p}`;
}

