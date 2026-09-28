---
name: cloudflare-pages
description: Configure and deploy Cloudflare Pages sites, including Direct Uploads, Wrangler, staging isolation, and safe account/resource targeting. Use when this template's Pages workflow or an existing Pages project is involved.
---

# Cloudflare Pages

Use this skill for the template's Pages deployment and existing Pages projects. Cloudflare generally recommends Workers with Workers Static Assets for new sites, but this template deliberately uses Pages Direct Upload to reproduce its source repository's staging workflow. Do not replace that choice during unrelated setup or maintenance.

## Inspect before acting

- Read the project's build scripts, framework, package manager, and Pages configuration. Preserve its established deployment path.
- This template pins Wrangler with `bunx --package wrangler@4.135.0 wrangler`. Consult that version's `pages --help` and specific command help. Flags and config support can vary by version. Check [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/) and [Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) for current guidance.
- Confirm the output directory and intended Pages project, account, and environment before deploying. Do not infer these from a directory name or current login.

## Direct Upload

For a project that uses Direct Upload, build with its existing build command, then deploy the actual output directory with the supported local Wrangler Pages command. Check local help for exact syntax and options. Direct Upload does not provide Git-based automatic deployments; use the configured build/deploy workflow rather than changing project deployment mode incidentally. See [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Account, credentials, and resource boundaries

- Check the authenticated identity and account using local Wrangler help and the documented `whoami` command before any remote operation. If account selection is ambiguous, stop before deploying or modifying resources.
- Use the least-privilege account role or API token that permits the requested operation. Do not request token values in chat, commit them, or put them in command arguments or logs. Use the documented authentication flow and protected secret storage; keep credentials out of the repository.
- Distinguish local development from remote resources: local Wrangler execution may still reach real bound services. Identify bindings and whether they target local or remote data before testing writes.
- Treat production deploys, resource creation, and destructive changes as remote mutations. Verify the named target and the user's requested scope first; never assume preview or staging is isolated from production resources.

## Validate and report

Run the project's build and relevant checks before deployment when requested. A successful build or CLI upload does not prove the deployed site behaves correctly; exercise the site's actual URL when practical. Report the project/account/environment targeted and checks performed, and identify any unverified runtime behavior.

## References

- [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/)
- Source concepts: [Cloudflare skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/cloudflare/SKILL.md) and [Wrangler skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/wrangler/SKILL.md) in `yuzolabs/gakumas-produce-memory-deck`.
