# 0001. A managed modular architecture for the quiz platform

**Date**: 2026-11-19
**Status**: Proposed

## Summary

Use the current React and TypeScript application for the public web product, and grow it as a modular monolith on managed services. Cloudflare Workers will serve the site, while Supabase will own the database, identity, files, and trusted game actions. This keeps operations small for a one person pilot while protecting answers and allowing the product to grow.

## Decision

**Chosen option**: Option 1, React Router on Cloudflare Workers with Supabase as the managed product backend.

Keep clear boundaries between public pages, the interactive game, game rules, and data access. Use current React Router framework mode with the Cloudflare Vite integration. Pre render the landing and stable public pages, render current quiz detail pages at request time, and keep gameplay interactive in the browser. Supabase Edge Functions will handle trusted game commands and PostgreSQL transactions.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture | Managed modular monolith | One person can build and operate it, with no service per feature. |
| Language | TypeScript | It is already used by the application and is supported by both selected runtimes. |
| Web framework | React with React Router framework mode and Vite | Keeps the existing React foundation and supports static pre rendering, request rendering, and interactive routes. (basis: [React Router rendering strategies](https://reactrouter.com/start/framework/rendering)) |
| Web hosting | Cloudflare Workers with static assets and the official React Router integration | Serves cached assets and supports request rendering without a custom adapter. (basis: [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)) |
| Database | Supabase managed PostgreSQL | Relational quiz versions, questions, game sessions, and answers share one transactional data store. (basis: [Supabase database overview](https://supabase.com/docs/guides/database/overview)) |
| Data access | Supabase JavaScript client for safe reads and owner scoped work, row level security for access, Edge Functions for trusted game commands | Keeps the browser useful while the database and server remain the authority for private data and results. (basis: [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Edge Function security](https://supabase.com/docs/guides/functions/auth)) |
| Identity | Supabase Auth, with anonymous identities for guests and account linking later | Lets guests start without personal information and preserves a path to saved accounts. (basis: [Supabase Auth](https://supabase.com/docs/guides/auth), [anonymous sign ins](https://supabase.com/docs/guides/auth/auth-anonymous)) |
| Guest abuse control | Cloudflare Turnstile on anonymous sign up, with Supabase rate limits | Reduces automated guest identity creation while keeping the game start flow low friction. (basis: [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/), [Supabase anonymous sign ins](https://supabase.com/docs/guides/auth/auth-anonymous)) |
| File storage | Supabase Storage for draft and published quiz media | Uses the selected backend and its access rules for private drafts and public published files. (basis: [Supabase Storage](https://supabase.com/docs/guides/storage), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)) |
| Search | PostgreSQL full text search and filters | Supports the curated launch catalog without an external index. (basis: [PostgreSQL text search](https://www.postgresql.org/docs/current/datatype-textsearch.html)) |
| Request validation | Zod in server functions | Checks untrusted input at the server boundary and infers TypeScript types. (basis: [Zod](https://zod.dev/)) |
| Database changes | Versioned SQL migrations and generated TypeScript database types through the Supabase CLI | Keeps schema changes reviewable and environments reproducible. (basis: [Supabase local development and migrations](https://supabase.com/docs/guides/local-development/database-migrations)) |
| Jobs | None for the pilot | Game requests are interactive. Add scheduled work only when a later feature needs it. |
| Monitoring | Cloudflare Workers logs and Supabase health dashboards | Makes pilot failures visible without another monitoring vendor. |

## Runtime boundaries

* Public landing and catalog pages use static rendering where content is stable. Public quiz detail routes render current published metadata at request time so new creator links can appear without rebuilding the site. (basis: [React Router rendering strategies](https://reactrouter.com/start/framework/rendering), [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/))
* Gameplay remains interactive in the browser. Game state and answers come from Supabase functions, not from cached page data. (basis: your confirmed guest play and rendering choices)
* The browser can read only published quiz projections and public media, plus caller scoped data protected by row level security. Never expose answer tables, privileged keys, or an unrestricted view or function that can return answer keys. (basis: [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control))
* Browsers call Supabase Edge Functions directly for game commands; Workers render public pages and do not proxy game commands. Each command requires a valid Supabase user token. Functions validate the actor and session, then invoke a narrowly granted database command function that checks answers and applies one legal state transition in a transaction. The command path uses caller identity and never the service role key; it returns only the minimum player facing result. Reserve elevated credentials for administration. (basis: [Supabase Edge Function security](https://supabase.com/docs/guides/functions/auth), [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), your confirmed trust boundary)
* Commands carry a client generated command ID bound to the authenticated user and game session. Persist the command result in the same transaction as the state change; retries return that result, and duplicate or out of order transitions are rejected. Detailed command contracts belong in the data model and game integrity spec. (basis: the cross checked game integrity boundary)
* Anonymous guests use Supabase anonymous identities. Row policies distinguish anonymous guests from permanent accounts. Players can link a permanent identity later.
* Turnstile is checked by Supabase Auth. Keep platform rate limits enabled. Anonymous identities need a cleanup rule when retention is decided. (basis: [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Supabase anonymous sign ins](https://supabase.com/docs/guides/auth/auth-anonymous))
* Store draft media in private buckets and published quiz media in public buckets. Database backups do not include uploaded file contents, so media needs its own backup plan. (basis: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Supabase backups](https://supabase.com/docs/guides/platform/backups))
* The Worker fetches the published metadata projection for public quiz detail pages and caches only that projection for up to five minutes. Publishing triggers an authenticated cache invalidation for that quiz's canonical page key. If the origin is unavailable, it may serve a previously cached public projection. Never cache drafts, game sessions, answer keys, or user specific results. (basis: your confirmed cache rule and public data boundary)
* Do not add a separate query cache, ORM, search service, payment service, real time service, or job queue for the pilot. The owning feature can add one later when a measured need appears. (basis: your confirmed one person pilot and modular monolith choices)

## Environments and release

Use local Supabase for development, one shared staging project for protected staging, and a separate production project. Staging uses synthetic data and never copies production data. Ordinary branch previews use mock data and cannot call staging or production. Do not create a database branch for every code change during the pilot. (basis: your confirmed environment choice, with the cross checked preview isolation safeguard)

Workers Builds creates ordinary app previews with mock data and deploys the protected staging and production app branches. GitHub Actions runs lint, type checks, the production build, and automated tests before staging changes. The protected staging branch deploys the Worker and applies database migrations and Edge Functions to staging from the same commit. Production changes wait for human approval: GitHub Actions applies backward compatible migrations and Edge Functions first, then the matching commit is promoted to the production branch for Workers Builds. Use expand, deploy, contract migrations across releases; production rollback must include a documented Worker rollback or forward fix because schema changes may not be reversible. Store credentials in environment secrets, protect production secrets, and keep them out of browser code and source control. (basis: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments), your confirmed deployment choice, the cross checked release safeguard)

Create SQL migrations locally with the Supabase CLI and commit them with the application changes. Do not make untracked production schema changes in the dashboard. Only the protected staging deployment receives staging credentials; ordinary branch previews have no backend credentials. (basis: [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations), [Supabase deployment](https://supabase.com/docs/guides/deployment), the cross checked preview isolation safeguard)

## Pilot targets

* Design and load test for 100 simultaneous games. (basis: your confirmed pilot capacity)
* Keep server side p95 game action time under 500 milliseconds at that load. This excludes the player's network connection. (basis: your confirmed response target)
* Make no formal uptime promise during the pilot. Record outages and choose a target before broad launch. (basis: your confirmed uptime choice)
* Choose and record the production Supabase region before provisioning production. Test latency from Nigeria and review privacy requirements first. Staging remains synthetic and disposable, so it does not constrain the production region. There is no Nigeria only residency requirement. The current listed regions do not include Nigeria. (basis: [Supabase available regions](https://supabase.com/docs/guides/platform/regions), your confirmed residency requirement)
* Use managed daily database backups and a separate daily storage backup. Set a 24 hour recovery point objective and a one business day recovery time objective for the pilot. Before public launch, restore a game record and a published media file into an isolated project and record the result. Confirm the selected service plans cover this behavior. (basis: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase Storage](https://supabase.com/docs/guides/storage), the cross checked recovery safeguard)
* Carry one correlation ID from each Worker request into any Edge Function and database command logs. Measure the 500 millisecond p95 from Edge Function receipt through committed response; route service alerts to the project operator and review error rates and retries weekly. (basis: your confirmed response target and the cross checked operations safeguard)

## Consequences

**Positive**:

* Guests can start quickly, while public pages remain searchable and current as quizzes are published.
* The database protects answer keys and canonical results. Row policies restrict direct reads and creator owned changes.
* Managed services reduce work for one person and leave room to add capacity after measuring traffic.

**Negative / tradeoffs**:

* The product depends on Cloudflare and Supabase availability, plan limits, and service changes.
* Supabase Edge Functions are stateless and run separately from the database. Game writes need short transactions and safe retry behavior. They are not a fit for long running work or persistent connections.
* Cloudflare Workers and Supabase have separate logs, credentials, deployment settings, and failure modes.
* Daily managed backups and file backups may require paid service plans. Storage file recovery must be exercised separately from database recovery.
* Region choice cannot be finalized until latency and privacy checks are complete.

**Neutral**:

* Permanent account methods, full schema details, game contracts, design system, analytics, and moderation workflows remain in their own scope features.
* Live games, realtime updates, payments, and cross region database replication are outside the pilot architecture.

## Follow-up

* [ ] Design the data model and game integrity in its own spec before migrations are built.
* [ ] In the game integrity spec, define legal session transitions, command IDs and replay behavior, actor and session binding, and the response fields each command may expose.
* [ ] In the guest gameplay and session recovery specs, define guest token persistence, account linking, retention, and cleanup rules that preserve active or resumable games.
* [ ] In the discovery and publishing specs, define the searchable fields and implement cache invalidation for the published metadata projection.
* [ ] Before production provisioning, record the region selected after latency and privacy review.
* [ ] Before public launch, document the preview mock data boundary, release rollback runbook, alert destination, and recovery drill evidence.
* [ ] Run a load exercise for 100 simultaneous games and confirm the 500 millisecond server side p95 target.
* [ ] Define the uptime target and higher traffic capacity after the pilot has a baseline.
* [ ] Connect the official Supabase MCP in project scoped, read only mode through Codex settings. It can inspect schema and backend health once connected. (basis: [Supabase MCP server](https://supabase.com/docs/guides/ai-tools/mcp))
* [ ] Check for project relevant technology skills again when the skill registry is reachable. Registry lookup was unavailable during this design.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
