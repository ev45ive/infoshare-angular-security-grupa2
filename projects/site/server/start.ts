import { spawn } from 'node:child_process';
import { join } from 'node:path';

const apiFile = join(__dirname, 'api.ts');
const definitions = [
  { SITE_API_ID: 'lax', SITE_API_PORT: '4302', SITE_COOKIE_NAME: 'lab_lax', SITE_SAMESITE: 'Lax' },
  { SITE_API_ID: 'strict', SITE_API_PORT: '4303', SITE_COOKIE_NAME: 'lab_strict', SITE_SAMESITE: 'Strict' },
  { SITE_API_ID: 'loopback', SITE_API_PORT: '4304', SITE_COOKIE_NAME: 'lab_loopback_none', SITE_SAMESITE: 'None' },
];
const children = definitions.map((config) => spawn(process.execPath, ['--import', 'tsx', apiFile], { stdio: 'inherit', env: { ...process.env, ...config } }));

function stop() {
  for (const child of children) child.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) child.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`Site API exited with code ${code}`);
    stop();
    process.exitCode = code;
  }
});
