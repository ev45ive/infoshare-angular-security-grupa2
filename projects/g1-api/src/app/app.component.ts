import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type ApiResult = { status: number; body: unknown };

@Component({
  selector: 'g1-root',
  standalone: true,
  template: `
    <main>
      <header><p class="eyebrow">Angular Security · G1 · lokalny pokaz</p><h1>Token, odbiorca i granica API</h1>
        <p>Jeden lokalny resource server pokazuje walidację tokenu (L1.3) i niezależną walidację oraz autoryzację mutacji (L1.5). Wszystkie konta, tokeny i dane są fikcyjne.</p></header>
      <section><h2>L1.3 · Walidacja tokenu po stronie API</h2>
        <p>Odczyt payloadu JWT w przeglądarce nie potwierdza podpisu ani uprawnień. API sprawdza podpis, issuer, audience, typ, czas ważności i unieważnienie.</p>
        <div class="row"><button (click)="login('alice')">Zaloguj Alice</button><button (click)="login('bob')">Zaloguj Bob</button><button class="secondary" (click)="logout()">Wyloguj</button></div>
        <p class="state">{{ identity }}</p>
        <div class="row"><button class="secondary" (click)="requestProfile()">Pobierz profil</button><button class="secondary" (click)="requestWrongAudience()">Wyślij token dla innego API</button><button class="secondary" (click)="requestExpired()">Wyślij wygasły token</button><button class="secondary" (click)="requestRevoked()">Ponów stary token po wylogowaniu</button></div>
        <p>Obserwuj wynik oraz oznaczone logi API w terminalu. Token pozostaje w pamięci karty; UI nie jest źródłem decyzji API.</p>
      </section>
      <section><h2>L1.5 · Kontrakt i granica klient–serwer</h2>
        <p>Formularz ogranicza ilość do 1–5. Zmień żądanie w <code>projects/g1-api/src/app/app.component.ts</code>, w metodzie <code>tamperedOrder()</code>, i sprawdź walidację w <code>projects/g1-api/server/api.ts</code>. Serwer sam wyznacza cenę i właściciela, a przed i po operacji zapisuje stan kontrolowany.</p>
        <label>Ilość (formularz ogranicza do 1–5) <input type="number" min="1" max="5" [value]="quantity" (input)="setQuantity($event)"></label>
        <div class="row"><button (click)="placeOrder()">Złóż zamówienie</button><button class="secondary" (click)="tamperedOrder()">Wyślij zmienioną cenę i nadmiarowe pole</button><button class="secondary" (click)="timeoutAfterCommit()">Zasymuluj timeout po zapisie i retry</button><button class="secondary" (click)="repeatOrder()">Powtórz to samo żądanie</button><button class="secondary" (click)="reset()">Przywróć stan początkowy</button></div>
        <p>Po każdym kroku sprawdź JSON w tym widoku i linię <code>[G1 API]</code> w terminalu. Powtórzenie używa tego samego klucza idempotencji.</p>
      </section>
      <section><h2>SPA i BFF</h2><p>Porównaj żądanie SPA z tokenem w Authorization ze ścieżką BFF. BFF trzyma token w pamięci serwera, a przeglądarka wysyła cookie HttpOnly. W tym przykładzie BFF i API to osobne trasy jednego procesu; BFF wywołuje API HTTP z tokenem. Sprawdź Network i logi <code>[G1 BFF]</code> oraz <code>[G1 API]</code>.</p><p>Zmiany sesji sprawdzają Origin. Cookie wymaga analizy CSRF, a HttpOnly nie blokuje żądań wywołanych przez XSS.</p><div class="row"><button (click)="bffLogin()">Utwórz sesję BFF</button><button class="secondary" (click)="bffProfile()">Pobierz profil przez BFF</button><button class="secondary" (click)="bffLogout()">Usuń sesję BFF</button></div></section>
      <section><h2>Angular HttpClient: XSRF i odbiorca tokenu</h2><p>Próba XSRF zapisuje fikcyjne cookie i wysyła POST względny, bezwzględny same-origin oraz cross-origin. Angular HttpClient dołącza nagłówek wyłącznie do żądań objętych jego regułą same-origin. Proxy przekazuje lokalną ścieżkę do API; porównaj Network i odpowiedzi.</p><p>Druga próba stosuje interceptor z jawną listą originu i ścieżki: fikcyjny token trafia tylko do jednego kontrolowanego endpointu. Porównaj logi API, Network i kod <code>projects/g1-api/src/main.ts</code>. Obecność tokenu nie zastępuje walidacji ani autoryzacji.</p><div class="row"><button (click)="angularXsrf()">Porównaj XSRF HttpClient</button><button class="secondary" (click)="angularInterceptor()">Porównaj odbiorcę tokenu</button></div></section>
      <section><h2>Ostatnie odpowiedzi</h2><pre>{{ output }}</pre></section>
      <section><h2>Przebieg i obserwacje</h2><ol>
        <li>Zaloguj Alice i pobierz profil. Payload jest widoczny, ale decyzję podejmuje API po weryfikacji.</li>
        <li>Wyślij token przeznaczony dla innego API oraz token z przeszłości. Oba powinny otrzymać 401; porównaj powód w logu.</li>
        <li>Wyloguj Alice, po czym ponów profil ze starym tokenem. Serwerowa lista unieważnień odrzuca token.</li>
        <li>Zaloguj Alice i złóż zamówienie poprawnym formularzem. Zmienione żądanie z ceną klienta i polem <code>owner</code> zostaje odrzucone bez zmiany stanu.</li>
        <li>Powtórz żądanie. API zwróci poprzedni wynik dla tego samego klucza, zamiast dodać drugie zamówienie.</li>
      </ol><p>Reset przywraca lokalne zamówienia i listę unieważnień oraz kończy lokalną sesję. Ponowne logowanie tworzy nowy token.</p></section>
      <footer><h2>Zakres</h2><p>Próba timeoutu opóźnia odpowiedź po zapisie, przerywa oczekiwanie klienta i ponawia żądanie z tym samym kluczem idempotencji. Stan zamówień jest w pamięci procesu.</p><p>Pełny OAuth/OIDC, lokalny IdP, PKCE i odświeżanie tokenów są poza zakresem tego labu. Tokeny i klucz podpisujący są wyłącznie lokalnymi atrapami.</p></footer>
    </main>`,
  styles: [`
    :host{display:block;color:#17212b;font:16px/1.55 system-ui,sans-serif;background:#f4f6f8;min-height:100vh}main{max-width:900px;margin:auto;padding:32px 20px}header,section,footer{padding:20px 0;border-bottom:1px solid #ccd4dc}h1{font-size:2rem;margin:.2em 0}h2{font-size:1.25rem}.eyebrow{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#52677c}.row{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}button{padding:9px 13px;border:0;border-radius:5px;background:#155e75;color:white;cursor:pointer}.secondary{background:#dce5eb;color:#17212b}label{display:flex;gap:12px;align-items:center}input{padding:8px;width:100px}.state{font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#e9eef2;padding:14px;border-radius:5px}code{background:#e9eef2;padding:2px 4px}@media(prefers-color-scheme:dark){:host{background:#111820;color:#e8eef3}section,footer,header{border-color:#35424e}pre,code{background:#202b35}.secondary{background:#35424e;color:#e8eef3}}
  `]
})
export class AppComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private token: string | null = null;
  private staleToken: string | null = null;
  private lastOrderKey = `order-${crypto.randomUUID()}`;
  private lastOrderQuantity = 2;
  quantity = 2;
  identity = 'Brak aktywnego tokenu.';
  output = 'Wyniki żądań pojawią się tutaj.';
  private readonly api = 'http://127.0.0.1:4301';

  setQuantity(event: Event): void { this.quantity = Number((event.target as HTMLInputElement).value); }
  async login(user: 'alice' | 'bob'): Promise<void> {
    const result = await this.call('/auth/login', { method: 'POST', body: JSON.stringify({ user }) });
    const data = result.body as { token?: string; display?: string };
    this.token = data.token ?? null;
    this.staleToken = this.token;
    this.identity = this.token ? `Sesja lokalna: ${data.display} · token tylko w pamięci karty` : 'Logowanie odrzucone.';
    let decoded: unknown = null;
    if (this.token) {
      try { const part = this.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); decoded = JSON.parse(atob(part)); } catch { decoded = 'Nie udało się zdekodować payloadu.'; }
    }
    this.show({ status: result.status, body: { display: data.display, decodedPayload: decoded } });
  }
  async logout(): Promise<void> {
    const result = await this.call('/auth/logout', { method: 'POST' });
    this.token = null;
    this.identity = 'Wylogowano. Stary token pozostaje tylko do kontrolowanej próby odrzucenia.';
    this.show(result);
  }
  async requestProfile(): Promise<void> { this.show(await this.call('/api/profile')); }
  async requestRevoked(): Promise<void> { this.show(await this.call('/api/profile', {}, this.staleToken)); }
  async requestWrongAudience(): Promise<void> { this.show(await this.call('/api/profile', {}, await this.mint('wrong-audience'))); }
  async requestExpired(): Promise<void> { this.show(await this.call('/api/profile', {}, await this.mint('expired'))); }
  async bffLogin(): Promise<void> { this.show(await this.call('/bff/login', { method: 'POST', credentials: 'include' }, null)); }
  async bffProfile(): Promise<void> { this.show(await this.call('/bff/profile', { credentials: 'include' }, null)); }
  async bffLogout(): Promise<void> { this.show(await this.call('/bff/logout', { method: 'POST', credentials: 'include' }, null)); }
  async angularXsrf(): Promise<void> {
    document.cookie = 'g1_angular_xsrf=fikcyjny-token; Path=/; SameSite=Strict';
    const results = [];
    for (const url of ['/lab/angular-xsrf', `${location.origin}/lab/angular-xsrf`, 'http://127.0.0.1:4301/lab/angular-xsrf']) {
      try {
        const response = await firstValueFrom(this.http.post(url, {}, { withCredentials: true, observe: 'response' }));
        results.push({ url, status: response.status, body: response.body });
      } catch (error) {
        const response = error as HttpErrorResponse;
        results.push({ url, status: response.status, body: response.error });
      }
    }
    document.cookie = 'g1_angular_xsrf=; Path=/; Max-Age=0; SameSite=Strict';
    this.show({ status: 200, body: results });
  }
  async angularInterceptor(): Promise<void> {
    try {
      const trusted = await firstValueFrom(this.http.get('http://127.0.0.1:4301/lab/interceptor/trusted'));
      const other = await firstValueFrom(this.http.get('/lab/interceptor/external'));
      this.show({ status: 200, body: { trusted, other } });
    } catch (error) { this.show({ status: 0, body: String(error) }); }
  }
  async placeOrder(): Promise<void> {
    if (!Number.isInteger(this.quantity) || this.quantity < 1 || this.quantity > 5) {
      this.show({ status: 0, body: 'Formularz dopuszcza wyłącznie ilość całkowitą od 1 do 5; żądanie nie zostało wysłane.' });
      return;
    }
    const key = `order-${crypto.randomUUID()}`;
    const quantity = this.quantity;
    const result = await this.order({ quantity }, key);
    if (result.status === 201) { this.lastOrderKey = key; this.lastOrderQuantity = quantity; }
    this.show(result);
  }
  async tamperedOrder(): Promise<void> {
    this.show(await this.order({ quantity: this.quantity, unitPrice: 0.01, owner: 'bob', isApproved: true }, `order-${crypto.randomUUID()}`));
  }
  async repeatOrder(): Promise<void> { this.show(await this.order({ quantity: this.lastOrderQuantity }, this.lastOrderKey)); }
  async timeoutAfterCommit(): Promise<void> {
    const key = `order-${crypto.randomUUID()}`;
    const body = { quantity: this.quantity };
    const controller = new AbortController();
    const first = this.order(body, key, true, controller.signal).catch((error) => ({ status: 0, body: `Timeout klienta: ${String(error)}` }));
    setTimeout(() => controller.abort(), 100);
    const timedOut = await first;
    this.show(timedOut);
    await new Promise((resolve) => setTimeout(resolve, 750));
    const retry = await this.order(body, key);
    this.lastOrderKey = key; this.lastOrderQuantity = this.quantity;
    this.show(retry);
  }
  async reset(): Promise<void> {
    const result = await this.call('/lab/reset', { method: 'POST', credentials: 'include' });
    this.token = null; this.staleToken = null; this.identity = 'Stan początkowy przywrócony.';
    this.lastOrderKey = `order-${crypto.randomUUID()}`; this.quantity = 2; this.show(result);
  }
  private async order(body: object, key: string, delayResponse = false, signal?: AbortSignal): Promise<ApiResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Idempotency-Key': key };
    if (delayResponse) headers['X-Lab-Delay-Response'] = 'true';
    return this.call('/api/orders', { method: 'POST', headers, body: JSON.stringify(body), signal });
  }
  private async mint(variant: string): Promise<string | null> {
    const result = await this.call('/lab/token', { method: 'POST', body: JSON.stringify({ variant }) });
    return (result.body as { token?: string }).token ?? null;
  }
  private async call(path: string, init: RequestInit = {}, token = this.token): Promise<ApiResult> {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${this.api}${path}`, { ...init, headers });
      return { status: response.status, body: await response.json() };
    } catch (error) { return { status: 0, body: String(error) }; }
  }
  private show(result: ApiResult): void { this.output = `HTTP ${result.status}\n${JSON.stringify(result.body, null, 2)}`; this.cdr.markForCheck(); }
}
