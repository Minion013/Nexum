import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const frontendRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

await build({
  entryPoints: [
    'app-shell', 'dashboard', 'contracts', 'notifications', 'login', 'contract', 'invitation', 'wallet', 'settings', 'contract-authoring',
    'contract-authoring-flow', 'contract-detail-presentation', 'contract-network', 'contracts-presentation', 'dashboard-presentation',
    'email-code', 'private-avatar', 'profile-identity', 'profile-presentation', 'profile-settings', 'signed-in-navigation'
  ].map(name => resolve(frontendRoot, 'src', 'legacy', `${name}.ts`)),
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outdir: resolve(frontendRoot, 'public'),
  entryNames: '[name].bundle'
});
