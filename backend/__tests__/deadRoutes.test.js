/**
 * #06-002 — Dead /message-to-super-admin alias routes must not exist.
 * These routes were dead-code aliases for /message-to-government.
 * No frontend ever called them; removing them eliminates dead API surface.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../routes');

const ROUTE_FILES = [
  'adminRoutes.js',
  'teacherRoutes.js',
  'receptionRoutes.js',
  'parentRoutes.js',
  'userRoutes.js',
];

describe('Dead route removal', () => {
  ROUTE_FILES.forEach(file => {
    it(`#06-002 ${file} must not contain /message-to-super-admin`, () => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
      expect(content).not.toContain('message-to-super-admin');
    });
  });
});
