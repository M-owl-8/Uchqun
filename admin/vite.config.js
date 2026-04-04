import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      // Ensure shared/ can resolve packages installed in admin/node_modules
      'axios': path.resolve(__dirname, 'node_modules/axios'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    server: {
      deps: {
        inline: ['@testing-library/jest-dom'],
      },
    },
  },
})

