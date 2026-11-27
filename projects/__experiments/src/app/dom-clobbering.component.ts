import { Component, SecurityContext, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

type Probe = { html: string; configType: string; configLength: number | null; namedUrl: string; cspInlineExecuted: boolean };
type Comparison = { direct: Probe; angular: Probe; allowlisted: Probe; allowlistedHtml: string };

@Component({
  selector: 'dom-clobbering-experiment',
  imports: [RouterLink],
  template: `
    <a routerLink="/">Eksperymenty</a>
    <h1>DOM clobbering, sanitizacja i CSP</h1>
    <p>Eksperyment automatycznie porównuje ten sam kontrolowany markup w trzech odizolowanych dokumentach: surowy HTML, wynik sanitizera Angulara oraz wynik małego lokalnego sanitizera, który zachowuje dozwolone atrybuty <code>id</code> i <code>name</code>.</p>
    <pre>{{ html }}</pre>
    @if (result(); as comparison) {
      <h2>Surowy HTML</h2><pre>{{ format(comparison.direct) }}</pre>
      <h2>Sanitizer Angulara</h2><pre>{{ format(comparison.angular) }}</pre>
      <h2>Lokalna allowlista z <code>id</code>/<code>name</code> i CSP</h2>
      <pre>{{ format(comparison.allowlisted) }}</pre>
      <details><summary>HTML po lokalnej allowliście</summary><pre>{{ comparison.allowlistedHtml }}</pre></details>
    }
    <p>Każda próba działa w osobnym sandboxowanym iframe bez sieciowych zasobów. W trzecim dokumencie lokalna meta-CSP blokuje skrypty; kontrolny inline skrypt jedynie ustawia flagę, a wynik flagi jest odczytywany przez eksperyment.</p>
    <p>Sanitizer allowlisty jest małym fixture do obserwacji, nie ogólnym ani produkcyjnym sanitizerem. Zachowanie atrybutów może przywrócić nazwane właściwości DOM. CSP ogranicza wykonanie skryptów, ale nie usuwa kolizji nazw ani nie zastępuje właściwego sanitizera.</p>
  `,
})
export class DomClobberingExperiment {
  readonly html = '<a id="config"></a>\n<a id="config" name="url" href="https://attacker.example"></a>';
  readonly result = signal<Comparison | null>(null);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() { this.run(); }

  format(probe: Probe): string { return JSON.stringify(probe, null, 2); }

  run(): void {
    const angularHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.html) ?? '';
    const allowlistedHtml = this.allowlistHtml(this.html);
    this.result.set({
      direct: this.inspect(this.html, false),
      angular: this.inspect(angularHtml, false),
      allowlisted: this.inspect(allowlistedHtml, true),
      allowlistedHtml,
    });
  }

  private allowlistHtml(input: string): string {
    const parsed = new DOMParser().parseFromString(input, 'text/html');
    return Array.from(parsed.body.querySelectorAll('a')).map((anchor) => {
      const attrs: string[] = [];
      for (const name of ['id', 'name']) {
        const value = anchor.getAttribute(name);
        if (value && /^[a-z][a-z0-9_-]{0,31}$/i.test(value)) attrs.push(`${name}="${value}"`);
      }
      const href = anchor.getAttribute('href');
      if (href?.startsWith('#')) attrs.push(`href="${href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`);
      return `<a${attrs.length ? ` ${attrs.join(' ')}` : ''}></a>`;
    }).join('\n');
  }

  private inspect(html: string, enforceCsp: boolean): Probe {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      const win = frame.contentWindow! as Window & { __clobberCspProbe?: boolean };
      doc.open();
      doc.write(`<!doctype html><html><head>${enforceCsp ? '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; object-src \'none\'; base-uri \'none\'">' : ''}</head><body>${html}<script>window.__clobberCspProbe = true</script></body></html>`);
      doc.close();
      const config = Reflect.get(win, 'config') ?? { url: '/static/app.js' };
      const namedUrl = Reflect.get(config, 'url');
      return {
        html: doc.body.innerHTML,
        configType: Object.prototype.toString.call(config),
        configLength: Object.prototype.toString.call(config) === '[object HTMLCollection]' ? config.length : null,
        namedUrl: namedUrl == null ? 'fallback (/static/app.js)' : `${Object.prototype.toString.call(namedUrl)}: ${String(namedUrl)}`,
        cspInlineExecuted: win.__clobberCspProbe === true,
      };
    } finally {
      frame.remove();
    }
  }
}
