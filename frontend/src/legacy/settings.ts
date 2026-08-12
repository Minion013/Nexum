// @ts-nocheck
import { authenticatedRequest, supabase } from './supabase-auth';
import { privateAvatarUrl } from './private-avatar';
import { avatarAppearance, profileInitials } from './profile-presentation';
import { profileSettingsValues, saveProfileSettings } from './profile-settings';

const form = document.querySelector('#settings-form');
const error = document.querySelector('#request-error');
const status = document.querySelector('#settings-status');
const preview = document.querySelector('#avatar-preview');
const avatarStatus = document.querySelector('#avatar-status');
const fileStatus = document.querySelector('#avatar-file-status');
let profile;

function message(element, value = '') { if (!element) return; element.textContent = value; }
function showError(value = '') { if (!error) return; error.hidden = !value; error.textContent = value; }

function fillProfileForm(currentProfile) {
  if (!form) return;
  const values = profileSettingsValues(currentProfile);
  form.elements.displayName.value = values.displayName;
  form.elements.professionalHeadline.value = values.professionalHeadline;
  form.elements.bio.value = values.bio;
  form.elements.avatarSeed.value = values.avatarSeed;
  form.elements.discoverable.checked = values.discoverable;
}

async function renderAvatar(currentProfile) {
  if (!preview) return;
  const appearance = avatarAppearance(currentProfile.avatarSeed);
  const imageUrl = await privateAvatarUrl(currentProfile, await supabase());
  preview.style.backgroundColor = appearance.background;
  preview.style.color = appearance.foreground;
  preview.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';
  preview.textContent = imageUrl ? '' : profileInitials(currentProfile);
  preview.classList.toggle('has-image-preview', Boolean(imageUrl));
  message(avatarStatus, imageUrl ? 'Your private profile image is visible only to you.' : 'A deterministic colour avatar is used unless a private upload succeeds.');
}

function valuesFromForm() {
  return {
    displayName: form.elements.displayName.value.trim(),
    professionalHeadline: form.elements.professionalHeadline.value.trim(),
    bio: form.elements.bio.value.trim(),
    avatarSeed: form.elements.avatarSeed.value,
    discoverable: form.elements.discoverable.checked
  };
}

async function uploadAvatar(file, currentProfile) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
  const extension = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${currentProfile.id}/avatar.${extension}`;
  const { error: uploadError } = await (await supabase()).storage.from('profile-images').upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error('Your profile image was not uploaded. Your existing avatar remains unchanged.');
  return path;
}

async function loadSettings() {
  try {
    const { user } = await authenticatedRequest('/api/session');
    profile = user.profile;
    fillProfileForm(profile);
    await renderAvatar(profile);
  } catch (loadError) {
    showError(loadError instanceof Error ? loadError.message : 'Profile Settings could not be loaded.');
  }
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!profile) return;
  showError();
  message(status, 'Saving Profile Settings…');
  try {
    const file = form.elements.avatarFile.files?.[0];
    const result = await saveProfileSettings({
      profile,
      values: valuesFromForm(),
      file,
      uploadAvatar,
      saveProfile: async values => (await authenticatedRequest('/api/profile/settings', { method: 'PUT', body: JSON.stringify(values) })).profile
    });
    profile = result.profile;
    fillProfileForm(profile);
    await renderAvatar(profile);
    document.dispatchEvent(new CustomEvent('pactflow:profile-updated', { detail: { profile } }));
    message(status, result.uploadError ?? 'Profile Settings saved.');
  } catch (saveError) {
    message(status);
    showError(saveError instanceof Error ? saveError.message : 'Profile Settings could not be saved.');
  }
});

form?.elements.avatarFile?.addEventListener('change', () => {
  const file = form.elements.avatarFile.files?.[0];
  message(fileStatus, file ? `${file.name} selected. Save changes to upload it.` : 'No new image selected.');
});

void loadSettings();
