import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'hash-content', imports: [RouterLink], template: `
  <a routerLink="/">Eksperymenty</a><h1>Hash a zawartość</h1>
  <p>SHA-256 dwóch ciągów UTF-8 różniących się jednym bajtem; zmień wartości w <code>hash-content.component.ts</code>.</p>
  <pre>{{ result() }}</pre><p>Fingerprint w nazwie pliku i kontrola integralności dostarczonej zawartości są osobnymi zastosowaniami.</p>
` })
export class HashContentExperiment {
  readonly result = signal('Obliczanie…');
  constructor() { void this.calculate(); }
  private async calculate(): Promise<void> {
    const values = ['hello', 'hellO'];
    const hashes = await Promise.all(values.map(async (value) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    }));
    this.result.set(JSON.stringify({ values, hashes, equal: hashes[0] === hashes[1] }, null, 2));
  }
}
