const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function mediaUrl(path) {
  return avatarUrl(path);
}

export function uploadsUrl(filename) {
  if (!filename) return null;
  return `${BASE}/uploads/${filename}`;
}
