import type { Metadata } from 'next';
import { SettingsPage } from '../../src/settings/settings';

export const metadata: Metadata = { title: 'Profile Settings - NEXUM', description: 'Manage your private NEXUM Profile settings and avatar.' };

export default function SettingsRoute() {
  return <SettingsPage />;
}
