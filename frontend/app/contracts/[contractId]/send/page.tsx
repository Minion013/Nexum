import type { Metadata } from 'next';
import { SendPage } from '../../../../src/contracts/send';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Send Contract - PactFlow', description: 'Publish a saved PactFlow Contract Draft through an exact-email invitation.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractSendRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><SendPage contractId={contractId} /></SignedInShell>;
}
