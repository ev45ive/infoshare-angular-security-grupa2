import { Component, SecurityContext, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

type Payload = { content: string; clobbering: string };

@Component({
  selector: 'rich-text-progression',
  imports: [RouterLink],
  template: `
    <a routerLink="/">Eksperymenty</a>
    <h1>Od tekstu z API do DOM clobberingu</h1>
    <p>Jedna odpowiedź API, kolejne decyzje dotyczące renderowania i ich skutki.</p>
    <button type="button" (click)="load()">Pobierz treść z API</button>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (payload(); as data) {
      <p>API: <code>GET http://localhost:4304/rich-text</code></p>
      <nav aria-label="Etapy eksperymentu">
        @for (item of steps; track $index) {
          <button type="button" (click)="select($index)" [attr.aria-current]="step() === $index ? 'step' : null">{{ $index + 1 }}. {{ item.title }}</button>
        }
      </nav>
      <h2>{{ step() + 1 }}. {{ steps[step()].title }}</h2>
      <p><strong>Oczekiwanie:</strong> {{ steps[step()].expectation }}</p>
      <p><strong>Sprawdź:</strong> {{ steps[step()].check }}</p>
      <p><strong>Wpływ:</strong> {{ steps[step()].impact }}</p>
      <p><strong>Kod:</strong> <code>{{ steps[step()].code }}</code></p>
      <h3>Wynik renderowania</h3>
      @switch (step()) {
        @case (0) { <pre>{{ data.content }}</pre> }
        @case (1) { <div>{{ data.content }}</div> }
        @case (2) { <div [innerHTML]="data.content"></div> }
        @case (3) { <div [innerHTML]="sanitized()"></div><h3>Wynik sanitize(HTML)</h3><pre>{{ sanitized() }}</pre> }
        @case (4) { <div [innerHTML]="trustedContent()"></div> }
        @case (5) {
          <p>Przełącz renderowanie komentarza z API:</p>
          <button type="button" (click)="useBypass.set(false); probe.set('')">Angular [innerHTML]</button>
          <button type="button" (click)="useBypass.set(true); probe.set('')">bypassSecurityTrustHtml</button>
          <p>Wybrano: {{ useBypass() ? 'bypass' : 'sanitizację Angulara' }}</p>
          @if (useBypass()) { <div [innerHTML]="trustedClobbering()"></div> }
          @else { <div [innerHTML]="data.clobbering"></div> }
          <pre>{{ data.clobbering }}</pre>
          <button type="button" (click)="inspect()">Sprawdź window.config</button>
          @if (probe()) { <pre>{{ probe() }}</pre> }
          <p>Wartość trafia do <code>script.src</code>, ale skrypt nie jest dołączany do dokumentu.</p>
        }
      }
    }
  `,
})
export class RichTextProgression {
  private readonly sanitizer = inject(DomSanitizer);
  readonly payload = signal<Payload | null>(null);
  readonly error = signal('');
  readonly step = signal(0);
  readonly useBypass = signal(false);
  readonly probe = signal('');
  readonly steps = [
    { title: 'Tekst z API', expectation: 'Odczytać zawartość odpowiedzi jako tekst.', check: 'Widzisz źródłowy ciąg ze znacznikami.', impact: 'Tekst jest czytelny jako dane, ale nie jest sformatowany.', code: '<pre>{{ content }}</pre>' },
    { title: 'Interpolacja', expectation: 'Wyświetlić HTML z API jako sformatowaną treść.', check: 'Znaczniki nadal są widoczne jako tekst: interpolacja ich nie interpretuje.', impact: 'Przeglądarka nie tworzy elementów z danych, ale formatowanie nie działa.', code: '<div>{{ content }}</div>' },
    { title: '[innerHTML]', expectation: 'Przeglądarka wyrenderuje znaczniki z API.', check: 'Pogrubienie i link działają; sprawdź w DevTools, czy zachowano id, name i onclick.', impact: 'Angular sanitizuje niezaufany HTML; część funkcji treści może zniknąć.', code: '<div [innerHTML]="content"></div>' },
    { title: 'Jawne sanitize', expectation: 'Przygotować HTML przed renderowaniem.', check: 'Porównaj wynik sanitize(HTML) z poprzednim etapem: które atrybuty zniknęły?', impact: 'To nadal sanitizacja Angulara, a nie sposób na zachowanie id i name.', code: 'sanitizer.sanitize(SecurityContext.HTML, content)' },
    { title: 'Bypass', expectation: 'Przywrócić atrybuty potrzebne treści.', check: 'Sprawdź id, name i onclick w DOM; kliknij link i zobacz zmianę tekstu.', impact: 'Formatowanie i atrybuty wracają, ale Angular ufa całemu HTML z API, także kodowi w atrybutach.', code: '[innerHTML]="sanitizer.bypassSecurityTrustHtml(content)"' },
    { title: 'Edge case: DOM clobbering', expectation: 'Treść wygląda jak komentarz, a aplikacja używa window.config lub wartości domyślnej.', check: 'Porównaj obie opcje i uruchom sprawdzenie window.config dla każdej.', impact: 'Przy bypass treść może zmienić sposób rozstrzygnięcia konfiguracji i adres script.src; sanitizacja usuwa id i name w tym przykładzie.', code: 'const config = window.config || { url: "/static/app.js" }; script.src = config.url;' },
  ];

  async load(): Promise<void> {
    this.error.set('');
    try {
      const response = await fetch('http://localhost:4304/rich-text');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.payload.set(await response.json() as Payload);
    } catch (error) {
      this.error.set(`Nie udało się pobrać treści: ${String(error)}`);
    }
  }

  select(step: number): void { this.step.set(step); this.probe.set(''); }
  sanitized(): string { return this.sanitizer.sanitize(SecurityContext.HTML, this.payload()?.content ?? '') ?? ''; }
  trustedContent(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(this.payload()?.content ?? ''); }
  trustedClobbering(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(this.payload()?.clobbering ?? ''); }

  inspect(): void {
    const config = Reflect.get(window, 'config') || { url: '/static/app.js' };
    const url = Reflect.get(config, 'url');
    const script = document.createElement('script');
    script.src = url;
    this.probe.set(JSON.stringify({
      configType: Object.prototype.toString.call(config),
      configLength: Object.prototype.toString.call(config) === '[object HTMLCollection]' ? config.length : null,
      urlType: Object.prototype.toString.call(url),
      urlString: String(url),
      scriptSrc: script.src,
    }, null, 2));
  }
}
