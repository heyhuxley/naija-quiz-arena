-- Trusted commands are invoked by the hosted-game Edge Function only.
alter table public.hosted_sessions add column paused_from_state public.hosted_session_state
  check (paused_from_state in ('active_question', 'answer_reveal'));

create policy "admins can read all question records" on public.questions for select to authenticated
using (exists (select 1 from public.project_admins a where a.user_id = auth.uid()));
create policy "admins can read all question versions" on public.question_versions for select to authenticated
using (exists (select 1 from public.project_admins a where a.user_id = auth.uid()));

create or replace function public.host_upsert_question(
  p_host_id uuid, p_question_id uuid, p_category_slug text, p_question_text text,
  p_options jsonb, p_correct_option_id text, p_difficulty public.question_difficulty,
  p_explanation text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare qid uuid; next_version integer; version_id uuid;
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.question_categories c where c.slug = p_category_slug)
    or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) <> 4
    or char_length(trim(p_question_text)) not between 1 and 1000 or char_length(p_explanation) > 2000 then
    raise exception 'invalid_question';
  end if;
  if p_question_id is null then
    insert into public.questions(category_slug, created_by) values (p_category_slug, p_host_id) returning id into qid;
    next_version := 1;
  else
    select q.id into qid from public.questions q where q.id = p_question_id for update;
    if qid is null then raise exception 'question_not_found'; end if;
    select coalesce(max(v.version_number), 0) + 1 into next_version from public.question_versions v where v.question_id = qid;
    update public.questions set category_slug = p_category_slug, updated_at = now() where id = qid;
  end if;
  insert into public.question_versions(question_id, version_number, question_text, options, correct_option_id, difficulty, explanation, created_by)
  values (qid, next_version, trim(p_question_text), p_options, p_correct_option_id, p_difficulty, p_explanation, p_host_id)
  returning id into version_id;
  update public.questions set current_version_id = version_id, updated_at = now() where id = qid;
  return qid;
end;
$$;

create or replace function public.host_configure_session(
  p_host_id uuid, p_session_id uuid, p_expected_version bigint,
  p_question_ids uuid[], p_time_limit_seconds integer
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  if p_time_limit_seconds not in (15, 30, 60) or cardinality(p_question_ids) <> 15
    or (select count(distinct x) from unnest(p_question_ids) x) <> 15 then raise exception 'invalid_question_set'; end if;
  perform 1 from public.hosted_sessions s where s.id = p_session_id and s.host_id = p_host_id
    and s.state = 'lobby' and s.state_version = p_expected_version for update;
  if not found then raise exception 'stale_session_action' using errcode = '40001'; end if;
  if exists (select 1 from unnest(p_question_ids) x left join public.questions q on q.id = x where q.id is null or not q.active) then
    raise exception 'inactive_or_missing_question';
  end if;
  delete from public.session_questions where session_id = p_session_id;
  insert into public.session_questions(session_id, position, question_id, prize_value_ngn)
  select p_session_id, picked.ordinality::smallint, picked.question_id, ladder.prize
  from unnest(p_question_ids) with ordinality as picked(question_id, ordinality)
  join unnest(array[1000,2500,5000,10000,15000,25000,40000,60000,80000,100000,150000,200000,250000,350000,500000])
    with ordinality as ladder(prize, ordinality) using (ordinality);
  update public.hosted_sessions set question_time_limit_seconds = p_time_limit_seconds,
    state_version = state_version + 1 where id = p_session_id returning state_version into new_version;
  return new_version;
end;
$$;

create or replace function public.host_set_question_active(p_host_id uuid, p_question_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  update public.questions set active = p_active, updated_at = now() where id = p_question_id;
  if not found then raise exception 'question_not_found'; end if;
end;
$$;

create or replace function public.host_report_question(p_host_id uuid, p_question_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare report_id uuid;
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) not between 1 and 500 then raise exception 'invalid_report_reason'; end if;
  insert into public.question_reports(question_id, reporter_id, reason)
  select p_question_id, p_host_id, trim(p_reason) where exists (select 1 from public.questions q where q.id = p_question_id)
  returning id into report_id;
  if report_id is null then raise exception 'question_not_found'; end if;
  return report_id;
end;
$$;

create or replace function public.admin_resolve_question_report(p_admin_id uuid, p_report_id uuid, p_deactivate boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare question_to_deactivate uuid;
begin
  if not exists (select 1 from public.project_admins a where a.user_id = p_admin_id) then
    raise exception 'administrator_required' using errcode = '42501';
  end if;
  update public.question_reports set status = 'resolved', resolved_by = p_admin_id, resolved_at = now()
  where id = p_report_id and status = 'pending' returning question_id into question_to_deactivate;
  if question_to_deactivate is null then raise exception 'pending_report_not_found'; end if;
  if p_deactivate then update public.questions set active = false, updated_at = now() where id = question_to_deactivate; end if;
end;
$$;

create or replace function public.host_start_session(p_host_id uuid, p_session_id uuid, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_version bigint; started timestamptz := clock_timestamp();
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  perform 1 from public.hosted_sessions s where s.id = p_session_id and s.host_id = p_host_id
    and s.state = 'lobby' and s.state_version = p_expected_version for update;
  if not found then raise exception 'stale_session_action' using errcode = '40001'; end if;
  if (select count(*) from public.session_guests g where g.session_id = p_session_id) < 1 then raise exception 'guest_required'; end if;
  if (select count(*) from public.session_questions sq where sq.session_id = p_session_id) <> 15
    or exists (select 1 from public.session_questions sq join public.questions q on q.id = sq.question_id
      where sq.session_id = p_session_id and (not q.active or q.current_version_id is null)) then raise exception 'valid_15_question_set_required'; end if;
  update public.session_questions sq set question_version_id = q.current_version_id from public.questions q
  where sq.session_id = p_session_id and q.id = sq.question_id;
  update public.hosted_sessions s set state = 'active_question', current_position = 1,
    started_at = started, question_started_at = started,
    deadline_at = started + make_interval(secs => s.question_time_limit_seconds),
    host_last_heartbeat_at = started, state_version = state_version + 1
  where s.id = p_session_id returning state_version into new_version;
  return new_version;
end;
$$;

create or replace function public.host_heartbeat(p_host_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.hosted_sessions set host_last_heartbeat_at = now()
  where id = p_session_id and host_id = p_host_id and state <> 'completed';
  if not found then raise exception 'session_not_found'; end if;
end;
$$;

revoke all on function public.host_upsert_question(uuid,uuid,text,text,jsonb,text,public.question_difficulty,text) from public, anon, authenticated;
revoke all on function public.host_configure_session(uuid,uuid,bigint,uuid[],integer) from public, anon, authenticated;
revoke all on function public.host_set_question_active(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.host_report_question(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.admin_resolve_question_report(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.host_start_session(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.host_heartbeat(uuid,uuid) from public, anon, authenticated;
grant execute on function public.host_upsert_question(uuid,uuid,text,text,jsonb,text,public.question_difficulty,text) to service_role;
grant execute on function public.host_configure_session(uuid,uuid,bigint,uuid[],integer) to service_role;
grant execute on function public.host_set_question_active(uuid,uuid,boolean) to service_role;
grant execute on function public.host_report_question(uuid,uuid,text) to service_role;
grant execute on function public.admin_resolve_question_report(uuid,uuid,boolean) to service_role;
grant execute on function public.host_start_session(uuid,uuid,bigint) to service_role;
grant execute on function public.host_heartbeat(uuid,uuid) to service_role;

create or replace function public.guest_submit_answer(
  p_token_hash text, p_session_id uuid, p_position smallint, p_question_id uuid, p_option_id text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare guest public.session_guests; correct_id text; version_id uuid; new_state public.hosted_session_state;
begin
  select * into guest from public.session_guests g
  where g.session_id = p_session_id and g.reconnect_token_hash = p_token_hash for update;
  if guest.id is null then raise exception 'guest_credential_invalid' using errcode = '28000'; end if;
  select qv.correct_option_id, qv.id into correct_id, version_id
  from public.hosted_sessions s join public.session_questions sq on sq.session_id = s.id and sq.position = s.current_position
  join public.question_versions qv on qv.id = sq.question_version_id
  where s.id = p_session_id and s.state = 'active_question' and s.current_position = p_position
    and sq.question_id = p_question_id and s.deadline_at > now() for update of s;
  if version_id is null then raise exception 'stale_or_expired_question' using errcode = '40001'; end if;
  if not exists (select 1 from public.question_versions qv, jsonb_array_elements(qv.options) o
    where qv.id = version_id and o->>'id' = p_option_id) then raise exception 'invalid_option'; end if;
  insert into public.session_answers(guest_id, session_id, position, selected_option_id, submitted_at, is_correct)
  values (guest.id, p_session_id, p_position, p_option_id, now(), p_option_id = correct_id);
  if not exists (select 1 from public.session_guests g where g.session_id = p_session_id and not exists (
    select 1 from public.session_answers a where a.guest_id = g.id and a.position = p_position and a.submitted_at is not null)) then
    update public.hosted_sessions set state = 'answer_reveal', deadline_at = null, state_version = state_version + 1
      where id = p_session_id and state = 'active_question';
  end if;
  select state into new_state from public.hosted_sessions where id = p_session_id;
  return jsonb_build_object('saved', true, 'ownAnswer', p_option_id, 'state', new_state);
end;
$$;

create or replace function public.guest_reconnect(p_session_id uuid, p_old_token_hash text, p_new_token_hash text)
returns table(guest_id uuid, session_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  return query update public.session_guests g set reconnect_token_hash = p_new_token_hash,
    credential_version = credential_version + 1, connection_state = 'connected'
  where g.session_id = p_session_id and g.reconnect_token_hash = p_old_token_hash returning g.id, g.session_id;
  if not found then raise exception 'guest_credential_invalid' using errcode = '28000'; end if;
end;
$$;

create or replace function public.finalize_hosted_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare guest_row record; detail jsonb; correct_total smallint; score_total integer; reached_value integer;
begin
  if not exists (select 1 from public.hosted_sessions s where s.id = p_session_id and s.state = 'completed') then return; end if;
  for guest_row in select g.id from public.session_guests g where g.session_id = p_session_id loop
    select coalesce(jsonb_agg(jsonb_build_object(
      'position', sq.position, 'questionId', sq.question_id, 'questionText', qv.question_text,
      'options', qv.options, 'correctOptionId', qv.correct_option_id, 'explanation', qv.explanation,
      'selectedOptionId', a.selected_option_id, 'isCorrect', coalesce(a.is_correct, false),
      'answered', a.submitted_at is not null, 'prizeValueNgn', sq.prize_value_ngn
    ) order by sq.position), '[]'::jsonb),
      count(*) filter (where a.is_correct)::smallint,
      coalesce(sum(sq.prize_value_ngn) filter (where a.is_correct), 0)::integer,
      coalesce(max(sq.prize_value_ngn) filter (where a.is_correct), 0)::integer
    into detail, correct_total, score_total, reached_value
    from public.session_questions sq join public.question_versions qv on qv.id = sq.question_version_id
    left join public.session_answers a on a.session_id = sq.session_id and a.position = sq.position and a.guest_id = guest_row.id
    where sq.session_id = p_session_id;
    insert into public.session_results(guest_id, correct_count, total_score_ngn, reached_prize_ngn, detail)
    values (guest_row.id, coalesce(correct_total,0), coalesce(score_total,0), coalesce(reached_value,0), detail)
    on conflict (guest_id) do nothing;
  end loop;
end;
$$;

create or replace function public.host_advance_session(p_host_id uuid, p_session_id uuid, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare position_now smallint; new_version bigint;
begin
  if not exists (select 1 from public.host_profiles h where h.user_id = p_host_id and h.status = 'approved') then
    raise exception 'approved_host_required' using errcode = '42501';
  end if;
  select s.current_position into position_now from public.hosted_sessions s
  where s.id = p_session_id and s.host_id = p_host_id and s.state = 'answer_reveal'
    and s.state_version = p_expected_version for update;
  if position_now is null then raise exception 'stale_session_action' using errcode = '40001'; end if;
  if position_now = 15 then
    update public.hosted_sessions set state = 'completed', completed_at = now(), deadline_at = null,
      state_version = state_version + 1 where id = p_session_id returning state_version into new_version;
    perform public.finalize_hosted_session(p_session_id);
  else
    update public.hosted_sessions set state = 'active_question', current_position = position_now + 1,
      question_started_at = now(), deadline_at = now() + make_interval(secs => question_time_limit_seconds),
      state_version = state_version + 1 where id = p_session_id returning state_version into new_version;
  end if;
  return new_version;
end;
$$;

create or replace function public.host_pause_session(p_host_id uuid, p_session_id uuid, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
  update public.hosted_sessions set state = 'paused', paused_at = now(),
    paused_from_state = 'active_question',
    remaining_seconds = greatest(0, ceil(extract(epoch from deadline_at - now()))::integer),
    deadline_at = null, state_version = state_version + 1
  where id = p_session_id and host_id = p_host_id and state = 'active_question' and state_version = p_expected_version
  returning state_version into new_version;
  if new_version is null then raise exception 'stale_session_action' using errcode = '40001'; end if;
  return new_version;
end;
$$;

create or replace function public.host_resume_session(p_host_id uuid, p_session_id uuid, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
  update public.hosted_sessions set state = coalesce(paused_from_state, 'active_question'), paused_at = null,
    host_last_heartbeat_at = now(),
    question_started_at = case when coalesce(paused_from_state, 'active_question') = 'active_question' then now() else question_started_at end,
    deadline_at = case when coalesce(paused_from_state, 'active_question') = 'active_question'
      then now() + make_interval(secs => coalesce(remaining_seconds, question_time_limit_seconds)) else null end,
    remaining_seconds = null, paused_from_state = null, state_version = state_version + 1
  where id = p_session_id and host_id = p_host_id and state = 'paused' and state_version = p_expected_version
    and paused_at > now() - interval '30 minutes'
  returning state_version into new_version;
  if new_version is null then raise exception 'session_cannot_resume' using errcode = '40001'; end if;
  return new_version;
end;
$$;

create or replace function public.host_end_session(p_host_id uuid, p_session_id uuid, p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
  update public.hosted_sessions set state = 'completed', completed_at = now(), deadline_at = null,
    state_version = state_version + 1
  where id = p_session_id and host_id = p_host_id and state <> 'completed' and state_version = p_expected_version
  returning state_version into new_version;
  if new_version is null then raise exception 'stale_session_action' using errcode = '40001'; end if;
  perform public.finalize_hosted_session(p_session_id);
  return new_version;
end;
$$;

create or replace function public.host_delete_session(p_host_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.hosted_sessions where id = p_session_id and host_id = p_host_id and state = 'completed';
  if not found then raise exception 'only_completed_sessions_can_be_deleted'; end if;
end;
$$;

create or replace function public.guest_use_lifeline(p_token_hash text, p_session_id uuid, p_position smallint, p_question_id uuid, p_type text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare guest public.session_guests; options_json jsonb; correct_id text; removed text[]; suggested text;
  result_json jsonb; other_answers integer;
begin
  select * into guest from public.session_guests g where g.session_id = p_session_id and g.reconnect_token_hash = p_token_hash;
  if guest.id is null then raise exception 'guest_credential_invalid' using errcode = '28000'; end if;
  if not exists (select 1 from public.hosted_sessions s join public.session_questions sq
    on sq.session_id = s.id and sq.position = s.current_position
    where s.id = p_session_id and s.state = 'active_question' and s.current_position = p_position
      and sq.question_id = p_question_id and s.deadline_at > now()) then raise exception 'stale_or_expired_question' using errcode = '40001'; end if;
  if exists (select 1 from public.session_answers a where a.guest_id = guest.id and a.position = p_position and a.submitted_at is not null) then raise exception 'answer_already_submitted'; end if;
  select qv.options, qv.correct_option_id into options_json, correct_id
  from public.session_questions sq join public.question_versions qv on qv.id = sq.question_version_id
  where sq.session_id = p_session_id and sq.position = p_position;
  if p_type = 'fifty_fifty' then
    select array_agg(wrong.id) into removed from (
      select o->>'id' id from jsonb_array_elements(options_json) o where o->>'id' <> correct_id order by random() limit 2
    ) wrong;
    result_json := jsonb_build_object('removedOptionIds', to_jsonb(removed));
  elsif p_type = 'phone_friend' then
    if random() < 0.6 then suggested := correct_id;
    else select o->>'id' into suggested from jsonb_array_elements(options_json) o where o->>'id' <> correct_id order by random() limit 1;
    end if;
    result_json := jsonb_build_object('suggestedOptionId', suggested);
  elsif p_type = 'ask_audience' then
    select count(*) into other_answers from public.session_answers a where a.session_id = p_session_id
      and a.position = p_position and a.submitted_at is not null and a.guest_id <> guest.id;
    if other_answers < 2 then result_json := jsonb_build_object('enoughResponses', false);
    else
      select jsonb_build_object('enoughResponses', true, 'counts', coalesce(jsonb_object_agg(option_id, votes), '{}'::jsonb)) into result_json
      from (select o->>'id' option_id, count(a.guest_id) votes from jsonb_array_elements(options_json) o
        left join public.session_answers a on a.session_id = p_session_id and a.position = p_position
          and a.guest_id <> guest.id and a.submitted_at is not null and a.selected_option_id = o->>'id'
        group by o->>'id') counts;
    end if;
  else raise exception 'invalid_lifeline';
  end if;
  insert into public.session_lifelines(guest_id, session_id, type, position, result)
  values (guest.id, p_session_id, p_type, p_position, result_json);
  return result_json;
end;
$$;

create or replace function public.expire_hosted_sessions()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer := 0; changed integer := 0; ended uuid[]; ended_row uuid;
begin
  update public.hosted_sessions set state = 'paused', paused_at = now(), paused_from_state = state,
    remaining_seconds = case when state = 'active_question' then greatest(0, ceil(extract(epoch from deadline_at - now()))::integer) else null end,
    deadline_at = null, state_version = state_version + 1
  where state in ('active_question', 'answer_reveal') and host_last_heartbeat_at < now() - interval '30 seconds';
  get diagnostics affected = row_count;
  update public.hosted_sessions set state = 'answer_reveal', deadline_at = null,
    state_version = state_version + 1
  where state = 'active_question' and deadline_at <= now();
  get diagnostics changed = row_count;
  affected := affected + changed;
  with due as (
    update public.hosted_sessions set state = 'completed', completed_at = now(), deadline_at = null,
      state_version = state_version + 1
    where state = 'paused' and paused_at <= now() - interval '30 minutes'
    returning id
  ) select array_agg(id) into ended from due;
  foreach ended_row in array coalesce(ended, '{}'::uuid[]) loop
    perform public.finalize_hosted_session(ended_row);
  end loop;
  affected := affected + coalesce(cardinality(ended), 0);
  delete from public.host_join_attempts where updated_at < now() - interval '15 minutes';
  return affected;
end;
$$;

revoke all on function public.finalize_hosted_session(uuid) from public, anon, authenticated;
revoke all on function public.expire_hosted_sessions() from public, anon, authenticated;
grant execute on function public.expire_hosted_sessions() to service_role;

revoke all on function public.guest_submit_answer(text,uuid,smallint,uuid,text) from public, anon, authenticated;
revoke all on function public.guest_reconnect(uuid,text,text) from public, anon, authenticated;
revoke all on function public.guest_use_lifeline(text,uuid,smallint,uuid,text) from public, anon, authenticated;
revoke all on function public.host_advance_session(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.host_pause_session(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.host_resume_session(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.host_end_session(uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.host_delete_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.guest_submit_answer(text,uuid,smallint,uuid,text) to service_role;
grant execute on function public.guest_reconnect(uuid,text,text) to service_role;
grant execute on function public.guest_use_lifeline(text,uuid,smallint,uuid,text) to service_role;
grant execute on function public.host_advance_session(uuid,uuid,bigint) to service_role;
grant execute on function public.host_pause_session(uuid,uuid,bigint) to service_role;
grant execute on function public.host_resume_session(uuid,uuid,bigint) to service_role;
grant execute on function public.host_end_session(uuid,uuid,bigint) to service_role;
grant execute on function public.host_delete_session(uuid,uuid) to service_role;
