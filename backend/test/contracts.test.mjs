import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import ganache from 'ganache';
import solc from 'solc';
import { BrowserProvider, Contract, ContractFactory, NonceManager, Wallet, ZeroAddress, ZeroHash, keccak256, toUtf8Bytes } from 'ethers';

const contractPaths = ['contracts/EscrowVault.sol', 'contracts/EscrowVaultFactory.sol', 'contracts/MockEUSD.sol'];

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

function contractInit(token, buyer, seller, resolver, versionHash = keccak256(toUtf8Bytes('contract version 1'))) {
  const now = Math.floor(Date.now() / 1000);
  return {
    token,
    buyer,
    seller,
    resolver,
    feeRecipient: resolver,
    feeBps: 250,
    versionHash,
    acceptanceDeadline: now + 2 * 24 * 60 * 60,
    fundingDeadline: now + 7 * 24 * 60 * 60,
    amounts: [1_200_000n, 800_000n],
    deadlines: [now + 14 * 24 * 60 * 60, now + 21 * 24 * 60 * 60],
    reviewWindows: [3 * 24 * 60 * 60, 3 * 24 * 60 * 60]
  };
}

async function createScenario(versionHash, customizeInit = (init) => init) {
  const chain = ganache.provider({ logging: { quiet: true }, wallet: { deterministic: true, totalAccounts: 5 } });
  const provider = new BrowserProvider(chain);
  const wallets = Object.values(chain.getInitialAccounts()).map(({ secretKey }) => new Wallet(secretKey, provider));
  const [buyerWallet, sellerWallet, resolverWallet, platformWallet, tokenWallet] = wallets;
  const buyer = new NonceManager(buyerWallet);
  const seller = new NonceManager(sellerWallet);
  const resolver = new NonceManager(resolverWallet);
  const platform = new NonceManager(platformWallet);
  const factory = await deploy(buyer, 'contracts/EscrowVaultFactory.sol', 'EscrowVaultFactory');
  const token = await deploy(tokenWallet, 'contracts/MockEUSD.sol', 'MockEUSD');
  const init = customizeInit(contractInit(await token.getAddress(), await buyer.getAddress(), await seller.getAddress(), await resolver.getAddress(), versionHash));
  const hash = await factory.contractHash(init);
  const network = await provider.getNetwork();
  const domain = { name: 'PactFlow', version: '1', chainId: network.chainId, verifyingContract: await factory.getAddress() };
  const types = { ContractAcceptance: [{ name: 'contractHash', type: 'bytes32' }] };
  const buyerSignature = await buyer.signTypedData(domain, types, { contractHash: hash });
  const sellerSignature = await seller.signTypedData(domain, types, { contractHash: hash });
  return { buyer, seller, resolver, platform, factory, token, init, hash, buyerSignature, sellerSignature, chain, provider };
}

const rejectsCall = (promise) => assert.rejects(promise, (error) => error.code === 'CALL_EXCEPTION');

test('factory rejects a Contract that does not bind an exact Version', async () => {
  const scenario = await createScenario(ZeroHash);
  await rejectsCall(scenario.factory.connect(scenario.buyer).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature));
});

test('factory rejects an unrelated caller even with both participant approvals', async () => {
  const scenario = await createScenario();
  await rejectsCall(scenario.factory.connect(scenario.platform).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature));
  assert.equal(await scenario.factory.vaultForContract(scenario.hash), ZeroAddress);
});

test('factory rejects acceptances when a signed Contract term is changed', async () => {
  const scenario = await createScenario();
  await rejectsCall(scenario.factory.connect(scenario.buyer).createVault({ ...scenario.init, feeBps: 300 }, scenario.buyerSignature, scenario.sellerSignature));
  assert.equal(await scenario.factory.vaultForContract(scenario.hash), ZeroAddress);
});

test('factory rejects an expired pair of participant acceptances', async () => {
  const scenario = await createScenario(undefined, (init) => ({ ...init, acceptanceDeadline: init.acceptanceDeadline + 60 }));
  await scenario.chain.request({ method: 'evm_setTime', params: [new Date((scenario.init.acceptanceDeadline + 1) * 1000)] });
  await scenario.chain.request({ method: 'evm_mine', params: [] });
  await rejectsCall(scenario.factory.connect(scenario.buyer).createVault.staticCall(scenario.init, scenario.buyerSignature, scenario.sellerSignature));
});

test('a signed participant creates an unfunded vault with fixed terms and no administrator interface', async () => {
  const scenario = await createScenario();
  await (await scenario.factory.connect(scenario.seller).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature)).wait();
  const vault = new Contract(await scenario.factory.vaultForContract(scenario.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, scenario.provider);

  assert.equal(await vault.token(), scenario.init.token);
  assert.equal(await vault.buyer(), scenario.init.buyer);
  assert.equal(await vault.seller(), scenario.init.seller);
  assert.equal(await vault.resolver(), scenario.init.resolver);
  assert.equal(await vault.feeRecipient(), scenario.init.feeRecipient);
  assert.equal(await vault.feeBps(), 250n);
  assert.equal(await vault.contractVersionHash(), scenario.init.versionHash);
  assert.equal(await vault.acceptanceDeadline(), BigInt(scenario.init.acceptanceDeadline));
  assert.equal(await vault.allocationTotal(), 2_000_000n);
  assert.equal(await vault.contractState(), 0n);
  assert.equal(await vault.milestoneCount(), 2n);

  const publicFunctions = artifact('contracts/EscrowVault.sol', 'EscrowVault').abi.filter((item) => item.type === 'function').map((item) => item.name);
  for (const forbiddenFunction of ['owner', 'pause', 'unpause', 'upgradeTo', 'rescue', 'adminWithdraw', 'releaseEligibleMilestone', 'resolveDispute']) {
    assert.equal(publicFunctions.includes(forbiddenFunction), false, `${forbiddenFunction} must not exist`);
  }
});

test('only the buyer can fund the exact allocation once before funding and delivery deadlines', async () => {
  const scenario = await createScenario();
  await (await scenario.factory.connect(scenario.buyer).createVault(scenario.init, scenario.buyerSignature, scenario.sellerSignature)).wait();
  const vaultAddress = await scenario.factory.vaultForContract(scenario.hash);
  const vault = new Contract(vaultAddress, artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, scenario.provider);

  await (await scenario.token.connect(scenario.buyer).faucet(scenario.init.amounts[0] + scenario.init.amounts[1])).wait();
  await (await scenario.token.connect(scenario.buyer).approve(vaultAddress, scenario.init.amounts[0] + scenario.init.amounts[1])).wait();

  await rejectsCall(vault.connect(scenario.seller).fund.staticCall());
  await (await vault.connect(scenario.buyer).fund()).wait();

  assert.equal(await vault.fundedAmount(), 2_000_000n);
  assert.equal(await scenario.token.balanceOf(vaultAddress), 2_000_000n);
  await rejectsCall(vault.connect(scenario.buyer).fund.staticCall());
});

test('funding rejects insufficient buyer funds or allowance and an expired funding window', async () => {
  const insufficient = await createScenario();
  await (await insufficient.factory.connect(insufficient.buyer).createVault(insufficient.init, insufficient.buyerSignature, insufficient.sellerSignature)).wait();
  const insufficientVault = new Contract(await insufficient.factory.vaultForContract(insufficient.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, insufficient.provider);
  await (await insufficient.token.connect(insufficient.buyer).approve(await insufficientVault.getAddress(), insufficient.init.amounts[0] + insufficient.init.amounts[1])).wait();
  await rejectsCall(insufficientVault.connect(insufficient.buyer).fund.staticCall());

  const insufficientAllowance = await createScenario();
  await (await insufficientAllowance.factory.connect(insufficientAllowance.buyer).createVault(insufficientAllowance.init, insufficientAllowance.buyerSignature, insufficientAllowance.sellerSignature)).wait();
  const insufficientAllowanceVault = new Contract(await insufficientAllowance.factory.vaultForContract(insufficientAllowance.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, insufficientAllowance.provider);
  const allocation = insufficientAllowance.init.amounts[0] + insufficientAllowance.init.amounts[1];
  await (await insufficientAllowance.token.connect(insufficientAllowance.buyer).faucet(allocation)).wait();
  await (await insufficientAllowance.token.connect(insufficientAllowance.buyer).approve(await insufficientAllowanceVault.getAddress(), allocation - 1n)).wait();
  await rejectsCall(insufficientAllowanceVault.connect(insufficientAllowance.buyer).fund.staticCall());

  const expired = await createScenario();
  await (await expired.factory.connect(expired.buyer).createVault(expired.init, expired.buyerSignature, expired.sellerSignature)).wait();
  const expiredVault = new Contract(await expired.factory.vaultForContract(expired.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, expired.provider);
  await expired.chain.request({ method: 'evm_setTime', params: [new Date((expired.init.fundingDeadline + 1) * 1000)] });
  await expired.chain.request({ method: 'evm_mine', params: [] });
  await rejectsCall(expiredVault.connect(expired.buyer).fund.staticCall());

  const deliveryElapsed = await createScenario(undefined, (init) => ({ ...init, fundingDeadline: init.deadlines[0] + 24 * 60 * 60 }));
  await (await deliveryElapsed.factory.connect(deliveryElapsed.buyer).createVault(deliveryElapsed.init, deliveryElapsed.buyerSignature, deliveryElapsed.sellerSignature)).wait();
  const deliveryElapsedVault = new Contract(await deliveryElapsed.factory.vaultForContract(deliveryElapsed.hash), artifact('contracts/EscrowVault.sol', 'EscrowVault').abi, deliveryElapsed.provider);
  const deliveryAllocation = deliveryElapsed.init.amounts[0] + deliveryElapsed.init.amounts[1];
  await (await deliveryElapsed.token.connect(deliveryElapsed.buyer).faucet(deliveryAllocation)).wait();
  await (await deliveryElapsed.token.connect(deliveryElapsed.buyer).approve(await deliveryElapsedVault.getAddress(), deliveryAllocation)).wait();
  await deliveryElapsed.chain.request({ method: 'evm_setTime', params: [new Date((deliveryElapsed.init.deadlines[0] + 1) * 1000)] });
  await deliveryElapsed.chain.request({ method: 'evm_mine', params: [] });
  await rejectsCall(deliveryElapsedVault.connect(deliveryElapsed.buyer).fund.staticCall());
});
