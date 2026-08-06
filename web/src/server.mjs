import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAccessToken as verifyPrivyAccessToken, verifyIdentityToken } from '@privy-io/node';
import { createRemoteJWKSet } from 'jose';
import { AgreementEngine, RuleError, suggestDraft } from './agreement-engine.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = join(root, 'public');
const port = Number(process.env.PORT ?? 3000);
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const identities = { buyer: 'local-buyer', seller: 'local-seller', resolver: 'local-resolver' };
const sessionRoles = new Set(['buyer', 'seller', 'resolver', 'guest', 'invitee']);
const localAgreementId = 'local-demo-agreement';
const sessionLifetimeMs = 8 * 60 * 60 * 1_000;

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');

function respond(response, status, body, headers = {}) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); response.end(JSON.stringify(body)); }
class AuthenticationError extends Error {}
function cookie(request) { return Object.fromEntries((request.headers.cookie ?? '').split(';').map(value => value.trim().split('=').map(decodeURIComponent)).filter(([key]) => key)); }
async function json(request) { let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 64_000) throw new RuleError('Request is too large.'); } return body ? JSON.parse(body) : {}; }
function safeFile(urlPath) { const requested = urlPath === '/' ? '/index.html' : urlPath; const file = normalize(join(publicRoot, requested)); return file.startsWith(publicRoot) ? file : null; }

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
function participantSession(session) {
  return Boolean(session && ['buyer', 'seller'].includes(session.role) && session.agreementId === localAgreementId);
}
function activeSession(request, sessions, now) {
  const id = cookie(request).pactflow_session;
  const session = sessions.get(id);
  if (session && (now() - session.createdAt > sessionLifetimeMs || now() >= session.expiresAt)) { sessions.delete(id); return undefined; }
  return session;
}
function sessionPayload(session) {
  return { role: session.role, userId: session.userId, walletAddress: session.walletAddress, mode: 'privy-testnet' };
}

function createPrivyVerifier() {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return async () => { throw new AuthenticationError('Privy is not configured.'); };
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const verificationKey = createRemoteJWKSet(new URL(`/v1/apps/${appId}/jwks.json`, process.env.PRIVY_API_BASE_URL ?? 'https://api.privy.io'), {
    headers: { authorization: `Basic ${credentials}`, 'privy-app-id': appId }
  });
  return async (accessToken, identityToken) => {
    if (typeof accessToken !== 'string' || !accessToken) throw new AuthenticationError('A Privy access token is required.');
    if (typeof identityToken !== 'string' || !identityToken) throw new AuthenticationError('A Privy identity token is required.');
    try {
      const [access, identity] = await Promise.all([
        verifyPrivyAccessToken({ access_token: accessToken, app_id: appId, verification_key: verificationKey }),
        verifyIdentityToken({ identity_token: identityToken, app_id: appId, verification_key: verificationKey })
      ]);
      if (access.user_id !== identity.id) throw new AuthenticationError('Privy tokens do not belong to the same user.');
      const walletAddresses = identity.linked_accounts
        .filter(account => account.type === 'wallet' && account.chain_type === 'ethereum')
        .map(account => account.address.toLowerCase());
      return { userId: access.user_id, expiresAt: access.expiration * 1_000, walletAddresses };
    } catch {
      throw new AuthenticationError('Privy authentication is invalid or expired.');
    }
  };
}

export function createApp({ now = () => Date.now(), verifyAccessToken = createPrivyVerifier() } = {}) {
  const sessions = new Map();
  const invitations = new Map();
  const participantUsers = new Map();
  const demo = createLocalDemo();
  return createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const session = activeSession(request, sessions, now);
    try {
      if (url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'privy-auth-local-simulation', network: 'none', funds: 'no funds or external wallets' });
      if (url.pathname === '/api/auth/config' && request.method === 'GET') return respond(response, 200, { appId: process.env.PRIVY_APP_ID ?? null, mode: 'privy-testnet' });
      if (url.pathname === '/api/session' && request.method === 'POST') {
        const { role, accessToken, identityToken, walletAddress } = await json(request); if (!sessionRoles.has(role)) return respond(response, 400, { error: 'Choose buyer, resolver, or guest. Seller access requires an invitation.' });
        let authenticated;
        try { authenticated = await verifyAccessToken(accessToken, identityToken); } catch { throw new AuthenticationError('Privy authentication is invalid or expired.'); }
        if (!authenticated?.userId || !Number.isFinite(authenticated.expiresAt) || !Array.isArray(authenticated.walletAddresses)) throw new AuthenticationError('Privy did not return a valid authenticated session.');
        if (typeof walletAddress !== 'string' || !/^0x[\da-fA-F]{40}$/.test(walletAddress)) return respond(response, 400, { error: 'Wallet address must be an Ethereum address.' });
        if (!authenticated.walletAddresses.includes(walletAddress.toLowerCase())) return respond(response, 403, { error: 'The selected wallet is not linked to this Privy account.', code: 'wallet_not_linked' });
        if (role === 'buyer' || role === 'seller') {
          const participantUser = participantUsers.get(role);
          if (!participantUser && role === 'seller') return respond(response, 403, { error: 'Seller access requires an accepted invitation.', code: 'seller_invitation_required' });
          if (participantUser && authenticated.userId !== participantUser) return respond(response, 403, { error: 'This Privy account is not the assigned local participant.', code: 'participant_not_assigned' });
          if (!participantUser) participantUsers.set(role, authenticated.userId);
        }
        const id = randomUUID(); const created = { id, role, userId: authenticated.userId, walletAddress, agreementId: participantUsers.get(role) === authenticated.userId ? localAgreementId : null, createdAt: now(), expiresAt: Math.min(authenticated.expiresAt, now() + sessionLifetimeMs) }; sessions.set(id, created);
        return respond(response, 201, sessionPayload(created), { 'set-cookie': `pactflow_session=${id}; HttpOnly; SameSite=Strict; Path=/` });
      }
      if (url.pathname === '/api/session' && request.method === 'GET') return session ? respond(response, 200, sessionPayload(session)) : respond(response, 401, { error: 'No authenticated session.' });
      if (url.pathname === '/api/session' && request.method === 'DELETE') { if (session) sessions.delete(cookie(request).pactflow_session); return respond(response, 204, {}, { 'set-cookie': 'pactflow_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/' }); }
      if (url.pathname === '/api/agreement' && request.method === 'GET') {
        if (!session) return respond(response, 401, { error: 'Sign in to the local demo.' });
        if (session.role !== 'resolver' && !participantSession(session)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        return respond(response, 200, { agreement: agreementFor(session.role, demo), mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/invitations' && request.method === 'POST') {
        if (!participantSession(session)) return respond(response, 403, { error: 'Only an invited buyer or seller can invite a counterparty.' });
        const invitedRole = session.role === 'buyer' ? 'seller' : 'buyer';
        const id = randomUUID();
        invitations.set(id, { id, agreementId: localAgreementId, invitedRole, inviter: session.role, status: 'pending', createdAt: now() });
        return respond(response, 201, { id, agreementId: localAgreementId, invitedRole, status: 'pending', mode: 'local-only' });
      }
      const invitationMatch = url.pathname.match(/^\/api\/agreement\/invitations\/([\w-]+)\/accept$/);
      if (invitationMatch && request.method === 'POST') {
        if (!session) return respond(response, 401, { error: 'Sign in to the local demo.' });
        if (session.role !== 'invitee') return respond(response, 403, { error: 'Only an invitee session can accept an invitation.' });
        const invitation = invitations.get(invitationMatch[1]);
        if (!invitation || invitation.status !== 'pending') throw new RuleError('This invitation is invalid, expired, or already accepted.');
        participantUsers.set(invitation.invitedRole, session.userId);
        session.role = invitation.invitedRole; session.agreementId = invitation.agreementId;
        invitation.status = 'accepted'; invitation.acceptedAt = now(); invitation.acceptedBy = session.id;
        return respond(response, 200, { ...sessionPayload(session), invitation: { id: invitation.id, agreementId: invitation.agreementId, status: invitation.status } });
      }
      if (url.pathname === '/api/agreement/copilot' && request.method === 'POST') {
        if (!session) return respond(response, 401, { error: 'Sign in to the local demo.' });
        if (!participantSession(session)) return respond(response, 403, { error: 'This session is not invited to change the agreement.' });
        const { brief } = await json(request);
        return respond(response, 200, { terms: demo.suggest(brief), notice: 'Co-pilot suggestions are editable drafts only. It cannot approve terms, release funds, judge quality, or resolve disputes.', mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/draft' && request.method === 'PUT') {
        if (!session) return respond(response, 401, { error: 'Sign in to the local demo.' });
        if (!participantSession(session)) return respond(response, 403, { error: 'This session is not invited to change the agreement.' });
        const { terms } = await json(request);
        return respond(response, 200, { agreement: demo.replaceDraft(session.role, terms), mode: 'local-only' });
      }
      if (url.pathname === '/api/agreement/actions' && request.method === 'POST') {
        if (!session) return respond(response, 401, { error: 'Sign in to the local demo.' });
        if (!Object.hasOwn(identities, session.role)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        if (['buyer', 'seller'].includes(session.role) && !participantSession(session)) return respond(response, 403, { error: 'This session is not invited to the agreement.' });
        const { type } = await json(request); return respond(response, 200, { agreement: demo.act(session.role, type), mode: 'local-only' });
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

if (process.argv[1] === fileURLToPath(import.meta.url)) createApp().listen(port, () => console.log(`PactFlow local demo ready at http://localhost:${port}`));
