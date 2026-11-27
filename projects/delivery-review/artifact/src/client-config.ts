// Fixture jest publiczną konfiguracją klienta. Wartości są celowo fikcyjne.
export const clientConfig = {
  apiBaseUrl: 'https://api.demo.invalid',
  analyticsWriteKey: 'demo_public_key_7f3a',
};

export function documentEndpoint(id: string): string {
  return `${clientConfig.apiBaseUrl}/documents/${encodeURIComponent(id)}`;
}
