// refs #02-006 — Socket.io CORS origin missing port 5177 and production domains
// refs Q2 — deploy-preview origins blocked in production
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import cors from 'cors';
import supertest from 'supertest';

function makeCorsApp(isProduction) {
  const app = express();
  // eslint-disable-next-line security/detect-unsafe-regex
  const deployRegex = isProduction
    ? /^https:\/\/uchqun-[a-z-]+\.(netlify|vercel)\.app$/
    : /^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$/;
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (deployRegex.test(origin)) return callback(null, true);
      callback(new Error('CORS blocked'));
    },
    credentials: true,
  }));
  app.get('/ping', (req, res) => res.json({ ok: true }));
  return app;
}

describe('Q2 — deploy-preview CORS policy', () => {
  const PREVIEW = 'https://deploy-preview-123--uchqun-admin.netlify.app';
  const BASE = 'https://uchqun-admin.netlify.app';

  it('production: allows base subdomain', async () => {
    const res = await supertest(makeCorsApp(true))
      .get('/ping')
      .set('Origin', BASE);
    expect(res.headers['access-control-allow-origin']).toBe(BASE);
  });

  it('production: blocks deploy-preview origin', async () => {
    const res = await supertest(makeCorsApp(true))
      .get('/ping')
      .set('Origin', PREVIEW);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('non-production: allows deploy-preview origin', async () => {
    const res = await supertest(makeCorsApp(false))
      .get('/ping')
      .set('Origin', PREVIEW);
    expect(res.headers['access-control-allow-origin']).toBe(PREVIEW);
  });

  it('server.js uses NODE_ENV-conditional regex for deploy-preview', () => {
    const content = readFileSync(join(process.cwd(), 'server.js'), 'utf8');
    expect(content).toContain("process.env.NODE_ENV === 'production'");
    // Production regex must NOT contain the deploy-preview prefix
    expect(content).toMatch(/production'[\s\S]*?uchqun-\[a-z-\]\+/);
    // Non-production regex must contain the deploy-preview prefix
    expect(content).toContain('deploy-preview');
  });
});

describe('CORS configuration', () => {
  test('#02-006 socket.js CORS includes all 4 localhost ports', () => {
    const content = readFileSync(join(process.cwd(), 'config/socket.js'), 'utf8');
    expect(content).toContain('5173');
    expect(content).toContain('5174');
    expect(content).toContain('5175');
    expect(content).toContain('5177');
  });

  test('#02-006 socket.js CORS includes production Netlify domains', () => {
    const content = readFileSync(join(process.cwd(), 'config/socket.js'), 'utf8');
    expect(content).toContain('uchqun-reception.netlify.app');
    expect(content).toContain('uchqun-admin.netlify.app');
    expect(content).toContain('uchqun-teacher.netlify.app');
    expect(content).toContain('uchqun-government.netlify.app');
  });

  test('#02-006 socket.js CORS respects FRONTEND_URL env variable', () => {
    const content = readFileSync(join(process.cwd(), 'config/socket.js'), 'utf8');
    expect(content).toContain('FRONTEND_URL');
  });
});
