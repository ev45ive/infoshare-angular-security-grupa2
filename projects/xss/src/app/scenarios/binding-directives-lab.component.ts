import { Component, computed, input, signal } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  ElementRefDirective,
  HostBindingsDirective,
  TONE_COLOR,
  TONES,
  Tone,
} from './binding-directives';

const plainText = 'Tekst ustawiony przez textContent.';
// Celowo podatny payload: innerHTML wykonuje handler onerror po błędzie ładowania obrazu.
const proofPayload = `<img src="/missing-directive-image" onerror="document.querySelector('#directive-proof').textContent='Kod z payloadu wykonany przez innerHTML'">`;

@Component({
  selector: 'lab-tone-component',
  template: `
    <p class="text-sm font-semibold">Komponent z własnym template</p>
    <p class="mt-1 text-xs text-slate-600">
      Ton: {{ tone() }} · aktywny: {{ active() ? 'tak' : 'nie' }}
    </p>
  `,
  host: {
    role: 'button',
    tabindex: '0',
    class: 'block cursor-pointer rounded-lg border-2 p-3',
    '[class.is-active]': 'active()',
    '[style.border-color]': 'color()',
    '(click)': 'toggle()',
  },
  styles: `
    :host.is-active {
      background-color: #eef2ff;
    }
  `,
})
export class ToneComponent {
  readonly tone = input<Tone>('info');
  readonly active = signal(false);
  readonly color = computed(() => TONE_COLOR[this.tone()]);

  toggle(): void {
    this.active.update((value) => !value);
  }
}

@Component({
  selector: 'app-binding-directives-lab',
  imports: [HlmButton, ElementRefDirective, HostBindingsDirective, ToneComponent],
  template: `
    <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">
      Scenariusz 2 · Dyrektywy i komponent
    </p>
    <h2 class="mt-2 text-2xl font-bold">Wiązanie z elementem: dyrektywa kontra komponent</h2>
    <p class="mt-3 max-w-3xl text-slate-700">
      Dyrektywy są przypięte do zwykłych elementów. Pierwsza zmienia element przez
      <code>ElementRef</code>, druga deklaruje zmiany w <code>host</code>. Komponent renderuje
      własny template i ma własny host.
    </p>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <button hlmBtn type="button" (click)="nextTone()">Zmień ton: {{ tone() }}</button>
      <p class="text-sm text-slate-700" aria-live="polite">
        Ostatnie zdarzenie: <strong>{{ lastEvent() }}</strong>
      </p>
    </div>

    <div class="mt-6 grid gap-6 md:grid-cols-3">
      <section class="space-y-3">
        <h3 class="font-semibold">1. Dyrektywa · <code>ElementRef</code></h3>
        <div
          labElementRef
          #refDir="labElementRef"
          [labElementRefTone]="tone()"
          (click)="logEvent('ElementRef: klik na elemencie')"
          class="min-h-24 rounded-lg border-2 p-3"
        >
          <p>
            Ton, <code>border-color</code>, klasa <code>is-active</code> i
            <code>aria-pressed</code> są ustawiane na <code>nativeElement</code>.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button hlmBtn type="button" (click)="refDir.toggle()">toggle()</button>
          <button hlmBtn type="button" (click)="refDir.writeText(plainText)">writeText()</button>
          <button
            hlmBtn
            type="button"
            variant="destructive"
            (click)="refDir.writeHtml(proofPayload)"
          >
            writeHtml() · podatne
          </button>
        </div>
        <p
          id="directive-proof"
          aria-live="polite"
          class="min-h-5 text-sm font-medium text-rose-800"
        >
          Dowód pojawi się po writeHtml().
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="font-semibold">2. Dyrektywa · <code>host</code> bindings</h3>
        <div
          labHostBindings
          #hostDir="labHostBindings"
          [labHostBindingsTone]="tone()"
          (click)="logEvent('HostBindings: klik na elemencie')"
          class="min-h-24 rounded-lg border-2 p-3"
        >
          <p>Klasa, styl, atrybuty i zdarzenia są zadeklarowane w <code>host</code>.</p>
          <p class="mt-2 text-xs text-slate-600">Aktywny: {{ hostDir.active() ? 'tak' : 'nie' }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button hlmBtn type="button" (click)="hostDir.toggle()">toggle()</button>
        </div>
      </section>

      <section class="space-y-3">
        <h3 class="font-semibold">3. Komponent · własny template</h3>
        <lab-tone-component [tone]="tone()" (click)="logEvent('Komponent: klik na hoście')" />
        <p class="text-xs text-slate-600">
          Komponent używa własnego template i <code>host</code>, a klik obsługuje jego metoda
          <code>toggle()</code>.
        </p>
      </section>
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 p-4">
        <h3 class="font-semibold">Dyrektywa vs komponent</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Komponent ma własny template i selektor; dyrektywa nie ma widoku.</li>
          <li>
            Dyrektywę można nałożyć na dowolny element, komponent jest elementem z własnym
            selektorem.
          </li>
          <li>
            <code>ElementRef</code> daje imperatywny dostęp do DOM; <code>host</code> pozwala
            deklaratywnie wiązać klasy, style, atrybuty i zdarzenia przez mechanizm Angulara.
          </li>
          <li>
            Oba warianty mogą przyjmować wejścia <code>input()</code> i wystawiać metody do template
            przez <code>#ref="..."</code>.
          </li>
        </ul>
      </section>

      <section class="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h3 class="font-semibold">Potencjalne ryzyka security</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            <code>ElementRef.nativeElement.innerHTML</code> omija sanityzację i kontekst szablonu.
            Dane użytkownika w <code>writeHtml</code> to DOM XSS.
          </li>
          <li>
            <code>textContent</code> jest bezpieczny dla tekstu. Nie zamieniaj go na
            <code>innerHTML</code> dla samego formatowania.
          </li>
          <li>
            Wartości z <code>host</code> (klasy, style, atrybuty) mogą pochodzić z danych
            zewnętrznych. Tutaj są ograniczone typem <code>Tone</code> i mapą kolorów.
          </li>
          <li>
            Angular sanityzuje URL-e w bindingach <code>host</code> jak w template, ale wartości
            stylów nie są w pełni chronione. Nie przekazuj do nich niezaufanych ciągów.
          </li>
          <li>
            Nie używaj <code>bypassSecurityTrust…</code> do danych przekazywanych do dyrektyw.
          </li>
          <li>
            Listenery dodane przez <code>addEventListener</code> trzeba usunąć (tu przez
            <code>DestroyRef</code>), inaczej zostają po zniszczeniu widoku.
          </li>
          <li>Bezpośredni dostęp do DOM nie działa w SSR ani w Web Workerze.</li>
        </ul>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    code {
      font-family: ui-monospace, monospace;
    }
    .is-active {
      background-color: #eef2ff;
    }
  `,
})
export class BindingDirectivesLabComponent {
  readonly tone = signal<Tone>('info');
  readonly lastEvent = signal('brak');
  readonly plainText = plainText;
  readonly proofPayload = proofPayload;

  nextTone(): void {
    const next = (TONES.indexOf(this.tone()) + 1) % TONES.length;
    this.tone.set(TONES[next]);
  }

  logEvent(source: string): void {
    this.lastEvent.set(source);
  }
}
