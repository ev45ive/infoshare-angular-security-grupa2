import express, { type Request, type Response } from 'express';

const portalOrigin = 'http://portal-l22.localhost:4223';
const widgetOrigin = 'http://widget-l22.localhost:4224';
const attackerOrigin = 'http://outside-l22.localhost:4225';
const portalFramePolicy = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' ${widgetOrigin}; frame-src 'self' ${widgetOrigin}; object-src 'none'; base-uri 'none'`;
const widgetAncestorPolicy = `frame-ancestors ${portalOrigin}`;

function html(title: string, body: string, script = ''): string {
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.55 system-ui,sans-serif;color:#17252c;background:#f5f7f8;max-width:1000px;margin:36px auto;padding:0 20px}section{background:white;padding:18px;margin:16px 0;border:1px solid #d7e0e2}iframe{width:100%;height:115px;border:1px solid #82969a}button{font:inherit;padding:8px 12px;margin:5px}code,pre{font-family:ui-monospace,monospace}.result{padding:12px;background:#e7f0ef}</style><main><p>Angular Security · L2.2 / E2.2</p><h1>${title}</h1>${body}</main><script>${script}</script></html>`;
}

const portal = express();
portal.use((req, _res, next) => { console.log(`[PORTAL] ${req.method} ${req.originalUrl}`); next(); });
portal.use((req: Request, res: Response, next) => {
  const allowed = req.path !== '/deny';
  res.setHeader('Content-Security-Policy', allowed ? portalFramePolicy : `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' ${widgetOrigin}; frame-src 'self'; object-src 'none'; base-uri 'none'`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', req.query.permission === 'allow' ? `clipboard-write=(self "${widgetOrigin}")` : 'clipboard-write=()');
  next();
});
portal.get('/widget-frame', (_req, res) => res.redirect(`${widgetOrigin}/widget`));
portal.get('/headers.json', (_req, res) => res.json({
  document: portalOrigin,
  responseHeaders: { 'Content-Security-Policy': portalFramePolicy },
  widget: widgetOrigin,
  widgetExpectedHeaders: { 'Content-Security-Policy': widgetAncestorPolicy },
  checks: {
    portalAllowsWidget: portalFramePolicy.includes(`frame-src 'self' ${widgetOrigin}`),
    widgetAllowsPortalOnly: widgetAncestorPolicy === `frame-ancestors ${portalOrigin}`,
    scope: 'Konfiguracja serwera; load iframe nie potwierdza wyświetlenia dokumentu.',
  },
}));
portal.get(['/allow', '/deny', '/'], (req, res) => res.type('html').send(html('Izolacja widgetu i możliwość osadzania', `
<p>Porównaj ramkę same-origin z widgetem cross-origin. SOP dotyczy dostępu do DOM; sandbox dodaje ograniczenia niezależnie od originu. Zmień tryb i obserwuj ramkę, Console oraz odpowiedzi w Network.</p>
<section><h2>Same-origin</h2><iframe id="same" title="Same-origin frame" src="/same"></iframe><button onclick="inspect('same')">Spróbuj odczytać dokument</button><output id="same-result">Brak próby.</output></section>
<section><h2>Widget partnera</h2><iframe id="widget" title="Widget cross-origin" src="${widgetOrigin}/widget" sandbox="allow-scripts"></iframe><button onclick="inspect('widget')">Spróbuj odczytać dokument</button><label><input type="checkbox" onchange="setSandbox(this.checked)"> dodaj allow-same-origin</label><output id="widget-result">Brak próby.</output><p>Tryb CSP portalu: <code>${req.path === '/deny' ? 'frame-src blokuje widget' : 'frame-src dopuszcza widget'}</code>. Atrybut sandbox pozostaje osobną kontrolą.</p></section>
<section><h2>Sandbox a same-origin</h2><iframe id="same-sandbox" title="Same-origin sandbox" src="/same" sandbox="allow-scripts"></iframe><button onclick="inspect('same-sandbox')">Odczytaj DOM z allow-scripts</button><button onclick="reloadSandbox('same-sandbox','allow-same-origin')">Przełącz na allow-same-origin i odśwież</button><button onclick="reloadSandbox('same-sandbox','allow-scripts allow-same-origin')">Włącz oba tokeny</button><button onclick="reloadSandbox('same-sandbox','allow-scripts')">Przywróć allow-scripts</button><output id="same-sandbox-result">Brak próby.</output><p>Zmiana sandboxu działa po ponownym załadowaniu dokumentu. Dla same-origin połączenie obu tokenów pozwala osadzonemu skryptowi osłabić sandbox; przetestuj wyłącznie kontrolowaną stronę.</p></section>
<section><h2>srcdoc i opaque origin</h2><iframe id="srcdoc-frame" title="Dokument srcdoc" sandbox="allow-scripts" srcdoc="&lt;p id='msg'&gt;Dokument srcdoc&lt;/p&gt;&lt;button onclick=&quot;parent.postMessage({type:'srcdoc',origin:location.origin},'*')&quot;&gt;Wyślij wiadomość&lt;/button&gt;"></iframe><p id="srcdoc-result">Oczekiwanie na wiadomość. Opaque origin jest raportowany jako <code>null</code>.</p></section>
<section><h2>X-Frame-Options i Permissions Policy</h2><iframe title="XFO DENY" src="${widgetOrigin}/xfo-deny"></iframe><iframe title="Permissions Policy" allow="clipboard-write" src="${widgetOrigin}/permission"></iframe><p>Sprawdź Console i Network dla XFO. Clipboard: <a href="/?permission=allow">deleguj widgetowi</a> · <a href="/?permission=deny">odmów</a>. Porównaj nagłówek i próbę zapisu; przeglądarka może wymagać gestu użytkownika, uprawnień lub HTTPS.</p></section>
<section><h2>Clickjacking</h2><p>Nałóż przezroczystą ramkę na pozorny przycisk, kliknij go, a następnie pokaż ramkę, aby sprawdzić stan kontrolowanej strony.</p><div style="position:relative;height:150px"><button style="position:absolute;left:16px;top:30px">Pozorny przycisk</button><iframe id="decoy" title="Kontrolowana strona z przyciskiem" src="${widgetOrigin}/click-target" style="position:absolute;left:0;top:0;width:300px;height:130px;z-index:2"></iframe></div><button onclick="document.querySelector('#decoy').style.opacity='.05'">Nałóż przezroczystą ramkę</button><button onclick="document.querySelector('#decoy').style.opacity='1'">Pokaż ramkę i wynik</button></section>
<section><h2>E2.2 · Nagłówki odpowiedzi i próba embed</h2><p>Porównaj rzeczywiste nagłówki odpowiedzi portalu i widgetu z wynikiem osadzenia.</p><pre id="headers">Odczyt nagłówków…</pre><iframe title="Automatyczna próba osadzenia widgetu" src="${widgetOrigin}/widget"></iframe><p id="frame-state">Oczekiwanie na zdarzenie ramki…</p></section>
<section><h2>Osadzenie portalu przez obcy origin</h2><p>Odpowiedź portalu nie ustawia frame-ancestors, więc wyłącznie polityka rodzica nie odrzuci próby. Osobny widget-route pokazuje kontrolę po stronie osadzanego dokumentu.</p><a href="${attackerOrigin}/embed">Otwórz kontrolowaną stronę zewnętrzną</a></section>
<details><summary>Zakres obserwacji</summary><p>Oczekiwana topologia: portal ${portalOrigin}, widget ${widgetOrigin}, zewnętrzny dokument ${attackerOrigin}. frame-src należy do odpowiedzi rodzica; frame-ancestors do odpowiedzi widgetu. Obie odpowiedzi muszą dopuścić integrację. SOP nie daje portalowi dostępu do DOM cross-origin.</p></details>`, `
function inspect(id){const out=document.querySelector('#'+id+'-result');try{const text=document.getElementById(id).contentDocument.body.innerText;out.textContent='Odczyt udany: '+text.slice(0,80)}catch(e){out.textContent='Odczyt zablokowany: '+e.name}}
function reloadSandbox(id,tokens){const frame=document.getElementById(id);frame.setAttribute('sandbox',tokens);frame.onload=()=>inspect(id);frame.src=frame.src}
function setSandbox(on){reloadSandbox('widget',on?'allow-scripts allow-same-origin':'allow-scripts')}
window.addEventListener('message',e=>{if(e.source===document.querySelector('#srcdoc-frame').contentWindow)document.querySelector('#srcdoc-result').textContent='event.origin='+JSON.stringify(e.origin)+'; payload='+JSON.stringify(e.data)})
Promise.all([fetch(location.pathname),fetch('${widgetOrigin}/widget')]).then(rs=>document.querySelector('#headers').textContent=JSON.stringify({portal:rs[0].headers.get('content-security-policy'),widget:rs[1].headers.get('content-security-policy')},null,2)).catch(e=>document.querySelector('#headers').textContent='Błąd: '+e)
document.querySelector('iframe[title="Automatyczna próba osadzenia widgetu"]').addEventListener('load',()=>document.querySelector('#frame-state').textContent='Zdarzenie load wystąpiło; sprawdź Console i Network, bo samo load nie potwierdza, że dokument został wyświetlony.')
`)));
portal.get('/same', (_req, res) => res.type('html').send(html('Dokument same-origin', '<p>Dokument portalu dostępny pod tym samym originem.</p>')));
portal.listen(4223, '127.0.0.1', () => console.log(`L2.2 portal ${portalOrigin}`));

const widget = express();
widget.use((req, res, next) => {
  console.log(`[WIDGET] ${req.method} ${req.originalUrl} origin=${req.get('origin') ?? '-'}`);
  if (req.get('origin') === portalOrigin) { res.setHeader('Access-Control-Allow-Origin', portalOrigin); res.setHeader('Access-Control-Expose-Headers', 'Content-Security-Policy'); res.setHeader('Vary', 'Origin'); }
  const permitPortal = req.path !== '/deny-portal';
  res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; ${permitPortal ? widgetAncestorPolicy : "frame-ancestors 'none'"}`);
  res.setHeader('Cache-Control', 'no-store');
  next();
});
widget.get('/widget', (_req, res) => res.type('html').send(html('Widget partnera', '<p id="identity">Widget działa. Spróbuj odczytać ten tekst z rodzica.</p><button onclick="document.querySelector(\'#identity\').textContent=\'Skrypt widgetu działa.\'">Uruchom skrypt</button>')));
widget.get('/deny-portal', (_req, res) => res.type('html').send(html('Widget zablokowany dla portalu', '<p>Ta odpowiedź używa frame-ancestors none.</p>')));
widget.get('/xfo-deny', (_req,res)=>{res.setHeader('X-Frame-Options','DENY');res.removeHeader('Content-Security-Policy');res.type('html').send(html('X-Frame-Options DENY','<p>Ta strona nie powinna być osadzona w portalu.</p>'))});
widget.get('/permission', (_req,res)=>res.type('html').send(html('Permissions Policy', '<p>Próba clipboardu wymaga kliknięcia:</p><button onclick="if(!navigator.clipboard){document.querySelector(\'output\').textContent=\'Clipboard API niedostępne w tym kontekście\';return}navigator.clipboard.writeText(\'demo\').then(()=>document.querySelector(\'output\').textContent=\'zapisano\').catch(e=>document.querySelector(\'output\').textContent=e.name+\': \'+e.message)">Zapisz tekst</button><output></output>')));
widget.get('/click-target', (_req,res)=>res.type('html').send('<!doctype html><html lang="pl"><meta charset="utf-8"><title>Kontrolowany cel clickjacking</title><body style="margin:0"><button style="position:absolute;left:16px;top:30px" onclick="document.querySelector(\'p\').textContent=\'Kliknięcie dotarło do osadzonej kontrolki.\'">Nieszkodliwy przycisk</button><p style="position:absolute;top:70px">Brak kliknięcia.</p></body></html>'));
widget.listen(4224, '127.0.0.1', () => console.log(`L2.2 widget ${widgetOrigin}`));

const attacker = express();
attacker.use((req, _res, next) => { console.log(`[OTHER] ${req.method} ${req.originalUrl}`); next(); });
attacker.get('/embed', (_req, res) => res.type('html').send(html('Kontrolowana strona obcego originu', `<p>Ta strona próbuje osadzić widget i portal. Porównaj polityki odpowiedzi widgetu i portalu.</p><iframe title="Widget: obcy przodek" src="${widgetOrigin}/widget"></iframe><iframe title="Widget: frame-ancestors none" src="${widgetOrigin}/deny-portal"></iframe><iframe title="Portal: obcy przodek" src="${portalOrigin}/"></iframe><p>Sprawdź Console i Network. Portal nie wysyła frame-ancestors w tym ćwiczeniu, widget dopuszcza wyłącznie portal originu.</p>`)));
attacker.listen(4225, '127.0.0.1', () => console.log(`L2.2 outside ${attackerOrigin}`));
