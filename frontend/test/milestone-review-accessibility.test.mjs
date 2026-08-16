import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadFrontendModule } from './load-frontend-module.mjs';

const reviewSource = await readFile(new URL('../src/contracts/milestone-review.tsx', import.meta.url), 'utf8');
const stepperSource = await readFile(new URL('../src/contracts/draft-components.tsx', import.meta.url), 'utf8');
const authoringEntrySource = await readFile(new URL('../src/contracts/authoring-entry.tsx', import.meta.url), 'utf8');
const projectDetailsSource = await readFile(new URL('../src/contracts/project-details-handoff.tsx', import.meta.url), 'utf8');
const reviewTermsSource = await readFile(new URL('../src/contracts/review-terms.tsx', import.meta.url), 'utf8');
const sendSource = await readFile(new URL('../src/contracts/send.tsx', import.meta.url), 'utf8');
const reviewStyles = await readFile(new URL('../public/contract-detail.css', import.meta.url), 'utf8');
const authoringStyles = await readFile(new URL('../public/contracts-milestonepay.css', import.meta.url), 'utf8');
const { nextMilestoneReviewTab } = await loadFrontendModule('src/contracts/milestone-review-presentation.ts');

test('Milestone Review tabs provide keyboard navigation and preserve focus on the active tab', () => {
  assert.equal(nextMilestoneReviewTab('evidence', 'ArrowRight'), 'criteria');
  assert.equal(nextMilestoneReviewTab('criteria', 'ArrowLeft'), 'evidence');
  assert.equal(nextMilestoneReviewTab('activity', 'ArrowRight'), 'evidence');
  assert.equal(nextMilestoneReviewTab('evidence', 'Home'), 'evidence');
  assert.equal(nextMilestoneReviewTab('evidence', 'End'), 'activity');
  assert.equal(nextMilestoneReviewTab('criteria', 'PageDown'), null);
});

test('authoring and review pages expose semantic focus order and live phase/status announcements', () => {
  assert.match(reviewSource, /aria-controls=/);
  assert.match(reviewSource, /aria-selected=/);
  assert.match(reviewSource, /tabIndex=\{tab === item\.id \? 0 : -1\}/);
  assert.match(reviewSource, /onKeyDown=/);
  assert.match(reviewSource, /role="tabpanel"/);
  assert.match(reviewSource, /id="milestone-review-panel-evidence"[\s\S]*hidden=\{tab !== 'evidence'\}/);
  assert.match(reviewSource, /id="milestone-review-panel-criteria"[\s\S]*hidden=\{tab !== 'criteria'\}/);
  assert.match(reviewSource, /id="milestone-review-panel-activity"[\s\S]*hidden=\{tab !== 'activity'\}/);
  assert.doesNotMatch(reviewSource, /className="review-countdown" aria-live=/);
  assert.match(reviewSource, /aria-live="polite"/);
  assert.match(stepperSource, /aria-current=/);
  assert.match(stepperSource, /Current step/);
  assert.match(authoringEntrySource, /Step 1 of 4/);
  assert.match(projectDetailsSource, /Step 2 of 4/);
  assert.match(reviewTermsSource, /Step 3 of 4/);
  assert.match(sendSource, /Step 4 of 4/);
});

test('desktop and narrow review surfaces keep equivalent actions without page-level horizontal overflow', () => {
  assert.match(reviewStyles, /\.milestone-review[^\n]*overflow-wrap:anywhere/);
  assert.match(reviewStyles, /@media\(max-width:640px\)[\s\S]*\.detail-tabs\{[^}]*flex-wrap:wrap/);
  assert.match(reviewStyles, /@media\(max-width:640px\)[\s\S]*\.milestone-decision-actions,.milestone-decision-grid\{[^}]*grid-template-columns:1fr/);
  assert.match(authoringStyles, /p:not\(\.eyebrow\):not\(\.sr-only\)/);
  for (const action of ['Submit final evidence', 'Accept milestone', 'Request revision', 'Raise dispute']) assert.match(reviewSource, new RegExp(action));
});
