// @ts-nocheck
import './app-shell';
import { authenticatedRequest } from './supabase-auth';

const invitationId = decodeURIComponent(window.location.pathname.split('/').at(-1));
const acceptButton = document.querySelector('#accept-invitation');
const status = document.querySelector('#invitation-status');
const error = document.querySelector('#invitation-error');

function showError(message) {
  error.hidden = false;
  error.textContent = message;
  status.textContent = '';
}

acceptButton.addEventListener('click', async () => {
  acceptButton.disabled = true;
  status.textContent = 'Accepting your private Contract invitation...';
  try {
    await authenticatedRequest(`/api/invitations/${encodeURIComponent(invitationId)}/accept`, { method: 'POST' });
    status.textContent = 'Invitation accepted. Opening your private Contract...';
    window.setTimeout(() => window.location.assign('/contracts'), 700);
  } catch (requestError) {
    acceptButton.disabled = false;
    showError(requestError.message);
  }
});

(async () => {
  try {
    const session = await authenticatedRequest('/api/session');
    status.textContent = `Signed in as ${session.user.profile.displayName ?? session.user.email}. Confirm that you want to join this Contract.`;
    acceptButton.hidden = false;
  } catch (requestError) {
    showError(`${requestError.message} Sign in with the invited email address to continue.`);
    window.setTimeout(() => window.location.assign('/login.html'), 1_200);
  }
})();
