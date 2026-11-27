import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'site-hint', standalone: true, imports: [RouterLink], host: { style: 'display: block' }, template: `
  <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">Wskazówka</p><h2 class="mt-2 text-lg font-semibold">Origin i site to różne pojęcia</h2>
  <p class="mt-3 text-sm leading-6 text-slate-300">Porównaj pełny origin (schemat, host, port) z pojęciem site używanym przez SameSite. Następnie sprawdź jakie wartości naprawdę dotarły do serwera.</p>
  <ol class="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-400"><li>Otwórz po kolei każdy link setup.</li><li>Porównaj API A i B, które mają localhost, ale różne porty.</li><li>Porównaj wynik dla 127.0.0.1.</li><li>Oddziel błąd CORS od prawidłowej odpowiedzi z pustym Cookie.</li></ol>
  <a [routerLink]="['/site', { outlets: { primary: ['solution'], sidebar: ['explanation'] } }]" class="mt-5 inline-block text-sm font-semibold text-cyan-300 underline underline-offset-4">Otwórz rozwiązanie</a>
` })
export class SiteHintComponent {}
