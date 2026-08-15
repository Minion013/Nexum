'use client';

import { useCallback, useEffect, useState } from 'react';
import { PrivyProvider, useCreateWallet, useLinkAccount, useSubscribeToJwtAuthWithFlag, useWallets } from '@privy-io/react-auth';
import type { AuthHeaders } from '../auth/client';
import { readMockEusdBalance, type EthereumWallet } from './provider';
import { WalletSummary, type WalletPresentationState } from './presentation';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function WalletCapability({ auth }: { auth: AuthHeaders }) {
  const { state: jwtState } = useSubscribeToJwtAuthWithFlag({ isAuthenticated: Boolean(auth.accessToken), isLoading: false, getExternalJwt: async () => auth.accessToken ?? '', enabled: Boolean(auth.accessToken) });
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const { linkWallet } = useLinkAccount();
  const [state, setState] = useState<WalletPresentationState>('connecting');
  const [balance, setBalance] = useState<string | null>(null);
  const [message, setMessage] = useState('Preparing the client-side wallet provider...');
  const [busy, setBusy] = useState(false);
  const wallet = wallets.find(item => item.type === 'ethereum') as EthereumWallet | undefined;

  const refreshBalance = useCallback(async (currentWallet: EthereumWallet) => {
    setMessage('Loading the personal MockEUSD balance from Base Sepolia...');
    try {
      setBalance(await readMockEusdBalance(currentWallet));
      setState('safe-balance');
      setMessage('Personal MockEUSD balance loaded from Base Sepolia. Contract Escrow Vault funds are not included.');
    } catch (error) {
      setBalance(null);
      setState('error');
      setMessage(errorMessage(error, 'We could not load the Base Sepolia test-token balance.'));
    }
  }, []);

  useEffect(() => {
    if (jwtState.status === 'error') {
      setState('error');
      setMessage('Your wallet connection needs a current signed-in session. Refresh your sign-in and try again.');
      return;
    }
    if (!ready || jwtState.status === 'loading') {
      setState('connecting');
      return;
    }
    if (!wallet) {
      setBalance(null);
      setState('disconnected');
      setMessage('Create a disposable test wallet or connect an external Base Sepolia wallet when you are ready.');
      return;
    }
    setBalance(null);
    setState('connected');
    void refreshBalance(wallet);
  }, [jwtState.status, ready, refreshBalance, wallet?.address]);

  async function createDisposableWallet() {
    if (busy) return;
    setBusy(true);
    setState('connecting');
    setMessage('Creating your disposable browser test wallet...');
    try {
      const created = await createWallet();
      setMessage(`Disposable test wallet created: ${created.address}. Loading its personal MockEUSD balance...`);
    } catch (error) {
      setState('error');
      setMessage(errorMessage(error, 'We could not create the disposable test wallet.'));
    } finally {
      setBusy(false);
    }
  }

  async function connectExternalWallet() {
    if (busy) return;
    setBusy(true);
    setState('connecting');
    setMessage('Choose the external Base Sepolia wallet to link to this Supabase Profile.');
    try {
      await linkWallet();
      setMessage('External wallet linked. Loading its personal MockEUSD balance...');
    } catch (error) {
      setState('error');
      setMessage(errorMessage(error, 'The external wallet was not connected.'));
    } finally {
      setBusy(false);
    }
  }

  const actions = <>
    <button className="primary" type="button" disabled={busy || state !== 'disconnected'} onClick={() => void createDisposableWallet()}>Create disposable test wallet</button>
    <button type="button" disabled={busy || state === 'connecting'} onClick={() => void connectExternalWallet()}>{state === 'connecting' ? 'Connecting...' : 'Connect external wallet'}</button>
    {wallet && <button type="button" disabled={busy} onClick={() => void refreshBalance(wallet)}>Refresh MockEUSD balance</button>}
    {state === 'error' && <button type="button" disabled={busy} onClick={() => wallet ? void refreshBalance(wallet) : void connectExternalWallet()}>Try again</button>}
  </>;

  return <WalletSummary state={state} address={wallet?.address} balance={balance} message={message} actions={actions} />;
}

export function PrivyWalletCapability({ appId, auth }: { appId: string; auth: AuthHeaders }) {
  return <PrivyProvider appId={appId} config={{ embeddedWallets: { ethereum: { createOnLogin: 'off' } } }}><WalletCapability auth={auth} /></PrivyProvider>;
}
