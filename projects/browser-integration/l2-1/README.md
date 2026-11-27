# L2.1 — Powrót po logowaniu i popup

Samodzielny lab porównuje nawigację z parametru `returnUrl` z allowlistą ścieżek wewnętrznych, a następnie obserwuje relację `window.opener` z wariantem `noopener`. Nie implementuje logowania ani callbacku OAuth/OIDC.

## Uruchomienie

Z katalogu głównego repozytorium, po instalacji zależności z lockfile:

```powershell
npm run lab:navigation
```

Otwórz `http://portal-l21.localhost:4221`. Serwer uruchamia kontrolowaną stronę docelową na `http://destination-l21.localhost:4222`; wymagane jest rozwiązywanie nazw `*.localhost` na komputer lokalny. Zatrzymaj proces przez `Ctrl+C`.

## Przebieg

1. Uruchom oba warianty z `/documents/42`, `//destination-l21.localhost:4222/away` oraz `http://portal-l21.localhost.evil.test/documents`. Bez walidacji przeglądarka przejdzie na cel parametru; wariant ograniczony parsuje URL względem stałego originu i dopuszcza wyłącznie `/documents` oraz jej podścieżki.
2. Spróbuj `javascript:alert(1)` tylko jako wartość do porównania: przeglądarka może obsłużyć ją jako osobny schemat. Ćwiczenie dotyczy wyboru celu nawigacji, nie XSS; nie wpisuj payloadów do dokumentu ani nie utożsamiaj redirectu z wykonaniem skryptu.
3. Wróć do strony głównej i otwórz popup z `opener`, a następnie z `noopener`. Na stronie popupu sprawdź `window.opener` i próbę nawigacji okna inicjującego. Zablokowany popup i `null` są możliwymi wynikami.

Kod obu prób jest w `server.ts`. Lista dozwolonych tras to celowo wąska allowlista; kontrola po stronie klienta nie zastępuje walidacji przekierowania po stronie serwera. Wynik zależy też od zachowania wspieranej przeglądarki.

Lab działa niezależnie od aplikacji Angular; portal i strona docelowa mają osobne originy.

## Dodatkowe obserwacje

W polu `returnUrl` porównaj `/documents/42`, `//destination-l21.localhost:4222/away`, `///destination-l21.localhost:4222/away`, `../documents/42`, ukośniki odwrotne i zakodowane znaki. Adres zaczynający się od `//` dziedziczy protokół bieżącej strony, ale może wskazać inny host. Wariant ograniczony rozwiązuje adres względem stałego originu i dopuszcza wyłącznie ścieżki `/documents`.

Kontrolowana strona docelowa pokazuje nagłówek `Referer` oraz parametr zapytania. W DevTools → Network sprawdź żądanie nawigacji i przejścia między stronami; fragment `#hash` nie jest wysyłany w żądaniu HTTP, a historia przeglądarki jest lokalnym stanem karty. Nie umieszczaj sekretów w URL, bo mogą trafić do historii, logów i nagłówka `Referer` zależnie od polityki referrera.

Przycisk „Mock login” otwiera kontrolowaną stronę, która po krótkim opóźnieniu zwraca fikcyjny kod przez `postMessage`. Portal sprawdza origin i source, ustawia timeout oraz obsługuje zamknięcie popupu. Kod nie jest credentialem i nie realizuje OAuth/OIDC ani PKCE.
