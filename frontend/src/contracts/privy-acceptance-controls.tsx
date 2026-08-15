'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PrivyProvider, useSubscribeToJwtAuthWithFlag, useWallets, type EIP1193Provider, type SignTypedDataParams } from '@privy-io/react-auth';
import type { AuthHeaders } from '../auth/client';
import type { ContractReview } from './detail-presentation';

type WalletSignature = { walletAddress: string; walletSignature: string; versionHash: string };
const baseSepoliaChainId = 84532;
const contractAcceptanceStatement = 'I accept this exact NEXUM Contract Version. This signature does not move funds.';

function acceptanceTypedData(contractId: string, versionId: string, versionHash: string): SignTypedDataParams & { primaryType: 'ContractAcceptance' } {
  return {
    domain: { name: 'NEXUM Contract Acceptance', version: '1', chainId: baseSepoliaChainId },
    primaryType: 'ContractAcceptance',
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }],
      ContractAcceptance: [{ name: 'contractId', type: 'string' }, { name: 'versionId', type: 'string' }, { name: 'versionHash', type: 'string' }, { name: 'statement', type: 'string' }]
    },
    message: { contractId, versionId, versionHash, statement: contractAcceptanceStatement }
  };
}

function WalletAcceptanceControls({ auth, contractId, review, onSignature }: { auth: AuthHeaders; contractId: string; review: ContractReview; onSignature: (signature: WalletSignature) => Promise<void> }) {
  const { state } = useSubscribeToJwtAuthWithFlag({ isAuthenticated: Boolean(auth.accessToken), isLoading: false, getExternalJwt: async () => auth.accessToken ?? '', enabled: Boolean(auth.accessToken) });
  const { wallets, ready } = useWallets();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Preparing the client-side wallet signer...');
  const wallet = wallets.find(item => item.type === 'ethereum');
  const canSign = ready && state.status === 'done' && Boolean(wallet) && !busy;

  async function signExactVersion() {
    const versionHash = review.version.hash;
    if (!wallet || !versionHash || busy) return;
    setBusy(true);
    setMessage('Confirm the exact Contract Version in your wallet...');
    try {
      await wallet.switchChain(baseSepoliaChainId);
      const provider: EIP1193Provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [wallet.address, JSON.stringify(acceptanceTypedData(contractId, review.version.id, versionHash))] });
      await onSignature({ walletAddress: wallet.address, walletSignature: String(signature), versionHash });
      setMessage('Exact Version acceptance recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The wallet signature was not completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || state.status === 'loading') return <p className="empty" role="status" aria-live="polite">Preparing the client-side wallet signer...</p>;
  if (state.status === 'error') return <p className="notice" role="alert">Your wallet connection needs a current signed-in session.</p>;
  if (!wallet) return <><p className="notice" role="status">Connect an EVM wallet on Base Sepolia before accepting this exact Version.</p><Link className="button" href="/wallet">Open Wallet</Link></>;
  return <><p className="wallet-address">Wallet {wallet.address}</p><button className="primary" type="button" onClick={() => void signExactVersion()} disabled={!canSign}>{busy ? 'Waiting for wallet...' : 'Sign and accept exact Version'}</button><p className="empty" role="status" aria-live="polite">{message}</p></>;
}

export function PrivyWalletAcceptanceControls({ appId, auth, contractId, review, onSignature }: { appId: string; auth: AuthHeaders; contractId: string; review: ContractReview; onSignature: (signature: WalletSignature) => Promise<void> }) {
  return <PrivyProvider appId={appId} config={{ embeddedWallets: { ethereum: { createOnLogin: 'off' } } }}><WalletAcceptanceControls auth={auth} contractId={contractId} review={review} onSignature={onSignature} /></PrivyProvider>;
}
