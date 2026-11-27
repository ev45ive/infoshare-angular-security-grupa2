// Zmiana przed review: ID z wiadomości steruje odczytem, a opis trafia do HTML.
window.addEventListener('message', async (event: MessageEvent<{ id?: string }>) => {
  const response = await fetch(`/api/documents/${event.data?.id}`);
  const doc = await response.json();
  document.querySelector('#preview')!.innerHTML = doc.description;
});
