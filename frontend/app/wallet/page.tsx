import type { Metadata } from 'next';
import { SignedInShell } from '../../src/signed-in/app-shell';
import { WalletPage } from '../../src/wallet/wallet';

export const metadata: Metadata = { title: 'Wallet - NEXUM', description: 'Personal Base Sepolia test-wallet state, kept separate from Contract Escrow Vault funds.' };

export default function WalletRoute() {
  return <SignedInShell><WalletPage /></SignedInShell>;
}
