import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthConfig = {
  url: string | null;
  publishableKey: string | null;
  privyAppId?: string;
  localTestEmail?: string;
  localTestWallet?: { address: string; mockEusdBalance: string };
  mode?: 'supabase-auth';
};

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  username?: string | null;
  professionalHeadline?: string | null;
  bio?: string | null;
  avatarSeed?: string | null;
  avatarPath?: string | null;
  discoverable?: boolean;
  onboardingCompletedAt?: string | null;
};

export type AuthHeaders = { accessToken?: string; localTestEmail?: string };

export type SessionPayload = {
  user: { id: string; email: string | null; profile: Profile };
  mode: 'local-test-auth' | 'supabase-auth';
};

export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly issues?: Array<{ sectionType?: string; fieldPath?: string; code?: string; message: string }>;

  constructor(message: string, status: number, code?: string, issues?: Array<{ sectionType?: string; fieldPath?: string; code?: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await fetch('/api/auth/config', { cache: 'no-store' });
  const payload = await readPayload<AuthConfig & { error?: string }>(response);
  if (!response.ok) throw new ApiError(payload.error ?? 'Sign-in configuration is unavailable.', response.status);
  return payload;
}

export function createBrowserSupabase(config: AuthConfig): SupabaseClient {
  if (!config.url || !config.publishableKey) throw new Error('Sign-in is not configured for this environment.');
  return createClient(config.url, config.publishableKey, { auth: { flowType: 'pkce' } });
}

export function isLoopbackHost(hostname: string): boolean {
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname);
}

export function localFixtureEmail(config: AuthConfig, email: string, hostname: string): string | null {
  const candidate = email.trim().toLowerCase();
  return isLoopbackHost(hostname) && config.localTestEmail && candidate === config.localTestEmail ? candidate : null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, auth: AuthHeaders = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (auth.accessToken) headers.set('authorization', `Bearer ${auth.accessToken}`);
  if (auth.localTestEmail) headers.set('x-pactflow-local-test-email', auth.localTestEmail);
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const payload = await readPayload<T & { error?: string; code?: string; issues?: Array<{ sectionType?: string; fieldPath?: string; code?: string; message: string }> }>(response);
  if (!response.ok) throw new ApiError(payload.error ?? 'The request failed.', response.status, payload.code, payload.issues);
  return payload;
}

async function readPayload<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  try {
    return await response.json() as T;
  } catch {
    throw new ApiError('The service returned an invalid response.', response.status);
  }
}
