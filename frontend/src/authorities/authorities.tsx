'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, ApiError } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { AuthoritiesContent, AuthoritiesError, AuthoritiesForbidden, AuthoritiesLoading, type AuthorityRegistryData } from './presentation';

type AuthorityError = { kind: 'forbidden' | 'unavailable'; message: string };

export function AuthoritiesPage() {
  const { status, auth } = useSignedInAuth();
  const [data, setData] = useState<AuthorityRegistryData | null>(null);
  const [error, setError] = useState<AuthorityError | null>(null);

  const loadAuthorities = useCallback(async (currentAuth: NonNullable<typeof auth>) => {
    setData(null);
    setError(null);
    try {
      const response = await apiRequest<{ authorities: AuthorityRegistryData }>('/api/authorities', {}, currentAuth);
      setData(response.authorities);
    } catch (requestError) {
      const apiError = requestError instanceof ApiError ? requestError : null;
      setError(apiError?.status === 403
        ? { kind: 'forbidden', message: apiError.message }
        : { kind: 'unavailable', message: apiError?.message || 'The Authority Registry is unavailable. Check your sign-in, then try again.' });
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !auth) return;
    void loadAuthorities(auth);
  }, [auth, loadAuthorities, status]);

  if (status === 'loading' || (!data && !error)) return <AuthoritiesLoading />;
  if (error?.kind === 'forbidden') return <AuthoritiesForbidden />;
  if (error) return <AuthoritiesError message={error.message} onRetry={() => auth && void loadAuthorities(auth)} />;
  return <AuthoritiesContent data={data ?? { entries: [] }} />;
}
