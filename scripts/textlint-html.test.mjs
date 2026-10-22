import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textlint = path.join(repoRoot, 'node_modules', '.bin', 'textlint');
const config = path.join(repoRoot, '.textlintrc.json');

async function lintHtml(name, html) {
  const root = await mkdtemp(path.join(tmpdir(), 'textlint-html-'));
  try {
    const file = path.join(root, name);
    await writeFile(file, html);
    return spawnSync(textlint, ['--config', config, file], { cwd: repoRoot, encoding: 'utf8' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('Japanese site HTML uses the same desu-masu rule as docs', async () => {
  const polite = await lintHtml('polite.html', '<!DOCTYPE html><html lang="ja"><body><p>これは見本です。</p></body></html>\n');
  expect(polite.status).toBe(0);

  const plain = await lintHtml('plain.html', '<!DOCTYPE html><html lang="ja"><body><p>これは見本である。</p></body></html>\n');
  expect(plain.status).toBe(1);
  expect(`${plain.stdout}${plain.stderr}`).toContain('no-mix-dearu-desumasu');
});

test('English starter copy and style text are not false positives', async () => {
  const page = await lintHtml(
    'home.html',
    `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Home</title>
  <style>html { word-break: normal; word-break: auto-phrase; }</style>
</head>
<body>
  <h1>Home</h1>
  <p>Static site starter. Replace this page with your content.</p>
</body>
</html>
`,
  );
  expect(page.status).toBe(0);
});
