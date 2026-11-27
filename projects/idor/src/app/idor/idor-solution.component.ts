import { finalize } from 'rxjs';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { DemoDocument, DemoUser, IdorApiService } from './idor-api.service';

@Component({
  selector: 'idor-solution',
  standalone: true,
  imports: [FormsModule, HlmButton],
  host: { style: 'display: block' },
  template: `
    <div class="space-y-6">
      <div>
        <p class="text-sm font-medium text-emerald-300">Rozwiązanie · kontrola dostępu do obiektu</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">Weryfikuj właściciela po stronie API</h1>
        <p class="mt-3 max-w-3xl leading-7 text-slate-300">Zaloguj się jako Alice i wyślij ten sam identyfikator dokumentu do endpointu chronionego. Własny dokument jest dostępny, cudzy zwraca 404.</p>
      </div>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 class="font-semibold">Sesja testowa</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <button hlmBtn variant="secondary" (click)="login('alice')" class="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">Zaloguj jako Alice</button>
          <button hlmBtn variant="outline" (click)="login('bob')" class="rounded-lg bg-slate-700 px-4 py-2 font-semibold">Zaloguj jako Bob</button>
          <button hlmBtn variant="outline" (click)="logout()" class="rounded-lg border border-slate-700 px-4 py-2">Wyloguj</button>
        </div>
        <p class="mt-3 text-sm text-slate-300">Sesja: <strong>{{ user?.name ?? 'brak' }}</strong></p>
      </section>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label for="solution-id" class="block text-sm font-medium">Identyfikator dokumentu</label>
        <div class="mt-2 flex flex-wrap gap-3">
          <input id="solution-id" [(ngModel)]="documentId" class="min-w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-400">
          <button hlmBtn variant="secondary" (click)="readDocument()" [disabled]="!user" class="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Pobierz przez chroniony endpoint</button>
        </div>
        <p class="mt-3 text-xs text-slate-500">Żądanie: <code>GET /api/solution/documents/{{ documentId || ':id' }}</code></p>
      </section>
      @if (error) { <p role="alert" class="rounded-lg border border-rose-900 bg-rose-950/60 p-4 text-rose-200">{{ error }}</p> }
      @if (result) {
        <article class="rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-emerald-300">Odpowiedź API · {{ result.id }}</p>
          <h2 class="mt-2 text-xl font-semibold">{{ result.title }}</h2>
          <p class="mt-2 text-sm text-slate-200">Właściciel: {{ result.ownerName }}</p>
          <p class="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{{ result.body }}</p>
        </article>
      }
    </div>
  `,
})
export class IdorSolutionComponent implements OnInit {
  private readonly api = inject(IdorApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  user: DemoUser | null = null;
  documentId = 'DOC-1001';
  result: DemoDocument | null = null;
  error = '';

  ngOnInit(): void { this.api.me().pipe(finalize(() => this.cdr.markForCheck())).subscribe({ next: (user) => this.user = user, error: () => {} }); }
  login(userId: string): void { this.clearResult(); this.api.login(userId).pipe(finalize(() => this.cdr.markForCheck())).subscribe({ next: (user) => this.user = user, error: () => this.error = 'Nie udało się utworzyć sesji.' }); }
  logout(): void { this.api.logout().pipe(finalize(() => this.cdr.markForCheck())).subscribe({ next: () => { this.user = null; this.clearResult(); }, error: () => this.error = 'Nie udało się zakończyć sesji.' }); }
  readDocument(): void { this.clearResult(); this.api.readProtected(this.documentId.trim()).pipe(finalize(() => this.cdr.markForCheck())).subscribe({ next: (doc) => this.result = doc, error: (e: { error?: { error?: string } }) => this.error = e.error?.error ?? 'Żądanie nie powiodło się.' }); }
  private clearResult(): void { this.result = null; this.error = ''; }
}

