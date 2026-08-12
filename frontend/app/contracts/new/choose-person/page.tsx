import type { Metadata } from 'next';
import { AuthoringEntryPage } from '../../../../src/contracts/authoring-entry';
import { SignedInShell } from '../../../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Choose a Person - NEXUM', description: 'Start a protected NEXUM Contract Draft.' };

export default function NewContractChoosePersonRoute() {
  return <SignedInShell><AuthoringEntryPage /></SignedInShell>;
}
