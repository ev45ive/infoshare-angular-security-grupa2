# Lab: treść CMS i renderowanie w Angularze

Samodzielny lab L0.1 porównujący interpolację tekstu, wiązanie `[innerHTML]`, bezpośredni zapis do DOM i `DomSanitizer.bypassSecurityTrustHtml` dla tej samej fikcyjnej odpowiedzi API.

## Uruchomienie

Z katalogu `angular-security-labs` uruchom:

```bash
npm run lab:xss
```

Następnie otwórz adres aplikacji wskazany przez Angular CLI. Lab nie wymaga osobnego API: przygotowana odpowiedź jest lokalną atrapą w `src/app/xss-shell.component.ts`, aby źródło, transformacje i sinki były widoczne w jednym projekcie.

Drugi samodzielny lab o URL i resource URL znajduje się pod http://localhost:4200/resource-url.

## Przebieg

1. Porównaj treść widoczną jako tekst z HTML-em renderowanym przez binding Angulara.
2. Wstaw tę samą wartość do natywnego `innerHTML` i obserwuj komunikat aktualizowany przez handler.
3. Porównaj wynik z bindingiem, któremu jawnie nadano zaufanie przez `bypassSecurityTrustHtml`.
4. Zmień przygotowane pole `body`, odśwież aplikację i ponownie prześledź drogę danych.

Zmiany wykonywane w fixture służą obserwacji lokalnego przepływu. Samo zapisanie wartości w fixture nie oznacza stored XSS.
