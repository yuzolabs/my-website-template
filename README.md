# Website template

AI エージェント向けの作業手順と、Cloudflare Pages の staging 環境を備えた静的サイトのテンプレートです。
[gakumas-produce-memory-deck](https://github.com/yuzolabs/gakumas-produce-memory-deck) の運用から再利用できる部分を取り出しました。
サイト固有のアプリ・素材・リリース処理は含めていません。

## 始める

初めて GitHub でテンプレートとして公開するときは、変更を `main` に反映してください。
次に Settings → General → **Template repository** を有効にしてください。
現時点のリモート設定ではまだ無効です。

1. テンプレート設定を有効にした GitHub リポジトリの **Use this template** から新しいリポジトリを作成します。
2. `site/index.html` を編集し、必要な画像や CSS は `site/` に配置します。
3. Bun 1.3.6 以降を使い、次のコマンドで生成物とローカル Pages 配信を確認します。

   ```bash
   bun install --frozen-lockfile
   bun run lint:docs
   bun run test
   bun run build
   bun run check:staging
   ```

`bun run build` は `site/` を `dist/` に出力します。
`bun run check:staging` は staging 専用の `_headers` と `deployment.json` を生成します。
Wrangler のローカル Pages ランタイムで HTTP 応答と `noindex` を検査します。
Wrangler 4.135.0 を `bunx` で取得するため、初回はネットワーク接続が必要です。`dist/` は Git 管理しません。

## AI コーディング

`AGENTS.md` がリポジトリの基本方針です。用途に応じて次の Agent Skills を参照できます。

- [Frontend design](.agents/skills/frontend-design/SKILL.md): サイトの内容に合わせた画面デザインと文章の設計。
- [PR description](.agents/skills/pr-description/SKILL.md): 差分から日本語の PR タイトル・本文を作成。
- [Cloudflare Pages](.agents/skills/cloudflare-pages/SKILL.md): Cloudflare の構成と Wrangler の扱い。
- [Staging deployment](.agents/skills/staging-deployment/SKILL.md): staging への安全な公開と検証。

## 文書とコミット前の検証

`bun run lint:docs` は README、AGENTS.md、`docs/` の日本語 Markdown を textlint で検査します。英語の Skills とサイトの HTML は対象外です。

[prek](https://github.com/j178/prek) をインストールした後、`prek install` で Git フックを設定します。コミット前に YAML・JSON・行末・末尾改行・秘密鍵を検査します。リポジトリ全体を手動で確認するには `prek run --all-files` を実行してください。

## Cloudflare staging

公開には **本番と別の** Cloudflare Pages Direct Upload プロジェクトと、GitHub の `staging` Environment が必要です。
Environment variables に `CLOUDFLARE_PAGES_PROJECT_STAGING` を設定します。
`CLOUDFLARE_PAGES_PROJECT_PRODUCTION` と `STAGING_URL` も同じ場所に設定します。
Environment secrets は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` です。
トークンはこのリポジトリへ保存しません。

[staging 初期設定と公開手順](docs/staging-deployment.md) に従ってから、`main` の Actions → **Deploy staging** を手動実行してください。
Actions は `bun run test` と `bun run check:staging` の成功後に専用プロジェクトへアップロードします。
公開先の HTTP 応答・`noindex`・コミットを確認します。
ローカル検証は認証権限やリモート公開の成功を保証しません。

このテンプレートは staging の公開のみを自動化します。本番へのデプロイ手順や独自ドメインは、作成したサイトの要件に合わせて別途決めてください。
