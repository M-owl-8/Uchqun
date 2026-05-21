import { createApi } from '@shared/services/api';

const api = createApi({ tokenKey: 'admin_accessToken' });

// Normalize new-style error objects { code, detail } to strings so every
// existing catch block can do err.response?.data?.error without hitting
// [object Object]. SCHOOL_ARCHIVED gets a human-readable message; other
// codes fall back to detail or code.
api.interceptors.response.use(null, (error) => {
  const errBody = error.response?.data?.error;
  if (errBody && typeof errBody === 'object') {
    const { code, detail } = errBody;
    if (code === 'SCHOOL_ARCHIVED') {
      error.response.data.error = 'School archived — contact your regional government office.';
    } else if (detail) {
      error.response.data.error = detail;
    } else {
      error.response.data.error = code || 'An error occurred';
    }
  }
  return Promise.reject(error);
});

export default api;
