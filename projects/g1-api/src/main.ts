import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors, withXsrfConfiguration, type HttpInterceptorFn } from '@angular/common/http';

// Jedyny endpoint, do którego interceptor dołącza fikcyjny token.
const demoBearer: HttpInterceptorFn = (req, next) => {
  const target = new URL(req.url, location.origin);
  if (target.origin === 'http://127.0.0.1:4301' && target.pathname === '/lab/interceptor/trusted') {
    return next(req.clone({ setHeaders: { Authorization: 'Bearer fictional-demo-token' } }));
  }
  return next(req);
};

bootstrapApplication(AppComponent, { providers: [provideHttpClient(withInterceptors([demoBearer]), withXsrfConfiguration({ cookieName: 'g1_angular_xsrf', headerName: 'X-XSRF-TOKEN' }))] }).catch((error: unknown) => console.error(error));
