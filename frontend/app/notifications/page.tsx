import type { Metadata } from 'next';
import { NotificationsPage } from '../../src/notifications/notifications';
import { SignedInShell } from '../../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'Notifications - NEXUM', description: 'Your private NEXUM notifications.' };

export default function NotificationsRoute() {
  return <SignedInShell><NotificationsPage /></SignedInShell>;
}
