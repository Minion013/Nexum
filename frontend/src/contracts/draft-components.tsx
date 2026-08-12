import type { DraftIssue } from './draft-model';

export function DraftStepper({ current }: { current: 'Project details' | 'Review terms' }) {
  const steps = ['Choose Person', 'Project details', 'Review terms', 'Send'];
  return <ol className="contract-stepper" aria-label="Contract Draft steps">{steps.map(step => <li key={step} className={step === 'Choose Person' ? 'done' : undefined} aria-current={step === current ? 'step' : undefined}>{step}</li>)}</ol>;
}

export function DraftIssues({ issues }: { issues: DraftIssue[] }) {
  if (!issues.length) return null;
  return <ul className="draft-issues" aria-label="Draft validation issues">{issues.map((issue, index) => <li key={`${issue.fieldPath ?? 'issue'}-${index}`}><strong>{issue.fieldPath || issue.sectionType || 'Terms'}</strong>: {issue.message}</li>)}</ul>;
}
