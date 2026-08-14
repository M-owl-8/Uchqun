// D-55 regression test — a deep link is discarded on login.
//
// Found in Campaign II P5, uniform across all four portals:
//   requested /admin/receptions -> redirected to /login (correct)
//                               -> after login landed on /admin (wrong)
//
// ProtectedRoute rendered <Navigate to="/login" replace /> with no state, so
// the intended destination was thrown away, and Login navigated to a hardcoded
// portal root. Every shared link, bookmark and notification link lost its
// destination with no indication anything had been dropped.
//
// Uses Vite's ?raw import: this suite runs in a browser environment where fs
// and process are unavailable (the same reason the D-43 test reads its source
// that way).
//
// FAIL-FIRST: fails against the pre-fix source.

import { describe, test, expect } from 'vitest';
import PROTECTED from '../components/ProtectedRoute.jsx?raw';
import LOGIN from '../pages/Login.jsx?raw';

describe('D-55 — a deep link must survive the login redirect', () => {
  test('ProtectedRoute records where the user was going', () => {
    expect(PROTECTED).toMatch(/useLocation/);
    expect(PROTECTED).toMatch(/state=\{\{\s*from:/);
  });

  test('Login sends the user back to it', () => {
    expect(LOGIN).toMatch(/location\.state\?\.from/);
  });

  test('Login still has a fallback for a direct visit', () => {
    expect(LOGIN).toMatch(/\?\?\s*'\/admin'|\|\|\s*'\/admin'/);
  });
});
