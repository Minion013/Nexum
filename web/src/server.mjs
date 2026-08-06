import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { AgreementEngine, RuleError, suggestDraft } from './agreement-engine.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(root, 'public');
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const identities = { buyer: 'local-buyer', seller: 'local-seller', resolver: 'local-resolver' };
const localRoles = new Set(['buyer', 'seller', 'resolver', 'guest', 'invitee']);
const localAgreementId = 'local-demo-agreement';

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
async function json(request) { let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 64_000) throw new RuleError('Request is too large.'); } return body ? JSON.parse(body) : {}; }
function safeFile(urlPath) { const requested = urlPath === '/' ? '/index.html' : urlPath; const file = normalize(join(publicRoot, requested)); return file.startsWith(publicRoot) ? file : null; }
function bearerToken(request) { const match = typeof request.headers.authorization === 'string' && request.headers.authorization.match(/^Bearer\s+(.+)$/i); return match?.[1]; }

function createLocalDemo() {
  const now = Math.floor(Date.now() / 1000);
  const engine = new AgreementEngine({
    buyer: identities.buyer, seller: identities.seller, resolver: identities.resolver, scope: 'Design a checkout redesign and developer handoff.', feeBps: 250, fundingDeadline: now + 48 * 60 * 60,
    milestones: [
      { title: 'Wireframes', amount: 300_000_000, deadline: now + 7 * 86_400, reviewSeconds: 72 * 3_600, evidenceRequirement: 'Private Figma record hash' },
      { title: 'Hi-fi screens', amount: 700_000_000, deadline: now + 14 * 86_400, reviewSeconds: 72 * 3_600, evidenceRequirement: 'Private design handoff hash' },
      { title: 'Dev handoff', amount: 500_000_000, deadline: now + 21 * 86_400, reviewSeconds: 72 * 3_600, evidenceRequirement: 'Private repository release hash' }
    ]
  });
  const currentTime = () => Math.floor(Date.now() / 1000);
  return {
    snapshot: () => engine.snapshot(),
    suggest(brief) { return suggestDraft(brief, engine.snapshot().terms, currentTime()); },
    replaceDraft(role, terms) { engine.replaceDraft(identities[role], terms); return engine.snapshot(); },
    act(role, type) {
      const actor = identities[role];
      if (!actor) throw new RuleError('A local participant session is required.');
      if (type === 'approve') engine.approve(actor);
      else if (type === 'fund') engine.fund(actor, engine.total, currentTime());
      else if (type === 'evidence') engine.submitEvidence(actor, `local-evidence-${randomUUID()}`, currentTime());
      else if (type === 'accept') engine.accept(actor, currentTime());
      else if (type === 'release') engine.release(actor, currentTime());
      else if (type === 'dispute') engine.dispute(actor, `local-dispute-${randomUUID()}`, currentTime());
      else if (type === 'resolve') engine.resolve(actor, Math.floor(engine.snapshot().milestones.find(milestone => milestone.status === 'Disputed').amount / 2), currentTime());
      else if (type === 'refund') { const active = engine.snapshot().milestones.find(milestone => milestone.status === 'Active'); engine.cancelMissed(actor, active.deadline + 1); }
      else if (type === 'amend') { const pending = engine.snapshot().milestones.find(milestone => milestone.status === 'Pending'); if (!pending) throw new RuleError('No future milestone is available to amend.'); engine.amend(actor, { milestoneIndex: pending.index, deadline: pending.deadline + 86_400, amount: pending.amount }); }
      else throw new RuleError('Unknown local action.');
      return engine.snapshot();
    }
  };
}

function agreementFor(role, demo) {
  const agreement = demo.snapshot();
  if (role === 'buyer' || role === 'seller') return agreement;
  if (role === 'resolver') {
    const operational = { state: agreement.state, version: agreement.version, versionHash: agreement.versionHash, total: agreement.total, milestones: agreement.milestones.map(({ evidenceHash, disputeHash, ...milestone }) => milestone), events: agreement.events.map(({ evidenceHash, disputeHash, ...event }) => event) };
    return operational;
  }
  throw new RuleError('This session is not invited to the agreement.');
}
function participantSession(session) { return Boolean(session && ['buyer', 'seller'].includes(session.role) && session.agreementId === localAgreementId); }
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
    const supabase = createSupabaseClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { error: provisioningError } = await supabase.rpc('ensure_profile');
    if (provisioningError) throw new AuthenticationError('We could not prepare your PactFlow profile.');
    const { data, error } = await supabase.from('profiles').select('id, email, display_name, onboarding_completed_at').eq('id', userId).single();
    if (error || !data) throw new AuthenticationError('Your PactFlow profile is unavailable.');
    return { id: data.id, email: data.email, displayName: data.display_name, onboardingCompletedAt: data.onboarding_completed_at };
  };
}
export function createWorkspaceLoader(config = publicSupabaseConfigFromEnvironment(), createSupabaseClient = createClient) {
  if (!config.url || !config.publishableKey) return async () => { throw new AuthenticationError('Supabase authentication is not configured.'); };
  return async ({ userId, accessToken }) => {
    const supabase = createSupabaseClient(config.url, config.publishableKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    const { error: provisioningError } = await supabase.rpc('ensure_profile');
    if (provisioningError) throw new AuthenticationError('We could not prepare your PactFlow workspace.');
    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('membership_role, workspaces!inner(id, name, kind)')
      .eq('profile_id', userId);
    if (error) throw new AuthenticationError('Your PactFlow workspaces are unavailable.');
    return data.map(({ membership_role: membershipRole, workspaces }) => ({
      id: workspaces.id,
      name: workspaces.name,
      kind: workspaces.kind,
      membershipRole
    }));
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
function sessionPayload(session, profile) { return { role: session.role, user: { id: session.userId, email: session.email, profile }, mode: 'supabase-auth' }; }

export function createApp({ verifySupabaseSession = createSupabaseSessionVerifier(), loadProfile = createProfileLoader(), loadWorkspaces = createWorkspaceLoader(), completeProfileOnboarding = createProfileOnboardingCompleter(), publicSupabaseConfig = publicSupabaseConfigFromEnvironment() } = {}) {
  const invitations = new Map();
  const participantUsers = new Map();
  const localSessions = new Map();
  const demo = createLocalDemo();
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const authenticate = async () => {
      const accessToken = bearerToken(request);
      let user;
      try { user = await verifySupabaseSession(accessToken); } catch { throw new AuthenticationError('Supabase authentication is invalid or expired.'); }
      return { ...localSessions.get(user.id), userId: user.id, email: user.email, accessToken };
    };
    try {
      if (url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'supabase-auth-local-simulation', network: 'none', funds: 'no funds or external wallets' });
      if (url.pathname === '/api/auth/config' && request.method === 'GET') return respond(response, 200, { ...publicSupabaseConfig, mode: 'supabase-auth' });
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const { role } = await json(request);
        if (!localRoles.has(role)) return respond(response, 400, { error: 'Choose buyer, resolver, or guest. Seller access requires an invitation.' });
        const authenticated = await authenticate();
        if (role === 'buyer' || role === 'seller') {
          const participantUser = participantUsers.get(role);
          if (!participantUser && role === 'seller') return respond(response, 403, { error: 'Seller access requires an accepted invitation.', code: 'seller_invitation_required' });
          if (participantUser && authenticated.userId !== participantUser) return respond(response, 403, { error: 'This Supabase account is not the assigned local participant.', code: 'participant_not_assigned' });
          if (!participantUser) participantUsers.set(role, authenticated.userId);
        }
        const session = { role, userId: authenticated.userId, email: authenticated.email, agreementId: participantUsers.get(role) === authenticated.userId ? localAgreementId : null };
        localSessions.set(session.userId, session);
        const profile = await loadProfile({ userId: session.userId, accessToken: authenticated.accessToken });
        return respond(response, 201, sessionPayload(session, profile));
      }
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
      if (url.pathname === '/api/onboarding/complete' && request.method === 'POST') {
        const session = await authenticate();
        if (!session.role) return respond(response, 409, { error: 'Choose a local demo access before completing setup.' });
        const profile = await completeProfileOnboarding({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { profile });
      }
      if (url.pathname === '/api/session' && request.method === 'DELETE') { const session = await authenticate(); localSessions.delete(session.userId); return respond(response, 204, {}); }
      if (url.pathname === '/api/agreement' && request.method === 'GET') {
        const session = await authenticate();
        if (!session.role) return respond(response, 403, { error: 'Choose a local demo role before viewing the agreement.' });
        if (session.role !== 'resolver' && !participantSession(session)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        return respond(response, 200, { agreement: agreementFor(session.role, demo), mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/invitations' && request.method === 'POST') {
        const session = await authenticate();
        if (!participantSession(session)) return respond(response, 403, { error: 'Only an invited buyer or seller can invite a counterparty.' });
        const invitedRole = session.role === 'buyer' ? 'seller' : 'buyer';
        const id = randomUUID();
        invitations.set(id, { id, agreementId: localAgreementId, invitedRole, inviter: session.role, status: 'pending', createdAt: Date.now() });
        return respond(response, 201, { id, agreementId: localAgreementId, invitedRole, status: 'pending', mode: 'local-only' });
      }
      const invitationMatch = url.pathname.match(/^\/api\/agreement\/invitations\/([\w-]+)\/accept$/);
      if (invitationMatch && request.method === 'POST') {
        const session = await authenticate();
        if (session.role !== 'invitee') return respond(response, 403, { error: 'Only an invitee session can accept an invitation.' });
        const invitation = invitations.get(invitationMatch[1]);
        if (!invitation || invitation.status !== 'pending') throw new RuleError('This invitation is invalid, expired, or already accepted.');
        participantUsers.set(invitation.invitedRole, session.userId);
        session.role = invitation.invitedRole; session.agreementId = invitation.agreementId;
        localSessions.set(session.userId, session);
        invitation.status = 'accepted'; invitation.acceptedAt = Date.now(); invitation.acceptedBy = session.userId;
        const profile = await loadProfile({ userId: session.userId, accessToken: session.accessToken });
        return respond(response, 200, { ...sessionPayload(session, profile), invitation: { id: invitation.id, agreementId: invitation.agreementId, status: invitation.status } });
      }
      if (url.pathname === '/api/agreement/copilot' && request.method === 'POST') {
        const session = await authenticate();
        if (!participantSession(session)) return respond(response, 403, { error: 'This session is not invited to change the agreement.' });
        const { brief } = await json(request);
        return respond(response, 200, { terms: demo.suggest(brief), notice: 'Co-pilot suggestions are editable drafts only. It cannot approve terms, release funds, judge quality, or resolve disputes.', mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/draft' && request.method === 'PUT') {
        const session = await authenticate();
        if (!participantSession(session)) return respond(response, 403, { error: 'This session is not invited to change the agreement.' });
        const { terms } = await json(request);
        return respond(response, 200, { agreement: demo.replaceDraft(session.role, terms), mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/actions' && request.method === 'POST') {
        const session = await authenticate();
        if (!Object.hasOwn(identities, session.role)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        if (['buyer', 'seller'].includes(session.role) && !participantSession(session)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        const { type } = await json(request);
        return respond(response, 200, { agreement: demo.act(session.role, type), mode: 'local-only' });
      }
      if (url.pathname.startsWith('/api/')) return respond(response, 404, { error: 'Unknown local endpoint.' });
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
      const file = safeFile(decodeURIComponent(url.pathname));
      if (!file || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
      if (request.method === 'HEAD') return response.end();
      createReadStream(file).pipe(response);
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : error instanceof AuthenticationError ? 401 : error instanceof RuleError ? 422 : 500;
      respond(response, status, { error: status === 500 ? 'Local demo request failed.' : error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runtimeConfiguration = runtimeConfigurationFromEnvironment();
  createApp({ publicSupabaseConfig: runtimeConfiguration.publicSupabaseConfig }).listen(runtimeConfiguration.port, () => {
    console.log(`PactFlow local demo ready at http://localhost:${runtimeConfiguration.port}`);
  });
}
