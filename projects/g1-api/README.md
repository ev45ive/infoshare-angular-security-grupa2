# G1 API: token i kontrakt serwera

Samodzielny, lokalny projekt Angular + Express dla scenariuszy L1.3 i L1.5 z G1. Pokazuje, że odczyt JWT przez klienta nie jest walidacją, a ograniczenia formularza nie są walidacją ani autoryzacją API. Wszystkie konta, klucz podpisujący, tokeny i zamówienia są fikcyjnymi danymi działającymi wyłącznie w procesie lokalnym.

## Uruchomienie

Wymagane: Node.js, npm i zależności zainstalowane w głównym projekcie `angular-security-labs`. Z katalogu głównego repozytorium wykonaj `npm run lab:g1-api`. Aplikacja działa pod `http://127.0.0.1:4300`, a lokalne API pod `http://127.0.0.1:4301`. Proces API wiąże się tylko z loopback.

Projekt ma własny `angular.json`, konfiguracje TypeScript i skrypty npm; nie importuje aplikacji `idor`, jej danych, routera ani serwera. Korzysta z już zainstalowanych zależności głównego repozytorium i nie wymaga wpisu projektu w głównym `angular.json`.

## L1.3 — Token, odbiorca i cykl życia

Panel prowadzi przez logowanie jako Alice/Bob, pobranie profilu, wysłanie tokenu z błędnym `aud`, tokenu wygasłego i odrzucenie tokenu po wylogowaniu. Podgląd odpowiedzi jest w UI, a decyzje w terminalu API jako `[G1 API]`. Serwer weryfikuje HMAC, `iss`, `aud`, `exp`, typ użycia, podmiot i lokalne unieważnienie `jti`. Token dla innego odbiorcy i wygasły token są podpisane tym samym lokalnym kluczem, aby obserwacja dotyczyła konkretnie walidacji odbiorcy/czasu, a nie błędu podpisu.

## L1.5 — Kontrakt i granica klient–serwer

Poprawne zamówienie przyjmuje `quantity` od 1 do 5. Zmieniony wariant wysyła również `unitPrice`, `owner` i `isApproved`; API odrzuca nieznane pola i pozostawia stan bez zmian. Serwer wyznacza właściciela z uwierzytelnionego podmiotu, a cenę z własnej stałej. Powtórzenie z tym samym `Idempotency-Key` zwraca poprzedni wynik i nie zwiększa liczby zamówień. UI pokazuje odpowiedź i licznik, log API pokazuje stan przed/po. Przycisk resetu czyści lokalne zamówienia, klucze idempotencji i listę unieważnień.

## Granice pokazu

- To symulacja resource servera, nie implementacja OAuth/OIDC, IdP, odświeżania ani produkcyjnego wylogowania.
- Klucz HMAC jest jawnie fikcyjny i zaszyty w kodzie; nie używaj go poza tym pokazem.
- Ścieżka SPA trzyma token w pamięci komponentu i wysyła `Authorization`. Ścieżka BFF przechowuje token w pamięci serwera i używa cookie HttpOnly; oba endpointy są w jednym lokalnym procesie, aby porównać przepływy.
- Stan API jest w pamięci procesu i resetuje się po jego restarcie. Idempotencja i unieważnienie nie przetrwają restartu.
- Endpointy `/lab/*` i CORS służą wyłącznie lokalnemu pokazowi. Nie są interfejsem administracyjnym ani wzorcem produkcyjnym.
- Wykonanie bez uruchomienia projektu nie potwierdza zachowania przeglądarki ani API w runtime.

## Zakres rozszerzeń lokalnych

API odrzuca pola spoza kontraktu i wartości ilości spoza zakresu 1–5. Przycisk timeoutu opóźnia odpowiedź po zapisie, przerywa oczekiwanie klienta i ponawia żądanie z tym samym kluczem idempotencji; stan zamówień przed i po można porównać w logu. Ekran porównuje token SPA z sesją przeglądarki i tokenem przechowywanym przez BFF.

Próba Angular `HttpClient` porównuje nagłówek XSRF dla względnego i bezwzględnego adresu same-origin oraz dla cross-origin. Osobny interceptor dołącza fikcyjny bearer wyłącznie do wskazanego originu i ścieżki. Lokalny dev-server przekazuje wybrane ścieżki do API przez [proxy.conf.json](proxy.conf.json).

Pełny OAuth/OIDC, IdP, PKCE i odświeżanie są poza zakresem. BFF i API mają osobne trasy, lecz wspólny proces; żądanie BFF do API jest wykonywane po HTTP.
