export const getProxyUrl = (url, mediaId) => {
  if (!url) return url;
  if (!mediaId) return url;
  if (url.includes('appwrite.io') && (url.includes('/storage/buckets/') || url.includes('/files/'))) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = apiUrl.replace('/api', '');
    return `${apiBase}/api/media/proxy/${mediaId}`;
  }
  return url;
};
