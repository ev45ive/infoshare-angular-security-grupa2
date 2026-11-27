import express from 'express';

const appOrigin = 'http://portal-l21.localhost:4221';
const externalOrigin = 'http://destination-l21.localhost:4222';
const app = express();
app.use((req, _res, next) => { console.log(`[PORTAL] ${req.method} ${req.originalUrl}`); next(); });
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }

function page(title: string, body: string): string {
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.55 system-ui,sans-serif;color:#17252c;background:#f5f7f8;max-width:900px;margin:40px auto;padding:0 20px}section{background:white;padding:20px;margin:18px 0;border:1px solid #d7e0e2}button,a{font:inherit;margin:6px;padding:8px 12px}code,pre{font-family:ui-monospace,monospace}pre{white-space:pre-wrap;background:#eef2f3;padding:12px}.result{padding:12px;background:#e7f0ef}</style><main><p>Angular Security · L2.1</p><h1>${title}</h1>${body}</main></html>`;
}

app.get('/', (_req, res) => res.type('html').send(page('Powrót po logowaniu i popup', `
<section><h2>A. returnUrl: nawigacja i allowlist</h2><p>Porównaj cel zewnętrzny, ścieżkę wewnętrzną i ścieżki mylące. „Niezabezpieczone” nawiguje bez walidacji; „Ograniczone” parsuje URL względem stałego originu i dopuszcza tylko /documents.</p>
<label>returnUrl <input id="return" value="/documents/42" size="48"></label><br><button onclick="go(false)">Niezabezpieczone</button><button onclick="go(true)">Ograniczone</button><p class="result" id="decision">Wynik parsowania pojawi się tutaj.</p>
<p>Próby: <code>/documents/42</code>, <code>//destination-l21.localhost:4222/away</code>, <code>http://portal-l21.localhost.evil.test/documents</code>, <code>javascript:alert(1)</code>.</p></section>
<section><h2>B. opener i noopener</h2><p>Otwórz kontrolowaną stronę docelową w nowej karcie. Sprawdź jej informację o <code>window.opener</code> oraz możliwość sterowania oknem otwierającym.</p><button onclick="openPage(false)">Otwórz z opener</button><button onclick="openPage(true)">Otwórz z noopener</button><p class="result" id="popup">Wynik popupu pojawi się tutaj. Blokada popupu jest możliwa.</p><h3>Mock loginu</h3><p>Popup po chwili odeśle fikcyjny kod. Portal kontroluje origin, source, timeout i zamknięcie okna.</p><button onclick="mockLogin()">Uruchom mock login</button><p id="login-result" aria-live="polite">Brak próby.</p></section>
<section><h2>C. Adres, historia i Referer</h2><p>Dodaj fikcyjny identyfikator do URL przez <code>history.pushState</code>; zaobserwuj adres, długość historii i wróć przyciskiem Wstecz. Przejdź następnie do lokalnej strony same-origin, która pokaże otrzymany nagłówek Referer. Nie używamy rzeczywistych poświadczeń.</p><button onclick="addHistory()">Dodaj fikcyjną wartość do historii</button><p id="history-result">Adres: /</p><a href="/history-echo">Sprawdź Referer same-origin</a></section>
<details><summary>Model i granica doświadczenia</summary><p>To demonstracja celu nawigacji i relacji okien, nie callback OAuth/OIDC. Walidacja klienta nie zastępuje walidacji redirectu po stronie serwera. Przeglądarki mogą stosować bezpieczne domyślne zachowanie dla target=_blank.</p><pre>const u = new URL(raw, APP_ORIGIN);
const allowed = u.origin === APP_ORIGIN &&
  (u.pathname === '/documents' || u.pathname.startsWith('/documents/'));</pre></details>
<script>
const APP=${JSON.stringify(appOrigin)}, DEST=${JSON.stringify(externalOrigin)};
function safe(raw){try{const u=new URL(raw,APP);return u.origin===APP&&(u.pathname==='/documents'||u.pathname.startsWith('/documents/'))?u.pathname+u.search+u.hash:'/documents'}catch{return '/documents'}}
function go(guard){const raw=document.querySelector('#return').value;const target=guard?safe(raw):raw;const parsed=new URL(target,APP);document.querySelector('#decision').textContent='Wybrany cel: '+target+(guard?' (po walidacji)':' (bez walidacji)');if(!['http:','https:'].includes(parsed.protocol)){document.querySelector('#decision').textContent+=' · Próba nawigacji pominięta: lab obsługuje tylko HTTP(S).';return}location.assign(parsed.href)}
function openPage(noopener){const w=window.open(DEST+'/popup?mode='+(noopener?'noopener':'opener'),'_blank',noopener?'noopener':'');document.querySelector('#popup').textContent=w?'Popup otwarty; sprawdź jego wynik.':'Popup zablokowany albo referencja niedostępna (możliwy noopener).'}
function updateHistory(){document.querySelector('#history-result').textContent='Adres: '+location.pathname+location.search+'; history.length='+history.length}function addHistory(){history.pushState({lab:true},'', '/?demo=fikcyjny-identyfikator');updateHistory()}window.addEventListener('popstate',updateHistory);updateHistory();
let loginPopup,loginTimer,closePoll;function finishLogin(text){clearTimeout(loginTimer);clearInterval(closePoll);if(loginPopup&&!loginPopup.closed)loginPopup.close();document.querySelector('#login-result').textContent=text}
function mockLogin(){loginPopup=window.open(DEST+'/popup?mode=mock','_blank');if(!loginPopup){finishLogin('Popup zablokowany.');return}document.querySelector('#login-result').textContent='Oczekiwanie na odpowiedź popupu…';loginTimer=setTimeout(()=>finishLogin('Timeout: brak odpowiedzi.'),5000);closePoll=setInterval(()=>{if(loginPopup.closed)finishLogin('Popup zamknięty przed odpowiedzią.')},200);}
window.addEventListener('message',e=>{if(e.origin!==DEST||e.source!==loginPopup||!e.data||e.data.type!=='mock-login-result'||typeof e.data.code!=='string')return;finishLogin('Odebrano fikcyjny kod: '+e.data.code)});
</script>`)));
app.get(['/documents', '/documents/42', '/destination-changed'], (req, res) => res.type('html').send(page('Dokumenty portalu', `<p>Załadowana lokalna trasa: <code>${req.path}</code></p><a href="/">Wróć do labu</a>`)));
app.get('/history-echo', (req, res) => res.type('html').send(page('Referer same-origin', `<p>Otrzymany Referer: <code>${escapeHtml(req.get('referer') ?? '(brak)')}</code></p><a href="/">Wróć do labu</a>`)));

app.listen(4221, '127.0.0.1', () => console.log(`L2.1 portal ${appOrigin}`));

const destination = express();
destination.use((req, _res, next) => { console.log(`[CEL] ${req.method} ${req.originalUrl}`); next(); });
destination.get('/popup', (req, res) => res.type('html').send(page('Kontrolowana strona popupu', `<p>Otworzyła mnie strona: <code>${appOrigin}</code></p><p>Otrzymany Referer: <code>${escapeHtml(req.get('referer') ?? '(brak)')}</code></p><p id="state">Sprawdzam relację opener…</p><button onclick="if(window.opener)window.opener.location=${JSON.stringify(appOrigin)}+'/destination-changed';document.querySelector('#state').textContent='Próba sterowania wykonana.'">Spróbuj nawigować opener</button><script>document.querySelector('#state').textContent='window.opener: '+(window.opener?'dostępny':'null');if(new URLSearchParams(location.search).get('mode')==='mock')setTimeout(()=>{if(window.opener)window.opener.postMessage({type:'mock-login-result',code:'demo-code-42'},${JSON.stringify(appOrigin)});document.querySelector('#state').textContent='Wysłano fikcyjny wynik mock loginu.'},700)</script>`)));
destination.get('/away', (req, res) => res.type('html').send(page('Cel zewnętrzny', `<p>Przeglądarka opuściła portal i załadowała kontrolowany origin destination-l21.</p><p>Otrzymany Referer: <code>${escapeHtml(req.get('referer') ?? '(brak)')}</code></p>`)));
destination.listen(4222, '127.0.0.1', () => console.log(`L2.1 destination ${externalOrigin}`));
