import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const webRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

await build({
  entryPoints: [join(webRoot, 'public', 'app.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: join(webRoot, 'public', 'app.bundle.js')
});
