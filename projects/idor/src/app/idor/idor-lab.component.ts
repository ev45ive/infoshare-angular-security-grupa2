import { finalize } from 'rxjs';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemoDocument, DemoUser, IdorApiService } from './idor-api.service';

@Component({
  selector: 'idor-lab',
  standalone: true,
  imports: [FormsModule],
  host: { style: 'display: block' },
  template: `
    <div class="min-h-screen bg-slate-950">
    <main class="mx-auto max-w-5xl space-y-8 px-6 py-8 text-slate-100">
      <header class="space-y-3">
        <p class="text-sm font-medium text-cyan-300">Lab · autoryzacja API</p>
        <h1 class="text-3xl font-semibold tracking-tight">Dokumenty użytkowników</h1>
        <p class="max-w-3xl leading-7 text-slate-300">Portal pokazuje dokumenty bieżącego tenantu. Porównaj ograniczenie widoku w Angularze z decyzją API: identyfikator obiektu pochodzi z żądania klienta, a dostęp do niego rozstrzyga serwer.</p>
      </header>

      <section class="space-y-3 border-t border-slate-800 pt-6">
        <h2 class="text-lg font-semibold">1. Zaloguj się i obejrzyj listę</h2>
        <p class="text-sm leading-6 text-slate-400">Użyj dwóch fikcyjnych kont. Alice należy do tenantu north, Bob do south. Lista jest ograniczona do tenantu; szczegół dokumentu dodatkowo wymaga uprawnienia właściciela.</p>
        <div class="flex flex-wrap gap-3">
          <button type="button" (click)="login('alice')" class="rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950">Alice</button>
          <button type="button" (click)="login('bob')" class="rounded-md bg-slate-700 px-4 py-2 font-semibold">Bob</button>
          <button type="button" (click)="logout()" class="rounded-md border border-slate-700 px-4 py-2">Wyloguj</button>
          <p class="self-center text-sm text-slate-300">Sesja: <strong>{{ user?.name ?? 'brak' }}</strong></p>
        </div>
        <ul class="space-y-2" aria-label="Dokumenty widoczne dla użytkownika">
          @for (doc of documents; track doc.id) {
            <li><button type="button" (click)="documentId = doc.id; readFromUi()" class="text-left text-cyan-300 underline underline-offset-4">{{ doc.title }} · {{ doc.id }}</button></li>
          } @empty {
            <li class="text-sm text-slate-500">Zaloguj się, aby pobrać listę.</li>
          }
        </ul>
      </section>

      <section class="space-y-3 border-t border-slate-800 pt-6">
        <h2 class="text-lg font-semibold">2. Porównaj kontrolę interfejsu z żądaniem do API</h2>
        <p class="text-sm leading-6 text-slate-400">Wpisz <code>DOC-2001</code>, identyfikator dokumentu Boba. Pierwsza akcja stosuje kontrolę w UI i nie wysyła żądania, jeśli dokumentu nie ma na pobranej liście. Druga wysyła ten sam identyfikator bez tej kontroli klienta do endpointu API.</p>
        <label for="document-id" class="block text-sm font-medium">Identyfikator dokumentu</label>
        <input id="document-id" [(ngModel)]="documentId" class="w-full max-w-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm" placeholder="np. DOC-1001">
        <div class="flex flex-wrap gap-3">
          <button type="button" (click)="readFromUi()" [disabled]="!user" class="rounded-md bg-slate-700 px-4 py-2 font-semibold disabled:opacity-40">Otwórz z kontrolą UI</button>
          <button type="button" (click)="readDirectly()" [disabled]="!user" class="rounded-md bg-amber-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Wyślij do API</button>
        </div>
        <p class="text-xs text-slate-500">Obserwuj Network i log API. Kontrola UI jest w <code>readFromUi()</code>; endpointy: <code>GET /api/documents/:id</code> i <code>GET /api/solution/documents/:id</code>.</p>
      </section>

      <section class="space-y-3 border-t border-slate-800 pt-6">
        <h2 class="text-lg font-semibold">3. Porównaj odpowiedź chronionego API</h2>
        <p class="text-sm leading-6 text-slate-400">Zachowaj ten sam identyfikator i wyślij go do endpointu, który sprawdza właściciela dokumentu względem użytkownika z sesji.</p>
        <button type="button" (click)="readProtected()" [disabled]="!user" class="rounded-md bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Wyślij do chronionego API</button>
        <button type="button" (click)="editProtected()" [disabled]="!user" class="rounded-md bg-indigo-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">PATCH · operacja edit</button>
        <p class="text-xs text-slate-500">Żądanie: <code>GET /api/solution/documents/{{ documentId || ':id' }}</code></p>
      </section>

      @if (message) { <p role="status" class="border-l-2 border-cyan-500 pl-3 text-sm text-cyan-100">{{ message }}</p> }
      @if (error) { <p role="alert" class="border-l-2 border-rose-500 pl-3 text-sm text-rose-200">{{ error }}</p> }
      @if (result) {
        <article class="space-y-2 border-t border-slate-800 pt-6">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">Treść odpowiedzi API · {{ result.id }}</p>
          <h2 class="text-xl font-semibold">{{ result.title }}</h2>
          <p class="text-sm text-slate-400">Właściciel: {{ result.ownerName }}</p>
          <p class="whitespace-pre-wrap leading-7 text-slate-200">{{ result.body }}</p>
        </article>
      }

      <section class="space-y-2 border-t border-slate-800 pt-6 text-sm leading-6 text-slate-400">
        <h2 class="font-semibold text-slate-200">Co pokazuje porównanie</h2>
        <p>Ukrycie dokumentu lub guard w Angularze wpływa na interfejs, ale klient może wysłać żądanie samodzielnie. API musi sprawdzić sesję oraz dostęp użytkownika do konkretnego obiektu przy każdym żądaniu.</p>
        <p>Sprawdź dokument DOC-1002 na liście Alice: należy do jej tenantu, ale szczegół jest chroniony kontrolą właściciela. Jako Bob wyślij bezpośrednie żądanie do DOC-1001: tenant north jest niedostępny i chroniony endpoint zwraca 404. Bez sesji API zwraca 401.</p>
        <p>API udostępnia też <code>PATCH /api/solution/documents/:id</code>. Alice może zmienić wyłącznie pole <code>body</code>; Bob otrzyma 403 przy własnym dokumencie z powodu braku operacji edit. Nadmiarowe pola są odrzucane, a odpowiedź zapisu zwraca tylko jawnie wybrane pola. Sprawdź metodę, status i treść odpowiedzi w Network oraz warunki w <code>server/api.ts</code>.</p>
      </section>
    </main>
    </div>
  `,
})
export class IdorLabComponent implements OnInit {
  private readonly api = inject(IdorApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  user: DemoUser | null = null;
  documents: DemoDocument[] = [];
  documentId = 'DOC-1001';
  result: DemoDocument | null = null;
  error = '';
  message = '';

  ngOnInit(): void {
    this.api.me().pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (user) => { this.user = user; this.loadDocuments(); },
      error: () => {},
    });
  }

  login(userId: string): void {
    this.resetOutput();
    this.documents = [];
    this.api.login(userId).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (user) => { this.user = user; this.loadDocuments(); },
      error: (e: { error?: { error?: string } }) => this.error = e.error?.error ?? 'Nie udało się utworzyć sesji.',
    });
  }

  logout(): void {
    this.api.logout().pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: () => { this.user = null; this.documents = []; this.resetOutput(); },
      error: () => this.error = 'Nie udało się zakończyć sesji.',
    });
  }

  readFromUi(): void {
    this.resetOutput();
    const id = this.documentId.trim();
    if (!this.documents.some((document) => document.id === id)) {
      this.message = 'Kontrola UI zatrzymała próbę. Nie wysłano żądania do API.';
      return;
    }
    this.fetchDocument(this.api.readVulnerable(id));
  }

  readDirectly(): void {
    this.resetOutput();
    this.fetchDocument(this.api.readVulnerable(this.documentId.trim()));
  }

  readProtected(): void {
    this.resetOutput();
    this.fetchDocument(this.api.readProtected(this.documentId.trim()));
  }

  editProtected(): void {
    this.resetOutput();
    this.api.editProtected(this.documentId.trim(), { body: 'Treść zmieniona przez kontrolowaną operację.' }).pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (document) => { this.result = { ...document, ownerId: this.user?.id ?? '', ownerName: this.user?.name ?? '' }; this.message = 'PATCH zakończony. Odpowiedź API zawiera wyłącznie pola z projekcji zapisu.'; },
      error: (e: { status?: number; error?: { error?: string } }) => this.error = `HTTP ${e.status ?? 0}: ${e.error?.error ?? 'Operacja odrzucona.'}`,
    });
  }

  private loadDocuments(): void {
    this.api.listDocuments().pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (documents) => this.documents = documents,
      error: () => this.documents = [],
    });
  }

  private fetchDocument(request: ReturnType<IdorApiService['readVulnerable']>): void {
    request.pipe(finalize(() => this.cdr.markForCheck())).subscribe({
      next: (document) => this.result = document,
      error: (e: { error?: { error?: string } }) => this.error = e.error?.error ?? 'Żądanie nie powiodło się.',
    });
  }

  private resetOutput(): void { this.result = null; this.error = ''; this.message = ''; }
}
