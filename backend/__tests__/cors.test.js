// refs #02-006 — Socket.io CORS origin missing port 5177 and production domains
import { readFileSync } from 'fs';
import { join } from 'path';

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
