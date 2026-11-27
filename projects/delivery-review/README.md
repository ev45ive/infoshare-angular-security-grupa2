# G3: review i delivery podglądu dokumentu

Samodzielny, lokalny zestaw demonstracji L3.1–L3.4 i automatycznego eksperymentu E3.1. Przykładem jest niewielka zmiana przepływu podglądu dokumentu: wybór identyfikatora, decyzja API, renderowanie opisu, build klienta, granice CI i końcowa odpowiedź HTTP.

## Uruchomienie

Z katalogu `angular-security-labs`, przy zainstalowanych już zależnościach workspace:

```powershell
npm run lab:delivery-review
```

Otwórz `http://127.0.0.1:4307`. `Ctrl+C` zatrzymuje portal i widget na porcie 4308. Skrypt kompiluje TypeScript klienta i fixture artefaktu, a następnie uruchamia oba procesy przez `tsx` z oznaczonymi logami.

## Zawartość

- L3.1 prowadzi od wymagania do zagrożenia, kontroli, właściciela, testu i ryzyka resztkowego z perspektywą STRIDE.
- L3.2 pokazuje diff, widget z osobnego originu, walidację wiadomości, chronione i niechronione API, cel URL oraz konteksty renderowania.
- L3.3 porównuje fixture lockfile/workflow, zależności przechodnie i skrypty instalacyjne oraz lokalną symulację granicy PR/release, cache, artefaktu i provenance. Żaden workflow nie jest wykonywany.
- E3.1 automatycznie skanuje źródło, skompilowany bundle klienta i source mapę pod kątem jawnie fikcyjnej konfiguracji.
- L3.4 pokazuje nagłówki serwera, warianty środowiska, kontrolowaną atrapę zmiany nagłówka przez proxy, odpowiedź błędu, alert i oś reakcji na incydent.

Kod serwera i UI jest w TypeScript; `npm run lab` generuje lokalne pliki JS potrzebne przeglądarce. Wszystkie dane, domeny i konfiguracje są fikcyjne. Serwer nasłuchuje wyłącznie na `127.0.0.1`.

## Zakres dowodu

Obserwacja lokalnego endpointu potwierdza wyłącznie zachowanie tej fixture. Statyczny workflow i symulacja nie dowodzą bezpieczeństwa rzeczywistego CI. Lokalna odpowiedź nie dowodzi konfiguracji CDN/proxy ani produkcyjnego deploymentu. Zestaw nie uruchamia prawdziwego pipeline’u, zewnętrznych zależności, deployu ani poświadczeń.

