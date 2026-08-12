import type { Metadata } from 'next';
import { SignedInShell } from '../../src/signed-in/app-shell';
import { DashboardPage } from '../../src/dashboard/dashboard';

export const metadata: Metadata = { title: 'Dashboard - NEXUM', description: 'Your NEXUM Contract work.' };

export default function HomePage() {
  return <SignedInShell><DashboardPage /></SignedInShell>;
}
