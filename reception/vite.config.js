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
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared') } },
    publicDir: 'public',
    build: { outDir: 'dist' },
    server: { port: 5177, open: true },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
    },
  };
});
