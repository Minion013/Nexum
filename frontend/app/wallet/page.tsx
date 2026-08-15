import type { Metadata } from 'next';
import { WalletPage } from '../../src/wallet/wallet';

export const metadata: Metadata = { title: 'Wallet - NEXUM', description: 'Personal Base Sepolia test-wallet state, kept separate from Contract Escrow Vault funds.' };

export default function WalletRoute() {
  return <WalletPage />;
}
