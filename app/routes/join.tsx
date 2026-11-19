import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase.client";

type JoinedSession = { guestToken: string; guestId: string; guestName: string; hostName: string; code: string; guests: string[]; sessionId: string };
type GuestSessionView = { state: string; stateVersion: number; position?: number; deadlineAt?: string | null; hostName: string; guestName: string; guests: string[]; question?: { id: string; position: number; question_text: string; options: { id: string; label: string }[]; correct_option_id?: string; explanation?: string; prizeValueNgn: number } | null; ownAnswer?: string | null; isCorrect?: boolean; lifelines?: { type: string; position: number; result: { removedOptionIds?: string[]; suggestedOptionId?: string; enoughResponses?: boolean; counts?: Record<string, number> } }[]; result?: { correct_count: number; total_score_ngn: number; reached_prize_ngn: number; detail: { position: number; questionText: string; options: { id: string; label: string }[]; correctOptionId: string; selectedOptionId: string | null; isCorrect: boolean; answered: boolean; prizeValueNgn: number }[] } | null };

export default function Join() {
  const [params] = useSearchParams();
  const [joined, setJoined] = useState<JoinedSession | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<GuestSessionView | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshGuest(sessionId: string, guestToken: string) {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("hosted-game", { body: { action: "read_state", sessionId, guestToken } });
    if (!error && data?.session) setView(data.session as GuestSessionView);
  }

  useEffect(() => {
    const code = (params.get("code") ?? "").trim().toUpperCase();
    const guestToken = code && localStorage.getItem(`quiz-guest-${code}`);
    const sessionId = code && localStorage.getItem(`quiz-session-${code}`);
    if (!guestToken || !sessionId) return;
    const restore = window.setTimeout(() => {
      void (async () => {
        const { data, error } = await supabase?.functions.invoke("hosted-game", { body: { action: "reconnect", sessionId, guestToken } }) ?? {};
        if (error || !data?.guestToken) { setMessage(error?.message ?? "Could not reconnect to this session."); return; }
        localStorage.setItem(`quiz-guest-${code}`, data.guestToken);
        setJoined({ guestToken: data.guestToken, guestId: data.guestId, sessionId, guestName: "Guest", hostName: "Host", code, guests: [] });
      })();
    }, 0);
    return () => window.clearTimeout(restore);
  }, [params]);

  useEffect(() => {
    if (!joined || !supabase) return;
    const initialRefresh = window.setTimeout(() => void refreshGuest(joined.sessionId, joined.guestToken), 0);
    const channel = supabase.channel(`session:${joined.sessionId}`, { config: { broadcast: { self: false }, presence: { key: joined.guestId } } })
      .on("broadcast", { event: "state_changed" }, () => void refreshGuest(joined.sessionId, joined.guestToken))
      .subscribe((status) => { if (status === "SUBSCRIBED") void channel.track({ online: true }); });
    const timer = window.setInterval(() => void refreshGuest(joined.sessionId, joined.guestToken), 2500);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer); void supabase?.removeChannel(channel); };
  }, [joined]);

  async function join(form: FormData) {
    const code = String(form.get("code")).trim().toUpperCase();
    const displayName = String(form.get("display_name")).trim();
    if (!supabase) return setMessage("This game is not connected yet. Please try again later.");
    setBusy(true);
    let clientId = localStorage.getItem("quiz-join-client");
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem("quiz-join-client", clientId);
    }
    const { data, error } = await supabase.functions.invoke("hosted-game", { body: { action: "join", code, displayName, clientId } });
    if (error) setMessage(error.message);
    else {
      const value = data as JoinedSession;
      localStorage.setItem(`quiz-guest-${value.code}`, value.guestToken);
      localStorage.setItem(`quiz-session-${value.code}`, value.sessionId);
      setJoined(value);
      setMessage("");
    }
    setBusy(false);
  }

  async function guestCommand(action: string, extra: Record<string, unknown> = {}) {
    if (!supabase || !joined || !view) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("hosted-game", { body: {
      action, sessionId: joined.sessionId, guestToken: joined.guestToken,
      position: view.position, questionId: view.question?.id, ...extra,
    } });
    if (error) setMessage(error.message);
    else { setMessage(""); await refreshGuest(joined.sessionId, joined.guestToken); }
    setBusy(false);
  }

  return (
    <main className="page-shell guest-shell">
      <header className="site-header"><Link to="/" className="wordmark" aria-label="Literature Giant home"><span className="wordmark-mark" aria-hidden="true">LG</span><span>Literature Giant</span></Link><span className="eyebrow">Guest play</span></header>
      {!joined ? <section className="guest-join" aria-labelledby="join-title">
        <p className="eyebrow">Your seat is ready</p><h1 id="join-title">Join the session.</h1><p>Enter the code your host shared and choose the name your group will see.</p>
        <form className="panel form-panel" action={(data) => void join(data)}>
          <label>Session code<input name="code" defaultValue={params.get("code") ?? ""} autoComplete="off" maxLength={6} minLength={6} required autoCapitalize="characters" /></label>
          <label>Display name<input name="display_name" autoComplete="nickname" maxLength={24} required /></label>
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "Joining…" : "Join game"}</button>
          <p className="form-help">No account needed. Your answers stay private during play.</p>
        </form>
        {message && <p className="notice notice-error" role="alert">{message}</p>}
      </section> : <section className="guest-lobby" aria-labelledby="lobby-title">
        <p className="eyebrow">Session {joined.code}</p><h1 id="lobby-title">You’re in, {view?.guestName ?? joined.guestName}.</h1>
        {view?.state === "active_question" && view.question && <div className="panel game-panel">
          <p className="eyebrow">Question {view.position} · ₦{view.question.prizeValueNgn.toLocaleString()}</p><h2>{view.question.question_text}</h2>
          <div className="answer-options" role="group" aria-label="Answer choices">{view.question.options.filter((option) => !view.lifelines?.some((item) => item.position === view.position && item.type === "fifty_fifty" && item.result.removedOptionIds?.includes(option.id))).map((option) => <button key={option.id} className={`answer-option ${view.ownAnswer === option.id ? "is-selected" : ""}`} aria-pressed={view.ownAnswer === option.id} disabled={busy || Boolean(view.ownAnswer)} onClick={() => void guestCommand("submit_answer", { optionId: option.id })}><span>{option.label}</span>{view.ownAnswer === option.id ? <span className="answer-saved">Saved</span> : null}</button>)}</div>
          {!view.ownAnswer && <div className="lifeline-actions"><button className="button button-secondary" disabled={busy || Boolean(view.lifelines?.some((item) => item.type === "fifty_fifty"))} onClick={() => void guestCommand("use_lifeline", { type: "fifty_fifty" })}>50:50</button><button className="button button-secondary" disabled={busy || Boolean(view.lifelines?.some((item) => item.type === "phone_friend"))} onClick={() => void guestCommand("use_lifeline", { type: "phone_friend" })}>Phone a Friend</button><button className="button button-secondary" disabled={busy || Boolean(view.lifelines?.some((item) => item.type === "ask_audience"))} onClick={() => void guestCommand("use_lifeline", { type: "ask_audience" })}>Ask the Audience</button></div>}
          {view.lifelines?.filter((item) => item.position === view.position).map((item) => <p className="lifeline-result" key={item.type}>{item.type === "fifty_fifty" ? "Two incorrect options removed." : item.type === "phone_friend" ? `Phone a Friend suggests: ${view.question?.options.find((option) => option.id === item.result.suggestedOptionId)?.label ?? "an option"}.` : item.result.enoughResponses ? `Audience poll: ${view.question?.options.map((option) => `${option.label}: ${item.result.counts?.[option.id] ?? 0}`).join(" · ")}` : "There aren’t enough other answers for a poll yet."}</p>)}
          <p className="timer-readout" aria-live="off">{view.deadlineAt && now > 0 ? `${Math.max(0, Math.ceil((new Date(view.deadlineAt).getTime() - now) / 1000))} seconds remaining` : "Waiting for the timer"}</p><p className="form-help">Your answer stays private until everyone answers or time runs out.</p>
        </div>}
        {view?.state === "answer_reveal" && view.question && <div className="panel game-panel"><p className="eyebrow">Question {view.position} result</p><h2>{view.isCorrect ? "Correct answer" : "Not quite"}</h2><p>The correct answer is <strong>{view.question.options.find((option) => option.id === view.question?.correct_option_id)?.label}</strong>.</p><p>{view.question.explanation}</p><p>{view.isCorrect ? "Your answer was correct." : "Your answer was unanswered or incorrect."} Waiting for the host to advance.</p></div>}
        {view?.state === "completed" && view.result && <div className="panel game-panel"><p className="eyebrow">Your final result</p><h2>{view.result.correct_count} correct answers</h2><p>Total score: <strong>₦{view.result.total_score_ngn.toLocaleString()}</strong></p><p>Prize ladder reached: <strong>₦{view.result.reached_prize_ngn.toLocaleString()}</strong></p><ol className="result-list">{view.result.detail.map((item) => <li key={item.position}><strong>Q{item.position}:</strong> {item.isCorrect ? "Correct" : item.answered ? "Incorrect" : "Unanswered"}. Correct answer: {item.options.find((option) => option.id === item.correctOptionId)?.label}</li>)}</ol></div>}
        {(!view || view.state === "lobby" || view.state === "paused") && <div className="panel lobby-panel"><p className="host-line">Your host <strong>{view?.hostName ?? joined.hostName}</strong></p><h2>{view?.state === "paused" ? "The host is reconnecting" : "Waiting for the host to start"}</h2><p>You’ll see each question here when the game begins. Keep this page open.</p><ul className="guest-list">{(view?.guests ?? joined.guests).map((name) => <li key={name}>{name}</li>)}</ul></div>}
        {message && <p className="notice notice-error" role="alert">{message}</p>}
      </section>}
    </main>
  );
}
