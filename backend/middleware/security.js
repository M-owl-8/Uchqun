import helmet from 'helmet';

// Configure Helmet with security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://cloud.appwrite.io"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Allow cross-origin fetch of static uploads (images/videos)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// HTTPS enforcement middleware (production only)
// Note: Health endpoint should be excluded from this middleware
export const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Skip health endpoint - allow Railway healthchecks over HTTP
    if (req.path === '/health') {
      return next();
    }
    
    // Check if request is secure (direct or behind proxy)
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (!isSecure) {
      // Redirect HTTP to HTTPS
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
};



