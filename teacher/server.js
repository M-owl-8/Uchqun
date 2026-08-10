/* eslint-env node */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// express.static ignores dotfiles by default, but /.well-known/assetlinks.json
// must be served for the Android TWA (APK) wrapper to verify the domain.
app.use(
  '/.well-known',
  express.static(join(__dirname, 'dist', '.well-known'), { dotfiles: 'allow' })
);

// Serve static files from the dist directory
app.use(
  express.static(join(__dirname, 'dist'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
      // The service worker must always revalidate so a new deploy replaces it.
      if (path.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Teacher frontend server running on port ${PORT}`);
});







