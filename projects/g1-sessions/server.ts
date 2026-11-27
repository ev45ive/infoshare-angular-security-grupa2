import express, { type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';

const appOrigin = 'http://localhost:4310';
const sessionCookie = 'g1_session';
const sessions = new Map<string, { csrf: string; changes: number }>();

function log(req: Request, event: string, details = ''): void {
  console.log(`[G1 API] ${event} ${req.method} ${req.originalUrl} origin=${req.get('origin') ?? '(none)'} cookie=${req.get('cookie') ? 'present' : 'absent'} ${details}`.trim());
}

function sessionFor(req: Request) {
  const header = req.get('cookie') ?? '';
  const cookies = Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index), part.slice(index + 1)];
  }));
  const id = cookies[sessionCookie];
  return id ? { id, session: sessions.get(id) } : undefined;
}

function cors(req: Request, res: Response): void {
  const origin = req.get('origin');
  if (req.query.cors === 'none') return;
  if (req.query.cors === 'wildcard') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return;
  }
  if (origin === appOrigin) {
    res.setHeader('Access-Control-Allow-Origin', appOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lab-CSRF, X-XSRF-TOKEN');
    res.setHeader('Vary', 'Origin');
  }
}

function apiMiddleware(req: Request, res: Response, next: express.NextFunction): void {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    log(req, 'PREFLIGHT', `requested-method=${req.get('access-control-request-method') ?? '(none)'} requested-headers=${req.get('access-control-request-headers') ?? '(none)'}`);
    res.sendStatus(req.get('origin') === appOrigin ? 204 : 403);
    return;
  }
  next();
}

const api = express();
api.use(express.json());
api.use(express.urlencoded({ extended: false }));
api.use(apiMiddleware);

api.post('/session/start', (req, res) => {
  const id = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  sessions.set(id, { csrf, changes: 0 });
  res.setHeader('Set-Cookie', [`${sessionCookie}=${id}; Path=/; HttpOnly; SameSite=Lax`, `g1_xsrf=${csrf}; Path=/; SameSite=Lax`]);
  log(req, 'SESSION_CREATED', 'sameSite=Lax');
  res.json({ message: 'Sesja utworzona. Cookie jest HttpOnly i host-only dla localhost.' });
});

api.get('/session', (req, res) => {
  const found = sessionFor(req);
  log(req, 'SESSION_READ', `valid=${Boolean(found?.session)}`);
  res.json({ authenticated: Boolean(found?.session), changes: found?.session?.changes ?? 0 });
});

api.post('/cookie-variants', (req, res) => {
  const variants = [
    'g1_demo_host=1; Path=/; SameSite=Lax',
    'g1_demo_domain=1; Domain=localhost; Path=/; SameSite=Lax',
    'g1_demo_path=1; Path=/cookie-check; SameSite=Lax',
    'g1_demo_http=1; Path=/; HttpOnly; SameSite=Lax',
    'g1_demo_secure=1; Path=/; Secure; SameSite=Lax',
    'g1_demo_strict=1; Path=/; SameSite=Strict',
  ];
  res.setHeader('Set-Cookie', variants); log(req, 'COOKIE_VARIANTS_ISSUED');
  res.json({ message: 'Wysłano warianty Set-Cookie; sprawdź zapis w przeglądarce.' });
});
api.get(['/cookie-check', '/cookie-other'], (req, res) => {
  const names = (req.get('cookie') ?? '').split(';').map(part => part.trim().split('=')[0]).filter(name => name.startsWith('g1_demo_'));
  log(req, 'COOKIE_VARIANTS_OBSERVED', `names=${names.join(',') || '(brak)'}`);
  res.json({ path: req.path, cookieNames: names });
});
api.post('/cookie-variants/reset', (req, res) => {
  const rootNames = ['g1_demo_host', 'g1_demo_domain', 'g1_demo_http', 'g1_demo_secure', 'g1_demo_strict'];
  const expired = rootNames.map(name => `${name}=; Path=/; Max-Age=0${name === 'g1_demo_domain' ? '; Domain=localhost' : ''}`);
  expired.push('g1_demo_path=; Path=/cookie-check; Max-Age=0');
  res.setHeader('Set-Cookie', expired); log(req, 'COOKIE_VARIANTS_CLEARED'); res.json({ message: 'Wysłano wygaszenie cookies demonstracyjnych.' });
});

api.get('/csrf', (req, res) => {
  const found = sessionFor(req);
  if (!found?.session) {
    log(req, 'CSRF_TOKEN_DENIED', 'reason=no-session');
    res.status(401).json({ error: 'Najpierw utwórz sesję.' });
    return;
  }
  log(req, 'CSRF_TOKEN_ISSUED');
  res.json({ token: found.session.csrf });
});

api.post('/session/rotate', (req, res) => {
  const found = sessionFor(req);
  if (!found?.session) { res.status(401).json({ error: 'Brak sesji.' }); return; }
  if (!validCsrf(req, found.session.csrf)) { log(req, 'SESSION_ROTATION_DENIED', 'reason=csrf'); res.status(403).json({ error: 'Odrzucono: wymagany poprawny token CSRF i zaufany Origin.' }); return; }
  sessions.delete(found.id);
  const id = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  sessions.set(id, { csrf, changes: found.session.changes });
  res.setHeader('Set-Cookie', [`${sessionCookie}=${id}; Path=/; HttpOnly; SameSite=Lax`, `g1_xsrf=${csrf}; Path=/; SameSite=Lax`]);
  log(req, 'SESSION_ROTATED');
  res.json({ message: 'Identyfikator sesji zmieniony; poprzednia sesja unieważniona.' });
});

api.post('/session/logout', (req, res) => {
  const found = sessionFor(req);
  if (found?.session && !validCsrf(req, found.session.csrf)) { log(req, 'LOGOUT_DENIED', 'reason=csrf'); res.status(403).json({ error: 'Odrzucono: wymagany poprawny token CSRF i zaufany Origin.' }); return; }
  if (found) sessions.delete(found.id);
  res.setHeader('Set-Cookie', [`${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`, 'g1_xsrf=; Path=/; SameSite=Lax; Max-Age=0']);
  log(req, 'SESSION_REVOKED');
  res.json({ message: 'Sesja unieważniona po stronie serwera, cookie usunięte.' });
});

api.post('/unsafe-mutation', (req, res) => {
  const found = sessionFor(req);
  if (!found?.session) { log(req, 'UNSAFE_MUTATION_DENIED', 'reason=no-session'); res.status(401).json({ error: 'Brak sesji.' }); return; }
  found.session.changes += 1;
  log(req, 'UNSAFE_MUTATION_APPLIED', `changes=${found.session.changes}`);
  res.json({ message: 'Operacja wykonana bez ochrony CSRF (celowo podatny endpoint demonstracyjny).', changes: found.session.changes });
});

api.patch('/protected-mutation', (req, res) => {
  const found = sessionFor(req);
  if (!found?.session) { log(req, 'PROTECTED_MUTATION_DENIED', 'reason=no-session'); res.status(401).json({ error: 'Brak sesji.' }); return; }
  if (!validCsrf(req, found.session.csrf)) { log(req, 'PROTECTED_MUTATION_DENIED', 'reason=csrf-or-origin'); res.status(403).json({ error: 'Odrzucono: token CSRF lub Origin nieprawidłowy.' }); return; }
  found.session.changes += 1;
  log(req, 'PROTECTED_MUTATION_APPLIED', `changes=${found.session.changes}`);
  res.json({ message: 'Operacja wykonana po sprawdzeniu sesji, Origin i tokenu CSRF.', changes: found.session.changes });
});

api.patch('/double-submit', (req, res) => {
  const found = sessionFor(req);
  const cookie = (req.get('cookie') ?? '').split(';').map(part => part.trim()).find(part => part.startsWith('g1_xsrf='))?.slice('g1_xsrf='.length);
  const header = req.get('x-xsrf-token');
  if (!found?.session || !cookie || !header || cookie !== header || header !== found.session.csrf || req.get('origin') !== appOrigin) {
    log(req, 'DOUBLE_SUBMIT_DENIED'); res.status(403).json({ error: 'Sesja, cookie, nagłówek lub Origin nie zgadzają się.' }); return;
  }
  found.session.changes++; log(req, 'DOUBLE_SUBMIT_ACCEPTED', `changes=${found.session.changes}`);
  res.json({ message: 'Cookie XSRF i nagłówek pasują do tokenu sesji.', changes: found.session.changes });
});

function validCsrf(req: Request, expected: string): boolean {
  const origin = req.get('origin');
  const referer = req.get('referer');
  let source = origin ?? '';
  if (!source && referer) { try { source = new URL(referer).origin; } catch { source = ''; } }
  return source === appOrigin && req.get('x-lab-csrf') === expected;
}

const shell = (title: string, body: string, script: string) => `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;background:#0b1220;color:#e5e7eb}h1,h2{line-height:1.2}section{border-top:1px solid #334155;padding:1rem 0}button{margin:.3rem;padding:.55rem .8rem;background:#67e8f9;border:0;border-radius:.3rem;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#111827;padding:.8rem}code{color:#a5f3fc}.muted{color:#a8b3c7}.danger{color:#fca5a5}</style><main>${body}<pre id="output">Gotowe. Wyniki żądań pojawią się tutaj.</pre></main><script>${script}</script></html>`;

const app = express();
app.use((req, _res, next) => { console.log(`[G1 APP] ${req.method} ${req.originalUrl}`); next(); });
app.get('/', (_req, res) => res.type('html').send(shell('L1.1 · Cykl sesji', `
  <p class="muted">L1.1 · Cookie i cykl sesji</p><h1>Sesja jest decyzją serwera, cookie jest jej transportem</h1>
  <p>Aplikacja i API używają hosta <code>localhost</code> na różnych portach. Utwórz sesję, porównaj stan API i cookie w DevTools → Application → Cookies. Cookie jest host-only, HttpOnly i SameSite=Lax; JavaScript aplikacji nie odczyta jego wartości. Cookies nie są izolowane portem.</p>
  <section><h2>1 · Utwórz i odczytaj sesję</h2><p>Otwórz Network. Utworzenie zwraca <code>Set-Cookie</code>; odczyt wysyła cookie automatycznie przez <code>credentials: include</code>.</p><button id="start">Utwórz sesję</button><button id="read">Odczytaj stan API</button></section>
  <section><h2>2 · Mutacja, rotacja i wylogowanie</h2><p>PATCH z nagłówkiem wymaga preflightu. Rotacja wydaje nowy identyfikator i unieważnia poprzedni. Wylogowanie usuwa rekord serwerowy i cookie.</p><button id="mutate">Wykonaj chronioną mutację</button><button id="rotate">Zmień identyfikator sesji</button><button id="logout">Wyloguj</button></section>
  <section><h2>3 · Atrybuty cookie</h2><p>Ustaw fikcyjne warianty i porównaj nazwy cookies wysłane na dwie ścieżki oraz widoczne w JavaScript. W Network i DevTools sprawdź host-only, Domain, Path, HttpOnly, Secure, Lax i Strict. Path nie stanowi samodzielnej granicy bezpieczeństwa. Przeglądarki mogą szczególnie traktować localhost; obserwuj faktyczne zachowanie. Cross-site i HTTPS porównasz w labie integracji G2.</p><button id="cookie-variants">Ustaw warianty</button><button id="cookie-check">Żądanie /cookie-check</button><button id="cookie-other">Żądanie /cookie-other</button><button id="cookie-js">Cookies widoczne w JS</button><button id="cookie-reset">Usuń warianty</button></section>
  <section><h2>4 · Cookie XSRF i konfiguracja CORS</h2><p>Serwer ustawia osobne cookie <code>g1_xsrf</code> dostępne dla JS, związane z sesją. Pierwszy PATCH kopiuje je do <code>X-XSRF-TOKEN</code>, drugi pomija nagłówek. API porównuje cookie, nagłówek, token sesji i Origin. Angular ma własne reguły dołączania XSRF; ten przykład wykonuje porównanie jawnie.</p><button id="double">Wyślij cookie i nagłówek XSRF</button><button id="double-missing">Pomiń nagłówek XSRF</button><p>Porównaj poprawne CORS z <code>*</code> przy credentials i z brakiem nagłówka. Sprawdź Network, Console i log API.</p><button id="cors-ok">CORS allowlista</button><button id="cors-wildcard">CORS * i credentials</button><button id="cors-none">CORS bez nagłówka</button></section>
  <p><a href="http://localhost:4312/" style="color:#67e8f9">Przejdź do L1.2 · CORS i CSRF</a></p>`, `
  const api='http://localhost:4311'; const out=document.querySelector('#output'); let token='';
  async function call(path, options={}) { try { const r=await fetch(api+path,{credentials:'include',...options}); const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data=text}; out.textContent=path+' → HTTP '+r.status+'\\n'+JSON.stringify(data,null,2); return data; } catch(e) { out.textContent=String(e); } }
  async function loadToken(){const d=await call('/csrf'); token=d?.token??'';}
  document.querySelector('#start').onclick=()=>call('/session/start',{method:'POST'}); document.querySelector('#read').onclick=()=>call('/session'); document.querySelector('#mutate').onclick=async()=>{await loadToken(); if(token) await call('/protected-mutation',{method:'PATCH',headers:{'Content-Type':'application/json','X-Lab-CSRF':token},body:JSON.stringify({action:'change'})})}; document.querySelector('#rotate').onclick=async()=>{await loadToken(); if(token) await call('/session/rotate',{method:'POST',headers:{'X-Lab-CSRF':token}})}; document.querySelector('#logout').onclick=async()=>{await loadToken(); if(token) await call('/session/logout',{method:'POST',headers:{'X-Lab-CSRF':token}})};
  const xsrf=()=>document.cookie.split('; ').find(x=>x.startsWith('g1_xsrf='))?.slice('g1_xsrf='.length)??'';
  document.querySelector('#double').onclick=()=>call('/double-submit',{method:'PATCH',headers:{'X-XSRF-TOKEN':xsrf()}});
  document.querySelector('#double-missing').onclick=()=>call('/double-submit',{method:'PATCH'});
  document.querySelector('#cors-ok').onclick=()=>call('/session');
  document.querySelector('#cors-wildcard').onclick=()=>call('/session?cors=wildcard');
  document.querySelector('#cors-none').onclick=()=>call('/session?cors=none');
  document.querySelector('#cookie-variants').onclick=()=>call('/cookie-variants',{method:'POST'});
  document.querySelector('#cookie-check').onclick=()=>call('/cookie-check');document.querySelector('#cookie-other').onclick=()=>call('/cookie-other');
  document.querySelector('#cookie-js').onclick=()=>{out.textContent='Cookies widoczne dla JS: '+document.cookie.split('; ').filter(x=>x.startsWith('g1_demo_')).map(x=>x.split('=')[0]).join(', ')};
  document.querySelector('#cookie-reset').onclick=()=>call('/cookie-variants/reset',{method:'POST'});
  `)));

const evil = express();
evil.use((req, _res, next) => { console.log(`[G1 EVIL] ${req.method} ${req.originalUrl}`); next(); });
evil.get('/', (_req, res) => res.type('html').send(shell('L1.2 · CORS i CSRF', `
  <p class="muted">L1.2 · CORS i CSRF jako różne granice</p><h1>Żądanie może dotrzeć, choć skrypt nie odczyta odpowiedzi</h1>
  <p>Wróć do <a style="color:#67e8f9" href="http://localhost:4310/">aplikacji</a> i utwórz sesję. Wszystkie widoki używają hosta <code>localhost</code> na różnych portach: to różne originy, ale ten sam site. Cookie jest host-scoped, nie port-scoped; sesja utworzona przez API może być wysyłana również z widoku obcego originu.</p>
  <section><h2>1 · Prosty formularz bez preflightu</h2><p>Formularz cross-origin wysyła POST bez nagłówka niestandardowego. CORS nie zatrzymuje takiego żądania. Celowo podatny endpoint pokaże, że sesja może wykonać zmianę mimo braku możliwości odczytu odpowiedzi przez stronę źródłową.</p><form action="http://localhost:4311/unsafe-mutation" method="post"><button>Wyślij formularz do endpointu demonstracyjnego</button></form></section>
  <section><h2>2 · Fetch do API</h2><p>Próba GET z credentials do API pochodzi z innego portu, więc origin jest niedozwolony i przeglądarka blokuje dostęp do odpowiedzi. Sprawdź Network i log serwera.</p><button id="fetch">Spróbuj odczytać API przez fetch</button></section>
  <section><h2>3 · Ochrona operacji</h2><p>Powtórz operację na ekranie aplikacji: <code>PATCH</code> z nagłówkiem <code>X-Lab-CSRF</code> wymaga preflightu. API dopuszcza tylko origin aplikacji i sprawdza token CSRF. Obserwuj <code>OPTIONS</code>, właściwe żądanie, stan API i logi. Sam CORS nie jest ochroną CSRF; serwer weryfikuje Origin i token przed mutacją.</p><p class="danger">Endpoint formularza powyżej jest celowo niezabezpieczonym kontrastem laboratoryjnym.</p><p class="muted">Preflight ogranicza origin, metodę i nagłówki; token synchronizacyjny jest wiązany z sesją. Mutacje sprawdzają Origin, a przy jego braku Referer; brak obu oznacza odmowę.</p></section>`, `
  const out=document.querySelector('#output'); document.querySelector('#fetch').onclick=()=>fetch('http://localhost:4311/session',{credentials:'include'}).then(async r=>{out.textContent='HTTP '+r.status+'\\n'+await r.text()}).catch(e=>out.textContent='Odczyt odpowiedzi zablokowany przez przeglądarkę/CORS: '+e);
  `)));

const servers: Server[] = [];
function listen(server: express.Express, port: number, label: string): void {
  const instance = server.listen(port, '127.0.0.1', () => console.log(`[G1 ${label}] http://localhost:${port}`));
  servers.push(instance);
}
const role = process.argv[2];
if (role === 'app') listen(app, 4310, 'APP');
else if (role === 'api') listen(api, 4311, 'API');
else if (role === 'evil') listen(evil, 4312, 'EVIL');
else throw new Error('Wybierz rolę: app, api lub evil.');
function stop(): void { for (const server of servers) server.close(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
