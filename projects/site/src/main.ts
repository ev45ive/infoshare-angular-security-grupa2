import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterOutlet, provideRouter } from '@angular/router';
import { siteRoutes } from './app/site.routes';

@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />', host: { style: 'display: block' } })
class App {}

bootstrapApplication(App, { providers: [provideHttpClient(), provideRouter(siteRoutes)] });
