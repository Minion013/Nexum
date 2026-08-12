import type { Metadata } from 'next';
import { PeoplePage } from '../../src/people/people';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'People - NEXUM', description: 'Discover opted-in NEXUM Profiles and manage professional connections.' };

export default function PeopleRoute() {
  return <SignedInShell><PeoplePage /></SignedInShell>;
}
