import type { Metadata } from 'next';
import { ReviewTermsPage } from '../../../../src/contracts/review-terms';
import { NewContractStepUnavailable } from '../../../../src/contracts/new-step';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Review terms - NEXUM', description: 'Review the exact saved NEXUM Contract Version.' };

type RouteProps = { searchParams: Promise<{ contractId?: string | string[] }> };

export default async function NewContractReviewTermsRoute({ searchParams }: RouteProps) {
  const query = await searchParams;
  const contractId = typeof query.contractId === 'string' ? query.contractId : undefined;
  return <SignedInShell>{contractId ? <ReviewTermsPage contractId={contractId} /> : <NewContractStepUnavailable step="Review terms" />}</SignedInShell>;
}
