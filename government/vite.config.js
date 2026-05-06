import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_URL) {
    throw new Error('VITE_API_URL is required for production builds');
  }
  return {
    plugins: [react()],
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared') } },
    server: { port: 5173, open: true },
    build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false },
    base: '/',
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
    },
  };
});
