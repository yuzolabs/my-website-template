# Website template

AI エージェント向けの作業手順と、Cloudflare Workers Static Assets の staging 環境を備えた静的サイトのテンプレートです。
[gakumas-produce-memory-deck](https://github.com/yuzolabs/gakumas-produce-memory-deck) の運用から再利用できる部分を取り出しました。
サイト固有のアプリ・素材・リリース処理は含めていません。

公開プラットフォームには Workers Static Assets を利用します。既存の Pages リソースや URL はリモートで変更・削除・移行されません。独自ドメインや本番デプロイは本テンプレートの対象外です。
本設定は `cf@1.0.0-beta.12` と `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9` に固定しています。Wrangler への依存はありません。これらはベータ版（beta）である点に留意してください。レガシー Pages からの移行に `cf migrate` は使用せず、新しい設定を手動で作成しています。

## 始める

初めて GitHub でテンプレートとして公開するときは、変更を `main` に反映してください。
次に Settings → General → **Template repository** を有効にしてください。
現時点のリモート設定ではまだ無効です。

動作環境として Bun 1.3.6 に加えて Node >=22.18.0 が必要です。Bun 上では `cf` の設定読み込みが未対応であるため、スクリプトから明示的に `node node_modules/.bin/cf` を呼び出します。

1. テンプレート設定を有効にした GitHub リポジトリの **Use this template** から新しいリポジトリを作成します。
2. `site/index.html` を編集し、必要な画像や CSS は `site/` に配置します。
3. 次のコマンドで依存関係を導入し、検証とローカル配信を確認します。

   ```bash
   bun install --frozen-lockfile
   bun run lint:docs
   bun run typecheck
   bun run test
   bun run build
   bun run check:staging
   ```

### ビルドと配信の構成

ソース `site/` は `bun run build` により `dist/` へ出力されます。
Vite の `publicDir` に `dist` を設定しており、`cf build` を通じて Build Output である `.cloudflare/output/v0/` を生成します。`cf` 自身は package のビルドスクリプトを実行しません。
`bun run dev` は `site/` を一度ビルドした後に `cf dev --mode development` を起動します。ソース `site/` の編集時には再ビルドと再起動が必要です（ソースの HMR は提供されません）。`dist/` や `.cloudflare/` は Git 管理しません。

### 利用可能なスクリプト

- `bun run build`: `site/` を `dist/` に出力します。
- `bun run dev`: `site/` をビルドし、開発モードの Workers ローカル環境を起動します。
- `bun run build:cloudflare`: `site/` をビルドし、`cf build --mode development` で `.cloudflare/output/v0/` を生成します。
- `bun run dry-run`: `site/` をビルドし、`cf deploy --dry-run --mode development` でアップロードなしでデプロイを検証します。
- `bun run check:staging`: staging 向け生成物を用意してビルドします。ローカル Workers 環境で HTTP 応答、`noindex`、コミット、404 応答を検証します。リモートへのアップロードは行いません。
- `bun run check:staging-target`: staging 向け Build Output の mode、Worker 名、`noindex`、コミット SHA を事前検証します。
- `bun run deploy:staging`: target を検証した上で、`cf deploy --prebuilt --mode staging` により検証済み成果物をアップロードします。
- `bun run typecheck`: TypeScript の型を検査します。
- `bun run test`: 単体テストを実行します。
- `bun run lint:docs`: textlint でドキュメントを検査します。

## AI コーディング

`AGENTS.md` がリポジトリの基本方針です。用途に応じて次の Agent Skills を参照できます。

- [Frontend design](.agents/skills/frontend-design/SKILL.md): サイトの内容に合わせた画面デザインと文章の設計。
- [PR description](.agents/skills/pr-description/SKILL.md): 差分から日本語の PR タイトル・本文を作成。
- [Cloudflare Workers](.agents/skills/cloudflare-workers/SKILL.md): Cloudflare Workers（`cf` CLI）の構成と Workers Static Assets の扱い。
- [Staging deployment](.agents/skills/staging-deployment/SKILL.md): staging への安全な公開と検証。

## 文書とコミット前の検証

`bun run lint:docs` は README、AGENTS.md、`docs/` の日本語 Markdown を textlint で検査します。英語の Skills とサイトの HTML は対象外です。

[prek](https://github.com/j178/prek) をインストールした後、`prek install` で Git フックを設定します。

コミット前に YAML、JSON、TOML、行末空白、末尾改行、秘密鍵を検査します。
`no-commit-to-branch` により、pre-commit 時に `main` ブランチへの直接コミットを禁止します。
さらに Gitleaks（シークレット検出）、Semgrep（SAST）、zizmor（GitHub Actions 等の静的解析）を実行します。
各ツールは初回の hook 環境構築で取得され、Semgrep の auto ルール取得にはネットワーク接続が必要です。
また、zizmor はデフォルトでオフライン実行されるため、一部の監査項目は対象外です。

手動でファイル全体を確認するには `prek run --all-files` を実行してください。
ただし Gitleaks 公式 hook はステージ済み差分を検査するため、全履歴の検査にはなりません。
本設定はローカル hook の追加のみであり、CI スキャンは未導入です。

`.gitattributes` ではテキストを `text=auto eol=lf`、Windows コマンドスクリプト（`.cmd`、`.bat`）を `crlf` に指定しています。
なお、`no-commit-to-branch` フックはローカル環境向けであり、GitHub 側のブランチ保護ではありません。
自動マージや GitHub 側の保護設定は本テンプレートに含まれていません。

## 依存関係の更新

依存関係の更新には Dependabot と Bun の遅延設定を利用します。

- Dependabot: `.github/dependabot.yml` で `bun`、`github-actions`、`pre-commit` の 3 つのエコシステムを対象に週次で更新を確認します。7 日間のクールダウン（`default-days: 7`）を設定しています。`.pre-commit-config.yaml` の `# frozen: vX.Y.Z` コメントは公式ドキュメントに従いリリースタグ対応を指定したものです。
- Bun: `bunfig.toml` で `minimumReleaseAge = 604800`（7日）を設定しています。これは新しいバージョン解決時のフィルターであり、既存の `bun.lock` を再審査するものではありません。詳細は [Bun 公式ドキュメント](https://bun.sh/docs/pm/cli/install) を参照してください。

## Cloudflare staging

公開には **本番と別の** Cloudflare Worker と、GitHub の `staging` Environment が必要です。初回デプロイ時に Worker が自動作成されるため、事前の作成コマンドは不要です。本番 Worker と重複しない名前を選択してください。

Environment variables には次の 4 つを設定します。いずれか 1 つを設定した場合はすべて必須となります。
- `CLOUDFLARE_WORKER_STAGING`: staging 用の Worker 名
- `CLOUDFLARE_WORKER_PRODUCTION`: 異なる本番 Worker 名（誤公開を防ぐガード名であり、デプロイ先ではありません）
- `CLOUDFLARE_WORKERS_SUBDOMAIN`: 対象アカウントの workers.dev サブドメイン
- `STAGING_URL`: `https://<staging>.<account-subdomain>.workers.dev`（末尾のスラッシュなし）

Environment secrets には次を設定します。
- `CLOUDFLARE_API_TOKEN`: 対象アカウント向けの Workers Scripts Write 権限を持つトークン（旧 Pages Write 権限や旧変数から置き換えます）
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID

公開前に対象アカウントおよび workers.dev サブドメインを明示的に確認してください。トークンや認証情報はリポジトリやチャットに保存しません。

`cloudflare.config.ts` は `--mode development` または `--mode staging` のみを許可し、暗黙のモードや本番モードは拒否します。ローカル開発用の成果物は staging にデプロイできず、staging 用の再ビルドが必要です。

[staging 初期設定と公開手順](docs/staging-deployment.md) に従ってから、`main` の Actions → **Deploy staging** を手動実行してください。自動公開は行いません。
Actions は型検査・lint・テスト・`bun run check:staging` の成功後に事前ビルド済み成果物をアップロードします。
アップロード後に公開先の HTTP 応答・`noindex`・コミットを確認します。
`X-Robots-Tag: noindex, nofollow` は検索避けであり、アクセス制限にはなりません。
ローカル検証の成功は認証権限やリモート公開の成功を保証しません。

このテンプレートは staging の公開のみを自動化します。本番へのデプロイ手順や独自ドメインは、作成したサイトの要件に合わせて別途決めてください。
