// ELVIAN backend — secret-code lock/unlock, per-chat prompt counter and optional AI proxy.
// Node 18+, no dependencies.  The secret code and API key live ONLY here (never in the web page).
//
//   1) node server.js --hash "your secret code"      -> prints UNLOCK_CODE_HASH=...
//   2) run it (example):
//        ALLOWED_ORIGIN=https://YOURNAME.github.io  UNLOCK_CODE_HASH=salt:hash \
//        LLM_URL=https://your-freellmapi/v1/chat/completions  LLM_KEY=sk-...  LLM_MODEL=auto  node server.js
//   3) put its https address in e-ELVIAN → Settings → Secure backend.
// GitHub Pages cannot run this file; host it on Render / Railway / Fly.io / your own PC.
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
// Load secrets from the private .env file next to this script (never uploaded to GitHub).
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !l.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
} } catch {}
const E = process.env, PORT = +E.PORT || 8787, ORIGIN = E.ALLOWED_ORIGIN || '', LIMIT = +E.CHAT_LIMIT || 50, MAX = 4e6, FILE = path.join(__dirname, 'state.json');

if (process.argv[2] === '--hash') {
  const salt = crypto.randomBytes(16).toString('hex');
  console.log('UNLOCK_CODE_HASH=' + salt + ':' + crypto.scryptSync(String(process.argv[3] || ''), salt, 32).toString('hex'));
  process.exit(0);
}
if (!ORIGIN) { console.error('Set ALLOWED_ORIGIN (your site address, e.g. https://name.github.io).'); process.exit(1); }
if (!E.UNLOCK_CODE_HASH) { console.error('Set UNLOCK_CODE_HASH (run: node server.js --hash "code").'); process.exit(1); }
const [SALT, HASH] = E.UNLOCK_CODE_HASH.split(':');

let st = {}; try { st = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => fs.writeFile(FILE, JSON.stringify(st), () => {});
const chatState = id => (st[id] = st[id] || { n: 0, cap: LIMIT, locked: false });
const hits = new Map();
function allow(ip, key, max, windowMs) { // fixed-window rate limiter per IP
  const k = ip + '|' + key, now = Date.now(), h = hits.get(k) || { c: 0, t: now };
  if (now - h.t > windowMs) { h.c = 0; h.t = now; }
  h.c++; hits.set(k, h); return h.c <= max;
}
setInterval(() => { const n = Date.now(); for (const [k, h] of hits) if (n - h.t > 864e5) hits.delete(k); }, 6e5).unref();
function codeOk(code) {
  try {
    const a = crypto.scryptSync(String(code || '').slice(0, 200), SALT, 32), b = Buffer.from(HASH, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}
// ---- 6-hour refill for customers (the secret code stays owner-only) ----
const COOLDOWN = (+E.COOLDOWN_HOURS || 6) * 36e5, REFILL = +E.REFILL_PROMPTS || 15;
function refresh(s) { if (s.locked && s.lockedAt && Date.now() - s.lockedAt >= COOLDOWN) { s.cap += REFILL; s.locked = false; s.lockedAt = 0; save(); } }
const lockInfo = s => ({ used: s.n, cap: s.cap, locked: s.locked, owner: !!(s.locked && !s.lockedAt), unlockAt: s.locked && s.lockedAt ? s.lockedAt + COOLDOWN : 0 });

// ---- Google sign-in + encrypted per-user chat storage ----
const SESSION_SECRET = E.SESSION_SECRET || '', DATA_KEY = E.DATA_KEY || '', GID = E.GOOGLE_CLIENT_ID || '', SYNC_MAX = 1000000;
const TOKENINFO = E.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
const DATA_DIR = path.resolve(E.DATA_DIR || path.join(__dirname, 'data'));
const hmac = d => crypto.createHmac('sha256', SESSION_SECRET).update(d).digest();
const signTok = p => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + hmac(b).toString('base64url'); };
function verifyTok(t) {
  try {
    const [b, sig] = String(t || '').split('.'); if (!b || !sig || !SESSION_SECRET) return null;
    const want = hmac(b), got = Buffer.from(sig, 'base64url');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() && typeof p.sub === 'string' ? p : null;
  } catch { return null; }
}
const aesKey = () => crypto.createHash('sha256').update('elvian-data:' + DATA_KEY).digest();
const encrypt = txt => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', aesKey(), iv), ct = Buffer.concat([c.update(txt, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64'); };
const decrypt = b64 => { const b = Buffer.from(b64, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', aesKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); };
const userKey = sub => 'u_' + hmac('user:' + sub).toString('hex');
const up = (cmd) => fetch(E.UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + E.UPSTASH_REDIS_REST_TOKEN }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(10000) }).then(r => r.json());
const store = {   // Upstash Redis (free, survives restarts) when configured; otherwise files in DATA_DIR
  async get(k) { if (E.UPSTASH_REDIS_REST_URL) return (await up(['GET', k])).result || null; try { return fs.readFileSync(path.join(DATA_DIR, k), 'utf8'); } catch { return null; } },
  async set(k, v) { if (E.UPSTASH_REDIS_REST_URL) { await up(['SET', k, v]); return; } fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(path.join(DATA_DIR, k), v); },
  async del(k) { if (E.UPSTASH_REDIS_REST_URL) { await up(['DEL', k]); return; } try { fs.unlinkSync(path.join(DATA_DIR, k)); } catch {} },
};
async function verifyGoogle(cred) {
  if (!GID) throw Object.assign(new Error('not configured'), { status: 501 });
  const r = await fetch(TOKENINFO + '?id_token=' + encodeURIComponent(cred), { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw Object.assign(new Error('invalid'), { status: 401 });
  const j = await r.json();
  if (j.aud !== GID || !j.sub || !(Number(j.exp) * 1000 > Date.now()) || !/^(https:\/\/)?accounts\.google\.com$/.test(j.iss || '')) throw Object.assign(new Error('invalid'), { status: 401 });
  return j;
}
async function readBody(req, limit) { let size = 0; const parts = []; for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { status: 413 }); parts.push(c); } return Buffer.concat(parts).toString('utf8'); }
const validId = id => typeof id === 'string' && /^[a-z0-9]{6,40}$/.test(id);

http.createServer(async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const h = { 'Access-Control-Allow-Origin': ORIGIN, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST,GET,PUT,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': 'X-Prompts-Used', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  const json = (c, o) => { res.writeHead(c, { ...h, 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  try {
    if (req.headers.origin && req.headers.origin !== ORIGIN) return json(403, { error: 'forbidden' });
    if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
    const url = (req.url || '').split('?')[0];
    if (req.method === 'GET' && url === '/api/health') return json(200, { ok: true });
    if (req.method === 'GET' && url === '/') { res.writeHead(200, { ...h, 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Elvian backend is running.'); }
    if (url === '/api/sync') {   // chats of a signed-in Google account (end-to-end encrypted at rest)
      if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return json(405, { error: 'method not allowed' });
      if (!SESSION_SECRET || !DATA_KEY) return json(501, { error: 'sync is not configured' });
      if (!allow(ip, 'sync', 60, 6e4)) return json(429, { error: 'slow down' });
      const user = verifyTok(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      if (!user) return json(401, { error: 'sign in again' });
      const key = userKey(user.sub);
      if (req.method === 'GET') { const v = await store.get(key); let data = null; if (v) { try { data = JSON.parse(decrypt(v)); } catch {} } return json(200, { data }); }
      if (req.method === 'DELETE') { await store.del(key); return json(200, { ok: true }); }
      let body; try { body = JSON.parse(await readBody(req, SYNC_MAX + 20000)); } catch (e) { return json(e.status || 400, { error: e.status === 413 ? 'too large' : 'bad json' }); }
      const d = body && body.data;
      if (!d || d.v !== 1 || !Array.isArray(d.chats) || d.chats.length > 500) return json(400, { error: 'bad data' });
      const txt = JSON.stringify(d); if (txt.length > SYNC_MAX) return json(413, { error: 'too large' });
      await store.set(key, encrypt(txt)); return json(200, { ok: true });
    }
    if (req.method !== 'POST') return json(404, { error: 'not found' });
    if (!allow(ip, 'all', 120, 6e4)) return json(429, { error: 'slow down' });
    let size = 0; const parts = [];
    for await (const c of req) { size += c.length; if (size > MAX) return json(413, { error: 'too large' }); parts.push(c); }
    let b; try { b = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { return json(400, { error: 'bad json' }); }
    if (url === '/api/auth/google') {
      if (!SESSION_SECRET || !GID) return json(501, { error: 'sign-in is not configured' });
      if (!allow(ip, 'auth', 12, 6e5)) return json(429, { error: 'too many attempts' });
      try { const j = await verifyGoogle(String((b && b.credential) || '')), exp = Date.now() + 30 * 864e5; return json(200, { token: signTok({ sub: j.sub, exp }), exp, user: { name: String(j.given_name || j.name || '').slice(0, 40) } }); }
      catch (e) { return json(e.status || 401, { error: 'could not verify sign-in' }); }
    }
    if (!b || !validId(b.chat)) return json(400, { error: 'bad chat id' });
    const s = chatState(b.chat); refresh(s);

    if (url === '/api/status') return json(200, lockInfo(s));
    if (url === '/api/unlock' || url === '/api/lock') {
      if (!allow(ip, 'code', 5, 9e5)) return json(429, { error: 'too many attempts' });   // brute-force guard
      if (!codeOk(b.code)) return json(401, { error: 'wrong code' });
      if (url === '/api/unlock') { s.cap += LIMIT; s.locked = false; s.lockedAt = 0; } else { s.locked = true; s.lockedAt = 0; }
      save(); return json(200, { ok: true, ...lockInfo(s) });
    }
    if (url === '/api/chat') {
      if (!E.LLM_URL) return json(501, { error: 'LLM_URL not configured' });
      if (!allow(ip, 'chat', 20, 6e4) || !allow(ip, 'day', 400, 864e5)) return json(429, { error: 'rate limit' });
      if (s.locked || s.n >= s.cap) { s.locked = true; if (!s.lockedAt && s.n >= s.cap) s.lockedAt = Date.now(); save(); return json(423, { error: 'locked', ...lockInfo(s) }); }
      const m = b.messages;
      if (!Array.isArray(m) || !m.length || m.length > 40) return json(400, { error: 'bad messages' });
      const clean = m.map(x => ({ role: ['system', 'user', 'assistant'].includes(x && x.role) ? x.role : null, content: x && x.content }))
        .filter(x => x.role && (typeof x.content === 'string' ? x.content.length <= 24000 : Array.isArray(x.content)));
      if (clean.length !== m.length) return json(400, { error: 'bad message' });
      s.n++; save();
      const up = await fetch(E.LLM_URL, { method: 'POST', signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json', ...(E.LLM_KEY ? { Authorization: 'Bearer ' + E.LLM_KEY } : {}) },
        body: JSON.stringify({ model: E.LLM_MODEL || 'auto', stream: true, messages: clean }) });
      res.writeHead(up.status, { ...h, 'Content-Type': up.headers.get('content-type') || 'text/event-stream', 'X-Prompts-Used': String(s.n) });
      if (!up.body) return res.end();
      for await (const ch of up.body) res.write(ch);
      return res.end();
    }
    return json(404, { error: 'not found' });
  } catch (e) { if (!res.headersSent) json(500, { error: 'server error' }); else res.end(); }
}).listen(PORT, () => console.log('Elvian backend listening on ' + PORT));

// Keep Render's free plan awake: while the service is up, ping our own public address every 10 minutes.
// (Render sets RENDER_EXTERNAL_URL automatically; elsewhere set KEEP_ALIVE_URL to your service address.)
const SELF = String(E.KEEP_ALIVE_URL || E.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
if (SELF) setInterval(() => { fetch(SELF + '/api/health', { signal: AbortSignal.timeout(20000) }).catch(() => {}); }, 10 * 60 * 1000);
