import express from 'express';
import type { Request, RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';

type User = { id: string; name: string; tenantId: string; canEdit: boolean };

declare global {
  namespace Express {
    interface Request { labUser: User }
  }
}

const app = express();
const port = Number(4301);
const allowedOrigins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);
const users = new Map([
  ['alice', { id: 'alice', name: 'Alice', tenantId: 'north', canEdit: true }],
  ['bob', { id: 'bob', name: 'Bob', tenantId: 'south', canEdit: false }],
]);
const documents = new Map([
  ['DOC-1001', { id: 'DOC-1001', title: 'Plan premiery', body: 'Notatka Alice: plan demonstracyjnej premiery produktu.', ownerId: 'alice', ownerName: 'Alice', tenantId: 'north' }],
  ['DOC-1002', { id: 'DOC-1002', title: 'Notatka zespołu', body: 'Wspólny dokument zespołu północnego.', ownerId: 'alice', ownerName: 'Alice', tenantId: 'north' }],
  ['DOC-2001', { id: 'DOC-2001', title: 'Notatka budżetowa', body: 'Notatka Boba: fikcyjny budżet ćwiczeniowy.', ownerId: 'bob', ownerName: 'Bob', tenantId: 'south' }],
]);
const sessions = new Map<string, User>();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

function sessionUser(req: Request) {
  const cookie = req.headers.cookie ?? '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('idor_session='))?.slice('idor_session='.length);
  return token ? sessions.get(token) ?? null : null;
}

const requireSession: RequestHandler = (req, res, next) => {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Zaloguj się w tym labie, aby wykonać żądanie.' });
  req.labUser = user;
  next();
};

app.get('/api/health', (_req, res) => res.json({ ok: true, lab: 'idor' }));

app.post('/api/session', (req, res) => {
  const user = users.get(req.body?.userId);
  if (!user) return res.status(400).json({ error: 'Nieznany użytkownik testowy.' });
  const token = randomBytes(24).toString('hex');
  sessions.set(token, user);
  res.setHeader('Set-Cookie', `idor_session=${token}; HttpOnly; SameSite=Lax; Path=/`);
  console.log(`session created for ${user.id}`);
  return res.json(user);
});

app.get('/api/session', requireSession, (req, res) => {
  console.log(`session checked for ${req.labUser.id} -> 200`);
  return res.json(req.labUser);
});

app.delete('/api/session', (req, res) => {
  const cookie = req.headers.cookie ?? '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('idor_session='))?.slice('idor_session='.length);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'idor_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  console.log('session ended');
  return res.json({ ok: true });
});

app.get('/api/documents', requireSession, (req, res) => {
  const tenantDocuments = [...documents.values()].filter((document) => document.tenantId === req.labUser.tenantId);
  console.log(`${req.labUser.id} listed tenant documents -> 200 (${tenantDocuments.length})`);
  return res.json(tenantDocuments.map(({ id, title }) => ({ id, title })));
});

app.get<{ id: string }>('/api/documents/:id', requireSession, (req, res) => {
  const document = documents.get(req.params.id);
  const status = document ? 200 : 404;
  console.log(`document API read by ${req.labUser.id}: ${req.params.id} -> ${status}`);
  if (!document) return res.status(status).json({ error: 'Nie znaleziono dokumentu.' });
  return res.json(document);
});

app.get<{ id: string }>('/api/solution/documents/:id', requireSession, (req, res) => {
  const document = documents.get(req.params.id);
  if (!document || document.tenantId !== req.labUser.tenantId || document.ownerId !== req.labUser.id) {
    console.log(`protected document read by ${req.labUser.id}: ${req.params.id} -> 404`);
    return res.status(404).json({ error: 'Nie znaleziono dokumentu.' });
  }
  console.log(`protected document read by ${req.labUser.id}: ${req.params.id} -> 200`);
  return res.json(document);
});

app.patch<{ id: string }>('/api/solution/documents/:id', requireSession, (req, res) => {
  const document = documents.get(req.params.id);
  if (!document || document.tenantId !== req.labUser.tenantId || document.ownerId !== req.labUser.id) {
    console.log(`protected document edit by ${req.labUser.id}: ${req.params.id} -> 404 tenant`);
    return res.status(404).json({ error: 'Nie znaleziono dokumentu.' });
  }
  if (!req.labUser.canEdit) return res.status(403).json({ error: 'Brak uprawnienia do operacji edit.' });
  const keys = Object.keys(req.body ?? {});
  if (keys.some((key) => key !== 'body') || typeof req.body?.body !== 'string' || req.body.body.length > 300) {
    return res.status(400).json({ error: 'invalid_contract', allowedFields: ['body'], maxLength: 300 });
  }
  document.body = req.body.body;
  console.log(`protected document edit by ${req.labUser.id}: ${req.params.id} -> 200 fields=body`);
  return res.json({ id: document.id, title: document.title, body: document.body });
});

app.listen(port, '127.0.0.1', (error) => { if (error) { console.error(error); process.exitCode = 1; return; } console.log('IDOR API: http://localhost:' + port); });




