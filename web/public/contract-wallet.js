import { supabase } from './supabase-auth.js';

const baseSepoliaChainId = 84532;
const statement = 'I accept this exact PactFlow Contract Version. This signature does not move funds.';

function typedData({ contractId, versionId, versionHash }) {
  return {
    domain: { name: 'PactFlow Contract Acceptance', version: '1', chainId: baseSepoliaChainId },
    primaryType: 'ContractAcceptance',
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }],
      ContractAcceptance: [{ name: 'contractId', type: 'string' }, { name: 'versionId', type: 'string' }, { name: 'versionHash', type: 'string' }, { name: 'statement', type: 'string' }]
    },
    message: { contractId, versionId, versionHash, statement }
  };
}

export async function signContractAcceptance(input) {
  const [config, client] = await Promise.all([
    fetch('/api/auth/config').then(async response => {
      if (!response.ok) throw new Error('Wallet capability is unavailable.');
      return response.json();
    }),
    supabase()
  ]);
  if (!config.privyAppId) throw new Error('Connect a wallet from Home before accepting a Contract Version.');
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error('Refresh your Supabase sign-in before connecting your wallet.');

  const [React, { createRoot }, privy] = await Promise.all([import('react'), import('react-dom/client'), import('@privy-io/react-auth')]);
  const target = document.createElement('div');
  target.hidden = true;
  document.body.append(target);
  return new Promise((resolve, reject) => {
    const root = createRoot(target);
    let settled = false;
    const finish = (result, failure) => {
      if (settled) return;
      settled = true;
      root.unmount();
      target.remove();
      failure ? reject(failure) : resolve(result);
    };
    function Signer() {
      const { useCallback, useEffect } = React;
      const getExternalJwt = useCallback(async () => session.access_token, [session.access_token]);
      const { state } = privy.useSubscribeToJwtAuthWithFlag({ isAuthenticated: true, isLoading: false, getExternalJwt, enabled: true });
      const { wallets, ready } = privy.useWallets();
      useEffect(() => {
        if (state.status === 'error') return finish(null, new Error('Your wallet connection needs a current Supabase session.'));
        const wallet = wallets.find(item => item.type === 'ethereum');
        if (state.status !== 'done' || !ready) return;
        if (!wallet) return finish(null, new Error('Connect an EVM wallet from Home before accepting this Contract Version.'));
        (async () => {
          try {
            await wallet.switchChain(baseSepoliaChainId);
            const provider = await wallet.getEthereumProvider();
            const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [wallet.address, JSON.stringify(typedData(input))] });
            finish({ walletAddress: wallet.address, walletSignature: String(signature), versionHash: input.versionHash });
          } catch (error) { finish(null, error instanceof Error ? error : new Error('The Contract Acceptance signature was not completed.')); }
        })();
      }, [state.status, wallets, ready]);
      return null;
    }
    root.render(React.createElement(privy.PrivyProvider, { appId: config.privyAppId, config: { embeddedWallets: { ethereum: { createOnLogin: 'off' }, requireUserOwnedRecoveryOnCreate: true } } }, React.createElement(Signer)));
  });
}
