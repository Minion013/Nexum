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
  $('#onboarding-controls').hidden = step !== 'onboarding';
}
function showSentEmail(email) {
  $('#sent-email').textContent = email;
  showStep('sent');
  showMessage();
}
function showOnboarding(profile) {
  needsOnboarding = !profile?.onboardingCompletedAt;
  showStep('onboarding');
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
async function continueToHome() {
  if (needsOnboarding) await authenticatedRequest('/api/onboarding/complete', { method: 'POST' });
  window.location.assign('/workspace');
}
async function handleAuthenticatedSession() {
  const session = await authenticatedRequest('/api/session');
  if (session.user.profile.onboardingCompletedAt) { window.location.assign('/workspace'); return; }
  showOnboarding(session.user.profile);
}

$('#login-form').onsubmit = async event => { event.preventDefault(); try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
$('#resend-link').onclick = async () => { try { await sendMagicLink(); } catch (error) { showMessage(error.message); } };
$('#change-email').onclick = () => { clearInterval(resendTimer); $('#resend-link').hidden = true; showStep('email'); showMessage(); $('#email').focus(); };
$('#continue-to-home').onclick = async () => { try { await continueToHome(); } catch (error) { showMessage(error.message); } };
const callbackParameters = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
const isMagicLinkCallback = callbackParameters.has('code') || callbackParameters.has('access_token') || callbackParameters.has('error');
(async () => restoreMagicLinkSession({ auth: (await supabase()).auth, isCallback: isMagicLinkCallback, onAuthenticated: handleAuthenticatedSession, onCallbackFailure: showMessage }))().catch(error => showMessage(error.message));
