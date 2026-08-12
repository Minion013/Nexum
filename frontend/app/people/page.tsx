import type { Metadata } from 'next';
import { PeoplePage } from '../../src/people/people';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'People - PactFlow', description: 'Discover opted-in PactFlow Profiles and manage professional connections.' };

export default function PeopleRoute() {
  return <SignedInShell><PeoplePage /></SignedInShell>;
}
