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