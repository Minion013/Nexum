'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiRequest, type AuthHeaders, type Profile, type SessionPayload } from '../auth/client';
import { getBrowserAuth, resolvePrivateAvatar, signOutBrowser } from '../auth/browser';
import { NexumLogo } from '../branding/logo';
import { avatarAppearance, profileInitials, profileLabel } from '../profile/presentation';
import { signedInNavigation } from './navigation';

type AuthStatus = 'loading' | 'ready' | 'error';
type NotificationSummary = { unreadCount: number };
type AuthContextValue = {
  status: AuthStatus;
  auth: AuthHeaders | null;
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
  markNotificationRead: () => void;
  notifications: NotificationSummary | null;
  notificationError: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue>({ status: 'loading', auth: null, profile: null, updateProfile: () => undefined, markNotificationRead: () => undefined, notifications: null, notificationError: false, error: null });

export function useSignedInAuth(): AuthContextValue {
  return useContext(AuthContext);
}

type NavigationIcon = 'dashboard' | 'contracts' | 'wallet' | 'people' | 'bell' | 'settings';

const navigation = signedInNavigation.map(([href, label]) => ({ href, label, icon: iconForRoute(href) }));

function iconForRoute(href: string): NavigationIcon {
  if (href === '/contracts') return 'contracts';
  if (href === '/wallet') return 'wallet';
  if (href === '/people') return 'people';
  return 'dashboard';
}

function isActive(pathname: string, href: string): boolean {
  const route = pathname === '/contacts' ? '/people' : pathname;
  return route === href || (href !== '/home' && route.startsWith(`${href}/`));
}

function NavigationIconSvg({ icon }: { icon: NavigationIcon }) {
  const paths: Record<NavigationIcon, ReactNode> = {
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    contracts: <><path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" /><path d="M14 3.75v4.5h5M8.5 12h7M8.5 15.5h5" /></>,
    wallet: <><rect x="3.75" y="6" width="16.5" height="13" rx="2" /><path d="M5 6V4.75a2 2 0 0 1 2-2h9.25M15 12h5M16.5 12a1.5 1.5 0 1 0 0 3" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.75 19a5.25 5.25 0 0 1 10.5 0M16 5.5a2.5 2.5 0 0 1 0 5M16 13a4 4 0 0 1 4.25 4" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-3-3-9M10 21h4" /></>,
    settings: <><path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" /><path d="m19.3 13.25 1.25.97-1.7 2.95-1.5-.56a7.5 7.5 0 0 1-1.62.94L15.5 19h-3.4l-.23-1.45a7.5 7.5 0 0 1-1.62-.94l-1.5.56-1.7-2.95 1.25-.97a7.5 7.5 0 0 1 0-1.88l-1.25-.97 1.7-2.95 1.5.56a7.5 7.5 0 0 1 1.62-.94L12.1 5h3.4l.23 1.45a7.5 7.5 0 0 1 1.62.94l1.5-.56 1.7 2.95-1.25.97a7.5 7.5 0 0 1 0 1.88Z" /></>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[icon]}</g></svg>;
}

function Navigation({ label, pathname, className = 'app-nav' }: { label: string; pathname: string; className?: string }) {
  return (
    <nav className={className} aria-label={label}>
      {navigation.map(item => (
        <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}><span className="nav-icon"><NavigationIconSvg icon={item.icon} /></span><span>{item.label}</span></Link>
      ))}
    </nav>
  );
}

function pageTitle(pathname: string): string {
  if (pathname === '/home') return 'Dashboard';
  if (pathname === '/wallet') return 'Wallet';
  if (pathname === '/people' || pathname === '/contacts') return 'People';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/settings') return 'Settings';
  return pathname.startsWith('/contracts') ? 'Contracts' : 'Workspace';
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

function ProfileMenu({ profile, auth, loading, compact = false }: { profile: Profile | null; auth: AuthHeaders | null; loading: boolean; compact?: boolean }) {
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
    <details className={`avatar-menu${compact ? ' avatar-menu-compact' : ''}`} onToggle={event => setOpen(event.currentTarget.open)}>
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
        const session = await apiRequest<SessionPayload>('/api/session', {}, nextAuth);
        if (!active) return;
        setAuth(nextAuth);
        setProfile(session.user.profile);
        setStatus('ready');
        void apiRequest<{ notifications: NotificationSummary }>('/api/notifications', {}, nextAuth)
          .then(notificationResult => {
            if (!active) return;
            setNotifications(notificationResult.notifications);
            setNotificationError(false);
          })
          .catch(() => {
            if (!active) return;
            setNotificationError(true);
          });
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Your sign-in session is unavailable. Please sign in again.');
        setStatus('error');
      }
    })();
    return () => { active = false; };
  }, []);

  const updateProfile = useCallback((nextProfile: Profile) => setProfile(nextProfile), []);
  const markNotificationRead = useCallback(() => setNotifications(current => current ? { unreadCount: Math.max(0, current.unreadCount - 1) } : current), []);
  const contextValue = useMemo(() => ({ status, auth, profile, updateProfile, markNotificationRead, notifications, notificationError, error }), [status, auth, profile, updateProfile, markNotificationRead, notifications, notificationError, error]);
  const loading = status === 'loading';
  return <AuthContext.Provider value={contextValue}>
        <div className="workspace-app">
          <a className="skip-link" href="#main-content">Skip to Dashboard</a>
          <div className="app-shell">
            <aside className="app-sidebar">
              <div className="sidebar-brand-row">
                <Link className="brand app-brand" href="/home" aria-label="NEXUM home"><NexumLogo className="nexum-logo-app" /></Link>
              </div>
              <div className="sidebar-top">
                <Link className="new-contract-button" href="/contracts#new-contract"><span aria-hidden="true">+</span> New Contract</Link>
              </div>
          <div className="sidebar-navigation">
            <p className="sidebar-label">Workspace</p>
            <Navigation label="Primary navigation" pathname={pathname} />
            <div className="sidebar-divider" />
            <p className="sidebar-label">Account</p>
            <nav className="sidebar-utility-nav" aria-label="Account navigation">
              <Link href="/notifications" aria-current={isActive(pathname, '/notifications') ? 'page' : undefined}><span className="nav-icon"><NavigationIconSvg icon="bell" /></span><span>Notifications</span>{notifications?.unreadCount ? <span className="sidebar-notification-count">{notifications.unreadCount}</span> : null}</Link>
              <Link href="/settings" aria-current={isActive(pathname, '/settings') ? 'page' : undefined}><span className="nav-icon"><NavigationIconSvg icon="settings" /></span><span>Settings</span></Link>
            </nav>
          </div>
          <div className="app-sidebar-footer"><div className="sidebar-status"><span className="sidebar-status-dot" />Workspace active</div><ProfileMenu profile={profile} auth={auth} loading={loading} /></div>
        </aside>
        {status === 'error' ? <AuthFailure message={error ?? 'Your sign-in session is unavailable. Please sign in again.'} /> : <main id="main-content" className="app-content" tabIndex={-1}><header className="app-topbar"><div className="topbar-leading"><MobileNavigation pathname={pathname} profile={profile} auth={auth} loading={loading} /><div className="topbar-context"><span>Workspace</span><strong>{pageTitle(pathname)}</strong></div><label className="workspace-search"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg><input type="search" suppressHydrationWarning aria-label="Search your workspace" placeholder="Search your workspace" /><kbd>⌘ K</kbd></label></div><div className="topbar-actions"><NotificationControl notifications={notifications} unavailable={notificationError} /><div className="topbar-profile"><ProfileMenu profile={profile} auth={auth} loading={loading} compact /></div></div></header>{children}</main>}
      </div>
      {status !== 'error' && <Navigation label="Quick navigation" pathname={pathname} className="bottom-nav" />}
    </div>
  </AuthContext.Provider>;
}
