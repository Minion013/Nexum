import type { Metadata } from 'next';
import { ProjectDetailsHandoffPage } from '../../../../src/contracts/project-details-handoff';

export const metadata: Metadata = { title: 'Project details - NEXUM', description: 'Continue an authorised NEXUM Contract Draft.' };

type RouteProps = { params: Promise<{ contractId: string }> };

export default async function ExistingContractProjectDetailsRoute({ params }: RouteProps) {
  const { contractId } = await params;
  return <ProjectDetailsHandoffPage contractId={contractId} />;
}
