# Cloudflare Pages staging

staging は本番と別の Pages プロジェクトへ静的ファイルを Direct Upload します。Git 連携による自動公開は使いません。ワークフローは `main` ブランチからの手動実行だけを受け付けます。

## 初回設定

1. Cloudflare で本番用と staging 用の Pages プロジェクトを別々に作成します。staging は **Direct Upload** を選び、Production branch を `main` にします。例: `bunx --package wrangler@4.135.0 wrangler pages project create <新しいサイト名>-staging --production-branch=main`。これは外部リソースを作成する操作なので、管理者の端末で認証して実行してください。
2. staging の Pages プロジェクト名と固定 URL を確認します。URL は `https://<staging のプロジェクト名>.pages.dev` の形式を使います。名前が使用済みなら別名でプロジェクトを作成してください。
3. 対象 Cloudflare アカウントの Pages に書き込みできる API トークンを発行します。アカウントを限定した Pages Write 権限を選びます。Workers 用トークンや個人のログイン状態を CI で使わないでください。
4. GitHub Settings → Environments に `staging` を作成し、Deployment branches and tags で `main` のみ許可します。必要な場合は承認ルールを追加します。
5. `staging` の Environment variables に次を設定します。

   | 名前 | 内容 |
   | --- | --- |
   | `CLOUDFLARE_PAGES_PROJECT_STAGING` | 手順1の staging プロジェクト名 |
   | `CLOUDFLARE_PAGES_PROJECT_PRODUCTION` | 異なる本番プロジェクト名 |
   | `STAGING_URL` | `https://<staging のプロジェクト名>.pages.dev`（末尾の `/` なし） |

6. `staging` の Environment secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録します。実際の値をリポジトリ、Issue、チャット、ログに書かないでください。
7. ワークフローをデフォルトブランチ `main` に反映します。作成直後のテンプレートでは手動実行が Actions 一覧に表示されない場合、`main` のワークフローを確認します。

staging は公開 URL です。`X-Robots-Tag: noindex, nofollow` は検索エンジン向けの指示であり、アクセス制限にはなりません。限定公開が必要な場合は別途アクセス制御を設計してください。

## ローカルで確認

```bash
bun run test
bun run build
bun run check:staging
```

通常の `bun run build` には staging 用の `_headers` と `deployment.json` は含まれません。`bun run check:staging` は再ビルドして staging 用ファイルを追加し、実際の `wrangler pages dev dist` で `index.html`、コミット情報、`noindex` ヘッダーを確認します。起動したローカルサーバーは検査後に終了します。

## 手動公開

GitHub Actions → **Deploy staging** → **Run workflow** を開き、`main` を選びます。ジョブはプロジェクト名が本番と異なり、設定 URL が staging の固定 URL と一致することを確認します。テストとローカル Pages 検査が通るまで公開しません。

`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` はアップロードのステップにだけ渡します。公開時は `--project-name` に staging 専用プロジェクトを指定し、`--branch=main` でそのプロジェクトの固定 URL を更新します。アップロード後にサイトと `deployment.json` のコミットを検証します。検証に失敗した場合、公開先は既に更新されている可能性があります。問題を直して新しいコミットで再実行してください。

`bun run check:staging` だけでは Cloudflare アカウント設定やリモート公開は検証できません。認証情報のない環境でワークフローのデプロイを試みないでください。

参考: [Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)、[CI からの Direct Upload](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Pages の `_headers`](https://developers.cloudflare.com/pages/configuration/headers/)。運用の着想は [元リポジトリの staging 手順](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/docs/staging-deployment.md) から得ています。
