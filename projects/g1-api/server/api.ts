import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';

const app = express();
const port = 4301;
const issuer = 'http://127.0.0.1:4301/local-lab-issuer';
const audience = 'http://127.0.0.1:4301/local-orders-api';
const signingKey = 'G1-ONLY-LOCAL-FAKE-KEY-never-use-in-production';
const users = {
  alice: { display: 'Alice Demo', role: 'member' },
  bob: { display: 'Bob Demo', role: 'member' }
} as const;
type UserId = keyof typeof users;
type Claims = { iss: string; aud: string; sub: UserId; iat: number; exp: number; jti: string; token_use: string };
type OrderInput = { quantity: number };
type LabRequest = Request & { claims?: Claims };
type Order = { id: string; owner: UserId; quantity: number; unitPrice: number; total: number };
const revoked = new Set<string>();
const bffSessions = new Map<string, string>();
const orders: Order[] = [];
const idempotent = new Map<string, Order>();

app.use(express.json({ limit: '8kb' }));
app.use((req, res, next) => {
  const origin = req.header('Origin');
  if (origin === 'http://127.0.0.1:4300') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key, X-Lab-Delay-Response, X-XSRF-TOKEN');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.post('/lab/angular-xsrf', (req, res) => {
  const cookie = req.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith('g1_angular_xsrf='))?.slice('g1_angular_xsrf='.length);
  const header = req.get('x-xsrf-token');
  const matches = Boolean(cookie && header && cookie === header);
  log('angular-xsrf', { origin: req.get('origin') ?? '(same-origin)', cookiePresent: Boolean(cookie), headerPresent: Boolean(header), matches });
  res.status(matches ? 200 : 403).json({ cookiePresent: Boolean(cookie), headerPresent: Boolean(header), matches });
});
app.get(['/lab/interceptor/trusted', '/lab/interceptor/external'], (req, res) => {
  const authorizationPresent = Boolean(req.get('authorization'));
  log('interceptor', { path: req.path, authorizationPresent });
  res.json({ path: req.path, authorizationPresent });
});

function encode(value: object): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function sign(unsigned: string): string { return crypto.createHmac('sha256', signingKey).update(unsigned).digest('base64url'); }
function issueToken(sub: UserId, aud = audience, exp = Math.floor(Date.now() / 1000) + 300): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ iss: issuer, aud, sub, iat: Math.floor(Date.now() / 1000), exp, jti: crypto.randomUUID(), token_use: 'access' });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}
function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(`[G1 API] ${event} ${JSON.stringify(fields)}`);
}
function reject(res: Response, status: number, code: string, reason: string): void {
  log('auth.reject', { status, code, reason });
  res.status(status).json({ error: code, reason });
}

function bffSessionId(req: Request): string | undefined {
  return req.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith('g1_bff='))?.slice('g1_bff='.length);
}
function bffOriginAllowed(req: Request): boolean { return req.get('origin') === 'http://127.0.0.1:4300'; }

app.post('/bff/login', (req, res) => {
  if (!bffOriginAllowed(req)) { res.status(403).json({ error: 'invalid_origin' }); return; }
  const id = crypto.randomBytes(32).toString('hex');
  bffSessions.set(id, issueToken('alice'));
  res.cookie('g1_bff', id, { httpOnly: true, sameSite: 'strict', path: '/bff' });
  console.log('[G1 BFF] sesja utworzona; token pozostaje po stronie serwera');
  res.json({ message: 'Sesja BFF utworzona; token jest przechowywany przez serwer.' });
});
app.get('/bff/profile', async (req, res) => {
  const id = bffSessionId(req); const token = id ? bffSessions.get(id) : undefined;
  if (!token) { res.status(401).json({ error: 'missing_bff_session' }); return; }
  try {
    const apiResponse = await fetch(`http://127.0.0.1:${port}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`[G1 BFF] żądanie do API: HTTP ${apiResponse.status}`);
    res.status(apiResponse.status).json(await apiResponse.json());
  } catch { res.status(502).json({ error: 'api_unavailable' }); }
});
app.post('/bff/logout', (req, res) => {
  if (!bffOriginAllowed(req)) { res.status(403).json({ error: 'invalid_origin' }); return; }
  const id = bffSessionId(req); if (id) bffSessions.delete(id);
  res.clearCookie('g1_bff', { httpOnly: true, sameSite: 'strict', path: '/bff' });
  console.log('[G1 BFF] lokalna sesja usunięta'); res.json({ message: 'Sesja BFF usunięta.' });
});
function authenticate(req: LabRequest, res: Response, next: NextFunction): void {
  const bearer = req.header('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reject(res, 401, 'unauthorized', 'missing bearer token');
  const parts = bearer.split('.');
  if (parts.length !== 3) return reject(res, 401, 'unauthorized', 'malformed token');
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(unsigned));
  const provided = Buffer.from(parts[2]);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return reject(res, 401, 'unauthorized', 'signature invalid');
  }
  let claims: Claims;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; typ?: string };
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Claims;
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return reject(res, 401, 'unauthorized', 'unexpected algorithm or token type');
  } catch { return reject(res, 401, 'unauthorized', 'invalid token encoding'); }
  if (claims.iss !== issuer) return reject(res, 401, 'unauthorized', 'issuer mismatch');
  if (claims.aud !== audience) return reject(res, 401, 'unauthorized', 'audience mismatch');
  if (claims.token_use !== 'access') return reject(res, 401, 'unauthorized', 'not an access token');
  if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return reject(res, 401, 'unauthorized', 'token expired');
  if (!users[claims.sub] || revoked.has(claims.jti)) return reject(res, 401, 'unauthorized', 'unknown subject or revoked token');
  req.claims = claims;
  log('auth.accept', { subject: claims.sub, audience: claims.aud });
  next();
}

app.post('/auth/login', (req, res) => {
  const user = req.body?.user as string;
  if (user !== 'alice' && user !== 'bob') return reject(res, 400, 'invalid_user', 'choose alice or bob');
  log('auth.login', { subject: user });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ token: issueToken(user), display: users[user].display });
});
app.post('/auth/logout', authenticate, (req: LabRequest, res) => {
  const claims = req.claims!;
  revoked.add(claims.jti);
  log('auth.logout', { subject: claims.sub, revoked: true });
  res.json({ ok: true, message: 'Token unieważniony po stronie serwera.' });
});
app.get('/api/profile', authenticate, (req: LabRequest, res) => {
  const claims = req.claims!;
  res.json({ subject: claims.sub, display: users[claims.sub].display, role: users[claims.sub].role, audience: claims.aud });
});
app.post('/lab/token', (req, res) => {
  const variant = req.body?.variant as string;
  if (variant === 'wrong-audience') return res.json({ token: issueToken('alice', 'http://127.0.0.1:4301/another-api') });
  if (variant === 'expired') return res.json({ token: issueToken('alice', audience, Math.floor(Date.now() / 1000) - 10) });
  return reject(res, 400, 'invalid_variant', 'supported variants: wrong-audience, expired');
});

app.post('/api/orders', authenticate, (req: LabRequest, res) => {
  const claims = req.claims!;
  const before = orders.length;
  const body = req.body as Record<string, unknown>;
  const suppliedKeys = Object.keys(body ?? {});
  if (suppliedKeys.some((key) => key !== 'quantity')) {
    log('order.reject', { subject: claims.sub, reason: 'unexpected field', fields: suppliedKeys, stateBefore: before, stateAfter: orders.length });
    return res.status(400).json({ error: 'invalid_contract', reason: 'Dozwolone pole: quantity.' });
  }
  const quantity = body?.quantity;
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 5) {
    log('order.reject', { subject: claims.sub, reason: 'quantity out of range', stateBefore: before, stateAfter: orders.length });
    return res.status(400).json({ error: 'invalid_contract', reason: 'quantity musi być liczbą całkowitą od 1 do 5.' });
  }
  const key = req.header('Idempotency-Key');
  if (!key || key.length > 100) return res.status(400).json({ error: 'idempotency_key_required' });
  const dedupeKey = `${claims.sub}:${key}`;
  const previous = idempotent.get(dedupeKey);
  if (previous) {
    log('order.replay', { subject: claims.sub, orderId: previous.id, stateBefore: before, stateAfter: orders.length });
    return res.json({ order: previous, replayed: true, state: { orderCount: orders.length } });
  }
  // Cena i właściciel są wyznaczane przez serwer, nigdy z JSON klienta.
  const order: Order = { id: crypto.randomUUID(), owner: claims.sub, quantity: quantity as number, unitPrice: 12, total: (quantity as number) * 12 };
  orders.push(order);
  idempotent.set(dedupeKey, order);
  log('order.created', { subject: claims.sub, orderId: order.id, quantity, total: order.total, stateBefore: before, stateAfter: orders.length });
  const response = { order, replayed: false, state: { orderCount: orders.length } };
  if (req.header('X-Lab-Delay-Response') === 'true') {
    log('order.response_delayed', { orderId: order.id, stateAfter: orders.length });
    setTimeout(() => res.status(201).json(response), 700);
    return;
  }
  res.status(201).json(response);
});

app.post('/lab/reset', (_req, res) => {
  const before = orders.length;
  orders.splice(0, orders.length);
  idempotent.clear();
  revoked.clear();
  bffSessions.clear();
  res.clearCookie('g1_bff', { httpOnly: true, sameSite: 'strict', path: '/bff' });
  log('lab.reset', { stateBefore: before, stateAfter: orders.length });
  res.json({ ok: true, orderCount: orders.length, revokedTokenCount: revoked.size });
});

app.listen(port, '127.0.0.1', () => log('listening', { url: `http://127.0.0.1:${port}`, scope: 'local-only' }));
