import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in — PactFlow',
  description: 'Sign in to PactFlow.'
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
