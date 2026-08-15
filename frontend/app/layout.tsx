import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NavigationLoading } from '../src/navigation/navigation-loading';
import { SignedInRouteBoundary } from '../src/signed-in/app-shell';

export const metadata: Metadata = { title: 'NEXUM', description: 'Clearer creative work.', icons: { icon: '/NEXUM.svg', apple: '/NEXUM.svg' } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Suspense fallback={null}><NavigationLoading /></Suspense><SignedInRouteBoundary>{children}</SignedInRouteBoundary></body></html>;
}
