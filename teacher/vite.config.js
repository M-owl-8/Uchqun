import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_URL) {
    throw new Error('VITE_API_URL is required for production builds');
  }

  const backendBase = process.env.VITE_API_URL?.replace('/api', '') || 'https://uchqun-production-2d8a.up.railway.app';

  return {
    plugins: [react()],
    base: '/',
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared') } },
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
    },
  };
});
