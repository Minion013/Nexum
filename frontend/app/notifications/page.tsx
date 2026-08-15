import type { Metadata } from 'next';
import { NotificationsPage } from '../../src/notifications/notifications';

export const metadata: Metadata = { title: 'Notifications - NEXUM', description: 'Your private NEXUM notifications.' };

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
