import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const webRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

await build({
  entryPoints: [join(webRoot, 'public', 'home.js'), join(webRoot, 'public', 'login.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outdir: join(webRoot, 'public'),
  entryNames: '[name].bundle'
});
