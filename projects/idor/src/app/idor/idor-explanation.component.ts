import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'idor-explanation',
  standalone: true,
  imports: [RouterLink],
  host: { style: 'display: block' },
  template: `
    <p class="text-xs font-semibold uppercase tracking-widest text-emerald-300">Wyjaśnienie</p>
    <h2 class="mt-2 text-lg font-semibold">ID dokumentu nie jest uprawnieniem</h2>
    <p class="mt-3 text-sm leading-6 text-slate-300">Podatny endpoint pobiera dokument po ID, ale pomija sprawdzenie właściciela. Poprawiony endpoint wiąże zasób z principalem sesji po stronie serwera.</p>
    <div class="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-300">document = findById(id)<br>if (!document || document.ownerId !== session.userId) return 404</div>
    <p class="mt-4 text-sm leading-6 text-slate-400">Ukrywanie lub losowanie ID nie zastępuje autoryzacji. W praktycznej aplikacji ten sam warunek powinien obejmować odczyt, zmianę, usuwanie, eksport i wszystkie inne ścieżki dostępu.</p>
    <p class="mt-4 text-xs leading-5 text-slate-500">Demo mapuje lokalne cookie sesyjne na fikcyjnych użytkowników. Nie implementuje produkcyjnego logowania, ochrony CSRF, trwałego magazynu ani pełnej obsługi ról.</p>
    <a [routerLink]="['/idor', { outlets: { primary: ['lab'], sidebar: ['hint'] } }]" class="mt-5 inline-block text-sm font-semibold text-cyan-300 underline underline-offset-4">Wróć do scenariusza</a>
  `,
})
export class IdorExplanationComponent {}
