import { createClient } from '@supabase/supabase-js';

let client;

async function configuration() {
  const response = await fetch('/api/auth/config');
  const config = await response.json();
  if (!response.ok || !config.url || !config.publishableKey) throw new Error('Sign-in is not configured for this environment.');
  return config;
}

export async function supabase() {
  if (!client) {
    const config = await configuration();
    client = createClient(config.url, config.publishableKey, { auth: { flowType: 'pkce' } });
  }
  return client;
}

export async function authenticatedRequest(path, options = {}) {
  const { data: { session } } = await (await supabase()).auth.getSession();
  if (!session?.access_token) throw new Error('Your sign-in session has expired. Please sign in again.');
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) }
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) { const error = new Error(payload.error || 'The request failed.'); error.code = payload.code; error.issues = payload.issues; throw error; }
  return payload;
}
