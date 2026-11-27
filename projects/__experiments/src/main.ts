import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterOutlet, provideRouter } from '@angular/router';
import { routes } from './app/routes';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
class App {}

bootstrapApplication(App, { providers: [provideRouter(routes)] });
