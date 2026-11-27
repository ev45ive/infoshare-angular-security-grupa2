# G1 · Sesje, CORS i CSRF

Dwa samodzielne, prowadzone laby pokazują cykl sesji oraz różnicę między dostępem do odpowiedzi kontrolowanym przez CORS a ochroną mutacji przed CSRF. Serwer Express udostępnia trzy lokalne originy i zapisuje stan sesji wyłącznie w pamięci.

## Wymagania i uruchomienie

Uruchom polecenie z katalogu głównego repozytorium `angular-security-labs`. Wymagane są zainstalowane zależności projektu (`express`, `tsx`, typy Node i Express).

```powershell
npm run lab:g1-sessions
```

Otwórz `http://localhost:4310/` dla L1.1 albo `http://localhost:4312/` dla L1.2. API działa pod `http://localhost:4311`. Zatrzymaj wszystkie trzy nasłuchujące originy przez `Ctrl+C`.

| Rola | Origin | Zastosowanie |
| --- | --- | --- |
| Aplikacja | `http://localhost:4310` | Zarządzanie sesją i poprawna mutacja z tokenem CSRF |
| API | `http://localhost:4311` | Cookie sesji, CORS, kontrola CSRF i log stanu |
| Obcy origin | `http://localhost:4312` | Formularz cross-origin i próba odczytu odpowiedzi |

Trzy originy mają ten sam host i schemat, ale porty są różne. Są więc cross-origin i same-site. Cookie jest host-only dla `localhost`, a cookies nie są izolowane portem: API może ustawić cookie, które przeglądarka dołączy także do żądań wysłanych z pozostałych portów. Serwery nasłuchują na `127.0.0.1`.

## L1.1 · Cookie i cykl sesji

1. W aplikacji wybierz **Utwórz sesję**. W Network znajdź `POST /session/start` i `Set-Cookie`; w DevTools → Application → Cookies sprawdź cookie `g1_session` dla `localhost`.
2. Wybierz **Odczytaj stan API**. Porównaj `Cookie` w żądaniu z odpowiedzią API. Aplikacja nie może odczytać wartości cookie, ponieważ ma ono `HttpOnly`; przeglądarka wysyła je przy `credentials: include`.
3. Wybierz **Zmień identyfikator sesji**, a następnie ponownie odczytaj stan. API usuwa poprzednią sesję i zapisuje nową. **Wyloguj** unieważnia sesję po stronie serwera i wygasza cookie.
4. W kodzie [server.ts](server.ts) zmień atrybut cookie i powtórz obserwację `Set-Cookie` oraz kolejnych żądań. Path nie jest granicą dostępu między originami. Restart procesu resetuje mapę sesji, ale cookie przeglądarki może pozostać.

Cookie demonstracyjne: host-only, `Path=/; HttpOnly; SameSite=Lax`; nie ma atrybutu `Secure`, ponieważ serwer używa lokalnego HTTP. Sesje i identyfikatory są fikcyjne i trzymane w pamięci.

## L1.2 · CORS i CSRF jako różne granice

1. Utwórz sesję w aplikacji, po czym otwórz obcy origin pod `localhost:4312`.
2. Wyślij formularz do `/unsafe-mutation`. To kontrolowany endpoint demonstracyjny bez ochrony CSRF: żądanie formularza może dotrzeć z cookie, mimo że obcy skrypt nie uzyskuje dostępu do odpowiedzi. W API sprawdź nową wartość `changes` i log `UNSAFE_MUTATION_APPLIED`.
3. Użyj przycisku odczytu API na stronie obcego originu. Przeglądarka blokuje skryptowi odczyt odpowiedzi, bo API nie dopuszcza tego originu w CORS. Sam prosty GET nadal może dotrzeć; sprawdź Network oraz log `SESSION_READ`.
4. W aplikacji wykonaj **chronioną mutację**. Przeglądaj `OPTIONS` i `PATCH`: preflight dopuszcza origin aplikacji, metodę i `X-Lab-CSRF`; API dodatkowo wymaga prawidłowego `Origin` i tokenu związanego z sesją. Porównaj stan odpowiedzi API przed i po mutacji.

CORS zarządza tym, czy przeglądarka udostępni odpowiedź kodowi strony. Nie jest autoryzacją ani ochroną przed wysłaniem prostego żądania. Mutująca trasa chroniona sprawdza warunki po stronie serwera.

## Logi i zakres

Logi mają prefiksy `[G1 APP]`, `[G1 API]` i `[G1 EVIL]`; API opisuje metodę, ścieżkę, origin, obecność cookie, preflight i wynik sesji/mutacji. Serwer nie wypisuje wartości cookie ani tokenu CSRF.

Warianty cookie można ustawić i usunąć na ekranie: host-only, Domain, Path, HttpOnly, Secure, Lax i Strict. Porównaj nazwy wysłane do dwóch ścieżek z nazwami widocznymi w JavaScript oraz atrybutami w DevTools. SameSite w kontekście cross-site i HTTPS można porównać w [labie integracji G2](../browser-integration/G2-L2.4-L2.5.md); localhost może być traktowany szczególnie przez przeglądarkę. Oprócz tokenu synchronizacyjnego lab porównuje cookie `g1_xsrf` i nagłówek `X-XSRF-TOKEN` z tokenem sesji oraz pokazuje poprawną, pustą i błędną dla credentials konfigurację CORS. Sprawdzenie Origin ma fallback do Referer dla tokenu synchronizacyjnego.

Skrypt npm uruchamia trzy procesy z osobnymi kolorami i tagami `APP`, `API` oraz `EVIL`.
