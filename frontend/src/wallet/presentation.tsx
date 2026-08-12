import type { ReactNode } from 'react';

export type WalletPresentationState = 'loading' | 'disconnected' | 'connecting' | 'connected' | 'local-test' | 'safe-balance' | 'error';

export type WalletPresentationProps = {
  state: WalletPresentationState;
  address?: string | null;
  balance?: string | null;
  message?: string;
  actions?: ReactNode;
};

const stateLabels: Record<WalletPresentationState, string> = {
  loading: 'Loading',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  'local-test': 'Local test',
  'safe-balance': 'Safe balance',
  error: 'Unavailable'
};

export function walletStateLabel(state: WalletPresentationState): string {
  return stateLabels[state];
}

export function walletNetworkLabel(state: WalletPresentationState): string {
  if (state === 'connected' || state === 'safe-balance') return 'Base Sepolia testnet';
  if (state === 'local-test') return 'Local test fixture';
  if (state === 'connecting') return 'Checking connection';
  if (state === 'loading') return 'Waiting for wallet';
  if (state === 'disconnected') return 'Not connected';
  return 'Not verified';
}

function walletStateMessage(state: WalletPresentationState, message?: string): string {
  if (message) return message;
  if (state === 'loading') return 'Preparing the typed wallet connection boundary.';
  if (state === 'disconnected') return 'Create a disposable test wallet or connect an external Base Sepolia wallet when you are ready.';
  if (state === 'connecting') return 'Waiting for the wallet provider to finish connecting.';
  if (state === 'connected') return 'Wallet connected. Loading the personal MockEUSD balance from Base Sepolia.';
  if (state === 'safe-balance') return 'This is a personal test-token balance read from the connected wallet on Base Sepolia.';
  if (state === 'local-test') return 'The local test identity is authenticated, but it does not emulate a real wallet provider.';
  return 'The wallet capability is unavailable in this environment. No private key or server-only wallet credential is used.';
}

function WalletBoundary() {
  return <section className="app-panel wallet-boundary" aria-labelledby="wallet-boundary-title">
    <p className="eyebrow">Safety boundary</p>
    <h2 id="wallet-boundary-title">Contract funds stay with their Contract</h2>
    <p>Contract Escrow Vault funds are separate locked pots and are never shown as personal wallet balance.</p>
    <p>Contract Acceptance is recorded only from the protected exact-Version review flow, not from Wallet.</p>
    <p>Base Sepolia and MockEUSD are valueless testnet services, not real-money, custody, cash-out, or fiat-conversion products.</p>
  </section>;
}

export function WalletSummary({ state, address = null, balance = null, message, actions }: WalletPresentationProps) {
  const loading = state === 'loading' || state === 'connecting';
  const balanceValue = balance ?? (state === 'disconnected' || state === 'local-test' ? 'No personal wallet connected' : 'Not available');
  return <>
    <section className="wallet-page-intro">
      <p className="eyebrow">Wallet</p>
      <h1>Personal test funds, kept separate.</h1>
      <p className="page-intro">Inspect or connect your Base Sepolia test wallet. Contract Escrow Vault funds remain in their individual Contracts.</p>
    </section>
    <section className="app-panel wallet-summary" aria-labelledby="wallet-summary-title" aria-busy={loading}>
      <div className="wallet-card-heading">
        <div><p className="eyebrow">Personal wallet</p><h2 id="wallet-summary-title">Base Sepolia test wallet</h2></div>
        <span className={`status wallet-status-${state}`}>{walletStateLabel(state)}</span>
      </div>
      <p>This is your personal test wallet. Its available MockEUSD is never combined with Contract Escrow Vault funds.</p>
      <dl className="wallet-facts">
        <div><dt>Address</dt><dd>{address ?? 'Connect or create a wallet to see its address.'}</dd></div>
        <div><dt>Network</dt><dd>{walletNetworkLabel(state)}</dd></div>
        <div><dt>Available MockEUSD</dt><dd>{balanceValue}</dd></div>
      </dl>
      <p className={`wallet-state-message${state === 'error' ? ' wallet-state-error' : ''}`} role={state === 'error' ? 'alert' : 'status'} aria-live="polite">{walletStateMessage(state, message)}</p>
      {actions && <div className="action-row wallet-actions">{actions}</div>}
    </section>
    <WalletBoundary />
  </>;
}

export function WalletLoading() {
  return <WalletSummary state="loading" />;
}

export function WalletError({ message, actions }: { message: string; actions?: ReactNode }) {
  return <WalletSummary state="error" message={message} actions={actions} />;
}

export function WalletLocalTest({ wallet }: { wallet?: { address: string; mockEusdBalance: string } }) {
  return <WalletSummary state="local-test" address={wallet?.address} balance={wallet?.mockEusdBalance} message={wallet ? 'Local test identity is active. The configured wallet summary is fixture data; no wallet provider or private key is emulated.' : 'Local test identity is active. No personal wallet is connected in this fixture. Real wallet connection is disabled for local test auth.'} />;
}
