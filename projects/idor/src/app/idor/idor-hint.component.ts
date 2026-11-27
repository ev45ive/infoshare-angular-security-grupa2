import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'idor-hint',
  standalone: true,
  imports: [RouterLink],
  host: { style: 'display: block' },
  template: `
    <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">Wskazówka</p>
    <h2 class="mt-2 text-lg font-semibold">Sprawdź autoryzację obiektu</h2>
    <p class="mt-3 text-sm leading-6 text-slate-300">Uwierzytelnienie potwierdza, kim jest użytkownik. Czy serwer sprawdza też, czy ten użytkownik może odczytać dokument o podanym ID?</p>
    <ol class="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-400">
      <li>Zaloguj się jako Alice i odczytaj własny dokument.</li>
      <li>Zanotuj ID dokumentu Boba z danych startowych.</li>
      <li>Podmień ID i porównaj odpowiedź oraz log serwera.</li>
    </ol>
    <a [routerLink]="['/idor', { outlets: { primary: ['solution'], sidebar: ['explanation'] } }]" class="mt-5 inline-block text-sm font-semibold text-cyan-300 underline underline-offset-4">Otwórz rozwiązanie</a>
  `,
})
export class IdorHintComponent {}
