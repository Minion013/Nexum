import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../../supabase/config.toml', import.meta.url));
const templatePath = fileURLToPath(new URL('../../supabase/templates/magic_link.html', import.meta.url));

test('the email-code template is minimal, test-environment-safe, and exposes only a six-digit code', async () => {
  const [config, template] = await Promise.all([readFile(configPath, 'utf8'), readFile(templatePath, 'utf8')]);

  assert.match(config, /otp_length = 6/);
  assert.match(config, /subject = "Your NEXUM sign-in code"/);
  assert.match(config, /\[auth\.email\.template\.confirmation\]\nsubject = "Your NEXUM sign-in code"\ncontent_path = "\.\/supabase\/templates\/magic_link\.html"/);
  assert.match(template, /NEXUM test environment/);
  assert.match(template, /Your six-digit sign-in code/);
  assert.match(template, /\{\{ \.Token \}\}/);
  assert.match(template, /This code will expire soon\./);
  assert.match(template, /If you did not request this email, you can safely ignore it\./);
  assert.doesNotMatch(template, /ConfirmationURL/);
  assert.doesNotMatch(template, /<a\b/i);
});
