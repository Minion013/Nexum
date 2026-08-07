import { supabase } from './supabase-auth.js';

const baseSepoliaChainId = 84532;
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
  const [message, setMessage] = useState('Preparing your Supabase-linked wallet capability…');
  const reportAuthStatus = useCallback(status => {
    setAuthStatus(status);
    if (status === 'error') setMessage('Your wallet connection needs a current Supabase session. Refresh your sign-in and try again.');
  }, []);
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const { linkWallet } = useLinkAccount();
  const ethereumWallet = wallets.find(wallet => wallet.type === 'ethereum');

  useEffect(() => {
    let subscription;
    supabase().then(async client => {
      const { data: { session: initialSession } } = await client.auth.getSession();
      setSession(initialSession ?? null);
      subscription = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession ?? null)).data.subscription;
    }).catch(() => setSession(null));
    return () => subscription?.unsubscribe();
  }, []);
  useEffect(() => {
    if (authStatus === 'done' && ready) setMessage(ethereumWallet ? `Wallet connected: ${ethereumWallet.address}` : 'Your Supabase identity is linked. Create or connect an EVM wallet when you are ready.');
  }, [authStatus, ethereumWallet, ready]);

  const createEmbeddedWallet = async () => {
    setMessage('Creating your user-controlled embedded wallet…');
    try { const wallet = await createWallet(); setMessage(`Embedded wallet created: ${wallet.address}`); } catch (error) { setMessage(error.message || 'We could not create the embedded wallet.'); }
  };
  const connectExternalWallet = () => { setMessage('Choose the external EVM wallet to link to this Supabase identity.'); linkWallet(); };
  const signTestnetAcknowledgement = async () => {
    if (!ethereumWallet) return;
    setMessage('Requesting a Base Sepolia typed-data signature…');
    try {
      await ethereumWallet.switchChain(baseSepoliaChainId);
      const provider = await ethereumWallet.getEthereumProvider();
      const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [ethereumWallet.address, JSON.stringify({
        domain: { name: 'PactFlow testnet wallet check', version: '1', chainId: baseSepoliaChainId }, primaryType: 'WalletCheck',
        types: { EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }], WalletCheck: [{ name: 'statement', type: 'string' }] },
        message: { statement: 'This testnet wallet check grants no PactFlow payment authority.' }
      })] });
      setMessage(`Signature received: ${String(signature).slice(0, 14)}… It is not a Contract Acceptance.`);
    } catch (error) { setMessage(error.message || 'The typed-data signature was not completed.'); }
  };
  const sendZeroValueTestTransaction = async () => {
    if (!ethereumWallet) return;
    setMessage('Requesting a zero-value Base Sepolia transaction to your own wallet…');
    try {
      await ethereumWallet.switchChain(baseSepoliaChainId);
      const provider = await ethereumWallet.getEthereumProvider();
      const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: ethereumWallet.address, to: ethereumWallet.address, value: '0x0' }] });
      setMessage(`Testnet transaction submitted: ${String(hash)}. It does not fund a Contract.`);
    } catch (error) { setMessage(error.message || 'The zero-value testnet transaction was not submitted.'); }
  };
  const isReady = authStatus === 'done' && ready;
  return createElement(React.Fragment, null,
    createElement(WalletAuthSync, { key: session?.access_token ?? 'no-supabase-session', session, onStatus: reportAuthStatus }),
    createElement('section', { className: 'home-panel wallet-capability', 'aria-labelledby': 'wallet-capability-title' },
    createElement('div', { className: 'home-panel-heading' }, createElement('div', null,
      createElement('p', { className: 'eyebrow' }, 'Wallet capability'), createElement('h2', { id: 'wallet-capability-title' }, 'Connect a Base Sepolia wallet'),
      createElement('p', null, 'Your Supabase Profile remains your PactFlow account. Privy only links a user-controlled wallet; PactFlow never receives a private key.')),
    createElement('span', { className: 'home-status-note' }, ethereumWallet ? 'Wallet linked' : 'No wallet linked')),
    createElement('div', { className: 'home-form-actions' },
      createElement('button', { className: 'home-secondary-action', type: 'button', disabled: !isReady || Boolean(ethereumWallet), onClick: createEmbeddedWallet }, 'Create embedded wallet'),
      createElement('button', { className: 'home-secondary-action', type: 'button', disabled: !isReady, onClick: connectExternalWallet }, 'Connect external wallet'),
      createElement('button', { className: 'home-secondary-action', type: 'button', disabled: !ethereumWallet, onClick: signTestnetAcknowledgement }, 'Sign testnet check'),
      createElement('button', { className: 'home-secondary-action', type: 'button', disabled: !ethereumWallet, onClick: sendZeroValueTestTransaction }, 'Send zero-value test')),
    createElement('p', { className: 'home-form-status', 'aria-live': 'polite' }, message),
    createElement('p', { className: 'contract-form-help' }, 'The transaction test may consume Base Sepolia test ETH. It is a self-transfer of zero value and never funds, settles, or approves a Contract.')));
}

function WalletCapability({ appId }) {
  return createElement(PrivyProvider, { appId, config: { embeddedWallets: { ethereum: { createOnLogin: 'off' }, requireUserOwnedRecoveryOnCreate: true } } }, createElement(WalletControls));
}

async function mountWalletCapability(target, appId) {
  ([React, { useCallback, useEffect, useState }, { createRoot }, { PrivyProvider, useCreateWallet, useLinkAccount, useSubscribeToJwtAuthWithFlag, useWallets }] = await Promise.all([
    import('react'), import('react'), import('react-dom/client'), import('@privy-io/react-auth')
  ]));
  createElement = React.createElement;
  createRoot(target).render(createElement(WalletCapability, { appId }));
}

async function mount() {
  const target = document.querySelector('#wallet-capability');
  if (!target) return;
  const config = await fetch('/api/auth/config').then(response => response.json());
  if (!config.privyAppId) { target.textContent = 'Wallet capability is not configured for this environment.'; return; }
  target.innerHTML = '<section class="home-panel wallet-capability"><p class="eyebrow">Wallet capability</p><h2>Connect a Base Sepolia wallet</h2><p>Valueless Base Sepolia test flow only: it does not provide a real-money service or Contract payment authority.</p><button id="start-wallet-capability" class="home-secondary-action" type="button">Set up wallet</button></section>';
  target.querySelector('#start-wallet-capability').onclick = () => {
    target.textContent = 'Loading wallet capability…';
    mountWalletCapability(target, config.privyAppId).catch(error => { target.textContent = error.message || 'Wallet capability is unavailable.'; });
  };
}

mount().catch(error => { const target = document.querySelector('#wallet-capability'); if (target) target.textContent = error.message || 'Wallet capability is unavailable.'; });
