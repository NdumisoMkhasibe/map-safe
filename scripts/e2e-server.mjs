/** Launch the two workspaces against an explicitly isolated E2E database.
 * This runner never resets or drops a database; tests clean up their own records.
 */
import { spawn } from 'node:child_process';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl)
  throw new Error('E2E_DATABASE_URL is required (use mapsafe_e2e or mapsafe_test).');
const parsed = new URL(databaseUrl);
if (!/^\/mapsafe_(e2e|test)$/.test(parsed.pathname)) {
  throw new Error(
    'E2E_DATABASE_URL must target mapsafe_e2e or mapsafe_test, never a live database.',
  );
}
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  ENABLE_DEV_AUTH: 'true',
  PORT: '4301',
  HOST: '127.0.0.1',
  FRONTEND_ORIGIN: 'http://127.0.0.1:4173',
  GEOCODING_PROVIDER: 'disabled',
  VITE_ENABLE_DEV_AUTH: 'true',
  VITE_API_PROXY_TARGET: 'http://127.0.0.1:4301',
  VITE_MAP_STYLE_URL: 'http://127.0.0.1:4173/e2e-map-style.json',
};

function npm(args) {
  // Windows needs the .cmd launcher. Arguments here are fixed by this script,
  // never derived from requests or user input.
  return spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = npm(args);
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} failed (${code})`)),
    );
  });
}
await run(['run', 'db:deploy']);
await run(['run', 'db:seed']);
const children = [
  npm(['run', 'dev:backend']),
  npm(['run', 'dev', '--workspace', 'frontend', '--', '--port', '4173', '--strictPort']),
];
function stop() {
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    stop();
    process.exitCode = code ?? 0;
  });
}
