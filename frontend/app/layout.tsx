import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'PactFlow', description: 'Clearer creative work.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="stylesheet" href="/styles.css" /><link rel="stylesheet" href="/marketing.css" /><link rel="stylesheet" href="/responsive.css" /></head><body>{children}</body></html>;
}
