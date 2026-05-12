/* eslint-env node */
const { existsSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// In the full monorepo (local dev, CI) ../shared already exists — nothing to do.
const sharedDir = path.resolve(__dirname, '../shared');
if (existsSync(sharedDir)) process.exit(0);

// Railway auto-deploy: build context is only this app directory, so ../shared is missing.
// Fetch just the shared/ subtree from the public GitHub repo.
const ref = process.env.RAILWAY_GIT_COMMIT_SHA || 'main';
const dest = path.resolve(__dirname, '..');
const url = `https://github.com/M-owl-8/Uchqun/archive/${ref}.tar.gz`;

console.log(`[fetch-shared] ../shared not found — fetching from GitHub (ref=${ref})`);
execSync(
  `mkdir -p /tmp/_uf && curl -sL "${url}" | tar xz -C /tmp/_uf && cp -r /tmp/_uf/Uchqun-*/shared "${dest}"`,
  { stdio: 'inherit', shell: true },
);
console.log('[fetch-shared] shared/ ready');
