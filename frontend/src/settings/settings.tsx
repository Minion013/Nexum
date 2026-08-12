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

function AvatarPreview({ profile, imageUrl, values, className = '' }: { profile: Profile; imageUrl: string | null; values: SettingsValues; className?: string }) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  useEffect(() => { setImageLoadFailed(false); }, [imageUrl]);
  const appearance = avatarAppearance(values.avatarSeed);
  const showImage = avatarPresentation(imageUrl, imageLoadFailed) === 'image';
  return <span className={`avatar ${className}${showImage ? ' has-image-preview' : ''}`.trim()} style={{ backgroundColor: appearance.background, color: appearance.foreground, ...(showImage ? { backgroundImage: `url("${imageUrl}")` } : {}) }} aria-hidden="true">{showImage ? <img src={imageUrl ?? ''} alt="" aria-hidden="true" style={{ display: 'none' }} onError={() => setImageLoadFailed(true)} /> : profileInitials(profile)}</span>;
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

  if (status === 'loading') return <div className="profile-settings-page"><section className="app-panel settings-loading-card" aria-live="polite"><p className="eyebrow">Profile Settings</p><h1>Loading your Profile Settings…</h1><p className="page-intro">Preparing your private Profile data.</p></section></div>;
  if (!profile) return <div className="profile-settings-page"><section className="app-panel settings-loading-card" aria-labelledby="settings-error-title"><p className="eyebrow">Profile Settings</p><h1 id="settings-error-title">Profile Settings could not be loaded.</h1><p className="page-intro">Your authenticated Profile is unavailable. Please sign in again.</p></section></div>;

  const displayedAvatarUrl = previewUrl ?? avatarUrl;
  const previewProfile = { ...profile, displayName: values.displayName || profile.displayName };
  const previewName = values.displayName.trim() || 'Your name';
  const previewHeadline = values.professionalHeadline.trim() || 'Your professional headline';
  const previewBio = values.bio.trim() || 'Add a short introduction so collaborators know who they are working with.';
  return <div className="profile-settings-page">
    <header className="settings-page-header">
      <div>
        <p className="eyebrow">Profile Settings</p>
        <h1>Make your profile feel like you.</h1>
        <p className="page-intro">Shape the identity collaborators see across NEXUM, with everything important in one calm workspace.</p>
      </div>
      {statusMessage && <p className="settings-save-state" role="status"><span aria-hidden="true" />Changes saved</p>}
    </header>
    {error && <p className="form-message settings-error" role="alert">{error}</p>}
    <form className="profile-settings-layout" onSubmit={event => void save(event)} noValidate>
      <div className="profile-settings-main">
        <section className="app-panel settings-card" aria-labelledby="identity-heading">
          <div className="settings-card-heading"><div><span className="settings-card-kicker">Public profile</span><h2 id="identity-heading">Identity</h2><p>Use the name and context you want collaborators to recognise.</p></div></div>
          <div className="profile-fields profile-identity-fields">
            <label><span className="field-label">Display name</span><input name="displayName" maxLength={120} required autoComplete="name" value={values.displayName} onChange={event => updateValue('displayName', event.target.value)} /></label>
            <label><span className="field-label">Professional headline</span><input name="professionalHeadline" maxLength={160} placeholder="e.g. Product designer" value={values.professionalHeadline} onChange={event => updateValue('professionalHeadline', event.target.value)} /></label>
            <label className="wide"><span className="field-label">Bio</span><textarea name="bio" maxLength={1000} rows={5} placeholder="A short introduction for your NEXUM profile" value={values.bio} onChange={event => updateValue('bio', event.target.value)} /></label>
          </div>
        </section>
        <section className="app-panel settings-card" aria-labelledby="avatar-heading">
          <div className="settings-card-heading"><div><span className="settings-card-kicker">Profile image</span><h2 id="avatar-heading">Avatar</h2><p>Choose a colour or add a private image. Your choice follows you around the workspace.</p></div></div>
          <div className="avatar-edit-layout">
            <div className="avatar-stage"><AvatarPreview profile={previewProfile} imageUrl={displayedAvatarUrl} values={values} className="avatar-hero" /></div>
            <div className="avatar-edit-controls">
              <label className="select-field"><span className="field-label">Avatar colour</span><select name="avatarSeed" value={values.avatarSeed} onChange={event => updateValue('avatarSeed', event.target.value as AvatarSeed)}>{avatarSeeds.map(seed => <option key={seed} value={seed}>{seed[0].toUpperCase() + seed.slice(1)}</option>)}</select></label>
              <div className="profile-image-field"><input ref={fileInputRef} id="avatar-file-input" className="visually-hidden" name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="avatar-file-help avatar-file-status" onChange={handleFile} /><label className="image-picker" htmlFor="avatar-file-input"><span className="image-picker-icon" aria-hidden="true">＋</span><span className="image-picker-copy"><strong>{selectedFile ? 'Replace private image' : 'Add a private image'}</strong><span>Only you can see this upload.</span></span><span className="image-picker-button">{selectedFile ? 'Change image' : 'Choose image'}</span></label><small id="avatar-file-help">JPEG, PNG, or WebP · up to 5 MB</small><span id="avatar-file-status" className="file-selection-status" aria-live="polite">{selectedFile ? `${selectedFile.name} selected. Save to upload.` : avatarUrl ? 'Private image currently active.' : 'No new image selected.'}</span></div>
            </div>
          </div>
        </section>
      </div>
      <aside className="profile-settings-rail" aria-label="Profile preview and visibility">
        <section className="profile-preview-card" aria-labelledby="preview-heading">
          <div className="profile-preview-banner"><span>NEXUM PROFILE</span></div>
          <div className="profile-preview-avatar"><AvatarPreview profile={previewProfile} imageUrl={displayedAvatarUrl} values={values} className="avatar-preview-large" /></div>
          <div className="profile-preview-copy"><span className="settings-card-kicker">Live preview</span><h2 id="preview-heading">{previewName}</h2><p className="profile-preview-headline">{previewHeadline}</p><p className="profile-preview-bio">{previewBio}</p></div>
          <div className="profile-preview-footer"><span>Profile visibility</span><strong>{values.discoverable ? 'Discoverable' : 'Private'}</strong></div>
        </section>
        <section className="app-panel settings-card visibility-card" aria-labelledby="visibility-heading">
          <div className="settings-card-heading"><div><span className="settings-card-kicker">People directory</span><h2 id="visibility-heading">Discoverability</h2><p>Choose whether signed-in NEXUM users can find you in People.</p></div></div>
          <label className="visibility-toggle"><span className="toggle-control"><input name="discoverable" type="checkbox" checked={values.discoverable} onChange={event => updateValue('discoverable', event.target.checked)} /><span className="toggle-track" aria-hidden="true"><span /></span></span><span><strong>Show me in People</strong><small>Profile images always stay private.</small></span></label>
        </section>
        <div className="settings-save-area"><div className="settings-status" id="settings-status" aria-live="polite">{statusMessage || 'Your changes are kept private until you save.'}</div><button className="primary settings-save-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}<span aria-hidden="true">→</span></button></div>
      </aside>
    </form>
  </div>;
}
