# Naija Quiz Arena

## Stack

- **Language / Runtime**: TypeScript, React 19, Cloudflare Workers
- **Framework**: React Router 8 framework mode with Vite
- **Key dependencies**: Supabase JS, Tailwind CSS 4, ESLint
- **Package manager**: npm

## Build approach

Tracer Bullet: prove a real user path across the product layers, then extend it one working slice at a time.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

Use Prettier for formatting. Its scripts are to be configured by `/develop tooling`.
The behavior gate is typecheck plus manual `/check verify`, not an automated test suite.

## Specs

Stored in `docs/specs/`. Numbered specifications describe product and technical decisions.

## Rules

- Use feature based folders for new product code. Keep domain, application, infrastructure, and presentation concerns separate within each feature.
- Keep domain rules independent of React, React Router, Supabase, and other I/O frameworks.
- Use strict TypeScript. Avoid `any` and handle discriminated unions exhaustively.
- Document public APIs, validate environment variables at startup, and handle errors explicitly.
- Prefer named exports. Keep default exports where React Router routes or Worker entry points require them.
- Follow consistent naming and use conventional commit messages.
- Meet WCAG AA accessibility expectations for user interfaces.
- Run lint, formatting, and typecheck before each commit. GitHub Actions also runs lint, typecheck, and build on push.
- Keep private credentials and answer keys out of browser code. Use Supabase row security and trusted functions for protected game operations.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

- [workers-best-practices](.agents/skills/workers-best-practices/): `cloudflare/skills`, Cloudflare Workers runtime and observability practices.
- [supabase](.agents/skills/supabase/): `supabase/agent-skills`, Supabase client, Auth, database, Edge Functions, and CLI practices.

MCP servers: Supabase MCP (recommended), Cloudflare API MCP (recommended).

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
