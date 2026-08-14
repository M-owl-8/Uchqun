// P8.3 — socket functionality re-witnessed after the ws / engine.io /
// socket.io-adapter / socket.io-parser upgrade, on the DEPLOYED build.
//
// A passing unit suite does not exercise a websocket handshake and `npm audit`
// reporting 0 high says nothing about whether realtime still works. If the
// upgrade had broken the handshake, the attendance write would STILL return
// 201 and every test would STILL pass — the exact silent-failure shape (L13).
//
// The first version of this probe looked for the socket on `window`. The app
// does not expose it there, so it found nothing and proved nothing. This one
// observes the WebSocket at the NETWORK layer via Playwright's `websocket`
// event, which does not depend on the application exposing anything:
//
//   parent session connects  -> capture the upgrade and every frame
//   teacher writes attendance for that parent's child
//   the emitted event must appear in the parent's socket frames
import { phase, newBrowser, ctx, login, goto, shot, save, PORTALS, pwFor } from './lib.mjs';

const P = phase('P8');
const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const DATE = '2026-08-08';
const out = {};
const b = await newBrowser(true);

// ── parent: connect, and record the socket at the transport level ─────────
const { c: pc, p: pp } = await ctx(P, b, 'sock-parent');
const sockets = [];
const frames = [];
pp.on('websocket', (ws) => {
  sockets.push({ url: ws.url(), closed: false });
  ws.on('framereceived', (f) => {
    const s = typeof f.payload === 'string' ? f.payload : f.payload?.toString('utf8') ?? '';
    frames.push({ dir: 'in', at: Date.now(), body: s.slice(0, 300) });
  });
  ws.on('framesent', (f) => {
    const s = typeof f.payload === 'string' ? f.payload : f.payload?.toString('utf8') ?? '';
    frames.push({ dir: 'out', at: Date.now(), body: s.slice(0, 160) });
  });
  ws.on('close', () => { const e = sockets.find((x) => x.url === ws.url()); if (e) e.closed = true; });
});

await login(P, pp, 'parent', 'otaona11@tmm3.uz', pwFor('otaona11@tmm3.uz'), 'sock-parent', { tab: /Ota-ona|Parent/i });
await goto(P, pp, `${PORTALS.teacher}/attendance`, 'sock-parent', 'socket-parent-connected');
await pp.waitForTimeout(6000);

const framesBefore = frames.length;
out.handshake = {
  socketsOpened: sockets.length,
  urls: sockets.map((s) => s.url.replace(/\?.*$/, '')),
  anyStillOpen: sockets.some((s) => !s.closed),
  framesBeforeWrite: framesBefore,
  // socket.io's engine sends "0{sid:…}" on open and "40" on namespace connect
  sawEngineOpen: frames.some((f) => /^0\{/.test(f.body)),
  sawNamespaceConnect: frames.some((f) => /^40/.test(f.body)),
};

// ── teacher: write attendance for that parent's child ─────────────────────
const { c: tc, p: tp } = await ctx(P, b, 'sock-teacher');
await login(P, tp, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'sock-teacher');
out.write = await tp.evaluate(async ([child, date]) => {
  const r = await fetch('/api/v1/attendance', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ childId: child, date, status: 'home_leave' }] }),
  });
  return { status: r.status, body: (await r.text()).slice(0, 120) };
}, [CHILD, DATE]);

// ── did the event reach the parent's socket? ──────────────────────────────
await pp.waitForTimeout(8000);
const after = frames.slice(framesBefore);
out.afterWrite = {
  newFrames: after.length,
  attendanceFrames: after.filter((f) => /attendance/i.test(f.body)).map((f) => f.body.slice(0, 220)),
  anyEventFrame: after.filter((f) => /^42/.test(f.body)).map((f) => f.body.slice(0, 220)).slice(0, 5),
};
out.verdict = {
  handshakeWorks: out.handshake.socketsOpened > 0 && out.handshake.sawNamespaceConnect,
  realtimeDelivers: out.afterWrite.attendanceFrames.length > 0,
};

out.shotParent = await shot(P, pp, 'sock-parent', 'socket-parent-after-event', { full: true });
console.log(JSON.stringify(out, null, 1));
save(P, 'p8-socket.json', out);
await pc.close(); await tc.close(); await b.close();
