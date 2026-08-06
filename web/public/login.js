import { authenticatedRequest, supabase } from './supabase-auth.js';

const $ = selector => document.querySelector(selector);

function showMessage(message = '') { const element = $('#request-error'); element.hidden = !message; element.textContent = message; }

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
    const email = $('#email').value.trim();
    if (!email) throw new Error('Enter your email address.');
    const { error } = await (await supabase()).auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
    $('#code-field').hidden = false;
    $('#send-code').textContent = 'Verify code';
    $('#email-code').focus();
    showMessage('We sent a one-time code to your email.');
  } catch (error) { showMessage(error.message); }
};

document.querySelectorAll('[data-role]').forEach(button => { button.onclick = async () => { try { await beginSession(button.dataset.role); } catch (error) { showMessage(error.message); } }; });
