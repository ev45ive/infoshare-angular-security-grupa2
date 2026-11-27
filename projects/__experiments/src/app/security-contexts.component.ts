import { Component, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

const value = '<strong>tekst</strong><img src="x" onerror="alert(1)">';
@Component({
  selector: 'security-contexts', imports: [RouterLink],
  template: `
    <a routerLink="/">Eksperymenty</a><h1>Konteksty i sanitizer</h1>
    <p>Ta sama wartość jako tekst, HTML i URL. Wyniki pochodzą z Angulara używanego przez tę aplikację.</p>
    <h2>Interpolacja</h2><pre>{{ value }}</pre>
    <h2>Binding HTML</h2><div [innerHTML]="value"></div>
    <h2>sanitize(HTML)</h2><pre>{{ html }}</pre>
    <h2>sanitize(URL)</h2><pre>{{ url }}</pre>
    <p>Zmodyfikuj <code>value</code> w <code>security-contexts.component.ts</code>. Bezpośrednie API i binding są odrębnymi operacjami; porównuj je w konkretnym kontekście.</p>
  `,
})
export class SecurityContextsExperiment {
  private sanitizer = inject(DomSanitizer);
  readonly value = value;
  readonly html = this.sanitizer.sanitize(SecurityContext.HTML, value);
  readonly url = this.sanitizer.sanitize(SecurityContext.URL, value);
}
