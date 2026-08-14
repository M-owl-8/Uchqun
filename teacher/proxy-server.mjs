/* eslint-env node */
/**
 * Production server for the Teacher/Parent portal: static dist + same-origin
 * API reverse proxy.
 *
 * WHY THIS EXISTS (MOBILE-AUTH-FIX): the frontend and backend live on
 * different up.railway.app subdomains, and up.railway.app is on the Public
 * Suffix List — so the auth cookies were THIRD-PARTY cookies. Browsers that
 * block third-party cookies (Samsung Internet by default, iOS Safari PWAs,
 * Chrome with tracking protection — and therefore the installed TWA/PWA
 * apps) silently dropped them: login succeeded, the next /auth/me got 401,
 * and the user bounced straight back to /login. Proxying /api, /uploads and
 * /socket.io through this origin makes the cookies first-party and the
 * installed apps work in every engine.
 *
 * Deliberately zero-dependency (Node builtins only): the Railway service
 * skips npm install (dist is pre-built in CI), so this file must run as-is.
 */
import http from 'http';
import https from 'https';
import tls from 'tls';
import zlib from 'zlib';
import { createReadStream, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, normalize, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3002;
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'https://uchqun-production-b484.up.railway.app';
const backend = new URL(BACKEND_ORIGIN);
const PROXY_PREFIXES = ['/api', '/uploads', '/socket.io'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.svg', '.json', '.webmanifest', '.txt', '.map']);

// Hop-by-hop headers must not be forwarded (RFC 7230 §6.1).
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

const isProxied = (url) =>
  PROXY_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`));

function forwardHeaders(req) {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) headers[name] = value;
  }
  headers.host = backend.host;
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = 'https';
  const remote = req.socket.remoteAddress || '';
  headers['x-forwarded-for'] = req.headers['x-forwarded-for']
    ? `${req.headers['x-forwarded-for']}, ${remote}`
    : remote;
  return headers;
}

function proxyRequest(req, res) {
  const upstream = https.request(
    {
      host: backend.hostname,
      port: backend.port || 443,
      path: req.url,
      method: req.method,
      headers: forwardHeaders(req),
      timeout: 65000,
    },
    (upstreamRes) => {
      const headers = {};
      for (const [name, value] of Object.entries(upstreamRes.headers)) {
        if (!HOP_BY_HOP.has(name.toLowerCase())) headers[name] = value;
      }
      res.writeHead(upstreamRes.statusCode, headers);
      upstreamRes.pipe(res);
    }
  );
  upstream.on('timeout', () => upstream.destroy(new Error('upstream timeout')));
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ success: false, error: 'UPSTREAM_UNAVAILABLE' }));
  });
  req.pipe(upstream);
}

function cacheControlFor(path) {
  if (path.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (path === '/index.html' || path === '/sw.js') return 'no-cache, no-store, must-revalidate';
  if (path.endsWith('.webmanifest') || path === '/.well-known/assetlinks.json') return 'no-cache';
  return 'public, max-age=3600';
}

function serveFile(req, res, urlPath, filePath) {
  const ext = extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControlFor(urlPath),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
  } else {
    headers['Content-Length'] = statSync(filePath).size;
    res.writeHead(200, headers);
    createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  if (isProxied(req.url)) return proxyRequest(req, res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  // normalize + containment check prevents path traversal
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, safePath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    return res.end();
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return serveFile(req, res, urlPath, filePath);
  }
  // SPA fallback — client-side routing serves index.html for app routes.
  filePath = join(DIST, 'index.html');
  return serveFile(req, res, '/index.html', filePath);
});

// WebSocket pass-through for socket.io.
server.on('upgrade', (req, socket) => {
  if (!req.url.startsWith('/socket.io')) return socket.destroy();

  const upstream = tls.connect({
    host: backend.hostname,
    port: backend.port || 443,
    servername: backend.hostname,
  });
  upstream.on('secureConnect', () => {
    const headers = forwardHeaders(req);
    headers.connection = 'Upgrade';
    headers.upgrade = req.headers.upgrade || 'websocket';
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [name, value] of Object.entries(headers)) lines.push(`${name}: ${value}`);
    upstream.write(lines.join('\r\n') + '\r\n\r\n');
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  const kill = () => { socket.destroy(); upstream.destroy(); };
  upstream.on('error', kill);
  socket.on('error', kill);
});

server.listen(PORT, () => {
  console.log(`Teacher/Parent portal listening on :${PORT}, proxying API to ${BACKEND_ORIGIN}`);
});
