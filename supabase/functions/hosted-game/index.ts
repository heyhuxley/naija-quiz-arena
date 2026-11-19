import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

const projectUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false } });
const authClient = createClient(projectUrl, publishableKey, { auth: { persistSession: false } });

async function broadcastSessionChange(sessionId: string) {
  const channel = admin.channel(`session:${sessionId}`, { config: { broadcast: { self: false } } });
  try {
    await channel.send({ type: "broadcast", event: "state_changed", payload: { sessionId } });
  } catch {
    // Saved state remains authoritative if the realtime broadcast is unavailable.
  } finally {
    await admin.removeChannel(channel);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function join(request: Request, body: Record<string, unknown>) {
  const code = String(body.code ?? "")
    .trim()
    .toUpperCase();
  const displayName = String(body.displayName ?? "").trim();
  const clientId = String(body.clientId ?? "");
  if (!/^[A-Z0-9]{6}$/.test(code))
    return json({ error: "Enter a valid six character session code." }, 400);
  if (displayName.length < 1 || displayName.length > 24 || !clientId)
    return json({ error: "Enter a display name to join." }, 400);
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const attemptKey = await hmacSha256(serviceKey, `${ip}:${clientId}:${code}`);
  const guestToken = randomToken();
  const { data, error } = await admin.rpc("join_hosted_session", {
    p_code: code,
    p_display_name: displayName,
    p_token_hash: await sha256(guestToken),
    p_attempt_key: attemptKey,
  });
  if (error) return json({ error: "The session could not be joined. Try again." }, 400);
  if (data?.error === "join_blocked")
    return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  if (data?.error === "name_unavailable")
    return json({ error: "That display name is already in this session." }, 409);
  if (data?.error)
    return json({ error: "This session is unavailable or has already started." }, 404);
  return json({
    guestToken,
    guestId: data.guest_id,
    guestName: displayName,
    hostName: data.host_name,
    code,
    guests: data.guest_names,
    sessionId: data.session_id,
  });
}

async function reconnect(body: Record<string, unknown>) {
  const oldToken = String(body.guestToken ?? "");
  const sessionId = String(body.sessionId ?? "");
  if (!oldToken || !sessionId)
    return json({ error: "Guest reconnect credential is required." }, 401);
  const guestToken = randomToken();
  const { data, error } = await admin.rpc("guest_reconnect", {
    p_session_id: sessionId,
    p_old_token_hash: await sha256(oldToken),
    p_new_token_hash: await sha256(guestToken),
  });
  if (error || !data?.[0] || data[0].session_id !== sessionId)
    return json({ error: "Guest reconnect token is invalid." }, 401);
  return json({ guestToken, guestId: data[0].guest_id, sessionId });
}

async function createSession(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in as an approved host." }, 401);
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your host session has expired." }, 401);
  const { data: host } = await admin
    .from("host_profiles")
    .select("status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (host?.status !== "approved") return json({ error: "Approved host access is required." }, 403);

  const body = await request.json();
  const timeLimit = Number(body.timeLimitSeconds);
  if (![15, 30, 60].includes(timeLimit))
    return json({ error: "Choose 15, 30, or 60 seconds." }, 400);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (value) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value % 32],
    ).join("");
    const { data, error } = await admin
      .from("hosted_sessions")
      .insert({ host_id: auth.user.id, join_code: code, question_time_limit_seconds: timeLimit })
      .select("id,join_code,state,state_version,question_time_limit_seconds")
      .single();
    if (!error) return json(data, 201);
    if (error.code !== "23505") return json({ error: "A session could not be created." }, 500);
  }
  return json({ error: "A unique session code could not be generated. Please retry." }, 503);
}

async function hostRpc(
  request: Request,
  body: Record<string, unknown>,
  rpc: string,
  fields: Record<string, unknown>,
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in as an approved host." }, 401);
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your host session has expired." }, 401);
  const { data: host } = await admin
    .from("host_profiles")
    .select("status")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (host?.status !== "approved") return json({ error: "Approved host access is required." }, 403);
  const { data, error } = await admin.rpc(rpc, { p_host_id: auth.user.id, ...fields });
  if (error) return json({ error: error.message }, error.code === "40001" ? 409 : 400);
  if (body.sessionId && body.action !== "heartbeat")
    await broadcastSessionChange(String(body.sessionId));
  return json({ data, sessionId: body.sessionId });
}

async function adminRpc(
  request: Request,
  body: Record<string, unknown>,
  rpc: string,
  fields: Record<string, unknown>,
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in as a project administrator." }, 401);
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user)
    return json({ error: "Your administrator session has expired." }, 401);
  const { data: role } = await admin
    .from("project_admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!role) return json({ error: "Project administrator access is required." }, 403);
  const { data, error } = await admin.rpc(rpc, { p_admin_id: auth.user.id, ...fields });
  if (error) return json({ error: error.message }, 400);
  if (body.sessionId) await broadcastSessionChange(String(body.sessionId));
  return json({ data });
}

async function gameCommand(request: Request, body: Record<string, unknown>) {
  const sessionId = String(body.sessionId ?? "");
  if (
    !sessionId &&
    !["save_question", "deactivate_question", "report_question", "resolve_report"].includes(
      String(body.action),
    )
  )
    return json({ error: "Session ID is required." }, 400);
  switch (body.action) {
    case "save_question":
      return await hostRpc(request, body, "host_upsert_question", {
        p_question_id: body.questionId || null,
        p_category_slug: body.categorySlug,
        p_question_text: body.questionText,
        p_options: body.options,
        p_correct_option_id: body.correctOptionId,
        p_difficulty: body.difficulty,
        p_explanation: body.explanation,
      });
    case "deactivate_question":
      return await hostRpc(request, body, "host_set_question_active", {
        p_question_id: body.questionId,
        p_active: false,
      });
    case "report_question":
      return await hostRpc(request, body, "host_report_question", {
        p_question_id: body.questionId,
        p_reason: body.reason,
      });
    case "resolve_report":
      return await adminRpc(request, body, "admin_resolve_question_report", {
        p_report_id: body.reportId,
        p_deactivate: Boolean(body.deactivate),
      });
    case "configure_session":
      return await hostRpc(request, body, "host_configure_session", {
        p_session_id: sessionId,
        p_expected_version: Number(body.expectedVersion),
        p_question_ids: body.questionIds,
        p_time_limit_seconds: Number(body.timeLimitSeconds),
      });
    case "start_session":
      return await hostRpc(request, body, "host_start_session", {
        p_session_id: sessionId,
        p_expected_version: Number(body.expectedVersion),
      });
    case "heartbeat":
      return await hostRpc(request, body, "host_heartbeat", { p_session_id: sessionId });
    case "advance_session":
      return await hostRpc(request, body, "host_advance_session", {
        p_session_id: sessionId,
        p_expected_version: Number(body.expectedVersion),
      });
    case "pause_session":
    case "resume_session":
    case "end_session": {
      const action = String(body.action);
      const rpc =
        action === "pause_session"
          ? "host_pause_session"
          : action === "resume_session"
            ? "host_resume_session"
            : "host_end_session";
      return await hostRpc(request, body, rpc, {
        p_session_id: sessionId,
        p_expected_version: Number(body.expectedVersion),
      });
    }
    case "delete_session":
      return await hostRpc(request, body, "host_delete_session", { p_session_id: sessionId });
    case "use_lifeline": {
      const guestToken = String(body.guestToken ?? "");
      if (!guestToken) return json({ error: "Guest reconnect credential is required." }, 401);
      const { data, error } = await admin.rpc("guest_use_lifeline", {
        p_token_hash: await sha256(guestToken),
        p_session_id: sessionId,
        p_position: Number(body.position),
        p_question_id: String(body.questionId),
        p_type: String(body.type),
      });
      if (error) return json({ error: error.message }, error.code === "40001" ? 409 : 400);
      await broadcastSessionChange(sessionId);
      return json(data);
    }
    case "submit_answer": {
      const guestToken = String(body.guestToken ?? "");
      if (!guestToken) return json({ error: "Guest reconnect credential is required." }, 401);
      const { data, error } = await admin.rpc("guest_submit_answer", {
        p_token_hash: await sha256(guestToken),
        p_session_id: sessionId,
        p_position: Number(body.position),
        p_question_id: String(body.questionId),
        p_option_id: String(body.optionId),
      });
      if (error) return json({ error: error.message }, error.code === "40001" ? 409 : 400);
      await broadcastSessionChange(sessionId);
      return json(data);
    }
    default:
      return json({ error: "Unknown game action." }, 400);
  }
}

async function readState(request: Request, body: Record<string, unknown>) {
  const sessionId = String(body.sessionId ?? "");
  if (!sessionId) return json({ error: "Session ID is required." }, 400);
  const { data: session, error: sessionError } = await admin
    .from("hosted_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError || !session) return json({ error: "Session not found." }, 404);
  const authToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let isHost = false;
  if (authToken) {
    const { data: auth } = await authClient.auth.getUser(authToken);
    if (auth.user?.id === session.host_id) {
      const { data: profile } = await admin
        .from("host_profiles")
        .select("status,display_name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (profile?.status !== "approved")
        return json({ error: "Approved host access is required." }, 403);
      isHost = true;
    }
  }
  let guestId: string | null = null;
  const guestToken = String(body.guestToken ?? "");
  if (!isHost && guestToken) {
    const { data: guest } = await admin
      .from("session_guests")
      .select("id,display_name")
      .eq("session_id", sessionId)
      .eq("reconnect_token_hash", await sha256(guestToken))
      .maybeSingle();
    guestId = guest?.id ?? null;
    if (!guestId) return json({ error: "Guest reconnect token is invalid." }, 401);
  }
  if (!isHost && !guestId) return json({ error: "Session credentials are required." }, 401);
  const [{ data: hostProfile }, { data: guests }, { data: selected }] = await Promise.all([
    admin.from("host_profiles").select("display_name").eq("user_id", session.host_id).maybeSingle(),
    admin
      .from("session_guests")
      .select("id,display_name,connection_state,joined_at")
      .eq("session_id", sessionId)
      .order("joined_at"),
    admin
      .from("session_questions")
      .select("position,question_id,question_version_id,prize_value_ngn")
      .eq("session_id", sessionId)
      .order("position"),
  ]);
  const questionAt = (selected ?? []).find(
    (question) => question.position === session.current_position,
  );
  let question: Record<string, unknown> | null = null;
  if (questionAt) {
    const versionQuery = questionAt.question_version_id
      ? admin
          .from("question_versions")
          .select("question_text,options,correct_option_id,explanation")
          .eq("id", questionAt.question_version_id)
          .maybeSingle()
      : admin
          .from("questions")
          .select("current_version_id")
          .eq("id", questionAt.question_id)
          .maybeSingle();
    const { data: version } = await versionQuery;
    const versionId = questionAt.question_version_id ?? version?.current_version_id;
    let details: Record<string, unknown> | null = questionAt.question_version_id ? version : null;
    if (!details && versionId) {
      const { data } = await admin
        .from("question_versions")
        .select("question_text,options,correct_option_id,explanation")
        .eq("id", versionId)
        .maybeSingle();
      details = data;
    }
    if (details)
      question = {
        ...details,
        id: questionAt.question_id,
        position: questionAt.position,
        prizeValueNgn: questionAt.prize_value_ngn,
      };
  }
  if (isHost) {
    const { count } = await admin
      .from("session_answers")
      .select("guest_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("position", session.current_position)
      .not("submitted_at", "is", null);
    const hostQuestion = question ? { ...question } : null;
    if (hostQuestion && session.state !== "answer_reveal" && session.state !== "completed") {
      delete hostQuestion.correct_option_id;
      delete hostQuestion.explanation;
    }
    return json({
      session: {
        id: session.id,
        code: session.join_code,
        state: session.state,
        stateVersion: session.state_version,
        position: session.current_position,
        deadlineAt: session.deadline_at,
        timeLimitSeconds: session.question_time_limit_seconds,
        hostName: hostProfile?.display_name,
        guests: guests ?? [],
        question: hostQuestion,
        questions: selected ?? [],
        answerCount: count ?? 0,
      },
    });
  }
  const own = (guests ?? []).find((guest) => guest.id === guestId);
  const [{ data: answer }, { data: lifelines }, { data: result }] = await Promise.all([
    admin
      .from("session_answers")
      .select("selected_option_id,is_correct,submitted_at")
      .eq("guest_id", guestId)
      .eq("position", session.current_position)
      .maybeSingle(),
    admin
      .from("session_lifelines")
      .select("type,position,result")
      .eq("guest_id", guestId)
      .eq("session_id", sessionId),
    admin
      .from("session_results")
      .select("correct_count,total_score_ngn,reached_prize_ngn,detail")
      .eq("guest_id", guestId)
      .maybeSingle(),
  ]);
  const guestQuestion = question ? { ...question } : null;
  if (guestQuestion && session.state !== "answer_reveal" && session.state !== "completed") {
    delete guestQuestion.correct_option_id;
    delete guestQuestion.explanation;
  }
  if (session.state === "completed")
    return json({
      session: {
        state: session.state,
        hostName: hostProfile?.display_name,
        guestName: own?.display_name,
        guests: (guests ?? []).map(({ display_name }) => display_name),
        result,
      },
    });
  if (session.state === "answer_reveal")
    return json({
      session: {
        state: session.state,
        position: session.current_position,
        stateVersion: session.state_version,
        hostName: hostProfile?.display_name,
        guestName: own?.display_name,
        guests: (guests ?? []).map(({ display_name }) => display_name),
        question: guestQuestion,
        ownAnswer: answer?.selected_option_id ?? null,
        isCorrect: answer?.is_correct ?? false,
      },
    });
  return json({
    session: {
      id: session.id,
      state: session.state,
      stateVersion: session.state_version,
      position: session.current_position,
      deadlineAt: session.deadline_at,
      hostName: hostProfile?.display_name,
      guestName: own?.display_name,
      guests: (guests ?? []).map(({ display_name }) => display_name),
      question: session.state === "active_question" ? guestQuestion : null,
      ownAnswer: answer?.selected_option_id ?? null,
      lifelines: lifelines ?? [],
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    if (body.action === "join") return await join(request, body);
    if (body.action === "reconnect") return await reconnect(body);
    if (body.action === "create_session") return await createSession(request);
    if (body.action === "read_state") return await readState(request, body);
    if (
      [
        "save_question",
        "deactivate_question",
        "report_question",
        "resolve_report",
        "configure_session",
        "start_session",
        "heartbeat",
        "advance_session",
        "pause_session",
        "resume_session",
        "end_session",
        "delete_session",
        "submit_answer",
        "use_lifeline",
      ].includes(String(body.action))
    )
      return await gameCommand(request, body);
    return json({ error: "Unknown action." }, 400);
  } catch {
    return json({ error: "The request could not be completed." }, 500);
  }
});
