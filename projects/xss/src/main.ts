import { bootstrapApplication } from '@angular/platform-browser';
import { XssShellComponent } from './app/xss-shell.component';
import { ResourceUrlComponent } from './app/resource-url.component';
import { BindingDirectivesLabComponent } from './app/scenarios/binding-directives-lab.component';
import { provideRouter, RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
class App {}
@Component({ selector: 'resource-demo', template: '<p>Przykładowy lokalny formularz.</p>' })
class ResourceDemo {}
bootstrapApplication(App, { providers: [provideRouter([
  { path: '', component: XssShellComponent },
  { path: 'resource-url', component: ResourceUrlComponent },
  { path: 'resource-demo', component: ResourceDemo },
  { path: 'directives', component: BindingDirectivesLabComponent },
])] }).catch((error: unknown) => console.error(error));
