import type { Metadata } from 'next';
import { SettingsPage } from '../../src/settings/settings';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Profile Settings - PactFlow', description: 'Manage your private PactFlow Profile settings and avatar.' };

export default function SettingsRoute() {
  return <SignedInShell><SettingsPage /></SignedInShell>;
}
