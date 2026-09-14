// Re-exported from the shared resolver so the teacher and parent views cannot
// drift apart again — this logic previously existed twice, and both copies
// built a proxy URL that never resolved. See shared/utils/mediaUrl.js.
export { getProxyUrl, isAppwriteUrl } from '@shared/utils/mediaUrl';
