import { authenticatedRequest, supabase } from './supabase-auth.js';
import { createMagicLinkSender } from './magic-link.js';
import { restoreMagicLinkSession } from './magic-link-session.js';

const $ = selector => document.querySelector(selector);
let magicLinkSender;
let resendTimer;
let needsOnboarding = false;

function showMessage(message = '') { const element = $('#request-error'); element.hidden = !message; element.textContent = message; }
function showStep(step) {
  $('#email-entry').hidden = step !== 'email';
  $('#email-sent').hidden = step !== 'sent';
  $('#role-controls').hidden = step !== 'access';
}
function showSentEmail(email) {
  $('#sent-email').textContent = email;
  showStep('sent');
  showMessage();
}
function showRoleSelection(profile) {
  needsOnboarding = !profile?.onboardingCompletedAt;
  $('#role-eyebrow').textContent = needsOnboarding ? 'Welcome to PactFlow' : 'Welcome back';
  $('#role-title').textContent = needsOnboarding ? 'How are you joining this demo?' : 'Choose your local demo access.';
  $('#role-intro').textContent = needsOnboarding ? 'Set up your first local session. You can take a different role in another project.' : 'Your account is ready. Choose how you want to enter this local project.';
  showStep('access');
  showMessage();
}
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
    if (result.reason === 'cooldown') { startResendCooldown(result.retryAfterSeconds); showSentEmail(email); showMessage(`Please wait ${result.retryAfterSeconds} seconds before requesting another link.`); return; }
    throw new Error(result.message);
  }
  startResendCooldown(result.retryAfterSeconds);
  showSentEmail(email);
}
async function beginSession(role) {
  try { await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role }) }); } catch (error) {
    if (role !== 'seller' || error.code !== 'seller_invitation_required') throw error;
    await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role: 'invitee' }) });
  }
  if (needsOnboarding) await authenticatedRequest('/api/onboarding/complete', { method: 'POST' });
  window.location.assign('/workspace.html');
}
async function handleAuthenticatedSession() {
  const session = await authenticatedRequest('/api/session');
  if (session.role) { window.location.assign('/workspace.html'); return; }
  showRoleSelection(session.user.profile);
}

$('#login-form').onsubmit = async event => { event.preventDefault(); try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
$('#resend-link').onclick = async () => { try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
$('#change-email').onclick = () => { clearInterval(resendTimer); $('#resend-link').hidden = true; showStep('email'); showMessage(); $('#email').focus(); };
document.querySelectorAll('[data-role]').forEach(button => { button.onclick = async () => { try { await beginSession(button.dataset.role); } catch (error) { showMessage(error.message); } }; });
const callbackParameters = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
const isMagicLinkCallback = callbackParameters.has('code') || callbackParameters.has('access_token') || callbackParameters.has('error');
(async () => restoreMagicLinkSession({ auth: (await supabase()).auth, isCallback: isMagicLinkCallback, onAuthenticated: handleAuthenticatedSession, onCallbackFailure: showMessage }))().catch(error => showMessage(error.message));
