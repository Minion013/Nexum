import type { Metadata } from 'next';
import { ContractsPage } from '../../src/contracts/contracts';

export const metadata: Metadata = { title: 'Contracts - NEXUM', description: 'Authorised NEXUM Contract records.' };

export default function ContractsRoute() {
  return <ContractsPage />;
}
