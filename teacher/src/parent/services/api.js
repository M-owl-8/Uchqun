// Re-export the teacher portal's single api instance so all components — both
// teacher-side and parent-side — share one axios instance, one refreshPromise
// mutex, and one onUnauthenticated handler. Previously this re-exported the
// shared module-level default (a separate instance), which caused concurrent
// refresh races: parent-side would rotate the refresh token first; teacher-side
// would then send the revoked token, fail, and call clearAuth() — logging the
// user out spuriously.
export { default } from '../shared/services/api';
export { createApi } from '@shared/services/api';
