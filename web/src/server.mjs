import 'dotenv/config';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
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
const contractAcceptanceStatement = 'I accept this exact PactFlow Contract Version. This signature does not move funds.';
const baseSepoliaChainId = 84532;
const oneDayInMilliseconds = 86_400_000;
const coPilotProjectStartOffsetDays = 1;
const coPilotFirstMilestoneOffsetDays = 14;
const coPilotSecondMilestoneOffsetDays = 28;
const coPilotMilestoneReviewWindowHours = 72;
const coPilotAuthorityNotice = 'These are editable drafting suggestions. The co-pilot cannot approve terms, move funds, release funds, judge quality, or resolve disputes.';

export function contractAcceptanceTypedData({ contractId, versionId, versionHash }) {
  return {
    domain: { name: 'PactFlow Contract Acceptance', version: '1', chainId: baseSepoliaChainId },
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

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(root, 'public');
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function configuredValue(environment, key) {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`${key} must be configured before PactFlow starts.`);
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
  const port = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  return {
    port,
    publicSupabaseConfig: {
      url: configuredHttpUrl(environment, 'SUPABASE_URL'),
      publishableKey: configuredValue(environment, 'SUPABASE_PUBLISHABLE_KEY'),
      ...(environment.PRIVY_APP_ID?.trim() ? { privyAppId: environment.PRIVY_APP_ID.trim() } : {})
    }
  };
}

function respond(response, status, body, headers = {}) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); response.end(JSON.stringify(body)); }
class AuthenticationError extends Error {}
async function json(request) { let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 64_000) throw new ValidationError('Request is too large.'); } return body ? JSON.parse(body) : {}; }
function safeFile(urlPath) { const requested = urlPath === '/' ? '/index.html' : urlPath; const file = normalize(join(publicRoot, requested)); return file.startsWith(publicRoot) ? file : null; }
function standalonePage(urlPath) {
  const authenticatedPages = {
    '/home': 'home.html',
    '/contracts': 'contracts.html',
    '/workspace': 'workspace-list.html',
    '/people': 'people.html',
    '/notifications': 'notifications.html',
    '/contacts': 'people.html',
    '/settings': 'settings.html',
    '/authorities': 'authorities.html'
  };
  if (authenticatedPages[urlPath]) return join(publicRoot, authenticatedPages[urlPath]);
  return null;
}
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
    await ensureProfileForAppData(supabase, 'We could not prepare your PactFlow profile.');
    const { data, error } = await supabase.from('profiles').select('id, email, display_name, professional_headline, discoverable, onboarding_completed_at').eq('id', userId).single();
    if (error || !data) throw new AuthenticationError('Your PactFlow profile is unavailable.');
    return { id: data.id, email: data.email, displayName: data.display_name, professionalHeadline: data.professional_headline, discoverable: data.discoverable, onboardingCompletedAt: data.onboarding_completed_at };
  };
}
function authenticatedSupabaseClient(config, createSupabaseClient, accessToken) {
  return createSupabaseClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { autoRefreshToken: false, persistSession: false } });
}
async function ensureProfileForAppData(supabase, unavailableMessage) {
  const { error } = await supabase.rpc('ensure_profile');
  if (error) throw new AuthenticationError(unavailableMessage);
}
function mapWorkspaces(rows) {
  return rows.map(({ membership_role: membershipRole, workspaces }) => ({ id: workspaces.id, name: workspaces.name, kind: workspaces.kind, membershipRole }));
}
export function createWorkspaceLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    await ensureProfileForAppData(supabase, 'We could not prepare your PactFlow workspace.');
    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('membership_role, workspaces!inner(id, name, kind)')
      .eq('profile_id', userId);
    if (error) throw new AuthenticationError('Your PactFlow workspaces are unavailable.');
    return mapWorkspaces(data);
  };
}
export function createHomeLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    await ensureProfileForAppData(supabase, 'We could not prepare your PactFlow Home.');
    const [workspaceResult, contractResult] = await Promise.all([
      supabase.from('workspace_memberships').select('membership_role, workspaces!inner(id, name, kind)').eq('profile_id', userId),
      supabase.from('contracts').select('id, status, updated_at, contract_versions(version_number, contract_sections(section_type, terms)), contract_parties(workspace_id, profile_id), proposal_workspace_access(workspace_id)').order('updated_at', { ascending: false })
    ]);
    if (workspaceResult.error || contractResult.error) throw new AuthenticationError('Your PactFlow Home is unavailable.');
    const workspaces = mapWorkspaces(workspaceResult.data);
    const personalWorkspace = workspaces.find(workspace => workspace.kind === 'personal');
    const workspaceNames = new Map(workspaces.map(workspace => [workspace.id, workspace.name]));
    return {
      workspaces,
      contracts: contractResult.data.map(contract => {
        const versions = contract.contract_versions ?? [];
        const latestVersion = [...versions].sort((left, right) => right.version_number - left.version_number)[0] ?? { version_number: 0, contract_sections: [] };
        const sections = new Map((latestVersion.contract_sections ?? []).map(section => [section.section_type, section.terms ?? {}]));
        const parties = sections.get('parties') ?? {};
        const notices = sections.get('notices') ?? {};
        const milestones = sections.get('milestones')?.items ?? [];
        const nextMilestone = milestones
          .filter(item => item?.title && item?.deliveryDeadlineUtc && Date.parse(item.deliveryDeadlineUtc) > Date.now())
          .sort((left, right) => Date.parse(left.deliveryDeadlineUtc) - Date.parse(right.deliveryDeadlineUtc))[0];
        const initiatorIsBuyer = parties.initiator_responsibility === 'buyer' || parties.buyer?.partyRef === 'initiating_party';
        const isInitiator = (contract.contract_parties ?? []).some(party => party.profile_id === userId);
        const responsibility = isInitiator ? (initiatorIsBuyer ? 'Buyer' : 'Service Provider') : 'Workspace member';
        const counterparty = parties.counterparty_email ?? parties.counterpartyEmail ?? (responsibility === 'Buyer' ? notices.serviceProviderContact : notices.buyerContact) ?? 'Counterparty to be confirmed';
        const workspaceIds = [...(contract.contract_parties ?? []).map(party => party.workspace_id), ...(contract.proposal_workspace_access ?? []).map(access => access.workspace_id)];
        return {
          id: contract.id,
          status: contract.status,
          latestVersionNumber: latestVersion.version_number,
          workspaceName: workspaceIds
            .map(workspaceId => workspaceNames.get(workspaceId))
            .find(Boolean) ?? personalWorkspace?.name ?? 'Personal Contract',
          counterparty,
          responsibility,
          ...(nextMilestone ? { nextMilestone: { title: nextMilestone.title, deadlineUtc: nextMilestone.deliveryDeadlineUtc } } : {}),
          lastActivityAt: contract.updated_at
        };
      })
    };
  };
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
    return { discover: discoverResult.data ?? [], connections: connectionResult.data ?? [] };
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
    await ensureProfileForAppData(supabase, 'We could not prepare your PactFlow inbox.');
    const { data, error } = await supabase.rpc('list_my_notifications');
    if (error) throw new AuthenticationError('Your PactFlow inbox is unavailable.');
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
export function createProfileSettingsWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken, displayName, professionalHeadline, discoverable }) => {
    const update = {
      ...(displayName !== undefined ? { display_name: requiredText(displayName, 'Display name', 120) } : {}),
      ...(professionalHeadline !== undefined ? { professional_headline: professionalHeadline ? requiredText(professionalHeadline, 'Professional headline', 160) : null } : {}),
      ...(discoverable !== undefined ? { discoverable: Boolean(discoverable) } : {})
    };
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).from('profiles').update(update).eq('id', userId).select('id, email, display_name, professional_headline, discoverable').single();
    if (error || !data) throw new AuthenticationError('We could not save your Profile Settings.');
    return { id: data.id, email: data.email, displayName: data.display_name, professionalHeadline: data.professional_headline, discoverable: data.discoverable };
  };
}
function requiredText(value, label, limit = 4_000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new ValidationError(`${label} is required.`);
  return value.trim();
}
function requiredEmail(value) {
  const email = requiredText(value, 'Counterparty email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Enter a valid counterparty email address.');
  return email;
}
function requiredUuid(value, label) {
  const text = requiredText(value, label, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new ValidationError(`${label} must be valid.`);
  return text;
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
      { title: 'Discovery', deliveryOutcome: `Document the findings that shape ${title.toLowerCase()}.`, allocation: firstAllocation, evidenceRequirement: 'A private summary of the completed discovery work.', deliveryDeadlineUtc: discoveryDeadline, reviewWindowHours: coPilotMilestoneReviewWindowHours },
      { title: 'Delivery', deliveryOutcome: `Deliver the agreed outcome for ${title.toLowerCase()} with a documented handoff.`, allocation: totalAllocation - firstAllocation, evidenceRequirement: 'A private delivery summary and handoff record without credentials or secrets.', deliveryDeadlineUtc: deliveryDeadline, reviewWindowHours: coPilotMilestoneReviewWindowHours }
    ],
    evidence: { reviewDecision: 'Buyer records acceptance or a specific change request within the review window.', dependencyAcknowledgementRequired: false },
    notice: coPilotAuthorityNotice
  };
}
function validatedDraft(draft) {
  const parties = section(draft.parties, 'parties');
  const buyer = section(parties.buyer, 'parties');
  const serviceProvider = section(parties.serviceProvider, 'parties');
  const validatedParties = {
    buyer: {
      partyRef: enumValue(buyer.partyRef, ['initiating_party', 'counterparty'], 'parties', 'buyer.partyRef', 'Buyer party'),
      responsibility: text(buyer.responsibility, 'parties', 'buyer.responsibility', 'Buyer responsibility', 500)
    },
    serviceProvider: {
      partyRef: enumValue(serviceProvider.partyRef, ['initiating_party', 'counterparty'], 'parties', 'serviceProvider.partyRef', 'Service provider party'),
      responsibility: text(serviceProvider.responsibility, 'parties', 'serviceProvider.responsibility', 'Service provider responsibility', 500)
    }
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
function mapContractReview(contract) {
  const version = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number)[0];
  if (!version) throw new ValidationError('This Contract has no readable version.');
  const parties = (contract.contract_parties ?? []).map(party => ({
    id: party.id,
    label: party.profiles?.display_name ?? party.profiles?.email ?? party.workspaces?.name ?? 'Contract Party'
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
export function createContractWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return {
    create: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    invite: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    accept: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    suggest: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    saveDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getReview: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    acceptVersion: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); }
  };
  const call = async ({ accessToken }, name, args, unavailableMessage) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc(name, args);
    if (error || !data) throw new ValidationError(unavailableMessage);
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
      .select('id, status, contract_parties(id, profiles(display_name, email), workspaces(name)), contract_versions(id, version_number, version_hash, acceptance_ready_at, authority_snapshot, contract_sections(section_type, position, terms), contract_acceptances(contract_party_id, accepted_at, signer_wallet_address))')
      .eq('id', requiredText(contractId, 'Contract'))
      .single();
    if (error || !data) throw new ValidationError('This Contract review is unavailable.');
    return mapContractReview(data);
  };
  return {
    create: async ({ accessToken, workspaceId, name, scope, counterpartyEmail, initiatorResponsibility }) => ({ id: await call({ accessToken }, 'create_role_led_proposal', {
      owning_workspace_id: requiredUuid(workspaceId, 'Owning Workspace'),
      contract_name: requiredText(name, 'Contract name', 160),
      contract_scope: requiredText(scope, 'Contract scope'),
      counterparty_email: requiredEmail(counterpartyEmail),
      initiator_responsibility: enumValue(initiatorResponsibility, ['buyer', 'service_provider'], 'parties', 'initiatorResponsibility', 'Proposal responsibility')
    }, 'We could not create this Proposal.') }),
    invite: async ({ accessToken, contractId, email }) => ({ id: await call({ accessToken }, 'create_contract_invitation', {
      target_contract_id: requiredText(contractId, 'Contract'),
      invitee_email: requiredEmail(email)
    }, 'We could not create this Contract invitation.') }),
    accept: async ({ accessToken, invitationId }) => ({ id: await call({ accessToken }, 'accept_contract_invitation', {
      target_invitation_id: requiredText(invitationId, 'Invitation')
    }, 'This Contract invitation cannot be accepted.') }),
    getDraft,
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
    if (error || !data) throw new AuthenticationError('We could not save your PactFlow setup.');
    return { id: data.id, email: data.email, displayName: data.display_name, onboardingCompletedAt: data.onboarding_completed_at };
  };
}
function sessionPayload(session, profile) { return { user: { id: session.userId, email: session.email, profile }, mode: 'supabase-auth' }; }

export function createApp({ verifySupabaseSession = createSupabaseSessionVerifier(), loadProfile = createProfileLoader(), loadWorkspaces = createWorkspaceLoader(), loadHome = createHomeLoader(), loadPeople = createPeopleLoader(), loadNotifications = createNotificationLoader(), notificationWorkflow = createNotificationWorkflow(), peopleWorkflow = createPeopleWorkflow(), profileSettingsWorkflow = createProfileSettingsWorkflow(), contractWorkflow = createContractWorkflow(), completeProfileOnboarding = createProfileOnboardingCompleter(), publicSupabaseConfig = publicSupabaseConfigFromEnvironment() } = {}) {
  const { serviceRoleKey: _serviceRoleKey, ...browserSupabaseConfig } = publicSupabaseConfig;
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const authenticate = async () => {
      const accessToken = bearerToken(request);
      let user;
      try { user = await verifySupabaseSession(accessToken); } catch { throw new AuthenticationError('Supabase authentication is invalid or expired.'); }
      return { userId: user.id, email: user.email, accessToken };
    };
    try {
      if (url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'supabase-auth', paymentAuthority: 'not configured' });
      if (url.pathname === '/api/auth/config' && request.method === 'GET') return respond(response, 200, { ...browserSupabaseConfig, mode: 'supabase-auth' });
      if (url.pathname === '/api/session' && request.method === 'GET') {
        const session = await authenticate();
        const profile = await loadProfile({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, sessionPayload(session, profile));
      }
      if (url.pathname === '/api/workspaces' && request.method === 'GET') {
        const session = await authenticate();
        const workspaces = await loadWorkspaces({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { workspaces });
      }
      if (url.pathname === '/api/home' && request.method === 'GET') {
        const session = await authenticate();
        const home = await loadHome({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { home });
      }
      if (url.pathname === '/api/people' && request.method === 'GET') {
        const session = await authenticate();
        const people = await loadPeople({ userId: session.userId, accessToken: session.accessToken, search: url.searchParams.get('q') ?? '' });
        return respond(response, 200, { people });
      }
      if (url.pathname === '/api/notifications' && request.method === 'GET') {
        const session = await authenticate();
        const notifications = await loadNotifications({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { notifications });
      }
      const notificationReadMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (notificationReadMatch && request.method === 'POST') {
        const session = await authenticate();
        const notification = await notificationWorkflow({ userId: session.userId, accessToken: session.accessToken, notificationId: notificationReadMatch[1] });
        return respond(response, 200, { notification });
      }
      if (url.pathname === '/api/people/connections' && request.method === 'POST') {
        const session = await authenticate();
        const { profileId, action } = await json(request);
        const connection = await peopleWorkflow({ userId: session.userId, accessToken: session.accessToken, profileId, action });
        return respond(response, 200, { connection });
      }
      if (url.pathname === '/api/profile/settings' && request.method === 'PUT') {
        const session = await authenticate();
        const profile = await profileSettingsWorkflow({ ...await json(request), userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { profile });
      }
      if (url.pathname === '/api/contracts' && request.method === 'POST') {
        const session = await authenticate();
        const payload = await json(request);
        const contract = await contractWorkflow.create({ ...payload, userId: session.userId, accessToken: session.accessToken });
        return respond(response, 201, { contract });
      }
      const contractSuggestionMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/copilot-suggestions$/);
      if (contractSuggestionMatch && request.method === 'POST') {
        const session = await authenticate();
        const payload = await json(request);
        const suggestion = await contractWorkflow.suggest({ userId: session.userId, accessToken: session.accessToken, contractId: contractSuggestionMatch[1], brief: payload.brief });
        return respond(response, 200, { suggestion });
      }
      const contractMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)$/);
      if (contractMatch && request.method === 'GET') {
        const session = await authenticate();
        const contract = await contractWorkflow.getDraft({ userId: session.userId, accessToken: session.accessToken, contractId: contractMatch[1] });
        return respond(response, 200, { contract });
      }
      if (contractMatch && request.method === 'PUT') {
        const session = await authenticate();
        const payload = await json(request);
        const contract = await contractWorkflow.saveDraft({ userId: session.userId, accessToken: session.accessToken, contractId: contractMatch[1], ...payload });
        return respond(response, 200, { contract });
      }
      const contractReviewMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/review$/);
      if (contractReviewMatch && request.method === 'GET') {
        const session = await authenticate();
        const review = await contractWorkflow.getReview({ userId: session.userId, accessToken: session.accessToken, contractId: contractReviewMatch[1] });
        return respond(response, 200, { review });
      }
      const contractAcceptanceMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/versions\/([^/]+)\/acceptances$/);
      if (contractAcceptanceMatch && request.method === 'POST') {
        const session = await authenticate();
        const payload = await json(request);
        const review = await contractWorkflow.acceptVersion({ userId: session.userId, accessToken: session.accessToken, contractId: contractAcceptanceMatch[1], versionId: contractAcceptanceMatch[2], ...payload });
        return respond(response, 200, { review });
      }
      const contractInvitationMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)\/invitations$/);
      if (contractInvitationMatch && request.method === 'POST') {
        const session = await authenticate();
        const { email } = await json(request);
        const invitation = await contractWorkflow.invite({ userId: session.userId, accessToken: session.accessToken, contractId: contractInvitationMatch[1], email });
        return respond(response, 201, { invitation });
      }
      const durableInvitationMatch = url.pathname.match(/^\/api\/invitations\/([^/]+)\/accept$/);
      if (durableInvitationMatch && request.method === 'POST') {
        const session = await authenticate();
        const invitation = await contractWorkflow.accept({ userId: session.userId, accessToken: session.accessToken, invitationId: durableInvitationMatch[1] });
        return respond(response, 200, { invitation });
      }
      if (url.pathname === '/api/onboarding/complete' && request.method === 'POST') {
        const session = await authenticate();
        const profile = await completeProfileOnboarding({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { profile });
      }
      if (url.pathname.startsWith('/api/')) return respond(response, 404, { error: 'Unknown endpoint.' });
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
      const contractPageMatch = url.pathname.match(/^\/contracts\/[^/]+$/);
      const invitationPageMatch = url.pathname.match(/^\/invitations\/[^/]+$/);
      const file = contractPageMatch ? join(publicRoot, 'contract.html') : invitationPageMatch ? join(publicRoot, 'invitation.html') : standalonePage(url.pathname) ?? safeFile(decodeURIComponent(url.pathname));
      if (!file || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
      if (request.method === 'HEAD') return response.end();
      createReadStream(file).pipe(response);
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error instanceof AuthenticationError ? 401 : error instanceof ValidationError ? 422 : 500;
      respond(response, status, { error: status === 500 ? 'Request failed.' : error.message, ...(error instanceof DraftValidationError ? { issues: error.issues } : {}) });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtimeConfiguration = runtimeConfigurationFromEnvironment();
  createApp({ publicSupabaseConfig: runtimeConfiguration.publicSupabaseConfig }).listen(runtimeConfiguration.port, () => {
    console.log(`PactFlow ready at http://localhost:${runtimeConfiguration.port}`);
  });
}
