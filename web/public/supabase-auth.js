import { createClient } from '@supabase/supabase-js';

let client;
let browserConfig;
const localTestStorageKey = 'pactflow-local-test-email';
const isLoopbackHost = host => ['127.0.0.1', 'localhost', '::1'].includes(host);

async function configuration() {
  if (browserConfig) return browserConfig;
  const response = await fetch('/api/auth/config');
  const config = await response.json();
  if (!response.ok || !config.url || !config.publishableKey) throw new Error('Sign-in is not configured for this environment.');
  browserConfig = config;
  return browserConfig;
}

async function localTestIdentity() {
  return (await activeLocalTestFixture())?.email ?? null;
}

export async function activeLocalTestFixture() {
  const config = await configuration();
  const email = sessionStorage.getItem(localTestStorageKey);
  return isLoopbackHost(location.hostname) && config.localTestEmail === email
    ? { email, wallet: config.localTestWallet ?? null }
    : null;
}

export async function localTestSignIn(email) {
  const config = await configuration();
  const candidate = email.trim().toLowerCase();
  if (!isLoopbackHost(location.hostname) || !config.localTestEmail || candidate !== config.localTestEmail) return false;
  sessionStorage.setItem(localTestStorageKey, candidate);
  return true;
}

export function clearLocalTestFixture() {
  sessionStorage.removeItem(localTestStorageKey);
}

export async function supabase() {
  if (!client) {
    const config = await configuration();
    client = createClient(config.url, config.publishableKey, { auth: { flowType: 'pkce' } });
  }
  return client;
}

export async function authenticatedRequest(path, options = {}) {
  const testEmail = await localTestIdentity();
  let authorization = {};
  if (testEmail) authorization = { 'x-pactflow-local-test-email': testEmail };
  else {
    const { data: { session } } = await (await supabase()).auth.getSession();
    if (!session?.access_token) throw new Error('Your sign-in session has expired. Please sign in again.');
    authorization = { authorization: `Bearer ${session.access_token}` };
  }
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...authorization, ...(options.headers || {}) }
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) { const error = new Error(payload.error || 'The request failed.'); error.code = payload.code; error.issues = payload.issues; throw error; }
  return payload;
}
