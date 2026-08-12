import type { Metadata } from 'next';
import { SendPage } from '../../../../src/contracts/send';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Contract Send - NEXUM', description: 'Continue to a saved NEXUM Contract Draft before publishing.' };

type RouteProps = { searchParams: Promise<{ contractId?: string | string[] }> };

export default async function NewContractSendRoute({ searchParams }: RouteProps) {
  const query = await searchParams;
  const contractId = typeof query.contractId === 'string' ? query.contractId : undefined;
  return <SignedInShell><SendPage contractId={contractId} /></SignedInShell>;
}
