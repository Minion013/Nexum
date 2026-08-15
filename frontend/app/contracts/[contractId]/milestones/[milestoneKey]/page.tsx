import type { Metadata } from 'next';
import { SignedInShell } from '../../../../../src/signed-in/app-shell';
import { MilestoneReviewPage } from '../../../../../src/contracts/milestone-review';

export const metadata: Metadata = { title: 'Milestone Review - NEXUM', description: 'Review protected milestone evidence and append-only activity.' };

type RouteProps = { params: Promise<{ contractId: string; milestoneKey: string }> };

export default async function MilestoneReviewRoute({ params }: RouteProps) {
  const { contractId, milestoneKey } = await params;
  return <SignedInShell><MilestoneReviewPage contractId={contractId} milestoneKey={milestoneKey} /></SignedInShell>;
}
