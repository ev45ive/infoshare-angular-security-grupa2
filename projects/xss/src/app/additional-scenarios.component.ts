import { Component, ElementRef, Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const payload = `<p>Wiadomość z <strong>formatowaniem</strong>.</p><img src="/missing-lab-image" onerror="this.closest('section').querySelector('[data-proof]').textContent='Handler wykonał się w dokumencie.'">`;
const storageKey = 'angular-xss-lab-author-html';

// Wspólny pipe może ukryć decyzję o zaufaniu przed wszystkimi wywołującymi.
@Pipe({ name: 'trustHtml' })
export class TrustHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(value); }
}

// Lokalna atrapa integracji z widgetem, który sam obsługuje swój element DOM.
function renderWidget(container: HTMLElement, html: string): void {
  container.innerHTML = html;
}

@Component({
  selector: 'app-additional-scenarios',
  imports: [FormsModule, TrustHtmlPipe],
  template: `
    <div class="space-y-8 border-t border-slate-200 pt-6">
      <h2 class="text-xl font-bold">Dodatkowe scenariusze</h2>
      <section id="stored" class="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h3 class="font-semibold">4. HTML zapisany przez autora</h3>
        <p class="text-sm">Autor zapisuje HTML w lokalnym magazynie przeglądarki. Odczyt następuje także po odświeżeniu; porównaj niebezpieczny sink z bindingiem Angulara.</p>
        <label for="stored-input" class="block text-sm font-medium">Treść autora</label>
        <textarea id="stored-input" [(ngModel)]="authorInput" class="min-h-24 w-full rounded border p-2 font-mono text-xs"></textarea>
        <div class="flex flex-wrap gap-2"><button type="button" (click)="save()" class="rounded bg-slate-900 px-3 py-2 text-sm text-white">Zapisz</button><button type="button" (click)="renderStored()" class="rounded border px-3 py-2 text-sm">Odczytaj i wstaw do DOM</button><button type="button" (click)="clearStored()" class="rounded border px-3 py-2 text-sm">Usuń zapis</button></div>
        <p class="text-sm">Zapisana wartość: <code class="break-all">{{ stored || '(brak)' }}</code></p>
        <div class="grid gap-3 md:grid-cols-2"><div><h4 class="text-sm font-semibold">Natywne innerHTML</h4><div data-stored-sink class="min-h-10 rounded bg-rose-50 p-2"></div></div><div><h4 class="text-sm font-semibold">Angular [innerHTML]</h4><div [innerHTML]="stored" class="min-h-10 rounded bg-emerald-50 p-2"></div></div></div>
        <p data-proof aria-live="polite" class="text-sm font-medium text-rose-800">Oczekiwanie na wykonanie handlera.</p>
      </section>

      <section id="pipe" class="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h3 class="font-semibold">5. Wspólny pipe nadający zaufanie</h3>
        <p class="text-sm">Ten sam tekst trafia do zwykłego bindingu oraz do bindingu z pipe, który wywołuje <code>bypassSecurityTrustHtml</code>.</p>
        <label for="pipe-input" class="block text-sm font-medium">Treść</label><textarea id="pipe-input" [(ngModel)]="pipeInput" class="min-h-24 w-full rounded border p-2 font-mono text-xs"></textarea>
        <button type="button" (click)="pipeValue = pipeInput" class="rounded border px-3 py-2 text-sm">Renderuj oba warianty</button>
        <div class="grid gap-3 md:grid-cols-2"><div><h4 class="text-sm font-semibold">Zwykły binding</h4><div [innerHTML]="pipeValue" class="min-h-10 rounded bg-emerald-50 p-2"></div></div><div><h4 class="text-sm font-semibold">Binding z trustHtml</h4><div [innerHTML]="pipeValue | trustHtml" class="min-h-10 rounded bg-rose-50 p-2"></div></div></div>
        <p data-proof aria-live="polite" class="text-sm font-medium text-rose-800">Oczekiwanie na wykonanie handlera.</p>
      </section>

      <section id="widget" class="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h3 class="font-semibold">6. Widget zapisujący do DOM</h3>
        <p class="text-sm">Lokalna atrapa zewnętrznego widgetu przypisuje przekazany HTML do własnego elementu. Porównaj surowe dane z wariantem oczyszczonym przed przekazaniem do widgetu.</p>
        <label for="widget-input" class="block text-sm font-medium">Treść widgetu</label><textarea id="widget-input" [(ngModel)]="widgetInput" class="min-h-24 w-full rounded border p-2 font-mono text-xs"></textarea>
        <div class="flex gap-2"><button type="button" (click)="renderWidget(false)" class="rounded border px-3 py-2 text-sm">Przekaż surową treść</button><button type="button" (click)="renderWidget(true)" class="rounded border px-3 py-2 text-sm">Oczyść i przekaż</button></div>
        <div data-widget-sink class="min-h-10 rounded bg-slate-50 p-2"></div><p data-proof aria-live="polite" class="text-sm font-medium text-rose-800">Oczekiwanie na wykonanie handlera.</p>
      </section>

      <section id="mutation" class="space-y-3 rounded border border-slate-200 bg-white p-4">
        <h3 class="font-semibold">7. Zmiana treści po sanityzacji</h3>
        <p class="text-sm">Najpierw oczyść bazowy HTML. Następnie dołącz nową treść: porównaj zapis do DOM bez ponownej sanityzacji z oczyszczeniem całego wyniku po połączeniu.</p>
        <label for="mutation-input" class="block text-sm font-medium">Fragment dodany po sanityzacji</label><textarea id="mutation-input" [(ngModel)]="mutationInput" class="min-h-24 w-full rounded border p-2 font-mono text-xs"></textarea>
        <div class="flex gap-2"><button type="button" (click)="renderMutation(false)" class="rounded border px-3 py-2 text-sm">Wstaw po połączeniu</button><button type="button" (click)="renderMutation(true)" class="rounded border px-3 py-2 text-sm">Oczyść całość i wstaw</button></div>
        <div data-mutation-sink class="min-h-10 rounded bg-slate-50 p-2"></div><p data-proof aria-live="polite" class="text-sm font-medium text-rose-800">Oczekiwanie na wykonanie handlera.</p>
      </section>
    </div>
  `,
})
export class AdditionalScenariosComponent {
  authorInput = payload;
  stored = localStorage.getItem(storageKey) ?? '';
  pipeInput = payload;
  pipeValue = '';
  widgetInput = payload;
  mutationInput = payload;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  save(): void { localStorage.setItem(storageKey, this.authorInput); this.stored = this.authorInput; }
  clearStored(): void { localStorage.removeItem(storageKey); this.stored = ''; this.sink('[data-stored-sink]').replaceChildren(); this.resetProof('stored'); }
  renderStored(): void { this.resetProof('stored'); this.sink('[data-stored-sink]').innerHTML = this.stored; }
  renderWidget(clean: boolean): void {
    this.resetProof('widget');
    renderWidget(this.sink('[data-widget-sink]'), clean ? this.clean(this.widgetInput) : this.widgetInput);
  }
  renderMutation(clean: boolean): void {
    this.resetProof('mutation');
    const combined = this.clean('<p>Wcześniej oczyszczony <strong>artykuł</strong>.</p>') + this.mutationInput;
    this.sink('[data-mutation-sink]').innerHTML = clean ? this.clean(combined) : combined;
  }
  private clean(value: string): string { return this.sanitizer.sanitize(SecurityContext.HTML, value) ?? ''; }
  private sink(selector: string): HTMLElement { return this.host.nativeElement.querySelector<HTMLElement>(selector)!; }
  private resetProof(id: string): void { this.sink(`#${id} [data-proof]`).textContent = 'Oczekiwanie na wykonanie handlera.'; }
}
