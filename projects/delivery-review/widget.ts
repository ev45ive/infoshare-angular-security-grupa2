import { createServer } from 'node:http';

const portal = 'http://127.0.0.1:4307';
const html = `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Widget dokumentów</title><body><p>Kontrolowany widget</p><button id="valid">Wyślij doc_42</button><button id="invalid">Wyślij błędne dane</button><script>
document.querySelector('#valid').onclick=()=>parent.postMessage({type:'document-selected',id:'doc_42'},${JSON.stringify(portal)});
document.querySelector('#invalid').onclick=()=>parent.postMessage({type:'document-selected',id:'<b>niepoprawne</b>'},${JSON.stringify(portal)});
</script></body></html>`;
createServer((req, res) => {
  console.log(`[WIDGET] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors http://127.0.0.1:4307" });
  res.end(html);
}).listen(4308, '127.0.0.1', () => console.log(`Widget: http://127.0.0.1:4308`));
