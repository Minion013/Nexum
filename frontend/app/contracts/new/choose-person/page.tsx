import type { Metadata } from 'next';
import { AuthoringEntryPage } from '../../../../src/contracts/authoring-entry';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Choose a Person - PactFlow', description: 'Start a protected PactFlow Contract Draft.' };

export default function NewContractChoosePersonRoute() {
  return <SignedInShell><AuthoringEntryPage /></SignedInShell>;
}
