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
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
        'axios': path.resolve(__dirname, 'node_modules/axios'),
      },
    },
    build: { outDir: 'dist' },
    server: {
      port: 5175,
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
      server: { deps: { inline: ['@testing-library/jest-dom'] } },
    },
  };
});
