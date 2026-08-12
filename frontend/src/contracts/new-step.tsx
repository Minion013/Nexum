import Link from 'next/link';

export function NewContractStepUnavailable({ step }: { step: 'Project details' | 'Review terms' }) {
  return <section className="contract-authoring-flow app-panel" aria-labelledby="new-step-title"><p className="eyebrow">Contract Draft</p><h1 id="new-step-title">Open a saved draft for {step.toLowerCase()}.</h1><p className="page-intro">This compatibility URL needs a saved Contract Draft ID. Start with counterparty choices, then continue through the protected authoring flow.</p><p><Link className="button primary" href="/contracts/new/choose-person">Choose the other Contract Party</Link></p></section>;
}
