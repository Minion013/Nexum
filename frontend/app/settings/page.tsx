import type { Metadata } from 'next';
import { SettingsPage } from '../../src/settings/settings';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Profile Settings - NEXUM', description: 'Manage your private NEXUM Profile settings and avatar.' };

export default function SettingsRoute() {
  return <SignedInShell><SettingsPage /></SignedInShell>;
}
