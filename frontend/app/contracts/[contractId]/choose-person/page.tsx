import type { Metadata } from 'next';
import { AuthoringEntryPage } from '../../../../src/contracts/authoring-entry';

export const metadata: Metadata = { title: 'Contract Draft - NEXUM', description: 'Continue an authorised NEXUM Contract Draft.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractChoosePersonRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <AuthoringEntryPage contractId={contractId} />;
}
