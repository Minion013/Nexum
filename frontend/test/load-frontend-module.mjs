import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);

export async function loadFrontendModule(relativePath, { external = [], jsx = false } = {}) {
  const sourcePath = resolve(frontendRoot, relativePath);
  const contents = await readFile(sourcePath, 'utf8');
  const extension = sourcePath.endsWith('.tsx') ? 'tsx' : 'ts';
  const result = await build({
    stdin: {
      contents,
      loader: extension,
      resolveDir: dirname(sourcePath),
      sourcefile: basename(sourcePath)
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    jsx: jsx ? 'automatic' : undefined,
    write: false,
    external
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
