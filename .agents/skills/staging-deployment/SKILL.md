---
name: staging-deployment
description: Use when setting up or manually deploying this static site template to a separate Cloudflare Workers staging project, or validating its staging deployment configuration.
---

# Staging deployment

Use a dedicated Cloudflare Worker for staging, separate from production, serving Workers Static Assets via the `cf` CLI. Keep staging deployment manual; do not configure Git-connected or automatic deployment. Never put credentials in source control, pull requests, issues, or chats.

This configuration migrates from legacy Pages Direct Upload to Workers Static Assets because the `cf` CLI does not support legacy Pages (`cf pages deploy` throws an unsupported error). `cf migrate` was not used; the configuration was created manually. Existing remote Pages resources, projects, and URLs are not modified, deleted, or migrated. Custom domains and production deployment remain outside this template.

Tools are pinned to `cf@1.0.0-beta.12` and `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9` without Wrangler dependency (note these are beta packages). Runtime requires Node >=22.18.0 in addition to Bun 1.3.6 because Bun does not support direct `cf` configuration loading; scripts explicitly execute `node node_modules/.bin/cf`.

## Initial setup

1. Explicitly confirm the target Cloudflare account and its `workers.dev` subdomain before publishing.
2. Choose a staging Worker name (`CLOUDFLARE_WORKER_STAGING`) distinct from the production Worker name (`CLOUDFLARE_WORKER_PRODUCTION`). The first deploy creates the Worker automatically, so no prior create command is needed (unlike legacy Pages).
3. Confirm the staging URL: `STAGING_URL` must match `https://<staging>.<account-subdomain>.workers.dev` exactly without a trailing slash.
4. Create a Cloudflare API token with "Workers Scripts Write" permissions scoped to the target account (replacing legacy Pages Write permissions and old `CLOUDFLARE_PAGES_PROJECT_*` variables).
5. In GitHub Settings → Environments, create a `staging` environment. Restrict deployment branches to `main`; add approval rules if appropriate.
6. Add these Environment variables (all 4 are required if any remote target variable is set):
   - Variable `CLOUDFLARE_WORKER_STAGING`: staging Worker name.
   - Variable `CLOUDFLARE_WORKER_PRODUCTION`: distinct production Worker name (guard name to prevent accidental target collision; not deployed by this template).
   - Variable `CLOUDFLARE_WORKERS_SUBDOMAIN`: target account's `workers.dev` subdomain.
   - Variable `STAGING_URL`: `https://<staging>.<account-subdomain>.workers.dev` (exact, no trailing slash).
7. Add these Environment secrets:
   - Secret `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers Scripts Write permissions.
   - Secret `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
8. Note on security: `X-Robots-Tag: noindex, nofollow` instructs search engines not to index the staging site, but it is not access control. Separate access control must be configured if private access is needed.

## Build and verification flow

The template build architecture flows as:
- Source `site/` -> `bun run build` -> `dist/` -> Vite `publicDir: 'dist'` -> `cf build` creates `.cloudflare/output/v0/`.
- `cf` does not execute package build scripts automatically.
- `bun run dev`: builds `site/` once and starts `cf dev --mode development`. Editing `site/` requires rebuilding and restarting (no HMR on source files).
- `bun run build:cloudflare`: builds `site/` and runs `cf build --mode development`.
- `bun run dry-run`: builds `site/` and runs `cf deploy --dry-run --mode development` without uploading.
- `bun run check:staging`:
  - When no target variables are set, performs local verification in development mode.
  - When any target variable is set, all target variables are required and verified against `staging-target.mjs`.
  - Builds staging assets (`bun run build:staging`, generating `_headers` with `noindex` and `deployment.json` with commit SHA), builds output with `cf`, then spawns a local Workers runtime via Vite preview.
  - Verifies HTTP 200, `<main` content, `noindex` header, commit SHA match, and missing-page 404 (`/__staging_missing_page__`).
  - Local checks and dry-run never upload to Cloudflare.
- `cloudflare.config.ts` accepts only `--mode development` or `--mode staging`. Implicit mode and `--mode production` are rejected.
- Local development output cannot be published to staging: `deploy:staging` requires prebuilt output matching staging mode, verified by `check:staging-target`.

## Manual deployment

1. Review the staging workflow and ensure the target commit is on `main`.
2. In GitHub Actions, trigger **Deploy staging** on `main`. Automatic publish on push is not configured.
3. The CI job executes:
   - Target variable validation (`Confirm separate Workers and fixed staging URL`).
   - `bun install --frozen-lockfile`.
   - `bun run typecheck`, `bun run lint:docs`, `bun run test`.
   - `bun run check:staging` with `EXPECTED_COMMIT: ${{ github.sha }}`.
   - `bun run deploy:staging`: runs `check:staging-target` to verify prebuilt output mode, Worker name, commit SHA, and `noindex`, then uploads with `cf deploy --prebuilt --mode staging`.
   - Post-deployment smoke check against `STAGING_URL` for HTTP 200, `noindex` header, `<main`, and matching commit in `deployment.json`.
4. Local verification success does not prove remote credentials, account permissions, or live URL deployment succeed.

## References

- [Cloudflare cf CLI](https://developers.cloudflare.com/cf/)
- [Cloudflare cf projects](https://developers.cloudflare.com/cf/projects/)
- [Cloudflare cf configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [Cloudflare cf CI](https://developers.cloudflare.com/cf/ci/)
- [Migrate from Pages to Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [GitHub Environments: deployment protection rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- Source workflow and operational ideas: [gakumas-produce-memory-deck staging instructions](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/docs/staging-deployment.md).
