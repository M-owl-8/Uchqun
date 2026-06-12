/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_URL) {
    throw new Error('VITE_API_URL is required for production builds');
  }
  return {
    plugins: [react()],
    base: '/',
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared'), 'axios': path.resolve(__dirname, 'node_modules/axios'), '@sentry/browser': path.resolve(__dirname, 'node_modules/@sentry/browser'), 'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'), 'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'), 'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom') } },
    publicDir: 'public',
    build: { outDir: 'dist' },
    server: {
      port: 5177,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      // S30: vitest 4 removed test.poolOptions (the execArgv memory flag was
      // already being ignored at runtime). The 4 GB headroom existed for the
      // settings suite's infinite-render loop вЂ” now fixed at the source
      // (stable useAuth mock identity in settings.test.jsx).
      pool: 'forks',
    },
  };
});
