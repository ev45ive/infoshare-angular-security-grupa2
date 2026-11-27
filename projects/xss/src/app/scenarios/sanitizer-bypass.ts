import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';

const demoPayload = `<img src=x onerror="document.querySelector('#bypass-proof').textContent='XSS executed: trusted HTML ran'">`;

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <p class="text-sm font-semibold uppercase tracking-wide text-rose-700">Scenariusz 2 · jawne zaufanie</p>
    <h2 class="mt-2 text-2xl font-bold">Czy „zaufane” oznacza „bezpieczne”?</h2>
    <p class="mt-3 text-slate-700">Angular domyślnie sanityzuje HTML. Poniższa aplikacja oznacza jednak niezaufaną treść jako zaufaną przez <code>bypassSecurityTrustHtml</code>.</p>
    <label class="mt-6 block text-sm font-semibold" for="bypass-payload">Treść komentarza</label>
    <textarea id="bypass-payload" class="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" [ngModel]="comment" (ngModelChange)="updateComment($event)"></textarea>
    <div class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <h3 class="font-semibold">Podatne wiązanie z pominiętą sanityzacją</h3>
      <div class="mt-3 min-h-10 break-words rounded bg-white p-2" [innerHTML]="trustedComment"></div>
      <p id="bypass-proof" aria-live="polite" class="mt-2 text-sm font-semibold text-rose-800">Dowód wykonania pojawi się tutaj.</p>
    </div>
    <p class="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Uwaga:</strong> przykład jest celowo podatny i przeznaczony wyłącznie do lokalnego laboratorium.</p>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class BypassLabComponent {
  comment = demoPayload;
  trustedComment: SafeHtml;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.trustedComment = this.sanitizer.bypassSecurityTrustHtml(this.comment);
  }

  updateComment(comment: string): void {
    this.comment = comment;
    this.trustedComment = this.sanitizer.bypassSecurityTrustHtml(this.comment);
  }
}

@Component({
  standalone: true,
  imports: [HlmButton, RouterLink],
  template: `
    <h2 class="text-lg font-bold">Wskazówka · jawne zaufanie</h2>
    <p class="mt-3 text-sm text-slate-700">Sprawdź, czy metoda <code>bypassSecurityTrustHtml</code> oczyszcza treść, czy tylko deklaruje ją jako zaufaną dla Angulara.</p>
    <p class="mt-3 text-sm text-slate-700">Porównaj działanie z poprzednim scenariuszem i sprawdź typ zwracany przez API.</p>
    <a hlmBtn class="mt-5" [routerLink]="solutionLink">Otwórz rozwiązanie</a>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class BypassHintComponent {
  readonly solutionLink = ['/xss', { outlets: { primary: ['bypass-solution'], hint: ['bypass-solution-hint'] } }];
}

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <p class="text-sm font-semibold uppercase tracking-wide text-emerald-700">Rozwiązanie · jawne zaufanie</p>
    <h2 class="mt-2 text-2xl font-bold">Nie oznaczaj danych wejściowych jako zaufanych</h2>
    <p class="mt-3 text-slate-700">Dla zwykłego HTML użyj standardowego wiązania Angulara, które zachowuje sanityzację. Jeśli aplikacja musi renderować ograniczony HTML, najpierw oczyść go sprawdzonym sanitizerem z allowlistą, dopasowaną do wymagań produktu.</p>
    <label class="mt-6 block text-sm font-semibold" for="safe-bypass-payload">Ta sama treść testowa</label>
    <textarea id="safe-bypass-payload" class="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" [(ngModel)]="comment"></textarea>
    <section class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 class="font-semibold">Sanityzowane wiązanie</h3>
      <div class="mt-3 min-h-10 break-words rounded bg-white p-2" [innerHTML]="comment"></div>
      <p class="mt-2 text-xs text-slate-600">Nie ma zaufanego obejścia ani bezpośredniego zapisu do DOM.</p>
    </section>
  `,
  styles: `:host { display: block; }`,
})
export class BypassSolutionComponent {
  comment = demoPayload;
}

@Component({
  standalone: true,
  template: `
    <h2 class="text-lg font-bold">Wyjaśnienie rozwiązania</h2>
    <p class="mt-3 text-sm text-slate-700"><code>bypassSecurityTrustHtml</code> nie sanityzuje wartości. Oznacza ją jako zaufaną i wyłącza kontrolę Angulara w tym miejscu.</p>
    <p class="mt-3 text-sm text-slate-700">Używaj obejść wyłącznie dla treści, której bezpieczeństwo zostało zapewnione niezależnie i jest utrzymywane. Zwykły tekst wyświetlaj przez interpolację; ograniczony HTML przez domyślną sanityzację lub zaufany sanitizer z allowlistą.</p>
  `,
  styles: `:host { display: block; } code { font-family: ui-monospace, monospace; }`,
})
export class BypassSolutionHintComponent {}
