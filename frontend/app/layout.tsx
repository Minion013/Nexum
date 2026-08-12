import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'NEXUM', description: 'Clearer creative work.', icons: { icon: '/NEXUM.svg', apple: '/NEXUM.svg' } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
