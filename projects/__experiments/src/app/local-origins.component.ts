import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type ProbeResult = { label: string; url: string; result: string; error: string };

@Component({
  selector: 'local-origins-experiment',
  imports: [RouterLink],
  template: `
    <main>
      <a routerLink="/">Eksperymenty</a>
      <h1>Origin, site i postMessage</h1>
      <p>Porównaj komunikację między aplikacjami i odczyt odpowiedzi API z różnych originów.</p>

      <section>
        <h2>Okno i iframe</h2>
        <p>Bieżący origin: <code>{{ locationOrigin }}</code></p>
        <p>Secure context: <code>{{ secureContext }}</code></p>
        <p>Port zmienia origin. Klasyfikację site sprawdzisz w nagłówku Sec-Fetch-Site w odpowiedzi API.</p>
        @if (embedded) {
          <p role="status">Ta strona działa wewnątrz iframe. Nie tworzę kolejnego iframe.</p>
        } @else {
          <label>Adres aplikacji B
            <input [value]="frameUrl()" (input)="setFrameUrl($event)" type="url" size="54">
          </label>
          <button type="button" (click)="loadFrame()">Załaduj iframe</button>
          <button type="button" (click)="sendMessage()" [disabled]="!frameLoaded()">Wyślij postMessage</button>
          @if (frameError()) { <p role="alert">{{ frameError() }}</p> }
          @if (frameUrlError()) { <p role="alert">{{ frameUrlError() }}</p> }
          <iframe title="Aplikacja B" [src]="frameSrc()" (load)="onFrameLoad()"></iframe>
        }
        <h3>Odebrane komunikaty</h3>
        <pre aria-live="polite">{{ messages() || 'Brak komunikatów.' }}</pre>
      </section>

      <section>
        <h2>Żądania fetch</h2>
        <p>Uruchom żądania z bieżącego originu. Błąd CORS może oznaczać, że żądanie dotarło do API, ale skrypt nie może odczytać odpowiedzi.</p>
        <button type="button" (click)="fetchApi('dozwolony')" [disabled]="busy()">API: CORS dozwolony</button>
        <button type="button" (click)="fetchSameHost()" [disabled]="busy()">API: ten sam host, inny port</button>
        <button type="button" (click)="fetchHttp('allowed')" [disabled]="busy()">HTTP API: CORS dozwolony</button>
        <button type="button" (click)="fetchHttp('blocked')" [disabled]="busy()">HTTP API: CORS niedozwolony</button>
        <button type="button" (click)="fetchHttp('same')" [disabled]="busy()">HTTP API: ten sam host, inny port</button>
        <button type="button" (click)="fetchApi('niedozwolony')" [disabled]="busy()">API: CORS niedozwolony</button>
        <button type="button" (click)="fetchProxy()" [disabled]="busy()">Względny /lab-api</button>
        @if (results().length) {
          @for (item of results(); track $index) {
            <article>
              <h3>{{ item.label }}</h3>
              <p><code>{{ item.url }}</code></p>
              @if (item.error) { <p role="alert">{{ item.error }}</p> }
              @if (item.result) { <pre>{{ item.result }}</pre> }
            </article>
          }
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; max-width: 920px; margin: 0 auto; padding: 1.5rem; font: 16px/1.5 system-ui, sans-serif; color:#172033 }
    section { margin-block: 2rem; padding: 1rem; border:1px solid #cbd5e1; border-radius: .6rem }
    button { margin: .35rem; padding:.5rem .75rem; cursor:pointer }
    input { display:block; max-width:100%; margin:.35rem 0 }
    iframe { display:block; width:100%; min-height:320px; margin-top:1rem; border:1px solid #94a3b8 }
    pre { padding:.75rem; overflow:auto; background:#f1f5f9; white-space:pre-wrap; overflow-wrap:anywhere }
    code { overflow-wrap:anywhere }
  `],
})
export class LocalOriginsExperiment implements OnDestroy {
  readonly locationOrigin = location.origin;
  readonly secureContext = window.isSecureContext;
  readonly embedded = window.parent !== window;
  readonly frameUrl = signal(location.protocol === 'https:'
    ? 'https://app-b.localhost:4203/local-origins'
    : 'http://app-b.localhost:4202/local-origins');
  readonly frameSrc = signal<SafeResourceUrl | null>(null);
  readonly frameLoaded = signal(false);
  readonly frameError = signal('');
  readonly frameUrlError = signal('');
  readonly messages = signal('');
  readonly results = signal<ProbeResult[]>([]);
  readonly busy = signal(false);
  private expectedFrameOrigin = '';
  private readonly onMessage = (event: MessageEvent): void => {
    if (this.embedded && event.data?.type === 'origin-lab:ping' && event.source === window.parent) {
      this.messages.update((current) => `${current}${current ? '\n' : ''}Odebrano z ${event.origin}: ${this.format(event.data)}`);
      (event.source as Window).postMessage({ type: 'origin-lab:pong', receivedAt: new Date().toISOString(), origin: location.origin }, event.origin);
      return;
    }
    if (event.source !== this.frameWindow || event.origin !== this.expectedFrameOrigin) return;
    this.messages.update((current) => `${current}${current ? '\n' : ''}${event.origin}: ${this.format(event.data)}`);
  };
  private get frameWindow(): Window | null {
    return document.querySelector('iframe')?.contentWindow ?? null;
  }

  constructor(private readonly sanitizer: DomSanitizer) { window.addEventListener('message', this.onMessage); }
  ngOnDestroy(): void { window.removeEventListener('message', this.onMessage); }

  setFrameUrl(event: Event): void {
    this.frameUrl.set((event.target as HTMLInputElement).value);
    this.frameUrlError.set('');
  }

  loadFrame(): void {
    try {
      const url = new URL(this.frameUrl());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Adres musi używać HTTP lub HTTPS.');
      this.expectedFrameOrigin = url.origin;
      this.frameLoaded.set(false);
      this.frameError.set('');
      if (!['app-a.localhost', 'app-b.localhost', 'localhost'].includes(url.hostname)) throw new Error('Dozwolone są lokalne hosty eksperymentu.');
      this.frameSrc.set(this.sanitizer.bypassSecurityTrustResourceUrl(url.href));
    } catch (error) { this.frameUrlError.set(`Nieprawidłowy adres iframe: ${String(error)}`); }
  }

  onFrameLoad(): void {
    if (!this.frameSrc()) return;
    this.frameLoaded.set(true);
    this.frameError.set('Zdarzenie load iframe wystąpiło. Odpowiedź na postMessage potwierdzi działanie aplikacji w ramce.');
  }

  sendMessage(): void {
    try {
      const target = this.frameWindow;
      if (!target || !this.expectedFrameOrigin) throw new Error('Iframe nie jest gotowy.');
      target.postMessage({ type: 'origin-lab:ping', sentAt: new Date().toISOString(), origin: location.origin }, this.expectedFrameOrigin);
      this.messages.update((current) => `${current}${current ? '\n' : ''}Wysłano do ${this.expectedFrameOrigin}: origin-lab:ping`);
    } catch (error) { this.frameError.set(`Nie udało się wysłać komunikatu: ${String(error)}`); }
  }

  async fetchApi(kind: 'dozwolony' | 'niedozwolony'): Promise<void> {
    const path = kind === 'dozwolony' ? '/lab-api/allowed' : '/lab-api/blocked';
    await this.request(`API — CORS ${kind}`, `https://api.localhost:4343${path}`);
  }

  async fetchSameHost(): Promise<void> { await this.request('API — ten sam host, inny port', `https://${location.hostname}:4343/lab-api/allowed`); }

  async fetchHttp(kind: 'allowed' | 'blocked' | 'same'): Promise<void> {
    const host = kind === 'same' ? location.hostname : 'api.localhost';
    const path = kind === 'blocked' ? 'blocked' : 'allowed';
    await this.request(`HTTP API — ${kind}`, `http://${host}:4344/lab-api/${path}`);
  }

  async fetchProxy(): Promise<void> { await this.request('Względny proxy', '/lab-api/allowed'); }

  private async request(label: string, url: string): Promise<void> {
    this.busy.set(true);
    try {
      const response = await fetch(url);
      const body = await response.text();
      let result = body;
      try { result = JSON.stringify(JSON.parse(body), null, 2); } catch { /* keep plain response */ }
      this.addResult({ label, url, result: `HTTP ${response.status} ${response.statusText}\n${result}`, error: '' });
    } catch (error) {
      this.addResult({ label, url, result: '', error: `Nie udało się odczytać odpowiedzi: ${String(error)}. Możliwy błąd CORS, sieci lub TLS.` });
    } finally { this.busy.set(false); }
  }

  private addResult(item: ProbeResult): void { this.results.update((current) => [item, ...current]); }
  private format(value: unknown): string {
    try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); }
  }
}
