# Who Wants To Be A Literature Giant

This project uses React Router framework mode on Cloudflare Workers. Supabase will provide the database, identity, storage, and trusted game commands as those features are built.

## Local development

Install dependencies with `npm install`, then run `npm run dev`.

Run `npm run typecheck` to generate route types and check TypeScript. Run `npm run build` to create the production client and Worker bundles.

## Cloudflare

The Worker configuration is in `wrangler.jsonc`. Use `npm run preview` to run the built Worker locally. Deployment is configured by the project workflow and is not enabled from this starter.

Configure Cloudflare Workers Builds to create branch previews with mock data, deploy the `staging` branch to staging, and deploy `main` to production. Keep production Worker deployment after the approved Supabase release for the same commit.

## Supabase releases

The `Supabase release` GitHub workflow deploys migrations and Edge Functions from `staging` to the staging Supabase project. To release, run it manually from the `staging` branch and choose `production`. The production environment waits for an approval, applies the database changes, then promotes that exact commit to `main`. Cloudflare Workers Builds should deploy production from `main`, after the approval and database deployment have passed.

Create GitHub environments named `staging` and `production`. Add a required reviewer to `production`. In each environment, set the `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` secrets, and the `SUPABASE_PROJECT_REF` variable for that environment. Scope the access token to the staging and production projects. The production environment permits the protected `staging` branch because that is where the approved release starts. Do not add production credentials to ordinary branch previews.

## Architecture

The accepted stack and environment decisions are recorded in [the architecture spec](docs/specs/0001-product-architecture/index.md). Keep credentials out of browser code and source control.
