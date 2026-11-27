# Eksperymenty

Lekki projekt do sprawdzania zachowań Angulara, przeglądarki i serwera.

## Uruchomienie

Z katalogu głównego workspace:

```bash
npm install
npm run experiments
```

Angular działa pod adresem http://localhost:4201, a serwer Express pod http://localhost:4304. Serwer uruchamia się przez lokalny `tsx watch` i restartuje po zmianach w plikach serwera. Zatrzymaj oba procesy przez Ctrl+C.

## Dodawanie eksperymentu

1. Dodaj komponent i trasę Angulara w [routes.ts](src/app/routes.ts); komponent możesz umieścić w osobnym pliku.
2. Jeśli eksperyment wymaga serwera, dodaj endpoint do routera w [index.ts](server/index.ts).
3. Dodaj link do eksperymentu na stronie głównej, jeśli ma być dostępny z indeksu.

Trasa `/example` pokazuje podstawowe połączenie komponentu z endpointem serwera.

Eksperyment [lokalne origin, site, CORS i HTTPS](local-origins/README.md) ma osobny tryb uruchomienia.

Po `npm run experiments` dostępne są również automatyczne próby: `/contexts` (konteksty sanitizera), `/dom-clobbering`, `/hash` i `/document-relations` (same-origin i cross-origin).

Eksperymenty G1: `/http-boundary` porównuje nawigację, formularz i `fetch`, `/storage` pokazuje fikcyjne dane w storage i cookies, a `/http-cache` porównuje odpowiedzi `no-store`, `no-cache` i `private`. Każdy uruchamia próbę po otwarciu strony; log API zawiera tylko zdarzenia lokalnego przykładu. Przy `/storage` odświeżenie pozwala sprawdzić trwałość zapisanych wartości.

## Authorization Code + PKCE

Z katalogu głównego repozytorium uruchom `npm run experiment:pkce` i otwórz http://localhost:4201/pkce. Konsola pokazuje oznaczone logi klienta i lokalnego serwera autoryzacji. Eksperyment sam wykonuje przekierowanie, próbę wymiany kodu z błędnym verifierem, poprawną wymianę oraz próbę ponownego użycia kodu. Odświeżenie strony uruchamia nową transakcję.

