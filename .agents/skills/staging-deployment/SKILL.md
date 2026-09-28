---
name: staging-deployment
description: Use when setting up or manually deploying this static site template to a separate Cloudflare Pages staging project, or validating its staging deployment configuration.
---

# Staging deployment

Use a dedicated Cloudflare Pages project for staging, separate from production. Keep staging deployment manual; do not configure Git-connected or automatic deployment. Never put credentials in source control or this skill.

## Initial setup

1. In Cloudflare, create a Pages project using Direct Upload. Choose a staging-specific project name, set the production branch to `main`, and confirm its assigned `*.pages.dev` URL.
2. In GitHub Settings → Environments, create a `staging` environment. Restrict deployment branches to `main`; add approval rules if appropriate for the repository.
3. Add these Environment variables and secrets, replacing values with this repository's own project details (do not use example credentials):
   - Variable `CLOUDFLARE_PAGES_PROJECT_STAGING`: staging Pages project name.
   - Variable `CLOUDFLARE_PAGES_PROJECT_PRODUCTION`: distinct production Pages project name, used to guard against deploying to the wrong project.
   - Variable `STAGING_URL`: staging project's full HTTPS URL, without a trailing slash.
   - Secret `CLOUDFLARE_API_TOKEN`: Cloudflare API token with the Pages permissions required to deploy.
   - Secret `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
4. Confirm the repository's workflow uses that environment and deploys only to the staging project. Keep production credentials and project configuration separate.

## Manual deployment

1. Review the repository's staging workflow and ensure the intended commit is on the allowed branch.
2. In GitHub Actions, select the staging deployment workflow and choose **Run workflow** on `main`. Do not deploy an arbitrary branch.
3. Approve the environment deployment if approvals are configured. Review the workflow result and visit `STAGING_URL` to confirm the site loads.
4. For local validation, run `bun run check:staging`. This checks staging locally; it does not publish to Cloudflare or prove remote credentials/project settings work.

Do not assume this template creates releases or follows any application-specific beta release process. Follow only the workflow and checks actually present in this repository.

## References

- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages CI Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare Pages roles](https://developers.cloudflare.com/workers/authorization/workers/#cloudflare-pages)
- [GitHub Environments: deployment protection rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- Source workflow and operational ideas: [gakumas-produce-memory-deck staging instructions](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/docs/staging-deployment.md).
