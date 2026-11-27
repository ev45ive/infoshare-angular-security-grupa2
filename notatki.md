# Instalacje

node -v
npm -v  
git -v

# Source Maps leak:

https://github.com/renepardon/claude-code

# OO Angular Composite + Staticly compiled selectors/templates

ViewRef / ViewContainerRef / TemplateRef

# Abstract-Data-Types - Compile time state/pattern matching

```ts
type LabHeaders = 'Lab-Mode' | 'Lab-Environment';
type CSPHeaders = `Content-Policy-${LabHeaders}`;
type XHeaders<T extends string> = `X-${T}`;

const header: XHeaders<CSPHeaders> = 'X-Content-Policy-Lab-Mode';

// TS types as SETs

// unknown - TOP set

type Fruits = 'banana' | 'apple' | 'apple' | never;
type Food = Fruits | 'carrot';
type NotFood = Food & 'bike';

// never - empty set BOTTOM
```

- Literal union types (compile-time only)
- enums (+runtime)


# Lazy loading angular code - CSP?

```ts
  { path: '', loadChildren: () => import('separate-bundler') },
  { path: '', loadChildren: () => fetch('separate-bundler') },
  onCLick() {  await import('separate-bundler').MojSuperComponent }
```


# Interceptors + request  = HttpContext + HttpContextToken

```ts
const ServerContext = new HttpContextToken(() => 'only server A')

const serverA = new HttpContext().set(ServerContext,'A')
                              // .set('innea')

// Cross Package import boundary: 
import ServerContext // ERROR~
import serverA // OK

http.get('',{ context: serverA })
http.get('',{ context: serverB })

```

# Retry ( STOSUJ SIĘ DO ZASAD PROTOKOŁU HTTP)
```js
  return next(req).pipe(
    retry({
      count:3,
      delay(error, retryCount) {
        // if (error instanceof HttpErrorResponse)
        // if RETRYABLE_HTTP_ERROR_CODES
        // if (error.code == 429 && error.headers.tryagainafter ... )

        return timer(500 * retryCount ** 2) // exponential backoff
      },
    })
  )

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
```