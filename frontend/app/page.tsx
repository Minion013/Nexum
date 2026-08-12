import Link from 'next/link';
import { NexumLogo } from '../src/branding/logo';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="icon icon-arrow">
      <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="icon icon-check">
      <path d="m3.5 8.2 2.8 2.7 6.2-6" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="signal-icon">
      <path d="M3 14.5a7 7 0 0 1 14 0M6.5 14.5a3.5 3.5 0 0 1 7 0M10 14.6h.01" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="NEXUM home"><NexumLogo /></Link>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-creators">For creators</a>
        </nav>
        <Link className="button button-small button-header" href="/login">Log in</Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-copy">
            <p className="landing-kicker hero-enter hero-enter-one"><span className="kicker-mark"><SignalIcon /></span> Shared agreements for creative work</p>
            <h1 id="landing-title" className="hero-enter hero-enter-two">Keep the work moving. <em>Keep the agreement clear.</em></h1>
            <p className="landing-lead hero-enter hero-enter-three">NEXUM turns a good brief into a shared plan, visible milestones, and a decision trail everyone can trust.</p>
            <div className="hero-actions hero-enter hero-enter-four">
              <Link className="button button-primary" href="/login">Start a project <ArrowIcon /></Link>
              <a className="button button-secondary" href="#how-it-works">See the flow <ArrowIcon /></a>
            </div>
            <div className="hero-proof hero-enter hero-enter-five" aria-label="NEXUM is for creative teams">
              <span className="proof-avatar proof-avatar-one">A</span>
              <span className="proof-avatar proof-avatar-two">M</span>
              <span className="proof-avatar proof-avatar-three">J</span>
              <p>For freelancers, studios, and the teams that hire them.</p>
            </div>
          </div>

          <div className="hero-visual hero-enter hero-enter-visual" aria-label="A live agreement timeline for a brand identity project">
            <div className="visual-aura visual-aura-one" />
            <div className="visual-aura visual-aura-two" />
            <div className="agreement-window">
              <div className="window-topline">
                <span className="live-label"><span className="live-dot" /> Live agreement</span>
                <span className="window-code">PROJECT / 014</span>
              </div>
              <div className="window-heading">
                <div>
                  <p className="window-eyebrow">Brand identity sprint</p>
                  <h2>Four clear moments between brief and handoff.</h2>
                </div>
                <p className="window-total"><span>$8,400</span><small>secured</small></p>
              </div>
              <div className="agreement-progress" aria-hidden="true"><span /></div>
              <ol className="agreement-timeline">
                <li className="timeline-complete">
                  <span className="timeline-marker"><CheckIcon /></span>
                  <span className="timeline-copy"><strong>Scope agreed</strong><small>Brief, outcome, and roles</small></span>
                  <span className="timeline-state">Done</span>
                </li>
                <li className="timeline-active">
                  <span className="timeline-marker">02</span>
                  <span className="timeline-copy"><strong>Direction review</strong><small>Next decision · Aug 16</small></span>
                  <span className="timeline-state">In review</span>
                </li>
                <li>
                  <span className="timeline-marker">03</span>
                  <span className="timeline-copy"><strong>Final handoff</strong><small>Files and usage notes</small></span>
                  <span className="timeline-state">Queued</span>
                </li>
              </ol>
              <div className="window-footer"><span><span className="footer-pulse" /> Everyone is aligned</span><span>Updated just now</span></div>
            </div>
            <div className="floating-note floating-note-top"><span className="note-icon"><CheckIcon /></span><span><small>Milestone accepted</small><strong>Direction is locked</strong></span></div>
            <div className="floating-note floating-note-bottom"><span className="note-spark">$</span><span><small>Next release</small><strong>$2,100 on approval</strong></span></div>
          </div>
        </section>

        <section className="signal-strip" aria-label="NEXUM principles">
          <p>Good work gets lighter when the agreement carries its own weight.</p>
          <div><span>Clear scope</span><i /> <span>Visible progress</span><i /> <span>Shared record</span></div>
        </section>

        <section className="content-section flow-section" id="how-it-works" aria-labelledby="flow-title">
          <div className="section-heading reveal-on-load">
            <p className="landing-kicker">How the flow works</p>
            <h2 id="flow-title">A quieter path from first brief to final handoff.</h2>
          </div>
          <div className="steps">
            <article className="step-card reveal-on-load reveal-delay-one">
              <span className="step-index">01</span>
              <div className="step-icon"><span className="step-icon-line" /></div>
              <h3>Shape the agreement</h3>
              <p>Put the outcome, milestones, and review moments in plain language before the work starts.</p>
            </article>
            <article className="step-card reveal-on-load reveal-delay-two">
              <span className="step-index">02</span>
              <div className="step-icon step-icon-signal"><span className="step-icon-dot" /></div>
              <h3>Keep decisions visible</h3>
              <p>Give every delivery a clear next move, so nobody has to reconstruct the project from scattered messages.</p>
            </article>
            <article className="step-card reveal-on-load reveal-delay-three">
              <span className="step-index">03</span>
              <div className="step-icon step-icon-check"><CheckIcon /></div>
              <h3>Finish with confidence</h3>
              <p>Leave the relationship with a complete record of what was agreed, delivered, and accepted.</p>
            </article>
          </div>
        </section>

        <section className="creator-section" id="for-creators" aria-labelledby="creator-title">
          <div className="creator-copy reveal-on-load">
            <p className="landing-kicker">For people who make things happen</p>
            <h2 id="creator-title">Your creative energy belongs in the work, not in follow-ups.</h2>
            <p>Whether you make campaigns, films, designs, writing, or digital experiences, NEXUM gives the working relationship a place to land.</p>
            <Link className="text-link" href="/login">Create your first project <ArrowIcon /></Link>
          </div>
          <aside className="creator-aside reveal-on-load reveal-delay-two">
            <div className="aside-rule" />
            <p className="aside-label">The NEXUM promise</p>
            <blockquote>“The next step should never be a mystery.”</blockquote>
            <p className="aside-caption">A shared agreement is a small act of care for everyone doing the work.</p>
          </aside>
        </section>

        <section className="closing-cta" aria-labelledby="closing-title">
          <div className="cta-orbit cta-orbit-one" aria-hidden="true" />
          <div className="cta-orbit cta-orbit-two" aria-hidden="true" />
          <div className="cta-content reveal-on-load">
            <p className="landing-kicker">Make the next yes a clear one</p>
            <h2 id="closing-title">Start with the agreement. Make room for the work.</h2>
            <Link className="button button-cta" href="/login">Get started <ArrowIcon /></Link>
            <p className="cta-note">Testnet only. No real funds.</p>
          </div>
        </section>
      </main>

      <footer>
        <Link className="brand" href="/" aria-label="NEXUM home"><NexumLogo /></Link>
        <span>Better creative work, together.</span>
      </footer>
    </div>
  );
}
