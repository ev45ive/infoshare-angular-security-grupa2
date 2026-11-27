import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const authServer = 'http://localhost:4305';
const callback = 'http://localhost:4201/pkce';
const key = 'pkce-demo-transaction';

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

@Component({
  selector: 'pkce-experiment',
  imports: [RouterLink],
  template: `
    <a routerLink="/">Eksperymenty</a>
    <h1>Authorization Code + PKCE</h1>
    <p>Klient generuje jednorazowy verifier, a serwer autoryzacji otrzymuje jego skrót S256. Po przekierowaniu kod jest wymieniany wraz z verifierem.</p>
    <p>Próba osoby mającej tylko przechwycony kod używa innego verifiera. Poprawny verifier pozostaje w tej karcie; samo posiadanie kodu nie wystarcza do wymiany.</p>
    <p>PKCE nie chroni przed kodem działającym w samej aplikacji i nie zastępuje sprawdzenia state, redirect URI ani pozostałych kontroli protokołu. To lokalny, uproszczony serwer demonstracyjny, nie IdP produkcyjny.</p>
    <pre>{{ trace() }}</pre>
    <a href="/pkce">Uruchom nowy przepływ</a>
  `,
})
export class PkceExperiment implements OnInit {
  trace = signal('Trwa przepływ…');

  async ngOnInit(): Promise<void> {
    try {
      const query = new URLSearchParams(location.search);
      const code = query.get('code');
      if (!code) {
        const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
        const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
        const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
        sessionStorage.setItem(key, JSON.stringify({ verifier, state, challenge }));
        const params = new URLSearchParams({ response_type: 'code', client_id: 'demo-spa', redirect_uri: callback, state, code_challenge: challenge, code_challenge_method: 'S256' });
        location.assign(`${authServer}/authorize?${params}`);
        return;
      }
      const raw = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      history.replaceState(null, '', '/pkce');
      if (!raw) throw new Error('Brak rozpoczętej transakcji w tej karcie.');
      const tx: { verifier: string; state: string; challenge: string } = JSON.parse(raw);
      if (query.get('state') !== tx.state) throw new Error('State nie odpowiada rozpoczętej transakcji.');
      const exchange = async (verifier: string) => {
        const response = await fetch(`${authServer}/token`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', client_id: 'demo-spa', redirect_uri: callback, code, code_verifier: verifier }),
        });
        return { status: response.status, body: await response.json() };
      };
      const attacker = await exchange('A'.repeat(43));
      const client = await exchange(tx.verifier);
      const replay = await exchange(tx.verifier);
      this.trace.set(JSON.stringify({ challenge: tx.challenge, callback: 'Odebrano code i zgodny state', 'próba bez verifiera': attacker, 'klient z verifierem': client, 'ponowne użycie code': replay }, null, 2));
    } catch (error) {
      this.trace.set(`Błąd: ${String(error)}`);
    }
  }
}
