// @ts-nocheck
import { authenticatedRequest, localTestSignIn, supabase } from './supabase-auth';
import { createEmailCodeSender } from './email-code';

const $ = selector => document.querySelector(selector);
let emailCodeSender;
let resendTimer;
let needsOnboarding = false;

function showMessage(message = '') { const element = $('#request-error'); element.hidden = !message; element.textContent = message; }
function showStep(step) {
  $('#email-entry').hidden = step !== 'email';
  $('#account-choice').hidden = step !== 'account';
  $('#email-sent').hidden = step !== 'code';
  $('#onboarding-controls').hidden = step !== 'onboarding';
}
function showSentEmail(email) {
  $('#sent-email').textContent = email;
  $('#code').value = '';
  showStep('code');
  showMessage();
  $('#code').focus();
}
function showOnboarding(profile) {
  needsOnboarding = !profile?.onboardingCompletedAt;
  showStep('onboarding');
  showMessage();
}
function showAccountChoice(profile) {
  needsOnboarding = !profile?.onboardingCompletedAt;
  $('#account-name').textContent = profile?.displayName || 'your PactFlow account';
  showStep('account');
  showMessage();
}
async function sender() { emailCodeSender ??= createEmailCodeSender({ auth: (await supabase()).auth }); return emailCodeSender; }
function startResendCooldown(seconds) {
  const button = $('#resend-link');
  button.hidden = false;
  button.disabled = true;
  clearInterval(resendTimer);
  let remaining = seconds;
  const render = () => { button.textContent = remaining ? `Resend sign-in code (${remaining}s)` : 'Resend sign-in code'; button.disabled = remaining > 0; };
  render();
  resendTimer = setInterval(() => { remaining -= 1; render(); if (!remaining) clearInterval(resendTimer); }, 1_000);
}
async function sendEmailCode() {
  const email = $('#email').value.trim();
  if (!email) throw new Error('Enter your email address.');
  if (await localTestSignIn(email)) { window.location.assign('/wallet'); return; }
  const result = await (await sender()).request(email);
  if (!result.ok) {
    if (result.reason === 'cooldown') { startResendCooldown(result.retryAfterSeconds); showSentEmail(email); showMessage(`Please wait ${result.retryAfterSeconds} seconds before requesting another code.`); return; }
    throw new Error(result.message);
  }
  startResendCooldown(result.retryAfterSeconds);
  showSentEmail(email);
}
async function verifyEmailCode() {
  const email = $('#sent-email').textContent;
  const result = await (await sender()).verify(email, $('#code').value.trim());
  if (!result.ok) throw new Error(result.message);
  await handleAuthenticatedSession();
}
async function continueToHome() {
  if (needsOnboarding) await authenticatedRequest('/api/onboarding/complete', { method: 'POST' });
  window.location.assign('/home');
}
async function handleAuthenticatedSession() {
  try {
    const session = await authenticatedRequest('/api/session');
    showAccountChoice(session.user.profile);
  } catch {
    await (await supabase()).auth.signOut();
    showStep('email');
  }
}

$('#login-form').onsubmit = async event => { event.preventDefault(); try { await sendEmailCode(); } catch (error) { showMessage(error.message); } };
$('#code-form').onsubmit = async event => { event.preventDefault(); try { await verifyEmailCode(); } catch (error) { showMessage(error.message); } };
$('#resend-link').onclick = async () => { try { await sendEmailCode(); } catch (error) { showMessage(error.message); } };
$('#change-email').onclick = () => { clearInterval(resendTimer); $('#resend-link').hidden = true; showStep('email'); showMessage(); $('#email').focus(); };
$('#continue-to-home').onclick = async () => { try { await continueToHome(); } catch (error) { showMessage(error.message); } };
$('#continue-as-account').onclick = () => { if (needsOnboarding) showOnboarding(); else window.location.assign('/home'); };
$('#use-different-account').onclick = async () => { try { await (await supabase()).auth.signOut(); emailCodeSender = undefined; showStep('email'); showMessage(); $('#email').focus(); } catch (error) { showMessage(error.message); } };
(async () => {
  const { data: { session } } = await (await supabase()).auth.getSession();
  if (session) await handleAuthenticatedSession();
})().catch(error => showMessage(error.message));
