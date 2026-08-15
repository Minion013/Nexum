import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const walletRoute = await readFile(new URL('../src/wallet/wallet.tsx', import.meta.url), 'utf8');

test('Wallet keeps the provider dormant until the user requests a connection', () => {
  assert.match(walletRoute, /walletConnectionRequested/);
  assert.match(walletRoute, /setWalletConnectionRequested\(true\)/);
  assert.match(walletRoute, /if \(!walletConnectionRequested\)/);
});
