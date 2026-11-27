import { Component, ElementRef, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const cmsFixture = {
  id: 'article-104',
  author: 'Redakcja',
  title: 'Przewodnik po ogrodzie',
  // Fikcyjna odpowiedź API: wymagane formatowanie i niebezpieczny atrybut.
  body: '<p>Wiosenne prace: <strong>przygotuj grządki</strong>.</p><img src="/missing-cms-image" onerror="this.closest(\'article\').querySelector(\'[data-xss-proof]\').textContent = \'Kod z treści CMS zmienił stronę.\'">',
};

@Component({
  selector: 'app-xss-shell',
  standalone: true,
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-900">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-6xl px-5 py-6">
          <nav><a href="/resource-url" class="text-indigo-700 underline">Link i osadzony zasób</a></nav>
          <p class="text-xs font-semibold uppercase tracking-widest text-indigo-700">Angular security lab · L0.1</p>
          <h1 class="mt-1 text-2xl font-bold">Treść CMS i granice renderowania</h1>
          <p class="mt-2 max-w-3xl text-sm text-slate-600">Porównaj, jak ta sama odpowiedź API zachowuje się jako tekst, HTML sanitizowany przez Angulara, zapis do natywnego DOM i wartość jawnie oznaczona jako zaufana.</p>
        </div>
      </header>

      <div class="mx-auto grid max-w-6xl gap-8 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="min-w-0 space-y-8">
          <section aria-labelledby="source-title" class="space-y-3">
            <h2 id="source-title" class="text-lg font-semibold">1. Źródło: odpowiedź API z CMS</h2>
            <p class="text-sm text-slate-600">Artykuł <strong>{{ article.title }}</strong>, autor: {{ article.author }} (ID <code>{{ article.id }}</code>), pochodzi z lokalnej atrapy odpowiedzi API. Pole <code>body</code> zawiera formatowanie potrzebne stronie oraz handler zdarzenia dodany do obserwacji sinków.</p>
            <pre class="overflow-x-auto rounded-md border border-slate-200 bg-white p-4 text-xs"><code>{{ article.body }}</code></pre>
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" (click)="resetDirectDom()">Wyczyść bezpośredni DOM</button>
              <span class="text-xs text-slate-500">Treść można zmienić w <code>xss-shell.component.ts</code>, w obiekcie <code>cmsFixture</code>.</span>
            </div>
          </section>

          <section aria-labelledby="render-title" class="space-y-4">
            <h2 id="render-title" class="text-lg font-semibold">2. Porównaj cztery miejsca użycia</h2>
            <div class="grid gap-4 md:grid-cols-2">
              <article class="space-y-2 border-t-2 border-slate-300 pt-3">
                <h3 class="font-semibold">Interpolacja · tekst</h3>
                <p class="min-h-14 whitespace-pre-wrap break-words rounded bg-white p-3 text-sm">{{ article.body }}</p>
                <p class="text-xs text-slate-600">Znaczniki są widocznym tekstem; przeglądarka nie parsuje wartości jako HTML.</p>
              </article>

              <article class="space-y-2 border-t-2 border-emerald-500 pt-3">
                <h3 class="font-semibold"><code>[innerHTML]</code> · sanitizacja Angulara</h3>
                <div class="min-h-14 break-words rounded bg-white p-3 text-sm" [innerHTML]="article.body"></div>
                <p class="text-xs text-slate-600">Formatowanie może zostać zachowane, a nieobsługiwany handler usunięty. Sprawdź wynikowy DOM w DevTools.</p>
              </article>

              <article class="space-y-2 border-t-2 border-rose-500 pt-3">
                <h3 class="font-semibold">Bezpośredni DOM · <code>element.innerHTML</code></h3>
                <button type="button" class="rounded-md border border-rose-300 px-3 py-1.5 text-sm hover:bg-rose-50" (click)="writeDirectDom()">Wstaw treść przez natywny DOM</button>
                <div data-direct-sink class="min-h-14 break-words rounded bg-white p-3 text-sm"></div>
                <p data-xss-proof aria-live="polite" class="min-h-5 text-sm font-medium text-rose-800">Obserwuj wynik handlera po wstawieniu treści.</p>
                <p class="text-xs text-slate-600">Ten zapis nie przechodzi przez ochronę szablonu Angulara.</p>
              </article>

              <article class="space-y-2 border-t-2 border-amber-500 pt-3">
                <h3 class="font-semibold">Jawny bypass · <code>bypassSecurityTrustHtml</code></h3>
                <div class="min-h-14 break-words rounded bg-white p-3 text-sm" [innerHTML]="trustedBody"></div>
                <p data-xss-proof aria-live="polite" class="min-h-5 text-sm font-medium text-amber-800">Obserwuj wynik handlera w tym wariancie.</p>
                <p class="text-xs text-slate-600">Angular traktuje tę wartość jako zaufaną. Bypass jej nie sprawdza ani nie oczyszcza.</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="flow-title" class="space-y-3 border-t border-slate-200 pt-5">
            <h2 id="flow-title" class="text-lg font-semibold">3. Prześledź źródło, transformację i sink</h2>
            <ol class="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Znajdź <code>cmsFixture.body</code> w kodzie: odpowiedź z własnego API może nadal zawierać treść kontrolowaną przez redaktora lub integrację.</li>
              <li>Porównaj interpolację z <code>[innerHTML]</code> i sprawdź w DevTools, które elementy oraz atrybuty pozostały.</li>
              <li>Kliknij przycisk bezpośredniego zapisu, a potem porównaj wynik z jawnym bypass. Obserwuj komunikat poniżej sinku.</li>
              <li>Zmień fragment <code>body</code> w kodzie, odśwież aplikację i powtórz obserwacje. Zapis do lokalnej atrapy nie jest sam w sobie stored XSS.</li>
            </ol>
            <p class="text-sm text-slate-700">XSS zachodzi, gdy dane kontrolowane przez atakującego powodują wykonanie kodu w kontekście dokumentu. Sam fakt sparsowania HTML nie dowodzi wykonania; sprawdź rzeczywisty skutek i dokładny sink.</p>
          </section>
        </div>

        <aside class="self-start border-l border-slate-200 pl-5 text-sm text-slate-700">
          <h2 class="font-semibold">Zakres tego wycinka</h2>
          <p class="mt-2">Lab pokazuje ścieżkę CMS → API → Angular/DOM → parser przeglądarki oraz różnicę między sanitizacją i deklaracją zaufania.</p>
          <h3 class="mt-5 font-semibold">TODO — dodatkowe scenariusze</h3>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>HTML zapisany przez autora</li>
            <li>wspólny pipe nadający zaufanie</li>
            <li>zewnętrzny widget zapisujący do DOM</li>
            <li>zmiana treści po sanityzacji</li>
          </ul>
        </aside>
      </div>
    </main>
  `,
  styles: `:host { display: block; min-height: 100vh; } code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }`,
})
export class XssShellComponent {
  readonly article = cmsFixture;
  readonly trustedBody: SafeHtml;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    this.trustedBody = this.sanitizer.bypassSecurityTrustHtml(this.article.body);
  }

  writeDirectDom(): void {
    const sink = this.host.nativeElement.querySelector<HTMLElement>('[data-direct-sink]');
    if (sink) sink.innerHTML = this.article.body;
  }

  resetDirectDom(): void {
    const sink = this.host.nativeElement.querySelector<HTMLElement>('[data-direct-sink]');
    const proof = sink?.closest('article')?.querySelector<HTMLElement>('[data-xss-proof]');
    if (sink) sink.replaceChildren();
    if (proof) proof.textContent = 'Obserwuj wynik handlera po wstawieniu treści.';
  }
}
