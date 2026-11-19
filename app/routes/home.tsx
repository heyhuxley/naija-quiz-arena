import { Form, Link } from "react-router";
import { QuestionThread } from "../components/question-thread";

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
          <span className="wordmark-mark" aria-hidden="true">
            LG
          </span>
          <span>Literature Giant</span>
        </Link>
        <Link to="/host" className="text-link">
          Host sign in
        </Link>
      </header>
      <section className="home-hero" aria-labelledby="welcome-title">
        <div className="home-hero-copy">
          <h1 id="welcome-title">Fifteen questions. One room at a time.</h1>
          <p className="hero-copy">
            A host-led Nigerian quiz for groups in the same room or joining from anywhere. No
            account needed to play.
          </p>
          <Form action="/join" method="get" className="join-form">
            <label htmlFor="join-code">Have a session code?</label>
            <div className="form-row">
              <input
                id="join-code"
                name="code"
                inputMode="text"
                autoComplete="off"
                maxLength={6}
                minLength={6}
                placeholder="Six character code"
                aria-describedby="join-help"
                required
              />
              <button type="submit" className="button button-primary">
                Join session
              </button>
            </div>
            <p id="join-help" className="form-help">
              No account needed. Your host will share the code.
            </p>
          </Form>
        </div>
        <aside className="home-run" aria-label="How the shared quiz is structured">
          <p className="run-title">One shared run</p>
          <QuestionThread />
          <p className="run-note">
            A host sets the pace. Every guest answers privately. The prize ladder is simulated;
            there is no cash payout.
          </p>
        </aside>
      </section>
      <section className="home-details" aria-label="How the game works">
        <div>
          <h2>Choose your seat</h2>
          <p>Join with a session code and the name your group knows.</p>
        </div>
        <div>
          <h2>Play at one pace</h2>
          <p>Your host moves everyone through the same questions.</p>
        </div>
        <div>
          <h2>Keep answers private</h2>
          <p>See your own result at the end. Prize values are simulated, with no cash payout.</p>
        </div>
      </section>
      <footer className="site-footer">
        <span>Free to play</span>
        <span>Fifteen questions · Up to ten guests</span>
      </footer>
    </main>
  );
}
