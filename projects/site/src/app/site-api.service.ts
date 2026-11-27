import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface ApiObservation {
  api: string;
  origin: string | null;
  host: string;
  cookieHeader: string;
  cookies: Record<string, string>;
  secFetchSite: string | null;
  cors: { allowOrigin: string | null; allowCredentials: string | null };
}

@Injectable({ providedIn: 'root' })
export class SiteApiService {
  private readonly http = inject(HttpClient);
  readonly apis = [
    { id: 'lax', label: 'API A · localhost:4302', base: 'http://localhost:4302', cookieName: 'lab_lax', policy: 'Lax' },
    { id: 'strict', label: 'API B · localhost:4303', base: 'http://localhost:4303', cookieName: 'lab_strict', policy: 'Strict' },
    { id: 'loopback', label: 'API C · 127.0.0.1:4304', base: 'http://127.0.0.1:4304', cookieName: 'lab_loopback_none / lax / strict', policy: 'None; Secure / Lax / Strict' },
  ] as const;

  inspect(base: string) {
    return this.http.get<ApiObservation>(`${base}/api/inspect`, { withCredentials: true });
  }
}
