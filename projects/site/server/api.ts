import express from 'express';

const app = express();
const port = Number(process.env.SITE_API_PORT ?? 4302);
const id = process.env.SITE_API_ID ?? 'lax';
const cookieName = process.env.SITE_COOKIE_NAME ?? 'lab_lax';
const sameSite = process.env.SITE_SAMESITE ?? 'Lax';
const allowedOrigins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'X-Lab-Api');
  res.setHeader('X-Lab-Api', id);
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/setup', (_req, res) => {
  const secure = sameSite.toLowerCase().includes('none') ? '; Secure' : '';
  const cookies = [`${cookieName}=set-${id}; Path=/; SameSite=${sameSite}${secure}`];
  if (id === 'loopback') cookies.push('lab_loopback_lax=set-lax; Path=/; SameSite=Lax', 'lab_loopback_strict=set-strict; Path=/; SameSite=Strict');
  res.setHeader('Set-Cookie', cookies);
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Cookie setup · ${id}</title><main style="font:16px system-ui;max-width:48rem;margin:3rem auto;padding:0 1rem"><h1>Cookie setup: ${id}</h1><p>Serwer wysłał Set-Cookie dla <code>${cookieName}</code>: <code>SameSite=${sameSite}${secure}</code>. ${id === 'loopback' ? 'Wysłano też cookies Lax i Strict.' : ''}</p><p><a href="http://localhost:4200/site/(lab//sidebar:hint)">Wróć do laboratorium</a></p><p>Sprawdź cookies w przeglądarce. SameSite=None; Secure na lokalnym HTTP zależy od przeglądarki.</p></main>`);
});

app.get('/api/inspect', (req, res) => {
  const cookies = Object.fromEntries((req.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith('lab_')).map((part) => {
    const split = part.indexOf('=');
    return split < 0 ? [part, ''] : [part.slice(0, split), part.slice(split + 1)];
  }));
  res.json({
    api: id,
    origin: req.headers.origin ?? null,
    host: req.headers.host ?? '',
    cookieHeader: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; '),
    cookies,
    secFetchSite: req.headers['sec-fetch-site'] ?? null,
    cors: {
      allowOrigin: res.getHeader('Access-Control-Allow-Origin') ?? null,
      allowCredentials: res.getHeader('Access-Control-Allow-Credentials') ?? null,
    },
  });
});

app.listen(port, '127.0.0.1', (error) => { if (error) { console.error(error); process.exitCode = 1; return; } console.log(`Site API ${id}: port ${port}, cookie ${cookieName}, SameSite=${sameSite}`); });
