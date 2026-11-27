import express, { type Request, type Response } from 'express';
import { readFileSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { resolve } from 'node:path';

/** Standalone G2 L2.4/L2.5 lab. Run with: npm run lab:integration */
const useHttps = process.argv.includes('--https');
const scheme = useHttps ? 'https' : 'http';
const appOrigin = `${scheme}://${useHttps ? 'app-a' : 'app'}.localhost:4222`;
const widgetOrigin = `${scheme}://${useHttps ? 'app-b' : 'widget'}.localhost:4223`;
const otherOrigin = `${scheme}://${useHttps ? 'localhost' : 'other.localhost'}:4225`;
const apiOrigin = `${scheme}://api.localhost:4224`;
const proxyOrigin = `${scheme}://${useHttps ? 'app-b' : 'widget'}.localhost:4226`;
const cookieMode = process.argv.find(arg => arg.startsWith('--cookie='))?.slice('--cookie='.length) ?? 'lax';
const cookieSameSite = cookieMode === 'none' ? 'none' : cookieMode === 'strict' ? 'strict' : 'lax';
if (!useHttps && cookieSameSite === 'none') throw new Error('SameSite=None wymaga trybu --https, który ustawia Secure.');
const tls = useHttps ? {
  key: readFileSync(resolve('projects/__experiments/local-origins/certs/dev-key.pem')),
  cert: readFileSync(resolve('projects/__experiments/local-origins/certs/dev-cert.pem')),
} : undefined;
const events: Array<{ at: string; actor: string; action: string; origin: string; cookie: string; fetchSite: string }> = [];

function record(req: Request, actor: string, action: string) {
  const event = {
    at: new Date().toLocaleTimeString('pl-PL'), actor, action,
    origin: req.get('origin') ?? '(nawigacja top-level)',
    cookie: req.get('cookie') ?? '(brak)',
    fetchSite: req.get('sec-fetch-site') ?? '(brak)',
  };
  events.unshift(event);
  events.splice(30);
  console.log(`[G2 ${event.at}] ${actor} ${action} origin=${event.origin} cookie=${event.cookie} sec-fetch-site=${event.fetchSite}`);
  return event;
}

function page(role: 'portal' | 'widget' | 'other' | 'api') {
  if (role === 'api') return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>API sesji</title><body><h1>API sesji</h1><p>Sesja top-level: <code id="session"></code></p><p><a href="${appOrigin}/l2-4">Wróć do portalu</a></p><script>fetch('/api/session',{credentials:'include'}).then(r=>r.json()).then(x=>document.querySelector('#session').textContent=JSON.stringify(x))</script></body></html>`;
  if (role === 'widget') return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Widget partnera</title><style>body{font:15px/1.5 system-ui;padding:16px;color:#17252c}button{padding:8px;margin:4px}pre{white-space:pre-wrap;background:#f1f4f5;padding:8px}</style><h2>Widget partnera</h2><p>Ten dokument inicjuje własne żądania API i wiadomości.</p><button id="api">fetch API z credentials</button><button id="blocked">fetch API z CORS zablokowanym</button><button id="error">Odczytaj odpowiedź HTTP 500</button><button id="proxy-allow">API przez proxy: zachowaj CORS</button><button id="proxy-strip">API przez proxy: usuń CORS</button><button id="partitioned">Ustaw cookie partycjonowane</button><button id="storage-check">Sprawdź Storage Access</button><button id="storage-request">Poproś o Storage Access</button><button id="message">Wyślij postMessage</button><pre id="result">Gotowy</pre><script>
const api='${apiOrigin}';
async function run(path){const box=document.querySelector('#result');try{const r=await fetch(api+path,{method:path.includes('blocked')?'GET':'POST',headers:path.includes('blocked')?{}:{'Content-Type':'application/json'},body:path.includes('blocked')?undefined:JSON.stringify({source:'widget'}),credentials:'include'});box.textContent='HTTP '+r.status+' '+JSON.stringify(await r.json())}catch(e){box.textContent='fetch error: '+e}}
document.querySelector('#api').onclick=()=>run('/api/session');document.querySelector('#blocked').onclick=()=>run('/api/blocked');document.querySelector('#error').onclick=()=>run('/api/error');document.querySelector('#message').onclick=()=>parent.postMessage({type:'g2-check',value:'widget'},'${appOrigin}');
async function proxy(strip){try{const r=await fetch('${proxyOrigin}/api/session?strip='+strip);document.querySelector('#result').textContent='Proxy HTTP '+r.status+' '+JSON.stringify(await r.json())}catch(e){document.querySelector('#result').textContent='Proxy: brak odczytu odpowiedzi: '+e}}
document.querySelector('#proxy-allow').onclick=()=>proxy('none');document.querySelector('#proxy-strip').onclick=()=>proxy('cors');
document.querySelector('#partitioned').onclick=async()=>{try{const r=await fetch(api+'/api/partitioned',{credentials:'include'});document.querySelector('#result').textContent='HTTP '+r.status+' '+JSON.stringify(await r.json())+'; sprawdź cookie w DevTools.'}catch(e){document.querySelector('#result').textContent='Cookie: '+e}};
document.querySelector('#storage-check').onclick=async()=>{try{document.querySelector('#result').textContent=typeof document.hasStorageAccess==='function'?'hasStorageAccess: '+await document.hasStorageAccess():'Storage Access API niedostępne'}catch(e){document.querySelector('#result').textContent='Storage Access: '+e}};
document.querySelector('#storage-request').onclick=async()=>{try{if(typeof document.requestStorageAccess!=='function'){document.querySelector('#result').textContent='Storage Access API niedostępne';return}await document.requestStorageAccess();document.querySelector('#result').textContent='Przeglądarka przyznała dostęp; ponów próbę cookie.'}catch(e){document.querySelector('#result').textContent='Odmowa lub brak wsparcia: '+e}};
</script></body></html>`;
  if (role === 'other') return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>Obcy origin</title><body style="font:15px system-ui;padding:16px"><h2>Obcy origin</h2><p>Odpowiedź portalu blokuje osadzenie. Porównaj także widget przez lokalne proxy z zachowanym i usuniętym frame-ancestors.</p><iframe title="Portal z obcego originu" src="${appOrigin}/embed-target" width="360" height="180"></iframe><iframe title="Proxy zachowuje frame-ancestors" src="${proxyOrigin}/widget?strip=none" width="360" height="180"></iframe><iframe title="Proxy usuwa frame-ancestors" src="${proxyOrigin}/widget?strip=frame" width="360" height="180"></iframe></body></html>`;
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>G2 — sesja i macierz integracji</title><style>
body{font:16px/1.5 system-ui,sans-serif;color:#17252c;background:#f5f7f8;margin:0}main{max-width:1120px;margin:auto;padding:28px 20px}h1{line-height:1.15}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{background:white;padding:16px;border:1px solid #d5dfe1;border-radius:8px;min-width:0}iframe{width:100%;height:260px;border:1px solid #b8c6c8}button{padding:9px 12px;margin:4px}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;border-bottom:1px solid #d5dfe1;padding:7px;vertical-align:top}code{overflow-wrap:anywhere}.logs{height:210px;overflow:auto}small{color:#52666c}@media(max-width:760px){.grid{grid-template-columns:1fr}}
</style><main><p><b>Angular Security · G2 · L2.4 + L2.5</b></p><h1>Sesja w ramce i macierz integracji</h1><p>Zaloguj się do API w karcie, wróć i porównaj stan top-level z żądaniem widgetu osadzonego cross-site. Potem sprawdź niezależnie osadzanie, wiadomość i CORS API.</p>
<section class="grid"><article class="card"><h2>Widget dozwolonego partnera</h2><iframe id="widget" title="Widget partnera" src="${widgetOrigin}/widget"></iframe><p><button id="read-dom">Spróbuj odczytać DOM ramki</button> <button id="refresh">Odśwież logi</button></p><p id="dom-result">Oczekiwanie na próbę.</p></article>
<article class="card"><h2>Widget z obcego originu</h2><iframe title="Widget z obcego originu" src="${otherOrigin}/widget"></iframe><p>Oczekiwana blokada: odpowiedź widgetu nie dopuszcza tego przodka.</p><h2>Logi API</h2><div class="logs"><table><thead><tr><th>Podmiot / żądanie</th><th>Origin / Cookie / Sec-Fetch-Site</th></tr></thead><tbody id="logs"></tbody></table></div></article></section>
<section class="card"><h2>Origin null, błąd, proxy i storage</h2><p>Ramka sandboxowana wysyła preflight z opaque originem, który przeglądarka raportuje jako <code>Origin: null</code>. API odmawia preflightu. W widgecie porównaj odpowiedź HTTP 500 i dwa żądania przez proxy. <a href="${otherOrigin}/other">Otwórz obcy origin</a>, aby porównać ramki przez proxy zachowujące i usuwające <code>frame-ancestors</code>; sprawdź nagłówki odpowiedzi i Console.</p><p>W trybie HTTPS widget może poprosić API o cookie <code>Partitioned; Secure; SameSite=None</code>. Sprawdź zapis i klucz partycji w DevTools oraz porównaj wyniki <code>hasStorageAccess</code> i, po geście użytkownika, <code>requestStorageAccess</code>. Dostępność i ewentualna zgoda zależą od przeglądarki; cookie API i dostęp do storage dokumentu widgetu to osobne obserwacje.</p><iframe title="Żądanie z opaque origin" sandbox="allow-scripts" srcdoc="&lt;button id='go'&gt;Wyślij żądanie z Origin null&lt;/button&gt;&lt;pre id='out'&gt;Gotowy&lt;/pre&gt;&lt;script&gt;document.querySelector('#go').onclick=async()=>{try{const r=await fetch('${apiOrigin}/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'include'});document.querySelector('#out').textContent='HTTP '+r.status}catch(e){document.querySelector('#out').textContent='fetch error: '+e}}&lt;/script&gt;"></iframe></section>
<section class="card"><h2>Macierz decyzji i obserwacji</h2><table><thead><tr><th>Próba</th><th>Odpowiedzialna odpowiedź / kontrola</th><th>Obserwacja</th></tr></thead><tbody>
<tr><td>Portal osadza widget</td><td>Dokument portalu: <code>frame-src</code>; odpowiedź widgetu: <code>frame-ancestors</code></td><td>Ramka partnera działa; ramka obcego originu jest blokowana.</td></tr>
<tr><td>Obcy origin osadza portal</td><td>Odpowiedź portalu: <code>frame-ancestors 'none'</code></td><td>Otwórz <code>${otherOrigin}/other</code>; sprawdź Console i odpowiedź portalu.</td></tr>
<tr><td>Widget wysyła wiadomość</td><td>Odbiorca sprawdza <code>origin</code>, <code>source</code> i typ</td><td>Portal pokazuje odrzucenie/akceptację i zapisuje wynik w konsoli przeglądarki.</td></tr>
<tr><td>Widget wywołuje API</td><td>Odpowiedź API: allowlista CORS + credentials; sesja: cookie i kontekst</td><td>Network pokaże preflight i request; log zawiera Origin, Cookie i Sec-Fetch-Site.</td></tr>
<tr><td>Widget wywołuje API bez CORS</td><td>API nie wysyła <code>Access-Control-Allow-Origin</code></td><td>JS zgłasza fetch error; serwer może mimo to zarejestrować żądanie.</td></tr></tbody></table><p><small>CORS udostępnia odpowiedź kodowi wywołującemu. Nie przyznaje dostępu do DOM ramki, nie zastępuje autoryzacji i nie jest ochroną CSRF.</small></p></section>
<p><a href="${apiOrigin}/login">Otwórz login API top-level (ustawia fikcyjne cookie SameSite=${cookieSameSite})</a>. Po sprawdzeniu widoku API wróć do tej karty i użyj przycisków w ramce. Wyzeruj stan cookie w DevTools, aby powtórzyć próbę.</p><div role="status" aria-live="polite" id="status">Oczekiwanie na wiadomość.</div></main>
<script>
const widgetOrigin='${widgetOrigin}';window.addEventListener('message',e=>{const ok=e.origin===widgetOrigin&&e.source===document.querySelector('#widget').contentWindow&&e.data&&e.data.type==='g2-check';document.querySelector('#status').textContent='postMessage '+(ok?'zaakceptowano':'odrzucono')+'; origin='+e.origin+'; source='+(e.source===document.querySelector('#widget').contentWindow);console.log('[G2 message]',{origin:e.origin,source:e.source===document.querySelector('#widget').contentWindow,accepted:ok})});
document.querySelector('#read-dom').onclick=()=>{try{document.querySelector('#dom-result').textContent=document.querySelector('#widget').contentWindow.document.title}catch(e){document.querySelector('#dom-result').textContent='Odmowa SOP: '+e.name}};
async function refresh(){try{const rows=await(await fetch('${apiOrigin}/api/events')).json();const body=document.querySelector('#logs');body.replaceChildren(...rows.map(x=>{const tr=document.createElement('tr');for(const value of [[x.at,x.actor,x.action],[x.origin,x.cookie,x.fetchSite]]){const td=document.createElement('td');td.textContent=value.join(' · ');tr.append(td)}return tr}))}catch{}}document.querySelector('#refresh').onclick=refresh;setInterval(refresh,1000);refresh();
</script></body></html>`;
}

function setFramePolicy(res: Response, role: 'portal' | 'widget' | 'other') {
  if (role === 'portal') {
    res.setHeader('Content-Security-Policy', `default-src 'self' 'unsafe-inline' ${apiOrigin}; frame-src ${widgetOrigin} ${otherOrigin}; frame-ancestors 'none'`);
  } else if (role === 'widget') {
    res.setHeader('Content-Security-Policy', `default-src 'self' 'unsafe-inline' ${apiOrigin} ${proxyOrigin}; frame-ancestors ${appOrigin}`);
  } else {
    res.setHeader('Content-Security-Policy', `default-src 'self' 'unsafe-inline' ${appOrigin} ${proxyOrigin}; frame-ancestors 'none'`);
  }
}

function listen(app: ReturnType<typeof express>, port: number, label: string) {
  const server = tls ? createHttpsServer(tls, app) : app;
  server.listen(port, '127.0.0.1', () => console.log(`${label}: ${scheme}://127.0.0.1:${port}`));
}

const portal = express();
portal.use((req,_res,next)=>{console.log(`[PORTAL] ${req.method} ${req.originalUrl}`);next();});
portal.get(['/','/l2-4','/embed-target'], (_req,res) => { setFramePolicy(res,'portal'); res.type('html').send(page('portal')); });
listen(portal,4222,`Portal (${appOrigin}/l2-4)`);

const widget = express();
widget.use((req,_res,next)=>{console.log(`[WIDGET] ${req.method} ${req.originalUrl}`);next();});
widget.get(['/','/widget'],(_req,res)=>{setFramePolicy(res,'widget');res.type('html').send(page('widget'));});
listen(widget,4223,`Widget (${widgetOrigin}/widget)`);

const other = express();
other.use((req,_res,next)=>{console.log(`[OTHER] ${req.method} ${req.originalUrl}`);next();});
other.get(['/','/other','/widget'],(_req,res)=>{setFramePolicy(res,'other');res.type('html').send(page('other'));});
listen(other,4225,`Obcy origin (${otherOrigin}/other)`);

const api = express();
api.use(express.json({limit:'2kb'}));
api.use((req,res,next)=>{if(req.path==='/api/events'){next();return;} record(req,'api',`${req.method} ${req.path}`);next();});
api.use('/api', (req,res,next)=>{
  const allowed=req.get('origin')===appOrigin||req.get('origin')===widgetOrigin;
  if(req.path==='/blocked'){next();return;}
  if(allowed){res.setHeader('Access-Control-Allow-Origin',req.get('origin')!);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
  if(req.method==='OPTIONS'){res.sendStatus(allowed?204:403);return;}
  next();
});
api.get('/login',(req,res)=>{record(req,'api','login top-level');res.cookie('g2_session','demo-session',{httpOnly:true,sameSite:cookieSameSite,secure:useHttps,path:'/',maxAge:15*60*1000});res.type('html').send(page('api'));});
api.get('/api/session',(req,res)=>res.json({authenticated:(req.get('cookie')??'').includes('g2_session='),cookieHeader:req.get('cookie')??null,origin:req.get('origin')??null,secFetchSite:req.get('sec-fetch-site')??null}));
api.post('/api/session',(req,res)=>res.json({authenticated:req.get('cookie')?.includes('g2_session=')??false,received:true,origin:req.get('origin')??null,secFetchSite:req.get('sec-fetch-site')??null}));
api.post('/api/error',(_req,res)=>res.status(500).json({error:'controlled demo error'}));
api.get('/api/partitioned', (_req, res) => {
  if (!useHttps) { res.status(400).json({ error: 'Ten wariant wymaga HTTPS i atrybutu Secure.' }); return; }
  res.cookie('g2_partitioned', 'demo', { httpOnly: true, secure: true, sameSite: 'none', partitioned: true, path: '/', maxAge: 15 * 60 * 1000 });
  res.json({ message: 'Wysłano Set-Cookie z Partitioned; sprawdź, czy przeglądarka je zapisała.' });
});
api.get('/api/blocked',(req,res)=>res.json({received:true,origin:req.get('origin')??null}));
api.get('/api/events',(req,res)=>{const origin=req.get('origin');if(origin===appOrigin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}res.json(events);});
api.options('*path',(_req,res)=>res.sendStatus(204));
listen(api,4224,`API (${apiOrigin})`);

// Kontrolowany reverse proxy przekazuje wyłącznie dwa lokalne endpointy.
const proxy = express();
proxy.use((req, res) => {
  const input = new URL(req.originalUrl, proxyOrigin);
  const strip = input.searchParams.get('strip'); input.searchParams.delete('strip');
  if (input.pathname !== '/widget' && input.pathname !== '/api/session') { res.sendStatus(404); return; }
  const upstreamPort = input.pathname === '/widget' ? 4223 : 4224;
  const forward = useHttps ? httpsRequest : httpRequest;
  const upstream = forward({ hostname: '127.0.0.1', port: upstreamPort, path: input.pathname + input.search, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` }, ...(useHttps ? { rejectUnauthorized: false } : {}) }, response => {
    const headers = { ...response.headers };
    if (strip === 'cors') delete headers['access-control-allow-origin'];
    if (strip === 'frame' && typeof headers['content-security-policy'] === 'string') headers['content-security-policy'] = headers['content-security-policy'].replace(/(?:^|;)\s*frame-ancestors\s+[^;]*/i, '');
    console.log(`[PROXY] ${req.method} ${input.pathname} strip=${strip ?? 'none'} status=${response.statusCode}`);
    res.writeHead(response.statusCode ?? 502, headers); response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) res.status(502).send('Lokalny upstream jest niedostępny.'); });
  req.pipe(upstream);
});
listen(proxy,4226,`Proxy (${proxyOrigin})`);
