import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = process.cwd();
const port = 4307;
const demoDocuments = {
  doc_42: { tenant: 'A', title: 'Plan migracji', description: 'Wersja zatwierdzona do przeglądu.' },
  doc_84: { tenant: 'B', title: 'Budżet zespołu', description: 'Dokument organizacji B.' },
} as const;
type IncidentAction = 'pause' | 'rollback' | 'rotate' | 'reset';
const incidentState = { paused: false, artifact: 'web-2026.11.26.3', demoCredential: 'active' as 'active' | 'rotated', events: [] as string[] };
const eventsFixture = resolve(root, 'fixtures/incident-events.json');

function headers(res: ServerResponse, isHtml = false): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  if (isHtml) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-src http://127.0.0.1:4308; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  }
}

function send(res: ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8', isHtml = false): void {
  headers(res, isHtml);
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function json(res: ServerResponse, status: number, value: unknown): void {
  send(res, status, JSON.stringify(value));
}

async function artifactScan(): Promise<object> {
  const paths = [
    ['źródło', resolve(root, 'artifact/src/client-config.ts')],
    ['bundle', resolve(root, 'artifact/browser/client-config.js')],
    ['source map', resolve(root, 'artifact/browser/client-config.js.map')],
  ] as const;
  const matches = await Promise.all(paths.map(async ([label, path]) => ({ label, found: (await readFile(path, 'utf8')).includes('demo_public_key_7f3a') })));
  return { marker: 'demo_public_key_7f3a', markerFound: matches.some((item) => item.found), checkedFiles: matches.map((item) => item.label), matches };
}

async function ciSimulation(): Promise<object> {
  const workflow = await readFile(resolve(root, 'fixtures/ci-workflow.yml'), 'utf8');
  const lock = await readFile(resolve(root, 'fixtures/dependencies.lock.json'), 'utf8');
  const boundary = JSON.parse(await readFile(resolve(root, 'fixtures/ci-boundaries.json'), 'utf8')) as {
    pullRequest: { source: string; permissions: string; lifecycleScriptsEnabled: boolean; cacheKey: string; artifact: string; provenanceVerified: boolean };
    release: { source: string; permissions: string; lifecycleScriptsEnabled: boolean; cacheKey: string; artifact: string; provenanceVerified: boolean };
  };
  const dependencyTree = JSON.parse(lock) as { packages: Record<string, { dependencies?: Record<string, string>; hasInstallScript?: boolean }> };
  const permissionsReadOnly = /contents:\s*read/.test(workflow) && !/contents:\s*write/.test(workflow);
  const hasInstallScriptsFlag = /ignore-scripts/.test(workflow);
  const secretReferences = /\bsecrets\s*\./.test(workflow);
  return {
    fixture: 'fixtures/ci-workflow.yml + fixtures/dependencies.lock.json',
    workflowExecuted: false,
    dependencyVersionPinned: lock.includes('"version": "2.4.1"'),
    lockfileIntegrityPresent: lock.includes('"integrity"'),
    pullRequestPermissions: permissionsReadOnly ? 'read-only' : 'review required',
    secretReferencesInFixture: secretReferences,
    installScriptsExplicitlyDisabled: hasInstallScriptsFlag,
    transitiveDependency: dependencyTree.packages['node_modules/preview-renderer']?.dependencies,
    transitiveHasInstallScript: Boolean(dependencyTree.packages['node_modules/render-helper']?.hasInstallScript),
    boundary,
    untrustedPullRequestHasWrite: boundary.pullRequest.source === 'untrusted-pr' && boundary.pullRequest.permissions === 'write',
    sharedCacheKey: boundary.pullRequest.cacheKey === boundary.release.cacheKey,
    untrustedArtifactUsedForRelease: boundary.pullRequest.artifact === boundary.release.artifact,
    provenance: 'Pola fixture pokazują deklarowany stan, a nie kryptograficzną weryfikację pochodzenia.',
    observations: [
      'Lockfile odtwarza wskazaną wersję i zawiera pole integralności; nie dowodzi bezpieczeństwa pakietu ani rejestru.',
      'To statyczna inspekcja fixture, nie dowód uprawnień ani dostępności sekretów na platformie CI.',
      hasInstallScriptsFlag ? 'Fixture zawiera tekst --ignore-scripts; sprawdź jego położenie i działanie.' : 'npm ci może uruchamiać lifecycle scripts; fixture nie deklaruje --ignore-scripts, więc tę decyzję trzeba osobno ocenić.',
    ],
  };
}

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const actor = req.headers['x-demo-actor'] === 'bartek' ? 'bartek' : req.headers['x-demo-actor'] === 'anna' ? 'anna' : 'guest';
  console.log(`${req.method ?? 'GET'} ${url.pathname} actor=${actor}`);

  if (url.pathname === '/' && req.method === 'GET') {
    const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
    return send(res, 200, html, 'text/html; charset=utf-8', true);
  }
  if (url.pathname.startsWith('/assets/')) {
    const relative = url.pathname.slice('/assets/'.length);
    const candidate = resolve(root, 'public', relative);
    if (!candidate.startsWith(resolve(root, 'public') + sep)) return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    try {
      const type = extname(candidate) === '.js' ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8';
      return send(res, 200, await readFile(candidate, 'utf8'), type);
    } catch { return send(res, 404, 'not found', 'text/plain; charset=utf-8'); }
  }
  if (url.pathname.startsWith('/api/documents/')) {
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
    const id = decodeURIComponent(url.pathname.slice('/api/documents/'.length));
    if (!/^doc_[0-9]{2}$/.test(id)) return json(res, 400, { error: 'invalid_document_id' });
    const document = demoDocuments[id as keyof typeof demoDocuments];
    if (!document) return json(res, 404, { error: 'not_found' });
    const permitted = (actor === 'anna' && document.tenant === 'A') || (actor === 'bartek' && document.tenant === 'B');
    if (!permitted) {
      console.log(`decision=deny actor=${actor} tenant=${document.tenant} id=${id}`);
      return json(res, 404, { error: 'not_found' });
    }
    console.log(`decision=allow actor=${actor} tenant=${document.tenant} id=${id}`);
    return json(res, 200, { id, title: document.title, description: document.description });
  }
  if (url.pathname.startsWith('/api/insecure-documents/') && req.method === 'GET') {
    const id = url.pathname.slice('/api/insecure-documents/'.length);
    const document = demoDocuments[id as keyof typeof demoDocuments];
    console.log(`decision=unguarded actor=${actor} id=${id}`);
    return document ? json(res, 200, { id, ...document }) : json(res, 404, { error: 'not_found' });
  }
  if (url.pathname === '/api/artifact-scan' && req.method === 'GET') return json(res, 200, await artifactScan());
  if (url.pathname === '/api/ci-simulation' && req.method === 'GET') return json(res, 200, await ciSimulation());
  if (url.pathname === '/api/response-demo' && req.method === 'GET') {
    const environment = url.searchParams.get('env') === 'staging' ? 'staging' : 'production';
    const proxy = url.searchParams.get('proxy') === 'strip' ? 'strip' : 'pass';
    const status = url.searchParams.get('status') === 'error' ? 500 : 200;
    res.setHeader('Content-Security-Policy', environment === 'staging' ? "default-src 'self'; frame-ancestors 'none'" : "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', environment === 'staging' ? 'private, max-age=60' : 'no-store');
    if (proxy === 'strip') res.removeHeader('Content-Security-Policy');
    console.log(`response_demo env=${environment} proxy=${proxy} status=${status} authorization_logged=false`);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify({ environment, proxy, status, message: status === 500 ? 'Kontrolowany błąd demonstracyjny' : 'Odpowiedź demonstracyjna' }));
    return;
  }
  if (url.pathname === '/api/alert-simulation' && req.method === 'GET') {
    const deployed = url.searchParams.get('deployed') === 'true';
    const present = url.searchParams.get('present') !== 'false';
    const conclusion = !present ? 'Kontrolowany inwentarz nie zawiera wskazanej zależności: fałszywe dopasowanie w tej symulacji.' : deployed ? 'Sprawdź rzeczywistą ekspozycję i użycie zależności.' : 'Brak dowodu wdrożenia artefaktu; zweryfikuj inwentarz przed eskalacją.';
    return json(res, 200, { alert: 'Fikcyjna podatność zależności', artifactDeployed: deployed, dependencyPresentInFixture: present, conclusion, authorizationHeaderLogged: false, urlPathLogged: true });
  }
  if (url.pathname === '/api/incidents' && req.method === 'GET') {
    const fixture = JSON.parse(await readFile(eventsFixture, 'utf8')) as unknown[];
    return json(res, 200, { preparedEvents: fixture, localActions: incidentState.events, activeArtifact: incidentState.artifact, deployPaused: incidentState.paused, demoCredential: incidentState.demoCredential });
  }
  if (url.pathname.startsWith('/api/incident/') && req.method === 'POST') {
    const action = url.pathname.slice('/api/incident/'.length) as IncidentAction;
    if (!['pause', 'rollback', 'rotate', 'reset'].includes(action)) return json(res, 400, { error: 'unknown_action' });
    if (action === 'pause') incidentState.paused = true;
    if (action === 'rollback') incidentState.artifact = 'web-2026.11.25.8';
    if (action === 'rotate') incidentState.demoCredential = 'rotated';
    if (action === 'reset') { incidentState.paused = false; incidentState.artifact = 'web-2026.11.26.3'; incidentState.demoCredential = 'active'; incidentState.events.length = 0; }
    incidentState.events.push(`${new Date().toISOString()} action=${action}`);
    console.log(`incident_action=${action}`);
    return json(res, 200, { action, deployPaused: incidentState.paused, activeArtifact: incidentState.artifact, demoCredential: incidentState.demoCredential, note: action === 'rollback' ? 'Rollback artefaktu nie zmienił stanu fikcyjnego credentiala.' : 'Stan lokalnej symulacji; brak prawdziwego deployu lub poświadczeń.' });
  }
  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' });
  if (url.pathname.startsWith('/artifact/')) return send(res, 404, 'fixture source is not public', 'text/plain; charset=utf-8');
  if (url.pathname === '/favicon.ico') return send(res, 204, '');
  return send(res, 404, JSON.stringify({ error: 'not_found' }));
}

createServer((req, res) => { void requestHandler(req, res).catch((error: unknown) => {
  console.error('request_failed', error instanceof Error ? error.message : 'unknown');
  json(res, 500, { error: 'internal_error' });
}); }).listen(port, '127.0.0.1', () => console.log(`delivery-review listening at http://127.0.0.1:${port}`));
