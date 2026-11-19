create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

create type public.host_access_status as enum ('pending', 'approved', 'rejected');
create type public.hosted_session_state as enum ('lobby', 'active_question', 'answer_reveal', 'paused', 'completed');
create type public.question_difficulty as enum ('easy', 'medium', 'hard');
create type public.question_report_status as enum ('pending', 'resolved');

create table public.host_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 48),
  status public.host_access_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table public.question_categories (
  slug text primary key check (slug in ('english', 'economics', 'literature', 'government')),
  label text not null unique
);
insert into public.question_categories (slug, label) values
  ('english', 'English'), ('economics', 'Economics'),
  ('literature', 'Literature'), ('government', 'Government');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.question_categories(slug),
  active boolean not null default true,
  current_version_id uuid,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  question_text text not null check (char_length(trim(question_text)) between 1 and 1000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_option_id text not null,
  difficulty public.question_difficulty not null,
  explanation text not null check (char_length(explanation) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (question_id, version_number),
  unique (question_id, id)
);
create or replace function public.validate_question_options()
returns trigger language plpgsql set search_path = '' as $$
declare option_item jsonb;
declare seen_ids text[] := '{}';
declare seen_labels text[] := '{}';
begin
  for option_item in select value from jsonb_array_elements(new.options) loop
    if coalesce(option_item->>'id', '') = '' or coalesce(trim(option_item->>'label'), '') = '' then
      raise exception 'each option needs an id and label';
    end if;
    if (option_item->>'id') = any(seen_ids) or lower(trim(option_item->>'label')) = any(seen_labels) then
      raise exception 'option ids and labels must be unique';
    end if;
    seen_ids := array_append(seen_ids, option_item->>'id');
    seen_labels := array_append(seen_labels, lower(trim(option_item->>'label')));
  end loop;
  if not (new.correct_option_id = any(seen_ids)) then raise exception 'correct option must exist'; end if;
  return new;
end;
$$;
create trigger question_options_valid before insert or update of options, correct_option_id
  on public.question_versions for each row execute function public.validate_question_options();
alter table public.questions add constraint questions_current_version_fk
  foreign key (id, current_version_id) references public.question_versions(question_id, id) deferrable initially deferred;

create table public.hosted_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.host_profiles(user_id),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  state public.hosted_session_state not null default 'lobby',
  state_version bigint not null default 0,
  question_time_limit_seconds integer not null check (question_time_limit_seconds in (15, 30, 60)),
  current_position smallint not null default 0 check (current_position between 0 and 15),
  question_started_at timestamptz,
  deadline_at timestamptz,
  paused_at timestamptz,
  remaining_seconds integer,
  host_last_heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index hosted_sessions_state_deadline_idx on public.hosted_sessions(state, deadline_at);
create index hosted_sessions_host_created_idx on public.hosted_sessions(host_id, created_at desc);

create table public.session_questions (
  session_id uuid not null references public.hosted_sessions(id) on delete cascade,
  position smallint not null check (position between 1 and 15),
  question_id uuid not null references public.questions(id),
  question_version_id uuid references public.question_versions(id),
  prize_value_ngn integer not null check (prize_value_ngn > 0),
  primary key (session_id, position),
  unique (session_id, question_id)
);

create table public.session_guests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.hosted_sessions(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  reconnect_token_hash text not null unique,
  credential_version integer not null default 1,
  connection_state text not null default 'connected' check (connection_state in ('connected', 'disconnected')),
  joined_at timestamptz not null default now()
);
create unique index session_guests_name_ci_idx on public.session_guests(session_id, lower(trim(display_name)));

create table public.session_answers (
  guest_id uuid not null references public.session_guests(id) on delete cascade,
  session_id uuid not null references public.hosted_sessions(id) on delete cascade,
  position smallint not null check (position between 1 and 15),
  selected_option_id text,
  submitted_at timestamptz,
  is_correct boolean,
  primary key (guest_id, position),
  foreign key (session_id, position) references public.session_questions(session_id, position) on delete cascade
);

create table public.session_lifelines (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.session_guests(id) on delete cascade,
  session_id uuid not null references public.hosted_sessions(id) on delete cascade,
  type text not null check (type in ('fifty_fifty', 'phone_friend', 'ask_audience')),
  position smallint not null check (position between 1 and 15),
  result jsonb not null,
  used_at timestamptz not null default now(),
  unique (guest_id, session_id, type)
);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id),
  reporter_id uuid not null references public.host_profiles(user_id),
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  status public.question_report_status not null default 'pending',
  resolved_by uuid references public.project_admins(user_id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.session_results (
  guest_id uuid primary key references public.session_guests(id) on delete cascade,
  correct_count smallint not null check (correct_count between 0 and 15),
  total_score_ngn integer not null check (total_score_ngn >= 0),
  reached_prize_ngn integer not null check (reached_prize_ngn >= 0),
  detail jsonb not null,
  finalized_at timestamptz not null default now()
);

create table public.host_join_attempts (
  attempt_key text primary key,
  failures smallint not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.join_hosted_session(
  p_code text,
  p_display_name text,
  p_token_hash text,
  p_attempt_key text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.host_join_attempts;
  target public.hosted_sessions;
  guest_id uuid;
  host_name text;
  guest_names jsonb;
begin
  insert into public.host_join_attempts(attempt_key) values (p_attempt_key) on conflict do nothing;
  select * into attempt from public.host_join_attempts where attempt_key = p_attempt_key for update;
  if attempt.blocked_until is not null and attempt.blocked_until > now() then
    return jsonb_build_object('error', 'join_blocked', 'retry_at', attempt.blocked_until);
  end if;

  select * into target from public.hosted_sessions where join_code = upper(trim(p_code)) for update;
  if target.id is null or target.state <> 'lobby'
    or (select count(*) from public.session_guests g where g.session_id = target.id) >= 10
    or char_length(trim(p_display_name)) not between 1 and 24 then
    update public.host_join_attempts set failures = failures + 1,
      blocked_until = case when failures + 1 >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now() where attempt_key = p_attempt_key;
    return jsonb_build_object('error', 'join_unavailable');
  end if;

  begin
    insert into public.session_guests(session_id, display_name, reconnect_token_hash)
    values (target.id, trim(p_display_name), p_token_hash) returning id into guest_id;
  exception when unique_violation then
    update public.host_join_attempts set failures = failures + 1,
      blocked_until = case when failures + 1 >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now() where attempt_key = p_attempt_key;
    return jsonb_build_object('error', 'name_unavailable');
  end;

  update public.host_join_attempts set failures = 0, blocked_until = null, updated_at = now()
  where attempt_key = p_attempt_key;
  select display_name into host_name from public.host_profiles where user_id = target.host_id;
  select coalesce(jsonb_agg(display_name order by joined_at), '[]'::jsonb) into guest_names
    from public.session_guests where session_id = target.id;
  return jsonb_build_object('guest_id', guest_id, 'session_id', target.id,
    'host_name', host_name, 'guest_names', guest_names, 'join_code', target.join_code);
end;
$$;

create or replace function public.request_host_access(p_display_name text)
returns public.host_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.host_profiles;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  insert into public.host_profiles(user_id, display_name, status)
  values (auth.uid(), trim(p_display_name), 'pending')
  on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.admin_set_host_status(p_user_id uuid, p_status public.host_access_status)
returns public.host_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.host_profiles;
begin
  if auth.uid() is null or not exists (select 1 from public.project_admins a where a.user_id = auth.uid()) then
    raise exception 'administrator_required' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_host_status'; end if;
  update public.host_profiles set status = p_status, updated_at = now()
  where user_id = p_user_id and status = 'pending'
  returning * into result;
  if result.user_id is null then raise exception 'pending_host_not_found'; end if;
  return result;
end;
$$;

create or replace function public.expire_hosted_sessions()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  affected integer := 0;
  changed integer := 0;
begin
  update public.hosted_sessions
  set state = 'paused', paused_at = now(),
      remaining_seconds = greatest(0, ceil(extract(epoch from deadline_at - now()))::integer),
      state_version = state_version + 1
  where state = 'active_question' and host_last_heartbeat_at < now() - interval '30 seconds';
  get diagnostics affected = row_count;

  update public.hosted_sessions
  set state = 'answer_reveal', deadline_at = null, state_version = state_version + 1
  where state = 'active_question' and deadline_at <= now();
  get diagnostics changed = row_count;
  affected := affected + changed;

  update public.hosted_sessions
  set state = 'completed', completed_at = now(), deadline_at = null,
      state_version = state_version + 1
  where state = 'paused' and paused_at <= now() - interval '30 minutes';
  get diagnostics changed = row_count;
  affected := affected + changed;

  delete from public.host_join_attempts where updated_at < now() - interval '15 minutes';
  return affected;
end;
$$;

alter table public.host_profiles enable row level security;
alter table public.project_admins enable row level security;
alter table public.question_categories enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.hosted_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_guests enable row level security;
alter table public.session_answers enable row level security;
alter table public.session_lifelines enable row level security;
alter table public.question_reports enable row level security;
alter table public.session_results enable row level security;
alter table public.host_join_attempts enable row level security;

create policy "hosts can read their profile" on public.host_profiles for select to authenticated using (user_id = auth.uid());
create policy "admins can read profiles" on public.host_profiles for select to authenticated using (exists (select 1 from public.project_admins a where a.user_id = auth.uid()));
create policy "admins can read own admin role" on public.project_admins for select to authenticated using (user_id = auth.uid());
create policy "approved hosts read active questions" on public.questions for select to authenticated using (active and exists (select 1 from public.host_profiles h where h.user_id = auth.uid() and h.status = 'approved'));
create policy "approved hosts read active question versions" on public.question_versions for select to authenticated using (exists (select 1 from public.questions q join public.host_profiles h on h.user_id = auth.uid() where q.id = question_id and q.active and h.status = 'approved'));
create policy "authenticated users read categories" on public.question_categories for select to authenticated using (true);
create policy "admins read reports" on public.question_reports for select to authenticated using (exists (select 1 from public.project_admins a where a.user_id = auth.uid()));
create policy "hosts read own reports" on public.question_reports for select to authenticated using (reporter_id = auth.uid());
create policy "hosts read their sessions" on public.hosted_sessions for select to authenticated using (host_id = auth.uid());
create policy "hosts read session questions" on public.session_questions for select to authenticated using (exists (select 1 from public.hosted_sessions s where s.id = session_id and s.host_id = auth.uid()));
create policy "hosts read session guests" on public.session_guests for select to authenticated using (exists (select 1 from public.hosted_sessions s where s.id = session_id and s.host_id = auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.host_profiles, public.project_admins, public.question_categories,
  public.questions, public.question_versions, public.hosted_sessions, public.session_questions,
  public.session_guests, public.session_answers, public.session_lifelines, public.question_reports,
  public.session_results to authenticated;
grant execute on function public.request_host_access(text) to authenticated;
grant execute on function public.admin_set_host_status(uuid, public.host_access_status) to authenticated;
revoke all on function public.expire_hosted_sessions() from public, anon, authenticated;
revoke all on function public.join_hosted_session(text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_hosted_session(text, text, text, text) to service_role;

select cron.schedule('expire-hosted-sessions', '5 seconds', 'select public.expire_hosted_sessions()');
