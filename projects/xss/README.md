# Lab: treść CMS i renderowanie w Angularze

Samodzielny lab L0.1 porównujący interpolację tekstu, wiązanie `[innerHTML]`, bezpośredni zapis do DOM i `DomSanitizer.bypassSecurityTrustHtml` dla tej samej fikcyjnej odpowiedzi API.

## Uruchomienie

Z katalogu `angular-security-labs` uruchom:

```bash
npm run lab:xss
```

Następnie otwórz adres aplikacji wskazany przez Angular CLI. Lab nie wymaga osobnego API: przygotowana odpowiedź jest lokalną atrapą w `src/app/xss-shell.component.ts`, aby źródło, transformacje i sinki były widoczne w jednym projekcie.

Drugi samodzielny lab o URL i resource URL znajduje się pod http://localhost:4200/resource-url.

Lab o dyrektywach i komponentach znajduje się pod http://localhost:4200/directives. Pokazuje dwie dyrektywy przypięte do zwykłych elementów: jedna zmienia element przez `ElementRef`, druga deklaruje zmiany w `host`. Obok nich jest komponent z własnym template. Demo obejmuje zmiany elementu, klas, stylów, zdarzeń i wywołania metod z template.

## Przebieg

1. Porównaj treść widoczną jako tekst z HTML-em renderowanym przez binding Angulara.
2. Wstaw tę samą wartość do natywnego `innerHTML` i obserwuj komunikat aktualizowany przez handler.
3. Porównaj wynik z bindingiem, któremu jawnie nadano zaufanie przez `bypassSecurityTrustHtml`.
4. Zmień przygotowane pole `body`, odśwież aplikację i ponownie prześledź drogę danych.

Zmiany wykonywane w fixture służą obserwacji lokalnego przepływu. Samo zapisanie wartości w fixture nie oznacza stored XSS.

## Dodatkowe scenariusze

- **HTML zapisany przez autora:** zapisz treść w `localStorage`, odśwież stronę i odczytaj ją do natywnego DOM. Porównaj wynik z bindingiem Angulara. Przycisk usuwania czyści zapis laboratorium.
- **Wspólny pipe:** porównaj zwykły binding HTML z pipe, który nadaje wejściu `SafeHtml` przez `bypassSecurityTrustHtml`.
- **Widget:** lokalna atrapa widgetu zapisuje przekazany HTML do DOM; porównaj surową treść z oczyszczoną przed przekazaniem.
- **Zmiana po sanityzacji:** do oczyszczonego HTML dołącz nowy fragment, a następnie porównaj bezpośredni zapis z ponowną sanityzacją całości.
- **Resource URL:** porównaj dokładny origin z kontrolą tekstową dla różnych schematów, portów i nazw hosta na stronie `/resource-url`.

Każdy przykład HTML zawiera edytowalny payload i komunikat pokazujący wykonanie handlera. Przy ponownym teście widgetu i zmiany po sanityzacji użyj najpierw wariantu surowego, a potem oczyszczonego.
