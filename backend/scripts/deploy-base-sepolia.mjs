import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';
import { ContractFactory, JsonRpcProvider, Wallet, getAddress, isHexString } from 'ethers';

const baseSepoliaChainId = 84532n;
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const contractPaths = ['contracts/MockEUSD.sol', 'contracts/EscrowVault.sol', 'contracts/EscrowVaultFactory.sol'];

function requiredEnvironmentValue(environment, key) {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`${key} must be configured before a Base Sepolia deployment.`);
  return value;
}

export function deploymentConfigurationFromEnvironment(environment = process.env) {
  const rpcUrl = requiredEnvironmentValue(environment, 'BASE_SEPOLIA_RPC_URL');
  let parsedUrl;
  try { parsedUrl = new URL(rpcUrl); } catch { throw new Error('BASE_SEPOLIA_RPC_URL must be a valid HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('BASE_SEPOLIA_RPC_URL must be a valid HTTP(S) URL.');
  const configuredPrivateKey = requiredEnvironmentValue(environment, 'BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY');
  const deployerPrivateKey = configuredPrivateKey.startsWith('0x') ? configuredPrivateKey : `0x${configuredPrivateKey}`;
  if (!isHexString(deployerPrivateKey, 32)) throw new Error('BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key.');
  return { rpcUrl: parsedUrl.toString().replace(/\/$/, ''), deployerPrivateKey };
}

export function deploymentManifest({ deployerAddress, mockEusdAddress, factoryAddress, mockEusdTransactionHash, factoryTransactionHash }) {
  return {
    chainId: Number(baseSepoliaChainId),
    network: 'Base Sepolia',
    deployerAddress: getAddress(deployerAddress),
    mockEusd: { address: getAddress(mockEusdAddress), transactionHash: mockEusdTransactionHash },
    escrowVaultFactory: { address: getAddress(factoryAddress), transactionHash: factoryTransactionHash }
  };
}

async function compiledContracts() {
  const sources = Object.fromEntries(await Promise.all(contractPaths.map(async path => [path, { content: await readFile(join(root, path), 'utf8') }])));
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity', sources,
    settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } }
  })));
  const errors = output.errors?.filter(item => item.severity === 'error') ?? [];
  if (errors.length) throw new Error(errors.map(item => item.formattedMessage).join('\n'));
  return output.contracts;
}

function artifact(compiled, source, name) {
  const result = compiled[source]?.[name];
  if (!result?.evm?.bytecode?.object) throw new Error(`Missing compiled ${name} artifact.`);
  return result;
}

async function deployContract(wallet, definition) {
  const contract = await new ContractFactory(definition.abi, definition.evm.bytecode.object, wallet).deploy();
  const transaction = contract.deploymentTransaction();
  await contract.waitForDeployment();
  return { address: await contract.getAddress(), transactionHash: transaction.hash };
}

export async function deployBaseSepoliaContracts(configuration, { provider = new JsonRpcProvider(configuration.rpcUrl) } = {}) {
  const network = await provider.getNetwork();
  if (network.chainId !== baseSepoliaChainId) throw new Error(`Refusing deployment: RPC endpoint reports chain ${network.chainId}, expected Base Sepolia (${baseSepoliaChainId}).`);
  const wallet = new Wallet(configuration.deployerPrivateKey, provider);
  const compiled = await compiledContracts();
  const mockEusd = await deployContract(wallet, artifact(compiled, 'contracts/MockEUSD.sol', 'MockEUSD'));
  const escrowVaultFactory = await deployContract(wallet, artifact(compiled, 'contracts/EscrowVaultFactory.sol', 'EscrowVaultFactory'));
  return deploymentManifest({ deployerAddress: wallet.address, mockEusdAddress: mockEusd.address, factoryAddress: escrowVaultFactory.address, mockEusdTransactionHash: mockEusd.transactionHash, factoryTransactionHash: escrowVaultFactory.transactionHash });
}

export async function writeDeploymentManifest(manifest, path = join(root, 'contracts', 'deployments', 'base-sepolia.json')) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return path;
}

async function main() {
  const manifest = await deployBaseSepoliaContracts(deploymentConfigurationFromEnvironment());
  const path = await writeDeploymentManifest(manifest);
  console.log(`Base Sepolia MockEUSD deployed at ${manifest.mockEusd.address}`);
  console.log(`Base Sepolia EscrowVaultFactory deployed at ${manifest.escrowVaultFactory.address}`);
  console.log(`Public deployment manifest written to ${path}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
