import type { Metadata } from 'next';
import { ProjectDetailsHandoffPage } from '../../../../src/contracts/project-details-handoff';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Project details - PactFlow', description: 'Continue an authorised PactFlow Contract Draft.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractProjectDetailsRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><ProjectDetailsHandoffPage contractId={contractId} /></SignedInShell>;
}
