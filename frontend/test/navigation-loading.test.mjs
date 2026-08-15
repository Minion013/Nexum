import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const navigationLoading = await readFile(new URL('../src/navigation/navigation-loading.tsx', import.meta.url), 'utf8').catch(() => '');
const appShell = await readFile(new URL('../src/signed-in/app-shell.tsx', import.meta.url), 'utf8');
const walletRoute = await readFile(new URL('../app/wallet/page.tsx', import.meta.url), 'utf8');

test('the root layout mounts a global loading indicator for internal link transitions', () => {
  assert.match(layout, /NavigationLoading/);
  assert.match(navigationLoading, /addEventListener\(['"]click['"]/);
  assert.match(navigationLoading, /navigation-loading/);
});

test('signed-in shell is owned by a persistent route boundary instead of individual pages', () => {
  assert.match(layout, /SignedInRouteBoundary/);
  assert.match(appShell, /export function SignedInRouteBoundary/);
  assert.doesNotMatch(walletRoute, /SignedInShell/);
});
