import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmButton } from '@spartan-ng/helm/button';
import { ApiObservation, SiteApiService } from './site-api.service';

@Component({ selector: 'site-lab', standalone: true, imports: [HlmButton], host: { style: 'display: block' }, template: `
  <div class="space-y-6">
    <header><p class="text-sm font-medium text-cyan-300">Scenariusz · do odkrycia</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Czy trzy originy oznaczają trzy witryny?</h1>
      <p class="mt-3 max-w-3xl leading-7 text-slate-300">Zbadaj trzy API na różnych portach oraz pod dwoma nazwami hosta. Ustaw testowe cookies przez bezpośrednie wejście na każde API, wróć do laboratorium i wyślij żądania z credentials.</p></header>
    <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-semibold">1 · Ustaw cookies w kontekście top-level</h2>
      <p class="mt-2 text-sm leading-6 text-slate-400">Każdy link otwiera stronę API, która ustawia cookie i pokazuje link powrotny. Zrób to dla trzech hostów/polityk, potem uruchom inspekcję.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">@for (api of apiService.apis; track api.id) {
        <a [href]="api.base + '/setup'" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-700 p-4 hover:border-cyan-500"><span class="block text-sm font-semibold">{{ api.label }}</span><span class="mt-2 block text-xs text-slate-400">{{ api.cookieName }} · SameSite={{ api.policy }}</span><span class="mt-3 block text-xs text-cyan-300">Otwórz setup ↗</span></a>
      }</div>
    </section>
    <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-semibold">2 · Porównaj żądania</h2><p class="mt-1 text-sm text-slate-400">API pokazuje otrzymane cookies labu oraz nagłówki żądania.</p></div><button hlmBtn (click)="inspectAll()" class="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">Wyślij do 3 API</button></div>
      <div class="mt-4 grid gap-4 xl:grid-cols-3">@for (api of apiService.apis; track api.id) { <article class="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4"><h3 class="font-semibold">{{ api.label }}</h3><p class="mt-1 text-xs text-slate-500">{{ api.base }} · SameSite={{ api.policy }}</p>
        @if (results[api.id]) { <dl class="mt-4 space-y-3 text-xs"><div><dt class="text-slate-500">Cookies labu widziane przez serwer</dt><dd class="mt-1 break-all font-mono text-emerald-300">{{ results[api.id]!.cookieHeader || '(brak cookies labu)' }}</dd></div><div><dt class="text-slate-500">Sec-Fetch-Site</dt><dd class="mt-1 font-mono text-slate-200">{{ results[api.id]!.secFetchSite ?? '(brak)' }}</dd></div><div><dt class="text-slate-500">Origin</dt><dd class="mt-1 break-all font-mono text-slate-200">{{ results[api.id]!.origin ?? '(brak)' }}</dd></div><div><dt class="text-slate-500">CORS na odpowiedzi</dt><dd class="mt-1 font-mono text-slate-200">{{ results[api.id]!.cors.allowOrigin }} · credentials={{ results[api.id]!.cors.allowCredentials }}</dd></div></dl> }
        @if (errors[api.id]) { <p role="alert" class="mt-4 rounded-lg border border-rose-900 bg-rose-950/50 p-3 text-xs leading-5 text-rose-200">{{ errors[api.id] }}</p> }
        @if (!results[api.id] && !errors[api.id]) { <p class="mt-4 text-xs text-slate-500">Oczekuje na żądanie.</p> }
      </article> }</div>
    </section>
    <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-semibold">3 · Pytania</h2><ol class="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-slate-300"><li>Czy zmiana portu zmienia origin? Czy zmienia site?</li><li>Czy cookie zapisane dla localhost:4302 trafia też do localhost:4303?</li><li>Co zmienia host 127.0.0.1 względem localhost?</li><li>Czy brak odpowiedzi w UI oznacza brak cookie, czy może błąd CORS?</li></ol></section>
  </div>
` })
export class SiteLabComponent {
  readonly apiService = inject(SiteApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  results: Record<string, ApiObservation | undefined> = {};
  errors: Record<string, string | undefined> = {};

  inspectAll(): void {
    this.results = {};
    this.errors = {};
    for (const api of this.apiService.apis) {
      this.apiService.inspect(api.base).subscribe({
        next: (result) => { this.results[api.id] = result; this.cdr.markForCheck(); },
        error: (error: HttpErrorResponse) => {
          this.errors[api.id] = error.status === 0
            ? 'Błąd sieci/CORS: przeglądarka nie udostępniła odpowiedzi. To nie dowodzi braku cookie; sprawdź, czy API działa i czy odpowiedź ma poprawne CORS z credentials.'
            : `API odpowiedziało statusem ${error.status}; serwer dotarł do żądania, ale odpowiedź jest błędna.`;
          this.cdr.markForCheck();
        },
      });
    }
  }
}
