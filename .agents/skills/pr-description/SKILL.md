---
name: pr-description
description: >-
  Generate a Japanese pull request title and description file (pr.md) from
  the branch diff. Use when asked to write a PR description or PRの説明文.
---

# PR Description

Generate `pr.md` from the current branch's diff against its base branch. Write the PR title, headings, and body in **Japanese**.

## Workflow

### Step 1: Determine base branch

```bash
BASE_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
BASE_BRANCH=${BASE_BRANCH#origin/}
BASE_BRANCH=${BASE_BRANCH:-main}
```

If the base branch cannot be determined automatically, use `main`.

### Step 2: Get diff since branch diverged

```bash
BASE=$(git merge-base HEAD "origin/$BASE_BRANCH")
git diff "$BASE" HEAD
git diff "$BASE" HEAD --stat
git log "$BASE"..HEAD --oneline
git status --short
```

The diff above covers committed changes. If `git status --short` reports uncommitted changes, include their impact only after inspecting them and distinguish them from committed PR changes.

### Step 3: Read the PR template

If `.github/copilot-pull-request-instructions.md` exists, read and follow it. Otherwise use the structure below. This template does not ship a separate PR instructions file.

### Step 4: Write pr.md

Write `pr.md` in the project root, using the actual diff and the selected template:

```markdown
# PRタイトル
## 概要
<!-- このPRの背景・目的・概要 -->

## 変更内容
<!-- このPRで実施した変更内容 -->

## 補足
<!-- レビュワーへの情報、残しておきたいメモ、参考リンク -->
```

- The **first line** must be a concise H1 PR title in Japanese.
- **概要** explains why the change is needed.
- **変更内容** describes what changed.
- **補足** records relevant verification, decisions, or caveats.

### Step 5: Validate pr.md

Run Markdown lint, then fix any reported issue before using the file:

```bash
bunx markdownlint-cli2 "pr.md"
```

Review the Japanese title and body after lint passes.

## Rules

- Output language: **Japanese** for the PR title, headings, and body. Keep code identifiers and machine-consumed tokens in their original form.
- Do not paste raw git diffs or unrelated code into `pr.md`.
- Keep the PR title as the first-line H1, before the body sections.
- If `.github/copilot-pull-request-instructions.md` does not exist, use the structure above.
