import type { EIP1193Provider } from '@privy-io/react-auth';

export const baseSepoliaChainId = 84532;
const baseSepoliaChainHex = '0x14a34';
const mockEusdAddress = '0xEcF583DcC9CA0c6E59b14df86412E4C0ED96FF3c';
const mockEusdDecimals = 6;

export type EthereumWallet = {
  address: string;
  switchChain: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<EIP1193Provider>;
};

function mockEusdBalanceCall(address: string): string {
  return `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

export function formatMockEusdBalance(value: string): string {
  const amount = BigInt(value);
  const units = 10n ** BigInt(mockEusdDecimals);
  const whole = amount / units;
  const fraction = (amount % units).toString().padStart(mockEusdDecimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export async function readMockEusdBalance(wallet: EthereumWallet): Promise<string> {
  await wallet.switchChain(baseSepoliaChainId);
  const provider = await wallet.getEthereumProvider();
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (chainId !== baseSepoliaChainHex) throw new Error('Switch to Base Sepolia to view this test-token balance.');
  const result = await provider.request({ method: 'eth_call', params: [{ to: mockEusdAddress, data: mockEusdBalanceCall(wallet.address) }, 'latest'] });
  if (typeof result !== 'string') throw new Error('The connected wallet returned an invalid MockEUSD balance.');
  return `${formatMockEusdBalance(result)} MockEUSD`;
}
