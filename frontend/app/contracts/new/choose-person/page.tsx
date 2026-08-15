import type { Metadata } from 'next';
import { AuthoringEntryPage } from '../../../../src/contracts/authoring-entry';

export const metadata: Metadata = { title: 'Choose a Person - NEXUM', description: 'Start a protected NEXUM Contract Draft.' };

export default function NewContractChoosePersonRoute() {
  return <AuthoringEntryPage />;
}
