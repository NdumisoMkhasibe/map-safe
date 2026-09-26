import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = new URL('../public/', import.meta.url);
await mkdir(output, { recursive: true });
for (const entry of await readdir(output)) {
  if (entry !== '.gitkeep') {
    await rm(join(fileURLToPath(output), entry), { recursive: true, force: true });
  }
}
await cp(new URL('../frontend/dist/', import.meta.url), output, { recursive: true });
