import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({ selector: 'site-layout', standalone: true, imports: [RouterLink, RouterOutlet], host: { style: 'display: block' }, template: `
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 bg-slate-900/80"><div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
      <a [routerLink]="['/site', { outlets: { primary: ['lab'], sidebar: ['hint'] } }]" class="font-semibold tracking-tight">Angular Security Labs</a>
      <span class="rounded-full border border-cyan-800 bg-cyan-950 px-3 py-1 text-xs font-medium text-cyan-200">Origin · Site · SameSite</span>
    </div></header>
    <main class="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_20rem]"><section class="min-w-0"><router-outlet /></section><aside class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><router-outlet name="sidebar" /></aside></main>
    <footer class="mx-auto max-w-7xl px-6 pb-8 text-xs text-slate-500">Lokalny scenariusz szkoleniowy. Używa wyłącznie fikcyjnych ciasteczek.</footer>
  </div>
` })
export class SiteLayoutComponent {}
