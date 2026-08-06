import { authenticatedRequest, supabase } from './supabase-auth.js';
import { createMagicLinkSender } from './magic-link.js';
import { restoreMagicLinkSession } from './magic-link-session.js';

const $ = selector => document.querySelector(selector);
let magicLinkSender;
let resendTimer;

function showMessage(message = '') { const element = $('#request-error'); element.hidden = !message; element.textContent = message; }
function showRoleSelection() { $('#login-form').hidden = true; $('#resend-link').hidden = true; $('#role-controls').hidden = false; showMessage('Signed in. Choose how you are joining the local demo.'); }
async function sender() { magicLinkSender ??= createMagicLinkSender({ auth: (await supabase()).auth, redirectTo: new URL('/login.html', window.location.origin).toString() }); return magicLinkSender; }
function startResendCooldown(seconds) {
  const button = $('#resend-link');
  button.hidden = false;
  button.disabled = true;
  clearInterval(resendTimer);
  let remaining = seconds;
  const render = () => { button.textContent = remaining ? `Resend sign-in link (${remaining}s)` : 'Resend sign-in link'; button.disabled = remaining > 0; };
  render();
  resendTimer = setInterval(() => { remaining -= 1; render(); if (!remaining) clearInterval(resendTimer); }, 1_000);
}
async function sendMagicLink() {
  const email = $('#email').value.trim();
  if (!email) throw new Error('Enter your email address.');
  const result = await (await sender()).request(email);
  if (!result.ok) {
    if (result.reason === 'cooldown') { startResendCooldown(result.retryAfterSeconds); showMessage(`Please wait ${result.retryAfterSeconds} seconds before requesting another link.`); return; }
    throw new Error(result.message);
  }
  startResendCooldown(result.retryAfterSeconds);
  showMessage('We sent a sign-in link to your email. Open it in this browser to continue.');
}
async function beginSession(role) {
  try { await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role }) }); } catch (error) {
    if (role !== 'seller' || error.code !== 'seller_invitation_required') throw error;
    await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role: 'invitee' }) });
  }
  window.location.assign('/workspace.html');
}

$('#login-form').onsubmit = async event => { event.preventDefault(); try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
$('#resend-link').onclick = async () => { try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
document.querySelectorAll('[data-role]').forEach(button => { button.onclick = async () => { try { await beginSession(button.dataset.role); } catch (error) { showMessage(error.message); } }; });
const callbackParameters = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
const isMagicLinkCallback = callbackParameters.has('code') || callbackParameters.has('access_token') || callbackParameters.has('error');
(async () => restoreMagicLinkSession({ auth: (await supabase()).auth, isCallback: isMagicLinkCallback, onAuthenticated: showRoleSelection, onCallbackFailure: showMessage }))().catch(error => showMessage(error.message));
