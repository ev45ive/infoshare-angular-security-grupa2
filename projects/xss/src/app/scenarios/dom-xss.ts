import { Component, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';

const demoPayload = `<img src=x onerror="document.querySelector('#dom-xss-proof').textContent='XSS executed: DOM was changed'">`;

@Component({
  standalone: true,
  imports: [FormsModule, HlmButton],
  template: `
    <p class="text-sm font-semibold uppercase tracking-wide text-rose-700">Scenariusz 1 · DOM-based XSS</p>
    <h2 class="mt-2 text-2xl font-bold">Dane z formularza trafiają do natywnego DOM API</h2>
    <p class="mt-3 max-w-3xl text-slate-700">Porównaj interpolację Angulara z bezpośrednim przypisaniem do <code>innerHTML</code>. Wpis jest lokalny; nic nie jest wysyłane do serwera.</p>
    <label class="mt-6 block text-sm font-semibold" for="dom-payload">Treść komentarza</label>
    <textarea id="dom-payload" class="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" [(ngModel)]="comment"></textarea>
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 p-4">
        <h3 class="font-semibold">Interpolacja Angulara</h3>
        <p class="mt-2 whitespace-pre-wrap break-words">{{ comment }}</p>
        <p class="mt-3 text-xs text-slate-500">Znaczniki są wyświetlone jako tekst.</p>
      </section>
      <section class="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h3 class="font-semibold">Natywne <code>innerHTML</code> (podatny sink)</h3>
        <button hlmBtn type="button" variant="destructive" class="mt-2" (click)="renderUnsafe()">Wstaw bezpośrednio</button>
        <div data-vulnerable-sink class="mt-3 min-h-10 break-words rounded bg-white p-2"></div>
        <p id="dom-xss-proof" aria-live="polite" class="mt-2 text-sm font-semibold text-rose-800">Dowód wykonania pojawi się tutaj.</p>
      </section>
    </div>
    <p class="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Uwaga:</strong> to celowo podatny przykład. Używaj wyłącznie lokalnie i nie wklejaj danych z zewnętrznych źródeł.</p>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class DomLabComponent {
  comment = demoPayload;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  renderUnsafe(): void {
    const sink = this.host.nativeElement.querySelector<HTMLElement>('[data-vulnerable-sink]');
    if (sink) sink.innerHTML = this.comment;
  }
}

@Component({
  standalone: true,
  imports: [HlmButton, RouterLink],
  template: `
    <h2 class="text-lg font-bold">Wskazówka · DOM-based XSS</h2>
    <p class="mt-3 text-sm text-slate-700">Znajdź przepływ od danych kontrolowanych przez użytkownika do operacji, która interpretuje je jako HTML. Czy Angular może sanityzować zapis wykonany bezpośrednio na elemencie DOM?</p>
    <ul class="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
      <li>Porównaj tekst komentarza i wynik w obu polach.</li>
      <li>W DevTools sprawdź element obrazu i jego atrybuty.</li>
      <li>Odszukaj linię, która zapisuje wartość do DOM.</li>
    </ul>
    <a hlmBtn class="mt-5" [routerLink]="solutionLink">Otwórz rozwiązanie</a>
  `,
  styles: `:host { display: block; }`,
})
export class DomHintComponent {
  readonly solutionLink = ['/xss', { outlets: { primary: ['dom-solution'], hint: ['dom-solution-hint'] } }];
}

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">Rozwiązanie · DOM-based XSS</p>
    <h2 class="mt-2 text-2xl font-bold">Renderuj dane przez mechanizmy Angulara</h2>
    <p class="mt-3 text-slate-700">Usuń imperatywny zapis do <code>innerHTML</code>. Interpolacja traktuje dane jako tekst; wiązanie HTML zachowuje potrzebne formatowanie, stosując kontekstową sanityzację Angulara.</p>
    <label class="mt-6 block text-sm font-semibold" for="safe-dom-payload">Ta sama treść testowa</label>
    <textarea id="safe-dom-payload" class="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" [(ngModel)]="comment"></textarea>
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 p-4">
        <h3 class="font-semibold">Zalecane: interpolacja</h3>
        <p class="mt-2 whitespace-pre-wrap break-words">{{ comment }}</p>
      </section>
      <section class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 class="font-semibold">Gdy wymagany jest HTML: wiązanie Angulara</h3>
        <div class="mt-2 min-h-10 break-words rounded bg-white p-2" [innerHTML]="comment"></div>
        <p class="mt-2 text-xs text-slate-600">W DevTools sprawdź, że obsługa zdarzenia została usunięta.</p>
      </section>
    </div>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class DomSolutionComponent {
  comment = demoPayload;
}

@Component({
  standalone: true,
  template: `
    <h2 class="text-lg font-bold">Wyjaśnienie rozwiązania</h2>
    <p class="mt-3 text-sm text-slate-700">Bezpośrednie DOM API omija typowy przepływ szablonu Angulara i jego ochronę. Interpolacja jest właściwa dla tekstu; <code>[innerHTML]</code> sanityzuje HTML w odpowiednim kontekście.</p>
    <p class="mt-3 text-sm text-slate-700">Sanityzacja nie zastępuje walidacji ani nie czyni każdego kontekstu bezpiecznym. Unikaj ręcznego budowania HTML i nie używaj API <code>bypassSecurityTrust…</code> dla danych niezaufanych.</p>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class DomSolutionHintComponent {}
