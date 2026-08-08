import { supabase } from './supabase-auth.js';

const route = location.pathname === '/contacts' ? '/people' : location.pathname;
const navigation = [
  ['/home', 'Dashboard'], ['/contracts', 'Contracts'], ['/people', 'People'], ['/workspace', 'Workspaces'], ['/authorities', 'Authorities'], ['/settings', 'Settings']
];
const active = href => route === href || (href !== '/home' && route.startsWith(`${href}/`));
async function signOut() { await (await supabase()).auth.signOut(); location.assign('/'); }
function navLink(href, title) { const link = document.createElement('a'); link.href = href; link.textContent = title; if (active(href)) link.setAttribute('aria-current', 'page'); return link; }
function nav(label) {
  const element = document.createElement('nav'); element.className = 'app-nav'; element.setAttribute('aria-label', label);
  navigation.forEach(([href, title]) => element.append(navLink(href, title)));
  return element;
}
function signOutButton() { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Sign out'; button.addEventListener('click', signOut); return button; }
function profileMenu() { const menu = document.createElement('details'); menu.className = 'avatar-menu'; const summary = document.createElement('summary'); summary.setAttribute('aria-label', 'Open profile menu'); summary.innerHTML = '<span class="avatar">PF</span><span>Profile</span>'; const links = document.createElement('nav'); links.className = 'profile-menu'; links.setAttribute('aria-label', 'Profile menu'); links.append(navLink('/settings', 'Profile Settings'), navLink('/workspace', 'Workspace Settings'), signOutButton()); menu.append(summary, links); return menu; }
function mountShell() {
  if (!document.querySelector('link[href="/workspace.css"]')) { const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/workspace.css'; document.head.append(stylesheet); }
  const existing = document.querySelector('.app-shell');
  if (existing) {
    existing.querySelectorAll('.app-nav').forEach(current => current.replaceWith(nav(current.getAttribute('aria-label') ?? 'Primary navigation')));
    const existingDrawer = document.querySelector('.drawer'); if (existingDrawer && !existingDrawer.querySelector('.app-nav')) existingDrawer.append(nav('Mobile navigation'));
    const drawer = document.querySelector('.drawer'); const open = document.querySelector('#open-nav'); open?.setAttribute('aria-expanded', 'false'); open?.addEventListener('click', () => { drawer?.showModal(); open.setAttribute('aria-expanded', 'true'); }); document.querySelector('#close-nav')?.addEventListener('click', () => { drawer?.close(); open?.setAttribute('aria-expanded', 'false'); });
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
  const drawer = document.createElement('dialog'); drawer.className = 'drawer'; const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close navigation'; close.addEventListener('click', () => { drawer.close(); open.setAttribute('aria-expanded', 'false'); }); drawer.append(close, nav('Mobile navigation')); open.addEventListener('click', () => { drawer.showModal(); open.setAttribute('aria-expanded', 'true'); }); document.body.append(drawer);
  const bottom = document.createElement('nav'); bottom.className = 'bottom-nav'; bottom.setAttribute('aria-label', 'Quick navigation'); [['/home', 'Dashboard'], ['/contracts', 'Contracts'], ['/people', 'People'], ['/contracts#new-proposal', 'Create']].forEach(([href, title]) => bottom.append(navLink(href, title))); document.body.append(bottom);
}
mountShell();
