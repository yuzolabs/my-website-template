# Website template

AI エージェント向けの作業手順と、Cloudflare Pages の staging 環境を備えた静的サイトのテンプレートです。[gakumas-produce-memory-deck](https://github.com/yuzolabs/gakumas-produce-memory-deck) の運用から再利用できる部分を取り出し、サイト固有のアプリ・素材・リリース処理は含めていません。

## 始める

このリポジトリを GitHub で初めてテンプレートとして公開するときは、変更を `main` に反映した後、Settings → General → **Template repository** を有効にしてください。現時点のリモート設定ではまだ無効です。

1. テンプレート設定を有効にした GitHub リポジトリの **Use this template** から新しいリポジトリを作成します。
2. `site/index.html` を編集し、必要な画像や CSS は `site/` に配置します。
3. Bun 1.3.6 以降を使い、次のコマンドで生成物とローカル Pages 配信を確認します。

   ```bash
   bun run test
   bun run build
   bun run check:staging
   ```

`bun run build` は `site/` を `dist/` に出力します。`bun run check:staging` は通常ビルドから staging 専用の `_headers` と `deployment.json` を生成し、Wrangler のローカル Pages ランタイムで HTTP 応答と `noindex` を検査します。Wrangler 4.135.0 を `bunx` で取得するため、初回はネットワーク接続が必要です。`dist/` は Git 管理しません。

## AI コーディング

`AGENTS.md` がリポジトリの基本方針です。用途に応じて次の Agent Skills を参照できます。

- [PR description](.agents/skills/pr-description/SKILL.md): 差分から日本語の PR タイトル・本文を作成。
- [Cloudflare Pages](.agents/skills/cloudflare-pages/SKILL.md): Cloudflare の構成と Wrangler の扱い。
- [Staging deployment](.agents/skills/staging-deployment/SKILL.md): staging への安全な公開と検証。

## Cloudflare staging

公開には **本番と別の** Cloudflare Pages Direct Upload プロジェクトと、GitHub の `staging` Environment が必要です。必要な Environment variables は `CLOUDFLARE_PAGES_PROJECT_STAGING`、`CLOUDFLARE_PAGES_PROJECT_PRODUCTION`、`STAGING_URL`、Environment secrets は `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` です。トークンはこのリポジトリへ保存しません。

[staging 初期設定と公開手順](docs/staging-deployment.md) に従ってから、`main` の Actions → **Deploy staging** を手動実行してください。Actions は `bun run test` と `bun run check:staging` の成功後に専用プロジェクトへアップロードし、公開先の HTTP 応答・`noindex`・コミットを確認します。ローカル検証は認証権限やリモート公開の成功を保証しません。

このテンプレートは staging の公開のみを自動化します。本番へのデプロイ手順や独自ドメインは、作成したサイトの要件に合わせて別途決めてください。
