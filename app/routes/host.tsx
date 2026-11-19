import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase.client";

type HostProfile = { display_name: string; status: "pending" | "approved" | "rejected" };
type SessionRow = { id: string; join_code: string; state: string; state_version: number; created_at: string };
type PendingHost = { user_id: string; display_name: string; created_at: string };
type BankQuestion = { id: string; category_slug: string; updated_at: string; question_text: string; difficulty: string; options: { id: string; label: string }[]; correct_option_id: string; explanation: string };
type PendingReport = { id: string; question_id: string; question_text?: string; reporter_id: string; reason: string; created_at: string };
type HostSessionView = { id: string; code: string; state: string; stateVersion: number; position: number; deadlineAt: string | null; timeLimitSeconds: number; hostName: string; guests: { id: string; display_name: string; connection_state: string }[]; question: BankQuestion | null; questions: { position: number; question_id: string }[]; answerCount: number };

export default function Host() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingHosts, setPendingHosts] = useState<PendingHost[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [timeLimit, setTimeLimit] = useState(30);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankPage, setBankPage] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [loadedSetupSessionId, setLoadedSetupSessionId] = useState<string | null>(null);
  const [orderedQuestionIds, setOrderedQuestionIds] = useState<string[]>([]);
  const [sessionView, setSessionView] = useState<HostSessionView | null>(null);
  const onlineGuestIds = useRef(new Set<string>());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;
    void supabase.from("host_profiles").select("display_name,status").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        setProfile(data);
      });
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) return;
    void supabase.from("project_admins").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(async ({ data }) => {
        setIsAdmin(Boolean(data));
        if (data) {
          const result = await supabase!.from("host_profiles").select("user_id,display_name,created_at").eq("status", "pending").order("created_at").limit(50);
          if (result.error) setMessage(result.error.message);
          setPendingHosts(result.data ?? []);
          const reports = await supabase!.from("question_reports").select("id,question_id,reporter_id,reason,created_at").eq("status", "pending").order("created_at").limit(100);
          if (reports.error) setMessage(reports.error.message);
          const reportQuestionIds = [...new Set((reports.data ?? []).map((report) => report.question_id))];
          const { data: reportedQuestions } = reportQuestionIds.length
            ? await supabase!.from("questions").select("id,current_version_id").in("id", reportQuestionIds)
            : { data: [] };
          const reportVersionIds = (reportedQuestions ?? []).map((question) => question.current_version_id).filter(Boolean) as string[];
          const { data: reportVersions } = reportVersionIds.length
            ? await supabase!.from("question_versions").select("id,question_text").in("id", reportVersionIds)
            : { data: [] };
          const questionTextById = new Map((reportedQuestions ?? []).map((question) => [question.id,
            reportVersions?.find((version) => version.id === question.current_version_id)?.question_text ?? "Question unavailable"]));
          setPendingReports((reports.data ?? []).map((report) => ({ ...report, question_text: questionTextById.get(report.question_id) })));
        }
      });
  }, [user]);

  useEffect(() => {
    if (!supabase || profile?.status !== "approved" || !user) return;
      void supabase.from("hosted_sessions").select("id,join_code,state,state_version,created_at").eq("host_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        setSessions(data ?? []);
      });
  }, [profile, user]);

  useEffect(() => {
    if (!supabase || profile?.status !== "approved") return;
    void (async () => {
      const { data: questions, error } = await supabase!.from("questions").select("id,category_slug,updated_at,current_version_id")
        .eq("active", true).order("category_slug").order("updated_at", { ascending: false }).limit(1000);
      if (error) { setMessage(error.message); return; }
      const versionIds = (questions ?? []).map((item) => item.current_version_id).filter(Boolean) as string[];
      if (!versionIds.length) { setBank([]); return; }
      const { data: versions, error: versionError } = await supabase!.from("question_versions")
        .select("id,question_text,difficulty,options,correct_option_id,explanation").in("id", versionIds);
      if (versionError) { setMessage(versionError.message); return; }
      const byId = new Map((versions ?? []).map((version) => [version.id, version]));
      setBank((questions ?? []).flatMap((item) => {
        const version = item.current_version_id ? byId.get(item.current_version_id) : null;
        return version ? [{ id: item.id, category_slug: item.category_slug, updated_at: item.updated_at, ...version } as BankQuestion] : [];
      }));
    })();
  }, [profile]);

  const matchingBank = bank.filter((question) => question.question_text.toLocaleLowerCase().includes(bankSearch.trim().toLocaleLowerCase()));
  const bankPageSize = 25;
  const visibleBank = matchingBank.slice(bankPage * bankPageSize, (bankPage + 1) * bankPageSize);

  useEffect(() => {
    if (!selectedSession || !supabase || !user) return;
    const refresh = async () => {
      const { data, error } = await supabase!.functions.invoke("hosted-game", { body: { action: "read_state", sessionId: selectedSession.id } });
      if (!error && data?.session) {
        setSessionView({ ...data.session, guests: data.session.guests.map((guest: HostSessionView["guests"][number]) => ({
          ...guest, connection_state: onlineGuestIds.current.has(guest.id) ? "connected" : "disconnected",
        })) });
        if (data.session.state === "lobby" && data.session.questions?.length && loadedSetupSessionId !== selectedSession.id) {
          setOrderedQuestionIds([...data.session.questions].sort((a: { position: number }, b: { position: number }) => a.position - b.position).map((item: { question_id: string }) => item.question_id));
          setLoadedSetupSessionId(selectedSession.id);
        }
        setSelectedSession((current) => current && (current.state !== data.session.state || current.state_version !== data.session.stateVersion)
          ? { ...current, state: data.session.state, state_version: data.session.stateVersion } : current);
      }
    };
    void refresh();
    const channel = supabase.channel(`session:${selectedSession.id}`, { config: { broadcast: { self: false }, presence: { key: `host:${user.id}` } } })
      .on("broadcast", { event: "state_changed" }, () => void refresh())
      .on("presence", { event: "sync" }, () => {
      onlineGuestIds.current = new Set(Object.keys(channel.presenceState()).filter((key) => !key.startsWith("host:")));
      setSessionView((current) => current ? { ...current, guests: current.guests.map((guest) => ({
        ...guest, connection_state: onlineGuestIds.current.has(guest.id) ? "connected" : "disconnected",
      })) } : current);
      });
    channel.subscribe((status) => { if (status === "SUBSCRIBED") void channel.track({ online: true }); });
    const timer = window.setInterval(() => void refresh(), 2500);
    const heartbeat = window.setInterval(() => {
      if (selectedSession.state !== "completed") void supabase!.functions.invoke("hosted-game", { body: { action: "heartbeat", sessionId: selectedSession.id } });
    }, 10000);
    return () => { window.clearInterval(timer); window.clearInterval(heartbeat); void supabase?.removeChannel(channel); };
  }, [selectedSession, user, loadedSetupSessionId]);

  async function signIn(form: FormData) {
    if (!supabase) return setMessage("Connect the Supabase URL and public key to continue.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    setMessage(error?.message ?? "Signed in.");
    setBusy(false);
  }

  async function signUp(form: FormData) {
    if (!supabase) return setMessage("Connect the Supabase URL and public key to continue.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: String(form.get("email")), password: String(form.get("password")) });
    if (error) setMessage(error.message);
    else if (data.session) {
      const result = await supabase.rpc("request_host_access", { p_display_name: String(form.get("display_name")) });
      setMessage(result.error?.message ?? "Your host request is waiting for administrator review.");
      if (!result.error) setProfile(result.data);
    } else setMessage("Check your email to confirm your account, then sign in and request host access.");
    setBusy(false);
  }

  async function requestAccess(form: FormData) {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("request_host_access", { p_display_name: String(form.get("display_name")) });
    setMessage(error?.message ?? "Your request is waiting for administrator review.");
    if (!error) setProfile(data);
    setBusy(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
    setSessions([]);
  }

  async function reviewHost(userId: string, status: "approved" | "rejected") {
    if (!supabase) return;
    const { error } = await supabase.rpc("admin_set_host_status", { p_user_id: userId, p_status: status });
    setMessage(error?.message ?? `Host request ${status}.`);
    if (!error) setPendingHosts((items) => items.filter((item) => item.user_id !== userId));
  }

  async function createSession() {
    if (!supabase) return;
    setBusy(true);
      const { data, error } = await supabase.functions.invoke("hosted-game", { body: { action: "create_session", timeLimitSeconds: timeLimit } });
    setMessage(error?.message ?? "Session created. Add 15 questions before you start.");
    if (!error && data) { setSessions((items) => [data as SessionRow, ...items]); setSelectedSession(data as SessionRow); setOrderedQuestionIds([]); setLoadedSetupSessionId(data.id); }
    setBusy(false);
  }

  async function hostAction(action: string, extra: Record<string, unknown> = {}) {
    if (!supabase || !selectedSession) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("hosted-game", { body: {
      action, sessionId: selectedSession.id, expectedVersion: selectedSession.state_version, ...extra,
    } });
    setMessage(error?.message ?? "Session updated.");
    if (!error && action === "configure_session" && data?.data) { setSelectedSession((current) => current ? { ...current, state_version: data.data } : current); setLoadedSetupSessionId(selectedSession.id); }
    if (!error && action === "delete_session") {
      setSessions((items) => items.filter((item) => item.id !== selectedSession.id));
      setSelectedSession(null);
      setSessionView(null);
      setBusy(false);
      return;
    }
    if (!error) {
      const { data: row } = await supabase.from("hosted_sessions").select("id,join_code,state,state_version,created_at").eq("id", selectedSession.id).maybeSingle();
      if (row) setSelectedSession(row as SessionRow);
    }
    setBusy(false);
  }

  async function saveQuestion(form: FormData) {
    if (!supabase) return;
    setBusy(true);
    const optionLabels = ["a", "b", "c", "d"].map((key) => String(form.get(`option_${key}`)).trim());
    const { error } = await supabase.functions.invoke("hosted-game", { body: {
      action: "save_question", questionId: editingQuestion?.id, categorySlug: String(form.get("category")), questionText: String(form.get("question_text")),
      options: optionLabels.map((label, index) => ({ id: ["a", "b", "c", "d"][index], label })),
      correctOptionId: String(form.get("correct")), difficulty: String(form.get("difficulty")), explanation: String(form.get("explanation")),
    } });
    setMessage(error?.message ?? "Question added to the shared bank.");
    if (!error) { const formElement = document.getElementById("question-form") as HTMLFormElement | null; formElement?.reset(); setEditingQuestion(null); }
    setBusy(false);
    if (!error) {
      const { data: questions } = await supabase.from("questions").select("id,category_slug,updated_at,current_version_id")
        .eq("active", true).order("category_slug").order("updated_at", { ascending: false }).limit(1000);
      const ids = (questions ?? []).map((item) => item.current_version_id).filter(Boolean) as string[];
      const { data: versions } = ids.length ? await supabase.from("question_versions")
        .select("id,question_text,difficulty,options,correct_option_id,explanation").in("id", ids) : { data: [] };
      const byId = new Map((versions ?? []).map((version) => [version.id, version]));
      setBank((questions ?? []).flatMap((item) => {
        const version = item.current_version_id ? byId.get(item.current_version_id) : null;
        return version ? [{ id: item.id, category_slug: item.category_slug, updated_at: item.updated_at, ...version } as BankQuestion] : [];
      }));
      setBankPage(0);
    }
  }

  return (
    <main className="page-shell host-shell">
      <header className="site-header"><Link to="/" className="wordmark" aria-label="Literature Giant home"><span className="wordmark-mark" aria-hidden="true">LG</span><span>Literature Giant</span></Link><Link to="/" className="text-link">Guest home</Link></header>
      <section className="workspace-heading"><p className="eyebrow">Host workspace</p><h1>{profile?.status === "approved" ? "Your sessions" : "Bring your group into the game."}</h1><p>Build a question set, share a code, and guide the room.</p></section>
      {!supabase && <p className="notice notice-error" role="alert">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the local environment.</p>}
      {message && <p className="notice" role="status">{message}</p>}
      {!user && <div className="auth-grid">
        <form className="panel form-panel" action={(data) => void signIn(data)}>
          <p className="eyebrow">Approved host</p><h2>Sign in</h2><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="button button-primary" disabled={busy}>Sign in</button>
        </form>
        <form className="panel form-panel" action={(data) => void signUp(data)}>
          <p className="eyebrow">New host</p><h2>Request host access</h2><label>Display name<input name="display_name" autoComplete="name" maxLength={48} required /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><button className="button button-primary" disabled={busy}>Create account</button><p className="form-help">An administrator reviews every host request.</p>
        </form>
      </div>}
      {user && !profile && <form className="panel form-panel narrow-panel" action={(data) => void requestAccess(data)}><h2>Request host access</h2><p>Your account is ready. Add a display name to request approval.</p><label>Display name<input name="display_name" autoComplete="name" maxLength={48} required /></label><button className="button button-primary" disabled={busy}>Send request</button></form>}
      {profile?.status === "pending" && <section className="panel status-panel"><p className="status-mark">Request received</p><h2>You are in the host review queue.</h2><p>You can return here after an administrator approves your account.</p><button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></section>}
      {profile?.status === "rejected" && <section className="panel status-panel"><p className="status-mark">Host access</p><h2>Your request was not approved.</h2><p>Contact the project administrator if you think this is a mistake.</p><button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></section>}
      {profile?.status === "approved" && <section className="panel sessions-panel"><div className="section-heading"><div><p className="eyebrow">Approved host</p><h2>Recent sessions</h2></div><div className="create-session"><label htmlFor="session-time-limit">Time per question</label><select id="session-time-limit" value={timeLimit} onChange={(event) => setTimeLimit(Number(event.currentTarget.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select><button className="button button-primary" onClick={() => void createSession()} disabled={busy}>Create a session</button></div></div>
        {sessions.length ? <ul className="session-list">{sessions.map((session) => <li key={session.id}><button className="session-code" onClick={() => { setSelectedSession(session); setLoadedSetupSessionId(null); }}>{session.join_code}</button><span>{session.state.replaceAll("_", " ")}</span><time>{new Date(session.created_at).toLocaleDateString()}</time></li>)}</ul> : <p className="empty-state">No sessions yet. Your first session will appear here.</p>}
        <button className="text-button" onClick={() => void signOut()}>Sign out</button>
      </section>}
      {profile?.status === "approved" && selectedSession && <section className="panel live-session-panel">
        <div className="section-heading"><div><p className="eyebrow">Session lobby</p><h2>Join code <span className="session-code">{selectedSession.join_code}</span></h2></div><Link className="text-link" to={`/join?code=${selectedSession.join_code}`}>Open guest join page</Link></div>
        <p className="form-help">Share this code with up to 10 guests. New guests can join until you start.</p>
        <ul className="guest-list">{(sessionView?.guests ?? []).map((guest) => <li key={guest.id}>{guest.display_name}<small className="guest-connection">{guest.connection_state}</small></li>)}</ul>
        {selectedSession.state === "lobby" && <>
          <div className="ordered-questions"><h3>Question order · {orderedQuestionIds.length}/15</h3><ol>{orderedQuestionIds.map((id) => { const item = bank.find((question) => question.id === id); return <li key={id}>{item?.question_text ?? "Question"}<button className="text-button" onClick={() => setOrderedQuestionIds((ids) => ids.filter((value) => value !== id))}>Remove</button></li>; })}</ol></div>
          <div className="bank-picker"><h3>Choose from the shared bank</h3>{bank.map((question) => <button key={question.id} className="bank-pick" disabled={orderedQuestionIds.includes(question.id) || orderedQuestionIds.length >= 15} onClick={() => setOrderedQuestionIds((ids) => [...ids, question.id])}><span>{question.question_text}</span><small>{question.category_slug} · {question.difficulty}</small></button>)}</div>
          <button className="button button-primary" disabled={busy || orderedQuestionIds.length !== 15 || !(sessionView?.guests?.length)} onClick={() => void hostAction("configure_session", { questionIds: orderedQuestionIds, timeLimitSeconds: timeLimit })}>Save 15 questions and order</button>
          <button className="button button-primary" disabled={busy || !sessionView?.questions?.length || !(sessionView?.guests?.length)} onClick={() => void hostAction("start_session")}>Start session</button>
          <button className="button button-secondary" disabled={busy} onClick={() => void hostAction("end_session")}>End this session</button>
        </>}
        {selectedSession.state === "active_question" && <div className="session-control"><p className="eyebrow">Question {sessionView?.position} of 15</p><h3>{sessionView?.question?.question_text ?? "Loading question…"}</h3><p>{sessionView?.answerCount ?? 0} of {sessionView?.guests?.length ?? 0} guests answered</p><p className="timer-readout">{sessionView?.deadlineAt && now > 0 ? `${Math.max(0, Math.ceil((new Date(sessionView.deadlineAt).getTime() - now) / 1000))} seconds remaining` : "Timer loading"}</p><div className="admin-actions"><button className="button button-secondary" disabled={busy} onClick={() => void hostAction("pause_session")}>Pause</button><button className="button button-secondary" disabled={busy} onClick={() => void hostAction("end_session")}>End session</button></div></div>}
        {selectedSession.state === "paused" && <div className="session-control"><p>The session is paused. Resume within 30 minutes to continue with remaining time.</p><button className="button button-primary" disabled={busy} onClick={() => void hostAction("resume_session")}>Resume session</button><button className="button button-secondary" disabled={busy} onClick={() => void hostAction("end_session")}>End session</button></div>}
        {selectedSession.state === "answer_reveal" && <div className="session-control"><p className="eyebrow">Question {sessionView?.position} reveal</p><h3>Correct answer: {sessionView?.question?.options?.find((option: { id: string; label: string }) => option.id === sessionView?.question?.correct_option_id)?.label}</h3><p>{sessionView?.answerCount ?? 0} guests answered</p><button className="button button-primary" disabled={busy} onClick={() => void hostAction("advance_session")}>{sessionView?.position === 15 ? "Finish session" : "Advance everyone"}</button><button className="button button-secondary" disabled={busy} onClick={() => void hostAction("end_session")}>End early</button></div>}
        {selectedSession.state === "completed" && <div className="session-control"><h3>Session complete</h3><p>Guests can still view their private results. Delete this session and its guest data when ready.</p><button className="button button-secondary" disabled={busy} onClick={() => void hostAction("delete_session")}>Delete session</button></div>}
      </section>}
      {profile?.status === "approved" && <section className="panel bank-panel"><div className="section-heading"><div><p className="eyebrow">Shared question bank</p><h2>{editingQuestion ? "Edit question" : "Add a question"}</h2></div></div>
        <form key={editingQuestion?.id ?? "new-question"} id="question-form" className="question-form" action={(form) => void saveQuestion(form)}>
          <label>Question text<textarea name="question_text" maxLength={1000} defaultValue={editingQuestion?.question_text ?? ""} required /></label>
          <div className="form-row"><label>Category<select name="category" defaultValue={editingQuestion?.category_slug ?? "english"}><option value="english">English</option><option value="economics">Economics</option><option value="literature">Literature</option><option value="government">Government</option></select></label><label>Difficulty<select name="difficulty" defaultValue={editingQuestion?.difficulty ?? "easy"}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label></div>
          {(["a", "b", "c", "d"] as const).map((key, index) => <label key={key}>Option {String.fromCharCode(65 + index)}<input name={`option_${key}`} maxLength={300} defaultValue={editingQuestion?.options[index]?.label ?? ""} required /></label>)}
          <label>Correct option<select name="correct" defaultValue={editingQuestion?.correct_option_id ?? "a"}><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></label><label>Explanation<textarea name="explanation" maxLength={2000} defaultValue={editingQuestion?.explanation ?? ""} /></label>
          <button className="button button-primary" disabled={busy}>{editingQuestion ? "Save new version" : "Add to shared bank"}</button>{editingQuestion && <button type="button" className="button button-secondary" onClick={() => setEditingQuestion(null)}>Cancel edit</button>}
        </form>
        <h3>Active questions · {matchingBank.length}</h3><label className="bank-search">Search questions<input value={bankSearch} onChange={(event) => { setBankSearch(event.currentTarget.value); setBankPage(0); }} placeholder="Search question text" /></label><ul className="bank-list">{visibleBank.map((question) => <li key={question.id}><div><strong>{question.question_text}</strong><small>{question.category_slug} · {question.difficulty}</small></div><div className="admin-actions"><button className="text-button" onClick={() => setEditingQuestion(question)}>Edit</button><button className="text-button" onClick={() => void supabase?.functions.invoke("hosted-game", { body: { action: "deactivate_question", questionId: question.id } }).then(({ error }) => { setMessage(error?.message ?? "Question removed from future sessions."); if (!error) setBank((items) => items.filter((item) => item.id !== question.id)); })}>Deactivate</button><button className="text-button" onClick={() => { const reason = window.prompt("Why are you reporting this question?"); if (reason?.trim()) void supabase?.functions.invoke("hosted-game", { body: { action: "report_question", questionId: question.id, reason } }).then(({ error }) => setMessage(error?.message ?? "Question reported to the administrator.")); }}>Report</button></div></li>)}</ul>
        {matchingBank.length > bankPageSize && <div className="pagination-controls"><button className="button button-secondary" disabled={bankPage === 0} onClick={() => setBankPage((page) => page - 1)}>Previous</button><span>Page {bankPage + 1} of {Math.ceil(matchingBank.length / bankPageSize)}</span><button className="button button-secondary" disabled={(bankPage + 1) * bankPageSize >= matchingBank.length} onClick={() => setBankPage((page) => page + 1)}>Next</button></div>}
      </section>}
      {isAdmin && <section className="panel sessions-panel"><div className="section-heading"><div><p className="eyebrow">Administrator</p><h2>Host requests</h2></div></div>
        {pendingHosts.length ? <ul className="admin-list">{pendingHosts.map((host) => <li key={host.user_id}><div><strong>{host.display_name}</strong><small>{host.user_id}</small></div><div className="admin-actions"><button className="button button-primary" onClick={() => void reviewHost(host.user_id, "approved")}>Approve</button><button className="button button-secondary" onClick={() => void reviewHost(host.user_id, "rejected")}>Reject</button></div></li>)}</ul> : <p className="empty-state">No host requests are waiting for review.</p>}
      </section>}
      {isAdmin && <section className="panel sessions-panel"><div className="section-heading"><div><p className="eyebrow">Question moderation</p><h2>Reported questions</h2></div></div>
        {pendingReports.length ? <ul className="admin-list">{pendingReports.map((report) => <li key={report.id}><div><strong>{report.question_text ?? report.question_id}</strong><p>{report.reason}</p><small>Reported {new Date(report.created_at).toLocaleDateString()}</small></div><div className="admin-actions"><button className="button button-primary" onClick={() => void supabase?.functions.invoke("hosted-game", { body: { action: "resolve_report", reportId: report.id, deactivate: true } }).then(({ error }) => { setMessage(error?.message ?? "Question deactivated and report resolved."); if (!error) setPendingReports((items) => items.filter((item) => item.id !== report.id)); })}>Deactivate and resolve</button><button className="button button-secondary" onClick={() => void supabase?.functions.invoke("hosted-game", { body: { action: "resolve_report", reportId: report.id, deactivate: false } }).then(({ error }) => { setMessage(error?.message ?? "Report resolved."); if (!error) setPendingReports((items) => items.filter((item) => item.id !== report.id)); })}>Resolve</button></div></li>)}</ul> : <p className="empty-state">No question reports need review.</p>}
      </section>}
    </main>
  );
}
