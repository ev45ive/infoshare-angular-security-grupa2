import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'document-relations', imports: [RouterLink], template: `
  <a routerLink="/">Eksperymenty</a><h1>Dokumenty i origin</h1>
  <p>Próba automatycznie odczytuje dokument w ramce tego samego originu i dokument z API na innym porcie. Port jest częścią originu.</p>
  <pre>{{ result() }}</pre>
  <p><code>parent</code>, <code>top</code> i <code>opener</code> są relacjami okien; możliwość odczytu dokumentu zależy od originu. W tej karcie opener może być niedostępny.</p>
  <p>Warianty do samodzielnej zmiany w <code>document-relations.component.ts</code>: inny host lub schemat; porównać origin i site.</p>
` })
export class DocumentRelationsExperiment implements OnDestroy {
  readonly result = signal('Uruchamianie…');
  private readonly frames: HTMLIFrameElement[] = [];
  constructor() { void this.run(); }
  ngOnDestroy(): void { this.frames.forEach(frame => frame.remove()); }
  private async run(): Promise<void> {
    const probe = (src: string): Promise<object> => new Promise(resolve => {
      const frame = document.createElement('iframe');
      frame.hidden = true; frame.src = src; this.frames.push(frame);
      frame.onload = () => {
        try {
          const child = frame.contentWindow!;
          resolve({ src, origin: child.location.origin, title: child.document.title, parentIsCurrent: child.parent === window, topIsCurrent: child.top === window });
        } catch (error) { resolve({ src, odczyt: String(error) }); }
      };
      document.body.appendChild(frame);
    });
    const results = await Promise.all([probe('/relations-child'), probe('http://localhost:4304/relations-child')]);
    this.result.set(JSON.stringify({ origin: location.origin, opener: window.opener ? 'obecny' : 'brak', results }, null, 2));
    this.frames.forEach(frame => frame.remove());
  }
}

@Component({ selector: 'relations-child', template: '<p>Dokument tej samej aplikacji.</p>' })
export class RelationsChild {}
