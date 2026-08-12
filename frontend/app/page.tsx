import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="site-header">
        <Link className="brand" href="/">Pact<span>Flow</span></Link>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-creators">For creators</a>
        </nav>
        <Link className="button button-small button-dark" href="/login">Log in</Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">For the business behind your best work</p>
            <h1>Make every creative “yes” feel certain.</h1>
            <p className="lead">PactFlow gives creators and clients one clear place to agree on the work, the milestones, and what happens next—so you can spend less time chasing answers and more time making great work.</p>
            <div className="hero-actions">
              <Link className="button button-dark" href="/login">Start a project</Link>
              <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">→</span></a>
            </div>
            <p className="microcopy">Built for freelance creators, studios, and the teams that hire them.</p>
            <p className="microcopy" role="note">Testnet only. No real funds.</p>
          </div>
          <div className="hero-art" aria-label="A visual summary of a creative project moving from agreement to delivery">
            <div className="project-card card-top"><span className="card-icon">✦</span><div><strong>Brand film launch</strong><small>Creative direction · 3 milestones</small></div><span className="card-status">On track</span></div>
            <div className="project-card card-middle"><div className="avatar-group" aria-hidden="true"><span>J</span><span>M</span></div><div><small>Next milestone</small><strong>Storyboard review</strong></div><span className="checkmark">✓</span></div>
            <div className="project-card card-bottom"><div className="progress-ring" aria-hidden="true">2/3</div><div><small>Project progress</small><strong>Ideas becoming reality</strong></div></div>
            <span className="orb orb-one" /><span className="orb orb-two" />
          </div>
        </section>

        <section className="trust-strip" aria-label="PactFlow benefits"><p>Less ambiguity. Better collaboration. More confidence.</p><div><span>Clear scope</span><span>Milestone-led</span><span>Shared record</span></div></section>

        <section className="content-section" id="how-it-works">
          <div className="section-heading"><p className="eyebrow">A calmer way to work together</p><h2>From the first brief to the final handoff, everyone knows where they stand.</h2></div>
          <div className="steps">
            <article><span>01</span><h3>Set the shape of the work</h3><p>Turn the brief into a shared plan with a scope, milestones, and review moments that make sense for the project.</p></article>
            <article><span>02</span><h3>Keep momentum visible</h3><p>Give each delivery a clear next step. No more wondering who is waiting on whom, or what “done” means.</p></article>
            <article><span>03</span><h3>Finish with confidence</h3><p>Keep the decisions and delivery trail in one place, so a great project ends as clearly as it began.</p></article>
          </div>
        </section>

        <section className="creator-section" id="for-creators">
          <div><p className="eyebrow">Made for people who make things happen</p><h2>Your creative energy belongs in the work—not in follow-ups.</h2><p>Whether you make campaigns, films, designs, writing, or digital experiences, PactFlow helps you lead client work with the clarity of a larger team.</p><Link className="text-link" href="/login">Create your first project <span aria-hidden="true">→</span></Link></div>
          <aside><blockquote>“The project felt easy because everyone could see the agreement and the next milestone.”</blockquote><p>For creators and clients who value a great working relationship.</p></aside>
        </section>

        <section className="closing-cta"><p className="eyebrow">Make the next yes a clear one</p><h2>Good work starts with a shared understanding.</h2><Link className="button button-light" href="/login">Get started</Link></section>
      </main>

      <footer><Link className="brand" href="/">Pact<span>Flow</span></Link><span>Better creative work, together.</span></footer>
    </div>
  );
}
