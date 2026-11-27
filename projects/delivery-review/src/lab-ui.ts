type ApiResult = { status: number; body: unknown; headers: Record<string, string> };
const result = document.querySelector<HTMLElement>('#result')!;

function show(value: unknown): void {
  result.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

async function request(path: string, actor = 'anna'): Promise<ApiResult> {
  const response = await fetch(path, { headers: { 'X-Demo-Actor': actor } });
  const body: unknown = response.headers.get('content-type')?.includes('application/json') ? await response.json() : `Dokument HTML: ${(await response.text()).length} znaków; pełna treść w Network.`;
  const headers: Record<string, string> = {};
  for (const name of ['content-type', 'content-security-policy', 'cache-control', 'x-content-type-options', 'referrer-policy']) {
    const value = response.headers.get(name);
    if (value) headers[name] = value;
  }
  return { status: response.status, body, headers };
}

document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => panel.hidden = panel.dataset.panel !== button.dataset.tab);
    document.querySelectorAll('[data-tab]').forEach((tab) => tab.setAttribute('aria-current', String(tab === button)));
  });
});

document.querySelector<HTMLButtonElement>('#read-own')!.onclick = async () => show(await request('/api/documents/doc_42', 'anna'));
document.querySelector<HTMLButtonElement>('#read-other')!.onclick = async () => show(await request('/api/documents/doc_84', 'anna'));
document.querySelector<HTMLButtonElement>('[data-read="own"]')!.onclick = async () => show(await request('/api/documents/doc_42', 'anna'));
document.querySelectorAll<HTMLButtonElement>('[data-read="other"]').forEach(button => button.onclick = async () => show(await request('/api/documents/doc_84', 'anna')));
document.querySelector<HTMLButtonElement>('#review-insecure')!.onclick = async () => show(await request('/api/insecure-documents/doc_84', 'anna'));
const preview = document.querySelector<HTMLElement>('#render-preview')!;
const sampleHtml = '<strong>Formatowanie</strong> z kontrolowanego wejścia';
document.querySelector<HTMLButtonElement>('#render-text')!.onclick = () => { preview.textContent = sampleHtml; };
document.querySelector<HTMLButtonElement>('#render-html')!.onclick = () => { preview.innerHTML = sampleHtml; };
document.querySelector<HTMLButtonElement>('#review-url-check')!.onclick = () => {
  const raw = document.querySelector<HTMLInputElement>('#review-url')!.value;
  let outcome = 'odrzucono';
  try { const url = new URL(raw); if (url.origin === 'https://documents.example' && (url.pathname === '/preview' || url.pathname.startsWith('/preview/'))) outcome = 'dozwolono'; } catch { /* Niepoprawny URL. */ }
  document.querySelector<HTMLElement>('#review-url-result')!.textContent = `${raw}: ${outcome}`;
};
window.addEventListener('message', async (event: MessageEvent<unknown>) => {
  const frame = document.querySelector<HTMLIFrameElement>('#review-widget');
  const data = event.data as { type?: unknown; id?: unknown } | null;
  const originOk = event.origin === 'http://127.0.0.1:4308';
  const sourceOk = event.source === frame?.contentWindow;
  const schemaOk = typeof data === 'object' && data !== null && data.type === 'document-selected' && typeof data.id === 'string' && /^doc_[0-9]{2}$/.test(data.id);
  document.querySelector<HTMLElement>('#widget-status')!.textContent = `origin=${originOk}; source=${sourceOk}; dane=${schemaOk}; ${originOk && sourceOk && schemaOk ? 'zaakceptowano' : 'odrzucono'}`;
  if (originOk && sourceOk && schemaOk) show(await request(`/api/documents/${encodeURIComponent(data.id as string)}`, 'anna'));
});
document.querySelector<HTMLButtonElement>('#run-ci')!.onclick = async () => show(await (await fetch('/api/ci-simulation')).json());
document.querySelector<HTMLButtonElement>('#inspect-html')!.onclick = async () => show(await request('/'));
document.querySelector<HTMLButtonElement>('#inspect-api')!.onclick = async () => show(await request('/api/documents/doc_42'));
document.querySelector<HTMLButtonElement>('#inspect-denial')!.onclick = async () => show(await request('/api/documents/doc_84'));

document.querySelectorAll<HTMLButtonElement>('[data-response]').forEach((button) => {
  button.onclick = async () => {
    const response = await fetch('/api/incident/' + button.dataset.response, { method: 'POST' });
    show(await response.json());
  };
});

document.querySelector<HTMLButtonElement>('#show-events')!.onclick = async () => show(await (await fetch('/api/incidents')).json());
document.querySelector<HTMLButtonElement>('#response-probe')!.onclick = async () => {
  const params = new URLSearchParams({ env: document.querySelector<HTMLSelectElement>('#response-env')!.value, proxy: document.querySelector<HTMLSelectElement>('#response-proxy')!.value, status: document.querySelector<HTMLSelectElement>('#response-status')!.value });
  show(await request(`/api/response-demo?${params}`));
};
document.querySelector<HTMLButtonElement>('#alert-deployed')!.onclick = async () => show(await request('/api/alert-simulation?deployed=true'));
document.querySelector<HTMLButtonElement>('#alert-not-deployed')!.onclick = async () => show(await request('/api/alert-simulation?deployed=false'));
document.querySelector<HTMLButtonElement>('#alert-false-positive')!.onclick = async () => show(await request('/api/alert-simulation?deployed=true&present=false'));
void fetch('/api/artifact-scan').then((response) => response.json()).then((data) => {
  const summary = document.querySelector<HTMLElement>('#experiment-summary')!;
  summary.textContent = `Fikcyjny marker ${data.marker}: ` + (data.matches as Array<{ label: string; found: boolean }>).map(item => `${item.label}: ${item.found ? 'obecny' : 'brak'}`).join('; ');
});
