/**
 * D-55 (teacher app) — a deep link must survive login, but only for the persona
 * it belongs to.
 *
 * The first D-55 fix covered admin, reception and government and left this app
 * out; the P7 witness on the deployed build caught it still landing on /teacher.
 * This app is the one that needs care, because a single Login screen serves both
 * teachers and parents. Restoring a stored /teacher/* path for a parent would
 * send them somewhere ProtectedRoute immediately bounces back to /login — a
 * redirect loop dressed up as a fix.
 */
import { describe, it, expect } from 'vitest';
import loginSrc from '../pages/Login.jsx?raw';
import guardSrc from '../shared/components/ProtectedRoute.jsx?raw';

const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('D-55 — the guard must record where the user was going', () => {
  it('ProtectedRoute passes the location in redirect state', () => {
    const src = code(guardSrc);
    expect(src).toMatch(/useLocation/);
    expect(src).toMatch(/<Navigate to="\/login" replace state=\{\{ from: location \}\} \/>/);
  });
});

describe('D-55 — Login honours the deep link per persona', () => {
  const src = code(loginSrc);

  it('reads the stored path', () => {
    expect(src).toMatch(/location\.state\?\.from\?\.pathname/);
  });

  it('a teacher is returned to a teacher path, else the teacher root', () => {
    expect(src).toMatch(/navigate\(isTeacherPath\(from\) \? from : '\/teacher'\)/);
  });

  it('a parent is returned to a parent path, else the parent root', () => {
    expect(src).toMatch(/navigate\(isParentPath\(from\) \? from : '\/'\)/);
  });

  it('the persona predicates actually discriminate', () => {
    // extract and evaluate the two predicates rather than trusting their names
    // \r?\n — the working tree is CRLF on Windows, and anchoring on ";\n" alone
    // silently ran the match past the intended statement
    const m = src.match(/const isTeacherPath = ([\s\S]*?);\r?\n/);
    const n = src.match(/const isParentPath =([\s\S]*?);\r?\n/);
    expect(m).toBeTruthy();
    expect(n).toBeTruthy();
    const isTeacherPath = eval(`(${m[1]})`);
    const isParentPath = eval(`(${n[1].trim()})`);

    expect(isTeacherPath('/teacher/bolalar')).toBe(true);
    expect(isTeacherPath('/rating')).toBe(false);
    expect(isTeacherPath(undefined)).toBe(false);

    expect(isParentPath('/rating')).toBe(true);
    expect(isParentPath('/teacher/bolalar')).toBe(false);
    expect(isParentPath('/login')).toBe(false);
    expect(isParentPath(undefined)).toBe(false);
  });
});
