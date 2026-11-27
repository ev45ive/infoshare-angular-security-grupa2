import { Component, CSP_NONCE, inject, INJECTOR, Sanitizer, SecurityContext, signal } from '@angular/core';

type PolicyMode =
  | 'off'
  | 'tt-report'
  | 'tt-enforce'
  | 'tt-default'
  | 'report'
  | 'enforce'
  | 'hash'
  | 'nonce-reuse'
  | 'environment';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <header>
      <p class="eyebrow">Angular security · G0</p>
      <h1>Trusted Types, CSP i integralność odpowiedzi</h1>
      <p>
        Trzy samodzielne pokazy prowadzą od sinka DOM do nagłówków i zasobów faktycznie
        dostarczonych przez serwer.
      </p>
      <nav aria-label="Laby">
        <a href="#l03">L0.3 · Sink</a><a href="#l04">L0.4 · Nonce i SRI</a
        ><a href="#l05">L0.5 · Odpowiedź HTTP</a>
      </nav>
    </header>

    <main>
      <section id="l03">
        <p class="eyebrow">Lab L0.3</p>
        <h2>Ograniczanie sinków i wykonywania kodu</h2>
        <p>
          Fikcyjna etykieta z CMS trafia bezpośrednio do natywnego <code>innerHTML</code>. Trusted
          Types pilnuje typu wartości dla objętych sinków; CSP ogranicza dozwolone ścieżki
          wykonania. To odrębne kontrole i żadna nie naprawia przepływu danych.
        </p>
        <ol>
          <li>
            Wybierz wariant <code>off</code>, a następnie kliknij „Wstaw testowy HTML”. Potwierdź,
            że pojawił się element <code>&lt;strong&gt;</code>.
          </li>
          <li>
            Przejdź do <code>?mode=tt-report</code> i powtórz próbę. W Console sprawdź naruszenie
            raportowane przez Trusted Types; zapis nadal jest wykonywany.
          </li>
          <li>
            Wybierz <code>?mode=tt-enforce</code>. Ten sam string powinien wywołać błąd sinka.
            Zbadaj wyjątek i pusty wynik.
          </li>
          <li>
            Przejdź do <code>?mode=report</code>, kliknij „Odczytaj probe CSP” i sprawdź Console.
            Potem użyj <code>?mode=enforce</code>: inline probe bez nonce jest blokowany, a
            nonce'owany pozostaje dozwolony.
          </li>
        </ol>
        <p>
          Użyj przycisku po każdej zmianie trybu. W trybie raportowania polityka tylko rejestruje
          naruszenia. Egzekwowanie Trusted Types może rzucić wyjątek, CSP może zablokować wykonanie,
          a poprawnie wstawiony HTML nadal nie oznacza XSS.
        </p>
        <nav aria-label="Tryb polityki">
          <a href="/?mode=off#l03">Bez polityki</a><a href="/?mode=tt-report#l03">TT report-only</a
          ><a href="/?mode=tt-enforce#l03">TT enforce</a
          ><a href="/?mode=tt-default#l03">TT default policy</a
          ><a href="/?mode=report#l03">CSP report-only</a
          ><a href="/?mode=enforce#l03">CSP enforce</a><a href="/?mode=hash#l03">CSP hash</a>
        </nav>
        <p>
          W wariancie default policy powtórz zapis: policy przepuszczająca wartość nie oczyszcza
          HTML. W trybie hash porównaj wynik probe z hashem w nagłówku.
        </p>
        <div class="controls">
          <button (click)="writeHtml()">Wstaw testowy HTML</button
          ><button class="secondary" (click)="readSinkProbe()">Odczytaj skutek sinka</button
          ><button class="secondary" (click)="readCspProbe()">Odczytaj probe CSP</button
          ><span
            >Tryb: <code>{{ mode }}</code></span
          >
        </div>
        <div class="result" aria-live="polite">
          <strong>Rezultat sinka</strong>
          <div #sink class="sink"></div>
          <p>{{ sinkMessage }}</p>
          <p>{{ cspMessage }}</p>
        </div>
        <p class="source">
          Miejsce zmiany: nagłówki i wstrzykiwany markup w <code>server.ts</code>; wywołanie sinka:
          <code>src/app/app.component.ts</code>.
        </p>

        <div class="result" [innerHTML]="angularHtml()"></div>
      </section>

      <section id="l04">
        <p class="eyebrow">Lab L0.4</p>
        <h2>Nonce i integralność zasobów</h2>
        <p>
          Nonce wiąże uprawnienie do wykonania skryptu z odpowiedzią dokumentu. SRI porównuje
          pobrane bajty kontrolowanego zasobu z oczekiwanym digestem. Nazwa fingerprintowana może
          pomagać w cache, ale sama nie porównuje bajtów.
        </p>

        <div class="result"> angular CSP_NONCE: {{nonce}} </div>
        <ol>
          <li>
            Ustaw <code>?mode=enforce</code>. W Network wybierz dokument HTML i porównaj nonce w
            <code>Content-Security-Policy</code> z właściwością <code>.nonce</code> elementu script.
            Odśwież stronę i sprawdź, czy nonce się zmienia.
          </li>
          <li>Kliknij poprawny SRI. W Network potwierdź 200, a w wyniku tekst „załadowano”.</li>
          <li>
            Kliknij zmieniony digest. Żądanie może zakończyć się 200, lecz przeglądarka odrzuci
            wykonanie; sprawdź Console i brak ustawionej flagi.
          </li>
          <li>
            Otwórz <code>server.ts</code>: SHA-384 jest obliczany z kontrolowanego fixture. Porównaj
            go z celowo zmienionym digestem w kliencie.
          </li>
        </ol>
        <div class="controls">
          <button (click)="loadSri(true)">Załaduj z poprawnym SRI</button
          ><button class="secondary" (click)="loadSri(false)">Załaduj ze zmienionym digestem</button
          ><span>{{ sriMessage() }}</span>
        </div>
        <div class="controls">
          <button class="secondary" (click)="loadSriCrossOrigin(true)">
            SRI cross-origin + CORS</button
          ><button class="secondary" (click)="loadSriCrossOrigin(false)">
            SRI cross-origin bez CORS</button
          ><button class="secondary" (click)="probeCacheNonce(false)">304 bez zmiany CSP</button
          ><button class="secondary" (click)="probeCacheNonce(true)">304 z niezgodnym nonce</button
          ><span>{{ extraMessage() }}</span>
        </div>
        <p>
          Porównaj odpowiedź dokumentu HTML 200 z nagłówkami 304. W wariancie niezgodnym nowa
          polityka może zostać połączona z poprzednim HTML i wskazywać inny nonce.
        </p>
        <p>
          <a href="/?mode=nonce-reuse#l04">Tryb ponownego użycia nonce</a>: odśwież dokument i
          porównaj nonce z poprzednią odpowiedzią. W tym wariancie serwer celowo używa tej samej
          wartości przez czas działania procesu; samo ponowne użycie nie jest automatycznie dowodem
          wykonania ataku.
        </p>
        <p class="source">
          W DevTools oddziel błąd CSP od SRI: zasób może być dozwolony przez CSP i mimo to nie
          przejść weryfikacji bajtów.
        </p>
      </section>

      <section id="l05">
        <p class="eyebrow">Lab L0.5</p>
        <h2>Zweryfikuj rzeczywistą odpowiedź aplikacji</h2>
        <p>
          Konfiguracja w kodzie nie dowodzi, że taki dokument i zasoby otrzymała przeglądarka.
          Serwer tego projektu podaje produkcyjny build Angulara, dodaje nagłówki i nonce dla
          odpowiedzi HTML oraz loguje żądania.
        </p>
        <ol>
          <li>
            Porównaj <code>off</code>, <code>report</code> i <code>enforce</code> w poniższych
            linkach. Każdy wariant przeładowuje dokument z nową odpowiedzią.
          </li>
          <li>
            W Network sprawdź nagłówek CSP / CSP Report-Only, HTML, pliki JavaScript i style. W
            Console odczytaj skutek inline probe.
          </li>
          <li>
            Otwórz terminal serwera i skoreluj metodę, ścieżkę, tryb oraz status. Sprawdź też
            <code>Cache-Control: no-store</code> i nonce w świeżym dokumencie.
          </li>
          <li>
            Zmień konfigurację w <code>server.ts</code> i uruchom lab ponownie. Porównuj zamierzoną
            politykę z odpowiedzią, a nie tylko z kodem.
          </li>
        </ol>
        <div class="controls">
          <a class="button" href="/?mode=off#l05">Bez polityki</a
          ><a class="button" href="/?mode=report#l05">Report-Only</a
          ><a class="button" href="/?mode=enforce#l05">Egzekwuj</a>
        </div>
        <p>
          <a href="/?mode=environment&amp;env=development#l05">Development</a> ·
          <a href="/?mode=environment&amp;env=production#l05">Production</a> — ten sam build
          otrzymuje odpowiednio CSP Report-Only albo CSP enforce. Porównaj odpowiedź i probe w
          Console, a także nagłówek <code>X-Content-Policy-Lab-Environment</code>. Sprawdź również
          <a href="/redirect-probe">przekierowanie 302 do błędu 404</a> w Network.
        </p>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
    header,
    main {
      width: min(68rem, calc(100% - 2rem));
      margin-inline: auto;
    }
    header {
      padding: 2rem 0 1.5rem;
    }
    h1 {
      margin: 0.2rem 0;
      font-size: clamp(1.7rem, 4vw, 2.5rem);
      line-height: 1.15;
    }
    h2 {
      margin: 0.2rem 0 0.6rem;
      font-size: 1.45rem;
    }
    p {
      max-width: 72ch;
    }
    .eyebrow {
      color: #4338ca;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    nav,
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem 1rem;
      margin-top: 1rem;
    }
    nav a,
    .button {
      color: #3730a3;
    }
    main {
      padding-bottom: 4rem;
    }
    section {
      padding: 1.5rem 0;
      border-top: 1px solid #cbd5e1;
      scroll-margin-top: 1rem;
    }
    ol {
      padding-left: 1.4rem;
    }
    li {
      margin: 0.45rem 0;
    }
    button,
    .button {
      display: inline-block;
      padding: 0.5rem 0.75rem;
      border: 1px solid #334155;
      border-radius: 0.3rem;
      background: #172033;
      color: white;
      text-decoration: none;
    }
    button.secondary {
      background: white;
      color: #172033;
    }
    .result {
      margin-top: 1rem;
      padding: 1rem;
      border-left: 3px solid #6366f1;
      background: #eef2ff;
    }
    .sink {
      min-height: 2rem;
      margin-top: 0.4rem;
    }
    .source {
      color: #475569;
      font-size: 0.9rem;
    }
  `,
})
export class AppComponent {
  readonly mode = (new URLSearchParams(location.search).get('mode') ?? 'off') as PolicyMode;
  sinkMessage = 'Sink nie został jeszcze wywołany.';
  cspMessage = 'Probe CSP nie został jeszcze odczytany.';
  sriMessage = signal('Nie załadowano fixture SRI.');
  extraMessage = signal('Dodatkowe próby nieuruchomione.');

  angularHtml = signal<SafeHtml | string>('');

  nonce = inject(CSP_NONCE)

  sanitizer = inject(DomSanitizer);

  writeHtml(): void {
    const target = document.querySelector<HTMLElement>('.sink');
    if (!target) return;
    (window as Window & { __sinkProbe?: string }).__sinkProbe = undefined;
    try {
      target.innerHTML =
        '<strong>Testowy fragment HTML</strong><img src="/missing-lab-image" onerror="window.__sinkProbe = \'executed\'">';

      this.sinkMessage = 'Fragment sparsowano. Odczytaj, czy handler zdarzenia się wykonał.';
    } catch (error) {
      this.sinkMessage = `Zapis zablokowany: ${error instanceof Error ? error.name : String(error)}. Szczegóły są w Console.`;
    }

    const unsafeHTML =
      '<strong>Testowy bindowanie [innerHTML]</strong><img src="/missing-lab-image" onerror="window.__sinkProbe = \'executed\'">';
    const unsafeTrustHtml = this.sanitizer.bypassSecurityTrustHtml(unsafeHTML);
    console.log('unsafeTrustHtml',unsafeTrustHtml);
    const bypassedHTML = this.sanitizer.sanitize(SecurityContext.HTML, unsafeTrustHtml);
    this.angularHtml.set(unsafeHTML);
    console.log('bypassedHTML',bypassedHTML);
    
    this.angularHtml.set(unsafeTrustHtml);
    // this.angularHtml.set(bypassedHTML!);
  }

  readSinkProbe(): void {
    const state = window as Window & { __sinkProbe?: string };
    this.sinkMessage = `Handler w HTML: ${state.__sinkProbe ?? 'brak wykonania'}.`;
  }

  readCspProbe(): void {
    const state = window as Window & {
      __policyProbe?: string;
      __nonceProbe?: string;
      __hashProbe?: string;
    };
    this.cspMessage = `Bez nonce: ${state.__policyProbe ?? 'brak wykonania'}; z nonce: ${state.__nonceProbe ?? 'brak wykonania'}; z hashem: ${state.__hashProbe ?? 'brak wykonania'}.`;
  }

  async loadSri(valid: boolean): Promise<void> {
    (window as Window & { __sriProbe?: string }).__sriProbe = undefined;
    this.sriMessage.set('Ładowanie zasobu…');
    const metadata = await fetch('/sri-meta.json').then(
      (response) => response.json() as Promise<{ integrity: string }>,
    );
    const script = document.createElement('script');
    script.src = '/assets/sri-probe.js';
    script.integrity = valid
      ? metadata.integrity
      : 'sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    script.onload = () => {
      this.sriMessage.set('Zasób załadowano i wykonano. Sprawdź też Network.');
    };
    script.onerror = () => {
      this.sriMessage.set(
        'Przeglądarka odrzuciła zasób albo jego wykonanie. Sprawdź Network i Console.',
      );
    };
    document.head.append(script);
  }

  async loadSriCrossOrigin(withCors: boolean): Promise<void> {
    const metadata = await fetch('/sri-meta.json').then(
      (response) => response.json() as Promise<{ integrity: string }>,
    );
    const script = document.createElement('script');
    script.src = `http://127.0.0.1:${Number(location.port) + 1}/${withCors ? 'sri-probe.js' : 'sri-no-cors.js'}`;
    script.nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? '';
    script.integrity = metadata.integrity;
    script.crossOrigin = 'anonymous';
    script.onload = () =>
      this.extraMessage.set('Załadowano cross-origin; sprawdź odpowiedź CORS i wynik SRI.');
    script.onerror = () =>
      this.extraMessage.set('Odrzucono zasób; sprawdź CORS, digest i Console.');
    document.head.append(script);
  }

  async probeCacheNonce(mismatch: boolean): Promise<void> {
    const url = `/cache-document?variant=${mismatch ? 'mismatch' : 'unchanged'}`;
    const first = await fetch(url, { cache: 'no-store' });
    const body = await first.text();
    const etag = first.headers.get('etag') ?? '';
    const second = await fetch(url, { cache: 'no-store', headers: { 'If-None-Match': etag } });
    const original = first.headers.get('content-security-policy');
    const update = second.headers.get('content-security-policy');
    const nonce = body.match(/nonce="([^"]+)"/)?.[1] ?? '';
    this.extraMessage.set(
      `HTML ${first.status}, rewalidacja ${second.status}; nonce HTML=${nonce}; CSP 200=${original}; CSP 304=${update ?? '(nie zmieniono)'}. ${update && !update.includes(nonce) ? 'Nonce w CSP 304 nie pasuje do buforowanego HTML.' : 'Brak niezgodnej zmiany CSP.'}`,
    );
  }
}
