import type { Metadata } from 'next';
import { AuthoritiesPage } from '../../src/authorities/authorities';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Authorities - NEXUM', description: 'Published NEXUM Resolution Authorities and rulesets.' };

export default function AuthoritiesRoute() {
  return <SignedInShell><AuthoritiesPage /></SignedInShell>;
}
