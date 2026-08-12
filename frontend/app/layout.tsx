import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'PactFlow', description: 'Clearer creative work.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="stylesheet" href="/styles.css" /><link rel="stylesheet" href="/marketing.css" /><link rel="stylesheet" href="/responsive.css" /><link rel="stylesheet" href="/home.css" /><link rel="stylesheet" href="/signed-in.css" /><link rel="stylesheet" href="/profile-presentation.css" /><link rel="stylesheet" href="/profile-identity.css" /><link rel="stylesheet" href="/dashboard.css" /><link rel="stylesheet" href="/people.css" /></head><body>{children}</body></html>;
}
