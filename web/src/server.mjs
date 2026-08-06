import 'dotenv/config';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
class ValidationError extends Error {}

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
      publishableKey: configuredValue(environment, 'SUPABASE_PUBLISHABLE_KEY')
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
    '/contacts': 'contacts.html',
    '/authorities': 'authorities.html'
  };
  if (authenticatedPages[urlPath]) return join(publicRoot, authenticatedPages[urlPath]);
  return null;
}
function bearerToken(request) { const match = typeof request.headers.authorization === 'string' && request.headers.authorization.match(/^Bearer\s+(.+)$/i); return match?.[1]; }

function publicSupabaseConfigFromEnvironment() { return { url: process.env.SUPABASE_URL ?? null, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null }; }
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
    const { data, error } = await supabase.from('profiles').select('id, email, display_name, onboarding_completed_at').eq('id', userId).single();
    if (error || !data) throw new AuthenticationError('Your PactFlow profile is unavailable.');
    return { id: data.id, email: data.email, displayName: data.display_name, onboardingCompletedAt: data.onboarding_completed_at };
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
      supabase.from('contracts').select('id, status, contract_versions(version_number), contract_parties(workspace_id)').order('updated_at', { ascending: false })
    ]);
    if (workspaceResult.error || contractResult.error) throw new AuthenticationError('Your PactFlow Home is unavailable.');
    const workspaces = mapWorkspaces(workspaceResult.data);
    const personalWorkspace = workspaces.find(workspace => workspace.kind === 'personal');
    const workspaceNames = new Map(workspaces.map(workspace => [workspace.id, workspace.name]));
    return {
      workspaces,
      contracts: contractResult.data.map(contract => ({
        id: contract.id,
        status: contract.status,
        latestVersionNumber: Math.max(0, ...(contract.contract_versions ?? []).map(version => version.version_number)),
        workspaceName: (contract.contract_parties ?? [])
          .map(party => workspaceNames.get(party.workspace_id))
          .find(Boolean) ?? personalWorkspace?.name ?? 'Personal Contract'
      }))
    };
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
function canonicalDeadline(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError('Each delivery deadline must be a UTC timestamp.');
  }
  if (Date.parse(value) <= Date.now()) throw new ValidationError('Each delivery deadline must be in the future.');
  return value;
}
function validatedDraft({ scope, milestones, totalAllocation, successFeeBps, authorityId }) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) throw new ValidationError('Contract scope is required.');
  if (!Array.isArray(milestones) || milestones.length < 2 || milestones.length > 3) throw new ValidationError('A Contract needs two or three milestones.');
  const validatedMilestones = milestones.map((milestone, index) => {
    if (!milestone || typeof milestone !== 'object' || Array.isArray(milestone)) throw new ValidationError(`Milestone ${index + 1} is invalid.`);
    return {
      title: requiredText(milestone.title, `Milestone ${index + 1} title`, 160),
      allocation: positiveWholeNumber(milestone.allocation, `Milestone ${index + 1} allocation`),
      evidenceRequirement: requiredText(milestone.evidenceRequirement, `Milestone ${index + 1} evidence requirement`),
      deliveryDeadlineUtc: canonicalDeadline(milestone.deliveryDeadlineUtc),
      reviewWindowHours: positiveWholeNumber(milestone.reviewWindowHours, `Milestone ${index + 1} review window`, 720)
    };
  });
  for (let index = 1; index < validatedMilestones.length; index += 1) {
    if (validatedMilestones[index - 1].deliveryDeadlineUtc >= validatedMilestones[index].deliveryDeadlineUtc) throw new ValidationError('Milestone delivery deadlines must be in order.');
  }
  const allocation = positiveWholeNumber(totalAllocation, 'Contract total allocation');
  if (validatedMilestones.reduce((sum, milestone) => sum + milestone.allocation, 0) !== allocation) throw new ValidationError('Milestone allocations must equal the Contract total allocation.');
  const fee = Number(successFeeBps);
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > 10_000) throw new ValidationError('Success fee must be between 0 and 10,000 basis points.');
  return {
    scope: {
      title: requiredText(scope.title, 'Contract title', 160),
      description: requiredText(scope.description, 'Contract scope')
    },
    milestones: validatedMilestones,
    totalAllocation: allocation,
    successFeeBps: fee,
    authorityId: requiredUuid(authorityId, 'Resolution Authority')
  };
}
function mapContractDraft(contract, authorities = []) {
  const latestVersion = [...(contract.contract_versions ?? [])].sort((left, right) => right.version_number - left.version_number)[0];
  if (!latestVersion) throw new ValidationError('This Contract has no readable draft version.');
  const sections = new Map((latestVersion.contract_sections ?? []).map(section => [section.section_type, section.terms]));
  const scope = sections.get('scope') ?? {};
  const milestones = sections.get('milestones')?.items ?? [];
  const payment = sections.get('payment') ?? {};
  const authority = latestVersion.authority_snapshot ?? {};
  return {
    id: contract.id,
    status: contract.status,
    versionNumber: latestVersion.version_number,
    scope: { title: scope.title ?? '', description: scope.description ?? '' },
    milestones: milestones.map(milestone => ({
      title: milestone.title,
      allocation: milestone.allocation,
      evidenceRequirement: milestone.evidenceRequirement,
      deliveryDeadlineUtc: milestone.deliveryDeadlineUtc,
      reviewWindowHours: milestone.reviewWindowHours
    })),
    totalAllocation: payment.totalAllocation ?? payment.total_allocation ?? 0,
    successFeeBps: payment.successFeeBps ?? payment.success_fee_bps ?? 0,
    authority: {
      id: latestVersion.selected_authority_id,
      name: authority.authority_name ?? '',
      jurisdictionLabel: authority.jurisdiction_label ?? '',
      rulesetVersion: authority.ruleset_version ?? ''
    },
    authorities: authorities.map(item => ({ id: item.id, name: item.display_name, jurisdictionLabel: item.jurisdiction_label, rulesetVersion: item.ruleset_version })),
    paymentAuthority: 'not configured'
  };
}
export function createContractWorkflow(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return {
    create: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    invite: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    accept: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    getDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); },
    saveDraft: async () => { throw new AuthenticationError('Supabase authentication is not configured.'); }
  };
  const call = async ({ accessToken }, name, args, unavailableMessage) => {
    const { data, error } = await authenticatedSupabaseClient(config, createSupabaseClient, accessToken).rpc(name, args);
    if (error || !data) throw new ValidationError(unavailableMessage);
    return data;
  };
  const getDraft = async ({ accessToken, contractId }) => {
    const supabase = authenticatedSupabaseClient(config, createSupabaseClient, accessToken);
    const [contractResult, authorityResult] = await Promise.all([
      supabase.from('contracts').select('id, status, contract_versions(id, version_number, selected_authority_id, authority_snapshot, contract_sections(section_type, position, terms))').eq('id', requiredText(contractId, 'Contract')).single(),
      supabase.from('resolution_authorities').select('id, display_name, jurisdiction_label, ruleset_version').eq('status', 'published')
    ]);
    if (contractResult.error || !contractResult.data || authorityResult.error) throw new ValidationError('This Contract is unavailable.');
    return mapContractDraft(contractResult.data, authorityResult.data ?? []);
  };
  return {
    create: async ({ accessToken, name, scope, counterpartyEmail }) => ({ id: await call({ accessToken }, 'create_private_contract', {
      contract_name: requiredText(name, 'Contract name', 160),
      contract_scope: requiredText(scope, 'Contract scope'),
      counterparty_email: requiredEmail(counterpartyEmail)
    }, 'We could not create this private Contract.') }),
    invite: async ({ accessToken, contractId, email }) => ({ id: await call({ accessToken }, 'create_contract_invitation', {
      target_contract_id: requiredText(contractId, 'Contract'),
      invitee_email: requiredEmail(email)
    }, 'We could not create this Contract invitation.') }),
    accept: async ({ accessToken, invitationId }) => ({ id: await call({ accessToken }, 'accept_contract_invitation', {
      target_invitation_id: requiredText(invitationId, 'Invitation')
    }, 'This Contract invitation cannot be accepted.') }),
    getDraft,
    saveDraft: async ({ accessToken, contractId, ...draft }) => {
      const validated = validatedDraft(draft);
      await call({ accessToken }, 'update_contract_draft', {
        target_contract_id: requiredText(contractId, 'Contract'),
        draft_scope: { title: validated.scope.title, description: validated.scope.description },
        draft_milestones: validated.milestones,
        total_allocation: validated.totalAllocation,
        disclosed_success_fee_bps: validated.successFeeBps,
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

export function createApp({ verifySupabaseSession = createSupabaseSessionVerifier(), loadProfile = createProfileLoader(), loadWorkspaces = createWorkspaceLoader(), loadHome = createHomeLoader(), contractWorkflow = createContractWorkflow(), completeProfileOnboarding = createProfileOnboardingCompleter(), publicSupabaseConfig = publicSupabaseConfigFromEnvironment() } = {}) {
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
      if (url.pathname === '/api/auth/config' && request.method === 'GET') return respond(response, 200, { ...publicSupabaseConfig, mode: 'supabase-auth' });
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
      if (url.pathname === '/api/contracts' && request.method === 'POST') {
        const session = await authenticate();
        const payload = await json(request);
        const contract = await contractWorkflow.create({ ...payload, userId: session.userId, accessToken: session.accessToken });
        const invitation = await contractWorkflow.invite({ userId: session.userId, accessToken: session.accessToken, contractId: contract.id, email: payload.counterpartyEmail });
        return respond(response, 201, { contract, invitation });
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
      const file = contractPageMatch ? join(publicRoot, 'contract.html') : standalonePage(url.pathname) ?? safeFile(decodeURIComponent(url.pathname));
      if (!file || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
      if (request.method === 'HEAD') return response.end();
      createReadStream(file).pipe(response);
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error instanceof AuthenticationError ? 401 : error instanceof ValidationError ? 422 : 500;
      respond(response, status, { error: status === 500 ? 'Request failed.' : error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtimeConfiguration = runtimeConfigurationFromEnvironment();
  createApp({ publicSupabaseConfig: runtimeConfiguration.publicSupabaseConfig }).listen(runtimeConfiguration.port, () => {
    console.log(`PactFlow ready at http://localhost:${runtimeConfiguration.port}`);
  });
}
