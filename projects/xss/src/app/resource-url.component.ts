import { Component, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

// Konfiguracja z CMS. Zmień adres i porównaj wynik po przeładowaniu.
const configuredUrl = 'http://localhost:4200/resource-demo';
const allowedOrigins = ['http://localhost:4200'];
const comparisonUrls = [
  'http://localhost:4200/resource-demo',
  'https://localhost:4200/resource-demo',
  'http://localhost:4300/resource-demo',
  'http://app.localhost:4200/resource-demo',
  'http://localhost.attacker.invalid:4200/resource-demo',
];

@Component({
  selector: 'resource-url-lab',
  template: `
    <main class="mx-auto max-w-4xl space-y-6 px-6 py-8 text-slate-900 dark:text-slate-100">
      <nav><a href="/" class="underline">Treść CMS</a> · Link i zasób</nav>
      <h1 class="text-3xl font-semibold">Link i osadzony zasób z CMS</h1>
      <p>CMS konfiguruje link i adres formularza w iframe. Porównaj kontekst zwykłego linku z adresem zasobu, który może dostarczać aktywny dokument.</p>
      <ol class="list-decimal space-y-3 pl-6">
        <li>Sprawdź <code>configuredUrl</code> w <code>projects/xss/src/app/resource-url.component.ts</code>, a następnie porównaj wynik wiązania <code>href</code> i ręcznej sanitizacji URL.</li>
        <li>Zmień adres na <code>javascript:alert(1)</code> i sprawdź wynik w DOM oraz konsoli. Nie otwieraj nieznanego linku.</li>
        <li>Zmień adres na <code>http://localhost.attacker.invalid:4200/resource-demo</code>, a następnie na <code>http://localhost:4200/resource-demo</code>. Porównaj wynik parsowania originu i decyzję allowlisty.</li>
        <li>Odczytaj kod: iframe przyjmuje wyłącznie adres z dozwolonego originu, któremu następnie nadano <code>SafeResourceUrl</code>. Bypass sam nie waliduje URL.</li>
      </ol>
      <p>Adres: <code>{{ url }}</code></p>
      <p>Wynik <code>sanitize(URL)</code>: <code>{{ sanitized }}</code></p>
      <p>Origin po parsowaniu: <code>{{ origin }}</code> · decyzja: <strong>{{ approved ? 'dozwolony' : 'odrzucony' }}</strong></p>
      <h2 class="text-xl font-semibold">Porównanie reguł dla adresów testowych</h2>
      <p>Reguła tekstowa <code>url.includes('localhost')</code> sprawdza tylko wystąpienie fragmentu. Nie porównuje schematu, portu ani granicy nazwy hosta.</p>
      <ul class="space-y-2">
        @for (candidate of comparisons; track candidate) {
          <li><code>{{ candidate }}</code><br />Origin: <code>{{ parseOrigin(candidate) }}</code> · allowlista originów: <strong>{{ isOriginAllowed(candidate) ? 'dozwolony' : 'odrzucony' }}</strong> · kontrola tekstowa: <strong>{{ passesTextCheck(candidate) ? 'dozwolony' : 'odrzucony' }}</strong></li>
        }
      </ul>
      <p><a [href]="url" target="_blank" rel="noopener" class="underline">Link z wiązaniem Angulara</a> — sprawdź jego atrybut href w DevTools.</p>
      @if (approved) { <iframe title="Formularz z konfiguracji" [src]="trusted" class="h-32 w-full border"></iframe> }
      @else { <p>Nie osadzono zasobu: adres nie przeszedł reguły aplikacji.</p> }
      <p>Sanityzacja kontekstu URL nie rozstrzyga, czy cel jest dopuszczony biznesowo. Resource URL wymaga jawnej decyzji zaufania; nie nadawaj go dowolnym danym z CMS.</p>
    </main>
  `,
})
export class ResourceUrlComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly url = configuredUrl;
  readonly comparisons = comparisonUrls;
  readonly sanitized = this.sanitizer.sanitize(SecurityContext.URL, this.url);
  readonly origin = this.parseOrigin(this.url);
  readonly approved = this.isOriginAllowed(this.url);
  readonly trusted = this.approved ? this.sanitizer.bypassSecurityTrustResourceUrl(this.url) : null;
  parseOrigin(value: string): string {
    try { return new URL(value).origin; } catch { return 'niepoprawny URL'; }
  }
  isOriginAllowed(value: string): boolean {
    return allowedOrigins.includes(this.parseOrigin(value));
  }
  passesTextCheck(value: string): boolean {
    return value.includes('localhost');
  }
}
