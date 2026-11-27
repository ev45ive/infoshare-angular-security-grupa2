# L2.3 — Protokół `postMessage`

Samodzielny lab pokazuje wiadomości między portalem Angular, widgetem partnera i dokumentem z obcego originu. Porównuje `targetOrigin`, `event.origin`, `event.source` i walidację danych. Wiadomość nie przyznaje dostępu do dokumentu ani nie autoryzuje operacji biznesowej.

## Uruchomienie

Z katalogu głównego repozytorium, po zainstalowaniu zależności z lockfile:

```powershell
npm run lab:messaging
```

Otwórz http://app.localhost:4212. Potrzebne są wolne porty 4212–4215 i przeglądarka obsługująca `*.localhost`. Wszystkie serwery nasłuchują na `127.0.0.1`; procesy i ich logi mają osobne tagi. `Ctrl+C` zatrzymuje zestaw.

Kod odbiorcy znajduje się w [main.ts](src/main.ts), a nadawcy w [server.ts](server.ts). Kroki i miejsca obserwacji są na ekranie labu.

Pozostałe samodzielne scenariusze G2:

- [Nawigacja i popup — L2.1](l2-1/README.md): `npm run lab:navigation`.
- [Iframe i polityki framingu — L2.2 / E2.2](l2-2/README.md): `npm run lab:framing`.
- [Sesja w ramce i macierz integracji — L2.4–L2.5](G2-L2.4-L2.5.md): `npm run lab:integration`.

Te trzy skrypty wykorzystują część tych samych portów 4221–4225, dlatego uruchamiaj je osobno.

## Warianty protokołu

Na ekranie labu znajdują się dwa widgety z tego samego originu. Wyślij wiadomość z obu i porównaj `event.origin` z `event.source`: origin identyfikuje witrynę, a source konkretne okno. Przeładuj widget i wyślij wiadomość ponownie, aby zobaczyć nowy handshake i stan odbiorcy.

Przyciski widgetu wysyłają poprawną wiadomość, nieznany typ, dodatkowe pola, zbyt długi identyfikator oraz niedozwoloną operację. Odbiorca odrzuca nieznane pola i ogranicza długość oraz format wartości przed aktualizacją widoku. To nadal walidacja schematu, nie autoryzacja: rzeczywisty endpoint musi osobno sprawdzić uprawnienia użytkownika.

Próba MessageChannel tworzy jednorazowy kanał, przekazuje jeden port przez `postMessage` i wymienia kilka wiadomości po porcie. Zamknij kanał, aby zobaczyć, że kolejne wysłanie nie dostarcza odpowiedzi. Portal wyświetla zaakceptowane ID przez `textContent`, więc wartość pozostaje tekstem. Lab nie implementuje wykorzystania danych w URL ani autoryzacji backendu; są to osobne kontrole i nie należy wywodzić ich z walidacji schematu komunikatu.
