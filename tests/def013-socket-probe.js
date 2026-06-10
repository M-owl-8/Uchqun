/**
 * DEF-013 socket delivery probe — Node.js (no browser)
 * Verifies that teacher→parent realtime delivery works after the parseInt fix.
 *
 * Usage: node tests/def013-socket-probe.js
 */
import { io } from 'socket.io-client';
import https from 'https';

const API   = 'https://uchqun-production-b484.up.railway.app';
const PW    = 'Test@2026';
const TIMEOUT = 15000;

function apiPost(path, body, cookieStr) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'uchqun-production-b484.up.railway.app',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', d => (raw += d));
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, body: JSON.parse(raw), cookies });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseCookies(setCookieArr) {
  const obj = {};
  for (const c of setCookieArr) {
    const [kv] = c.split(';');
    const [k, v] = kv.split('=');
    if (k && v) obj[k.trim()] = v.trim();
  }
  return obj;
}

async function login(email) {
  const r = await apiPost('/api/v1/auth/login', { email, password: PW });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status}`);
  const cookies = parseCookies(r.cookies);
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return { userId: r.body.user?.id, cookieStr, cookies };
}

async function sendMessage(conversationId, content, cookieStr) {
  const r = await apiPost('/api/v1/chat/messages', { conversationId, content }, cookieStr);
  return r;
}

async function connectSocket(socketUrl, cookieStr) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.disconnect();
      reject(new Error(`Socket connect timeout to ${socketUrl}`));
    }, 10000);

    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      extraHeaders: { Cookie: cookieStr },
      reconnection: false,
      timeout: 10000,
    });

    s.on('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });

    s.on('connect_error', (err) => {
      clearTimeout(timer);
      s.disconnect();
      reject(new Error(`connect_error to ${socketUrl}: ${err.message}`));
    });
  });
}

async function main() {
  console.log('=== DEF-013 Socket Delivery Probe ===\n');

  // 1. Login both users
  console.log('[1] Logging in parent1 and teacher1...');
  const [parent, teacher] = await Promise.all([
    login('parent1@uchqun.uz'),
    login('teacher1@uchqun.uz'),
  ]);
  console.log(`    parent1 UUID: ${parent.userId}`);
  console.log(`    teacher1 UUID: ${teacher.userId}`);

  const parentConvoId = `parent:${parent.userId}`;

  // 2. Try connecting parent socket to multiple URL variants
  const urlsToTry = [
    `${API}`,
    `${API}/api/v1`,
    `${API}/api`,
  ];

  let connectedSocket = null;
  let connectedUrl = null;

  for (const url of urlsToTry) {
    try {
      console.log(`\n[2] Attempting socket connection to: ${url}`);
      const s = await connectSocket(url, parent.cookieStr);
      console.log(`    ✓ Connected! socket.id=${s.id}`);
      connectedSocket = s;
      connectedUrl = url;
      break;
    } catch (err) {
      console.log(`    ✗ Failed: ${err.message}`);
    }
  }

  if (!connectedSocket) {
    console.log('\n[FAIL] Parent socket could not connect to any URL variant.');
    process.exit(1);
  }

  // 3. Wait for the message
  console.log(`\n[3] Waiting for chat:message event on socket (url: ${connectedUrl})...`);
  const msg = `DEF013-PROBE-${Date.now()}`;

  const receivePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout — no event after ${TIMEOUT}ms`)), TIMEOUT);
    connectedSocket.on('chat:message', (data) => {
      if (data?.content === msg) {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  // 4. Teacher sends message
  await new Promise(r => setTimeout(r, 1000)); // brief settle
  console.log(`[4] Teacher sending: "${msg}" to ${parentConvoId}`);
  const sendResult = await sendMessage(parentConvoId, msg, teacher.cookieStr);
  console.log(`    Send HTTP status: ${sendResult.status}`);

  // 5. Check reception
  try {
    const received = await receivePromise;
    console.log(`\n✅ PASS — parent socket received the message!`);
    console.log(`   content: "${received.content}"`);
    console.log(`   conversationId: ${received.conversationId}`);
    console.log(`   senderRole: ${received.senderRole}`);
    connectedSocket.disconnect();
    process.exit(0);
  } catch (err) {
    console.log(`\n❌ FAIL — ${err.message}`);
    console.log(`   The fix is deployed but socket delivery still fails.`);
    console.log(`   Connected URL: ${connectedUrl}`);
    connectedSocket.disconnect();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
