import { Component, OnDestroy, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

type LabLog = { time: string; actor: string; event: string; details: string };

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <main>
      <p class="eyebrow">Angular Security · L2.3</p>
      <h1>Protokół <code>postMessage</code></h1>
      <p class="intro">Portal osadza zewnętrzny widget wyboru dokumentu. Sprawdź, co ogranicza dostarczenie wiadomości, a co musi zweryfikować jej odbiorca.</p>
      <section class="steps" aria-label="Przebieg">
        <div><b>1</b><span>Porównaj wiadomości z dwóch ramek o tym samym originie; odbiorca dopuszcza tylko wskazane okno.</span></div>
        <div><b>2</b><span>Wyślij różne typy i rozmiary danych; log portalu pokazuje decyzję walidatora.</span></div>
        <div><b>3</b><span>Otwórz kanał i wyślij wiadomość portem, a potem go zamknij.</span></div>
      </section>
      <section class="layout">
        <div>
          <h2>Osadzone okno</h2>
          <iframe class="widget" title="Widget partnera" src="http://widget.localhost:4213/widget" (load)="frameLoaded()"></iframe>
          <button (click)="navigateFrame()">Nawiguj ramkę ponownie</button>
          <h2>Drugi widget tego samego originu</h2>
          <iframe class="widget-secondary" title="Drugi widget partnera" src="http://widget.localhost:4213/widget?instance=second"></iframe>
          <p><button (click)="openChannel()">Otwórz MessageChannel</button> <button (click)="closeChannel()">Zamknij kanał</button></p><p class="note">{{ channelState() }}</p>
          <h2>Obcy nadawca</h2>
          <iframe class="other" title="Strona z obcego originu" src="http://other.localhost:4214/other"></iframe>
          <p class="note">Widget: <code>http://widget.localhost:4213</code> · Obcy origin: <code>http://other.localhost:4214</code></p>
        </div>
        <div>
          <h2>Odebrana wartość</h2>
          <p class="selection" aria-live="polite">{{ selected() }}</p>
          <p class="note">Dane wyświetlane są jako tekst. Wybór nie przyznaje dostępu do dokumentu ani nie autoryzuje operacji API.</p>
          <h2>Wiadomość jako tekst i HTML</h2><p>Po wysłaniu przykładowego HTML z widgetu porównaj interpolację, binding Angulara oraz bezpośredni zapis do DOM. Kontrola nadawcy i struktury nie oczyszcza HTML.</p>
          <p>Tekst: <code>{{ preview() }}</code></p><p>Angular [innerHTML]:</p><div [innerHTML]="preview()"></div><button (click)="writeUnsafe()">Wstaw bezpośrednio do DOM</button><div data-message-sink></div><p data-message-proof>Oczekiwanie na wynik handlera.</p>
          <h2>Log serwera</h2>
          <ol class="logs" aria-live="polite">
            @for (entry of logs(); track $index) {
              <li><time>{{ entry.time }}</time> <b>{{ entry.actor }}</b> — {{ entry.event }}<small>{{ entry.details }}</small></li>
            }
            @empty { <li>Oczekiwanie na wiadomość.</li> }
          </ol>
        </div>
      </section>
      <details>
        <summary>Kod odbiorcy i warianty do porównania</summary>
        <pre><code>if (event.origin !== WIDGET_ORIGIN) return;
if (event.source !== frame.contentWindow) return;
const data = event.data;
if (!isSelectionMessage(data)) return;
selected.set(data.id);</code></pre>
        <p><code>targetOrigin</code> ogranicza, do jakiego originu przeglądarka dostarczy wiadomość. Odbiorca niezależnie sprawdza pełny <code>event.origin</code>, <code>event.source</code> konkretnej ramki oraz typ i format ID. Sam zaufany origin nie potwierdza poprawności danych.</p>
        <p>Porównaj warianty nadawcy w <code>projects/browser-integration/server.ts</code> i kontrole odbiorcy w <code>projects/browser-integration/src/main.ts</code>. Zmień wartość lub warunek w kodzie i powtórz próbę.</p>
      </details>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f5f7f8;color:#17252c;font:16px/1.55 system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:40px 24px}.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#526a73}h1{font-size:clamp(2rem,4vw,3.2rem);line-height:1.1;margin:.3em 0}h2{font-size:1.08rem;margin:0 0 12px}.intro{max-width:760px;color:#40545c}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:28px 0}.steps div{display:flex;gap:12px;align-items:center}.steps b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#d8e7e8}.layout{display:grid;grid-template-columns:1fr 1fr;gap:32px}.layout>div{min-width:0}iframe{display:block;width:100%;height:270px;border:1px solid #c6d1d4;background:white}.note{font-size:.88rem;color:#53666d}.selection{padding:14px;background:white;border-left:3px solid #4b777b;min-height:28px}.logs{padding-left:22px;max-height:240px;overflow:auto}.logs li{padding:7px 0;border-bottom:1px solid #dce3e5}.logs time,.logs small{display:block;color:#5b6c72;font-size:.8rem}.logs small{padding-left:8px}details{margin-top:28px;border-top:1px solid #cad5d8;padding-top:16px}summary{cursor:pointer;font-weight:650}pre{overflow:auto;padding:14px;background:#e9eff0}code{font-family:ui-monospace,monospace}@media(max-width:700px){main{padding:24px 16px}.steps,.layout{grid-template-columns:1fr}}
  `],
})
class AppComponent implements OnDestroy {
  readonly selected = signal('Brak zaakceptowanego wyboru.');
  readonly logs = signal<LabLog[]>([]);
  readonly channelState = signal('Kanał nie został otwarty.');
  readonly preview = signal('');
  private readonly frameOrigin = 'http://widget.localhost:4213';
  private readonly logUrl = 'http://log.localhost:4215/events';
  private frame?: HTMLIFrameElement;
  private readonly timer: number;
  private channel?: MessageChannel;

  constructor() {
    window.addEventListener('message', this.onMessage);
    this.frame = document.querySelector('iframe.widget') ?? undefined;
    this.timer = window.setInterval(() => void this.refreshLogs(), 700);
  }

  ngOnDestroy() { this.closeChannel(); window.removeEventListener('message', this.onMessage); window.clearInterval(this.timer); }

  frameLoaded() {
    this.closeChannel();
    this.frame = document.querySelector('iframe.widget') ?? undefined;
    this.selected.set('Ramka załadowana. Oczekiwanie na handshake.');
    this.frame?.contentWindow?.postMessage({ type: 'portal-ready' }, this.frameOrigin);
  }

  navigateFrame() {
    if (!this.frame) return;
    this.selected.set('Nawigacja ramki: stan wyboru wyczyszczony.');
    this.frame.src = `${this.frameOrigin}/widget?reload=${Date.now()}`;
  }

  openChannel() {
    this.closeChannel();
    if (!this.frame?.contentWindow) return;
    this.channel = new MessageChannel();
    this.channel.port1.onmessage = event => this.channelState.set(`Odpowiedź przez MessageChannel: ${JSON.stringify(event.data)}`);
    this.frame.contentWindow.postMessage({ type: 'open-channel' }, this.frameOrigin, [this.channel.port2]);
    this.channelState.set('Przekazano port do widgetu. Kliknij w nim „Wyślij przez kanał”.');
  }

  closeChannel() { this.channel?.port1.close(); this.channel = undefined; this.channelState.set('Kanał zamknięty.'); }

  writeUnsafe() {
    const sink = document.querySelector<HTMLElement>('[data-message-sink]');
    const proof = document.querySelector<HTMLElement>('[data-message-proof]');
    if (proof) proof.textContent = 'Oczekiwanie na wynik handlera.';
    if (sink) sink.innerHTML = this.preview();
  }

  private onMessage = (event: MessageEvent<unknown>) => {
    const sourceOk = event.source === this.frame?.contentWindow;
    const originOk = event.origin === this.frameOrigin;
    const payload = event.data;
    const dataOk = this.isSelectionMessage(payload);
    if (sourceOk && originOk && typeof payload === 'object' && payload !== null && (payload as Record<string, unknown>)['type'] === 'widget-ready') {
      this.selected.set('Handshake zakończony: widget jest gotowy.');
      return;
    }
    if (sourceOk && originOk && typeof payload === 'object' && payload !== null) {
      const preview = payload as Record<string, unknown>;
      if (Object.keys(preview).length === 2 && preview['type'] === 'preview-html' && typeof preview['html'] === 'string' && preview['html'].length <= 500) {
        this.preview.set(preview['html']);
        void this.record({ actor: 'portal', event: 'otrzymano HTML', details: 'Nadawca i struktura poprawne; treść pozostaje niezaufana.' });
        return;
      }
    }
    const accepted = sourceOk && originOk && dataOk;
    if (sourceOk && originOk && this.isSelectionMessage(payload)) this.selected.set(`Wybrano: ${payload.id}`);
    const details = `origin=${event.origin}; source=${sourceOk ? 'oczekiwana ramka' : 'inna'}; schema=${dataOk ? 'poprawny' : 'niepoprawny'}`;
    void this.record({ actor: 'portal', event: accepted ? 'zaakceptowano' : 'odrzucono', details });
  };

  private isSelectionMessage(value: unknown): value is { type: 'document-selected'; id: string } {
    if (typeof value !== 'object' || value === null) return false;
    const data = value as Record<string, unknown>;
    return Object.keys(data).length === 2 && data['type'] === 'document-selected' && typeof data['id'] === 'string' && data['id'].length <= 64 && /^[a-zA-Z0-9_-]{1,64}$/.test(data['id']);
  }

  private async record(entry: Omit<LabLog, 'time'>) {
    try {
      const response = await fetch(this.logUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (response.ok) await this.refreshLogs();
    } catch { /* Serwer logów jest osobnym, lokalnym originem. */ }
  }

  private async refreshLogs() {
    try {
      const response = await fetch(this.logUrl);
      if (response.ok) this.logs.set((await response.json() as LabLog[]).slice(0, 20));
    } catch { /* Serwer logów może jeszcze nie działać. */ }
  }
}

bootstrapApplication(AppComponent).catch(error => console.error(error));

