import { bootstrapApplication } from '@angular/platform-browser';
import { XssShellComponent } from './app/xss-shell.component';
import { ResourceUrlComponent } from './app/resource-url.component';
import { provideRouter, RouterOutlet } from '@angular/router';
import { Component, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
class App {}

// template: '<p>Przykładowy lokalny formularz.</p>' + Math.random() //  Value could not be determined statically.(-991010)

@Component({
  selector: 'resource-demo, .banana',
  template: ` <ng-template #tplRef>Test Banana Templte - angular renderer</ng-template>

    <div *ngTemplateOutlet="tplRef"></div>

    <p>Przykładowy lokalny formularz.</p>`,
  imports: [NgTemplateOutlet],
})
class ResourceDemo {}

bootstrapApplication(App, {
  providers: [
    provideRouter([
      { path: '', component: XssShellComponent },
      { path: 'resource-url', component: ResourceUrlComponent },
      { path: 'resource-demo', component: ResourceDemo },
    ]),
  ],
}).catch((error: unknown) => console.error(error));
