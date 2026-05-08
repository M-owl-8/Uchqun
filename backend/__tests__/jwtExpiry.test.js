// refs #08-010 — JWT_EXPIRE env default was 30d; access tokens should expire in 15m
import { readFileSync } from 'fs';
import { join } from 'path';

describe('JWT configuration', () => {
  test('#08-010 env.js JWT_EXPIRE default is 15m not 30d', () => {
    const content = readFileSync(join(process.cwd(), 'config/env.js'), 'utf8');
    // Must not default to 30 days
    expect(content).not.toContain("default('30d')");
    // Must default to 15 minutes
    expect(content).toContain("default('15m')");
  });

  test('#08-010 authController hardcodes 15m for access tokens', () => {
    const content = readFileSync(join(process.cwd(), 'controllers/authController.js'), 'utf8');
    expect(content).toContain("'15m'");
    expect(content).not.toMatch(/ACCESS_TOKEN_EXPIRY\s*=\s*'30/);
  });
});
