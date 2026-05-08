// refs #00-003 #11-005 — .env.example must exist and contain all required vars
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_EXAMPLE_PATH = join(process.cwd(), '.env.example');

describe('.env.example completeness', () => {
  let content;
  beforeAll(() => {
    content = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
  });

  test('#11-005 .env.example file exists', () => {
    expect(existsSync(ENV_EXAMPLE_PATH)).toBe(true);
  });

  const required = [
    'JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL',
    'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
    'OPENAI_API_KEY', 'APPWRITE_ENDPOINT', 'MIGRATION_SECRET',
    'FRONTEND_URL', 'TELEGRAM_BOT_TOKEN', 'LOG_LEVEL',
  ];

  test.each(required.map((v) => [v]))('#11-005 contains var %s', (varName) => {
    expect(content).toContain(varName);
  });

  test('#00-003 does not contain dead Payme/Click payment vars', () => {
    expect(content).not.toMatch(/PAYME|CLICK_/i);
  });

  test('#11-005 uses correct SMTP_* var names (not EMAIL_HOST)', () => {
    expect(content).toContain('SMTP_HOST');
    expect(content).not.toContain('EMAIL_HOST=');
    expect(content).not.toContain('EMAIL_USER=');
  });
});
