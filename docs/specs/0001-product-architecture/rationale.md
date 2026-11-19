## Context

> Premise note: The full product includes separately buildable decisions for data, visual design, guest gameplay, accounts, creator tools, and moderation. This spec focuses on the shared application and environment foundation. Those product decisions stay in their own scope features so this stack decision does not invent their detailed behavior.

The repository contains a small React, TypeScript, and Vite starter, not a shipped quiz product. (basis: [package.json](../../../package.json)) The plan calls for a public English language quiz service for Nigerian players. It begins with curated discovery and guest solo play, then adds accounts and creator publishing. (basis: [PLAN.md](../../../PLAN.md), [project scope](../../scope/scope.md))

One person will build and operate a pilot designed for 100 simultaneous games. The product is free, player results are personal, and the NGN prize ladder is simulated. There is no fixed infrastructure budget, no Nigeria only data residency rule, and no formal uptime promise during the pilot. Server side game actions should stay below 500 milliseconds at p95, excluding player network time. (basis: [project scope](../../scope/scope.md), your confirmed pilot targets)

The architecture needs searchable public pages, private answer keys, safely resumable guest games, and a path to reviewed public content. The design must keep operational load low while leaving a measured path to higher traffic. The full data model, game contracts, account methods, visual design, and moderation rules are separate decisions. (basis: [PLAN.md](../../../PLAN.md), [project scope](../../scope/scope.md))

## Options considered

### Option 1: React Router on Cloudflare Workers with Supabase

Keep the existing React and TypeScript direction, use React Router framework mode on Cloudflare Workers, and use Supabase for PostgreSQL, Auth, Storage, and Edge Functions. Let Workers serve static assets and public page rendering, and let Supabase own data and trusted game commands. (basis: [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/), [Supabase platform overview](https://supabase.com/))

**Pros**:

* Reuses the existing frontend and uses managed services for database, identity, files, and server commands. (basis: [package.json](../../../package.json), [Supabase platform overview](https://supabase.com/))
* React Router supports pre rendering and request rendering. Cloudflare documents an official React Router integration for Workers. (basis: [React Router rendering strategies](https://reactrouter.com/start/framework/rendering), [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/))
* PostgreSQL fits versioned quiz content, game sessions, answers, and moderation records. (basis: [Supabase database overview](https://supabase.com/docs/guides/database/overview))
* The database can enforce row access rules while server functions protect answer checking and scoring. (basis: [Supabase Edge Function security](https://supabase.com/docs/guides/functions/auth))

**Cons**:

* Cloudflare and Supabase form two operating surfaces with separate logs, secrets, deployment, and service limits. (basis: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Supabase deployment](https://supabase.com/docs/guides/deployment))
* Serverless functions are stateless. Writes must be short, transactional, and safe to retry. (basis: [Supabase Edge Functions](https://supabase.com/docs/guides/functions))
* The best data region for Nigeria must be measured because the listed Supabase regions do not include Nigeria. (basis: [Supabase available regions](https://supabase.com/docs/guides/platform/regions))

### Option 2: React Router on Vercel with Neon PostgreSQL and separate identity

Use a managed full stack web host, a managed PostgreSQL provider, and a separate hosted identity service. Keep game commands in an application server and connect each service with explicit APIs. (basis: [Vercel React Router deployment](https://vercel.com/docs/frameworks/react-router), [Neon serverless Postgres](https://neon.com/docs/introduction/serverless), [Clerk React quickstart](https://clerk.com/docs/react/getting-started/quickstart))

**Pros**:

* Keeps a relational database and gives the application server control over every operation. (basis: [Neon serverless Postgres](https://neon.com/docs/introduction/serverless))
* Offers clear service boundaries and independently chosen data and identity providers. (basis: [Vercel React Router deployment](https://vercel.com/docs/frameworks/react-router), [Clerk React quickstart](https://clerk.com/docs/react/getting-started/quickstart))

**Cons**:

* Adds more credentials, integrations, and failure paths for a one person pilot. (basis: the separate provider architecture above and your confirmed team size)
* Identity and database permissions need a custom linking and authorization design. (basis: [Clerk React quickstart](https://clerk.com/docs/react/getting-started/quickstart), [Neon serverless Postgres](https://neon.com/docs/introduction/serverless))
* More of the operational setup and trusted game code remains the team's responsibility. (basis: the separate provider architecture above)

### Option 3: Split the product into services by feature

Deploy discovery, game actions, accounts, and creator tools as separate services with independent data and release processes. (basis: a service per feature alternative to the confirmed modular monolith)

**Pros**:

* Each service can scale and deploy independently when a real ownership boundary or workload requires it. (basis: the independent service option described above)

**Cons**:

* Cross service calls, data duplication, and deployment coordination add overhead before the pilot has traffic evidence. (basis: your confirmed pilot capacity and team size)
* A one person team would operate more systems without a corresponding benefit at 100 simultaneous games. (basis: your confirmed pilot capacity and team size)

## Rationale

Option 1 fits the TypeScript starter, the confirmed 100 game pilot, and the one person operating constraint. It keeps related quiz data in PostgreSQL, uses established managed identity, and draws a clear line between safe client reads and trusted game actions. React Router and Cloudflare's supported integration avoid a custom server adapter while still serving current public quiz pages. (basis: [package.json](../../../package.json), [Supabase database overview](https://supabase.com/docs/guides/database/overview), [Supabase Auth](https://supabase.com/docs/guides/auth), [Supabase Edge Function security](https://supabase.com/docs/guides/functions/auth), [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/))

Option 2 remains a credible path if the team later needs more control over its application server or region choices. It is less suitable now because it asks one person to operate more integrations. Option 3 solves an independence and scale problem the pilot has not demonstrated. The modular boundaries preserve the option to split a domain later without paying that cost now. (basis: your confirmed team size, pilot capacity, and modular monolith choice)

The exact Supabase region remains a production gate. The current provider list has no Nigeria location. The user chose to measure latency and review privacy requirements before selecting a supported region. The selected region is a data location control, not proof of regulatory compliance. (basis: [Supabase available regions](https://supabase.com/docs/guides/platform/regions), your confirmed residency requirement)

The cross check confirmed that the two runtime model is workable if the boundary stays explicit: browsers call Supabase game functions directly, while Workers render public pages. It also surfaced command replay safety, private data projections, preview isolation, staged release ordering, and recovery as architecture safeguards. Detailed game state, guest retention, searchable fields, and operational runbook ownership remain follow up decisions for their owning feature specs. (basis: selected architecture and the read only cross check)

## Landscape notes

The official React Router documentation lists client rendering, server rendering, and static pre rendering. Cloudflare's current React Router integration targets Workers and documents pre rendering support. It does not support SPA mode through the Cloudflare Vite plugin, so gameplay should be an interactive route that hydrates in the browser rather than relying on a separate SPA fallback build. (basis: [React Router rendering strategies](https://reactrouter.com/start/framework/rendering), [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/))

Supabase offers PostgreSQL, Auth, Storage, and Edge Functions in one project. Anonymous Auth can later link to a permanent identity, but anonymous records need cleanup and protection against automated creation. Supabase's current region list has no Nigeria location. Its daily database backup coverage depends on service plan, and database backups do not include stored file contents. (basis: [Supabase Auth](https://supabase.com/docs/guides/auth), [anonymous sign ins](https://supabase.com/docs/guides/auth/auth-anonymous), [available regions](https://supabase.com/docs/guides/platform/regions), [backups](https://supabase.com/docs/guides/platform/backups), [Storage](https://supabase.com/docs/guides/storage))

Cloudflare Workers Builds can create branch previews and production deployments. GitHub Actions deployment environments can gate production jobs and secrets. Workers Logs provide platform logging for the pilot. Zod provides TypeScript input schemas, and PostgreSQL has full text search support. (basis: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [GitHub Actions deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments), [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Zod](https://zod.dev/), [PostgreSQL full text search](https://www.postgresql.org/docs/current/datatype-textsearch.html))

The second runtime is the main operational cost, but it fits the selected official React Router Worker integration and keeps trusted game commands in the selected Supabase boundary. Starting with PostgreSQL full text search and filters is the user's confirmed choice; the discovery spec can limit fields and ranking to what the curated launch needs. (basis: your confirmed hosting, backend, and search choices)

## References

**Project sources**:

* `PLAN.md`, the public quiz product direction, launch phases, data needs, and game integrity requirements.
* `docs/scope/scope.md`, the confirmed pilot audience, product boundaries, approach, and workflow.
* `package.json`, the existing React, TypeScript, and Vite starter.

**Practices & standards**:

* Use relational constraints and transactions for linked product data and canonical game outcomes.
* Keep public data separate from private answer keys, and enforce access at the database and server boundaries.
* Start with a modular monolith and add services only for demonstrated ownership or scaling needs.
* Use idempotent server commands for retryable game actions.

**Links**:

* [React Router rendering strategies](https://reactrouter.com/start/framework/rendering)
* [Vercel React Router deployment](https://vercel.com/docs/frameworks/react-router)
* [Neon serverless Postgres](https://neon.com/docs/introduction/serverless)
* [Clerk React quickstart](https://clerk.com/docs/react/getting-started/quickstart)
* [React Router on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
* [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
* [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
* [GitHub Actions deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
* [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
* [Supabase database overview](https://supabase.com/docs/guides/database/overview)
* [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
* [Supabase Auth](https://supabase.com/docs/guides/auth)
* [Supabase anonymous sign ins](https://supabase.com/docs/guides/auth/auth-anonymous)
* [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
* [Supabase Edge Function security](https://supabase.com/docs/guides/functions/auth)
* [Supabase Storage](https://supabase.com/docs/guides/storage)
* [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
* [Supabase available regions](https://supabase.com/docs/guides/platform/regions)
* [Supabase backups](https://supabase.com/docs/guides/platform/backups)
* [Supabase local development and migrations](https://supabase.com/docs/guides/local-development/database-migrations)
* [Supabase deployment and branching](https://supabase.com/docs/guides/deployment)
* [Supabase MCP server](https://supabase.com/docs/guides/ai-tools/mcp)
* [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
* [PostgreSQL full text search](https://www.postgresql.org/docs/current/datatype-textsearch.html)
* [Zod](https://zod.dev/)
