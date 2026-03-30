import crypto from 'crypto';

export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const verifyCsrfToken = (req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for Bearer token auth (mobile clients and web clients using Bearer tokens)
  // This takes priority - if Bearer token is present, skip CSRF check
  // Bearer token auth is stateless and doesn't need CSRF protection
  // Check Authorization header (case-insensitive, handle both lowercase and uppercase)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const trimmedHeader = authHeader.trim();
    // Check for Bearer token (case-insensitive)
    if (trimmedHeader.startsWith('Bearer ') || trimmedHeader.startsWith('bearer ')) {
      return next();
    }
  }

  // Skip if no cookie auth present (no session to protect)
  // Only check CSRF if using cookie-based auth (no Bearer token)
  if (!req.cookies?.accessToken && !req.cookies?.refreshToken) {
    return next();
  }

  // Skip for multipart/form-data (file uploads) - CSRF token may not be properly sent
  const contentType = req.headers['content-type'] || req.headers['Content-Type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }

  // Check CSRF token for cookie-based auth
  const headerToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  const cookieToken = req.cookies?.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
    });
  }

  next();
};
