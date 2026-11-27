# L2.2 — Izolacja widgetu i możliwość osadzania

Samodzielny lab porównuje dostęp do dokumentu same-origin i cross-origin, ograniczenia atrybutu `sandbox`, politykę `frame-src` portalu oraz `frame-ancestors` widgetu. Zawiera również lekką próbę E2.2, która odczytuje nagłówki CSP odpowiedzi i pokazuje próbę osadzenia.

## Uruchomienie

Z katalogu głównego repozytorium, po instalacji zależności z lockfile:

```powershell
npm run lab:framing
```

Otwórz `http://portal-l22.localhost:4223`. Serwer uruchamia widget na `http://widget-l22.localhost:4224` oraz kontrolowany obcy origin na `http://outside-l22.localhost:4225`. Wymagane jest rozwiązywanie nazw `*.localhost`. Zatrzymaj proces przez `Ctrl+C`.

## Przebieg

1. W ramce same-origin i cross-origin użyj przycisku próby odczytu dokumentu. Same-origin powinien pozwolić na odczyt; cross-origin jest ograniczony przez SOP.
2. Widget startuje z `sandbox="allow-scripts"`. Wykonaj próbę odczytu, uruchom skrypt w ramce, a następnie dodaj `allow-same-origin` i powtórz. Ten token zmienia origin sandboxowanego dokumentu, ale sam nie znosi granicy cross-origin względem portalu.
3. Otwórz `/deny` w originie portalu. `frame-src` odpowiedzi portalu nie dopuszcza originu widgetu. Porównaj z `/allow` i sprawdź Console oraz Network.
4. Otwórz kontrolowaną stronę obcego originu. Widget dopuszcza portal w `frame-ancestors`, więc próby osadzenia przez obcą stronę są blokowane. Endpoint `/deny-portal` używa `frame-ancestors 'none'` i odrzuci osadzenie także przez portal.
5. W sekcji E2.2 porównaj nagłówki odpowiedzi z próbą osadzenia. Zdarzenie `load` ramki samo nie potwierdza, że dokument został wyświetlony; sprawdź Console i Network.

Nagłówki są ustawiane przez serwery odpowiedzialne za dokumenty: portal emituje `frame-src`, widget emituje `frame-ancestors`. W tym laboratorium celowo włączono inline skrypty eksperymentalne polityką `script-src 'unsafe-inline'`; nie jest to rekomendacja dla aplikacji produkcyjnej. `frame-ancestors` nie jest dostarczane przez `<meta>`.

Lab używa lokalnych serwerów HTML, aby każda odpowiedź dokumentu mogła otrzymać odpowiednią politykę CSP.

## Dodatkowe porównania

Sekcja `srcdoc` osadza dokument bez osobnego żądania sieciowego. Z sandboxem bez `allow-same-origin` otrzymuje on opaque origin; komunikat może mieć `event.origin === "null"`. Wysłanie do `targetOrigin: "*"` jest tu demonstracją ograniczenia opaque origin, a odbiorca nie traktuje `null` jako zaufanego originu.

Porównaj ramki same-origin z `sandbox="allow-scripts"`, `sandbox="allow-same-origin"` oraz oboma tokenami. Każdy token odblokowuje inną zdolność: skrypty albo origin dokumentu. Sprawdź odczyt DOM i wykonanie skryptu osobno.

Kontrolowana strona z nagłówkiem `X-Frame-Options: DENY` i osobna odpowiedź z `frame-ancestors` pokazują, że polityka osadzania pochodzi od serwera dokumentu. Widok clickjacking nakłada przezroczystą ramkę nad przyciskiem demonstracyjnym; kliknięcie ujawnia, że użytkownik może aktywować kontrolkę niewidocznego dokumentu. Nie używa prawdziwych kont ani operacji.

Próba Permissions Policy porównuje funkcję clipboardu w ramce z domyślnym ustawieniem i z odmową po stronie rodzica. Nie zależy od CSP ani sandboxa; przeglądarka może dodatkowo wymagać gestu użytkownika lub kontekstu HTTPS.
