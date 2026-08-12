'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiRequest, type AuthHeaders, type Profile, type SessionPayload } from '../auth/client';
import { getBrowserAuth, resolvePrivateAvatar, signOutBrowser } from '../auth/browser';
import { avatarAppearance, profileInitials, profileLabel } from '../profile/presentation';

type AuthStatus = 'loading' | 'ready' | 'error';
type NotificationSummary = { unreadCount: number };
type AuthContextValue = {
  status: AuthStatus;
  auth: AuthHeaders | null;
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
  notifications: NotificationSummary | null;
  notificationError: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue>({ status: 'loading', auth: null, profile: null, updateProfile: () => undefined, notifications: null, notificationError: false, error: null });

export function useSignedInAuth(): AuthContextValue {
  return useContext(AuthContext);
}

const navigation = [
  { href: '/home', label: 'Dashboard' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/people', label: 'People' }
] as const;

function isActive(pathname: string, href: string): boolean {
  const route = pathname === '/contacts' ? '/people' : pathname;
  return route === href || (href !== '/home' && route.startsWith(`${href}/`));
}

function Navigation({ label, pathname, className = 'app-nav' }: { label: string; pathname: string; className?: string }) {
  return (
    <nav className={className} aria-label={label}>
      {navigation.map(item => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>{item.label}</Link>
      ))}
    </nav>
  );
}

function ProfileIdentity({ profile, auth, loading }: { profile: Profile | null; auth: AuthHeaders | null; loading: boolean }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setImageUrl(null);
    if (!profile || !auth) return () => { active = false; };
    void resolvePrivateAvatar(profile, auth).then(url => { if (active) setImageUrl(url); });
    return () => { active = false; };
  }, [profile, auth]);
  if (loading || !profile) {
    return <><span className="avatar profile-avatar-loading" aria-hidden="true" /><span className="profile-name profile-name-loading" aria-hidden="true" /></>;
  }
  const appearance = avatarAppearance(profile.avatarSeed);
  return <><span className={`avatar${imageUrl ? ' has-image-preview' : ''}`} style={{ backgroundColor: appearance.background, color: appearance.foreground, ...(imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {}) }} aria-hidden="true">{imageUrl ? '' : profileInitials(profile)}</span><span className="profile-name" title={profileLabel(profile)}>{profileLabel(profile)}</span><Chevron /></>;
}

function Chevron() {
  return <svg className="profile-menu-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" /></svg>;
}

function ProfileMenu({ profile, auth, loading }: { profile: Profile | null; auth: AuthHeaders | null; loading: boolean }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function handleSignOut() {
    if (!auth || busy) return;
    setBusy(true);
    try {
      await signOutBrowser(auth);
    } finally {
      window.location.assign('/');
    }
  }
  return (
    <details className="avatar-menu" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary aria-label={loading || !profile ? 'Loading profile' : `Open profile menu for ${profileLabel(profile)}`} aria-busy={loading || !profile} aria-expanded={open}>
        <ProfileIdentity profile={profile} auth={auth} loading={loading || !profile} />
      </summary>
      <nav className="profile-menu" aria-label="Profile menu">
        <Link href="/settings">Profile Settings</Link>
        <button type="button" onClick={() => void handleSignOut()} disabled={busy}>Sign out</button>
      </nav>
    </details>
  );
}

function NotificationControl({ notifications, unavailable }: { notifications: NotificationSummary | null; unavailable: boolean }) {
  const unreadCount = notifications?.unreadCount ?? 0;
  const label = unavailable ? 'Notifications unavailable' : unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications';
  return <Link className="notification-control" href="/notifications" aria-label={label} title={label}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-3-3-9M10 21h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
    {unreadCount > 0 && <span className="notification-count" aria-hidden="true">{unreadCount}</span>}
  </Link>;
}

function MobileNavigation({ pathname, profile, auth, loading }: { pathname: string; profile: Profile | null; auth: AuthHeaders | null; loading: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  function openNavigation() { dialogRef.current?.showModal(); setOpen(true); }
  function closeNavigation() { dialogRef.current?.close(); setOpen(false); }
  return <>
    <button className="mobile-toggle" type="button" aria-label="Open navigation" aria-controls="nav-drawer" aria-expanded={open} onClick={openNavigation}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg><span>Menu</span>
    </button>
    <dialog ref={dialogRef} id="nav-drawer" className="drawer" onClose={() => setOpen(false)} aria-label="Mobile navigation">
      <button id="close-nav" type="button" onClick={closeNavigation} aria-label="Close navigation"><span>Close</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg></button>
      <Navigation label="Mobile navigation" pathname={pathname} />
      <ProfileMenu profile={profile} auth={auth} loading={loading} />
    </dialog>
  </>;
}

function AuthFailure({ message }: { message: string }) {
  return <main id="main-content" className="app-content" tabIndex={-1}><section className="app-panel" aria-labelledby="auth-required-title"><p className="eyebrow">Signed-in area</p><h1 id="auth-required-title">Sign in to continue.</h1><p className="page-intro">{message}</p><p><Link className="button primary" href="/login">Return to sign in</Link></p></section></main>;
}

export function SignedInShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/home';
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [auth, setAuth] = useState<AuthHeaders | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
  const [notificationError, setNotificationError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextAuth = await getBrowserAuth();
        const [session, notificationResult] = await Promise.all([
          apiRequest<SessionPayload>('/api/session', {}, nextAuth),
          apiRequest<{ notifications: NotificationSummary }>('/api/notifications', {}, nextAuth).catch(() => null)
        ]);
        if (!active) return;
        setAuth(nextAuth);
        setProfile(session.user.profile);
        setNotifications(notificationResult?.notifications ?? null);
        setNotificationError(!notificationResult);
        setStatus('ready');
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Your sign-in session is unavailable. Please sign in again.');
        setStatus('error');
      }
    })();
    return () => { active = false; };
  }, []);

  const updateProfile = useCallback((nextProfile: Profile) => setProfile(nextProfile), []);
  const contextValue = useMemo(() => ({ status, auth, profile, updateProfile, notifications, notificationError, error }), [status, auth, profile, updateProfile, notifications, notificationError, error]);
  const loading = status === 'loading';
  return <AuthContext.Provider value={contextValue}>
    <div className="workspace-app">
      <a className="skip-link" href="#main-content">Skip to Dashboard</a>
      <div className="app-shell">
        <aside className="app-sidebar">
          <Link className="brand app-brand" href="/home">Pact<span>Flow</span></Link>
          <Navigation label="Primary navigation" pathname={pathname} />
          <div className="app-sidebar-footer"><ProfileMenu profile={profile} auth={auth} loading={loading} /></div>
        </aside>
        {status === 'error' ? <AuthFailure message={error ?? 'Your sign-in session is unavailable. Please sign in again.'} /> : <main id="main-content" className="app-content" tabIndex={-1}><header className="app-topbar"><MobileNavigation pathname={pathname} profile={profile} auth={auth} loading={loading} /><NotificationControl notifications={notifications} unavailable={notificationError} /></header>{children}</main>}
      </div>
      {status !== 'error' && <Navigation label="Quick navigation" pathname={pathname} className="bottom-nav" />}
    </div>
  </AuthContext.Provider>;
}
