/** Optional local PostgreSQL, isolated to this repository and bound to loopback.
 * No machine service, system account or external database is created. Ctrl+C
 * shuts the cluster down cleanly; data remains in the ignored .local directory.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve('.local/postgres');
mkdirSync(resolve('.local'), { recursive: true });
const database = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'mapsafe',
  password: 'mapsafe_local_only',
  port: 55432,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (error) => console.error(String(error)),
});

// The native PostgreSQL process can outlive its launcher on Windows. Reattach
// only when the listener belongs to this repository's data directory.
async function connectToLocalCluster() {
  const client = new Client({
    host: '127.0.0.1',
    port: 55432,
    user: 'mapsafe',
    password: 'mapsafe_local_only',
    database: 'postgres',
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    const result = await client.query('SHOW data_directory');
    if (resolve(result.rows[0].data_directory).toLowerCase() !== dataDir.toLowerCase()) {
      throw new Error('Port 55432 is occupied by another PostgreSQL data directory.');
    }
    return client;
  } catch (error) {
    await client.end().catch(() => undefined);
    if (error?.code === 'ECONNREFUSED') return null;
    throw error;
  }
}

let client = await connectToLocalCluster();
let startedHere = false;
if (!client) {
  if (!existsSync(resolve(dataDir, 'PG_VERSION'))) await database.initialise();
  try {
    await database.start();
    startedHere = true;
  } catch (error) {
    // Some Windows package versions reject without an error after successfully
    // launching the native server. Probe the actual server before failing.
    client = await connectToLocalCluster();
    if (!client) throw error ?? new Error('Local PostgreSQL failed to start.');
  }
  client ??= await connectToLocalCluster();
  if (!client) throw new Error('Local PostgreSQL did not become ready on port 55432.');
}
for (const name of ['mapsafe', 'mapsafe_test', 'mapsafe_e2e']) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  // Names are fixed constants, never user-controlled SQL identifiers.
  if (result.rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
}
await client.end();
console.log('Local PostgreSQL ready at 127.0.0.1:55432 (mapsafe, mapsafe_test, mapsafe_e2e).');
if (!startedHere) {
  console.log('Using the existing repository-local PostgreSQL process.');
  process.exit(0);
}
console.log('Local credentials: mapsafe / mapsafe_local_only. Keep this terminal open.');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await database.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60_000);
