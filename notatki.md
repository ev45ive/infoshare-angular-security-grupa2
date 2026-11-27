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
