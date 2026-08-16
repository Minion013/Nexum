import type { DraftIssue } from './draft-model';

export function DraftStepper({ current }: { current: 'Choose Person' | 'Project details' | 'Review terms' | 'Send' }) {
  const steps = ['Choose Person', 'Project details', 'Review terms', 'Send'];
  const currentIndex = steps.indexOf(current);
  return <><ol className="contract-stepper" aria-label="Contract Draft steps">{steps.map((step, index) => <li key={step} className={index < currentIndex ? 'done' : undefined} aria-current={step === current ? 'step' : undefined}><span aria-hidden="true">{index + 1}. </span>{step}</li>)}</ol><p className="sr-only" role="status" aria-live="polite">Current step: {current}, {currentIndex + 1} of {steps.length}.</p></>;
}

export function DraftIssues({ issues }: { issues: DraftIssue[] }) {
  if (!issues.length) return null;
  return <ul className="draft-issues" aria-label="Draft validation issues">{issues.map((issue, index) => <li key={`${issue.fieldPath ?? 'issue'}-${index}`}><strong>{issue.fieldPath || issue.sectionType || 'Terms'}</strong>: {issue.message}</li>)}</ul>;
}
