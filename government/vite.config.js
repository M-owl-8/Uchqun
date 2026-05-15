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
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared'), 'axios': path.resolve(__dirname, 'node_modules/axios'), 'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'), 'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'), 'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom') } },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false },
    base: '/',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
    },
  };
});
