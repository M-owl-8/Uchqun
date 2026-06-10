/**
 * DEF-013 socket delivery probe — Node.js CommonJS
 * Tests if parent socket receives teacher→parent messages after parseInt fix.
 *
 * Run from project root:
 *   node --require teacher/node_modules/socket.io-client tests/def013-socket-probe.cjs
 */
const { io } = require('C:/work/Uchqun/teacher/node_modules/socket.io-client');
const https = require('https');

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
        try {
          const cookies = res.headers['set-cookie'] || [];
          resolve({ status: res.statusCode, body: JSON.parse(raw), cookies });
        } catch(e) {
          reject(e);
        }
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
    const idx = kv.indexOf('=');
    if (idx > 0) {
      const k = kv.slice(0, idx).trim();
      const v = kv.slice(idx + 1).trim();
      obj[k] = v;
    }
  }
  return obj;
}

async function login(email) {
  const r = await apiPost('/api/v1/auth/login', { email, password: PW });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  const cookies = parseCookies(r.cookies);
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const accessToken = cookies.accessToken; // raw JWT value
  return { userId: r.body.user?.id, cookieStr, cookies, accessToken };
}

async function sendMessage(conversationId, content, cookieStr) {
  return apiPost('/api/v1/chat/messages', { conversationId, content }, cookieStr);
}

function connectSocket(socketUrl, cookieStr, accessToken) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.disconnect();
      reject(new Error(`Socket connect timeout to "${socketUrl}"`));
    }, 8000);

    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      extraHeaders: { Cookie: cookieStr },
      // Backend accepts token from auth.token OR from cookie header
      auth: accessToken ? { token: accessToken } : {},
      reconnection: false,
      timeout: 8000,
    });

    s.on('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });

    s.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error(`connect_error to "${socketUrl}": ${err.message}`));
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

  // 2. Try socket URL variants — identify which one connects
  const urlsToTry = [
    `${API}`,            // correct: connects to namespace /
    `${API}/api/v1`,     // what getSocketUrl() returns if VITE_API_URL ends in /api/v1
    `${API}/api`,        // what getSocketUrl() returns if VITE_API_URL ends in /api
  ];

  let connectedSocket = null;
  let connectedUrl = null;

  for (const url of urlsToTry) {
    try {
      process.stdout.write(`\n[2] Trying socket URL: ${url} ... `);
      const s = await connectSocket(url, parent.cookieStr, parent.accessToken);
      console.log(`✓ connected (socket.id=${s.id})`);
      connectedSocket = s;
      connectedUrl = url;
      break;
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  if (!connectedSocket) {
    console.log('\n[FAIL] Parent socket could not connect to any URL variant.');
    process.exit(1);
  }

  // 3. Register listener then teacher sends
  console.log(`\n[3] Socket connected to: ${connectedUrl}`);
  const msg = `DEF013-PROBE-${Date.now()}`;

  const receivePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No chat:message event in ${TIMEOUT}ms`)), TIMEOUT);
    connectedSocket.on('chat:message', (data) => {
      console.log(`    [socket] chat:message received: "${data?.content}"`);
      if (data?.content === msg) {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  await new Promise(r => setTimeout(r, 800)); // let socket settle
  console.log(`[4] Teacher sending: "${msg}"`);
  const sendResult = await sendMessage(parentConvoId, msg, teacher.cookieStr);
  console.log(`    HTTP ${sendResult.status} — ${sendResult.body?.id ? 'message id: ' + sendResult.body.id : JSON.stringify(sendResult.body).slice(0, 80)}`);

  // 4. Wait for reception
  try {
    const received = await receivePromise;
    console.log(`\n✅ PASS — socket delivered the message!`);
    console.log(`   content: "${received.content}"`);
    console.log(`   conversationId: ${received.conversationId}`);
    console.log(`   senderRole: ${received.senderRole}`);
    connectedSocket.disconnect();
    process.exit(0);
  } catch (err) {
    console.log(`\n❌ FAIL — ${err.message}`);
    console.log(`   Fix is deployed but socket delivery is failing.`);
    console.log(`   Connected URL was: ${connectedUrl}`);
    connectedSocket.disconnect();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
