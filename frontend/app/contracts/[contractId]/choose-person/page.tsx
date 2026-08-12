import type { Metadata } from 'next';
import { AuthoringEntryPage } from '../../../../src/contracts/authoring-entry';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Contract Draft - PactFlow', description: 'Continue an authorised PactFlow Contract Draft.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractChoosePersonRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><AuthoringEntryPage contractId={contractId} /></SignedInShell>;
}
