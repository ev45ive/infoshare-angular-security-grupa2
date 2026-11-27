import express, { type Request, type Response } from 'express';

const allowedOrigins = new Set([
  'http://app.localhost:4212',
  'http://widget.localhost:4213',
  'http://other.localhost:4214',
]);
type LogEntry = { time: string; actor: string; event: string; details: string };
const entries: LogEntry[] = [];
const portalOrigin = 'http://app.localhost:4212';
const previewHtml = `<strong>Opis widgetu</strong><img src="/no-image" onerror="document.querySelector('[data-message-proof]').textContent='Handler wiadomości wykonał się.'">`;

function send(res: Response, status: number, type: string, body: string): void {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function page(title: string, content: string, script: string): string {
  return `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#17252c;padding:20px}button{padding:9px 12px;margin:4px;border:1px solid #9aabad;background:#f4f7f7;cursor:pointer}p{color:#52646b}code{font-family:ui-monospace,monospace}</style><h1>${title}</h1>${content}<script>${script}</script></html>`;
}

function log(event: string, actor: string, details: string): LogEntry {
  const item = { time: new Date().toLocaleTimeString('pl-PL'), actor, event, details };
  entries.unshift(item);
  if (entries.length > 40) entries.length = 40;
  console.log(`[${item.time}] ${actor}: ${event} — ${details}`);
  return item;
}

function handleLog(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
  if (req.method === 'GET') return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(entries));
  if (req.method !== 'POST' || !origin || !allowedOrigins.has(origin)) return send(res, 403, 'application/json', '{"error":"origin denied"}');
  let body = '';
  req.on('data', (chunk: Buffer) => { body += chunk.toString(); if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    try {
      const value = JSON.parse(body);
      const item = log(String(value.event ?? 'zdarzenie').slice(0, 48), String(value.actor ?? 'nieznany').slice(0, 32), String(value.details ?? '').slice(0, 240));
      send(res, 201, 'application/json; charset=utf-8', JSON.stringify(item));
    } catch { send(res, 400, 'application/json', '{"error":"invalid json"}'); }
  });
}

const widgetScript = `
const PARENT = ${JSON.stringify(portalOrigin)};
const LOG = 'http://log.localhost:4215/events';
async function record(event, details) { try { await fetch(LOG,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:'widget',event,details})}); } catch {} }
async function emit(id, target = PARENT) {
  const data = { type: 'document-selected', id };
  window.parent.postMessage(data, target);
  await record('wysłano', 'targetOrigin='+target+'; data='+JSON.stringify(data));
}
document.querySelector('#valid').onclick=()=>emit('doc_42');
document.querySelector('#invalid').onclick=()=>emit('<img src=x>');
document.querySelector('#wrong-target').onclick=()=>emit('doc_42','http://other.localhost:4214');
document.querySelector('#unknown-type').onclick=()=>window.parent.postMessage({type:'admin-delete',id:'doc_42'},PARENT);
document.querySelector('#extra-field').onclick=()=>window.parent.postMessage({type:'document-selected',id:'doc_42',role:'admin'},PARENT);
document.querySelector('#long-id').onclick=()=>window.parent.postMessage({type:'document-selected',id:'x'.repeat(1000)},PARENT);
document.querySelector('#html-data').onclick=()=>window.parent.postMessage({type:'preview-html',html:${JSON.stringify(previewHtml)}},PARENT);
let channelPort;window.addEventListener('message',event=>{if(event.origin!==PARENT||event.source!==parent)return;if(event.data?.type==='portal-ready'){parent.postMessage({type:'widget-ready'},PARENT);return}if(event.data?.type!=='open-channel'||event.ports.length!==1)return;channelPort=event.ports[0];channelPort.onmessage=e=>channelPort.postMessage({type:'ack',received:e.data})});
document.querySelector('#channel').onclick=()=>channelPort?.postMessage({type:'select',id:'doc_42'});
`;

const otherScript = `
const LOG='http://log.localhost:4215/events';
document.querySelector('button').onclick=async()=>{
  const data={type:'document-selected',id:'doc_from_other_origin'};
  window.parent.postMessage(data,${JSON.stringify(portalOrigin)});
  try{await fetch(LOG,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:'obcy origin',event:'wysłano',details:'origin='+location.origin+'; data='+JSON.stringify(data)})})}catch{}
};
`;

const role = process.argv[2];
const app = express();
app.use((req, _res, next) => {
  if (role !== 'log' || req.method !== 'GET') console.log(`${req.method} ${req.originalUrl} origin=${req.get('origin') ?? '-'}`);
  next();
});
if (role === 'log') {
  app.use((req, res) => {
    if (req.url?.startsWith('/events')) return handleLog(req, res);
    send(res, 200, 'text/html; charset=utf-8', 'Endpoint logów');
  });
  app.listen(4215, '127.0.0.1', () => console.log('http://log.localhost:4215'));
} else if (role === 'widget') {
  app.use((_req, res) => send(res, 200, 'text/html; charset=utf-8', page('Widget wyboru dokumentu', '<p>Dokumenty partnera</p><button id="valid">Wyślij poprawne ID doc_42</button><button id="invalid">Wyślij niepoprawne ID</button><button id="wrong-target">Użyj innego targetOrigin</button><button id="unknown-type">Wyślij nieznany typ</button><button id="extra-field">Dodaj nieznane pole</button><button id="long-id">Wyślij zbyt długie ID</button><button id="html-data">Wyślij przykładowy HTML</button><button id="channel">Wyślij przez kanał</button>', widgetScript)));
  app.listen(4213, '127.0.0.1', () => console.log('http://widget.localhost:4213/widget'));
} else if (role === 'other') {
  app.use((_req, res) => send(res, 200, 'text/html; charset=utf-8', page('Obcy origin', '<p>Ta strona nie jest zaufanym partnerem portalu.</p><button>Wyślij wiarygodnie wyglądającą wiadomość</button>', otherScript)));
  app.listen(4214, '127.0.0.1', () => console.log('http://other.localhost:4214/other'));
} else {
  throw new Error('Wybierz rolę: widget, other lub log');
}

