'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ApiError, getAuthConfig, type AuthConfig, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { WalletError, WalletLoading, WalletLocalTest, WalletSummary } from './presentation';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const PrivyWalletCapability = dynamic(() => import('./privy-capability').then(module => module.PrivyWalletCapability), {
  ssr: false,
  loading: () => <WalletLoading />
});

export function WalletPage() {
  const { status, auth } = useSignedInAuth();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [walletConnectionRequested, setWalletConnectionRequested] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || !auth || (!auth.localTestEmail && !walletConnectionRequested)) return;
    let active = true;
    void getAuthConfig().then(nextConfig => {
      if (active) setConfig(nextConfig);
    }).catch(error => {
      if (active) setConfigError(error instanceof ApiError ? error.message : errorMessage(error, 'Wallet configuration is unavailable.'));
    });
    return () => { active = false; };
  }, [auth, status, walletConnectionRequested]);

  if (status === 'loading') return <WalletLoading />;
  if (!auth) return <WalletError message="Your signed-in Wallet session is unavailable. Please sign in again." actions={<Link className="button primary" href="/login">Return to sign in</Link>} />;
  if (!auth.localTestEmail && !walletConnectionRequested) return <WalletConnectionPrompt onRequest={() => setWalletConnectionRequested(true)} />;
  if (!config && !configError) return <WalletLoading />;
  if (configError) return <WalletError message={configError} actions={<Link className="button" href="/home">Back to Dashboard</Link>} />;
  if (!config) return <WalletError message="Wallet configuration is unavailable. Please try again." actions={<Link className="button" href="/home">Back to Dashboard</Link>} />;
  if (auth.localTestEmail) return <WalletLocalTest wallet={config.localTestWallet} />;
  if (!config.privyAppId) return <WalletError message="Wallet connection is not configured for this environment. No server-only wallet credentials are exposed to the browser." />;
  if (!walletConnectionRequested) return <WalletConnectionPrompt onRequest={() => setWalletConnectionRequested(true)} />;
  return <PrivyWalletCapability appId={config.privyAppId} auth={auth} />;
}

function WalletConnectionPrompt({ onRequest }: { onRequest: () => void }) {
  return <WalletSummary
    state="disconnected"
    message="Wallet connection is off until you request it. This keeps the Wallet tab responsive while you browse."
    actions={<button className="primary" type="button" onClick={onRequest}>Load wallet connection</button>}
  />;
}
