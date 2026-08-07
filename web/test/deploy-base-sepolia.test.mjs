import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deployBaseSepoliaContracts, deploymentConfigurationFromEnvironment, deploymentManifest, writeDeploymentManifest } from '../scripts/deploy-base-sepolia.mjs';

function sampleDeploymentManifestInput() {
  return {
    deployerAddress: '0x1111111111111111111111111111111111111111',
    mockEusdAddress: '0x2222222222222222222222222222222222222222',
    factoryAddress: '0x3333333333333333333333333333333333333333',
    mockEusdTransactionHash: `0x${'aa'.repeat(32)}`,
    factoryTransactionHash: `0x${'bb'.repeat(32)}`
  };
}

test('Base Sepolia deployment configuration requires an RPC endpoint and dedicated deployer key', () => {
  assert.throws(
    () => deploymentConfigurationFromEnvironment({}),
    /BASE_SEPOLIA_RPC_URL/
  );
  assert.throws(
    () => deploymentConfigurationFromEnvironment({ BASE_SEPOLIA_RPC_URL: 'https://sepolia.example' }),
    /BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY/
  );
  assert.deepEqual(
    deploymentConfigurationFromEnvironment({
      BASE_SEPOLIA_RPC_URL: 'https://sepolia.example/',
      BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY: `0x${'11'.repeat(32)}`
    }),
    { rpcUrl: 'https://sepolia.example', deployerPrivateKey: `0x${'11'.repeat(32)}` }
  );
});

test('the public deployment manifest records only public Base Sepolia deployment details', () => {
  assert.deepEqual(
    deploymentManifest(sampleDeploymentManifestInput()),
    {
      chainId: 84532,
      network: 'Base Sepolia',
      deployerAddress: '0x1111111111111111111111111111111111111111',
      mockEusd: { address: '0x2222222222222222222222222222222222222222', transactionHash: `0x${'aa'.repeat(32)}` },
      escrowVaultFactory: { address: '0x3333333333333333333333333333333333333333', transactionHash: `0x${'bb'.repeat(32)}` }
    }
  );
});

test('deployment refuses an RPC endpoint that is not Base Sepolia before it can send a transaction', async () => {
  await assert.rejects(
    deployBaseSepoliaContracts(
      { rpcUrl: 'https://sepolia.example', deployerPrivateKey: `0x${'11'.repeat(32)}` },
      { provider: { getNetwork: async () => ({ chainId: 11155111n }) } }
    ),
    /expected Base Sepolia \(84532\)/
  );
});

test('the deployment manifest writer persists public deployment details without a private key', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pactflow-deployment-'));
  const path = join(directory, 'base-sepolia.json');
  try {
    await writeDeploymentManifest(deploymentManifest(sampleDeploymentManifestInput()), path);
    const persisted = await readFile(path, 'utf8');
    assert.match(persisted, /"escrowVaultFactory"/);
    assert.equal(persisted.includes('private'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
