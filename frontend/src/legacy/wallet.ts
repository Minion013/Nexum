// @ts-nocheck
import { activeLocalTestFixture, supabase } from './supabase-auth';

const baseSepoliaChainId = 84532;
const baseSepoliaChainHex = '0x14a34';
const mockEusdAddress = '0xEcF583DcC9CA0c6E59b14df86412E4C0ED96FF3c';
const mockEusdDecimals = 6;
let React;
let createRoot;
let PrivyProvider;
let useCallback;
let useCreateWallet;
let useEffect;
let useLinkAccount;
let useState;
let useSubscribeToJwtAuthWithFlag;
let useWallets;
let createElement;

function mockEusdBalanceCall(address) {
  return `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

export function formatMockEusdBalance(value) {
  const amount = BigInt(value);
  const units = 10n ** BigInt(mockEusdDecimals);
  const whole = amount / units;
  const fraction = (amount % units).toString().padStart(mockEusdDecimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function WalletAuthSync({ session, onStatus }) {
  const getExternalJwt = useCallback(async () => session?.access_token, [session?.access_token]);
  const { state } = useSubscribeToJwtAuthWithFlag({
    isAuthenticated: Boolean(session), isLoading: session === undefined, getExternalJwt, enabled: true,
    onError: () => onStatus('error')
  });
  useEffect(() => onStatus(state.status), [onStatus, state.status]);
  return null;
}

function WalletControls() {
  const [session, setSession] = useState();
  const [authStatus, setAuthStatus] = useState('initial');
  const [message, setMessage] = useState('Preparing your Supabase-linked wallet…');
  const [balance, setBalance] = useState('Not connected');
  const reportAuthStatus = useCallback(status => {
    setAuthStatus(status);
    if (status === 'error') setMessage('Your wallet connection needs a current Supabase session. Refresh your sign-in and try again.');
  }, []);
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const { linkWallet } = useLinkAccount();
  const ethereumWallet = wallets.find(wallet => wallet.type === 'ethereum');
  const isReady = authStatus === 'done' && ready;

  useEffect(() => {
    let subscription;
    supabase().then(async client => {
      const { data: { session: initialSession } } = await client.auth.getSession();
      setSession(initialSession ?? null);
      subscription = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession ?? null)).data.subscription;
    }).catch(() => setSession(null));
    return () => subscription?.unsubscribe();
  }, []);

  const refreshMockEusdBalance = async () => {
    if (!ethereumWallet) return;
    setBalance('Loading Base Sepolia balance…');
    try {
      await ethereumWallet.switchChain(baseSepoliaChainId);
      const provider = await ethereumWallet.getEthereumProvider();
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (chainId !== baseSepoliaChainHex) throw new Error('Switch to Base Sepolia to view this test-token balance.');
      const result = await provider.request({ method: 'eth_call', params: [{ to: mockEusdAddress, data: mockEusdBalanceCall(ethereumWallet.address) }, 'latest'] });
      setBalance(`${formatMockEusdBalance(result)} MockEUSD`);
    } catch (error) {
      setBalance('Unavailable until Base Sepolia is connected');
      setMessage(error.message || 'We could not load the Base Sepolia test-token balance.');
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!ethereumWallet) {
      setBalance('No personal wallet connected');
      setMessage('Create a disposable test wallet or connect an external Base Sepolia wallet when you are ready.');
      return;
    }
    setMessage(`Wallet connected: ${ethereumWallet.address}`);
    void refreshMockEusdBalance();
  }, [ethereumWallet, isReady]);

  const createDisposableWallet = async () => {
    setMessage('Creating your disposable browser test wallet…');
    try {
      const wallet = await createWallet();
      setMessage(`Disposable test wallet created: ${wallet.address}`);
    } catch (error) {
      setMessage(error.message || 'We could not create the disposable test wallet.');
    }
  };
  const connectExternalWallet = async () => {
    setMessage('Choose the external Base Sepolia wallet to link to this Supabase Profile.');
    try {
      await linkWallet();
    } catch (error) {
      setMessage(error.message || 'The external wallet was not connected.');
    }
  };

  return createElement(React.Fragment, null,
    createElement(WalletAuthSync, { key: session?.access_token ?? 'no-supabase-session', session, onStatus: reportAuthStatus }),
    createElement('section', { className: 'app-panel wallet-summary', 'aria-labelledby': 'wallet-summary-title' },
      createElement('p', { className: 'eyebrow' }, 'Personal wallet'),
      createElement('h2', { id: 'wallet-summary-title' }, 'Base Sepolia test wallet'),
      createElement('p', null, 'This is your personal test wallet. Its available MockEUSD is never combined with Contract Escrow Vault funds.'),
      createElement('p', { className: 'status' }, ethereumWallet ? 'Connected' : 'Not connected'),
      createElement('dl', null,
        createElement('div', null, createElement('dt', null, 'Address'), createElement('dd', null, ethereumWallet?.address ?? 'Connect or create a wallet to see its address.')),
        createElement('div', null, createElement('dt', null, 'Network'), createElement('dd', null, 'Base Sepolia testnet')),
        createElement('div', null, createElement('dt', null, 'Available MockEUSD'), createElement('dd', null, balance))),
      createElement('div', { className: 'action-row' },
        createElement('button', { type: 'button', disabled: !isReady || Boolean(ethereumWallet), onClick: createDisposableWallet }, 'Create disposable test wallet'),
        createElement('button', { type: 'button', disabled: !isReady, onClick: connectExternalWallet }, 'Connect external wallet'),
        createElement('button', { type: 'button', disabled: !ethereumWallet, onClick: refreshMockEusdBalance }, 'Refresh MockEUSD balance')),
      createElement('p', { className: 'notice', 'aria-live': 'polite' }, message)),
    createElement('section', { className: 'app-panel wallet-boundary', 'aria-labelledby': 'wallet-boundary-title' },
      createElement('p', { className: 'eyebrow' }, 'Safety boundary'),
      createElement('h2', { id: 'wallet-boundary-title' }, 'Contract funds stay with their Contract'),
      createElement('p', null, 'Contract Escrow Vault pots and their activity live on each Contract. They are locked funds, not part of your available wallet balance.'),
      createElement('p', null, 'This Wallet page has no wallet-wide transaction history. Base Sepolia and MockEUSD are valueless testnet services, not real-money products.')));
}

function WalletCapability({ appId }) {
  return createElement(PrivyProvider, { appId, config: { embeddedWallets: { ethereum: { createOnLogin: 'off' }, requireUserOwnedRecoveryOnCreate: true } } }, createElement(WalletControls));
}

async function mountWalletCapability(target, appId) {
  const [reactModule, hooksModule, reactDomModule, privyModule] = await Promise.all([
    import('react'), import('react'), import('react-dom/client'), import('@privy-io/react-auth')
  ]);
  React = reactModule.default ?? reactModule;
  const reactHooks = hooksModule.default ?? hooksModule;
  ({ useCallback, useEffect, useState } = reactHooks);
  createRoot = reactDomModule.createRoot ?? reactDomModule.default?.createRoot;
  ({ PrivyProvider, useCreateWallet, useLinkAccount, useSubscribeToJwtAuthWithFlag, useWallets } = privyModule);
  createElement = React.createElement;
  if (!createRoot) throw new Error('Wallet rendering is unavailable in this browser.');
  createRoot(target).render(createElement(WalletCapability, { appId }));
}

async function mount() {
  const target = document.querySelector('#wallet-capability');
  if (!target) return;
  const config = await fetch('/api/auth/config').then(response => response.json());
  const localTestFixture = await activeLocalTestFixture();
  if (localTestFixture) {
    const status = target.querySelector('[data-wallet-status]');
    const address = target.querySelector('[data-wallet-address]');
    const balance = target.querySelector('[data-wallet-balance]');
    if (localTestFixture.wallet) {
      if (address) address.textContent = localTestFixture.wallet.address;
      if (balance) balance.textContent = localTestFixture.wallet.mockEusdBalance;
      if (status) status.textContent = 'Local test identity is active. Test wallet connected.';
    } else if (status) status.textContent = 'Local test identity is active. No personal wallet is connected.';
    return;
  }
  if (!config.privyAppId) {
    const status = target.querySelector('[data-wallet-status]');
    if (status) status.textContent = 'Wallet connection is not configured for this environment.';
    return;
  }
  await mountWalletCapability(target, config.privyAppId);
}

mount().catch(error => {
  const status = document.querySelector('[data-wallet-status]');
  if (status) status.textContent = error.message || 'Wallet capability is unavailable.';
});
