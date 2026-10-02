---
name: cloudflare-workers
description: Configure and deploy Cloudflare Workers Static Assets sites using the cf CLI, staging isolation, and safe account/resource targeting.
---

# Cloudflare Workers

Use this skill for Cloudflare Workers Static Assets deployments using the `cf` CLI. This template migrated from legacy Cloudflare Pages Direct Upload and Wrangler because the `cf` CLI does not support legacy Pages (`cf pages deploy` throws an unsupported error). `cf migrate` was not used to convert legacy Pages; configuration was created manually. Existing remote Pages resources, projects, and URLs are not modified, deleted, or migrated. Custom domains and production deployment remain outside this template.

Tools are pinned to `cf@1.0.0-beta.12` and `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9` without Wrangler dependency (note these are beta packages). Runtime requires Node >=22.18.0 in addition to Bun 1.3.6 because Bun cannot load `cf` configuration directly; scripts explicitly execute `node node_modules/.bin/cf`. Run `bun install --frozen-lockfile` to install dependencies.

## Inspect before acting

- Read the project's build scripts, framework, package manager, and Cloudflare configuration (`cloudflare.config.ts`, `vite.config.ts`).
- The official `cloudflare/skills` repository does not include a `cf`-specific skill in its skill directory inventory (it provides Wrangler and broad Cloudflare skills). This customized skill is repository-specific; do not import broad old Wrangler skills or claim this skill is official.
- For tool inspection and syntax, refer to the [Cloudflare cf agent guide](https://developers.cloudflare.com/cf/agents/). Use anonymous `cf` CLI search or consult exact command help and schemas (`node node_modules/.bin/cf --help` or specific subcommand help).

## Build and execution architecture

- Source `site/` -> `bun run build` -> `dist/` -> Vite `publicDir: 'dist'` -> `cf build` creates Build Output at `.cloudflare/output/v0/`.
- `cf` does not execute package build scripts automatically.
- `bun run dev`: builds `site/` once and starts `cf dev --mode development`. Editing `site/` requires rebuilding and restarting (no HMR on source files).
- `bun run build:cloudflare`: builds `site/` and runs `cf build --mode development`.
- `bun run dry-run`: builds `site/` and runs `cf deploy --dry-run --mode development` without uploading.
- `bun run check:staging`:
  - Without target variables: runs local verification in development mode.
  - With any target variable: requires all 4 variables (`CLOUDFLARE_WORKER_STAGING`, `CLOUDFLARE_WORKER_PRODUCTION`, `CLOUDFLARE_WORKERS_SUBDOMAIN`, `STAGING_URL`), running in staging mode.
  - Builds staging output and spawns local Workers runtime via Vite preview. Verifies HTTP 200, `<main` content, `noindex` header, commit SHA in `deployment.json`, and missing-page 404 (`/__staging_missing_page__`).
  - Local checks and dry-run never upload to Cloudflare.
- `cloudflare.config.ts` accepts only `--mode development` or `--mode staging`. Implicit mode and `--mode production` are rejected.
- Prebuilt deployment: `deploy:staging` requires exact matching staging mode (`cf deploy --prebuilt --mode staging`). Development-mode output cannot be published to staging.

## Account, credentials, and resource boundaries

- Verify the intended account ID and account `workers.dev` subdomain before any remote operation or publishing.
- API Token: Use a token with "Workers Scripts Write" permissions scoped to the selected account, replacing legacy Pages Write permissions and old `CLOUDFLARE_PAGES_PROJECT_*` variables.
- Target isolation: Ensure `CLOUDFLARE_WORKER_STAGING` and `CLOUDFLARE_WORKER_PRODUCTION` are distinct. The first deployment automatically creates the staging Worker; no prior create command is required.
- Keep credentials out of the repository: never put tokens, account IDs, or sensitive values in source files, pull requests, issues, or chats.
- Local validation (`bun run check:staging`) does not upload or verify remote account credentials or live URL availability.
- Security note: `X-Robots-Tag: noindex, nofollow` is search indexing guidance, not access control.

## References

- [Cloudflare cf CLI](https://developers.cloudflare.com/cf/)
- [Cloudflare cf agent guide](https://developers.cloudflare.com/cf/agents/)
- [Cloudflare cf projects](https://developers.cloudflare.com/cf/projects/)
- [Cloudflare cf configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [Cloudflare cf CI](https://developers.cloudflare.com/cf/ci/)
- [Migrate from Pages to Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare to cf article](https://zenn.dev/sora_kumo/articles/cloudflare-to-cf)
- Source concepts: [Cloudflare skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/cloudflare/SKILL.md) and [Wrangler skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/wrangler/SKILL.md) in `yuzolabs/gakumas-produce-memory-deck`.
