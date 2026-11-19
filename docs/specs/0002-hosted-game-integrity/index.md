# 0002. Host led quiz sessions and game integrity

**Date**: 2026-11-19
**Status**: In Progress

## Summary

Approved hosts manage a shared question bank and run live quiz sessions for guests. Guests join with a short code and display name, play the same ordered questions, and receive private results. Supabase stores the authoritative game state and protects answer keys.

## Requirements

- **AC-1**: Anyone can create a Supabase Auth account with email and password and request host access. Requests create a pending host profile for project administrator review. Only approved hosts can manage questions or run sessions. Administrators can approve or reject pending requests.
- **AC-2**: Approved hosts can add, edit, deactivate, and report shared bank questions. The administrator can deactivate reported questions. Categories are English, Economics, Literature, and Government. Each question has text, four options, one correct answer, category, easy, medium, or hard difficulty, and an explanation.
- **AC-3**: Hosts can create draft sessions, select exactly 15 distinct active bank questions in a chosen order, select a time limit of 15, 30, or 60 seconds per question for the session, and use the fixed 15 step launch prize ladder in app configuration. Hosts may edit the draft after guests join. A session can start only after at least one guest joins.
- **AC-4**: A session supports at most 10 guests. A guest joins with the code and a display name unique within that session after trimming whitespace and comparing without case. Names have 1 to 24 characters. The code accepts joins until start. Five failed attempts from one client and code pair are blocked for 15 minutes. A successful join clears that pair's counter.
- **AC-5**: Starting locks the ordered question versions for the session. Bank edits and deactivations do not change questions in current or past sessions.
- **AC-6**: The host advances all guests together. Guest answers stay private until everyone answers or the timer expires. Then guests see the correct answer and their own result, and the host advances manually.
- **AC-7**: A timeout counts as unanswered and incorrect. Each guest may use 50:50, simulated Phone a Friend, and Ask the Audience once per session, on any question. Lifelines do not alter scoring.
- **AC-8**: Lifelines are available only on the active question and before the guest answers. 50:50 removes two random incorrect choices and stores their option IDs. Phone a Friend suggests the correct answer 60 percent of the time, otherwise uniformly selects a wrong option, using server randomness and storing the result. Ask the Audience shows anonymous aggregates from submitted answers by other guests, excluding the requester, when at least two others have answered; otherwise it says there are not enough responses.
- **AC-9**: A guest can reconnect to their place with a private token saved on their device. A saved answer is shown after reconnect, and another answer for that question is rejected.
- **AC-10**: A host heartbeat is sent every 10 seconds. After 30 seconds without one, the session pauses. The same host can reconnect and resume within 30 minutes. The question timer freezes while paused and resumes with its remaining time. If the host does not return within 30 minutes, the session ends. The host can end a paused session.
- **AC-11**: A session ends after its last question or when the host ends it early. Each guest receives a private per question result snapshot, correct answers, total score, and prize ladder reached. Total score is the sum of prize values for every correctly answered position. Prize reached is the highest question position answered correctly, or zero. Early end finalizes submitted answers and counts unanswered questions as incorrect.
- **AC-12**: Completed sessions and guest identities, answers, and results remain until the host deletes the session. Deletion is allowed only after session end and leaves the shared question bank intact.
- **AC-13**: Supabase Realtime broadcasts live changes, while saved server state remains authoritative. Session state has a monotonically increasing version. Host transition commands include expected version; guest actions include the active session question ID. Stale actions are rejected. Database policies block direct guest writes, and trusted actions run transactionally through Supabase Edge Functions.
- **AC-14**: The host lobby shows the join code, guest list, ordered questions, and session controls. The guest lobby shows the host name, guest list, and a clear waiting message.

### Additional build rules

- **Question versions**: Each bank question has a current version ID. Editing creates an immutable version and moves the current pointer. Draft sessions store question IDs. Starting resolves the current active version for all 15 distinct questions in one transaction and snapshots those versions and prize values. Edits and deactivation before start use the newest current version. Inactive questions are hidden from bank selection but remain available through historical session snapshots.
- **Question validation**: Require non empty question text, four non empty distinct options with stable option IDs, exactly one correct option ID, an explanation of at most 2,000 characters, and one of the four fixed categories and three difficulty values. Bank lists show active questions ordered by category and most recent edit, with search and pagination.
- **Guest identity and credentials**: Normalize display names by trimming whitespace and comparing without case, enforce 1 to 24 characters, and require uniqueness within the session. Issue a high entropy opaque guest credential scoped to one guest and session. Store only its hash, send only over TLS, keep it in secure same site browser storage, rotate on reconnect, and revoke on deletion. A host profile includes a validated display name.
- **Administrator and reports**: Host status is pending, approved, or rejected. Anyone can sign up through Supabase Auth and request host access, which creates a pending profile. The first administrator is a Supabase Auth account granted the administrator role through a one time database operation performed outside public signup. Future administrator grants and revocations use the same protected operator runbook, not an in app role editor. Administrator identity is held in protected database role records, never signup metadata. Reports start pending and include a required reason up to 500 characters. The administrator can list reports, deactivate the question, and resolve the report. Rejected hosts cannot perform host actions.
- **Join throttling**: Count failed joins by HMAC pseudonym of trusted edge IP plus a random first party client cookie, paired with the submitted code. Five failures block that pair for 15 minutes. Successful join clears that pair's count. Expired counters are deleted.
- **Timers and state transitions**: The host selects 15, 30, or 60 seconds per question for the session. Persist question start and deadline timestamps from database time. A migration enables Supabase Cron and provisions a database job every five seconds to process due question deadlines and paused session expiry, even when no client is connected. The expiry function is idempotent, uses conditional transactional state updates, and safely races with answer submission. Job history is visible through Cron run details. On host pause, save remaining question time and resume with a new deadline. Host heartbeat is every 10 seconds; after 30 seconds without one, the expiry function pauses the session. After 30 minutes paused, it ends the session. The host may end from lobby, active, reveal, or paused states.
- **Administrator bootstrap**: An operator creates or identifies the initial administrator account in Supabase Auth, then runs a documented one time SQL operation to insert its user ID into the protected administrator role table. The operation is not exposed to the application or public signup. Later administrator grants and revocations use the same operator runbook.
- **Answer and result rules**: The guest roster closes at start and forms the fixed “everyone answered” denominator, including disconnected guests. A timeout counts unanswered and incorrect. Early end finalizes submitted answers for the active question and counts all unanswered questions as incorrect. Total score sums the value of every correctly answered position. Reached prize is the highest question position answered correctly, or zero. Store values as integer NGN amounts. At completion, atomically snapshot each guest's per question selected or unanswered state, correct answer, and correctness, plus totals. Finalization is idempotent.
- **Lifeline rules**: Lifelines apply only to the active question and before that guest has submitted. Persist and replay each result after reconnect. Enforce one use of each type per guest and session. Phone a Friend uses server randomness, chooses a wrong option uniformly when the 40 percent failure branch occurs, and stores its suggested option. Ask the Audience derives anonymous counts from existing submitted answer rows, excludes the requester, and requires at least two other submitted answers. It exposes counts only, never identities or individual selections.
- **Safe read projections**: Host lobby receives host name, join code, guest names and connection states, selected question order, time limit, state, and available controls. Guest lobby receives host name, guest names, and waiting state. Active guests receive question text, options, prize value, deadline, their own answer state, and own lifelines, without correctness or explanation. Hosts receive question, position, prize, deadline, answer count, and connection states, never individual answers. Reveal guests receive correct option, explanation, and their own correctness and score update. Paused guests receive pause status and reconnect message. Completed guests receive only their own result snapshot. Realtime messages are invalidations or role safe projections; clients reread after reconnect.
- **Concurrency and expiry**: Persist a monotonically increasing session state version. Host transitions include expected version; guest commands include the active session question ID. Apply commands with row locking or conditional updates in a single database transaction. Database time determines deadlines. Realtime delivery is never required to commit a transition.
- **Start and selection rules**: A session cannot start without at least one guest. A host may edit the draft question order and time limit after guests join. At start, reject any deactivated question, repeated question, or selection count other than 15.

## Decision

**Chosen option**: Use Supabase PostgreSQL as the authoritative store, Supabase Auth for approved hosts, Edge Functions for trusted commands, and Realtime broadcasts for session updates. Pin immutable question versions into each session and model the host led game as a saved state machine.

**Implementation skills**: None recorded in the project context.

### Screen direction

Use a modern Nigerian quiz show character without imitating a specific broadcast brand. Use warm paper tones and deep ink, with one restrained prize ladder accent. The host screen is a clear control workspace for the lobby, ordered questions, guest list, timer, and session controls. Each guest screen is a focused phone view centered on the current question, four answer choices, timer, and lifelines. Use familiar web controls, strong type hierarchy, generous answer targets, visible focus, and clear loading, waiting, error, paused, reveal, and completed states. Keep the task readable in the same room and remotely. Avoid generic dashboard card grids, decorative gradients, fake control room motifs, and novelty controls.

## Feature design

### Data model

| Entity | Key fields | Relationships |
|---|---|---|
| Host profile | user ID, approval status, display name | References Supabase Auth user. |
| Question | ID, category, active status, creator, timestamps | Has immutable versions. |
| Question version | ID, question ID, text, four options, correct option, difficulty, explanation | Belongs to question. |
| Session | ID, host ID, code, state, state version, time limit seconds, current position, question timestamps, paused time and remaining duration | Owns guests and ordered session questions. |
| Session question | session ID, position, question version ID, prize value | Pins an exact question version. |
| Guest | ID, session ID, display name, reconnect token hash, connection state | Belongs to session. |
| Answer | guest ID, session question ID, selected option, submitted time | One answer per guest per question. |
| Lifeline use | guest ID, session ID, type, question position, result | One use per type per guest per session. |
| Question report | question ID, reporter host ID, reason, status, timestamps | Reviewed by administrator. |
| Session result | guest ID, correct count, total score, reached prize value, per question result snapshot | Final private result. |

Question versions preserve the text, options, correct answer, difficulty, and explanation. Session question rows reference the version chosen before start. Keep correct answers and explanations out of guest session payloads until answer reveal.

### Session state machine

`lobby → active question → answer reveal → active question → completed`

The host may end a session from any state before completion. Host heartbeat is every 10 seconds; after 30 seconds without one, a durable worker pauses the session. A periodic durable worker expires question deadlines and paused sessions, and safely retries after interruption. Each active question stores database generated start and deadline timestamps. On pause, save remaining time; on resume, set a new deadline. The guest roster is closed at start and is the fixed denominator for “everyone answered,” including disconnected guests. A guest disconnect does not remove their place. A join code becomes invalid when play starts. Every accepted command is checked against current saved state and state version in a transaction.

### API surface

Use authenticated host commands and guest session credentials against Supabase Edge Functions. Suggested command groups:

| Surface | Actions | Authorization |
|---|---|---|
| Host access | Sign in, read approval state | Supabase Auth user; approved status required for host actions. |
| Administration | List pending hosts, approve or reject host | Project administrator only. |
| Question bank | List, create, version edit, deactivate, report | Approved hosts; admin may deactivate reported content. |
| Session setup | Create, select and order 15 questions, set time limit, start | Owning approved host. |
| Guest access | Join by code and display name, reconnect by private token | Guest credential scoped to one session. |
| Game commands | Submit answer, use lifeline, advance, end, resume | Session guest or owning host according to action. |
| Results | Read own result, delete completed session | Guest reads own result; owning host deletes completed session. |

Join failure limits are enforced server side using an HMAC pseudonym of trusted edge IP plus a random first party client cookie, paired with the submitted code. Generate codes with enough random entropy, enforce uniqueness in the database, and retry on collision. Store only a hash of reconnect tokens. Never trust a browser supplied correctness, score, deadline, or current question position.

### Value sourcing

| Value needed | Source |
|---|---|
| Host identity and approval | Supabase Auth user ID and host profile approval status. |
| Guest identity after reconnect | Hashed private reconnect token mapped to the guest row. |
| Guest display name | Guest join request, checked for uniqueness within the session. |
| Session questions and order | Host selection of active bank question versions before start. |
| Correct answer and explanation | Private question version columns, read only by trusted functions until reveal. |
| Question time limit | Host selects 15, 30, or 60 seconds at session setup, persisted on session. |
| Answer deadline | Saved question start timestamp plus saved time limit. |
| Current question and accepted actions | Persisted session state and position. |
| Prize values | Fixed launch ladder in application configuration, snapshotted on session question rows. |
| Score and reached prize | Correct answers and session question prize values. |
| Audience poll | Submitted answers from any other guest on that question, connected or disconnected, excluding the requester. |
| Phone a Friend choice | Server generated random choice with 60 percent correct and 40 percent incorrect probability. |
| 50:50 choices | Server selected two incorrect options from the pinned version. |
| Join attempt limit | Server side failed attempt counter and block expiry. |
| Host pause expiry | Persisted paused timestamp plus 30 minutes, enforced by an idempotent durable expiry worker. |

### Launch prize ladder

| Question | Value | Question | Value | Question | Value |
|---:|---:|---:|---:|---:|---:|
| 1 | ₦1,000 | 6 | ₦25,000 | 11 | ₦150,000 |
| 2 | ₦2,500 | 7 | ₦40,000 | 12 | ₦200,000 |
| 3 | ₦5,000 | 8 | ₦60,000 | 13 | ₦250,000 |
| 4 | ₦10,000 | 9 | ₦80,000 | 14 | ₦350,000 |
| 5 | ₦15,000 | 10 | ₦100,000 | 15 | ₦500,000 |

These are simulated values with no cash payout.

### Security model

Guests do not have accounts. Scope guest credentials to one session, store reconnect token hashes, and never expose answer keys before reveal. Supabase row policies deny direct guest writes. Edge Functions verify host ownership, approval, guest membership, session state, deadlines, one answer per question, lifeline limits, and state version before committing a command. Realtime payloads contain only data the recipient may see. Administrator functions require a separate administrator role, not a client supplied flag.

### Critical test scenarios

- **AC-1, AC-2**: Unapproved hosts cannot manage questions or create sessions; only administrators can approve hosts or deactivate reported questions.
- **AC-3, AC-5**: A session cannot start with other than 15 ordered questions; editing a bank question after start does not change the pinned version.
- **AC-4**: The eleventh guest and duplicate display name are rejected; a code stops accepting joins at start; the sixth failed attempt is blocked for 15 minutes.
- **AC-6, AC-7**: Answers remain private until all answered or timeout; a timeout is incorrect; only the host advances after reveal.
- **AC-8**: Each lifeline is usable once; 50:50 leaves the right answer; Phone a Friend follows configured odds; audience poll excludes its caller and handles insufficient answers.
- **AC-9**: Reconnect token restores the same guest and saved answer; duplicate or changed answer is rejected.
- **AC-10**: Host reconnect resumes within 30 minutes; expiry ends the session.
- **AC-11, AC-12**: Score and reached prize match the ladder; early end finalizes results; active session deletion is rejected; completed deletion cascades guest data but preserves bank questions.
- **AC-13**: Stale host advance and late answer are rejected; direct guest database writes fail; realtime reconnect reads authoritative current state.
- **AC-14**: Host and guest lobby show the required information in empty, loading, error, and disconnected states.

## Build plan

Use a Tracer Bullet sequence: prove a complete host to guest session path early, then add the shared tools and lifelines.

1. Create schema, migrations, indexes, constraints, row policies, and seed the four categories and fixed ladder. Implement host approval and authenticated host access. **AC-1, AC-2, AC-3, AC-13**
2. Build shared question bank management with immutable versions, reports, admin deactivation, and ordered session setup. **AC-2, AC-3, AC-5**
3. Build session creation, unique join codes, attempt limiting, guest join and reconnect credentials, and host and guest lobbies. **AC-3, AC-4, AC-9, AC-14**
4. Implement Edge Function state commands and Realtime updates for question timing, private answers, reveal, host advance, pause, resume, end, and results. **AC-6, AC-7, AC-10, AC-11, AC-13**
5. Add the three lifelines, host deletion, retention until deletion, and complete end to end recovery paths. **AC-8, AC-9, AC-12**

## Consequences

- The database remains the source of truth when broadcasts are delayed or clients reconnect.
- Immutable question versions and per session answer privacy add schema and policy work, but preserve trustworthy results.
- Guest reconnect tokens are bearer credentials. Losing the device loses the guest identity, and token theft can expose that guest’s session.
- The 15 question requirement and 10 guest cap keep launch behavior predictable, but reduce host flexibility.
- The 30 minute host pause expiry can end a session when the host has a longer outage.
- The phone lifeline is a simulation, so its 60 percent success rate is an explicit game rule rather than a real person’s advice.

## Follow-up

- [ ] Reconcile the broader host led multiplayer feature against the current scope, which describes solo guest gameplay first and creator tools later.
- [ ] Include an operator runbook for the one time administrator grant and future administrator role changes.
- [ ] Confirm the Supabase Cron job is installed and visible in job run history in staging and production.
- [ ] Define the full privacy measurement policy before analytics or public discovery work.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
