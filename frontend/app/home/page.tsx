import type { Metadata } from 'next';
import { SignedInShell } from '../../src/signed-in/app-shell';
import { DashboardPage } from '../../src/dashboard/dashboard';

export const metadata: Metadata = { title: 'Dashboard - PactFlow', description: 'Your PactFlow Contract work.' };

export default function HomePage() {
  return <SignedInShell><DashboardPage /></SignedInShell>;
}
