import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in — NEXUM',
  description: 'Sign in to NEXUM.'
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
