// @ts-nocheck
import './app-shell';
import { authenticatedRequest } from './supabase-auth';

const list = document.querySelector('#notification-list');
const status = document.querySelector('#notification-status');
const error = document.querySelector('#request-error');

function decrementUnreadBadge() {
  const badge = document.querySelector('.notification-count');
  if (!badge) return;
  const nextCount = Math.max(0, Number(badge.textContent) - 1);
  if (nextCount === 0) badge.remove();
  else {
    badge.textContent = String(nextCount);
    badge.setAttribute('aria-label', `${nextCount} unread notifications`);
  }
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function renderNotification(notification) {
  const item = document.createElement('article');
  item.className = `notification-item${notification.readAt ? ' is-read' : ''}`;
  const copy = document.createElement('div');
  const title = document.createElement('strong'); title.textContent = notification.title;
  const body = document.createElement('p'); body.textContent = notification.body;
  const time = document.createElement('time'); time.dateTime = notification.createdAt; time.textContent = formatTime(notification.createdAt);
  copy.append(title, body, time);
  const actions = document.createElement('div'); actions.className = 'notification-actions';
  const open = document.createElement('a'); open.className = 'button'; open.href = notification.href; open.textContent = 'Open';
  actions.append(open);
  if (!notification.readAt) {
    const read = document.createElement('button'); read.type = 'button'; read.textContent = 'Mark read';
    read.addEventListener('click', async () => {
      read.disabled = true;
      try {
        await authenticatedRequest(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: 'POST' });
        notification.readAt = new Date().toISOString();
        item.classList.add('is-read');
        read.remove();
        decrementUnreadBadge();
      } catch (requestError) {
        read.disabled = false;
        error.hidden = false;
        error.textContent = requestError.message;
      }
    });
    actions.append(read);
  }
  item.append(copy, actions);
  return item;
}

async function init() {
  const { notifications } = await authenticatedRequest('/api/notifications');
  status.hidden = true;
  if (!notifications.entries.length) {
    status.hidden = false;
    status.textContent = 'You have no notifications yet.';
    return;
  }
  list.replaceChildren(...notifications.entries.map(renderNotification));
}

init().catch(requestError => {
  error.hidden = false;
  error.textContent = requestError.message;
  status.hidden = true;
});
