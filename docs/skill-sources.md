# スキル・ガイダンスの出典

## AI コーディングガイダンス

- 出典: [yuzolabs/gakumas-produce-memory-deck の AGENTS.md](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/AGENTS.md)
- 参照した内容: 日本語の Conventional Commits 形式、許可する type、要約・本文・フッターの考え方、および検証フックを無効化しない方針。
- `AGENTS.md` に作業フロー、検証、Cloudflare Pages の注意点、日本語のコミット規約を集約しました。元文書を参考に、このテンプレート向けの文言で記載しています。

## PR 作成

- 出典: [yuzolabs/gakumas-produce-memory-deck の pr-description スキル](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/pr-description/SKILL.md)。
- `.agents/skills/pr-description/SKILL.md` は元スキルの手順・日本語の PR 構成を移し、このテンプレートに存在しない PR 指示ファイルの扱いと、ベースブランチ・未コミット変更の確認手順を調整しました。PR のタイトル、見出し、本文は日本語で作成します。

## Cloudflare と staging

- [Cloudflare skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/cloudflare/SKILL.md) と [Wrangler skill](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/.agents/skills/wrangler/SKILL.md) の製品選択、対象環境の確認、認証情報の扱いを参照しました。これらのスキルは [cloudflare/skills](https://github.com/cloudflare/skills/tree/626547c06881a20b3322bdc2ed6e6451b33a4fb6) から Apache-2.0 で導入されたものです。
- [元リポジトリの staging 手順](https://github.com/yuzolabs/gakumas-produce-memory-deck/blob/main/docs/staging-deployment.md) の分離プロジェクト、手動実行、ローカル検証を参照しました。
- `.agents/skills/cloudflare-pages/SKILL.md` と `.agents/skills/staging-deployment/SKILL.md` はこのテンプレート用に新規執筆しました。Cloudflare の参照集や第三者のスキル本文はコピーしていません。実際のコマンドと権限は各スキルからリンクした公式ドキュメントも確認してください。
