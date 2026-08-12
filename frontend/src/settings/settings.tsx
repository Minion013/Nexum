'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiRequest, type Profile } from '../auth/client';
import { resolvePrivateAvatar, uploadPrivateAvatar } from '../auth/browser';
import { avatarAppearance, profileInitials } from '../profile/presentation';
import { useSignedInAuth } from '../signed-in/app-shell';
import { avatarFileError, avatarPresentation, avatarSeeds, profileSettingsValues, validateSettings, type AvatarSeed, type SettingsValues } from './presentation';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function AvatarPreview({ profile, imageUrl, values }: { profile: Profile; imageUrl: string | null; values: SettingsValues }) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  useEffect(() => { setImageLoadFailed(false); }, [imageUrl]);
  const appearance = avatarAppearance(values.avatarSeed);
  const showImage = avatarPresentation(imageUrl, imageLoadFailed) === 'image';
  return <span className={`avatar${showImage ? ' has-image-preview' : ''}`} style={{ backgroundColor: appearance.background, color: appearance.foreground, ...(showImage ? { backgroundImage: `url("${imageUrl}")` } : {}) }} aria-hidden="true">{showImage ? <img src={imageUrl ?? ''} alt="" aria-hidden="true" style={{ display: 'none' }} onError={() => setImageLoadFailed(true)} /> : profileInitials(profile)}</span>;
}

export function SettingsPage() {
  const { status, auth, profile, updateProfile } = useSignedInAuth();
  const [values, setValues] = useState<SettingsValues>({ displayName: '', professionalHeadline: '', bio: '', avatarSeed: 'indigo', discoverable: false });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const hydratedProfileId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  function clearFeedback() { setError(''); setStatusMessage(''); }

  useEffect(() => {
    if (status !== 'ready' || !profile || hydratedProfileId.current === profile.id) return;
    hydratedProfileId.current = profile.id;
    setValues(profileSettingsValues(profile));
  }, [profile, status]);

  useEffect(() => {
    let active = true;
    setAvatarUrl(null);
    if (!profile || !auth) return () => { active = false; };
    void resolvePrivateAvatar(profile, auth).then(url => { if (active) setAvatarUrl(url); });
    return () => { active = false; };
  }, [auth, profile?.avatarPath, profile]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function updateValue<Key extends keyof SettingsValues>(key: Key, value: SettingsValues[Key]) {
    setValues(current => ({ ...current, [key]: value }));
    clearFeedback();
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    clearFeedback();
    if (!file) { setSelectedFile(null); return; }
    if (avatarFileError(file)) {
      event.target.value = '';
      setSelectedFile(null);
      setError('Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    const validationError = validateSettings(values);
    if (validationError) { setError(validationError); return; }
    if (!auth || !profile) { setError('Your sign-in session is unavailable. Please sign in again.'); return; }
    setSaving(true);
    let avatarPath = profile.avatarPath;
    let uploadMessage = '';
    let uploaded = false;
    try {
      if (selectedFile) {
        try {
          avatarPath = await uploadPrivateAvatar(selectedFile, profile.id, auth);
          uploaded = true;
        } catch (uploadError) {
          uploadMessage = errorMessage(uploadError, 'Your profile image was not uploaded. Your existing avatar remains unchanged.');
        }
      }
      const result = await apiRequest<{ profile: Profile }>('/api/profile/settings', { method: 'PUT', body: JSON.stringify({ ...values, displayName: values.displayName.trim(), professionalHeadline: values.professionalHeadline.trim(), bio: values.bio.trim(), avatarPath }) }, auth);
      updateProfile(result.profile);
      if (uploaded) {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      setStatusMessage(uploadMessage ? `${uploadMessage} Profile Settings saved.` : 'Profile Settings saved.');
    } catch (saveError) {
      setError(errorMessage(saveError, 'Profile Settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <section className="app-panel" aria-live="polite"><p className="eyebrow">Profile Settings</p><h1>Loading your Profile Settings…</h1><p className="page-intro">Preparing your private Profile data.</p></section>;
  if (!profile) return <section className="app-panel" aria-labelledby="settings-error-title"><p className="eyebrow">Profile Settings</p><h1 id="settings-error-title">Profile Settings could not be loaded.</h1><p className="page-intro">Your authenticated Profile is unavailable. Please sign in again.</p></section>;

  const displayedAvatarUrl = previewUrl ?? avatarUrl;
  return <>
    <p className="eyebrow">Profile Settings</p>
    <h1>Your personal identity, in one clear place.</h1>
    <p className="page-intro">Manage what collaborators can discover and the details that represent you in PactFlow.</p>
    {error && <p className="form-message" role="alert">{error}</p>}
    <form className="profile-settings" onSubmit={event => void save(event)} noValidate>
      <section className="app-panel profile-card" aria-labelledby="identity-heading">
        <div className="profile-card-heading"><div><h2 id="identity-heading">Identity</h2><p>Use the name and context you want collaborators to recognise.</p></div></div>
        <div className="profile-fields">
          <label>Display name<input name="displayName" maxLength={120} required autoComplete="name" value={values.displayName} onChange={event => updateValue('displayName', event.target.value)} /></label>
          <label>Professional headline<input name="professionalHeadline" maxLength={160} placeholder="e.g. Product designer" value={values.professionalHeadline} onChange={event => updateValue('professionalHeadline', event.target.value)} /></label>
          <label className="wide">Bio<textarea name="bio" maxLength={1000} rows={4} placeholder="A short introduction for your PactFlow Profile" value={values.bio} onChange={event => updateValue('bio', event.target.value)} /></label>
        </div>
      </section>
      <section className="app-panel profile-card" aria-labelledby="avatar-heading">
        <div className="profile-card-heading"><div><h2 id="avatar-heading">Avatar</h2><p>Choose a deterministic colour, or add a private image.</p></div></div>
        <div className="profile-avatar-row"><AvatarPreview profile={{ ...profile, displayName: values.displayName }} imageUrl={displayedAvatarUrl} values={values} /><div className="profile-avatar-copy"><strong>Your Profile avatar</strong><span>{previewUrl ? `${selectedFile?.name ?? 'Selected image'} preview. Save changes to upload it.` : avatarUrl ? 'Your private Profile image is visible only to you.' : 'A deterministic colour avatar is used unless a private upload succeeds.'}</span></div></div>
        <div className="profile-fields">
          <label>Avatar colour<select name="avatarSeed" value={values.avatarSeed} onChange={event => updateValue('avatarSeed', event.target.value as AvatarSeed)}>{avatarSeeds.map(seed => <option key={seed} value={seed}>{seed[0].toUpperCase() + seed.slice(1)}</option>)}</select></label>
          <div className="profile-image-field"><input ref={fileInputRef} id="avatar-file-input" className="visually-hidden" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="avatar-file-help avatar-file-status" onChange={handleFile} /><label className="image-picker" htmlFor="avatar-file-input"><span className="image-picker-icon" aria-hidden="true">↑</span><span className="image-picker-copy"><strong>Private Profile image</strong><span>Use a photo that represents you.</span></span><span className="image-picker-button">{selectedFile ? 'Change image' : 'Choose Profile image'}</span></label><small id="avatar-file-help">JPEG, PNG, or WebP · up to 5 MB · visible only to you.</small><span id="avatar-file-status" className="file-selection-status" aria-live="polite">{selectedFile ? `${selectedFile.name} selected.` : 'No new image selected.'}</span></div>
        </div>
      </section>
      <section className="app-panel profile-card" aria-labelledby="visibility-heading">
        <div className="profile-card-heading"><div><h2 id="visibility-heading">Discoverability</h2><p>Control whether signed-in PactFlow users can find this Profile in People.</p></div></div>
        <label className="discoverability-control"><input name="discoverable" type="checkbox" checked={values.discoverable} onChange={event => updateValue('discoverable', event.target.checked)} /> <span>Allow signed-in PactFlow users to discover this Profile</span></label>
        <p className="notice">Profile images remain private to this signed-in Profile, whether or not you choose to appear in People.</p>
        <div className="action-row profile-save"><span id="settings-status" aria-live="polite">{statusMessage}</span><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </section>
    </form>
  </>;
}
