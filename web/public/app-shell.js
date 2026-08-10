import { authenticatedRequest, clearLocalTestFixture, supabase } from './supabase-auth.js';
import { privateAvatarUrl } from './private-avatar.js';
import { loadingProfileIdentity, resolveProfileIdentity } from './profile-identity.js';
import { signedInNavigation } from './signed-in-navigation.js';

const route = location.pathname === '/contacts' ? '/people' : location.pathname;
const active = href => route === href || (href !== '/home' && route.startsWith(`${href}/`));
async function signOut() { clearLocalTestFixture(); await (await supabase()).auth.signOut(); location.assign('/'); }
function navLink(href, title) { const link = document.createElement('a'); link.href = href; link.textContent = title; if (active(href)) link.setAttribute('aria-current', 'page'); return link; }
function nav(label) {
  const element = document.createElement('nav'); element.className = 'app-nav'; element.setAttribute('aria-label', label);
  signedInNavigation.forEach(([href, title]) => element.append(navLink(href, title)));
  return element;
}
function quickNavigation() {
  const quickNav = document.createElement('nav');
  quickNav.className = 'bottom-nav';
  quickNav.setAttribute('aria-label', 'Quick navigation');
  signedInNavigation
    .forEach(([href, title]) => quickNav.append(navLink(href, title)));
  return quickNav;
}
function signOutButton() { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Sign out'; button.addEventListener('click', signOut); return button; }
function configureProfileMenu(menu) {
  const summary = menu?.querySelector('summary');
  if (!summary) return;
  summary.setAttribute('aria-expanded', String(menu.open));
  menu.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(menu.open)));
}
function renderProfileIdentity(summary, identity) {
  summary.replaceChildren();
  summary.setAttribute('aria-label', identity.accessibleLabel ?? `Open profile menu for ${identity.label}`);
  summary.setAttribute('aria-busy', String(identity.status === 'loading'));
  summary.classList.toggle('profile-identity-loading', identity.status === 'loading');
  if (identity.status === 'loading') {
    const avatar = document.createElement('span'); avatar.className = 'avatar profile-avatar-loading'; avatar.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.className = 'profile-name profile-name-loading'; name.setAttribute('aria-hidden', 'true');
    summary.append(avatar, name);
    return;
  }
  const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = identity.imageUrl ? '' : identity.initials;
  avatar.style.backgroundColor = identity.appearance.background; avatar.style.color = identity.appearance.foreground;
  avatar.style.backgroundImage = identity.imageUrl ? `url("${identity.imageUrl}")` : ''; avatar.classList.toggle('has-image-preview', Boolean(identity.imageUrl));
  const name = document.createElement('span'); name.className = 'profile-name'; name.textContent = identity.label; name.title = identity.label;
  summary.append(avatar, name);
}
function profileMenu() { const menu = document.createElement('details'); menu.className = 'avatar-menu'; const summary = document.createElement('summary'); renderProfileIdentity(summary, loadingProfileIdentity()); const links = document.createElement('nav'); links.className = 'profile-menu'; links.setAttribute('aria-label', 'Profile menu'); links.append(navLink('/settings', 'Profile Settings'), signOutButton()); menu.append(summary, links); configureProfileMenu(menu); return menu; }
function configureDrawer(drawer, open) {
  if (!drawer || !open) return;
  drawer.setAttribute('aria-label', 'Mobile navigation');
  open.setAttribute('aria-controls', drawer.id || 'nav-drawer');
  open.setAttribute('aria-expanded', 'false');
  open.addEventListener('click', () => { drawer.showModal(); open.setAttribute('aria-expanded', 'true'); });
  drawer.addEventListener('close', () => open.setAttribute('aria-expanded', 'false'));
}
function fillDrawer(drawer) {
  if (!drawer) return;
  const close = drawer.querySelector('#close-nav');
  drawer.replaceChildren();
  if (close) drawer.append(close);
  drawer.append(nav('Mobile navigation'), profileMenu());
}
function mountShell() {
  for (const href of ['/signed-in.css', '/profile-presentation.css', '/profile-identity.css']) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = href; document.head.append(stylesheet);
  }
  const existing = document.querySelector('.app-shell');
  if (existing) {
    existing.querySelectorAll('.app-nav').forEach(current => current.replaceWith(nav(current.getAttribute('aria-label') ?? 'Primary navigation')));
    existing.querySelectorAll('.avatar-menu').forEach(menu => {
      configureProfileMenu(menu);
      const summary = menu.querySelector('summary');
      if (summary) renderProfileIdentity(summary, loadingProfileIdentity());
    });
    const existingDrawer = document.querySelector('.drawer'); fillDrawer(existingDrawer);
    const drawer = document.querySelector('.drawer'); const open = document.querySelector('#open-nav'); configureDrawer(drawer, open);
    document.querySelector('#close-nav')?.addEventListener('click', () => drawer?.close());
    const bottom = document.querySelector('.bottom-nav'); if (bottom) bottom.replaceWith(quickNavigation());
    document.querySelectorAll('#sign-out').forEach(button => button.addEventListener('click', signOut));
    return;
  }
  const main = document.querySelector('main'); if (!main) return;
  document.querySelector('header')?.remove();
  document.body.classList.remove('home-page'); document.body.classList.add('workspace-app');
  main.classList.remove('home-main'); main.classList.add('app-content');
  const shell = document.createElement('div'); shell.className = 'app-shell';
  const sidebar = document.createElement('aside'); sidebar.className = 'app-sidebar';
  const brand = document.createElement('a'); brand.className = 'brand app-brand'; brand.href = '/home'; brand.innerHTML = 'Pact<span>Flow</span>';
  const footer = document.createElement('div'); footer.className = 'app-sidebar-footer'; footer.append(profileMenu());
  sidebar.append(brand, nav('Primary navigation'), footer); shell.append(sidebar, main); document.body.append(shell);
  const topbar = document.createElement('header'); topbar.className = 'app-topbar'; const open = document.createElement('button'); open.className = 'mobile-toggle'; open.type = 'button'; open.textContent = 'Menu'; open.setAttribute('aria-label', 'Open navigation'); open.setAttribute('aria-expanded', 'false'); topbar.append(open); main.prepend(topbar);
  const drawer = document.createElement('dialog'); drawer.id = 'nav-drawer'; drawer.className = 'drawer'; const close = document.createElement('button'); close.id = 'close-nav'; close.type = 'button'; close.textContent = 'Close navigation'; close.addEventListener('click', () => drawer.close()); drawer.append(close, nav('Mobile navigation'), profileMenu()); configureDrawer(drawer, open); document.body.append(drawer);
  document.body.append(quickNavigation());
}
mountShell();

function notificationControl(controlLocation) {
  const control = document.createElement('button');
  control.className = `notification-control ${controlLocation}`;
  control.dataset.notificationControl = 'true';
  control.type = 'button';
  control.setAttribute('aria-label', 'Notifications');
  control.title = 'Notifications';
  control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>';
  control.addEventListener('click', () => location.assign('/notifications'));
  return control;
}

function isUsablePrivateAvatar(url) {
  if (!url) return Promise.resolve(false);
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      if (typeof image.decode !== 'function') { resolve(true); return; }
      image.decode().then(() => resolve(true), () => resolve(false));
    };
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

const profileIdentityRenderVersions = new WeakMap();
async function applyProfile(menu, profile) {
  const summary = menu.querySelector('summary');
  if (!summary) return;
  const renderVersion = (profileIdentityRenderVersions.get(menu) ?? 0) + 1;
  profileIdentityRenderVersions.set(menu, renderVersion);
  const identity = await resolveProfileIdentity(profile, async currentProfile => privateAvatarUrl(currentProfile, await supabase()), isUsablePrivateAvatar);
  if (profileIdentityRenderVersions.get(menu) !== renderVersion) return;
  renderProfileIdentity(summary, identity);
}

async function mountProfileIdentity() {
  const menus = [...document.querySelectorAll('.avatar-menu')];
  const sessionRequest = authenticatedRequest('/api/session').then(
    response => ({ response }),
    error => ({ error })
  );
  document.querySelectorAll('.app-sidebar-footer').forEach(footer => {
    if (!footer.querySelector('.sidebar-notification')) footer.append(notificationControl('sidebar-notification'));
  });
  const topbar = document.querySelector('.app-topbar');
  if (document.body.dataset.page === 'dashboard' && topbar && !topbar.querySelector('[data-notification-control]')) topbar.append(notificationControl('dashboard-notification'));
  try {
    const { notifications } = await authenticatedRequest('/api/notifications');
    document.querySelectorAll('[data-notification-control]').forEach(control => {
      if (notifications.unreadCount <= 0) return;
      const count = document.createElement('span');
      count.className = 'notification-count';
      count.textContent = String(notifications.unreadCount);
      count.setAttribute('aria-hidden', 'true');
      control.setAttribute('aria-label', `Notifications, ${notifications.unreadCount} unread`);
      control.append(count);
    });
  } catch {
    // The destination page surfaces an authenticated request failure where it can be acted on.
  }
  try {
    const { response, error } = await sessionRequest;
    if (error) throw error;
    const { user } = response;
    await Promise.all(menus.map(menu => applyProfile(menu, user.profile)));
  } catch {
    // The page-specific authenticated request surfaces any session failure.
  }
}

mountProfileIdentity();

document.addEventListener('pactflow:profile-updated', event => {
  const profile = event.detail?.profile;
  if (!profile) return;
  document.querySelectorAll('.avatar-menu').forEach(menu => { void applyProfile(menu, profile); });
});
