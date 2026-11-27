import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withNoXsrfProtection,
  withXsrfConfiguration,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { retry, timer } from 'rxjs';

// Jedyny endpoint, do którego interceptor dołącza fikcyjny token.
const demoBearer: HttpInterceptorFn = (req, next) => {
  const target = new URL(req.url, location.origin);
  if (target.origin === 'http://127.0.0.1:4301' && target.pathname === '/lab/interceptor/trusted') {
    return next(req.clone({ setHeaders: { Authorization: 'Bearer fictional-demo-token' } }));
  }

  return next(req).pipe(
    // retry({
    //   count:3,
    //   delay(error, retryCount) {
    //     // if (error instanceof HttpErrorResponse)
    //     // if RETRYABLE_HTTP_ERROR_CODES
    //     // if (error.code == 429 && error.headers.tryagainafter ... )
    //     return timer(500 * retryCount ** 2) // exponential backoff
    //   },
    // })
  )
};

// Dictionary of HTTP status codes considered transient and safe to retry.
const RETRYABLE_HTTP_ERROR_CODES: Readonly<Record<number, string>> = {
  0: 'No connection',
  // 408 Request Timeout - server timed out waiting for the request.
  408: 'Request Timeout',
  // 429 Too Many Requests - rate limit hit, retry after a backoff.
  429: 'Too Many Requests',
  // 500 Internal Server Error - unexpected server failure, may be temporary.
  500: 'Internal Server Error',
  // 502 Bad Gateway - upstream server returned an invalid response.
  502: 'Bad Gateway',
  // 503 Service Unavailable - server overloaded or in maintenance.
  503: 'Service Unavailable',
  // 504 Gateway Timeout - upstream server did not respond in time.
  504: 'Gateway Timeout',
};

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withInterceptors([demoBearer]),
      withXsrfConfiguration({ cookieName: 'g1_angular_xsrf', headerName: 'X-XSRF-TOKEN' }),
      withNoXsrfProtection()
    ),
  ],
}).catch((error: unknown) => console.error(error));


// ngInterceptorOpt
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError } from 'rxjs';

// TODO JSDOC - Code Marketing (visiblity!)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // [optional] pass through requests to other origins
  if (new URL(req.url, location.origin).origin !== 'https://api.example.com') return next(req);
  // [optional] attach auth header
  req = req.clone({ setHeaders: { Authorization: 'Bearer token' } });

  return next(req).pipe(
    // [optional] retry transient errors
    retry(2),
    // [optional] map errors
    catchError((error: unknown) => throwError(() => error)),
  );
};