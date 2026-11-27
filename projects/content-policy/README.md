# Content policy labs: L0.3–L0.5

Samodzielny projekt z trzema prowadzonymi pokazami: Trusted Types i CSP, nonce oraz SRI, a także rzeczywistą odpowiedzią HTTP aplikacji Angular. Każdy wariant korzysta z tego samego kontrolowanego sinka i lokalnego zasobu.

## Uruchomienie

Z katalogu `angular-security-labs`:

```bash
npm run lab:content-policy
```

Skrypt buduje aplikację i uruchamia serwer Express na `http://127.0.0.1:4305`. Serwer podaje gotowy build oraz dostarcza nagłówki polityk, nonce i fixture SRI. Zatrzymaj proces przez `Ctrl+C`.

## Przebieg

1. Otwórz `/` i przejdź kolejno przez L0.3, L0.4 i L0.5. Każdy ekran opisuje obserwację w DevTools i wskazuje plik serwera, który można zmienić.
2. W L0.3 porównaj brak polityki, Trusted Types w `Report-Only` i egzekwowanie. Uruchom kontrolowany zapis stringa do `innerHTML`; sprawdź DOM i Console.
3. W L0.4 odśwież dokument, porównaj nonce w nagłówku CSP i w tagach HTML, a potem załaduj fixture SRI z poprawnym i zmienionym digestem. Obserwuj Network i Console.
4. W L0.5 porównaj tryby `off`, `report` i `enforce`. W Network sprawdź odpowiedź dokumentu, nagłówki, nonce, zasoby oraz rezultat inline probe. Serwer zapisuje metodę, ścieżkę, tryb i status każdego żądania.

Tryby wybierane są query stringiem (`?mode=off`, `?mode=tt-report`, `?mode=tt-enforce`, `?mode=tt-default`, `?mode=report`, `?mode=enforce`, `?mode=hash`, `?mode=nonce-reuse`, `?mode=environment`). Dokument aplikacji ma `Cache-Control: no-store`; nonce jest generowany dla każdej odpowiedzi poza celowym wariantem `nonce-reuse`. Osobny endpoint porównuje nagłówki odpowiedzi HTML i 304.

## Pliki

- `src/app/app.component.ts` zawiera instrukcje, kontrolowany sink Trusted Types, probe CSP i porównanie SRI.
- `server.ts` dostarcza polityki, nonce, raporty CSP, statyczny build i fixture SRI.
- `angular.json` i `package.json` są lokalne dla tego projektu; projekt nie wymaga wpisu w głównym workspace.

Warianty obejmują domyślną Trusted Types policy, CSP hash, cache/304, SRI cross-origin z CORS, nagłówki błędu i przekierowania oraz dwa ustawienia polityki dla tego samego builda w środowiskach demonstracyjnych.

Przycisk „Odczytaj skutek sinka” pokazuje, czy handler kontrolowanego elementu HTML wykonał się po wstawieniu. Fixture jest lokalny i nie wysyła żądań poza aplikację.
