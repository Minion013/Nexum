import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const webRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

await build({
  entryPoints: [join(webRoot, 'public', 'app-shell.js'), join(webRoot, 'public', 'home.js'), join(webRoot, 'public', 'workspace.js'), join(webRoot, 'public', 'login.js'), join(webRoot, 'public', 'contract.js'), join(webRoot, 'public', 'invitation.js'), join(webRoot, 'public', 'wallet.js')],
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  outdir: join(webRoot, 'public'),
  entryNames: '[name].bundle'
});
