import type { Metadata } from 'next';
import { ContractAcceptancePage } from '../../../../src/contracts/acceptance';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Contract acceptance - NEXUM', description: 'Review and accept the exact authorised NEXUM Contract Version.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ContractAcceptanceRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><ContractAcceptancePage contractId={contractId} /></SignedInShell>;
}
