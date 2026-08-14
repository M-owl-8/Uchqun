/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_URL) {
    throw new Error('VITE_API_URL is required for production builds');
  }

  const backendBase = process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  return {
    plugins: [react()],
    base: '/',
    // MOBILE-AUTH-FIX: the teacher/parent portal ALWAYS calls the API
    // same-origin ('/api/v1'); proxy-server.mjs forwards it to the backend in
    // production, and the dev-server proxy below forwards it in dev. This is a
    // `define` (not env) on purpose: Railway rebuilds this app with its own
    // VITE_API_URL env var, and a cross-origin API URL breaks login in every
    // engine that blocks third-party cookies (Samsung Internet, iOS PWAs, the
    // installed TWA/PWA apps) — up.railway.app is on the Public Suffix List,
    // so the two subdomains are different sites and the auth cookies were
    // third-party. Same-origin makes them first-party everywhere.
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1') },
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared'), 'axios': path.resolve(__dirname, 'node_modules/axios'), '@sentry/browser': path.resolve(__dirname, 'node_modules/@sentry/browser'), 'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'), 'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'), 'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom') } },
    build: { outDir: 'dist' },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendBase,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              if (res && !res.headersSent) {
                if (req.url?.includes('/api/media/proxy/')) {
                  const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
                  res.writeHead(500, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
                  res.end(transparentPng);
                } else {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Service unavailable', code: err.code || 'ECONNREFUSED' }));
                }
              }
            });
          },
        },
        '/uploads': { target: backendBase, changeOrigin: true, secure: true },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      // Cap workers to prevent resource-exhaustion timeouts in parallel suite runs.
      // Without this cap the full suite had flaky timeouts on resource-constrained hosts.
      //
      // D-59: vitest 4 REMOVED `test.poolOptions` (reception hit this in S30 and
      // migrated; this file did not). The cap below was therefore ignored at
      // runtime, workers over-subscribed, and 7-8 of the 19 test files failed to
      // start with "[vitest-pool]: Failed to start threads worker" — while the
      // run still EXITED 0 and reported the survivors as "passed". Three
      // consecutive runs collected 11, 12, 11 of 19 files, all green.
      // The cap is expressed as vitest 4 top-level options so it is honoured.
      pool: 'threads',
      maxWorkers: 2,
      minWorkers: 1,
    },
  };
});
