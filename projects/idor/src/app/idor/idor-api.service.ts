import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DemoUser {
  id: string;
  name: string;
}

export interface DemoDocument {
  id: string;
  title: string;
  body: string;
  ownerId: string;
  ownerName: string;
}

@Injectable({ providedIn: 'root' })
export class IdorApiService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:4301/api';
  private readonly options = { withCredentials: true };

  login(userId: string): Observable<DemoUser> {
    return this.http.post<DemoUser>(`${this.api}/session`, { userId }, this.options);
  }

  logout(): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.api}/session`, this.options);
  }

  me(): Observable<DemoUser> {
    return this.http.get<DemoUser>(`${this.api}/session`, this.options);
  }

  listDocuments(): Observable<DemoDocument[]> {
    return this.http.get<DemoDocument[]>(`${this.api}/documents`, this.options);
  }

  readVulnerable(id: string): Observable<DemoDocument> {
    return this.http.get<DemoDocument>(
      `${this.api}/documents/${encodeURIComponent(id)}`,
      this.options,
    );
  }

  readProtected(id: string): Observable<DemoDocument> {
    return this.http.get<DemoDocument>(
      `${this.api}/solution/documents/${encodeURIComponent(id)}`,
      this.options,
    );
  }

  editProtected(id: string, body: { body: string }): Observable<Pick<DemoDocument, 'id' | 'title' | 'body'>> {
    return this.http.patch<Pick<DemoDocument, 'id' | 'title' | 'body'>>(
      `${this.api}/solution/documents/${encodeURIComponent(id)}`,
      body,
      this.options,
    );
  }
}
