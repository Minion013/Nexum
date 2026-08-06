import { authenticatedRequest, supabase } from './supabase-auth.js';
import { createEmailOtpSender } from './email-otp.js';

const $ = selector => document.querySelector(selector);
let otpSender;
let resendTimer;

function showMessage(message = '') { const element = $('#request-error'); element.hidden = !message; element.textContent = message; }
async function sender() { otpSender ??= createEmailOtpSender({ auth: (await supabase()).auth }); return otpSender; }
function startResendCooldown(seconds) {
  const button = $('#resend-code');
  button.hidden = false;
  button.disabled = true;
  clearInterval(resendTimer);
  let remaining = seconds;
  const render = () => { button.textContent = remaining ? `Resend code (${remaining}s)` : 'Resend code'; button.disabled = remaining > 0; };
  render();
  resendTimer = setInterval(() => { remaining -= 1; render(); if (!remaining) clearInterval(resendTimer); }, 1_000);
}
async function sendCode() {
  const email = $('#email').value.trim();
  if (!email) throw new Error('Enter your email address.');
  const result = await (await sender()).request(email);
  if (!result.ok) {
    if (result.reason === 'cooldown') { startResendCooldown(result.retryAfterSeconds); showMessage(`Please wait ${result.retryAfterSeconds} seconds before requesting another code.`); return; }
    throw new Error(result.message);
  }
  $('#code-field').hidden = false;
  $('#send-code').textContent = 'Verify code';
  $('#email-code').focus();
  startResendCooldown(result.retryAfterSeconds);
  showMessage('We sent a one-time code to your email.');
}

async function verifyCode() {
  const email = $('#email').value.trim();
  const token = $('#email-code').value.trim();
  if (!email || !token) throw new Error('Enter your email address and one-time code.');
  const { error } = await (await supabase()).auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  $('#login-form').hidden = true;
  $('#role-controls').hidden = false;
  showMessage('Signed in. Choose how you are joining the local demo.');
}

async function beginSession(role) {
  try { await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role }) }); } catch (error) {
    if (role !== 'seller' || error.code !== 'seller_invitation_required') throw error;
    await authenticatedRequest('/api/session', { method: 'POST', body: JSON.stringify({ role: 'invitee' }) });
  }
  window.location.assign('/workspace.html');
}

$('#login-form').onsubmit = async event => {
  event.preventDefault();
  try {
    if (!$('#code-field').hidden) return verifyCode();
    await sendCode();
  } catch (error) { showMessage(error.message); }
};

$('#resend-code').onclick = async () => { try { await sendCode(); } catch (error) { showMessage(error.message); } };
document.querySelectorAll('[data-role]').forEach(button => { button.onclick = async () => { try { await beginSession(button.dataset.role); } catch (error) { showMessage(error.message); } }; });
