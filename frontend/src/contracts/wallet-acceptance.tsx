'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { apiRequest, getAuthConfig, type AuthConfig, type AuthHeaders } from '../auth/client';
import type { ContractReview } from './detail-presentation';

type ReviewPayload = { review: ContractReview };
type WalletSignature = { walletAddress: string; walletSignature: string; versionHash: string };

const PrivyWalletAcceptanceControls = dynamic(() => import('./privy-acceptance-controls').then(module => module.PrivyWalletAcceptanceControls), {
  ssr: false,
  loading: () => <p className="empty" role="status" aria-live="polite">Loading wallet signer...</p>
});

export function WalletAcceptance({ auth, contractId, review, onAccepted }: { auth: AuthHeaders; contractId: string; review: ContractReview; onAccepted: (review: ContractReview) => void }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  useEffect(() => {
    if (auth.localTestEmail || !auth.accessToken) return;
    void getAuthConfig().then(setConfig).catch(error => setConfigError(error instanceof Error ? error.message : 'Wallet configuration is unavailable.'));
  }, [auth.localTestEmail]);
  if (!auth.accessToken && !auth.localTestEmail) return <p className="notice" role="status">A current signed-in session is required before opening wallet acceptance.</p>;
  if (auth.localTestEmail) return <p className="notice" role="status">The local test identity can inspect this Contract, but it does not emulate a wallet signature.</p>;
  if (configError) return <p className="notice" role="alert">{configError}</p>;
  if (!config) return <p className="empty" role="status">Loading wallet acceptance...</p>;
  if (!config.privyAppId) return <p className="notice" role="status">Wallet acceptance is not configured for this environment. No server-only wallet credentials are used by the page.</p>;
  return <PrivyWalletAcceptanceControls appId={config.privyAppId} auth={auth} contractId={contractId} review={review} onSignature={async signature => {
    const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(review.version.id)}/acceptances`, { method: 'POST', body: JSON.stringify(signature) }, auth);
    onAccepted(response.review);
  }} />;
}
