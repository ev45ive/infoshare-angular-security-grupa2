import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const api = 'http://localhost:4304';

@Component({ selector: 'http-boundary-experiment', imports: [RouterLink], template: `
  <a routerLink="/">Eksperymenty</a><h1>Origin i rodzaj żądania</h1>
  <p>Nawigacja ramki, formularz i fetch trafiają do kontrolowanego API. Ten sam host z innym portem jest cross-origin, a <code>127.0.0.1</code> i <code>localhost</code> pozwalają porównać inny site. Serwer celowo nie udostępnia odpowiedzi przez CORS.</p>
  <pre>{{ result() }}</pre><p>Log serwera pokazuje dotarcie żądania. Błąd odczytu nie stwierdza, czy operacja była autoryzowana; ten endpoint nie realizuje autoryzacji.</p>
` })
export class HttpBoundaryExperiment {
  readonly result = signal('Wykonywanie prób…');
  constructor() { void this.run(); }
  private async run(): Promise<void> {
    const run = crypto.randomUUID();
    const frames: HTMLIFrameElement[] = [];
    const load = (form: boolean): Promise<string> => new Promise(resolve => {
      const iframe = document.createElement('iframe'); iframe.hidden = true;
      iframe.name = `g1-probe-${form ? 'form' : 'navigation'}`; frames.push(iframe);
      iframe.onload = () => {
        try { if (iframe.contentWindow!.location.href === 'about:blank') return; resolve(`Dokument: ${iframe.contentWindow!.document.title}`); }
        catch { resolve('Dokument dotarł do ramki; odczyt DOM z innego originu zablokowany.'); }
      };
      if (!form) iframe.src = `${api}/http-probe?kind=navigation&run=${run}`;
      document.body.appendChild(iframe);
      if (form) {
        const element = document.createElement('form'); element.method = 'POST'; element.action = `${api}/http-probe?kind=form&run=${run}`; element.target = iframe.name;
        document.body.appendChild(element); element.submit(); element.remove();
      }
    });
    try {
      const navigation = await load(false);
      const form = await load(true);
      let fetchResult = '';
      try { const response = await fetch(`${api}/http-probe?kind=fetch&run=${run}`); fetchResult = `Dostęp HTTP ${response.status}`; }
      catch { fetchResult = 'Brak dostępu do odpowiedzi fetch (sprawdź Console i log serwera).'; }
      let otherSite = '';
      try { await fetch(`http://127.0.0.1:4304/http-probe?kind=cross-site&run=${run}`); otherSite = 'Odpowiedź dostępna'; }
      catch { otherSite = 'Odpowiedź niedostępna. Log API pokaże, czy żądanie dotarło.'; }
      const serverEvents = await fetch(`${api}/http-events?run=${run}`).then(r => r.json());
      this.result.set(JSON.stringify({ appOrigin: location.origin, apiOrigin: new URL(api).origin, navigation, form, fetchResult, otherSite, serverEvents }, null, 2));
    } catch (error) { this.result.set(`Nie udało się wykonać próby: ${String(error)}`); }
    finally { frames.forEach(frame => frame.remove()); }
  }
}

@Component({ selector: 'storage-experiment', imports: [RouterLink], template: `
  <a routerLink="/">Eksperymenty</a><h1>Storage i dostęp JavaScriptu</h1>
  <p>Fikcyjne wartości pokazują pamięć nowej instancji, sessionStorage, localStorage i cookies. Odśwież stronę: wynik zawiera wartości sprzed tego uruchomienia.</p>
  <pre>{{ result() }}</pre><p>HttpOnly ogranicza odczyt cookie przez JavaScript; nie uniemożliwia wykonywania żądań w sesji. Żadne wartości nie są poświadczeniami.</p>
` })
export class StorageExperiment {
  readonly result = signal('Wykonywanie próby…');
  constructor() { void this.run(); }
  private async run(): Promise<void> {
    try {
      const key = 'g1_demo_storage';
      const previous = { memory: null, sessionStorage: sessionStorage.getItem(key), localStorage: localStorage.getItem(key) };
      sessionStorage.setItem(key, 'sesja-karty'); localStorage.setItem(key, 'po-odswiezeniu');
      await fetch(`${api}/storage-cookie`, { credentials: 'include' });
      const visible = document.cookie.split('; ').filter(c => c.startsWith('g1_visible_demo=') || c.startsWith('g1_http_only_demo='));
      this.result.set(JSON.stringify({ previous, current: { memory: 'instancja', sessionStorage: sessionStorage.getItem(key), localStorage: localStorage.getItem(key), javascriptCookies: visible }, httpOnly: 'API wysłało Set-Cookie dla g1_http_only_demo; sprawdź zapis w DevTools. Cookie HttpOnly nie jest widoczne w document.cookie.' }, null, 2));
    } catch (error) { this.result.set(`Błąd storage lub API: ${String(error)}`); }
  }
}

@Component({ selector: 'cache-experiment', imports: [RouterLink], template: `
  <a routerLink="/">Eksperymenty</a><h1>Cache HTTP i pamięć aplikacji</h1>
  <p>Każda próba wykonuje dwa odczyty fikcyjnej odpowiedzi. Log API odróżnia brak ponownego żądania od rewalidacji 304; zachowanie zależy od przeglądarki i ustawień DevTools.</p>
  <pre>{{ result() }}</pre><p>Zmiana konta nie usuwa automatycznie wartości już zapisanej w pamięci aplikacji. <code>no-cache</code> pozwala zapisać odpowiedź, ale wymaga walidacji; <code>no-store</code> dotyczy cache HTTP.</p>
` })
export class CacheExperiment {
  readonly result = signal('Wykonywanie prób…');
  constructor() { void this.run(); }
  private async run(): Promise<void> {
    try {
      const run = crypto.randomUUID();
      const results: Record<string, unknown> = {};
      for (const policy of ['no-store', 'no-cache', 'private']) {
        const responses = [];
        for (let i = 0; i < 2; i++) {
          const response = await fetch(`${api}/cache-probe/${policy}?run=${run}`);
          responses.push({ status: response.status, data: await response.json() });
        }
        results[policy] = responses;
      }
      const memory = { account: 'Alice', value: 'fikcyjne dane Alice' };
      results['memoryAfterSwitchToBob'] = memory;
      results['serverLog'] = await fetch(`${api}/cache-events?run=${run}`).then(r => r.json());
      this.result.set(JSON.stringify(results, null, 2));
    } catch (error) { this.result.set(`Błąd próby: ${String(error)}`); }
  }
}
