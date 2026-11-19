# Greenfield Product Plan: Trivia Game and Quiz Studio

## Product direction

Build **Naija Quiz Arena**, a polished, public-facing trivia platform for a large audience. Its game-show experience should feel visually distinctive, expressive, responsive, and fast, with a serious quiz-creation studio behind it. Treat the existing `index.html` as a feature reference only. Rebuild the product cleanly in React and design the data model, backend, and operating practices for many users.

The GitHub repository slug can be `naija-quiz-arena`.

The product should serve three connected needs:

1. **Play:** Start a great trivia game quickly, with or without an account.
2. **Create:** Build, organize, preview, and share quizzes in a capable studio.
3. **Discover:** Find high-quality public quizzes and return to recent games.

The initial release should use a modular monolith on managed infrastructure, with clear boundaries between the UI, game rules, and data access. Individual services can change if real traffic patterns later require it.

## Product principles

- **The game is the hero.** Create a full-screen, cinematic play experience that feels intentional on phones, tablets, laptops, and large displays.
- **Make creation powerful without making it intimidating.** Start with simple quiz setup; progressively reveal advanced options for question pools, timing, scoring, and presentation.
- **Keep play fast.** Guests can start public quizzes without a forced sign-up. Accounts unlock saved quizzes, cross-device history, and creator tools.
- **Trust results.** If scores, rankings, or rewards are shown publicly, the server owns answer checking and score calculation.
- **Use naira for prizes.** Monetary prize ladders are denominated in Nigerian naira (NGN) and displayed with the ₦ symbol. Store the currency code with the quiz settings and format amounts for the Nigerian locale. Points-based quizzes can be offered separately; do not silently convert a naira prize ladder to another currency.
- **Build for inclusion.** Keyboard use, screen readers, reduced motion, zoom, readable contrast, and localization support are product requirements.
- **Scale with evidence.** Begin with managed services, cache public reads, measure real load, and scale compute or add components when data shows a bottleneck.

## Intended audiences

- **Players:** Want a quick, exciting game that works well on mobile and gives clear feedback.
- **Creators and teachers:** Need authoring tools, reliable imports, sharing, previews, and reusable question banks.
- **Hosts and communities:** Need public quizzes, custom branding, predictable sessions, and later the option to run group games.
- **Moderators and operators:** Need tools to review public content, handle reports, detect abuse, and understand platform health.

## Modern UI and experience direction

The design should feel like a premium interactive entertainment product, with a cohesive visual identity that distinguishes it from a basic quiz form or generic admin template. Use the existing game-show energy as inspiration while giving the product its own visual language.

### Art direction

- Establish a recognizable brand with a custom display typeface, a restrained body type system, a rich dark/light-capable palette, and a small set of signature surfaces and shapes.
- Use layered backgrounds, subtle lighting, depth, crisp borders, and carefully controlled accent colors to create a theatrical stage. Keep question text and answers highly legible.
- Create a polished component system for buttons, answer tiles, cards, tabs, dialogs, alerts, badges, progress indicators, forms, and empty/loading/error states.
- Give the most important interactions distinct visual states: idle, hover, focus, selected, submitted, correct, incorrect, disabled, and loading.
- Use motion to clarify cause and effect: question changes, answer locking, prize progression, modal entry, and success celebration. Respect reduced-motion preferences and avoid making animation block play.
- Avoid emoji as core iconography. Use a consistent icon set and use illustration or custom game art only where it strengthens the product identity.

### Responsive experiences

- **Mobile play:** One clear question at a time, large answer targets, compact progress and lifeline controls, thumb-friendly spacing, and a readable expandable prize ladder. Never disable browser zoom.
- **Desktop play:** Stage-focused layout with question and answer choices prominent and game progress visible without stealing attention.
- **Studio:** A high-quality workspace with clear navigation, searchable question bank, preview pane or preview mode, visible save/publish state, bulk actions, and focused edit dialogs or panels.
- **Discovery:** Editorial quiz cards with category, length, difficulty, creator, and rating/popularity indicators where those signals are meaningful.
- Design and review long content, large text, empty libraries, slow networks, narrow viewports, and non-Latin text from the start.

### Primary flows

1. **New visitor:** Landing page → browse or search → quiz details → play as guest → results → optional account creation to save progress.
2. **Returning player:** Home dashboard → continue or replay → results/history.
3. **Creator:** Sign in → create quiz → add/import questions → preview → save draft → publish/share → manage quiz.
4. **Host (later milestone):** Create live room → share join code → host controls rounds → participants answer → show results.

## Feature scope

### First public release

- Public landing and quiz discovery with category search and curated starter quizzes.
- Guest play and accounts for creators; email sign-in and OAuth can be phased according to audience needs.
- Single-player game with configurable question count, question ordering, timers, lifelines, safe havens, prize ladder, and final-answer confirmation.
- Quiz studio with question create/edit/reorder/delete, validation, category/difficulty fields, import/export, preview, draft/publish, and shareable links.
- Random question selection by default, with no duplicate questions in one game and a recent-question cooldown to keep repeat exposure low across games. Creators can choose curated fixed order when that fits the quiz.
- Game results and account history; optional player display names and privacy settings. Prize money defaults to NGN (₦).
- Basic creator profile, content reporting, moderation queue, and platform operations view before public submissions are opened broadly.

### Later expansion

- Live hosted games, rooms, participant presence, and synchronized results.
- Team play, tournaments, seasonal challenges, achievements, and leaderboards.
- Creator analytics, collaborative editing, richer media questions, and organization/classroom workspaces.
- Localization, region-aware content discovery, and advanced accessibility options.

## Recommended technical foundation

### Frontend

- React + TypeScript + Vite for a fast client application and a typed component foundation.
- React Router for route-level page structure.
- Tailwind CSS through the build pipeline, backed by project-owned tokens and components. Use accessible headless primitives where they help, while keeping the product's visual system custom.
- A typed API/data layer with request caching, retry, and invalidation. Keep UI state local and server data in the data layer; avoid a global state store until a real cross-feature need appears.
- Runtime validation for form input and API responses so imported or remote data cannot silently break game screens.
- CDN-hosted static assets and code splitting for the discovery, studio, and game routes.

### Backend recommendation

Start with **Supabase: PostgreSQL, Auth, Storage, and Row Level Security**, with a typed server/API boundary for operations that need trusted business logic. This provides relational quiz data and managed identity without building infrastructure operations from scratch. Supabase documents Postgres, Auth, RLS, client access, and its React setup ([React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)).

Use direct Supabase data access only for operations whose policies can be expressed and safely enforced with grants and RLS, such as creator-owned draft editing and public quiz metadata. Route trusted game actions—create session, submit answer, use lifeline, finalize score—through Postgres functions or authenticated server functions. Keep answer keys separate from public reads. Supabase Edge Functions provide a TypeScript server-side option for authenticated endpoints and integrations ([Edge Functions](https://supabase.com/docs/guides/functions)).

Supabase is the recommended launch backend. Validate its capacity against traffic targets before launch, then set usage budgets and service-level expectations, load-test expected traffic, monitor database and API saturation, and scale compute/pooling or add a dedicated API/cache layer as evidence requires. Supabase documents connection pooling and its database scaling options ([pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [scaling overview](https://supabase.com/kb/faqs/platform/scaling)).

### System shape

```text
React app (CDN)
  ├── Public discovery reads ──> cached API/data endpoint ──> PostgreSQL
  ├── Authenticated creator actions ──> Supabase Auth + RLS ──> PostgreSQL
  ├── Trusted game actions ──> game API/function ──> PostgreSQL transaction
  └── Quiz media ──> object storage + image CDN

Background jobs (later as needed)
  ├── moderation and report processing
  ├── search indexing and popularity aggregates
  └── email/notifications and analytics exports
```

Keep public discovery responses small and cacheable. Do not cache user-specific or answer-key data in a public CDN. Use a search service only when Postgres search no longer meets measured needs. Add realtime only for a real live-game feature, not for ordinary solo play.

## Data model

Use UUID primary keys, foreign keys, indexes for observed query paths, timestamps, constraints, migrations, and immutable versions for content used by games.

| Entity | Key fields and purpose |
| --- | --- |
| `profiles` | Auth user ID, display name, avatar, locale, privacy preferences. |
| `quizzes` | Owner, slug, title, description, cover image, category, status (`draft`, `published`, `archived`), visibility, timestamps. |
| `quiz_versions` | Immutable published/edit snapshot, rules/settings (including prize currency code, default `NGN`), version number, publication timestamp. Games reference a version so later edits do not alter an active or completed game. |
| `questions` | Reusable private question content, author, prompt, options, correct option, explanation, hint, category, difficulty, status. |
| `quiz_version_questions` | Version ID, question ID or snapshot, explicit order/selection weight. |
| `game_sessions` | User or guest token, quiz version, randomized question order, random seed, current position, lifelines, score/prize, timestamps, end reason. |
| `game_answers` | Session, question, chosen option, correctness, elapsed time, submission key, timestamp. Apply retention/privacy rules. |
| `question_exposures` | User or guest key, question, session, served timestamp. Used to avoid recently seen questions, including questions served in games the player left early. Apply retention limits and privacy rules. |
| `reports` | Reporter, quiz/question, reason, status, moderator decision, timestamps. |
| `audit_events` | Sensitive creator/moderator actions for accountability, with minimal retained data. |

Question answers should not be available in public quiz discovery payloads. Build distinct public quiz/detail and private authoring/game response shapes. Never ship a service-role key or database secret in the browser bundle.

## Security, integrity, and abuse controls

- Enable RLS and configure least-privilege grants on every client-exposed table. Test allow and deny access for anonymous, signed-in owner, other user, and moderator roles. Supabase notes that grants and RLS work together; both must be configured deliberately ([RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- Keep correct answers and scoring logic server-side for any result that will be trusted or ranked.
- Make answer submission transactional, session-bound, and idempotent so retrying a request cannot advance twice or change an answer.
- Validate payload shape, lengths, ownership, quiz publication state, session state, and rate limits on the server.
- Add abuse protections for account creation, quiz publishing, imports, public search, and game creation. Use moderation/report flows before allowing unrestricted user-generated content.
- Store only necessary personal data. Make account deletion and export part of the product plan.
- Use separate development, preview, staging, and production environments. Keep schema changes in migrations and secrets in the hosting platform's secret store.
- Define backup retention and practice recovery. Supabase documents daily backups and optional point-in-time recovery, but the chosen plan and data coverage must match the product's recovery goals ([backup guide](https://supabase.com/docs/guides/platform/backups)).

## Game service operations

Implement these as database transactions/functions or authenticated server endpoints. Document request/response contracts and failure behavior before wiring the game UI.

1. **Start game:** Validate that the quiz version is playable, randomly select and snapshot the question order, create the session, initialize timer/lifelines/prize rules, record question exposure, and return the first public question and session state. Never select the same question twice in a game.
2. **Submit answer:** Validate ownership, active question, answer index, deadline, and idempotency key; compare against the private answer key; record answer; advance or finish; return correctness, permitted reveal, and the next state.
3. **Use lifeline:** Check availability and apply the quiz's configured behavior. Generate audience distributions with controlled rules; phone-a-friend can be theatrical, probabilistic, or disabled. Avoid guaranteed answer leaks unless explicitly chosen by the quiz creator.
4. **Finish game:** Persist completion, timeout, walk-away, or failure reason and final outcome. Return the canonical result summary.
5. **Resume game:** Rehydrate state from the server and account for elapsed time. Define whether timed sessions pause during disconnects or continue by server clock.

## Delivery roadmap

### Phase 0 — Product definition and visual direction

- Confirm primary audience, initial launch geography/language, whether play is solo or hosted first, and what scores are considered trustworthy.
- Define product naming/brand direction and content policy for public quizzes.
- Confirm Nigerian naira (NGN/₦) as the default currency for prize ladders and prize displays.
- Produce a responsive design system and high-fidelity prototypes for landing/discovery, quiz details, game, studio, and results.
- Map core workflows and empty, loading, error, and recovery states before implementation.

**Exit criteria:** Product decisions and visual direction are concrete enough to guide a consistent implementation; the game and studio have clear mobile and desktop layouts.

### Phase 1 — Platform foundation

- Set up React + TypeScript app, design tokens, component primitives, routes, environments, error reporting, and analytics events with privacy boundaries.
- Create Supabase environments, schema migrations, Auth configuration, RLS/grants, seed content, and backup policy.
- Define API contracts, typed models, versioning rules, and observability dashboards.
- Establish CI for formatting, static analysis, build, accessibility checks, and database policy checks.

**Exit criteria:** Preview and staging environments are repeatable; schema and access rules are reviewed; production secrets are isolated; failures are visible to operators.

### Phase 2 — Public discovery and guest gameplay

- Launch a designed landing page, curated quiz collection, search/filter, quiz detail pages, and guest-friendly single-player game. Randomize question draws by default, persist each game's draw for reliable resume, and exclude recently served questions where the pool is large enough.
- Implement server-checked sessions, safe resume behavior, lifelines, results, and mobile-first game presentation.
- Add CDN caching for safe public metadata and keep game/session endpoints uncached.
- Instrument funnel and performance metrics without logging answer secrets or unnecessary personal data.

**Exit criteria:** A new visitor can discover and complete a quiz on mobile and desktop; results are canonical; reloads, retries, and network interruptions have defined outcomes.

### Phase 3 — Accounts and creator studio

- Add sign-in, profile, creator dashboard, draft/publish workflow, quiz studio, strict import validation, export, preview, and sharing.
- Add reporting, moderation queue, audit trail, and rate limits before broad user-generated publishing.
- If useful, add a one-time importer for the prototype's `wwtbam_studio_v1` local data and old JSON format. Treat it as optional compatibility work, not the product's data foundation.

**Exit criteria:** Creators can build, preview, publish, update, and share quizzes safely; users can access their quizzes across devices; moderation operators can act on reports.

### Phase 4 — Launch readiness and scale validation

- Define target peak concurrent users, requests per second, latency budgets, availability goals, recovery objectives, and monthly infrastructure budget.
- Run load and failure-mode exercises against realistic gameplay and discovery traffic; optimize indexes, payloads, queries, caching, and connection use based on measurements.
- Add alerts for error rate, latency, database saturation, queue backlog, auth issues, abuse spikes, and backup failures.
- Validate accessibility, browser/device support, localization-ready layouts, privacy copy, data export/deletion, and incident/recovery runbooks.
- Roll out gradually with feature flags, staged cohorts, and rollback procedures.

**Exit criteria:** The service meets agreed launch targets with monitored cost and error budgets, and the team has a practiced recovery and rollback process.

### Phase 5 — Community and live play

- Add ratings/reviews only with anti-abuse and moderation measures.
- Introduce live rooms and realtime updates as a separate feature with explicit concurrency and reconnect behavior.
- Add organizations/classes, team modes, creator analytics, and tournaments when supported by user demand.

**Exit criteria:** Each expansion has a validated use case, a measured capacity plan, and clear privacy/moderation behavior.

## Success measures

- New visitor to first game start and first game completion rates.
- Median time from opening a quiz to answering the first question.
- Quiz creation completion rate and time to publish a first quiz.
- Returning player rate and creator retention.
- Error rate, p95 API latency, question-load latency, session-resume success, and crash-free sessions.
- Cost per completed game and cost per monthly active creator.
- Reports per published quiz, moderation response time, and confirmed abuse rate.
- Accessibility issues and task completion across supported devices.

Set targets after baseline instrumentation and user research; do not optimize for raw registrations alone.

## Major decisions to resolve early

- Is the first audience general public, classrooms, or hosted events? Start with public solo play plus creation, and defer live multiplayer until the core loop is strong.
- Are scores casual or eligible for public ranking/rewards? If ranked, all scoring and answer checks must be server-owned.
- What public content policy, reporting, and moderation staffing exist at launch?
- Which geography and languages are in the first release, and where must data reside?
- What does “many people” mean for launch peak concurrency and growth? Turn that into load targets and cost limits before selecting production capacity.
- How should repeat avoidance work? Recommended: exclude a player's most recently served questions within the same quiz/category, tune the cooldown to pool size, and relax it only when too few unseen questions remain. Use a guest identifier for anonymous play and transfer its recent-play history when the player creates an account where consent and product policy allow.
- Should unauthenticated players be able to finish games? Recommended: yes; offer sign-in afterward to keep history.

## Current implementation: feature reference only

The prototype includes home, single-player game, three lifelines, prize ladder, themes, timer, sound, question editor, import/export, and local storage. Rebuild the useful capabilities with the new product design and data model. Do not carry forward its one-file structure, client-trusted answers, or local storage as the canonical backend. Preserve old local quizzes only through an optional import path.

## Official backend references

- [Supabase React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits)
- [Supabase scaling overview](https://supabase.com/kb/faqs/platform/scaling)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
