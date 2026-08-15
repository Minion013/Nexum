import type { Metadata } from 'next';
import { ProjectDetailsHandoffPage } from '../../../../src/contracts/project-details-handoff';
import { NewContractStepUnavailable } from '../../../../src/contracts/new-step';

export const metadata: Metadata = { title: 'Project details - NEXUM', description: 'Continue a saved NEXUM Contract Draft.' };

type RouteProps = { searchParams: Promise<{ contractId?: string | string[] }> };

export default async function NewContractProjectDetailsRoute({ searchParams }: RouteProps) {
  const query = await searchParams;
  const contractId = typeof query.contractId === 'string' ? query.contractId : undefined;
  return contractId ? <ProjectDetailsHandoffPage contractId={contractId} /> : <NewContractStepUnavailable step="Project details" />;
}
