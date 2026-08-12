import type { Metadata } from 'next';
import { ReviewTermsPage } from '../../../../src/contracts/review-terms';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Review terms - NEXUM', description: 'Review and save the exact editable NEXUM Contract Version.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractReviewTermsRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SignedInShell><ReviewTermsPage contractId={contractId} /></SignedInShell>;
}
