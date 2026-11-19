## Context

The project uses React Router on Cloudflare Workers and Supabase for database, identity, storage, and trusted game actions. The current scope places data integrity before gameplay, describes quick guest solo games first, and defers creator tools. During design, the requirement expanded to approved hosts selecting and managing a shared question bank, then advancing up to ten guests through synchronized sessions with lifelines.

This is broader than the originally scoped data model feature. The build should treat the host led session as the first end to end product path, and the scope should be reconciled before implementation so it no longer promises a conflicting solo first sequence.

## Options considered

### Browser managed session state

The browser could hold the current question and submit answers directly through database policies. This reduces trusted server code, but clients could race host actions, alter answers, or expose correctness.

### Supabase Edge Functions with persisted state

Trusted functions validate each command against saved state, commit changes in PostgreSQL, and broadcast resulting state through Realtime. This matches the current architecture and protects answer keys, at the cost of explicit command handlers and state transitions.

### A separate realtime game service

A dedicated server could own persistent connections and session state. It could offer more control, but adds a separate service to build and operate before the project has scale evidence.

## Rationale

The session needs synchronized host control, private answers, strict deadlines, scoring, recovery, and exact question versions. A persisted state machine with trusted Edge Function commands provides one authoritative answer to whether a command is valid. Realtime is used as a delivery path, not as the source of truth. This reuses the managed stack instead of adding a service.

The shared bank is intentionally global because the engineer chose one common bank managed by approved hosts. Immutable question versions are necessary because editing the shared bank must not rewrite current or past games. Guest accounts are excluded to keep joining quick, while host accounts and manual approval protect bank management.

The fixed NGN ladder is simulated and has no cash payout. The 15 steps rise from ₦1,000 to ₦500,000, keeping the simulated prizes within the launch range while giving the game a clear progression. It is stored as configuration and copied into sessions so later changes cannot rewrite historical outcomes.

Hosts choose from 15, 30, or 60 seconds per question. These bounded choices cover a quick round, a standard pace, and extra thinking time while keeping host setup simple. The first administrator is granted through a one time database operation on a Supabase Auth account. This keeps bootstrap access out of public signup and avoids trusting user editable metadata.

The host and guest screens use a modern Nigerian quiz show character without copying a broadcast brand. Warm paper tones and deep ink give the product an editorial home, while one prize ladder accent keeps the live game legible. Host controls stay in a familiar workspace. Guest play stays focused on a question and its answers. This follows the `anti-ui-slop` product first guidance and the `impeccable` Operate mode, where familiar controls and clear states take priority over decorative novelty.

## References

- Existing project architecture: `docs/specs/0001-product-architecture/index.md`.
- Existing project scope: `docs/scope/scope.md`.
- Nigerian game show top prize context: [National Institute for Cultural Orientation](https://nico.gov.ng/my-memorable-moments-frustrations-as-the-anchor-of-who-wants-to-be-a-millionaire-frank-edoho/).
- Supabase scheduled database jobs and supported intervals: [Supabase Cron](https://supabase.com/docs/guides/cron).
