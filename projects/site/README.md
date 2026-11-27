# Origin, site i SameSite

Lab porównuje trzy API z różnych originów. Dwa API używają hosta `localhost` na różnych portach, a trzecie `127.0.0.1`.

## Uruchomienie

W katalogu głównym workspace uruchom Angular pod `http://localhost:4200` i trzy API:

```bash
npm run lab:site
```

Adres scenariusza: `http://localhost:4200/site/(lab//sidebar:hint)`.

## Przebieg

1. W scenariuszu otwórz po kolei trzy strony setup w nowych kartach. Każda ustawia fikcyjne cookie w kontekście top-level.
2. Wróć do laboratorium i wybierz **Wyślij do 3 API**.
3. Porównaj odpowiedź, nagłówek `Cookie` i `Sec-Fetch-Site`. Pusty nagłówek po odpowiedzi API różni się od błędu sieci/CORS.
4. Użyj named outletu, aby otworzyć wskazówkę lub rozwiązanie.

## Przypadki

| API | Origin | Cookie | Cel |
| --- | --- | --- | --- |
| A | `http://localhost:4302` | `SameSite=Lax` | Inny port, ten sam host/site względem aplikacji |
| B | `http://localhost:4303` | `SameSite=Strict` | Porównanie współdzielenia host-only cookies między portami |
| C | `http://127.0.0.1:4304` | `SameSite=Lax`, `Strict`, `None; Secure` | Inny host/site; zachowanie `Secure` na lokalnym HTTP zależy od przeglądarki |

Cookies są host-scoped, a nie port-scoped. A i B mogą widzieć cookies localhost ustawione na obu portach. API zwracają wyłącznie otrzymane cookies o nazwach zaczynających się od `lab_` oraz odebrane `Sec-Fetch-Site`. Pełny nagłówek Cookie sprawdzisz w DevTools. Cookies pozostają w przeglądarce po restarcie; usuń je w DevTools dla obu hostów, aby zacząć od nowa. Żądania Angulara używają `withCredentials`; API zwracają jawny origin i `Access-Control-Allow-Credentials`.
