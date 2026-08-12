'use client';

import { useEffect, useState } from 'react';
import { apiRequest, type ApiError } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { NotificationsContent, NotificationsError, NotificationsLoading, type NotificationEntry, type NotificationsData } from './presentation';

function requestErrorMessage(error: unknown): string {
  const apiError = error as ApiError;
  return apiError.message || 'Your private inbox is unavailable. Please try again.';
}

export function NotificationsPage() {
  const { status, auth, markNotificationRead } = useSignedInAuth();
  const [data, setData] = useState<NotificationsData | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !auth) return;
    let active = true;
    setData(null);
    setError('');
    void apiRequest<{ notifications: NotificationsData }>('/api/notifications', {}, auth).then(result => {
      if (active) setData(result.notifications);
    }).catch(requestError => {
      if (active) setError(requestErrorMessage(requestError));
    });
    return () => { active = false; };
  }, [status, auth]);

  function markRead(notification: NotificationEntry) {
    if (!auth || notification.readAt || markingId) return;
    setActionError('');
    setMarkingId(notification.id);
    void apiRequest<{ notification: { id: string; readAt: string } }>(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: 'POST' }, auth).then(result => {
      setData(current => {
        if (!current) return current;
        const entries = current.entries.map(entry => entry.id === result.notification.id ? { ...entry, readAt: result.notification.readAt } : entry);
        return { entries, unreadCount: entries.filter(entry => !entry.readAt).length };
      });
      markNotificationRead();
    }).catch(requestError => {
      setActionError(requestErrorMessage(requestError));
    }).finally(() => setMarkingId(null));
  }

  if (status === 'loading' || (!data && !error)) return <NotificationsLoading />;
  if (error) return <NotificationsError message={error} />;
  return <NotificationsContent data={data ?? { unreadCount: 0, entries: [] }} markingId={markingId} actionError={actionError} onMarkRead={markRead} />;
}
