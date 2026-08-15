import type { Metadata } from 'next';
import { ContractDetailPage } from '../../../src/contracts/detail';

export const metadata: Metadata = { title: 'Contract detail - NEXUM', description: 'Authorised NEXUM Contract terms and lifecycle.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ContractDetailRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <ContractDetailPage contractId={contractId} />;
}
