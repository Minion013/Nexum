import type { Metadata } from 'next';
import { SendPage } from '../../../../src/contracts/send';

export const metadata: Metadata = { title: 'Send Contract - NEXUM', description: 'Publish a saved NEXUM Contract Draft through an exact-email invitation.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractSendRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <SendPage contractId={contractId} />;
}
