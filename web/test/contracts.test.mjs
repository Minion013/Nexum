import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import ganache from 'ganache';
import solc from 'solc';
import { BrowserProvider, Contract, ContractFactory, NonceManager, Wallet, ZeroAddress, ZeroHash, keccak256, toUtf8Bytes } from 'ethers';

const contractPaths = ['contracts/EscrowVault.sol', 'contracts/EscrowVaultFactory.sol'];

async function compileContracts() {
  const sources = Object.fromEntries(await Promise.all(contractPaths.map(async (path) => [path, { content: await readFile(join('..', path), 'utf8') }])));
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources,
    settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } }
  })));
  const errors = output.errors?.filter((item) => item.severity === 'error') ?? [];
  assert.deepEqual(errors, [], errors.map((item) => item.formattedMessage).join('\n'));
  return output.contracts;
}

const compiled = await compileContracts();
const artifact = (file, name) => compiled[file][name];

async function deploy(signer, file, name, ...args) {
  const definition = artifact(file, name);
  const contract = await new ContractFactory(definition.abi, definition.evm.bytecode.object, signer).deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

function agreementInit(token, buyer, seller, resolver, versionHash = keccak256(toUtf8Bytes('agreement version 1'))) {
  const now = Math.floor(Date.now() / 1000);
  return {
    token,
    buyer,
    seller,
    resolver,
    feeRecipient: resolver,
    feeBps: 250,
    versionHash,
    fundingDeadline: now + 7 * 24 * 60 * 60,
    amounts: [1_200_000n, 800_000n],
    deadlines: [now + 14 * 24 * 60 * 60, now + 21 * 24 * 60 * 60],
    reviewWindows: [3 * 24 * 60 * 60, 3 * 24 * 60 * 60]
  };
}

async function createScenario(versionHash) {
  const chain = ganache.provider({ logging: { quiet: true }, wallet: { deterministic: true, totalAccounts: 5 } });
  const provider = new BrowserProvider(chain);
  const wallets = Object.values(chain.getInitialAccounts()).map(({ secretKey }) => new Wallet(secretKey, provider));
  const [buyerWallet, sellerWallet, resolverWallet, platformWallet, tokenWallet] = wallets;
  const buyer = new NonceManager(buyerWallet);
  const seller = new NonceManager(sellerWallet);
  const resolver = new NonceManager(resolverWallet);
  const platform = new NonceManager(platformWallet);
  const factory = await deploy(buyer, 'contracts/EscrowVaultFactory.sol', 'EscrowVaultFactory');
  const init = agreementInit(await tokenWallet.getAddress(), await buyer.getAddress(), await seller.getAddress(), await resolver.getAddress(), versionHash);
  const hash = await factory.agreementHash(init);
  const network = await provider.getNetwork();
  const domain = { name: 'PactFlow', version: '1', chainId: network.chainId, verifyingContract: await factory.getAddress() };
  const types = { AgreementApproval: [{ name: 'agreementHash', type: 'bytes32' }] };
  const buyerSignature = await buyer.signTypedData(domain, types, { agreementHash: hash });
  const sellerSignature = await seller.signTypedData(domain, types, { agreementHash: hash });
  return { buyer, seller, resolver, platform, factory, init, hash, buyerSignature, sellerSignature, provider };
}

const rejectsCall = (promise) => assert.rejects(promise, (error) => error.code === 'CALL_EXCEPTION');

test('factory rejects an agreement that does not bind an exact version', async () => {
  const scenario = await createScenario(ZeroHash);
  await rejectsCall(scenario.factory.connect(scenario.buyer).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature));
});

test('factory rejects an unrelated caller even with both participant approvals', async () => {
  const scenario = await createScenario();
  await rejectsCall(scenario.factory.connect(scenario.platform).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature));
  assert.equal(await scenario.factory.vaultForAgreement(scenario.hash), ZeroAddress);
});

test('factory rejects approvals when a signed agreement term is changed', async () => {
  const scenario = await createScenario();
  await rejectsCall(scenario.factory.connect(scenario.buyer).createVault({ ...scenario.init, feeBps: 300 }, scenario.buyerSignature, scenario.sellerSignature));
  assert.equal(await scenario.factory.vaultForAgreement(scenario.hash), ZeroAddress);
});

test('a signed participant creates an unfunded vault with fixed terms and no administrator interface', async () => {
  const scenario = await createScenario();
  await (await scenario.factory.connect(scenario.seller).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature)).wait();
  const vault = new Contract(await scenario.factory.vaultForAgreement(scenario.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, scenario.provider);

  assert.equal(await vault.token(), scenario.init.token);
  assert.equal(await vault.buyer(), scenario.init.buyer);
  assert.equal(await vault.seller(), scenario.init.seller);
  assert.equal(await vault.resolver(), scenario.init.resolver);
  assert.equal(await vault.feeRecipient(), scenario.init.feeRecipient);
  assert.equal(await vault.feeBps(), 250n);
  assert.equal(await vault.agreementVersionHash(), scenario.init.versionHash);
  assert.equal(await vault.allocationTotal(), 2_000_000n);
  assert.equal(await vault.milestoneCount(), 2n);

  const publicFunctions = artifact('contracts/EscrowVault.sol', 'EscrowVault').abi.filter((item) => item.type === 'function').map((item) => item.name);
  for (const forbiddenFunction of ['owner', 'pause', 'unpause', 'upgradeTo', 'rescue', 'adminWithdraw', 'fund', 'releaseEligibleMilestone', 'resolveDispute']) {
    assert.equal(publicFunctions.includes(forbiddenFunction), false, `${forbiddenFunction} must not exist`);
  }
});
