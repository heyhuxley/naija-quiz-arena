import { Form, Link } from "react-router";

export function meta() {
  return [
    { title: "Who Wants To Be A Literature Giant" },
    { name: "description", content: "Join a live Nigerian quiz session." },
  ];
}

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Literature Giant home">
          <span className="wordmark-mark" aria-hidden="true">LG</span>
          <span>Literature Giant</span>
        </Link>
        <Link to="/host" className="text-link">Host sign in</Link>
      </header>
      <section className="home-hero" aria-labelledby="welcome-title">
        <div className="home-hero-copy">
          <p className="eyebrow">A live Nigerian quiz show</p>
          <h1 id="welcome-title">Bring the room into the game.</h1>
          <p className="hero-copy">Join a host led quiz from your own device. Play together in one room or from anywhere.</p>
          <Form action="/join" method="get" className="join-form">
            <label htmlFor="join-code">Have a session code?</label>
            <div className="form-row">
              <input id="join-code" name="code" inputMode="text" autoComplete="off" maxLength={6} minLength={6} placeholder="Six character code" aria-describedby="join-help" required />
              <button type="submit" className="button button-primary">Join session</button>
            </div>
            <p id="join-help" className="form-help">No account needed. Your host will share the code.</p>
          </Form>
        </div>
        <aside className="game-preview" aria-label="Session details">
          <div className="game-preview-heading">
            <p className="eyebrow">Tonight's game</p>
            <span className="live-status"><span aria-hidden="true" /> Live</span>
          </div>
          <p className="game-preview-title">Literature Giant</p>
          <dl className="game-facts">
            <div><dt>Questions</dt><dd>15</dd></div>
            <div><dt>Guests</dt><dd>Up to 10</dd></div>
            <div><dt>Prize</dt><dd>₦500,000</dd></div>
          </dl>
        </aside>
      </section>
      <section className="home-details" aria-label="How the game works">
        <div><span className="step-number">01</span><h2>Choose your seat</h2><p>Join on your phone with a display name.</p></div>
        <div><span className="step-number">02</span><h2>Play together</h2><p>Answer privately while your host sets the pace.</p></div>
        <div><span className="step-number">03</span><h2>See your result</h2><p>Build your score on a simulated prize ladder.</p></div>
      </section>
      <footer className="site-footer"><span>Free to play</span><span>Simulated prizes, no cash payout</span></footer>
    </main>
  );
}
