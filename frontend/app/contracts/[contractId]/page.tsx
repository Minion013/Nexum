import type { Metadata } from 'next';
import { ContractDetailPage } from '../../../src/contracts/detail';
import { SignedInShell } from '../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Contract detail - PactFlow', description: 'Authorised PactFlow Contract terms and lifecycle.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ContractDetailRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><ContractDetailPage contractId={contractId} /></SignedInShell>;
}
