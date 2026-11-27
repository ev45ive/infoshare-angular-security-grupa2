import express, { Router } from 'express';

const app = express();
const router = Router();

app.use((req, res, next) => {
  if (req.headers.origin === 'http://localhost:4201') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});

router.get('/example', (_req, res) => {
  res.json({ message: 'Odpowiedź serwera eksperymentów' });
});

router.get('/storage-cookie', (_req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.cookie('g1_visible_demo', 'public', { sameSite: 'lax', path: '/' });
  res.cookie('g1_http_only_demo', 'private', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.setHeader('Cache-Control', 'no-store').json({ cookieSet: true });
});

const cacheEvents: Array<{ run: string; message: string }> = [];
let cacheSequence = 0;
router.get('/cache-events', (req, res) => { res.setHeader('Cache-Control', 'no-store').json(cacheEvents.filter(event => event.run === req.query.run).map(event => event.message)); });
router.get('/cache-probe/:policy', (req, res) => {
  const policy = req.params.policy;
  if (!['private', 'no-cache', 'no-store'].includes(policy)) { res.sendStatus(404); return; }
  const cacheControl = policy === 'private' ? 'private, max-age=120' : policy;
  const etag = `"g1-${policy}"`;
  const notModified = req.get('if-none-match') === etag;
  const message = `${policy}: ${notModified ? '304 walidacja' : '200 odpowiedź'}; If-None-Match=${req.get('if-none-match') ?? '-'}`;
  cacheEvents.push({ run: String(req.query.run ?? ''), message }); if (cacheEvents.length > 200) cacheEvents.shift();
  console.log(`[CACHE] ${message}`);
  res.setHeader('Cache-Control', cacheControl).setHeader('ETag', etag);
  if (notModified) { res.status(304).end(); return; }
  res.json({ policy, issuedSequence: ++cacheSequence, fictionalData: 'przykładowa odpowiedź' });
});

const httpEvents: Array<{ run: string; message: string }> = [];
router.get('/http-events', (req, res) => { res.setHeader('Cache-Control', 'no-store').json(httpEvents.filter(event => event.run === req.query.run).map(event => event.message)); });
router.all('/http-probe', (req, res) => {
  const info = `${req.method} ${req.path}: Origin=${req.get('origin') ?? '-'}, Sec-Fetch-Site=${req.get('sec-fetch-site') ?? '-'}`;
  httpEvents.push({ run: String(req.query.run ?? ''), message: info }); if (httpEvents.length > 200) httpEvents.shift(); console.log(`[HTTP] ${info}`);
  res.removeHeader('Access-Control-Allow-Origin');
  res.setHeader('Cache-Control', 'no-store').type('html').send('<!doctype html><title>Odpowiedź API</title><p>Żądanie dotarło do API.</p>');
});

router.get('/relations-child', (req, res) => {
  console.log(`${req.method} ${req.path}: dokument innego originu`);
  res.type('html').send('<!doctype html><title>Dokument API</title><p>Inny port, inny origin.</p>');
});

router.get('/rich-text', (_req, res) => {
  res.json({
    content: `<h2 id="sekcja">Wiadomość z API</h2><p>Tekst <strong>pogrubiony</strong> i <em>wyróżniony</em>.</p><a name="cel" href="#sekcja" onclick="this.textContent='Kliknięto'">Przejdź do sekcji</a>`,
    clobbering: `<p>Treść komentarza</p><a id="config"></a><a id="config" name="url" href="https://attacker.example"></a>`,
  });
});

app.use(router);
app.listen(4304, '127.0.0.1', () => console.log('Serwer eksperymentów: http://localhost:4304 (127.0.0.1)'));
