import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const app = express();
const clientOrigin = 'http://localhost:4201';
const redirectUri = `${clientOrigin}/pkce`;
const codes = new Map<string, { challenge: string; expires: number }>();
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  if (req.get('origin') === clientOrigin) res.set('Access-Control-Allow-Origin', clientOrigin);
  res.set('Cache-Control', 'no-store');
  console.log(`${req.method} ${req.path}`);
  next();
});
app.get('/authorize', (req, res) => {
  const { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query;
  if (response_type !== 'code' || client_id !== 'demo-spa' || redirect_uri !== redirectUri || typeof state !== 'string' || typeof code_challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code_challenge) || code_challenge_method !== 'S256') {
    res.status(400).send('Niepoprawne żądanie autoryzacji'); return;
  }
  const code = randomBytes(32).toString('base64url');
  codes.set(code, { challenge: code_challenge, expires: Date.now() + 60_000 });
  const target = new URL(redirectUri);
  target.searchParams.set('code', code); target.searchParams.set('state', state);
  console.log('Wydano jednorazowy code; challenge zapisany na serwerze.');
  res.redirect(target.toString());
});
app.post('/token', (req, res) => {
  const { code, code_verifier: verifier, client_id, redirect_uri, grant_type } = req.body;
  const entry = typeof code === 'string' ? codes.get(code) : undefined;
  if (!entry || entry.expires < Date.now() || client_id !== 'demo-spa' || redirect_uri !== redirectUri || grant_type !== 'authorization_code' || typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
    console.log('Wymiana odrzucona: niepoprawny lub zużyty code / parametry.'); res.status(400).json({ error: 'invalid_grant' }); return;
  }
  const expected = Buffer.from(entry.challenge);
  const actual = Buffer.from(createHash('sha256').update(verifier).digest('base64url'));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    console.log('Wymiana odrzucona: verifier nie pasuje do challenge.'); res.status(400).json({ error: 'invalid_grant' }); return;
  }
  codes.delete(code);
  console.log('Wymiana zaakceptowana; code zużyty.');
  res.json({ access_token: 'lokalny-przykladowy-token', token_type: 'Bearer' });
});
app.listen(4305, '127.0.0.1', () => console.log('Serwer autoryzacji: http://localhost:4305'));
