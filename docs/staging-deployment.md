# Cloudflare Workers staging

staging は本番と別の Cloudflare Worker へ静的アセット（Workers Static Assets）を配信します。Git 連携による自動公開は使いません。ワークフローは `main` ブランチからの手動実行だけを受け付けます。

本構成は Wrangler およびレガシー Pages Direct Upload から移行しました。`cf` CLI ではレガシー Pages へのアップロードに対応していません（`cf pages deploy` は非対応エラーとなります）。そのため Workers Static Assets への移行を採用しました。`cf migrate` は使用せず、新しい設定を手動で作成しています。既存の Pages リソースや URL はリモートで変更や削除、移行されません。独自ドメインや本番環境へのデプロイは本テンプレートの対象外です。

本テンプレートは `cf@1.0.0-beta.12` と `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9` に固定しています。Wrangler への依存はありません。これらはベータ版（beta）である点に留意してください。動作環境として Bun 1.3.6 に加えて Node >=22.18.0 が必要です。Bun 上では `cf` の設定読み込みが未対応であるため、スクリプトから明示的に `node node_modules/.bin/cf` を呼び出します。

## ビルドと配信の構成

ソース `site/` は `bun run build` により `dist/` へ出力されます。Vite の `publicDir` に `dist` を設定しており、`cf build` を通じて Build Output である `.cloudflare/output/v0/` を生成します。`cf` 自身は package のビルドスクリプトを実行しません。

`bun run dev` は `site/` を一度ビルドした後に `cf dev --mode development` を起動します。ソース `site/` の編集時には再ビルドと再起動が必要です（ソースの HMR は提供されません）。`dist/` や `.cloudflare/` は Git 管理しません。

`cloudflare.config.ts` は `--mode development` または `--mode staging` のみを許可し、暗黙のモードや本番モードは拒否します。ローカル開発用の成果物は staging にデプロイできず、staging 用の再ビルドが必要です。事前ビルド済みデプロイ（`deploy:staging`）では、成果物のモードと実行モードが完全に一致している必要があります。

## 初回設定

1. 対象 Cloudflare アカウントと workers.dev サブドメインを確認します。公開前に意図したアカウントとサブドメインを明示的に確認してください。
2. staging 用の Worker 名を決定します。本番用 Worker 名と重複しない名前を選びます。初回デプロイ時に Worker が自動作成されるため、事前の作成コマンドは不要です。
3. staging の固定 URL を確認します。URL は `https://<staging>.<account-subdomain>.workers.dev` の形式（末尾スラッシュなし）と完全に一致する必要があります。
4. 対象アカウントの Workers に書き込みできる API トークンを発行します。アカウントを限定した「Workers Scripts Write」権限を選びます。従来の Pages Write 権限や古い `CLOUDFLARE_PAGES_PROJECT_*` 変数は利用しません。
5. GitHub Settings → Environments に `staging` を作成し、Deployment branches and tags で `main` のみ許可します。必要な場合は承認ルールを追加します。
6. `staging` の Environment variables に次を設定します。いずれか 1 つを設定した場合はすべて必須となります。

   | 名前 | 内容 |
   | --- | --- |
   | `CLOUDFLARE_WORKER_STAGING` | 手順2の staging 用 Worker 名 |
   | `CLOUDFLARE_WORKER_PRODUCTION` | 異なる本番 Worker 名（誤公開を防ぐガード名であり、デプロイ先ではありません） |
   | `CLOUDFLARE_WORKERS_SUBDOMAIN` | アカウントの workers.dev サブドメイン |
   | `STAGING_URL` | `https://<staging>.<account-subdomain>.workers.dev`（末尾の `/` なし） |

7. `staging` の Environment secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録します。実際の値をリポジトリ、Issue、チャット、ログに書かないでください。
8. ワークフローをデフォルトブランチ `main` に反映します。

staging は公開 URL です。`X-Robots-Tag: noindex, nofollow` は検索エンジン向けの指示であり、アクセス制限にはなりません。限定公開が必要な場合は別途アクセス制御を設計してください。

## ローカルで確認

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint:docs
bun run test
bun run build
bun run check:staging
```

`bun run dry-run` は `cf deploy --dry-run --mode development` を実行し、アップロードなしでデプロイを検証します。

通常の `bun run build` には staging 用の `_headers` と `deployment.json` は含まれません。`bun run check:staging` は staging 向け生成物を用意してビルドします。環境変数の有無に応じて次の動作になります。

- target 環境変数が未指定の場合: development モードとしてローカルで検証します。
- target 環境変数を指定した場合: 4 つの変数がすべて必須となり、staging モードで実行します。

検証処理は Vite preview によるローカル Workers ランタイムを起動します。`index.html`、`noindex` ヘッダー、コミット情報、存在しないページへの 404 応答を検証します。ローカル検証や dry-run ではリモートへのアップロードは行いません。

## 手動公開

GitHub Actions → **Deploy staging** → **Run workflow** を開き、`main` を選びます。ジョブは Worker 名が本番と異なり、設定 URL が固定 URL と一致することを確認します。型検査、lint、テスト、ローカル Workers 検査が通るまで公開しません。

`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` はアップロードのステップにだけ渡します。`bun run deploy:staging` は `check:staging-target` で Build Output の mode、Worker 名、`noindex`、コミットを検証します。検証に合格した場合のみ `cf deploy --prebuilt --mode staging` で成果物をアップロードします。

アップロード後にサイトと `deployment.json` のコミットを検証します。検証に失敗した場合、公開先は既に更新されている可能性があります。問題を直して新しいコミットで再実行してください。

ローカル検証の成功は Cloudflare アカウント設定やリモート公開の成功を保証しません。認証情報のない環境でワークフローのデプロイを試みないでください。

## 参考

- [Cloudflare cf CLI](https://developers.cloudflare.com/cf/)
- [cf projects](https://developers.cloudflare.com/cf/projects/)
- [cf 設定](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
- [CI からの cf デプロイ](https://developers.cloudflare.com/cf/ci/)
- [Pages から Workers Static Assets への移行](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare の新 CLI「cf」を使ってみた](https://zenn.dev/sora_kumo/articles/cloudflare-to-cf)
- 運用の着想: [元リポジトリの staging 手順](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/docs/staging-deployment.md)
