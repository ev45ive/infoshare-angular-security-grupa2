import { CSP_NONCE } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: CSP_NONCE,
      useFactory: () =>
        document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? null,
    },
  ],
}).catch((error: unknown) => console.error(error));
