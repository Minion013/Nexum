import 'dotenv/config';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getAddress, verifyTypedData } from 'ethers';
class ValidationError extends Error {}
class DraftValidationError extends ValidationError {
  constructor(issue) {
    super(issue.message);
    this.issues = [issue];
  }
}
const requiredContractSectionTypes = ['parties', 'scope', 'milestones', 'payment', 'evidence', 'intellectual_property', 'change_control', 'dispute_resolution', 'notices'];
const contractAcceptanceStatement = 'I accept this exact NEXUM Contract Version. This signature does not move funds.';
const baseSepoliaChainId = 84532;
const oneDayInMilliseconds = 86_400_000;
const coPilotProjectStartOffsetDays = 1;
const coPilotFirstMilestoneOffsetDays = 14;
const coPilotSecondMilestoneOffsetDays = 28;
const coPilotMilestoneReviewWindowHours = 72;
const coPilotAuthorityNotice = 'These are editable drafting suggestions. The co-pilot cannot approve terms, move funds, release funds, judge quality, or resolve disputes.';
const milestoneEvidenceResourceKinds = ['document', 'repository', 'design', 'other'];
const milestoneEvidenceIntegrityPattern = /^sha(?:256|512):[a-f0-9]+$/;

export function contractAcceptanceTypedData({ contractId, versionId, versionHash }) {
  return {
    domain: { name: 'NEXUM Contract Acceptance', version: '1', chainId: baseSepoliaChainId },
    types: { ContractAcceptance: [{ name: 'contractId', type: 'string' }, { name: 'versionId', type: 'string' }, { name: 'versionHash', type: 'string' }, { name: 'statement', type: 'string' }] },
    message: { contractId, versionId, versionHash, statement: contractAcceptanceStatement }
  };
}

function verifiedWalletAcceptance({ contractId, versionId, versionHash, walletAddress, walletSignature }) {
  const address = getAddress(requiredText(walletAddress, 'Wallet address', 42));
  const signature = requiredText(walletSignature, 'Wallet signature', 256);
  const expectedHash = requiredText(versionHash, 'Contract Version hash', 256);
  const typedData = contractAcceptanceTypedData({ contractId, versionId, versionHash: expectedHash });
  if (getAddress(verifyTypedData(typedData.domain, typedData.types, typedData.message, signature)) !== address) throw new ValidationError('The wallet signature does not belong to the supplied wallet address.');
  return { walletAddress: address, walletSignature: signature, versionHash: expectedHash };
}

function configuredValue(environment, key) {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`${key} must be configured before NEXUM starts.`);
  return value;
}
function configuredHttpUrl(environment, key) {
  const value = configuredValue(environment, key);
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) URL.`);
  }
}

export function runtimeConfigurationFromEnvironment(environment = process.env) {
  const port = Number(environment.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const localTestProfile = localTestProfileFromEnvironment(environment);
  return {
    port,
    ...(localTestProfile ? { localTestProfile } : {}),
    publicSupabaseConfig: {
      url: configuredHttpUrl(environment, 'SUPABASE_URL'),
      publishableKey: configuredValue(environment, 'SUPABASE_PUBLISHABLE_KEY'),
      ...(environment.PRIVY_APP_ID?.trim() ? { privyAppId: environment.PRIVY_APP_ID.trim() } : {})
    }
  };
}

export function localTestProfileFromEnvironment(environment = process.env) {
  const email = environment.PACTFLOW_LOCAL_TEST_EMAIL?.trim().toLowerCase();
  if (!email || environment.NODE_ENV === 'production' || !/^[^\s@]+@[^\s@]+\.invalid$/.test(email)) return null;
  const id = '00000000-0000-4000-8000-000000000099';
  const wallet = email === 'pactflow-wallet-connected-test@local.invalid'
    ? { address: '0x1111111111111111111111111111111111111111', mockEusdBalance: '1,250 MockEUSD' }
    : undefined;
  return {
    id,
    email,
    profile: { id, email, displayName: 'Local Wallet Tester', professionalHeadline: 'Testnet service designer', bio: 'A local-only Profile Settings fixture.', avatarSeed: 'indigo', discoverable: true, onboardingCompletedAt: '2026-08-10T00:00:00.000Z' },
    ...(wallet ? { wallet } : {})
  };
}

export function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function respond(response, status, body, headers = {}) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); response.end(JSON.stringify(body)); }
class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}
export class ServiceUnavailableError extends Error {}
async function json(request) { let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 64_000) throw new ValidationError('Request is too large.'); } return body ? JSON.parse(body) : {}; }
function bearerToken(request) { const match = typeof request.headers.authorization === 'string' && request.headers.authorization.match(/^Bearer\s+(.+)$/i); return match?.[1]; }

function publicSupabaseConfigFromEnvironment() { return { url: process.env.SUPABASE_URL ?? null, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null, ...(process.env.PRIVY_APP_ID?.trim() ? { privyAppId: process.env.PRIVY_APP_ID.trim() } : {}) }; }
function createSupabaseSessionVerifier(config = publicSupabaseConfigFromEnvironment()) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  const supabase = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return async accessToken => {
    if (!accessToken) throw new AuthenticationError('A Supabase session is required.');
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) throw new AuthenticationError('Supabase authentication is invalid or expired.');
    return { id: user.id, email: user.email ?? null };
  };
}
export function createProfileLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    await ensureProfileForAppData(supabase, 'We could not prepare your NEXUM profile.');
    const { data, error } = await supabase.from('profiles').select('id, email, display_name, username, professional_headline, bio, avatar_seed, avatar_path, discoverable, onboarding_completed_at').eq('id', userId).single();
    if (error || !data) throw new AuthenticationError('Your NEXUM profile is unavailable.');
    return profileResponse(data, true);
  };
}
function authenticatedSupabaseClient(config, createSupabaseClient, accessToken) {
  return createSupabaseClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { autoRefreshToken: false, persistSession: false } });
}
async function ensureProfileForAppData(supabase, unavailableMessage) {
  const { error } = await supabase.rpc('ensure_profile');
  if (error) throw new AuthenticationError(unavailableMessage);
}
function mapContractListItem(contract, userId) {
  const versions = contract.contract_versions ?? [];
  const latestVersion = [...versions].sort((left, right) => right.version_number - left.version_number)[0] ?? { version_number: 0, contract_sections: [] };
  const sections = new Map((latestVersion.contract_sections ?? []).map(section => [section.section_type, section.terms ?? {}]));
  const scope = sections.get('scope') ?? {};
  const parties = sections.get('parties') ?? {};
  const notices = sections.get('notices') ?? {};
  const milestones = sections.get('milestones')?.items ?? [];
  const nextMilestone = milestones
    .filter(item => item?.title && item?.deliveryDeadlineUtc && Date.parse(item.deliveryDeadlineUtc) > Date.now())
    .sort((left, right) => Date.parse(left.deliveryDeadlineUtc) - Date.parse(right.deliveryDeadlineUtc))[0];
  const initiatorIsBuyer = parties.initiator_responsibility === 'buyer' || parties.buyer?.partyRef === 'initiating_party';
  const isInitiator = (contract.contract_parties ?? []).some(party => party.profile_id === userId);
  const responsibility = isInitiator ? (initiatorIsBuyer ? 'Buyer' : 'Service Provider') : (initiatorIsBuyer ? 'Service Provider' : 'Buyer');
  const counterparty = parties.counterparty_email ?? parties.counterpartyEmail ?? (responsibility === 'Buyer' ? notices.serviceProviderContact : notices.buyerContact) ?? 'Counterparty to be confirmed';
  return {
    id: contract.id,
    title: typeof scope.title === 'string' && scope.title.trim() ? scope.title.trim() : null,
    status: contract.status,
    latestVersionNumber: latestVersion.version_number,
    counterparty,
    responsibility,
    milestoneCount: milestones.length,
    ...(nextMilestone ? { nextMilestone: { title: nextMilestone.title, deadlineUtc: nextMilestone.deliveryDeadlineUtc } } : {}),
    lastActivityAt: contract.updated_at
  };
}

export function createContractsLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    await ensureProfileForAppData(supabase, 'We could not prepare your NEXUM Home.');
    const { data, error } = await supabase
      .from('contracts')
      .select('id, status, updated_at, contract_versions(version_number, contract_sections(section_type, terms)), contract_parties(profile_id)')
      .order('updated_at', { ascending: false });
    if (error) throw new AuthenticationError('Your NEXUM Home is unavailable.');
    return { contracts: (data ?? []).map(contract => mapContractListItem(contract, userId)) };
  };
}

export function createHomeLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  return createContractsLoader(config, createSupabaseClient);
}
export function createPeopleLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ accessToken, search = '' }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    const [discoverResult, connectionResult] = await Promise.all([
      supabase.rpc('discover_people', { search_text: typeof search === 'string' ? search.slice(0, 160) : '' }),
      supabase.rpc('list_people_connections')
    ]);
    if (discoverResult.error || connectionResult.error) throw new AuthenticationError('People is unavailable.');
    return {
      discover: (discoverResult.data ?? []).map(person => ({
        id: person.id,
        display_name: person.display_name,
        username: person.username,
        professional_headline: person.professional_headline
      })),
      connections: (connectionResult.data ?? []).map(connection => ({
        id: connection.id,
        other_profile_id: connection.other_profile_id,
        display_name: connection.display_name,
        email: connection.email,
        professional_headline: connection.professional_headline,
        status: connection.status,
        direction: connection.direction
      }))
    };
  };
}
function mapNotifications(rows) {
  const entries = (rows ?? []).map(notification => ({
    id: notification.id,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    createdAt: notification.created_at,
    readAt: notification.read_at
  }));
  return { unreadCount: entries.filter(entry => !entry.readAt).length, entries };
}
export function createNotificationLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ accessToken }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    await ensureProfileForAppData(supabase, 'We could not prepare your NEXUM inbox.');
    const { data, error } = await supabase.rpc('list_my_notifications');
    if (error) throw new AuthenticationError('Your NEXUM inbox is unavailable.');
    return mapNotifications(data);
  };
}
export function createNotificationWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ accessToken, notificationId }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    const { data, error } = await supabase.rpc('mark_my_notification_read', { target_notification_id: requiredUuid(notificationId, 'Notification') });
    const notification = data?.[0];
    if (error || !notification) throw new ValidationError('This notification is unavailable.');
    return { id: notification.id, readAt: notification.read_at };
  };
}

export function mapAuthorityRegistry(rows) {
  return {
    entries: (rows ?? []).map(authority => ({
      id: authority.id,
      name: authority.display_name,
      jurisdictionLabel: authority.jurisdiction_label,
      rulesetVersion: authority.ruleset_version,
      isSimulated: authority.is_simulated === true
    }))
  };
}

export function createAuthorityRegistryLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ accessToken }) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken)
      .from('resolution_authorities')
      .select('id, display_name, jurisdiction_label, ruleset_version, is_simulated')
      .eq('status', 'published')
      .order('display_name', { ascending: true });
    if (error) throw new ServiceUnavailableError('The Authority Registry is unavailable.');
    return mapAuthorityRegistry(data);
  };
}

function createLocalAuthorityRegistryFixture() {
  return {
    load: async () => mapAuthorityRegistry([{
      id: '00000000-0000-4000-8000-000000000201',
      display_name: 'NEXUM Simulation Authority',
      jurisdiction_label: 'Testnet simulation',
      ruleset_version: 'v1',
      is_simulated: true
    }])
  };
}

export function createPeopleWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ accessToken, profileId, action }) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc('manage_profile_connection', {
      target_profile_id: requiredUuid(profileId, 'Profile'), action: enumValue(action, ['send', 'accept', 'decline', 'withdraw', 'remove', 'block'], 'connection', 'action', 'Connection action')
    });
    if (error || !data) throw new ValidationError('This connection action is unavailable.');
    return { id: data };
  };
}
function createLocalPeopleFixture() {
  const profile = {
    id: '00000000-0000-4000-8000-000000000100',
    display_name: 'Local Directory Partner',
    username: 'local-directory-partner',
    professional_headline: 'Testnet service designer'
  };
  const connectionId = '00000000-0000-4000-8000-000000000110';
  let connection = null;
  const responseConnection = () => connection ? {
    id: connectionId,
    other_profile_id: profile.id,
    display_name: profile.display_name,
    professional_headline: profile.professional_headline,
    status: connection.status,
    direction: connection.direction
  } : null;
  return {
    load: async ({ search = '' }) => {
      const query = typeof search === 'string' ? search.trim().toLowerCase() : '';
      const matches = !query || [profile.display_name, profile.username, profile.professional_headline].some(value => value.toLowerCase().includes(query));
      const currentConnection = responseConnection();
      return { discover: matches && connection?.status !== 'blocked' ? [profile] : [], connections: currentConnection ? [currentConnection] : [] };
    },
    manage: async ({ profileId, action }) => {
      if (requiredUuid(profileId, 'Profile') !== profile.id) throw new ValidationError('This Profile is not available for local testing.');
      if (action === 'send' && !connection) connection = { status: 'pending', direction: 'outgoing' };
      else if (action === 'withdraw' && connection?.status === 'pending' && connection.direction === 'outgoing') connection.status = 'withdrawn';
      else if (action === 'remove' && connection?.status === 'accepted') connection = null;
      else if (action === 'block' && connection) connection.status = 'blocked';
      else throw new ValidationError('This connection action is not available.');
      return { id: connectionId };
    }
  };
}
export function validateMilestoneEvidencePayload(payload = {}) {
  const resource = payload?.resource;
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) throw new ValidationError('A protected evidence resource is required.');
  const resourceName = requiredText(resource.name, 'Evidence resource name', 160);
  const resourceKind = enumValue(resource.kind, milestoneEvidenceResourceKinds, 'evidence', 'resource.kind', 'Evidence resource kind');
  const mediaType = requiredText(resource.mediaType, 'Evidence media type', 160);
  const sizeBytes = Number(resource.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 50_000_000_000) throw new ValidationError('Evidence resource size must be a positive safe number of bytes.');
  const protectedLocator = requiredText(resource.protectedLocator, 'Protected evidence locator', 500);
  if (/\b(?:https?|ftp):\/\//i.test(protectedLocator)) throw new ValidationError('Protected evidence locators must not contain a raw private URL.');
  if (/\b(?:password|private\s+key|api\s*key|secret|bearer\s+token|credential)\b/i.test(JSON.stringify(resource))) throw new ValidationError('Evidence metadata must not contain credentials or secrets.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(protectedLocator)) throw new ValidationError('Protected evidence locator must be an opaque resource reference.');
  const integrityReference = payload.integrityReference == null || payload.integrityReference === '' ? null : requiredText(payload.integrityReference, 'Evidence integrity reference', 256);
  if (integrityReference && !milestoneEvidenceIntegrityPattern.test(integrityReference)) throw new ValidationError('Evidence integrity reference must use a supported sha256 or sha512 format.');
  return { resource: { name: resourceName, kind: resourceKind, mediaType, sizeBytes, protectedLocator }, integrityReference };
}

function requiredMilestoneKey(value) {
  const key = requiredText(value, 'Milestone');
  if (!/^milestone-[1-9][0-9]*$/.test(key)) throw new ValidationError('Milestone identifiers must use the milestone-N format.');
  return key;
}

export function validateMilestoneReviewDecisionPayload(payload = {}) {
  const action = enumValue(payload.action, ['check_criterion', 'request_revision', 'open_dispute', 'accept'], 'review', 'action', 'Milestone review action');
  const criterionId = payload.criterionId == null || payload.criterionId === '' ? null : Number(payload.criterionId);
  if (criterionId !== null && (!Number.isSafeInteger(criterionId) || criterionId < 1)) throw new ValidationError('Acceptance Criterion identifiers must be positive whole numbers.');
  const checked = payload.checked == null ? null : payload.checked;
  if (action === 'check_criterion' && (criterionId === null || typeof checked !== 'boolean')) throw new ValidationError('A criterion identifier and checked state are required.');
  if (action !== 'check_criterion' && (criterionId !== null || checked !== null)) throw new ValidationError('Criterion fields are only valid when checking an Acceptance Criterion.');
  const reason = payload.reason == null || payload.reason === '' ? null : requiredText(payload.reason, 'Decision reason', 2_000);
  if ((action === 'request_revision' || action === 'open_dispute') && !reason) throw new ValidationError('A recorded reason is required for this review decision.');
  if (action === 'accept' && reason) throw new ValidationError('Acceptance does not accept a decision reason.');
  return { action, criterionId, checked, reason };
}

function createLocalContractsFixture(localTestProfile = { id: '00000000-0000-4000-8000-000000000099', email: 'pactflow-wallet-test@local.invalid' }) {
  let sequence = 0;
  let invitationSequence = 0;
  let evidenceSequence = 0;
  const contracts = [];
  const authority = {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'NEXUM Simulation Authority',
    jurisdictionLabel: 'Testnet simulation',
    rulesetVersion: 'v1'
  };
  const reviewContractId = '00000000-0000-4000-8000-000000000901';
  const decisionReviewContractId = '00000000-0000-0000-0000-000000000902';
  const reviewDeadline = new Date(Date.now() + 7 * oneDayInMilliseconds).toISOString();
  const decisionEvidenceAt = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const reviewContract = {
    id: reviewContractId,
    status: 'active',
    versionNumber: 1,
    shareReady: true,
    updatedAt: new Date().toISOString(),
    sections: {
      parties: { buyer: { partyRef: 'counterparty', responsibility: 'Funds the agreed Contract milestones.' }, serviceProvider: { partyRef: 'initiating_party', responsibility: 'Delivers the agreed Contract milestones.' } },
      scope: { title: 'Local milestone review', description: 'A local-only active Contract for protected review acceptance.' },
      milestones: { items: [{ title: 'Research', deliveryOutcome: 'Annotated research findings', allocation: 400, evidenceRequirement: 'Private annotated findings.', acceptanceCriteria: [{ description: 'Research findings are documented.', required: true }], deliveryDeadlineUtc: reviewDeadline, reviewWindowHours: 72 }] },
      payment: { settlementToken: 'eUSD testnet demonstration token', totalAllocation: 400, paymentAuthority: 'not_configured' },
      evidence: { reviewDecision: 'Buyer records a review decision from the protected Milestone Review.' },
      change_control: { bilateralAmendmentOnly: true },
      notices: { buyerContact: 'buyer@example.test', serviceProviderContact: localTestProfile.email }
    },
    milestoneEvidence: [],
    activity: [{ id: 'local-activity-1', milestoneKey: 'milestone-1', type: 'contract_activated', occurredAt: new Date(Date.now() - 60_000).toISOString(), detail: 'Contract milestone review is available.' }]
  };
  const decisionReviewContract = {
    id: decisionReviewContractId,
    status: 'active',
    versionNumber: 1,
    shareReady: true,
    updatedAt: new Date().toISOString(),
    sections: {
      parties: { buyer: { partyRef: 'initiating_party', responsibility: 'Funds the agreed Contract milestones.' }, serviceProvider: { partyRef: 'counterparty', responsibility: 'Delivers the agreed Contract milestones.' } },
      scope: { title: 'Local buyer milestone review', description: 'A local-only active Contract for protected buyer review decisions.' },
      milestones: { items: [{ title: 'Research', deliveryOutcome: 'Annotated research findings', allocation: 400, evidenceRequirement: 'Private annotated findings.', acceptanceCriteria: [{ description: 'Research findings are documented.', required: true }], deliveryDeadlineUtc: reviewDeadline, reviewWindowHours: 72 }] },
      payment: { settlementToken: 'eUSD testnet demonstration token', totalAllocation: 400, paymentAuthority: 'not_configured' },
      evidence: { reviewDecision: 'Buyer records a review decision from the protected Milestone Review.' },
      change_control: { bilateralAmendmentOnly: true },
      notices: { buyerContact: localTestProfile.email, serviceProviderContact: 'provider@example.test' }
    },
    milestoneEvidence: [{ id: 'local-evidence-902', contractVersionId: `${decisionReviewContractId}-version-1`, milestoneKey: 'milestone-1', submittedByProfileId: 'local-service-provider', submittedAt: decisionEvidenceAt, resource: { name: 'research-notes.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 4096, protectedLocator: 'contracts/00000000-0000-0000-0000-000000000902/milestone-1/research-notes.pdf' }, integrityReference: 'sha256:' + '2'.repeat(64) }],
    activity: [
      { id: 'local-activity-902-1', milestoneKey: 'milestone-1', type: 'contract_activated', occurredAt: new Date(Date.parse(decisionEvidenceAt) - 60_000).toISOString(), detail: 'Contract milestone review is available.' },
      { id: 'local-activity-902-2', milestoneKey: 'milestone-1', type: 'evidence_submitted', occurredAt: decisionEvidenceAt, detail: 'Private evidence was submitted for review.' }
    ]
  };
  const find = contractId => contracts.find(contract => contract.id === contractId) ?? (contractId === reviewContractId ? reviewContract : contractId === decisionReviewContractId ? decisionReviewContract : undefined);
  const list = () => contracts.map(contract => ({
    id: contract.id,
    title: contract.sections.scope.title,
    status: contract.status,
    latestVersionNumber: contract.versionNumber,
    counterparty: contract.sections.parties.counterparty_email ?? 'Counterparty to be confirmed',
    responsibility: contract.sections.parties.initiator_responsibility === 'buyer' ? 'Buyer' : 'Service Provider',
    milestoneCount: contract.sections.milestones?.items?.length ?? 0,
    lastActivityAt: contract.updatedAt
  }));
  const draftFor = contract => ({
    id: contract.id,
    status: contract.status,
    versionNumber: contract.versionNumber,
    sections: {
      parties: contract.sections.parties ?? {},
      scope: contract.sections.scope ?? {},
      milestones: contract.sections.milestones?.items ?? [],
      payment: contract.sections.payment ?? {},
      evidence: contract.sections.evidence ?? {},
      intellectualProperty: contract.sections.intellectual_property ?? {},
      changeControl: contract.sections.change_control ?? {},
      notices: contract.sections.notices ?? {}
    },
    authority,
    authorities: [authority],
    paymentAuthority: 'not configured',
    shareReady: contract.shareReady === true
  });
  const detailFor = contract => {
    const draft = draftFor(contract);
    return {
      id: contract.id,
      status: contract.status,
      versionNumber: draft.versionNumber,
      counterparty: draft.sections.parties.counterparty_email ?? 'Counterparty to be confirmed',
      buyer: draft.sections.parties.initiator_responsibility === 'buyer' ? 'Local Wallet Tester' : 'Counterparty to be confirmed',
      sections: {
        scope: draft.sections.scope,
        milestones: draft.sections.milestones,
        payment: draft.sections.payment,
        evidence: draft.sections.evidence,
        changeControl: draft.sections.changeControl
      },
      paymentAuthority: 'not configured',
      ...(contract.activity ? { activity: contract.activity } : {})
    };
  };
  const milestoneReviewFor = (contract, milestoneKey) => {
    const match = /^milestone-(\d+)$/.exec(requiredText(milestoneKey, 'Milestone'));
    const number = Number(match?.[1]);
    const milestone = contract.sections.milestones?.items?.[number - 1];
    if (!match || !Number.isSafeInteger(number) || !milestone) throw new ValidationError('This Milestone Review is unavailable.');
    const evidence = (contract.milestoneEvidence ?? []).filter(item => item.milestoneKey === milestoneKey);
    const activity = (contract.activity ?? []).filter(item => item.milestoneKey === milestoneKey);
    const isBuyer = contract.sections.parties?.buyer?.partyRef === 'initiating_party';
  const criteria = (milestone.acceptanceCriteria ?? []).map((criterion, index) => {
      const latestCheck = [...activity].filter(item => item.type === 'criterion_checked' && item.criterionId === index + 1).at(-1);
      return { id: index + 1, ...criterion, checked: latestCheck?.checked === true };
    });
    const decisionState = {
      accepted: activity.some(item => item.type === 'accepted'),
      revisionRequested: activity.some(item => item.type === 'revision_requested'),
      disputeOpen: activity.some(item => item.type === 'dispute_opened')
    };
    const reviewWindow = evidence[0]?.submittedAt ? { submittedAt: evidence[0].submittedAt, expiresAt: new Date(Date.parse(evidence[0].submittedAt) + Number(milestone.reviewWindowHours) * 60 * 60 * 1_000).toISOString(), state: Date.parse(evidence[0].submittedAt) + Number(milestone.reviewWindowHours) * 60 * 60 * 1_000 <= Date.now() ? 'expired' : 'open' } : null;
    const canReviewDecisions = isBuyer && contract.status === 'active' && evidence.length > 0 && !decisionState.accepted && !decisionState.disputeOpen;
    const requiredCriteria = criteria.filter(criterion => criterion.required !== false);
    const allRequiredCriteriaChecked = requiredCriteria.length > 0 && requiredCriteria.every(criterion => criterion.checked);
    return {
      id: contract.id,
      status: contract.status,
      version: { id: `${contract.id}-version-${contract.versionNumber}`, number: contract.versionNumber },
      milestone: { key: milestoneKey, number, ...milestone },
      responsibility: isBuyer ? 'Buyer' : 'Service Provider',
      canSubmitEvidence: !isBuyer && contract.status === 'active' && evidence.length === 0 && Date.parse(milestone.deliveryDeadlineUtc) > Date.now(),
      evidence,
      activity,
      criteria,
      reviewWindow,
      decisionState,
      canCheckCriteria: canReviewDecisions,
      canAccept: canReviewDecisions && allRequiredCriteriaChecked && reviewWindow?.state === 'open',
      canRequestRevision: canReviewDecisions,
      canRaiseDispute: canReviewDecisions,
      canRelease: false
    };
  };
  const reviewFor = contract => {
    const draft = draftFor(contract);
    const sections = Object.entries({
      parties: draft.sections.parties,
      scope: draft.sections.scope,
      milestones: { items: draft.sections.milestones },
      payment: draft.sections.payment,
      evidence: draft.sections.evidence,
      intellectual_property: draft.sections.intellectualProperty,
      change_control: draft.sections.changeControl,
      notices: draft.sections.notices
    }).map(([type, terms]) => ({ type, terms }));
    return {
      id: contract.id,
      status: contract.status,
      version: {
        id: `${contract.id}-version-${draft.versionNumber}`,
        number: draft.versionNumber,
        hash: null,
        acceptanceReadyAt: null,
        authority: { authority_name: draft.authority.name, jurisdiction_label: draft.authority.jurisdictionLabel, ruleset_version: draft.authority.rulesetVersion },
        sections
      },
      parties: [{ id: 'local-wallet-tester-party', label: 'Local Wallet Tester', acceptedAt: null, walletAddress: null }],
      requiredSections: requiredContractSectionTypes.map(type => ({ type, complete: sections.some(section => section.type === type) })),
      canAccept: false,
      paymentAuthority: 'not configured'
    };
  };
  return {
    load: async () => ({ contracts: list() }),
    create: async ({ name, scope, counterpartyEmail, initiatorResponsibility }) => {
      const id = `00000000-0000-4000-8000-${String(300 + sequence++).padStart(12, '0')}`;
      const contract = {
        id,
        status: 'private_draft',
        versionNumber: 1,
        shareReady: false,
        updatedAt: new Date().toISOString(),
        sections: {
          parties: { counterparty_email: optionalEmail(counterpartyEmail), initiator_responsibility: enumValue(initiatorResponsibility, ['buyer', 'service_provider'], 'parties', 'initiatorResponsibility', 'Contract responsibility') },
          scope: { title: requiredText(name, 'Contract name', 160), description: requiredText(scope, 'Contract scope') }
        }
      };
      contracts.push(contract);
      return { id };
    },
    getDraft: async ({ contractId }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Contract is unavailable.');
      return draftFor(contract);
    },
    getDetail: async ({ contractId }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Contract is unavailable.');
      return detailFor(contract);
    },
    getMilestoneReview: async ({ contractId, milestoneKey }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Milestone Review is unavailable.');
      return milestoneReviewFor(contract, milestoneKey);
    },
    recordMilestoneReviewDecision: async ({ contractId, milestoneKey, ...payload }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Milestone Review is unavailable.');
      const decision = validateMilestoneReviewDecisionPayload(payload);
      const review = milestoneReviewFor(contract, milestoneKey);
      if (!review.canCheckCriteria && !review.canAccept && !review.canRequestRevision && !review.canRaiseDispute) throw new AuthorizationError('Only the authorised Buyer can make milestone review decisions.');
      if (decision.action === 'check_criterion') {
        const criterion = review.criteria.find(item => item.id === decision.criterionId);
        if (!criterion || criterion.required === false) throw new ValidationError('Only required Acceptance Criteria can be checked.');
        contract.activity.push({ id: `local-activity-${String(contract.activity.length + 1)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, type: 'criterion_checked', criterionId: decision.criterionId, checked: decision.checked, occurredAt: new Date().toISOString(), detail: `Acceptance Criterion ${decision.criterionId} was marked ${decision.checked ? 'complete' : 'incomplete'}.` });
      } else if (decision.action === 'accept') {
        if (!review.canAccept) throw new ValidationError('Every required Acceptance Criterion must be checked before acceptance.');
        contract.activity.push({ id: `local-activity-${String(contract.activity.length + 1)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, type: 'accepted', occurredAt: new Date().toISOString(), detail: 'The Buyer accepted the milestone after completing every required Acceptance Criterion.' });
      } else if (decision.action === 'request_revision') {
        contract.activity.push({ id: `local-activity-${String(contract.activity.length + 1)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, type: 'revision_requested', occurredAt: new Date().toISOString(), detail: decision.reason });
      } else {
        contract.activity.push({ id: `local-activity-${String(contract.activity.length + 1)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, type: 'dispute_opened', occurredAt: new Date().toISOString(), detail: decision.reason });
      }
      return milestoneReviewFor(contract, milestoneKey);
    },
    submitMilestoneEvidence: async ({ contractId, milestoneKey, resource, integrityReference }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Milestone Review is unavailable.');
      const review = milestoneReviewFor(contract, milestoneKey);
      if (review.responsibility !== 'Service Provider' || !review.canSubmitEvidence) throw new ValidationError('This milestone is not eligible for evidence submission.');
      const submittedAt = new Date().toISOString();
      const evidence = { id: `local-evidence-${String(901 + evidenceSequence++)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, submittedByProfileId: localTestProfile.id, submittedAt, resource, integrityReference };
      contract.milestoneEvidence.push(evidence);
      contract.activity.push({ id: `local-activity-${String(contract.activity.length + 1)}`, contractVersionId: `${contract.id}-version-${contract.versionNumber}`, milestoneKey, type: 'evidence_submitted', occurredAt: submittedAt, detail: 'Private evidence was submitted for review.' });
      return milestoneReviewFor(contract, milestoneKey);
    },
    getReview: async ({ contractId }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Contract review is unavailable.');
      return reviewFor(contract);
    },
    saveDraft: async ({ contractId, ...draft }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Contract is unavailable.');
      const validated = validatedDraft(draft);
      const originalParties = contract.sections.parties ?? {};
      contract.sections = {
        ...validated.sections,
        parties: {
          ...validated.sections.parties,
          ...(originalParties.counterparty_email ? { counterparty_email: originalParties.counterparty_email } : {})
        }
      };
      contract.versionNumber += 1;
      contract.shareReady = true;
      contract.updatedAt = new Date().toISOString();
      return draftFor(contract);
    },
    invite: async ({ contractId, email, role = 'counterparty' }) => {
      const contract = find(requiredText(contractId, 'Contract'));
      if (!contract) throw new ValidationError('This Contract is unavailable.');
      const inviteeEmail = validatePublishableDraft(draftFor(contract), email, role);
      contract.status = 'negotiation';
      contract.invitationId = `00000000-0000-4000-8000-${String(400 + invitationSequence++).padStart(12, '0')}`;
      contract.invitedEmail = inviteeEmail;
      contract.invitationRole = role;
      contract.updatedAt = new Date().toISOString();
      return { id: contract.invitationId };
    }
  };
}
function createLocalNotificationsFixture() {
  const notificationId = '00000000-0000-4000-8000-000000000120';
  let readAt = null;
  const localNotification = () => ({
    id: notificationId,
    category: 'connection',
    title: 'Local connection request',
    body: 'A local test Profile sent you a connection request.',
    href: '/people',
    created_at: '2026-08-12T08:00:00.000Z',
    read_at: readAt
  });
  return {
    load: async () => mapNotifications([localNotification()]),
    markRead: async ({ notificationId: targetNotificationId }) => {
      if (requiredUuid(targetNotificationId, 'Notification') !== notificationId) throw new ValidationError('This notification is unavailable.');
      readAt ??= new Date().toISOString();
      return { id: notificationId, readAt };
    }
  };
}
export function createProfileSettingsWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken, displayName, professionalHeadline, bio, avatarSeed, avatarPath, discoverable }) => {
    const update = {
      ...(displayName !== undefined ? { display_name: requiredText(displayName, 'Display name', 120) } : {}),
      ...(professionalHeadline !== undefined ? { professional_headline: professionalHeadline ? requiredText(professionalHeadline, 'Professional headline', 160) : null } : {}),
      ...(bio !== undefined ? { bio: bio ? requiredText(bio, 'Bio', 1_000) : null } : {}),
      ...(avatarSeed !== undefined ? { avatar_seed: enumValue(avatarSeed, ['indigo', 'teal', 'amber', 'rose', 'slate', 'violet'], 'profile', 'avatarSeed', 'Avatar colour') } : {}),
      ...(avatarPath !== undefined ? { avatar_path: avatarPath ? requiredAvatarPath(avatarPath, userId) : null } : {}),
      ...(discoverable !== undefined ? { discoverable: Boolean(discoverable) } : {})
    };
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).from('profiles').update(update).eq('id', userId).select('id, email, display_name, professional_headline, bio, avatar_seed, avatar_path, discoverable').single();
    if (error || !data) throw new AuthenticationError('We could not save your Profile Settings.');
    return profileResponse(data);
  };
}
function requiredText(value, label, limit = 4_000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new ValidationError(`${label} is required.`);
  return value.trim();
}
function optionalText(value, label, limit = 4_000) { return value ? requiredText(value, label, limit) : null; }
function profileResponse(data, includeOnboarding = false) {
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    ...(data.username !== undefined ? { username: data.username } : {}),
    professionalHeadline: data.professional_headline,
    ...(data.bio !== undefined ? { bio: data.bio } : {}),
    ...(data.avatar_seed !== undefined ? { avatarSeed: data.avatar_seed } : {}),
    ...(data.avatar_path !== undefined ? { avatarPath: data.avatar_path } : {}),
    discoverable: data.discoverable,
    ...(includeOnboarding ? { onboardingCompletedAt: data.onboarding_completed_at } : {})
  };
}
function saveLocalTestProfile(profile, input) {
  return Object.assign(profile, {
    displayName: requiredText(input.displayName, 'Display name', 120),
    professionalHeadline: optionalText(input.professionalHeadline, 'Professional headline', 160),
    bio: optionalText(input.bio, 'Bio', 1_000),
    avatarSeed: enumValue(input.avatarSeed, ['indigo', 'teal', 'amber', 'rose', 'slate', 'violet'], 'profile', 'avatarSeed', 'Avatar colour'),
    ...(input.avatarPath !== undefined ? { avatarPath: input.avatarPath ? requiredAvatarPath(input.avatarPath, profile.id) : null } : {}),
    discoverable: Boolean(input.discoverable)
  });
}
function requiredEmail(value) {
  const email = requiredText(value, 'Counterparty email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Enter a valid counterparty email address.');
  return email;
}
function optionalEmail(value) {
  return typeof value === 'string' && value.trim() ? requiredEmail(value) : null;
}
function requiredUuid(value, label) {
  const text = requiredText(value, label, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new ValidationError(`${label} must be valid.`);
  return text;
}
function requiredAvatarPath(value, userId) {
  const path = requiredText(value, 'Profile image path', 160);
  if (!new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/avatar\\.(?:jpg|jpeg|png|webp)$`, 'i').test(path)) throw new ValidationError('Profile image path is invalid.');
  return path;
}
function positiveWholeNumber(value, label, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new ValidationError(`${label} must be a whole number.`);
  return number;
}
function invalid(sectionType, fieldPath, code, message) { throw new DraftValidationError({ sectionType, fieldPath, code, message }); }
function section(value, sectionType) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(sectionType, '', 'required_section', `${sectionType.replaceAll('_', ' ')} terms are required.`);
  return value;
}
function text(value, sectionType, fieldPath, label, limit = 4_000) {
  try { return requiredText(value, label, limit); } catch { invalid(sectionType, fieldPath, 'required_text', `${label} is required.`); }
}
function email(value, sectionType, fieldPath, label) {
  try { return requiredEmail(value); } catch { invalid(sectionType, fieldPath, 'invalid_email', `${label} must be a valid email address.`); }
}
function canonicalTimestamp(value, sectionType, fieldPath, label, { future = true } = {}) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    invalid(sectionType, fieldPath, 'invalid_utc_timestamp', `${label} must be a UTC timestamp.`);
  }
  if (future && Date.parse(value) <= Date.now()) invalid(sectionType, fieldPath, 'past_timestamp', `${label} must be in the future.`);
  return value;
}
function stringList(value, sectionType, fieldPath, label) {
  if (!Array.isArray(value) || value.length === 0) invalid(sectionType, fieldPath, 'required_list', `${label} needs at least one item.`);
  return value.map((item, index) => text(item, sectionType, `${fieldPath}.${index}`, label));
}
function enumValue(value, allowed, sectionType, fieldPath, label) {
  if (!allowed.includes(value)) invalid(sectionType, fieldPath, 'invalid_choice', `${label} is invalid.`);
  return value;
}
function canonicalSuggestionDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9)).toISOString();
}
function suggestionDateFromText(value) {
  const date = new Date(`${value}T09:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function futureSuggestionDate(now, days) {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return canonicalSuggestionDate(date);
}
function suggestedTitle(brief) {
  const firstSentence = brief.split(/[.!?]/, 1)[0].trim();
  const withoutDeadline = firstSentence.replace(/\s+by\s+20\d{2}-\d{2}-\d{2}(?:\s|,|$).*/i, '').trim();
  return (withoutDeadline || firstSentence || 'Service engagement').slice(0, 160);
}
function suggestedDeadlines(brief, currentMilestones, now) {
  const requested = [...new Set([...brief.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map(match => suggestionDateFromText(match[1])).filter(Boolean))]
    .filter(deadline => Date.parse(deadline) > now.getTime())
    .sort();
  const current = currentMilestones
    .map(milestone => milestone?.deliveryDeadlineUtc)
    .filter(deadline => typeof deadline === 'string' && Date.parse(deadline) > now.getTime())
    .sort();
  if (requested.length >= 2) return requested.slice(0, 2);
  if (requested.length === 1) {
    const earlierCurrentDeadline = current.find(deadline => deadline < requested[0]);
    if (earlierCurrentDeadline) return [earlierCurrentDeadline, requested[0]];
    const requestedTime = Date.parse(requested[0]);
    const oneDayBeforeRequested = canonicalSuggestionDate(new Date(requestedTime - oneDayInMilliseconds));
    if (Date.parse(oneDayBeforeRequested) > now.getTime()) return [oneDayBeforeRequested, requested[0]];
    return [requested[0], futureSuggestionDate(new Date(requestedTime), 7)];
  }
  return current.length >= 2 ? current.slice(0, 2) : [futureSuggestionDate(now, coPilotFirstMilestoneOffsetDays), futureSuggestionDate(now, coPilotSecondMilestoneOffsetDays)];
}
function normalizedSuggestionDraftSections(draft) {
  if (draft.sections) return draft.sections;
  return {
    ...draft,
    milestones: Array.isArray(draft.milestones) ? { items: draft.milestones } : draft.milestones
  };
}

export function suggestContractDraft({ brief, draft = {}, now = new Date() }) {
  const commercialBrief = requiredText(brief, 'Commercial brief', 3_200);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new ValidationError('A valid suggestion time is required.');
  const title = suggestedTitle(commercialBrief);
  const sections = normalizedSuggestionDraftSections(draft);
  const currentMilestones = sections.milestones?.items ?? [];
  const [discoveryDeadline, deliveryDeadline] = suggestedDeadlines(commercialBrief, currentMilestones, now);
  const totalAllocation = Number(sections.payment?.totalAllocation) || 1_000;
  const firstAllocation = Math.floor(totalAllocation / 2);
  return {
    scope: {
      title,
      description: commercialBrief,
      outcome: `A documented delivery of ${title.toLowerCase()}.`,
      includedDeliverables: ['Discovery findings', 'Documented delivery handoff'],
      excludedWork: ['Ongoing operations outside the stated milestones'],
      projectStartDateUtc: futureSuggestionDate(now, coPilotProjectStartOffsetDays),
      clientDependencies: ['Timely access to the materials needed for the stated scope']
    },
    milestones: [
      { title: 'Discovery', deliveryOutcome: `Document the findings that shape ${title.toLowerCase()}.`, allocation: firstAllocation, evidenceRequirement: 'A private summary of the completed discovery work.', acceptanceCriteria: [{ description: 'The documented findings address the agreed scope.', required: true }], deliveryDeadlineUtc: discoveryDeadline, reviewWindowHours: coPilotMilestoneReviewWindowHours },
      { title: 'Delivery', deliveryOutcome: `Deliver the agreed outcome for ${title.toLowerCase()} with a documented handoff.`, allocation: totalAllocation - firstAllocation, evidenceRequirement: 'A private delivery summary and handoff record without credentials or secrets.', acceptanceCriteria: [{ description: 'The agreed delivery and handoff are complete.', required: true }], deliveryDeadlineUtc: deliveryDeadline, reviewWindowHours: coPilotMilestoneReviewWindowHours }
    ],
    evidence: { reviewDecision: 'Buyer records acceptance or a specific change request within the review window.', dependencyAcknowledgementRequired: false },
    notice: coPilotAuthorityNotice
  };
}
function validatedDraft(draft) {
  const parties = section(draft.parties, 'parties');
  const buyer = section(parties.buyer, 'parties');
  const serviceProvider = section(parties.serviceProvider, 'parties');
  const counterpartyEmail = optionalEmail(parties.counterparty_email ?? parties.counterpartyEmail);
  const additionalViewerEmails = Array.isArray(parties.additional_viewer_emails)
    ? parties.additional_viewer_emails.map((value, index) => email(value, 'parties', `additional_viewer_emails.${index}`, 'Viewer email'))
    : [];
  const validatedParties = {
    buyer: {
      partyRef: enumValue(buyer.partyRef, ['initiating_party', 'counterparty'], 'parties', 'buyer.partyRef', 'Buyer party'),
      responsibility: text(buyer.responsibility, 'parties', 'buyer.responsibility', 'Buyer responsibility', 500),
      ...(typeof buyer.legalName === 'string' && buyer.legalName.trim() ? { legalName: text(buyer.legalName, 'parties', 'buyer.legalName', 'Buyer legal name', 200) } : {})
    },
    serviceProvider: {
      partyRef: enumValue(serviceProvider.partyRef, ['initiating_party', 'counterparty'], 'parties', 'serviceProvider.partyRef', 'Service provider party'),
      responsibility: text(serviceProvider.responsibility, 'parties', 'serviceProvider.responsibility', 'Service provider responsibility', 500),
      ...(typeof serviceProvider.legalName === 'string' && serviceProvider.legalName.trim() ? { legalName: text(serviceProvider.legalName, 'parties', 'serviceProvider.legalName', 'Service provider legal name', 200) } : {})
    },
    ...(counterpartyEmail ? { counterparty_email: counterpartyEmail } : {}),
    ...(additionalViewerEmails.length ? { additional_viewer_emails: additionalViewerEmails } : {})
  };
  if (validatedParties.buyer.partyRef === validatedParties.serviceProvider.partyRef) invalid('parties', 'serviceProvider.partyRef', 'duplicate_party', 'Buyer and service provider must be different Contract Parties.');

  const scope = section(draft.scope, 'scope');
  const validatedScope = {
    title: text(scope.title, 'scope', 'title', 'Contract title', 160),
    description: text(scope.description, 'scope', 'description', 'Contract scope'),
    outcome: text(scope.outcome, 'scope', 'outcome', 'Scope outcome', 1_000),
    includedDeliverables: stringList(scope.includedDeliverables, 'scope', 'includedDeliverables', 'Included deliverables'),
    excludedWork: stringList(scope.excludedWork, 'scope', 'excludedWork', 'Excluded work'),
    projectStartDateUtc: canonicalTimestamp(scope.projectStartDateUtc, 'scope', 'projectStartDateUtc', 'Project start date'),
    clientDependencies: Array.isArray(scope.clientDependencies) ? scope.clientDependencies.map((item, index) => text(item, 'scope', `clientDependencies.${index}`, 'Client dependency')) : []
  };

  if (!Array.isArray(draft.milestones) || draft.milestones.length < 2 || draft.milestones.length > 3) invalid('milestones', '', 'milestone_count', 'A Contract needs two or three milestones.');
  const validatedMilestones = draft.milestones.map((milestone, index) => {
    if (!milestone || typeof milestone !== 'object' || Array.isArray(milestone)) invalid('milestones', String(index), 'invalid_milestone', `Milestone ${index + 1} is invalid.`);
    let allocation;
    try { allocation = positiveWholeNumber(milestone.allocation, `Milestone ${index + 1} allocation`); } catch { invalid('milestones', `${index}.allocation`, 'invalid_allocation', `Milestone ${index + 1} allocation must be a positive whole number.`); }
    return {
      title: text(milestone.title, 'milestones', `${index}.title`, `Milestone ${index + 1} title`, 160),
      deliveryOutcome: text(milestone.deliveryOutcome, 'milestones', `${index}.deliveryOutcome`, `Milestone ${index + 1} delivery outcome`, 1_000),
      allocation,
      evidenceRequirement: text(milestone.evidenceRequirement, 'milestones', `${index}.evidenceRequirement`, `Milestone ${index + 1} evidence requirement`),
      acceptanceCriteria: (() => {
        if (!Array.isArray(milestone.acceptanceCriteria) || !milestone.acceptanceCriteria.length) invalid('milestones', `${index}.acceptanceCriteria`, 'missing_acceptance_criteria', `Milestone ${index + 1} needs at least one required Acceptance Criterion.`);
        const criteria = milestone.acceptanceCriteria.map((criterion, criterionIndex) => ({
          description: text(criterion?.description, 'milestones', `${index}.acceptanceCriteria.${criterionIndex}.description`, `Milestone ${index + 1} Acceptance Criterion`, 500),
          required: criterion?.required !== false
        }));
        if (!criteria.some(criterion => criterion.required)) invalid('milestones', `${index}.acceptanceCriteria`, 'missing_required_acceptance_criterion', `Milestone ${index + 1} needs at least one required Acceptance Criterion.`);
        return criteria;
      })(),
      deliveryDeadlineUtc: canonicalTimestamp(milestone.deliveryDeadlineUtc, 'milestones', `${index}.deliveryDeadlineUtc`, `Milestone ${index + 1} delivery deadline`),
      reviewWindowHours: enumValue(Number(milestone.reviewWindowHours), [24, 72, 168], 'milestones', `${index}.reviewWindowHours`, `Milestone ${index + 1} review window`)
    };
  });
  for (let index = 1; index < validatedMilestones.length; index += 1) {
    if (validatedMilestones[index - 1].deliveryDeadlineUtc >= validatedMilestones[index].deliveryDeadlineUtc) invalid('milestones', `${index}.deliveryDeadlineUtc`, 'unordered_deadline', 'Milestone delivery deadlines must be in order.');
  }

  const payment = section(draft.payment, 'payment');
  let totalAllocation;
  try { totalAllocation = positiveWholeNumber(payment.totalAllocation, 'Contract total allocation'); } catch { invalid('payment', 'totalAllocation', 'invalid_allocation', 'Contract total allocation must be a positive whole number.'); }
  if (validatedMilestones.reduce((sum, milestone) => sum + milestone.allocation, 0) !== totalAllocation) invalid('payment', 'totalAllocation', 'non_conserving_allocation', 'Milestone allocations must equal the Contract total allocation.');
  const successFeeBps = Number(payment.successFeeBps);
  if (!Number.isSafeInteger(successFeeBps) || successFeeBps < 0 || successFeeBps > 1_000) invalid('payment', 'successFeeBps', 'invalid_success_fee', 'Success fee must be between 0 and 1,000 basis points.');
  const fundingDeadlineUtc = canonicalTimestamp(payment.fundingDeadlineUtc, 'payment', 'fundingDeadlineUtc', 'Funding deadline');
  if (fundingDeadlineUtc >= validatedMilestones[0].deliveryDeadlineUtc) invalid('payment', 'fundingDeadlineUtc', 'funding_after_delivery', 'Funding deadline must be before the first delivery deadline.');
  const validatedPayment = {
    settlementToken: text(payment.settlementToken, 'payment', 'settlementToken', 'Settlement token', 160),
    network: enumValue(payment.network, ['Base Sepolia'], 'payment', 'network', 'Settlement network'),
    totalAllocation,
    fundingDeadlineUtc,
    fundingWindowHours: 48,
    successFeeBps,
    feeRecipient: successFeeBps === 0 ? '' : text(payment.feeRecipient, 'payment', 'feeRecipient', 'Fee recipient', 320),
    paymentAuthority: 'not_configured'
  };

  const evidence = section(draft.evidence, 'evidence');
  const validatedEvidence = {
    reviewDecision: text(evidence.reviewDecision, 'evidence', 'reviewDecision', 'Review decision rule', 1_000),
    dependencyAcknowledgementRequired: Boolean(evidence.dependencyAcknowledgementRequired)
  };
  for (const [index, milestone] of validatedMilestones.entries()) {
    if (/(private key|password|api[ _-]?key|https?:\/\/)/i.test(milestone.evidenceRequirement)) invalid('milestones', `${index}.evidenceRequirement`, 'unsafe_evidence_reference', 'Evidence requirements must not contain credentials or raw private file URLs.');
  }

  const intellectualProperty = section(draft.intellectualProperty, 'intellectual_property');
  const ipOutcome = enumValue(intellectualProperty.outcome, ['client_owns_project_deliverables_on_final_settlement', 'provider_retains_ownership_with_client_license'], 'intellectual_property', 'outcome', 'Intellectual-property outcome');
  const confidentiality = enumValue(intellectualProperty.confidentiality, ['not_requested', 'mutual_confidentiality'], 'intellectual_property', 'confidentiality', 'Confidentiality choice');
  const validatedIntellectualProperty = {
    outcome: ipOutcome,
    licenseScope: ipOutcome === 'provider_retains_ownership_with_client_license' ? text(intellectualProperty.licenseScope, 'intellectual_property', 'licenseScope', 'License scope', 1_000) : '',
    confidentiality,
    confidentialityDuration: confidentiality === 'mutual_confidentiality' ? text(intellectualProperty.confidentialityDuration, 'intellectual_property', 'confidentialityDuration', 'Confidentiality duration', 160) : ''
  };

  const changeControl = section(draft.changeControl, 'change_control');
  const validatedChangeControl = {
    proposalProcess: text(changeControl.proposalProcess, 'change_control', 'proposalProcess', 'Change-request process', 1_000),
    bilateralAmendmentOnly: changeControl.bilateralAmendmentOnly === true
  };
  if (!validatedChangeControl.bilateralAmendmentOnly) invalid('change_control', 'bilateralAmendmentOnly', 'missing_bilateral_rule', 'Future uncompleted milestones must require a bilateral amendment.');

  const notices = section(draft.notices, 'notices');
  const validatedNotices = {
    buyerContact: email(notices.buyerContact, 'notices', 'buyerContact', 'Buyer notice email'),
    serviceProviderContact: email(notices.serviceProviderContact, 'notices', 'serviceProviderContact', 'Service provider notice email'),
    exactVersionAcknowledgement: notices.exactVersionAcknowledgement === true
  };
  if (!validatedNotices.exactVersionAcknowledgement) invalid('notices', 'exactVersionAcknowledgement', 'missing_version_acknowledgement', 'Acknowledge that acceptance applies to this exact Version.');

  return {
    authorityId: requiredUuid(draft.authorityId, 'Resolution Authority'),
    sections: {
      parties: validatedParties,
      scope: validatedScope,
      milestones: { items: validatedMilestones },
      payment: validatedPayment,
      evidence: validatedEvidence,
      intellectual_property: validatedIntellectualProperty,
      change_control: validatedChangeControl,
      notices: validatedNotices
    }
  };
}
function mapContractDraft(contract, authorities = []) {
  const latestVersion = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number)[0];
  if (!latestVersion) throw new ValidationError('This Contract has no readable draft version.');
  const sections = new Map((latestVersion.contract_sections ?? []).map(section => [section.section_type, section.terms]));
  const scope = sections.get('scope') ?? {};
  const milestones = sections.get('milestones')?.items ?? [];
  const payment = sections.get('payment') ?? {};
  const parties = sections.get('parties') ?? {};
  const evidence = sections.get('evidence') ?? {};
  const intellectualProperty = sections.get('intellectual_property') ?? {};
  const changeControl = sections.get('change_control') ?? {};
  const notices = sections.get('notices') ?? {};
  const authority = latestVersion.authority_snapshot ?? {};
  return {
    id: contract.id,
    status: contract.status,
    versionNumber: latestVersion.version_number,
    sections: {
      parties,
      scope,
      milestones,
      payment,
      evidence,
      intellectualProperty,
      changeControl,
      notices
    },
    authority: {
      id: latestVersion.selected_authority_id,
      name: authority.authority_name ?? '',
      jurisdictionLabel: authority.jurisdiction_label ?? '',
      rulesetVersion: authority.ruleset_version ?? ''
    },
    authorities: authorities.map(item => ({ id: item.id, name: item.display_name, jurisdictionLabel: item.jurisdiction_label, rulesetVersion: item.ruleset_version })),
    paymentAuthority: 'not configured',
    shareReady: Boolean(latestVersion.acceptance_ready_at)
  };
}
export function mapContractDetail(contract, userId) {
  const version = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number)[0];
  if (!version) throw new ValidationError('This Contract has no readable Version.');
  const sections = new Map((version.contract_sections ?? []).map(section => [section.section_type, section.terms ?? {}]));
  const parties = sections.get('parties') ?? {};
  const notices = sections.get('notices') ?? {};
  const partyProfiles = (contract.contract_parties ?? []).map(party => ({ id: party.profile_id, label: party.profiles?.display_name ?? party.profiles?.email ?? null }));
  const counterpartyProfile = partyProfiles.find(party => party.id !== userId)?.label;
  const buyerParty = parties.buyer?.partyRef === 'initiating_party' ? partyProfiles[0]?.label : counterpartyProfile;
  return {
    id: contract.id,
    status: contract.status,
    versionNumber: version.version_number,
    counterparty: counterpartyProfile ?? notices.serviceProviderContact ?? notices.buyerContact ?? 'Counterparty to be confirmed',
    buyer: buyerParty ?? 'Buyer to be confirmed',
    sections: {
      scope: sections.get('scope') ?? {},
      milestones: sections.get('milestones')?.items ?? [],
      payment: sections.get('payment') ?? {},
      evidence: sections.get('evidence') ?? {},
      changeControl: sections.get('change_control') ?? {}
    },
    paymentAuthority: sections.get('payment')?.paymentAuthority ?? 'not configured'
  };
}
function draftInputForPublication(draft) {
  return {
    authorityId: draft.authority?.id,
    ...draft.sections,
    milestones: draft.sections?.milestones
  };
}
function validatePublishableDraft(draft, invitationEmail, role = 'counterparty') {
  if (!draft.shareReady) throw new ValidationError('Complete and save the Contract terms before sending an invitation.');
  const savedEmail = optionalEmail(draft.sections?.parties?.counterparty_email ?? draft.sections?.parties?.counterpartyEmail);
  if (!savedEmail) throw new ValidationError('An exact counterparty email is required before sending an invitation.');
  const requestedEmail = requiredEmail(invitationEmail);
  if (role !== 'viewer' && savedEmail !== requestedEmail) throw new ValidationError('The invitation email must match the saved counterparty email.');
  if (role !== 'counterparty' && role !== 'viewer') throw new ValidationError('The invitation access type is invalid.');
  validatedDraft(draftInputForPublication(draft));
  return requestedEmail;
}
function mapContractReview(contract) {
  const version = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number)[0];
  if (!version) throw new ValidationError('This Contract has no readable version.');
  const parties = (contract.contract_parties ?? []).map(party => ({
    id: party.id,
    label: party.profiles?.display_name ?? party.profiles?.email ?? 'Contract Party'
  }));
  const acceptanceByPartyId = new Map((version.contract_acceptances ?? []).map(acceptance => [acceptance.contract_party_id, { acceptedAt: acceptance.accepted_at, walletAddress: acceptance.signer_wallet_address ?? null }]));
  const presentSectionTypes = new Set((version.contract_sections ?? []).map(section => section.section_type));
  return {
    id: contract.id,
    status: contract.status,
    version: {
      id: version.id,
      number: version.version_number,
      hash: version.version_hash,
      acceptanceReadyAt: version.acceptance_ready_at,
      authority: version.authority_snapshot ?? {},
      sections: [...(version.contract_sections ?? [])]
        .sort((left, right) => left.position - right.position)
        .map(section => ({ type: section.section_type, terms: section.terms }))
    },
    parties: parties.map(party => ({ ...party, acceptedAt: acceptanceByPartyId.get(party.id)?.acceptedAt ?? null, walletAddress: acceptanceByPartyId.get(party.id)?.walletAddress ?? null })),
    requiredSections: requiredContractSectionTypes.map(type => ({ type, complete: presentSectionTypes.has(type) })),
    canAccept: Boolean(version.acceptance_ready_at) && parties.length === 2 && requiredContractSectionTypes.every(type => presentSectionTypes.has(type)),
    paymentAuthority: 'not configured'
  };
}

export function mapMilestoneReview({ contract, milestoneKey, evidence = [], activity = [], userId, now = new Date() }) {
  const versions = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number);
  const acceptedVersion = versions.find(version => Array.isArray(version.contract_acceptances) && version.contract_acceptances.length >= 2);
  const version = acceptedVersion ?? versions[0];
  if (!version) throw new ValidationError('This Milestone Review has no readable Contract Version.');
  const sections = new Map((version.contract_sections ?? []).map(section => [section.section_type, section.terms ?? {}]));
  const milestones = sections.get('milestones')?.items ?? [];
  const milestoneNumber = Number(requiredMilestoneKey(milestoneKey).slice('milestone-'.length));
  const sourceMilestone = milestones[milestoneNumber - 1];
  if (!sourceMilestone) throw new ValidationError('This Milestone Review is unavailable.');
  const parties = sections.get('parties') ?? {};
  const creatorProfileId = contract.created_by_profile_id;
  const isInitiatingParty = userId === creatorProfileId;
  const serviceProviderRef = parties.serviceProvider?.partyRef ?? (parties.initiator_responsibility === 'service_provider' ? 'initiating_party' : 'counterparty');
  const isServiceProvider = serviceProviderRef === 'initiating_party' ? isInitiatingParty : !isInitiatingParty;
  const isParty = (contract.contract_parties ?? []).some(party => party.profile_id === userId);
  const versionEvidence = evidence.filter(item => !item.contract_version_id || item.contract_version_id === version.id);
  const versionActivity = activity.filter(item => !item.contract_version_id || item.contract_version_id === version.id);
  const priorMilestonesComplete = milestones.slice(0, milestoneNumber - 1).every((_, index) => versionEvidence.some(item => item.milestone_key === `milestone-${index + 1}`));
  const mappedEvidence = evidence
    .filter(item => (!item.contract_version_id || item.contract_version_id === version.id) && item.milestone_key === milestoneKey)
    .map(item => ({ id: item.id, milestoneKey: item.milestone_key, submittedByProfileId: item.submitted_by_profile_id, submittedAt: item.submitted_at, resource: item.resource_metadata ?? {}, integrityReference: item.integrity_reference ?? null }));
  const mappedActivity = versionActivity
    .filter(item => item.milestone_key === milestoneKey)
    .map(item => ({ id: item.id, milestoneKey: item.milestone_key, type: item.event_type, actorProfileId: item.actor_profile_id, occurredAt: item.occurred_at, detail: item.payload?.detail ?? null, criterionId: item.payload?.criterionId ?? null, checked: item.payload?.checked ?? null, reason: item.payload?.reason ?? null, disputeCaseId: item.dispute_case_id ?? item.payload?.disputeCaseId ?? null }));
  const firstEvidenceAt = mappedEvidence[0]?.submittedAt ? Date.parse(mappedEvidence[0].submittedAt) : NaN;
  const reviewWindowMs = Number(sourceMilestone.reviewWindowHours) * oneDayInMilliseconds / 24;
  const reviewWindow = Number.isFinite(firstEvidenceAt) && Number.isFinite(reviewWindowMs) ? {
    submittedAt: mappedEvidence[0].submittedAt,
    expiresAt: new Date(firstEvidenceAt + reviewWindowMs).toISOString(),
    state: firstEvidenceAt + reviewWindowMs <= now.getTime() ? 'expired' : 'open'
  } : null;
  const criteria = (sourceMilestone.acceptanceCriteria ?? []).map((criterion, index) => {
    const latestCheck = [...mappedActivity].filter(item => item.type === 'criterion_checked' && Number(item.criterionId) === index + 1).sort((left, right) => Date.parse(left.occurredAt || '') - Date.parse(right.occurredAt || '') || String(left.id).localeCompare(String(right.id))).at(-1);
    return { id: index + 1, description: criterion.description, required: criterion.required !== false, checked: latestCheck?.checked === true };
  });
  const decisionState = {
    accepted: mappedActivity.some(item => item.type === 'accepted'),
    revisionRequested: mappedActivity.some(item => item.type === 'revision_requested'),
    disputeOpen: mappedActivity.some(item => item.type === 'dispute_opened')
  };
  const buyerRef = parties.buyer?.partyRef ?? (parties.initiator_responsibility === 'buyer' ? 'initiating_party' : 'counterparty');
  const isBuyer = buyerRef === 'initiating_party' ? isInitiatingParty : !isInitiatingParty;
  const canReviewDecisions = isParty && isBuyer && contract.status === 'active' && mappedEvidence.length > 0 && !decisionState.accepted && !decisionState.disputeOpen;
  const requiredCriteria = criteria.filter(criterion => criterion.required);
  const allRequiredCriteriaChecked = requiredCriteria.length > 0 && requiredCriteria.every(criterion => criterion.checked);
  return {
    id: contract.id,
    status: contract.status,
    version: { id: version.id, number: version.version_number },
    milestone: { key: milestoneKey, number: milestoneNumber, ...sourceMilestone },
    responsibility: isServiceProvider ? 'Service Provider' : 'Buyer',
    canSubmitEvidence: isParty && isServiceProvider && contract.status === 'active' && mappedEvidence.length === 0 && priorMilestonesComplete && Date.parse(sourceMilestone.deliveryDeadlineUtc) > now.getTime(),
    evidence: mappedEvidence,
    activity: mappedActivity,
    criteria,
    reviewWindow,
    decisionState,
    canCheckCriteria: canReviewDecisions,
    canAccept: canReviewDecisions && allRequiredCriteriaChecked && reviewWindow?.state === 'open',
    canRequestRevision: canReviewDecisions,
    canRaiseDispute: canReviewDecisions,
    canRelease: false
  };
}

export function createContractWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return {
    create: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    invite: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    accept: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getInvitation: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getDetail: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getMilestoneReview: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    recordMilestoneReviewDecision: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    submitMilestoneEvidence: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    suggest: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    saveDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getReview: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    acceptVersion: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); }
  };
  const call = async ({ accessToken }, name, args, unavailableMessage) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc(name, args);
    if (error) {
      if (/only a Contract Party can edit this draft|only a Contract Party can invite/i.test(error.message ?? '')) throw new AuthorizationError('Only a Contract Party can edit this Contract Draft.');
      throw new ValidationError(unavailableMessage);
    }
    if (!data) throw new ValidationError(unavailableMessage);
    return data;
  };
  const getDraft = async ({ accessToken, contractId }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    const [contractResult, authorityResult] = await Promise.all([
      supabase.from('contracts').select('id, status, contract_versions(id, version_number, selected_authority_id, authority_snapshot, acceptance_ready_at, contract_sections(section_type, position, terms))').eq('id', requiredText(contractId, 'Contract')).single(),
      supabase.from('resolution_authorities').select('id, display_name, jurisdiction_label, ruleset_version').eq('status', 'published')
    ]);
    if (contractResult.error || !contractResult.data || authorityResult.error) throw new ValidationError('This Contract is unavailable.');
    return mapContractDraft(contractResult.data, authorityResult.data ?? []);
  };
  const getReview = async ({ accessToken, contractId }) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken)
      .from('contracts')
      .select('id, status, contract_parties(id, profiles(display_name, email)), contract_versions(id, version_number, version_hash, acceptance_ready_at, authority_snapshot, contract_sections(section_type, position, terms), contract_acceptances(contract_party_id, accepted_at, signer_wallet_address))')
      .eq('id', requiredText(contractId, 'Contract'))
      .single();
    if (error || !data) throw new ValidationError('This Contract review is unavailable.');
    return mapContractReview(data);
  };
  const getDetail = async ({ userId, accessToken, contractId }) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken)
      .from('contracts')
      .select('id, status, contract_parties(profile_id, profiles!contract_parties_profile_id_fkey(display_name, email)), contract_versions(version_number, contract_sections(section_type, terms))')
      .eq('id', requiredText(contractId, 'Contract'))
      .single();
    if (error || !data) throw new ValidationError('This Contract is unavailable.');
    return mapContractDetail(data, userId);
  };
  const getMilestoneReview = async ({ userId, accessToken, contractId, milestoneKey }) => {
    const targetContractId = requiredText(contractId, 'Contract');
    const targetMilestoneKey = requiredMilestoneKey(milestoneKey);
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    const [contractResult, evidenceResult, activityResult] = await Promise.all([
      supabase.from('contracts').select('id, status, created_by_profile_id, contract_parties(id, profile_id, profiles!contract_parties_profile_id_fkey(display_name, email)), contract_versions(id, version_number, contract_acceptances(contract_party_id), contract_sections(section_type, position, terms))').eq('id', targetContractId).single(),
      supabase.from('milestone_evidence_submissions').select('id, contract_id, contract_version_id, milestone_key, submitted_by_profile_id, submitted_at, resource_metadata, integrity_reference, dispute_case_id').eq('contract_id', targetContractId).order('submitted_at', { ascending: true }),
      supabase.from('milestone_activity').select('id, contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, occurred_at, payload, dispute_case_id').eq('contract_id', targetContractId).order('occurred_at', { ascending: true }).order('id', { ascending: true })
    ]);
    if (contractResult.error || !contractResult.data || evidenceResult.error || activityResult.error) throw new ValidationError('This Milestone Review is unavailable.');
    return mapMilestoneReview({ contract: contractResult.data, milestoneKey: targetMilestoneKey, evidence: evidenceResult.data ?? [], activity: activityResult.data ?? [], userId });
  };
  const submitMilestoneEvidence = async ({ userId, accessToken, contractId, milestoneKey, resource, integrityReference }) => {
    const targetContractId = requiredText(contractId, 'Contract');
    const targetMilestoneKey = requiredMilestoneKey(milestoneKey);
    const validated = validateMilestoneEvidencePayload({ resource, integrityReference });
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc('submit_milestone_evidence', {
      target_contract_id: targetContractId,
      target_milestone_key: targetMilestoneKey,
      resource_metadata: validated.resource,
      integrity_reference: validated.integrityReference
    });
    if (error) {
      if (/only an authorised Contract Party|only the authorised Service Provider/i.test(error.message ?? '')) throw new AuthorizationError(error.message);
      throw new ValidationError(error.message || 'This milestone is not eligible for evidence submission.');
    }
    if (!data) throw new ValidationError('This milestone evidence could not be recorded.');
    return getMilestoneReview({ userId, accessToken, contractId: targetContractId, milestoneKey: targetMilestoneKey });
  };
  const recordMilestoneReviewDecision = async ({ userId, accessToken, contractId, milestoneKey, ...payload }) => {
    const targetContractId = requiredText(contractId, 'Contract');
    const targetMilestoneKey = requiredMilestoneKey(milestoneKey);
    const decision = validateMilestoneReviewDecisionPayload(payload);
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc('record_milestone_review_decision', {
      target_contract_id: targetContractId,
      target_milestone_key: targetMilestoneKey,
      decision_action: decision.action,
      criterion_id: decision.criterionId,
      criterion_checked: decision.checked,
      decision_reason: decision.reason
    });
    if (error) {
      if (/only the authorised Buyer|only an authorised Contract Party/i.test(error.message ?? '')) throw new AuthorizationError(error.message);
      throw new ValidationError(error.message || 'This milestone review decision is unavailable.');
    }
    if (!data) throw new ValidationError('This milestone review decision could not be recorded.');
    return getMilestoneReview({ userId, accessToken, contractId: targetContractId, milestoneKey: targetMilestoneKey });
  };
  return {
    create: async ({ accessToken, name, scope, counterpartyEmail, initiatorResponsibility }) => ({ id: await call({ accessToken }, 'create_profile_owned_contract', {
      contract_name: requiredText(name, 'Contract name', 160),
      contract_scope: requiredText(scope, 'Contract scope'),
      counterparty_email: optionalEmail(counterpartyEmail),
      initiator_responsibility: enumValue(initiatorResponsibility, ['buyer', 'service_provider'], 'parties', 'initiatorResponsibility', 'Contract responsibility')
    }, 'We could not create this Contract Draft.') }),
    invite: async ({ accessToken, contractId, email, role = 'counterparty' }) => {
      const targetContractId = requiredText(contractId, 'Contract');
      const draft = await getDraft({ accessToken, contractId: targetContractId });
      const inviteeEmail = validatePublishableDraft(draft, email, role);
      return { id: await call({ accessToken }, role === 'viewer' ? 'create_contract_viewer_invitation' : 'create_contract_invitation', {
        target_contract_id: targetContractId,
        invitee_email: inviteeEmail
      }, 'We could not create this Contract invitation.') };
    },
    accept: async ({ accessToken, invitationId }) => ({ id: await call({ accessToken }, 'accept_contract_invitation', {
      target_invitation_id: requiredUuid(invitationId, 'Invitation')
    }, 'This Contract invitation cannot be accepted.') }),
    getInvitation: async ({ accessToken, invitationId }) => {
      const targetInvitationId = requiredUuid(invitationId, 'Invitation');
      const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken)
        .rpc('get_contract_invitation_acceptance_state', { target_invitation_id: targetInvitationId });
      const invitation = Array.isArray(data) ? data[0] : data;
      if (error || !invitation || !['eligible', 'expired', 'resolved'].includes(invitation.state)) {
        throw new ValidationError('This Contract invitation is invalid or unavailable.');
      }
      return { state: invitation.state };
    },
    getDraft,
    getDetail,
    getMilestoneReview,
    recordMilestoneReviewDecision,
    submitMilestoneEvidence,
    suggest: async ({ accessToken, contractId, brief }) => suggestContractDraft({ brief, draft: await getDraft({ accessToken, contractId }) }),
    getReview,
    acceptVersion: async ({ userId, accessToken, contractId, versionId, walletAddress, walletSignature, versionHash }) => {
      const targetContractId = requiredText(contractId, 'Contract');
      const targetVersionId = requiredText(versionId, 'Contract Version');
      const review = await getReview({ accessToken, contractId: targetContractId });
      if (review.version.id !== targetVersionId) throw new ValidationError('This Contract Version cannot be accepted.');
      if (review.version.hash !== versionHash) throw new ValidationError('The wallet signature must cover the latest exact Contract Version hash.');
      const walletAcceptance = verifiedWalletAcceptance({ contractId: targetContractId, versionId: targetVersionId, versionHash, walletAddress, walletSignature });
      if (!config.serviceRoleKey) throw new ValidationError('Wallet-backed Contract Acceptance is not configured.');
      const { data, error } = await createSupabaseClient(config.url, config.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }).rpc('record_wallet_contract_acceptance', {
        target_contract_id: targetContractId,
        target_version_id: targetVersionId,
        expected_version_hash: walletAcceptance.versionHash,
        signer_wallet_address: walletAcceptance.walletAddress,
        signer_signature: walletAcceptance.walletSignature,
        acting_profile_id: requiredUuid(userId, 'Authenticated Profile')
      });
      if (error || !data) throw new ValidationError('This Contract Version cannot be accepted.');
      return getReview({ accessToken, contractId: targetContractId });
    },
    saveDraft: async ({ accessToken, contractId, ...draft }) => {
      const validated = validatedDraft(draft);
      await call({ accessToken }, 'update_contract_draft', {
        target_contract_id: requiredText(contractId, 'Contract'),
        draft_sections: validated.sections,
        selected_authority_id: validated.authorityId
      }, 'We could not save this Contract draft.');
      return getDraft({ accessToken, contractId });
    }
  };
}
function createProfileOnboardingCompleter(config = publicSupabaseConfigFromEnvironment()) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = createClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', userId).select('id, email, display_name, onboarding_completed_at').single();
    if (error || !data) throw new AuthenticationError('We could not save your NEXUM setup.');
    return { id: data.id, email: data.email, displayName: data.display_name, onboardingCompletedAt: data.onboarding_completed_at };
  };
}
function sessionPayload(session, profile) { return { user: { id: session.userId, email: session.email, profile }, mode: session.localTest ? 'local-test-auth' : 'supabase-auth' }; }

export function createApp({ verifySupabaseSession = createSupabaseSessionVerifier(), loadProfile = createProfileLoader(), loadHome = createHomeLoader(), loadContracts = createContractsLoader(), loadPeople = createPeopleLoader(), loadNotifications = createNotificationLoader(), loadAuthorities = createAuthorityRegistryLoader(), notificationWorkflow = createNotificationWorkflow(), peopleWorkflow = createPeopleWorkflow(), profileSettingsWorkflow = createProfileSettingsWorkflow(), contractWorkflow = createContractWorkflow(), completeProfileOnboarding = createProfileOnboardingCompleter(), publicSupabaseConfig = publicSupabaseConfigFromEnvironment(), localTestProfile = null } = {}) {
  const { serviceRoleKey: _serviceRoleKey, ...browserSupabaseConfig } = publicSupabaseConfig;
  const localPeople = localTestProfile ? createLocalPeopleFixture() : null;
  const localContracts = localTestProfile ? createLocalContractsFixture(localTestProfile) : null;
  const localNotifications = localTestProfile ? createLocalNotificationsFixture() : null;
  const localAuthorities = localTestProfile ? createLocalAuthorityRegistryFixture() : null;
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const authenticate = async () => {
      if (localTestProfile && isLoopbackAddress(request.socket.remoteAddress) && request.headers['x-pactflow-local-test-email'] === localTestProfile.email) return { userId: localTestProfile.id, email: localTestProfile.email, accessToken: null, localTest: true };
      const accessToken = bearerToken(request);
      let user;
      try { user = await verifySupabaseSession(accessToken); } catch { throw new AuthenticationError('Supabase authentication is invalid or expired.'); }
      return { userId: user.id, email: user.email, accessToken };
    };
    try {
      if (url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'supabase-auth', paymentAuthority: 'not configured' });
      if (url.pathname === '/api/auth/config' && request.method === 'GET') return respond(response, 200, { ...browserSupabaseConfig, ...(localTestProfile ? { localTestEmail: localTestProfile.email, ...(localTestProfile.wallet ? { localTestWallet: localTestProfile.wallet } : {}) } : {}), mode: 'supabase-auth' });
      if (url.pathname === '/api/session' && request.method === 'GET') {
        const session = await authenticate();
        const profile = session.localTest ? localTestProfile.profile : await loadProfile({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, sessionPayload(session, profile));
      }
      if (url.pathname === '/api/home' && request.method === 'GET') {
        const session = await authenticate();
        const home = session.localTest ? { contracts: [] } : await loadHome({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { home });
      }
      if (url.pathname === '/api/contracts' && request.method === 'GET') {
        const session = await authenticate();
        const contracts = session.localTest
          ? await localContracts.load()
          : await loadContracts({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, contracts);
      }
      if (url.pathname === '/api/people' && request.method === 'GET') {
        const session = await authenticate();
        const people = session.localTest
          ? await localPeople.load({ search: url.searchParams.get('q') ?? '' })
          : await loadPeople({ userId: session.userId, accessToken: session.accessToken, search: url.searchParams.get('q') ?? '' });
        return respond(response, 200, { people });
      }
      if (url.pathname === '/api/notifications' && request.method === 'GET') {
        const session = await authenticate();
        const notifications = session.localTest
          ? await localNotifications.load()
          : await loadNotifications({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { notifications });
      }
      if (url.pathname === '/api/authorities' && request.method === 'GET') {
        const session = await authenticate();
        const authorities = session.localTest
          ? await localAuthorities.load()
          : await loadAuthorities({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { authorities });
      }
      const notificationReadMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (notificationReadMatch && request.method === 'POST') {
        const session = await authenticate();
        const notification = session.localTest
          ? await localNotifications.markRead({ notificationId: notificationReadMatch[1] })
          : await notificationWorkflow({ userId: session.userId, accessToken: session.accessToken, notificationId: notificationReadMatch[1] });
        return respond(response, 200, { notification });
      }
      if (url.pathname === '/api/people/connections' && request.method === 'POST') {
        const session = await authenticate();
        const { profileId, action } = await json(request);
        const connection = session.localTest
          ? await localPeople.manage({ profileId, action })
          : await peopleWorkflow({ userId: session.userId, accessToken: session.accessToken, profileId, action });
        return respond(response, 200, { connection });
      }
      if (url.pathname === '/api/profile/settings' && request.method === 'PUT') {
        const session = await authenticate();
        const profile = session.localTest
          ? saveLocalTestProfile(localTestProfile.profile, await json(request))
          : await profileSettingsWorkflow({ ...await json(request), userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { profile });
      }
      if (url.pathname === '/api/contracts' && request.method === 'POST') {
        const session = await authenticate();
        const { workspaceId: _legacyWorkspaceId, ...payload } = await json(request);
        const contract = session.localTest
          ? await localContracts.create(payload)
          : await contractWorkflow.create({ ...payload, userId: session.userId, accessToken: session.accessToken });
        return respond(response, 201, { contract });
      }
      const contractSuggestionMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/copilot-suggestions$/);
      if (contractSuggestionMatch && request.method === 'POST') {
        const session = await authenticate();
        const payload = await json(request);
        const suggestion = await contractWorkflow.suggest({ userId: session.userId, accessToken: session.accessToken, contractId: contractSuggestionMatch[1], brief: payload.brief });
        return respond(response, 200, { suggestion });
      }
      const contractDetailMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/detail$/);
      if (contractDetailMatch && request.method === 'GET') {
        const session = await authenticate();
        const contract = session.localTest
          ? await localContracts.getDetail({ contractId: contractDetailMatch[1] })
          : await contractWorkflow.getDetail({ userId: session.userId, accessToken: session.accessToken, contractId: contractDetailMatch[1] });
        return respond(response, 200, { contract });
      }
      const milestoneReviewMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/milestones\/([^/]+)\/review$/);
      if (milestoneReviewMatch && request.method === 'GET') {
        const session = await authenticate();
        const review = session.localTest
          ? await localContracts.getMilestoneReview({ contractId: milestoneReviewMatch[1], milestoneKey: milestoneReviewMatch[2] })
          : await contractWorkflow.getMilestoneReview({ userId: session.userId, accessToken: session.accessToken, contractId: milestoneReviewMatch[1], milestoneKey: milestoneReviewMatch[2] });
        return respond(response, 200, { review });
      }
      const milestoneEvidenceMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/milestones\/([^/]+)\/evidence$/);
      if (milestoneEvidenceMatch && request.method === 'POST') {
        const session = await authenticate();
        const validated = validateMilestoneEvidencePayload(await json(request));
        const review = session.localTest
          ? await localContracts.submitMilestoneEvidence({ contractId: milestoneEvidenceMatch[1], milestoneKey: milestoneEvidenceMatch[2], ...validated })
          : await contractWorkflow.submitMilestoneEvidence({ userId: session.userId, accessToken: session.accessToken, contractId: milestoneEvidenceMatch[1], milestoneKey: milestoneEvidenceMatch[2], ...validated });
        return respond(response, 201, { review });
      }
      const milestoneDecisionMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/milestones\/([^/]+)\/decisions$/);
      if (milestoneDecisionMatch && request.method === 'POST') {
        const session = await authenticate();
        const decision = validateMilestoneReviewDecisionPayload(await json(request));
        const review = session.localTest
          ? await localContracts.recordMilestoneReviewDecision({ contractId: milestoneDecisionMatch[1], milestoneKey: milestoneDecisionMatch[2], ...decision })
          : await contractWorkflow.recordMilestoneReviewDecision({ userId: session.userId, accessToken: session.accessToken, contractId: milestoneDecisionMatch[1], milestoneKey: milestoneDecisionMatch[2], ...decision });
        return respond(response, 201, { review });
      }
      const contractMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)$/);
      if (contractMatch && request.method === 'GET') {
        const session = await authenticate();
        const contract = session.localTest
          ? await localContracts.getDraft({ contractId: contractMatch[1] })
          : await contractWorkflow.getDraft({ userId: session.userId, accessToken: session.accessToken, contractId: contractMatch[1] });
        return respond(response, 200, { contract });
      }
      if (contractMatch && request.method === 'PUT') {
        const session = await authenticate();
        const payload = await json(request);
        const contract = session.localTest
          ? await localContracts.saveDraft({ contractId: contractMatch[1], ...payload })
          : await contractWorkflow.saveDraft({ userId: session.userId, accessToken: session.accessToken, contractId: contractMatch[1], ...payload });
        return respond(response, 200, { contract });
      }
      const contractReviewMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/review$/);
      if (contractReviewMatch && request.method === 'GET') {
        const session = await authenticate();
        const review = session.localTest
          ? await localContracts.getReview({ contractId: contractReviewMatch[1] })
          : await contractWorkflow.getReview({ userId: session.userId, accessToken: session.accessToken, contractId: contractReviewMatch[1] });
        return respond(response, 200, { review });
      }
      const contractAcceptanceMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/versions\/([^/]+)\/acceptances$/);
      if (contractAcceptanceMatch && request.method === 'POST') {
        const session = await authenticate();
        if (session.localTest) throw new ValidationError('The local test identity does not emulate wallet-backed Contract Acceptance.');
        const payload = await json(request);
        const review = await contractWorkflow.acceptVersion({ userId: session.userId, accessToken: session.accessToken, contractId: contractAcceptanceMatch[1], versionId: contractAcceptanceMatch[2], ...payload });
        return respond(response, 200, { review });
      }
      const contractInvitationMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/invitations$/);
      if (contractInvitationMatch && request.method === 'POST') {
        const session = await authenticate();
        const { email, role = 'counterparty' } = await json(request);
        const invitation = session.localTest
          ? await localContracts.invite({ contractId: contractInvitationMatch[1], email, role })
          : await contractWorkflow.invite({ userId: session.userId, accessToken: session.accessToken, contractId: contractInvitationMatch[1], email, role });
        return respond(response, 201, { invitation });
      }
      const durableInvitationMatch = url.pathname.match(/^\/api\/invitations\/([^/]+)\/accept$/);
      if (durableInvitationMatch && request.method === 'POST') {
        const session = await authenticate();
        const invitation = await contractWorkflow.accept({ userId: session.userId, accessToken: session.accessToken, invitationId: durableInvitationMatch[1] });
        return respond(response, 200, { invitation });
      }
      const invitationMatch = url.pathname.match(/^\/api\/invitations\/([^/]+)$/);
      if (invitationMatch && request.method === 'GET') {
        const session = await authenticate();
        const invitation = await contractWorkflow.getInvitation({ userId: session.userId, accessToken: session.accessToken, invitationId: requiredUuid(invitationMatch[1], 'Invitation') });
        return respond(response, 200, { invitation });
      }
      if (url.pathname === '/api/onboarding/complete' && request.method === 'POST') {
        const session = await authenticate();
        const profile = await completeProfileOnboarding({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { profile });
      }
      respond(response, 404, { error: url.pathname.startsWith('/api/') ? 'Unknown endpoint.' : 'Not found.' });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error instanceof AuthenticationError ? 401 : error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 422 : error instanceof ServiceUnavailableError ? 503 : 500;
      respond(response, status, { error: status === 500 ? 'Request failed.' : error.message, ...(error instanceof DraftValidationError ? { issues: error.issues } : {}) });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtimeConfiguration = runtimeConfigurationFromEnvironment();
  createApp({ publicSupabaseConfig: runtimeConfiguration.publicSupabaseConfig, localTestProfile: runtimeConfiguration.localTestProfile }).listen(runtimeConfiguration.port, () => {
    console.log(`NEXUM ready at http://localhost:${runtimeConfiguration.port}`);
  });
}
