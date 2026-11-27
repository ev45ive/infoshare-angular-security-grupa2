# Lab: autoryzacja dostępu do dokumentów

## Cel

Lab porównuje kontrolę interfejsu Angulara z autoryzacją tenantową, obiektową i operacyjną po stronie API. Fikcyjne konta Alice (tenant north) i Bob (tenant south) mają osobne dokumenty. Klient może pominąć kontrolę UI; chronione endpointy sprawdzają sesję, tenant, właściciela, operację i dozwolone pola.

## Uruchomienie

Z katalogu `angular-security-labs` uruchom `npm run lab:idor`, a następnie otwórz `http://localhost:4200`. Aplikacja Angular działa na porcie 4200, a lokalne API Express na porcie 4301.

Sesje i dokumenty są przechowywane w pamięci API. Restart procesu API przywraca początkowe dane.

## Przebieg

1. Zaloguj się jako Alice. Jej lista zawiera dokumenty tenantu north: `DOC-1001` i `DOC-1002`.
2. Otwórz własny dokument z listy i sprawdź w DevTools żądanie oraz odpowiedź.
3. Wpisz `DOC-2001` i wybierz **Otwórz z kontrolą UI**. Interfejs sprawdzi, czy identyfikator znajduje się na pobranej liście; żądanie nie zostanie wysłane.
4. Z tym samym identyfikatorem wybierz **Wyślij do API**. Porównaj odpowiedź `GET /api/documents/DOC-2001`, Network i log Express.
5. Wybierz **Wyślij do chronionego API**. Porównaj odpowiedź `GET /api/solution/documents/DOC-2001` z poprzednią próbą.
6. Powtórz próby jako Bob i sprawdź jego dokument `DOC-2001` oraz dokument Alice `DOC-1001`.
7. W kodzie porównaj kontrolę w `readFromUi()` z decyzją o dostępie w endpointach `server/api.ts`.

## Interpretacja

Kontrola w Angularze wpływa na interfejs i może poprawiać doświadczenie użytkownika, ale klient może pominąć tę kontrolę. API musi sprawdzać uwierzytelnienie i dostęp bieżącego użytkownika do wskazanego obiektu przy każdym żądaniu. Chroniony endpoint zwraca `404` dla nieistniejącego dokumentu i dokumentu innego użytkownika.

## Dodatkowe porównania

- Jako Alice sprawdź DOC-1001 i DOC-1002: lista zwraca dokumenty tenantu north, a szczegół wymaga również właściciela.
- Jako Bob wyślij żądanie o DOC-1001. Endpoint chroniony zwraca 404 dla obcego tenantu; bez sesji API zwraca 401.
- Użyj przycisku PATCH: Alice może zmienić wyłącznie `body` własnego dokumentu. Bob otrzyma 403 dla operacji edit, nawet na własnym dokumencie.
- Zmień żądanie w DevTools lub kodzie, dodając pola albo przekraczając limit długości. API odrzuci kontrakt; odpowiedź sukcesu PATCH zawiera wyłącznie `id`, `title` i `body`.
- Sprawdź żądanie i odpowiedź w Network oraz logi serwera.
