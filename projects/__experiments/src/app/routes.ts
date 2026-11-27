import { Component } from '@angular/core';
import { RouterLink, type Routes } from '@angular/router';
import { DomClobberingExperiment } from './dom-clobbering.component';
import { RichTextProgression } from './rich-text-progression.component';
import { LocalOriginsExperiment } from './local-origins.component';
import { PkceExperiment } from './pkce.component';
import { SecurityContextsExperiment } from './security-contexts.component';
import { HashContentExperiment } from './hash-content.component';
import { DocumentRelationsExperiment, RelationsChild } from './document-relations.component';
import {
  CacheExperiment,
  HttpBoundaryExperiment,
  StorageExperiment,
} from './api-boundary-experiments.component';

@Component({
  selector: 'experiments-index',
  imports: [RouterLink],
  template:
    '<h1>Eksperymenty</h1><ul><li><a routerLink="/example">Przykładowy eksperyment</a></li><li><a routerLink="/contexts">Konteksty i sanitizer</a></li><li><a routerLink="/dom-clobbering">DOM clobbering</a></li><li><a routerLink="/hash">Hash a zawartość</a></li><li><a routerLink="/document-relations">Dokumenty i origin</a></li><li><a routerLink="/http-boundary">HTTP: origin i żądania</a></li><li><a routerLink="/storage">Storage i cookies</a></li><li><a routerLink="/http-cache">Cache HTTP i pamięć</a></li><li><a routerLink="/rich-text">Od tekstu z API do DOM clobberingu</a></li><li><a routerLink="/pkce">Authorization Code i PKCE</a></li></ul>',
})
class ExperimentsIndex {}

@Component({
  selector: 'example-experiment',
  imports: [RouterLink],
  template: `
    <a routerLink="/">Eksperymenty</a>
    <h1>Przykładowy eksperyment</h1>
    <button type="button" (click)="load()">Zapytaj serwer</button>
    <pre>{{ result }}</pre>
  `,
})
class ExampleExperiment {
  result = '';

  async load(): Promise<void> {
    try {
      const response = await fetch('http://localhost:4304/example');
      this.result = JSON.stringify(await response.json(), null, 2);
    } catch (error) {
      this.result = String(error);
    }
  }
}

export const routes: Routes = [
  { path: '', component: ExperimentsIndex },
  { path: 'example', component: ExampleExperiment },
  { path: 'dom-clobbering', component: DomClobberingExperiment },
  { path: 'rich-text', component: RichTextProgression },
  { path: 'local-origins', component: LocalOriginsExperiment },
  { path: 'pkce', component: PkceExperiment },
  { path: 'contexts', component: SecurityContextsExperiment },
  { path: 'hash', component: HashContentExperiment },
  { path: 'document-relations', component: DocumentRelationsExperiment },
  { path: 'relations-child', component: RelationsChild },
  { path: 'http-boundary', component: HttpBoundaryExperiment },
  { path: 'storage', component: StorageExperiment },
  { path: 'http-cache', component: CacheExperiment },
];
