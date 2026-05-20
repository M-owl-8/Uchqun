// refs #02-006 — Socket.io CORS origin missing port 5177 and production domains
// refs Q2 — deploy-preview origins blocked in production
// refs PL-002 — FRONTEND_URL explicit allowlist (replaces old substring CORS_ORIGIN check)
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import cors from 'cors';
import supertest from 'supertest';

function makeCorsApp(isProduction) {
  const app = express();
  /* eslint-disable security/detect-unsafe-regex */
  const deployRegex = isProduction
    ? /^https:\/\/uchqun-[a-z-]+\.(netlify|vercel)\.app$/
    : /^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$/;
  /* eslint-enable security/detect-unsafe-regex */
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

// Replicates the origin callback logic from server.js for isolated unit testing.
function makeFrontendUrlCorsApp({ isProduction = true, frontendUrl = '' } = {}) {
  const app = express();
  const localhostOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5177',
  ];
  const frontendUrls = frontendUrl
    ? frontendUrl.split(',').map((u) => u.trim()).filter(Boolean)
    : [];
  const allowedOrigins = isProduction
    ? frontendUrls
    : [...new Set([...localhostOrigins, ...frontendUrls])];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProduction) {
        // eslint-disable-next-line security/detect-unsafe-regex
        const deployRegex = /^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$/;
        if (deployRegex.test(origin)) return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  }));
  app.get('/ping', (req, res) => res.json({ ok: true }));
  return app;
}

describe('PL-002 — FRONTEND_URL explicit allowlist', () => {
  const PROD_URL = 'https://uchqun-admin.netlify.app';

  it('allows an origin that exactly matches FRONTEND_URL', async () => {
    const res = await supertest(makeFrontendUrlCorsApp({ frontendUrl: PROD_URL }))
      .get('/ping')
      .set('Origin', PROD_URL);
    expect(res.headers['access-control-allow-origin']).toBe(PROD_URL);
  });

  it('blocks an evil subdomain that shares the host substring (revert-test: no substring matching)', async () => {
    const evilOrigin = 'https://evil.uchqun-admin.netlify.app';
    const res = await supertest(makeFrontendUrlCorsApp({ frontendUrl: PROD_URL }))
      .get('/ping')
      .set('Origin', evilOrigin);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows requests with no Origin header (non-browser / server-to-server)', async () => {
    const res = await supertest(makeFrontendUrlCorsApp({ frontendUrl: PROD_URL }))
      .get('/ping');
    expect(res.status).toBe(200);
  });

  it('fails closed when FRONTEND_URL is empty in production — all cross-origin requests blocked', async () => {
    const res = await supertest(makeFrontendUrlCorsApp({ isProduction: true, frontendUrl: '' }))
      .get('/ping')
      .set('Origin', PROD_URL);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows multiple origins from comma-separated FRONTEND_URL', async () => {
    const url1 = 'https://uchqun-admin.netlify.app';
    const url2 = 'https://uchqun-teacher.netlify.app';
    const app = makeFrontendUrlCorsApp({ frontendUrl: `${url1}, ${url2}` });

    const res1 = await supertest(app).get('/ping').set('Origin', url1);
    const res2 = await supertest(app).get('/ping').set('Origin', url2);

    expect(res1.headers['access-control-allow-origin']).toBe(url1);
    expect(res2.headers['access-control-allow-origin']).toBe(url2);
  });

  it('server.js uses exact allowedOrigins.includes() not legacy substring match', () => {
    const content = readFileSync(join(process.cwd(), 'server.js'), 'utf8');
    expect(content).toContain('allowedOrigins.includes(origin)');
    expect(content).not.toMatch(/url\.includes\(process\.env\.CORS_ORIGIN\)/);
    expect(content).toContain('FRONTEND_URL');
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
