import type { Metadata } from 'next';
import { ContractsPage } from '../../src/contracts/contracts';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Contracts - PactFlow', description: 'Authorised PactFlow Contract records.' };

export default function ContractsRoute() {
  return <SignedInShell><ContractsPage /></SignedInShell>;
}
