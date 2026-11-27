import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

type Mode = 'off' | 'tt-report' | 'tt-enforce' | 'tt-default' | 'report' | 'enforce' | 'hash' | 'nonce-reuse' | 'environment';
const app = express();
const port = Number(process.env.CONTENT_POLICY_PORT ?? 4305);
const corsPort = Number(process.env.CONTENT_POLICY_CORS_PORT ?? 4306);
const browserRoot = path.resolve('dist/browser');
const sriFixture = "window.__sriProbe = 'loaded';";
const sriHash = createHash('sha384').update(sriFixture).digest('base64');
const cachedDocumentNonce = randomBytes(18).toString('base64');
const cachedDocumentEtag = '"cached-document-v1"';
const reusedNonce = randomBytes(18).toString('base64');
const allowedModes = new Set<Mode>(['off', 'tt-report', 'tt-enforce', 'tt-default', 'report', 'enforce', 'hash', 'nonce-reuse', 'environment']);

function selectedMode(req: Request): Mode {
  const candidate = req.query.mode;
  return typeof candidate === 'string' && allowedModes.has(candidate as Mode) ? candidate as Mode : 'off';
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const mode = selectedMode(req);
  res.setHeader('X-Content-Policy-Lab-Mode', mode);
  const environment = req.query.env === 'development' ? 'development' : 'production';
  res.setHeader('X-Content-Policy-Lab-Environment', environment);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.on('finish', () => console.log(`[${mode}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

app.use(express.json({ type: ['application/csp-report', 'application/reports+json'], limit: '32kb' }));
app.post('/csp-report', (req: Request, res: Response) => {
  console.log(`[CSP report] ${JSON.stringify(req.body)}`);
  res.sendStatus(204);
});

app.get('/assets/sri-probe.js', (_req: Request, res: Response) => {
  res.type('application/javascript').setHeader('Cache-Control', 'no-store').send(sriFixture);
});
app.get('/sri-meta.json', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store').json({ integrity: `sha384-${sriHash}` });
});

app.get('/cache-document', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  res.setHeader('ETag', cachedDocumentEtag);
  if (req.headers['if-none-match'] === cachedDocumentEtag) {
    // Wariant błędny: nowa polityka 304 może zostać połączona z poprzednim HTML.
    if (req.query.variant === 'mismatch') res.setHeader('Content-Security-Policy', `script-src 'nonce-${randomBytes(18).toString('base64')}'`);
    res.status(304).end(); return;
  }
  res.setHeader('Content-Security-Policy', `script-src 'nonce-${cachedDocumentNonce}'`);
  res.type('html').send(`<!doctype html><script nonce="${cachedDocumentNonce}">window.cacheProbe = 'ok';</script>`);
});
app.get('/redirect-probe', (_req: Request, res: Response) => res.redirect(302, '/error-probe'));
app.get('/error-probe', (_req: Request, res: Response) => {
  res.status(404).type('html').send('<!doctype html><title>404</title><p>Kontrolowany błąd HTTP</p>');
});

app.use(express.static(browserRoot, { index: false, fallthrough: true }));

app.get('/{*path}', async (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/assets/')) return next();
  const mode = selectedMode(req);
  const nonce = mode === 'nonce-reuse' ? reusedNonce : randomBytes(18).toString('base64');

  if (mode === 'tt-report') {
    res.setHeader('Content-Security-Policy-Report-Only', "require-trusted-types-for 'script'; report-uri /csp-report");
  } else if (mode === 'tt-enforce') {
    res.setHeader('Content-Security-Policy', "require-trusted-types-for 'script'; report-uri /csp-report");
  } else if (mode === 'tt-default') {
    res.setHeader('Content-Security-Policy', "require-trusted-types-for 'script'; trusted-types default angular angular#unsafe-bypass angular#unsafe-jit; report-uri /csp-report");
  } else if (mode === 'report') {
    res.setHeader('Content-Security-Policy-Report-Only', `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; report-uri /csp-report`);
  } else if (mode === 'enforce' || mode === 'nonce-reuse') {
    res.setHeader('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; report-uri /csp-report`);
  } else if (mode === 'hash') {
    const probe = 'window.__hashProbe = "executed";';
    const hash = createHash('sha256').update(probe).digest('base64');
    res.setHeader('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}' 'sha256-${hash}'; style-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; report-uri /csp-report`);
  } else if (mode === 'environment') {
    const name = req.query.env === 'development' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    res.setHeader(name, `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'self'; report-uri /csp-report`);
  }

  res.setHeader('Cache-Control', 'no-store');
  try {
    let html = await readFile(path.join(browserRoot, 'index.html'), 'utf8');
    html = html.replace(/__LAB_NONCE__/g, nonce)
      .replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`)
      .replace(/<style\b(?![^>]*\bnonce=)/gi, `<style nonce="${nonce}"`)
      // .replace(/\s+nonce"/gi, ` nonce="${nonce}"`)
      .replace(/ngCspNonce="__LAB_NONCE__"/gi, `ngCspNonce="${nonce}"`)
      .replace('</body>', (mode === 'tt-default' ? '<script nonce="' + nonce + '">trustedTypes.createPolicy("default", { createHTML: (value) => { console.log("default: ",value); return value} });</script>' : '') + (mode === 'hash' ? '<script>window.__hashProbe = "executed";</script>' : '<script>window.__policyProbe = "executed";</script>') + '<script nonce="' + nonce + '">window.__nonceProbe = "executed";</script></body>');
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[content-policy server error]', error);
  res.status(500).type('text').send('Nie udało się dostarczyć dokumentu labu.');
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Content Policy Lab: http://127.0.0.1:${port}`);
});
server.on('error', (error: Error) => {
  console.error('Content Policy Lab: start serwera nie powiódł się.', error);
  process.exitCode = 1;
});

const corsApp = express();
corsApp.use((req, _res, next) => { console.log(`[SRI] ${req.method} ${req.originalUrl} origin=${req.get('origin') ?? '-'}`); next(); });
corsApp.get('/sri-probe.js', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${port}`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('application/javascript').send(sriFixture);
});
corsApp.get('/sri-no-cors.js', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store'); res.type('application/javascript').send(sriFixture);
});
corsApp.listen(corsPort, '127.0.0.1', () => {
  console.log(`SRI cross-origin fixture: http://127.0.0.1:${corsPort}`);
});
