// Po review: jawna walidacja protokołu; uprawnienie do dokumentu sprawdza API.
type DocumentSelected = { type: 'document-selected'; id: string };
function isDocumentSelected(value: unknown): value is DocumentSelected {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate['type'] === 'document-selected'
    && typeof candidate['id'] === 'string'
    && /^doc_[0-9]{2}$/.test(candidate['id']);
}

window.addEventListener('message', async (event: MessageEvent<unknown>) => {
  if (event.origin !== 'https://viewer.partner.test') return;
  if (event.source !== document.querySelector('iframe[data-document-viewer]')?.contentWindow) return;
  if (!isDocumentSelected(event.data)) return;
  const response = await fetch(`/api/documents/${encodeURIComponent(event.data.id)}`);
  if (!response.ok) return;
  const doc = await response.json() as { description: string };
  document.querySelector('#preview')!.textContent = doc.description;
});
